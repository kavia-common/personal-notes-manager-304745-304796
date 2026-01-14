const STORAGE_KEY = 'notes_frontend.notes.v1';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} createdAt ISO string
 * @property {string} updatedAt ISO string
 */

/**
 * @typedef {Object} NotesStorageSchemaV1
 * @property {number} schemaVersion
 * @property {Note[]} notes
 */

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

/**
 * Coerces various date-ish values into an ISO string.
 * If invalid, returns the provided fallback ISO (or "now").
 *
 * @param {unknown} value
 * @param {string} [fallbackIso]
 * @returns {string}
 */
function coerceIsoDate(value, fallbackIso) {
  const fallback = typeof fallbackIso === 'string' ? fallbackIso : nowIso();

  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
    return fallback;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return fallback;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString();
    return fallback;
  }

  return fallback;
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

  const firstLine = String(body || '')
    .split('\n')
    .map((l) => normalizeWhitespace(l))[0] || '';
  if (firstLine) return firstLine.slice(0, 80);

  return 'Untitled';
}

/**
 * Creates a single starter note for first-run experience.
 *
 * @returns {Note[]}
 */
function createSeedNotes() {
  const id = createId();
  const ts = nowIso();
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
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

/**
 * Normalizes a single note-like object to the current schema.
 * Ensures:
 * - id is a non-empty string (generates one if missing)
 * - title/body are strings
 * - createdAt/updatedAt are ISO strings
 * - updatedAt is never earlier than createdAt
 *
 * @param {any} raw
 * @returns {Note}
 */
// PUBLIC_INTERFACE
export function normalizeNote(raw) {
  /** Normalizes a note object to the current schema, ensuring timestamps exist and are valid. */
  const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id : createId();
  const title = typeof raw?.title === 'string' ? raw.title : '';
  const body = typeof raw?.body === 'string' ? raw.body : '';

  const createdAt = coerceIsoDate(raw?.createdAt, nowIso());
  const updatedCandidate = coerceIsoDate(raw?.updatedAt, createdAt);

  const createdMs = Date.parse(createdAt);
  const updatedMs = Date.parse(updatedCandidate);

  const updatedAt = !Number.isNaN(createdMs) && !Number.isNaN(updatedMs) && updatedMs < createdMs ? createdAt : updatedCandidate;

  return {
    id,
    title,
    body,
    createdAt,
    updatedAt,
  };
}

/**
 * Normalizes an array of notes:
 * - drops non-objects
 * - normalizes each note
 * - de-duplicates by id (keeps most recently updated)
 *
 * @param {any} rawNotes
 * @returns {Note[]}
 */
// PUBLIC_INTERFACE
export function normalizeNotes(rawNotes) {
  /** Normalizes a list of notes to a clean, de-duplicated array. */
  const arr = Array.isArray(rawNotes) ? rawNotes : [];
  const map = new Map();

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;

    const n = normalizeNote(item);
    const prev = map.get(n.id);

    if (!prev) {
      map.set(n.id, n);
      continue;
    }

    const prevT = Date.parse(prev.updatedAt || prev.createdAt || 0);
    const nextT = Date.parse(n.updatedAt || n.createdAt || 0);
    if ((Number.isNaN(prevT) ? -Infinity : prevT) <= (Number.isNaN(nextT) ? -Infinity : nextT)) {
      map.set(n.id, n);
    }
  }

  return Array.from(map.values());
}

/**
 * Convert whatever is in localStorage into the current schema object.
 * Supports:
 * - v0: array of notes (previous shape)
 * - v1: { schemaVersion, notes }
 *
 * If shape is unknown, returns null so caller can reset to defaults.
 *
 * @param {any} parsed
 * @returns {NotesStorageSchemaV1|null}
 */
function migrateToCurrentSchema(parsed) {
  // v1: already versioned, but still normalize content (types/timestamps/dedup).
  if (
    parsed &&
    typeof parsed === 'object' &&
    typeof parsed.schemaVersion === 'number' &&
    Array.isArray(parsed.notes)
  ) {
    const notes = normalizeNotes(parsed.notes);
    return { schemaVersion: CURRENT_SCHEMA_VERSION, notes };
  }

  // v0: legacy shape was a bare array of notes; normalize and wrap in the current schema.
  if (Array.isArray(parsed)) {
    const notes = normalizeNotes(parsed);
    return { schemaVersion: CURRENT_SCHEMA_VERSION, notes };
  }

  // Unknown/corrupt shapes are treated as non-migratable (caller will reset to defaults).
  return null;
}

/**
 * Returns the default storage schema value used on first-run / reset.
 *
 * @returns {NotesStorageSchemaV1}
 */
function defaultSchema() {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, notes: createSeedNotes() };
}

/**
 * Checks whether an error looks like a quota exceeded error across browsers.
 * @param {unknown} e
 * @returns {boolean}
 */
function isQuotaExceededError(e) {
  if (!e || typeof e !== 'object') return false;
  const name = /** @type {any} */ (e).name;
  const code = /** @type {any} */ (e).code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

/**
 * Safe JSON.parse wrapper.
 * @param {string} raw
 * @returns {{ ok: true, value: any } | { ok: false, error: Error }}
 */
function safeJsonParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error('JSON.parse failed') };
  }
}

