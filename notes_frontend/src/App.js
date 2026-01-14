import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import {
  createEmptyNote,
  deriveTitleFromNote,
  initNotesState,
  nowIso,
  saveNotesSchema,
} from './utils/storage';

function sortNotesByUpdatedAtDesc(notes) {
  return [...notes].sort((a, b) => {
    const ta = new Date(a.updatedAt || 0).getTime();
    const tb = new Date(b.updatedAt || 0).getTime();
    return tb - ta;
  });
}

function filterNotes(notes, searchQuery) {
  const q = (searchQuery || '').trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((n) => {
    const title = (n.title || '').toLowerCase();
    const body = (n.body || '').toLowerCase();
    return title.includes(q) || body.includes(q);
  });
}

// PUBLIC_INTERFACE
function App() {
  /** Notes app entry point: manages notes state and persistence. */
  const [notes, setNotes] = useState(() => initNotesState().notes);
  const [selectedId, setSelectedId] = useState(() => initNotesState().selectedId);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep storage in sync whenever notes change.
  useEffect(() => {
    // Best-effort persistence; saveNotesSchema never throws and returns status if needed later.
    saveNotesSchema(notes);
  }, [notes]);

  const orderedNotes = useMemo(() => sortNotesByUpdatedAtDesc(notes), [notes]);
  const filteredNotes = useMemo(() => filterNotes(orderedNotes, searchQuery), [orderedNotes, searchQuery]);

  const selectedNote = useMemo(
    () => orderedNotes.find((n) => n.id === selectedId) || null,
    [orderedNotes, selectedId]
  );

  // Ensure selected note exists; if deleted, select most recently updated remaining, or clear selection.
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(orderedNotes[0]?.id ?? null);
      return;
    }
    if (orderedNotes.some((n) => n.id === selectedId)) return;

    setSelectedId(orderedNotes[0]?.id ?? null);
  }, [orderedNotes, selectedId]);

  // Search filtering should not "break" selection:
  // If user has an active search and the current selection is not in results, pick the top matching note.
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q) return;

    const selectionInFiltered = filteredNotes.some((n) => n.id === selectedId);
    if (selectionInFiltered) return;

    setSelectedId(filteredNotes[0]?.id ?? null);
  }, [filteredNotes, searchQuery, selectedId]);

  // PUBLIC_INTERFACE
  const handleCreateNote = () => {
    const newNote = createEmptyNote();
    setNotes((prev) => sortNotesByUpdatedAtDesc([newNote, ...prev]));
    setSelectedId(newNote.id);
    setSearchQuery('');
  };

  // PUBLIC_INTERFACE
  const handleSelectNote = (id) => {
    setSelectedId(id);
  };

  // PUBLIC_INTERFACE
  const handleUpdateSelectedNote = (patch) => {
    if (!selectedNote) return;

    setNotes((prev) => {
      const next = prev.map((n) => {
        if (n.id !== selectedNote.id) return n;

        const safeTitle = typeof patch.title === 'string' ? patch.title : n.title;
        const safeBody = typeof patch.body === 'string' ? patch.body : n.body;

        // If title is cleared, gracefully auto-title from body (or Untitled).
        // This prevents empty titles while keeping the placeholder UX in the editor.
        const derivedTitle = deriveTitleFromNote(safeTitle, safeBody);

        const updated = {
          ...n,
          ...patch,
          title: derivedTitle === 'Untitled' && normalizeWhitespace(safeTitle) === '' ? '' : derivedTitle,
          body: safeBody,
          createdAt: n.createdAt || nowIso(),
          updatedAt: nowIso(),
        };

        // Note: we intentionally allow storing empty string title if it's truly empty and body is empty,
        // so UI can show placeholder. Sidebar will still render a derived title.
        return updated;
      });

      return sortNotesByUpdatedAtDesc(next);
    });
  };

  // PUBLIC_INTERFACE
  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    // selection will be fixed by the effect above using orderedNotes (most recently updated).
  };

  return (
    <div className="AppShell">
      <Header noteCount={notes.length} />

      <div className="Layout">
        <Sidebar
          notes={orderedNotes}
          filteredNotes={filteredNotes}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
        />

        <NoteEditor note={selectedNote} onChange={handleUpdateSelectedNote} onDelete={handleDeleteNote} />
      </div>
    </div>
  );
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export default App;
