const STORAGE_KEY = 'notes_frontend.notes.v1';

/**
 * Returns current epoch time as an ISO string.
 * Kept as a helper so formatting can be standardized later.
 */
// PUBLIC_INTERFACE
export function nowIso() {
  /** Returns current time in ISO-8601 format. */
  return new Date().toISOString();
}

/**
 * Trim + normalize whitespace for display.
 */
function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// PUBLIC_INTERFACE
export function deriveTitleFromNote(title, body) {
  /**
   * Returns a safe, user-friendly title.
   * - Prefers explicit title when present
   * - Falls back to first line of body
   * - Falls back to "Untitled"
   */
  const t = normalizeWhitespace(title);
  if (t) return t;

  const firstLine = String(body || '').split('\n').map((l) => normalizeWhitespace(l))[0] || '';
  if (firstLine) return firstLine.slice(0, 80);

  return 'Untitled';
}

// PUBLIC_INTERFACE
export function normalizeNote(raw) {
  /**
   * Normalizes a note object to the current schema, ensuring timestamps exist and are valid.
   */
  const createdAt =
    typeof raw?.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : nowIso();

  // If updatedAt is missing/invalid, keep it >= createdAt.
  const updatedCandidate =
    typeof raw?.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : createdAt;

  const updatedAt = Date.parse(updatedCandidate) < Date.parse(createdAt) ? createdAt : updatedCandidate;

  const title = typeof raw?.title === 'string' ? raw.title : '';
  const body = typeof raw?.body === 'string' ? raw.body : '';

  return {
    id: String(raw?.id || ''),
    title,
    body,
    createdAt,
    updatedAt,
  };
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
      .map((n) => normalizeNote(n));

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
    title: '',
    body: '',
    createdAt,
    updatedAt: createdAt,
  };
}
