/**
 * Reasoning loop: interpret intent → search (e.g. demographic) → synthesize answer.
 * synthesizeAnswer tries /api/ai first; falls back to Gemini when no backend.
 */

import { generateWithPrompt } from './gemini.js';
import { web } from './web.js';

export async function interpretIntent(userInput) {
  const lower = (userInput || '').toLowerCase();

  let intent = 'general';
  if (
    lower.includes('audience') ||
    lower.includes('demographic') ||
    lower.includes('behavior') ||
    lower.includes('market') ||
    lower.includes('customer') ||
    lower.includes('who buys') ||
    lower.includes('who listens') ||
    lower.includes('profile')
  ) {
    intent = 'demographic_research';
  } else if (
    lower.includes('graph') ||
    lower.includes('chart') ||
    lower.includes('compare')
  ) {
    intent = 'data_visualization';
  } else if (
    lower.includes('where') ||
    lower.includes('near me') ||
    lower.includes('location')
  ) {
    intent = 'location_search';
  }

  return {
    intent,
    originalInput: userInput,
  };
}

/**
 * Synthesize final answer from reasoning steps.
 * Tries POST /api/ai with { prompt }; falls back to Gemini when apiKey provided and no /api/ai.
 */
export async function synthesizeAnswer(steps, apiKey = null) {
  const context = JSON.stringify(steps, null, 2);
  const promptText = `Using the reasoning steps below produce the best answer.\n\n${context}`;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.answer != null) return data.answer;
    }
  } catch (_) {
    // No /api/ai or network error — use Gemini if we have a key
  }

  if (apiKey && apiKey.trim()) {
    const answer = await generateWithPrompt(
      'You are a concise research assistant. Given reasoning steps (interpret + search results), produce a single clear, helpful answer. Reply with plain text only.',
      promptText,
      apiKey
    );
    return answer || 'I could not synthesize an answer from the steps.';
  }

  throw new Error('AI synthesis failed. No /api/ai and no Gemini key.');
}

/**
 * Run interpret → deepDemographicSearch → synthesize and return the final answer.
 */
export async function reasoningLoop(userInput, apiKey = null) {
  console.log('Blip reasoning start');

  const steps = [];

  steps.push({
    step: 'interpret',
    result: await interpretIntent(userInput),
  });

  steps.push({
    step: 'search',
    result: await web.deepDemographicSearch(userInput, [], apiKey),
  });

  const synthesized = await synthesizeAnswer(steps, apiKey);
  steps.push({
    step: 'synthesize',
    result: synthesized,
  });

  console.log('Reasoning steps', steps);
  return steps[steps.length - 1].result;
}
