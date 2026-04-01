import { createToolOrchestrator } from '../../blip-core/orchestration/toolOrchestrator.js';
import { BLIP_TOOLS } from '../../blip-core/types.js';
import { web } from '../../services/web.js';

function normalizeQuery(action = {}, context = {}) {
  return String(
    action?.entities?.topic
    || action?.entities?.query
    || action?.entities?.text
    || context?.interpretedIntent?.raw
    || ''
  ).trim();
}

function createDefaultHandlers(options = {}) {
  const custom = options.handlers || {};

  return {
    [BLIP_TOOLS.YOUTUBE]: async (action, context) => {
      const query = normalizeQuery(action, context);
      const youtubeApiKey = String(options.youtubeApiKey || context?.youtubeApiKey || '').trim();
      const result = await web.searchYouTube(query, youtubeApiKey);

      return {
        ok: !result?.error,
        response: result?.text || 'I found a YouTube result.',
        data: {
          query,
          url: result?.watchUrl || result?.url || '',
          embedUrl: result?.embedUrl || '',
          searchResults: Array.isArray(result?.searchResults) ? result.searchResults : [],
        },
      };
    },

    [BLIP_TOOLS.CHAT]: async () => ({
      ok: true,
      response: 'I am here with you.',
    }),

    [BLIP_TOOLS.SYSTEM]: async (action) => {
      if (action.intent === 'close_all') {
        return { ok: true, response: 'Okay, closing everything now.' };
      }
      if (action.intent === 'close_active') {
        return { ok: true, response: 'Okay, closing this.' };
      }
      return { ok: true, response: 'Done.' };
    },

    ...custom,
  };
}

export function createOrchestrator(options = {}) {
  const handlers = createDefaultHandlers(options);
  const base = createToolOrchestrator({ handlers });

  function registerHandler(tool, handler) {
    const id = String(tool || '').trim().toLowerCase();
    if (!id || typeof handler !== 'function') return false;
    handlers[id] = handler;
    return true;
  }

  function registerMany(nextHandlers = {}) {
    Object.entries(nextHandlers || {}).forEach(([tool, handler]) => {
      registerHandler(tool, handler);
    });
    return getRegisteredTools();
  }

  function getRegisteredTools() {
    return Object.keys(handlers).sort();
  }

  return {
    ...base,
    registerHandler,
    registerMany,
    getRegisteredTools,
  };
}

export { createToolOrchestrator };

export function createOrchestratorConfig(options = {}) {
  return {
    handlers: createDefaultHandlers(options),
  };
}
