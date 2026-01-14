import React from 'react';

// PUBLIC_INTERFACE
export default function Header({ noteCount, showSidebarToggle, isSidebarOpen, onToggleSidebar }) {
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

        {showSidebarToggle ? (
          <div className="Header__spacer" aria-hidden="true" />
        ) : null}

        {showSidebarToggle ? (
          <button
            type="button"
            className="IconButton"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-pressed={isSidebarOpen ? 'true' : 'false'}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {/* Simple "hamburger" icon using CSS-friendly spans */}
            <span className="IconButton__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
