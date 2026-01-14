import React from 'react';

// PUBLIC_INTERFACE
export default function Header({ noteCount }) {
  /** App header with title and note count. */
  return (
    <header className="Header" role="banner">
      <div className="Header__brand">
        <div className="Header__logo" aria-hidden="true">
          N
        </div>
        <div className="Header__titles">
          <h1 className="Header__title">Notes</h1>
          <p className="Header__subtitle" aria-live="polite">
            {noteCount} {noteCount === 1 ? 'note' : 'notes'} saved locally
          </p>
        </div>
      </div>
    </header>
  );
}
