/**
 * @file IntentInterpreter.js
 * @category Core
 * @description The "Ear" of the core engine. Translates messy voice input into 
 * structured, actionable intents.
 */

import { memoryManager } from './MemoryManager.js';

export const INTENT_TYPES = {
  MESSAGE_SEND: 'communication.send',
  CALENDAR_OPEN: 'calendar.view',
  NOTE_TAKE: 'notes.create',
  UI_CLOSE: 'ui.dismiss',
  TIMER_SET: 'timer.create',
  VIDEO_SEARCH: 'youtube.search',
  UNKNOWN: 'fallback.reasoning'
};

class BlipIntentInterpreter {
  constructor() {
    this.confidenceThreshold = 0.8;
  }

  /**
   * Main entry point for interpreting a command.
   */
  async interpret(text, history = []) {
    const raw = String(text || '').trim();
    const lower = raw.toLowerCase();

    if (!lower) return this.createIntent(INTENT_TYPES.UNKNOWN, 0);

    // 1. Rule-based fast parsing (High Confidence)
    const ruleIntent = this.runRules(lower);
    if (ruleIntent && ruleIntent.confidence >= this.confidenceThreshold) {
      this.updateMemory(ruleIntent);
      return ruleIntent;
    }

    // 2. Ambiguity Detection
    const isAmbiguous = this.checkAmbiguity(lower, ruleIntent);

    // 3. Entity Extraction (Heuristics)
    const entities = this.extractEntities(lower);

    return this.createIntent(
      ruleIntent ? ruleIntent.type : INTENT_TYPES.UNKNOWN,
      ruleIntent ? ruleIntent.confidence : 0.4,
      entities,
      { isAmbiguous, originalText: raw }
    );
  }

  runRules(text) {
    // Message Intent: "send message to [Name]", "tell [Name] [Message]"
    const msgMatch = text.match(/\b(?:send|tell|message)\s+(?:a\s+message\s+to\s+)?(\w+)\s+(.+)/i);
    if (msgMatch) {
      return this.createIntent(INTENT_TYPES.MESSAGE_SEND, 0.9, { 
        recipient: msgMatch[1], 
        content: msgMatch[2] 
      });
    }

    // Calendar Intent: "open calendar", "show calendar for tomorrow"
    if (text.includes('calendar')) {
      const dateStr = text.includes('tomorrow') ? 'tomorrow' : 'today';
      return this.createIntent(INTENT_TYPES.CALENDAR_OPEN, 0.95, { date: dateStr });
    }

    // Note Intent: "take a note", "note down [Content]"
    if (text.includes('note')) {
      const content = text.replace(/take a note|note down|write a note/g, '').trim();
      return this.createIntent(INTENT_TYPES.NOTE_TAKE, 0.85, { content });
    }

    // Timer Intent: "set timer for 8 minutes"
    const timerMatch = text.match(/\b(?:timer|set\s+timer)\s+(?:for\s+)?(\d+)\s+(minute|minutes|second|seconds|hour|hours)/i);
    if (timerMatch) {
      return this.createIntent(INTENT_TYPES.TIMER_SET, 0.98, { 
        duration: parseInt(timerMatch[1]), 
        unit: timerMatch[2] 
      });
    }

    // UI Control: "close this", "close everything"
    if (text.includes('close')) {
      const scope = text.includes('everything') ? 'all' : 'active';
      return this.createIntent(INTENT_TYPES.UI_CLOSE, 0.9, { scope });
    }

    return null;
  }

  extractEntities(text) {
    // Very basic entity extraction for demo
    const names = ['natasha', 'teo', 'pablo']; // In real app, this comes from contacts
    let recipient = null;
    names.forEach(name => {
      if (text.includes(name)) recipient = name;
    });

    return { recipient };
  }

  checkAmbiguity(text, ruleIntent) {
    // If multiple patterns match or if key info is missing
    if (text.includes('send') && !text.includes('to')) return true;
    return false;
  }

  createIntent(type, confidence, entities = {}, meta = {}) {
    return {
      type,
      confidence,
      entities,
      meta,
      timestamp: Date.now()
    };
  }

  updateMemory(intent) {
    if (intent.entities?.recipient) {
      memoryManager.update('currentRecipient', intent.entities.recipient);
    }
    memoryManager.update('lastIntent', intent.type);
  }
}

export const intentInterpreter = new BlipIntentInterpreter();
