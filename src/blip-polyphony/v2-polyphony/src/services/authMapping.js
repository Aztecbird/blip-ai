/**
 * Arcade Auth Mapping Service
 * 
 * Maps Blip User IDs to Arcade User IDs.
 * This is essential for maintaining consistent tool authentication across sessions.
 */

import crypto from 'crypto';

// This is a simple in-memory map for now. In production, this should be a DB call.
const userMap = new Map();

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

    // Generate a unique but deterministic Arcade User ID based on the Blip User ID
    const arcadeUserId = `blip-${crypto.createHash('md5').update(blipUserId).digest('hex').substring(0, 8)}`;
    userMap.set(blipUserId, arcadeUserId);
    
    return arcadeUserId;
}

/**
 * Validates if the current environment is ready for Arcade calls.
 * 
 * @returns {boolean}
 */
export function isArcadeConfigured() {
    return !!process.env.ARCADE_API_KEY;
}
