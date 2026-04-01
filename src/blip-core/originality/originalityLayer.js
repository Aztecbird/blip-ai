export function createOriginalityLayer() {
  const repeatedMistakes = new Map();

  function keyFor(intent = {}) {
    return `${intent.tool || 'none'}:${intent.intent || 'none'}`;
  }

  function observeResult(intent = {}, result = {}) {
    const k = keyFor(intent);
    if (!result?.ok) {
      repeatedMistakes.set(k, (repeatedMistakes.get(k) || 0) + 1);
    } else {
      repeatedMistakes.set(k, Math.max(0, (repeatedMistakes.get(k) || 0) - 1));
    }
  }

  function decoratePlan(plan = {}, context = {}) {
    const k = keyFor(plan);
    const repeatCount = repeatedMistakes.get(k) || 0;
    const rhythm = Array.isArray(context.state?.interactionRhythm) ? context.state.interactionRhythm : [];
    const avgRecentConfidence = rhythm.length
      ? rhythm.slice(-5).reduce((sum, item) => sum + Number(item.confidence || 0.5), 0) / Math.min(5, rhythm.length)
      : 0.7;

    const projectMode = Boolean(context.ui?.projectorMode);
    const safeMode = String(context.ui?.safeMode || 'standard');

    return {
      ...plan,
      signature: {
        emotionalContinuity: {
          lastUserTone: context.state?.lastUserTone || 'neutral',
          trustMomentum: Number(context.state?.trustMomentum || 0.6),
          avgRecentConfidence,
        },
        adaptivePacing: {
          rhythmLength: rhythm.length,
          suggestedPausesMs: context.ui?.responseDelayMs || 0,
        },
        quietAdaptation: {
          repeatedMistakeCount: repeatCount,
          increaseConfirmation: repeatCount >= 2,
        },
        environmentProfile: {
          projectorMode: projectMode,
          safeMode,
          transitionStyle: projectMode ? 'cinematic' : 'gentle',
        },
      },
      confirmation_needed: plan.confirmation_needed || repeatCount >= 2 || safeMode !== 'standard',
    };
  }

  return {
    observeResult,
    decoratePlan,
  };
}
