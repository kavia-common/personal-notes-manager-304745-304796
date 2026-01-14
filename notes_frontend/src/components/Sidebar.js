import React, { useEffect, useRef } from 'react';
import { deriveTitleFromNote } from '../utils/storage';

function formatShortDate(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// PUBLIC_INTERFACE
export default function Sidebar({
  notes,
  filteredNotes,
  selectedId,
  searchQuery,
  onSearchQueryChange,
  onSelectNote,
  onCreateNote,
  isOpen,
  onRequestClose,
  showOverlay,
}) {
  /**
   * Sidebar for searching and selecting notes.
   * Filtering is computed in App to keep selection + results behavior consistent.
   */
  const searchId = 'notes-search';
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    // Provide a convenient focus target on first mount for keyboard users.
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const list = filteredNotes ?? notes;

  const focusItemAt = (idx) => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-note-idx="${idx}"]`);
    if (el && typeof el.focus === 'function') el.focus();
  };

  const onListKeyDown = (e) => {
    if (!list || list.length === 0) return;

    const idxAttr = e.currentTarget.getAttribute('data-note-idx');
    const currentIdx = typeof idxAttr === 'string' ? Number(idxAttr) : -1;
    const idx = Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItemAt(Math.min(list.length - 1, idx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItemAt(Math.max(0, idx - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItemAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItemAt(list.length - 1);
    } else if (e.key === 'Escape') {
      if (showOverlay && typeof onRequestClose === 'function') {
        e.preventDefault();
        onRequestClose();
        if (searchRef.current) searchRef.current.focus();
      }
    }
  };

  const noNotes = (notes || []).length === 0;
  const hasSearch = (searchQuery || '').trim().length > 0;
  const showNoResults = !noNotes && hasSearch && list.length === 0;

  return (
    <>
      {showOverlay && isOpen ? (
        <button
          type="button"
          className="SidebarOverlay"
          aria-label="Close sidebar"
          onClick={onRequestClose}
        />
      ) : null}

      <aside className={`Sidebar ${showOverlay ? 'Sidebar--overlay' : ''}`} aria-label="Notes sidebar" data-open={isOpen ? 'true' : 'false'}>
        <div className="Sidebar__top">
          <div className="Sidebar__actions">
            <button className="Button Button--primary Button--full" onClick={onCreateNote} aria-label="Create new note">
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
              aria-label="Search notes"
            />
          </div>
        </div>

        <nav className="Sidebar__list" aria-label="Notes list">
          {noNotes ? (
            <div className="EmptyCard" role="status">
              <div className="EmptyCard__title">No notes yet</div>
              <div className="EmptyCard__text">Create your first note to get started.</div>
            </div>
          ) : showNoResults ? (
            <div className="EmptyCard" role="status">
              <div className="EmptyCard__title">No search results</div>
              <div className="EmptyCard__text">Try a different search, or create a new note.</div>
            </div>
          ) : list.length === 0 ? (
            <div className="EmptyCard" role="status">
              <div className="EmptyCard__title">Nothing to show</div>
              <div className="EmptyCard__text">Clear your search to see all notes.</div>
            </div>
          ) : (
            <ul className="NoteList" ref={listRef}>
              {list.map((note, idx) => {
                const isActive = note.id === selectedId;
                const safeTitle = deriveTitleFromNote(note.title, note.body);
                const updatedIso = note.updatedAt || note.createdAt || new Date().toISOString();
                const short = formatShortDate(updatedIso);
                const full = new Date(updatedIso).toISOString();

                return (
                  <li key={note.id} className="NoteList__item">
                    <button
                      className={`NoteList__button ${isActive ? 'is-active' : ''}`}
                      onClick={() => onSelectNote(note.id)}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`Open note ${safeTitle}`}
                      title={safeTitle}
                      data-note-idx={idx}
                      tabIndex={isActive ? 0 : -1}
                      onKeyDown={onListKeyDown}
                      type="button"
                    >
                      <div className="NoteList__title">{safeTitle}</div>
                      <div className="NoteList__meta" title={full}>
                        Updated {short}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
}
