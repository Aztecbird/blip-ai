const DEFAULT_TTL_MS = Object.freeze({
  currentRecipient: 20 * 60 * 1000,
  currentDraft: 30 * 60 * 1000,
  recentNote: 45 * 60 * 1000,
  activePanel: 45 * 60 * 1000,
  lastOpenedTool: 45 * 60 * 1000,
  lastTimeReference: 20 * 60 * 1000,
  recentSearchTopic: 30 * 60 * 1000,
  relationshipTonePreferences: 24 * 60 * 60 * 1000,
});

function nowMs() {
  return Date.now();
}

function makeEntry(value, ttlMs) {
  return {
    value,
    createdAtMs: nowMs(),
    expiresAtMs: nowMs() + Math.max(1000, Number(ttlMs || 0)),
  };
}

function isExpired(entry) {
  if (!entry || typeof entry !== 'object') return true;
  return nowMs() >= Number(entry.expiresAtMs || 0);
}

export function createSharedMemory(options = {}) {
  const ttl = { ...DEFAULT_TTL_MS, ...(options.ttlOverrides || {}) };
  const session = {};
  const durableAdapter = options.durableAdapter || null;

  function set(name, value, opts = {}) {
    const ttlMs = Number(opts.ttlMs || ttl[name] || 10 * 60 * 1000);
    session[name] = makeEntry(value, ttlMs);
    return session[name];
  }

  function get(name) {
    const entry = session[name];
    if (!entry) return null;
    if (isExpired(entry)) {
      delete session[name];
      return null;
    }
    return entry.value;
  }

  function clear(name) {
    if (name) delete session[name];
  }

  function reset() {
    Object.keys(session).forEach((key) => delete session[key]);
  }

  function sweepExpired() {
    Object.keys(session).forEach((key) => {
      if (isExpired(session[key])) delete session[key];
    });
  }

  async function saveDurable(key, value) {
    if (!durableAdapter?.save) return false;
    await durableAdapter.save(key, value);
    return true;
  }

  async function loadDurable(key) {
    if (!durableAdapter?.load) return null;
    return durableAdapter.load(key);
  }

  function snapshot() {
    sweepExpired();
    const out = {};
    Object.keys(session).forEach((key) => {
      out[key] = session[key].value;
    });
    return out;
  }

  return {
    set,
    get,
    clear,
    reset,
    sweepExpired,
    snapshot,
    saveDurable,
    loadDurable,
  };
}
