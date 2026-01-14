import React, { useEffect, useRef } from 'react';
import { deriveTitleFromNote } from '../utils/storage';

// PUBLIC_INTERFACE
export default function Sidebar({
  notes,
  filteredNotes,
  selectedId,
  searchQuery,
  onSearchQueryChange,
  onSelectNote,
  onCreateNote,
}) {
  /**
   * Sidebar for searching and selecting notes.
   * Filtering is computed in App to keep selection + results behavior consistent.
   */
  const searchId = 'notes-search';
  const searchRef = useRef(null);

  useEffect(() => {
    // Provide a convenient focus target on first mount for keyboard users.
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const list = filteredNotes ?? notes;

  return (
    <aside className="Sidebar" aria-label="Notes sidebar">
      <div className="Sidebar__top">
        <div className="Sidebar__actions">
          <button className="Button Button--primary Button--full" onClick={onCreateNote}>
            New note
          </button>
        </div>

        <div className="Sidebar__search">
          <label className="Label" htmlFor={searchId}>
            Search notes
          </label>
          <input
            id={searchId}
            ref={searchRef}
            className="Input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title or body…"
          />
        </div>
      </div>

      <nav className="Sidebar__list" aria-label="Notes list">
        {list.length === 0 ? (
          <div className="EmptyCard" role="status">
            <div className="EmptyCard__title">No matching notes</div>
            <div className="EmptyCard__text">Try a different search, or create a new note.</div>
          </div>
        ) : (
          <ul className="NoteList" role="list">
            {list.map((note) => {
              const isActive = note.id === selectedId;
              const safeTitle = deriveTitleFromNote(note.title, note.body);
              return (
                <li key={note.id} className="NoteList__item">
                  <button
                    className={`NoteList__button ${isActive ? 'is-active' : ''}`}
                    onClick={() => onSelectNote(note.id)}
                    aria-current={isActive ? 'true' : undefined}
                    title={safeTitle}
                  >
                    <div className="NoteList__title">{safeTitle}</div>
                    <div className="NoteList__meta">
                      {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
