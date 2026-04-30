/**
 * Memory Store Service
 * Handles persistence for the Library District (Long-term memory).
 */

const STORAGE_KEY = 'blip_library_memory';

class MemoryStore {
  constructor() {
    this.memory = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { habits: [], preferences: {}, history_summaries: [] };
    } catch (e) {
      console.error("[MemoryStore] Failed to load memory:", e);
      return { habits: [], preferences: {}, history_summaries: [] };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.error("[MemoryStore] Failed to save memory:", e);
    }
  }

  addSummary(summary) {
    this.memory.history_summaries.push({
      text: summary,
      timestamp: new Date().toISOString()
    });
    // Keep last 50 summaries
    if (this.memory.history_summaries.length > 50) this.memory.history_summaries.shift();
    this.save();
  }

  updatePreference(key, value) {
    this.memory.preferences[key] = value;
    this.save();
  }

  addHabit(habit) {
    // Check if habit already exists, if so increment count/timestamp
    const existing = this.memory.habits.find(h => h.action === habit.action);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.last_seen = new Date().toISOString();
    } else {
      this.memory.habits.push({
        ...habit,
        count: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });
    }
    this.save();
  }

  getMemoryContext() {
    return {
      recent_summaries: this.memory.history_summaries.slice(-5),
      top_habits: this.memory.habits.sort((a,b) => b.count - a.count).slice(0, 5),
      preferences: this.memory.preferences
    };
  }
}

export const memoryStore = new MemoryStore();
