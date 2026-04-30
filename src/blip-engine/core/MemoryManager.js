/**
 * @file MemoryManager.js
 * @category Core
 * @description Centralized "Working Memory" for Blip. 
 * Shared across all tools to provide context-aware interactions.
 */

class BlipMemoryManager {
  constructor() {
    this.sessionMemory = {
      currentRecipient: null,
      currentDraft: null,
      lastTool: null,
      lastIntent: null,
      recentEntities: [], // Names, places, topics
      history: [],
    };
    
    // Persistent hooks could go here for DB storage.
    this.memoryExpiryMs = 15 * 60 * 1000; // 15 mins
    this.lastReset = Date.now();
  }

  /**
   * Save context that cross-tool actions can refer to.
   */
  update(key, value) {
    if (this.sessionMemory.hasOwnProperty(key)) {
      this.sessionMemory[key] = value;
      this.sessionMemory.history.push({ key, value, time: Date.now() });
      console.log(`Blip Memory Updated: [${key}]`, value);
    }
  }

  /**
   * Store a "Detected Entity" (ex: "Natasha" or "8 minutes")
   */
  rememberEntity(entity) {
    if (!entity) return;
    this.sessionMemory.recentEntities.push({
      ...entity,
      timestamp: Date.now()
    });
    // Keep only last 5 entities to avoid confusion.
    if (this.sessionMemory.recentEntities.length > 5) {
      this.sessionMemory.recentEntities.shift();
    }
  }

  /**
   * Retrieve session state.
   */
  getSession() {
    this.checkExpiry();
    return this.sessionMemory;
  }

  /**
   * Cleans old or irrelevant memory to prevent "Leaking" context.
   */
  checkExpiry() {
    const now = Date.now();
    if (now - this.lastReset > this.memoryExpiryMs) {
      console.warn("Memory session expired. Cleaning up.");
      this.reset();
    }
    
    // Auto-clean old entities.
    this.sessionMemory.recentEntities = this.sessionMemory.recentEntities.filter(
      e => now - e.timestamp < 300000 // Only keep last 5 mins of entities
    );
  }

  reset() {
    this.sessionMemory = {
      currentRecipient: null,
      currentDraft: null,
      lastTool: null,
      lastIntent: null,
      recentEntities: [],
      history: [],
    };
    this.lastReset = Date.now();
  }
}

export const memoryManager = new BlipMemoryManager();
