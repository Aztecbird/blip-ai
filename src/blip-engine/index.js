import { createBlipSecretSauceEngine } from '../blip-core/index.js';
import { createOrchestratorConfig } from './core/Orchestrator.js';

/**
 * Main Blip Engine Dispatcher
 * Keeps the public entrypoint stable while internals evolve.
 */
export function createBlipEngine(options = {}) {
  const appHandlers = options.appHandlers || {};
  const orchestratorConfig = createOrchestratorConfig({
    youtubeApiKey: options.youtubeApiKey,
    handlers: {
      gmail: appHandlers.gmail,
      telegram: appHandlers.telegram,
      calendar: appHandlers.calendar,
      notes: appHandlers.notes,
      photos: appHandlers.photos,
      timer: appHandlers.timer,
      chat: appHandlers.chat,
      system: appHandlers.system,
      youtube: appHandlers.youtube,
      ...(options.orchestrator?.handlers || {}),
    },
  });

  return createBlipSecretSauceEngine({
    ...options,
    orchestrator: orchestratorConfig,
  });
}

export default createBlipEngine;
