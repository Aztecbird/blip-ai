/**
 * Lightweight reasoning router for Blip.
 * Fast brain handles the common quick-response path.
 * Deep brain adds a small planning layer before the existing heavier flow.
 */

import { askGemini, generateWithPrompt } from './geminiText.js';
<<<<<<< HEAD
=======
import { askOllama } from './ollama.js';
>>>>>>> ui-update-final
import { web } from './web.js';

function normalizeMessage(value = '') {
  return String(value || '').trim();
}

function lowerMessage(value = '') {
  return normalizeMessage(value).toLowerCase();
}

function detectAudienceMode(message = '', context = {}) {
  const explicitMode = String(context.mode || '').toLowerCase().trim();
  if (['kids', 'kid', 'child', 'children'].includes(explicitMode)) return 'kids';
  if (['senior', 'seniors', 'elder', 'elderly'].includes(explicitMode)) return 'senior';

  const lower = lowerMessage(message);
  if (
    /\b(?:for\s+kids|for\s+a\s+kid|for\s+children|for\s+my\s+child|for\s+my\s+son|for\s+my\s+daughter|5\s*year\s*old|6\s*year\s*old|five\s+year\s+old|six\s+year\s+old|under\s+7)\b/.test(lower)
  ) return 'kids';
  if (
    /\b(?:for\s+seniors|for\s+my\s+grandma|for\s+my\s+grandpa|for\s+an?\s+older\s+person|for\s+the\s+elderly|senior\s+friendly|elder\s+friendly)\b/.test(lower)
  ) return 'senior';

  return 'normal';
}

export function buildAudienceStyle(context = {}) {
  const mode = detectAudienceMode(context.message || '', context);
  if (mode === 'kids') {
    return {
      mode,
      prompt: 'Explain it for a child under 7. Use very simple words, short sentences, and a playful gentle tone.',
      label: 'kids'
    };
  }
  if (mode === 'senior') {
    return {
      mode,
      prompt: 'Explain it for a senior. Use calm, clear wording, short steps, and avoid rushed or dense phrasing.',
      label: 'senior'
    };
  }
  return {
    mode: 'normal',
    prompt: 'Use Blip’s normal style: clear, concise, warm, and not verbose.',
    label: 'normal'
  };
}

function getToolSignals(message = '') {
  const lower = lowerMessage(message);
  const signals = new Set();
  if (/\b(weather|temperature|forecast|rain|sunny|windy)\b/.test(lower)) signals.add('weather');
  if (/\b(youtube|video|song|music|playlist|piano)\b/.test(lower)) signals.add('youtube');
  if (/\b(calendar|schedule|agenda|remind|reminder|appointment|meeting|plan)\b/.test(lower)) signals.add('calendar');
  if (/\b(image|picture|photo|draw|design|creation|illustration|show me)\b/.test(lower)) signals.add('image');
  if (/\b(map|route|directions|near me|restaurant|place)\b/.test(lower)) signals.add('map');
  if (/\b(graph|chart|compare|data)\b/.test(lower)) signals.add('chart');
  if (/\b(search|look up|find out|research)\b/.test(lower)) signals.add('search');
  if (/\b(timer|countdown|alarm)\b/.test(lower)) signals.add('timer');
  return Array.from(signals);
}

function inferPreferredActions(message = '') {
  const lower = lowerMessage(message);
  const preferred = [];
  if (/\b(weather|temperature|forecast)\b/.test(lower)) preferred.push('weather');
  if (/\b(calendar|schedule|agenda|appointment|meeting|remind|plan)\b/.test(lower)) preferred.push('calendar');
  if (/\b(timer|countdown|alarm)\b/.test(lower)) preferred.push('timer');
  if (/\b(youtube|video|music|playlist|song)\b/.test(lower)) preferred.push('youtube');
  if (/\b(map|route|directions|near me|restaurant|place)\b/.test(lower)) preferred.push('map');
  if (/\b(graph|chart|compare|data)\b/.test(lower)) preferred.push('chart');
  if (/\b(search|look up|find out|research)\b/.test(lower)) preferred.push('search');
  return [...new Set(preferred)];
}

