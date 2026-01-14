import React, { useEffect, useMemo, useRef } from 'react';
import { deriveTitleFromNote } from '../utils/storage';

function formatDateTime(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// PUBLIC_INTERFACE
export default function NoteEditor({ note, onChange, onRequestDelete }) {
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

  // Compute memoized values unconditionally to satisfy Rules of Hooks.
  // When note is null, we safely fall back to "now"; these values won't be rendered anyway.
  const createdIso = note?.createdAt || note?.updatedAt || new Date().toISOString();
  const updatedIso = note?.updatedAt || note?.createdAt || new Date().toISOString();

  const createdText = useMemo(() => formatDateTime(createdIso), [createdIso]);
  const updatedText = useMemo(() => formatDateTime(updatedIso), [updatedIso]);

  const createdTitle = useMemo(() => new Date(createdIso).toISOString(), [createdIso]);
  const updatedTitle = useMemo(() => new Date(updatedIso).toISOString(), [updatedIso]);

  const displayTitle = useMemo(() => deriveTitleFromNote(note?.title, note?.body), [note?.title, note?.body]);

  if (!note) {
    return (
      <main className="Main" role="main">
        <div className="EmptyMain" role="status">
          <h2 className="EmptyMain__title">No note selected</h2>
          <p className="EmptyMain__text">Choose a note from the sidebar, or create a new one.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="Main" role="main" aria-label="Note editor">
      <div className="EditorCard">
        <div className="EditorCard__top">
          <div className="EditorCard__meta" aria-label="Note timestamps">
            <span className="MetaRow">
              <span className="MetaLabel">Created:</span>{' '}
              <span className="MetaValue" title={createdTitle}>
                {createdText}
              </span>
            </span>
            <span className="MetaDot" aria-hidden="true">
              ·
            </span>
            <span className="MetaRow">
              <span className="MetaLabel">Updated:</span>{' '}
              <span className="MetaValue" title={updatedTitle}>
                {updatedText}
              </span>
            </span>
          </div>

          <button
            type="button"
            className="Button Button--danger"
            onClick={() => onRequestDelete(note.id)}
            aria-label={`Delete note ${displayTitle}`}
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
            value={note.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Untitled"
            aria-label="Note title"
          />
        </div>

        <div className="Field">
          <label className="Label" htmlFor={bodyId}>
            Body
          </label>
          <textarea
            id={bodyId}
            className="Textarea"
            value={note.body ?? ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Write your note…"
            rows={14}
            aria-label="Note body"
          />
        </div>
      </div>
    </main>
  );
}
