const STORAGE_KEY = 'notes_frontend.notes.v1';

/**
 * Returns current epoch time as an ISO string.
 * Kept as a helper so formatting can be standardized later.
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Creates a stable-ish unique id without adding a dependency.
 */
function createId() {
  // Prefer crypto.randomUUID when available.
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Creates a single starter note for first-run experience.
 */
function createSeedNotes() {
  const id = createId();
  return [
    {
      id,
      title: 'Welcome to Notes',
      body:
        'This is your personal notes manager.\n\n' +
        'Tips:\n' +
        '• Use the search box to filter notes\n' +
        '• Create a new note from the sidebar\n' +
        '• Your notes are saved automatically to this browser',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

// PUBLIC_INTERFACE
export function loadNotesFromStorage() {
  /**
   * Loads notes from localStorage, returning a valid array.
   * If storage is empty or invalid, returns a seeded list.
   */
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedNotes();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createSeedNotes();

    // Basic normalization/validation; keep forward-compatible.
    const normalized = parsed
      .filter((n) => n && typeof n === 'object' && typeof n.id === 'string')
      .map((n) => ({
        id: n.id,
        title: typeof n.title === 'string' ? n.title : '',
        body: typeof n.body === 'string' ? n.body : '',
        createdAt: typeof n.createdAt === 'string' ? n.createdAt : nowIso(),
        updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : nowIso(),
      }));

    return normalized.length ? normalized : createSeedNotes();
  } catch (e) {
    // Corrupt JSON or storage access issues: fall back to seed.
    return createSeedNotes();
  }
}

// PUBLIC_INTERFACE
export function saveNotesToStorage(notes) {
  /**
   * Persists notes array to localStorage.
   */
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    // If storage is full or unavailable, we silently fail.
    // The app remains usable for current session.
  }
}

// PUBLIC_INTERFACE
export function createEmptyNote() {
  /** Creates a new empty note with timestamps. */
  const createdAt = nowIso();
  return {
    id: createId(),
    title: 'Untitled',
    body: '',
    createdAt,
    updatedAt: createdAt,
  };
}
