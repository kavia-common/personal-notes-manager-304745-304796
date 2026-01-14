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

function useMediaQuery(query) {
  const getMatches = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(query);

    const onChange = () => setMatches(mql.matches);
    // Safari < 14 compatibility
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
    else mql.addListener(onChange);

    setMatches(mql.matches);

    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

// PUBLIC_INTERFACE
function App() {
  /** Notes app entry point: manages notes state and persistence. */

  // IMPORTANT: call initNotesState() only once.
  // Even though it has an internal cache, calling it twice creates an avoidable double-load path
  // and risks inconsistent initial state if future changes remove/alter that caching.
  const initial = useMemo(() => initNotesState(), []);

  const [notes, setNotes] = useState(() => initial.notes);
  const [selectedId, setSelectedId] = useState(() => initial.selectedId);
  const [searchQuery, setSearchQuery] = useState('');

  // Responsive UX: collapse sidebar by default on small screens.
  const isNarrow = useMediaQuery('(max-width: 820px)');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isNarrow);

  // Keep sidebar state in sync with breakpoint changes:
  // - when entering narrow mode: default to closed (editor gets focus/space)
  // - when leaving narrow mode: always open
  useEffect(() => {
    setIsSidebarOpen(!isNarrow);
  }, [isNarrow]);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, noteId: null, noteTitle: '' });
  const [liveMessage, setLiveMessage] = useState('');

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
    setLiveMessage('New note created.');
    // On narrow screens, jump to the editor after creating.
    if (isNarrow) setIsSidebarOpen(false);
  };

  // PUBLIC_INTERFACE
  const handleSelectNote = (id) => {
    setSelectedId(id);
    // On narrow screens, selecting a note should reveal the editor.
    if (isNarrow) setIsSidebarOpen(false);
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

  const requestDeleteNote = (noteId) => {
    const n = orderedNotes.find((x) => x.id === noteId);
    if (!n) return;

    setDeleteDialog({
      open: true,
      noteId,
      noteTitle: deriveTitleFromNote(n.title, n.body),
    });
  };

  const confirmDeleteNote = () => {
    if (!deleteDialog.noteId) return;
    setNotes((prev) => prev.filter((n) => n.id !== deleteDialog.noteId));
    setLiveMessage(`Deleted "${deleteDialog.noteTitle}".`);
    setDeleteDialog({ open: false, noteId: null, noteTitle: '' });
  };

  const cancelDeleteNote = () => {
    setDeleteDialog({ open: false, noteId: null, noteTitle: '' });
    setLiveMessage('Delete cancelled.');
  };

  return (
    <div className="AppShell">
      <Header
        noteCount={notes.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        showSidebarToggle={isNarrow}
      />

      <div className="Layout Layout--responsive" data-sidebar-open={isSidebarOpen ? 'true' : 'false'}>
        <Sidebar
          notes={orderedNotes}
          filteredNotes={filteredNotes}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          isOpen={isSidebarOpen}
          onRequestClose={() => setIsSidebarOpen(false)}
          showOverlay={isNarrow}
        />

        <NoteEditor
          note={selectedNote}
          onChange={handleUpdateSelectedNote}
          onRequestDelete={requestDeleteNote}
          isSidebarOpen={isSidebarOpen}
          showSidebarToggle={isNarrow}
        />
      </div>

      {deleteDialog.open ? (
        <div
          className="ModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          aria-describedby="delete-desc"
          onMouseDown={(e) => {
            // Clicking the shaded overlay (not the dialog) closes.
            if (e.target === e.currentTarget) cancelDeleteNote();
          }}
        >
          <div className="ModalCard">
            <h2 id="delete-title" className="ModalCard__title">
              Delete note?
            </h2>
            <p id="delete-desc" className="ModalCard__text">
              You’re about to delete <strong>{deleteDialog.noteTitle}</strong>. This cannot be undone.
            </p>
            <div className="ModalCard__actions">
              <button className="Button" onClick={cancelDeleteNote} aria-label="Cancel delete">
                Cancel
              </button>
              <button
                className="Button Button--danger"
                onClick={confirmDeleteNote}
                aria-label={`Confirm delete ${deleteDialog.noteTitle}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Accessible announcements for key actions (create/delete/cancel). */}
      <div className="SrOnly" role="status" aria-live="polite">
        {liveMessage}
      </div>
    </div>
  );
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export default App;
