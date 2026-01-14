import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import { createEmptyNote, loadNotesFromStorage, saveNotesToStorage } from './utils/storage';

function sortNotesByUpdatedAtDesc(notes) {
  return [...notes].sort((a, b) => {
    const ta = new Date(a.updatedAt || 0).getTime();
    const tb = new Date(b.updatedAt || 0).getTime();
    return tb - ta;
  });
}

// PUBLIC_INTERFACE
function App() {
  /** Notes app entry point: manages notes state and persistence. */
  const [notes, setNotes] = useState(() => loadNotesFromStorage());
  const [selectedId, setSelectedId] = useState(() => (loadNotesFromStorage()[0]?.id ?? null));
  const [searchQuery, setSearchQuery] = useState('');

  // Keep storage in sync whenever notes change.
  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  // Ensure selected note exists; if deleted, pick next best.
  useEffect(() => {
    if (selectedId && notes.some((n) => n.id === selectedId)) return;
    setSelectedId(notes[0]?.id ?? null);
  }, [notes, selectedId]);

  const orderedNotes = useMemo(() => sortNotesByUpdatedAtDesc(notes), [notes]);
  const selectedNote = useMemo(
    () => orderedNotes.find((n) => n.id === selectedId) || null,
    [orderedNotes, selectedId]
  );

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
        const updated = {
          ...n,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        // Avoid empty titles but allow user to clear while typing.
        if (typeof updated.title !== 'string') updated.title = '';
        if (typeof updated.body !== 'string') updated.body = '';
        return updated;
      });
      return sortNotesByUpdatedAtDesc(next);
    });
  };

  // PUBLIC_INTERFACE
  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="AppShell">
      <Header noteCount={notes.length} />

      <div className="Layout">
        <Sidebar
          notes={orderedNotes}
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

export default App;