function classifyReasonCodes(message = '', context = {}) {
  const lower = lowerMessage(message);
  const reasons = [];
  const toolSignals = getToolSignals(message);
  const audienceMode = detectAudienceMode(message, context);

  const isGreeting = /^(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)\b/.test(lower);
  const isShortSimple = lower.split(/\s+/).filter(Boolean).length <= 7;
  const multiStep = /\b(and then|then|after that|also|plus)\b/.test(lower) || ((lower.match(/\b(and|then)\b/g) || []).length >= 2);
  const explanation = /\b(explain|teach|walk me through|step by step|simplify|simple terms|help me understand|what does .* mean)\b/.test(lower);
  const scheduling = /\b(schedule|plan|appointment|meeting|calendar|agenda|remind|reminder|tomorrow|next week|at \d|am\b|pm\b)\b/.test(lower);
  const reasoningTask = /\b(puzzle|riddle|maze|logic|math|calculate|solve|how many|why does|reasoning|game)\b/.test(lower);
  const demographicResearch = /\b(audience|demographic|behavior|market|customer|who buys|who listens|profile)\b/.test(lower);
  const toolDisambiguation = toolSignals.length >= 2;

  if (multiStep) reasons.push('multi_step');
  if (explanation) reasons.push('explanation');
  if (scheduling) reasons.push('planning');
  if (reasoningTask) reasons.push('reasoning_task');
  if (demographicResearch) reasons.push('market_research');
  if (audienceMode !== 'normal') reasons.push('audience_mode');
  if (toolDisambiguation) reasons.push('multi_tool');
  if (!reasons.length && !isGreeting && !isShortSimple && /\?/.test(lower) && lower.split(/\s+/).length > 16) reasons.push('complex_query');

  return {
    reasons,
    audienceMode,
    toolSignals,
    isGreeting,
    isShortSimple
  };
}

export function classifyReasoningMode(message = '', context = {}) {
  const details = classifyReasonCodes(message, context);
  const mode = details.reasons.length ? 'deep' : 'fast';
  const reason = details.reasons.length
    ? details.reasons.join(', ')
    : (details.isGreeting ? 'greeting' : 'default_fast');

  return {
    mode,
    reason,
    reasonCodes: details.reasons,
    audienceMode: details.audienceMode,
    toolSignals: details.toolSignals
  };
}

export async function runFastReasoning(message, context = {}) {
  const audience = buildAudienceStyle({ ...context, message });
  const fastMessage = [
    normalizeMessage(message),
    '',
    'Fast brain mode: answer quickly.',
    'Keep it short unless the user asked for more.',
    audience.prompt
  ].join('\n');

<<<<<<< HEAD
  const response = await askGemini(
    fastMessage,
    Array.isArray(context.history) ? context.history : [],
    Array.isArray(context.images) ? context.images : [],
=======
  const askAIBrain = async (prompt, history, images, apiKey, model) => {
    if (model.startsWith('gemini')) {
      return await askGemini(prompt, history, images, apiKey, model);
    } else {
      const res = await askOllama(prompt, history, images, model);
      if (res && !res.rawResponse) res.rawResponse = JSON.stringify(res);
      return res;
    }
  };

  const response = await askAIBrain(
    fastMessage,
    context.history || [],
    [],
>>>>>>> ui-update-final
    context.apiKey,
    context.model
  );

  return {
    ...response,
    reasoning_mode: 'fast',
    reasoning_reason: context.reason || 'default_fast',
    audience_mode: audience.mode
  };
}

function buildDeepPlanSteps(message = '', context = {}) {
  const classification = classifyReasoningMode(message, context);
  const audience = buildAudienceStyle({ ...context, message });
  const plan = [
    'Re-read the request and extract the main goal.',
  ];

  if (classification.reasonCodes.includes('planning')) {
    plan.push('Check time, order, or scheduling details before answering.');
  }
  if (classification.reasonCodes.includes('multi_tool')) {
    plan.push('Pick the best tool path and avoid unnecessary extra tools.');
  } else {
    const preferred = inferPreferredActions(message);
    if (preferred.length) plan.push(`Use ${preferred[0]} if a tool is truly needed.`);
  }
  if (classification.reasonCodes.includes('reasoning_task') || classification.reasonCodes.includes('explanation')) {
    plan.push('Break the answer into a few clear steps internally.');
  }
  if (audience.mode !== 'normal') {
    plan.push(`Shape the final answer for ${audience.mode}.`);
  }
  plan.push('Deliver the final reply clearly without overexplaining.');

  return plan.slice(0, 5);
}

export async function runDeepReasoning(message, context = {}) {
  const audience = buildAudienceStyle({ ...context, message });
  const classification = classifyReasoningMode(message, context);
  const preferredActions = inferPreferredActions(message);
  const internalPlan = buildDeepPlanSteps(message, context);
  const reviewedMessage = normalizeMessage(message).replace(/\s+/g, ' ');

  return {
    mode: 'deep',
    reason: context.reason || classification.reason,
    reasonCodes: classification.reasonCodes,
    reviewedMessage,
    internalPlan,
    preferredActions,
    audienceMode: audience.mode,
    audiencePrompt: audience.prompt
  };
}

export async function interpretIntent(userInput) {
  const lower = lowerMessage(userInput);

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
    // Fall through to Gemini fallback when available.
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

export default {
  buildAudienceStyle,
  classifyReasoningMode,
  interpretIntent,
  reasoningLoop,
  runDeepReasoning,
  runFastReasoning,
  synthesizeAnswer
};
