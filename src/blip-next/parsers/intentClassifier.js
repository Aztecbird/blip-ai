function includesAny(text = '', words = []) {
  return words.some((word) => text.includes(word));
}

export function createIntentClassifier() {
  function classify(utterance = '', context = {}) {
    const text = String(utterance || '').trim();
    const lower = text.toLowerCase();
    const memory = context.working_memory || {};
    const hasActiveWorkflow = Boolean(memory.active_workflow || memory.pending_confirmation || memory.current_draft);

    if (/^(yes|yeah|yep|do it|send it|go ahead|okay|ok)\b/.test(lower)) {
      return { frame: 'confirmation', confidence: 0.95, response_style: 'confirming' };
    }

    if (/^(no|nope|not that|don't|stop|cancel it)\b/.test(lower)) {
      return { frame: hasActiveWorkflow ? 'correction' : 'confirmation', confidence: 0.92, response_style: 'clarifying' };
    }

    if (/^(tomorrow instead|change that|email instead|telegram instead|not )/.test(lower)) {
      return { frame: hasActiveWorkflow ? 'correction' : 'follow_up', confidence: 0.9, response_style: 'clarifying' };
    }

    if (hasActiveWorkflow && (text.split(/\s+/).length <= 4 || includesAny(lower, ['it', 'that', 'same recipient', 'him', 'her', 'them', 'second one', 'first one']))) {
      return { frame: 'follow_up', confidence: 0.84, response_style: 'brief' };
    }

    if (includesAny(lower, ['help', 'sad', 'anxious', 'worried', 'lonely'])) {
      return { frame: 'emotional_moment', confidence: 0.75, response_style: 'chatty' };
    }

    if (includesAny(lower, ['fall', 'emergency', 'urgent', 'help now', 'danger'])) {
      return { frame: 'urgent_or_safety', confidence: 0.93, response_style: 'urgent' };
    }

    if (/^(what|when|where|who|why|how)\b/.test(lower)) {
      return { frame: 'informational_query', confidence: 0.82, response_style: 'brief' };
    }

    if (includesAny(lower, ['send', 'email', 'telegram', 'set', 'open', 'find', 'search', 'start', 'remind'])) {
      return { frame: 'direct_command', confidence: 0.83, response_style: 'brief' };
    }

    return { frame: 'free_conversation', confidence: 0.7, response_style: 'chatty' };
  }

  return { classify };
}
