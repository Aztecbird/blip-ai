import { createBlipSecretSauceEngine } from '../index.js';
import { BLIP_TOOLS } from '../types.js';

/**
 * Lightweight bridge so main UI code can adopt the new engine
 * without a big-bang rewrite.
 */
export function createBlipVoiceBridge(deps = {}) {
  const handlers = {
    [BLIP_TOOLS.TELEGRAM]: deps.telegramHandler,
    [BLIP_TOOLS.GMAIL]: deps.gmailHandler,
    [BLIP_TOOLS.CALENDAR]: deps.calendarHandler,
    [BLIP_TOOLS.NOTES]: deps.notesHandler,
    [BLIP_TOOLS.YOUTUBE]: deps.youtubeHandler,
    [BLIP_TOOLS.PHOTOS]: deps.photosHandler,
    [BLIP_TOOLS.TIMER]: deps.timerHandler,
    [BLIP_TOOLS.SYSTEM]: deps.systemHandler,
    [BLIP_TOOLS.CHAT]: deps.chatHandler,
  };

  const engine = createBlipSecretSauceEngine({
    intent: {
      ruleParsers: deps.ruleParsers || [],
      reasoningParser: deps.reasoningParser || null,
    },
    orchestrator: {
      handlers,
    },
    state: {
      projectorMode: Boolean(deps.projectorMode),
    },
  });

  async function handleVoiceCommand(utterance, context = {}) {
    const output = await engine.processVoiceInput({
      utterance,
      context,
      confirmed: Boolean(context.confirmed),
    });

    if (deps.onUiPolicy) deps.onUiPolicy(output.uiPolicy, output);
    if (deps.onActionPlan) deps.onActionPlan(output.actionPlan, output);
    return output;
  }

  return {
    handleVoiceCommand,
    engine,
  };
}
