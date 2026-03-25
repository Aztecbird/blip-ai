/**
 * Lightweight reasoning router for Blip.
 * Fast brain handles the common quick-response path.
 * Deep brain adds a small planning layer before the existing heavier flow.
 */

import { askGemini, generateWithPrompt } from './geminiText.js';
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
