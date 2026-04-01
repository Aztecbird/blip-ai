const STORAGE_KEY = 'blip_behavior_profile_v1';
const MAX_PATTERNS = 200;
const DECAY_RATE = 0.95; 
const MIN_CONFIDENCE_DELTA = 2; // Lead needed to nudge confidence

class BlipMistakeLearner {
  constructor() {
    this.memory = this.load();
  }

  /**
   * Build a signature that preserves context. 
   * Avoids dropping critical follow-up words like "it" or "him".
   */
  buildSignature(command = '') {
    const raw = String(command || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return '';
    
    // We keep up to 3 tokens (e.g. "send_it_now") to maintain context.
    return tokens.slice(0, 3).join('_');
  }

  /**
   * Record the outcome of an interaction.
   * @param {string} command - Original user text.
   * @param {string} tool - Tool used (gmail, telegram, etc.)
   * @param {string} outcome - 'success', 'failure', or 'correction'
   */
  recordToolOutcome(command = '', tool = '', outcome = 'success') {
    const sig = this.buildSignature(command);
    const toolId = String(tool || '').trim().toLowerCase();
    if (!sig || !toolId) return false;

    if (!this.memory[sig]) {
      this.memory[sig] = { toolScores: {}, totalInteracts: 0, lastUsed: Date.now(), successes: 0, failures: 0 };
    }

    const pattern = this.memory[sig];
    const scores = pattern.toolScores;
    
    if (!scores[toolId]) scores[toolId] = 0;

    // Weighting Logic
    if (outcome === 'success') {
        scores[toolId] += 1;
        pattern.successes++;
    }
    if (outcome === 'correction') {
        scores[toolId] += 2; // Users explicit feedback wins
        pattern.successes++;
    }
    if (outcome === 'failure') {
        scores[toolId] -= 1.5;
        pattern.failures++;
    }

    scores[toolId] = Math.max(-6, Math.min(12, scores[toolId]));
    pattern.lastUsed = Date.now();
    
    this.save();
    return true;
  }

  /**
   * Returns a behavioral nudge for the engine.
   */
  getToolLearningHint(command = '') {
    const sig = this.buildSignature(command);
    const pattern = this.memory[sig];
    if (!pattern?.toolScores) return null;

    const ranked = Object.entries(pattern.toolScores)
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    if (ranked.length === 0) return null;

    const [tool, score] = ranked[0];
    const numeric = Number(score || 0);
    const secondScore = ranked[1] ? Number(ranked[1][1] || 0) : -10;

    // Margin check: Avoid bias if scores are tied or too close.
    if (numeric - secondScore < MIN_CONFIDENCE_DELTA) {
      return null;
    }

    if (numeric < 2) return null;

    const confidence = Math.min(0.9, 0.55 + (numeric * 0.05));
    const clarifyFirst = pattern.failures > pattern.successes && numeric < 4;

    return {
      tool,
      confidence,
      clarifyFirst,
      signature: sig,
      score: numeric,
    };
  }

  /**
   * Returns a top-level summary of what Blip has learned.
   */
  getLearningSummary() {
    const entries = Object.entries(this.memory);
    if (!entries.length) return "No behavioral patterns learned yet.";

    const sorted = entries
      .filter(([_, data]) => Object.values(data.toolScores).some(s => s > 1.5))
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
      .slice(0, 8);

    if (!sorted.length) return "No strong behavioral patterns learned yet.";

    const lines = sorted.map(([sig, data]) => {
      const top = Object.entries(data.toolScores).sort((a, b) => b[1] - a[1])[0];
      return `- "${sig.replace(/_/g, ' ')}": favors ${top[0]} (score ${top[1].toFixed(1)})`;
    });

    return lines.join('\n');
  }

  load() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Size Limit
      const entries = Object.entries(this.memory);
      if (entries.length > MAX_PATTERNS) {
        const sorted = entries.sort((a, b) => b[1].lastUsed - a[1].lastUsed);
        this.memory = Object.fromEntries(sorted.slice(0, MAX_PATTERNS));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch (ignore) {}
  }
}

const learner = new BlipMistakeLearner();
export const recordToolOutcome = learner.recordToolOutcome.bind(learner);
export const getToolLearningHint = learner.getToolLearningHint.bind(learner);
export const getLearningSummary = learner.getLearningSummary.bind(learner);