/**
 * Safely loads schema from localStorage:
 * - guards JSON.parse
 * - migrates old shapes
 * - if corrupt/unknown, resets to normalized default schema
 * - optionally persists the normalized result back to storage
 *
 * @param {{ persistOnFix?: boolean }} [options]
 * @returns {{ schema: NotesStorageSchemaV1, wasRepaired: boolean }}
 */
// PUBLIC_INTERFACE
export function safeLoad(options) {
  /** Loads notes schema safely; repairs/migrates as needed and never throws. */
  const persistOnFix = options?.persistOnFix !== false;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const schema = defaultSchema();
      if (persistOnFix) {
        // Best-effort persist; ignore errors.
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        } catch (_) {
          // ignore
        }
      }
      return { schema, wasRepaired: true };
    }

    const parsedRes = safeJsonParse(raw);
    if (!parsedRes.ok) {
      const schema = defaultSchema();
      if (persistOnFix) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        } catch (_) {
          // ignore
        }
      }
      return { schema, wasRepaired: true };
    }

    const migrated = migrateToCurrentSchema(parsedRes.value);
    if (!migrated) {
      const schema = defaultSchema();
      if (persistOnFix) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        } catch (_) {
          // ignore
        }
      }
      return { schema, wasRepaired: true };
    }

    // If migration/normalization results in empty notes, seed a default.
    // This covers cases where storage existed but was effectively unusable after normalization.
    const schema =
      migrated.notes && migrated.notes.length ? migrated : { schemaVersion: CURRENT_SCHEMA_VERSION, notes: createSeedNotes() };

    // We consider the load "repaired" if:
    // - schemaVersion was missing/incorrect, OR
    // - normalization/dedup altered the notes compared to what was stored.
    let wasRepaired =
      typeof parsedRes.value !== 'object' ||
      parsedRes.value === null ||
      parsedRes.value.schemaVersion !== CURRENT_SCHEMA_VERSION;

    if (!wasRepaired) {
      // Detect normalization changes even when schemaVersion is already current.
      const originalNotes = Array.isArray(parsedRes.value?.notes) ? parsedRes.value.notes : [];
      try {
        wasRepaired = JSON.stringify(normalizeNotes(originalNotes)) !== JSON.stringify(schema.notes);
      } catch (_) {
        // If stringify fails for any reason, err on the side of persisting the repaired schema.
        wasRepaired = true;
      }
    }

    if (persistOnFix && wasRepaired) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
      } catch (_) {
        // ignore
      }
    }

    return { schema, wasRepaired };
  } catch (e) {
    // localStorage access may throw in some environments; fall back to in-memory default.
    const schema = defaultSchema();
    return { schema, wasRepaired: true };
  }
}

/**
 * Safely saves schema to localStorage.
 * - never throws
 * - returns a status so callers can surface failures
 *
 * @param {NotesStorageSchemaV1} schema
 * @returns {{ ok: true } | { ok: false, error: Error, isQuotaExceeded: boolean }}
 */
// PUBLIC_INTERFACE
export function safeSave(schema) {
  /** Saves notes schema safely; returns a status object instead of throwing. */
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error('localStorage setItem failed');
    const quota = isQuotaExceededError(e);
    // Log for debugging; app continues running.
    // eslint-disable-next-line no-console
    console.warn('[storage] Failed to save notes', { quotaExceeded: quota, error: err });
    return { ok: false, error: err, isQuotaExceeded: quota };
  }
}

/**
 * Internal singleton to ensure initialization happens once per session (prevents double-loads).
 * This is important under React StrictMode where initializers/effects can run twice in dev.
 */
let _initCache = null;

/**
 * Loads notes once and returns normalized values for state initialization.
 * Will repair/migrate storage if needed.
 *
 * @returns {{ notes: Note[], selectedId: string|null, wasRepaired: boolean }}
 */
// PUBLIC_INTERFACE
export function initNotesState() {
  /** One-shot initializer to avoid multiple loads; returns clean notes + selectedId. */
  if (_initCache) return _initCache;

  const { schema, wasRepaired } = safeLoad({ persistOnFix: true });
  const notes = normalizeNotes(schema.notes);
  const selectedId = notes[0]?.id ?? null;

  _initCache = { notes, selectedId, wasRepaired };
  return _initCache;
}

/**
 * Backwards-compatible loader used by older code paths.
 * Prefer `initNotesState()` in App to avoid double loads.
 */
// PUBLIC_INTERFACE
export function loadNotesFromStorage() {
  /**
   * Loads notes from localStorage, returning a valid array.
   * If storage is empty or invalid, returns a seeded list.
   */
  return initNotesState().notes;
}

/**
 * Backwards-compatible saver used by older code paths.
 * Prefer `saveNotesSchema()` or `safeSave()` to detect quota failures.
 */
// PUBLIC_INTERFACE
export function saveNotesToStorage(notes) {
  /**
   * Persists notes array to localStorage.
   */
  const schema = { schemaVersion: CURRENT_SCHEMA_VERSION, notes: normalizeNotes(notes) };
  safeSave(schema);
}

/**
 * Save notes as a schema object (versioned), with a return status.
 *
 * @param {Note[]} notes
 * @returns {{ ok: true } | { ok: false, error: Error, isQuotaExceeded: boolean }}
 */
// PUBLIC_INTERFACE
export function saveNotesSchema(notes) {
  /** Saves normalized notes to localStorage as a versioned schema; returns save status. */
  const schema = { schemaVersion: CURRENT_SCHEMA_VERSION, notes: normalizeNotes(notes) };
  return safeSave(schema);
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
