/**
 * @file MistakeLearner.js
 * @category Logic
 * @description Refined learning loop for Blip. 
 * Prevents overfitting, supports tie-breaking, and avoids punishing clarification.
 */

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
   */
  recordOutcome(command, tool, outcome) {
    const sig = this.buildSignature(command);
    const toolId = String(tool || '').trim().toLowerCase();
    if (!sig || !toolId) return;

    if (!this.memory[sig]) {
      this.memory[sig] = { toolScores: {}, totalInteracts: 0, lastUsed: Date.now() };
    }

    const pattern = this.memory[sig];
    const scores = pattern.toolScores;
    
    if (!scores[toolId]) scores[toolId] = 0;

    // Weighting Logic
    if (outcome === 'success') scores[toolId] += 1;
    if (outcome === 'correction') scores[toolId] += 2; // Users explicit feedback wins
    if (outcome === 'failure') scores[toolId] -= 1.5;

    scores[toolId] = Math.max(-6, Math.min(12, scores[toolId]));
    pattern.totalInteracts++;
    pattern.lastUsed = Date.now();
    
    this.save();
  }

  /**
   * Returns a behavioral nudge for the engine.
   */
  getAdjustment(command) {
    const sig = this.buildSignature(command);
    const pattern = this.memory[sig];
    if (!pattern?.toolScores) return null;

    const ranked = Object.entries(pattern.toolScores)
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0) return null;

    const [topTool, topScore] = ranked[0];
    const secondScore = ranked[1] ? ranked[1][1] : -10;

    // Margin check: Avoid bias if scores are tied or too close.
    if (topScore - secondScore < MIN_CONFIDENCE_DELTA) {
      return { status: 'ambiguous', tool: topTool, score: topScore };
    }

    return {
      status: 'learned',
      tool: topTool,
      confidenceBoost: Math.min(0.15, topScore * 0.015),
      score: topScore,
      prefersClarify: topScore < 4
    };
  }

  getToolLearningHint(command = '') {
    const adjustment = this.getAdjustment(command);
    if (!adjustment || adjustment.status !== 'learned') return null;
    return {
      tool: adjustment.tool,
      confidence: Math.min(0.9, 0.55 + Number(adjustment.confidenceBoost || 0)),
      clarifyFirst: Boolean(adjustment.prefersClarify),
      signature: this.buildSignature(command),
      score: Number(adjustment.score || 0)
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  save() {
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

export const mistakeLearner = new BlipMistakeLearner();
export const getToolLearningHint = mistakeLearner.getToolLearningHint.bind(mistakeLearner);
