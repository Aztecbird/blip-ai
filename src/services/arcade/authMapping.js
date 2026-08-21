/**
 * Arcade Auth Mapping Service
 *
 * Maps Blip User IDs to Arcade User IDs.
 * This is essential for maintaining consistent tool authentication across sessions.
 *
 * Uses a browser-safe deterministic hash (no Node `crypto`) so Vite builds run in the client.
 */

// This is a simple in-memory map for now. In production, this should be a DB call.
const userMap = new Map();

/** Deterministic 8-hex suffix for Arcade `user_id` (stable across sessions for the same Blip id). */
function hashBlipUserIdForArcade(blipUserId) {
    let h = 5381;
    const s = String(blipUserId);
    for (let i = 0; i < s.length; i += 1) {
        h = Math.imul(33, h) ^ s.charCodeAt(i);
    }
    return (h >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

/**
 * Gets the Arcade User ID for a given Blip User ID.
 * If one doesn't exist, it generates a deterministic one.
 *
 * @param {string} blipUserId
 * @returns {string} arcadeUserId
 */
export function getArcadeUserId(blipUserId) {
    if (!blipUserId) return 'default-blip-user';

    if (userMap.has(blipUserId)) {
        return userMap.get(blipUserId);
    }

    const arcadeUserId = `blip-${hashBlipUserIdForArcade(blipUserId)}`;
    userMap.set(blipUserId, arcadeUserId);

    return arcadeUserId;
}

/**
 * Browser-side Arcade is intentionally disabled because its API key is a
 * server secret. Route Arcade operations through a protected backend.
 *
 * @returns {boolean}
 */
export function isArcadeConfigured() {
    return false;
}
