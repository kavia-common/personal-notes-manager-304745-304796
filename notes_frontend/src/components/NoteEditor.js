import React, { useEffect, useRef } from 'react';

// PUBLIC_INTERFACE
export default function NoteEditor({ note, onChange, onDelete }) {
  /**
   * Main editor area for the selected note.
   * `onChange` accepts partial updates: {title, body}
   */
  const titleId = 'note-title';
  const bodyId = 'note-body';
  const titleRef = useRef(null);

  useEffect(() => {
    // When a new note is selected, focus title for quick editing.
    if (titleRef.current) titleRef.current.focus();
  }, [note?.id]);

  if (!note) {
    return (
      <main className="Main" role="main">
        <div className="EmptyMain" role="status">
          <h2 className="EmptyMain__title">Select a note</h2>
          <p className="EmptyMain__text">Choose a note from the sidebar or create a new one.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="Main" role="main">
      <div className="EditorCard">
        <div className="EditorCard__top">
          <div className="EditorCard__meta" aria-label="Note updated time">
            Updated {new Date(note.updatedAt || Date.now()).toLocaleString()}
          </div>

          <button
            className="Button Button--danger"
            onClick={() => {
              const title = (note.title || '').trim() || 'Untitled';
              // eslint-disable-next-line no-alert
              const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
              if (ok) onDelete(note.id);
            }}
          >
            Delete
          </button>
        </div>

        <div className="Field">
          <label className="Label" htmlFor={titleId}>
            Title
          </label>
          <input
            id={titleId}
            ref={titleRef}
            className="Input Input--title"
            type="text"
            value={note.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Untitled"
          />
        </div>

        <div className="Field">
          <label className="Label" htmlFor={bodyId}>
            Body
          </label>
          <textarea
            id={bodyId}
            className="Textarea"
            value={note.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Write your note…"
            rows={14}
          />
        </div>
      </div>
    </main>
  );
}
