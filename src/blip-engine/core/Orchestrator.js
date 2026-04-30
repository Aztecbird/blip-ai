/**
 * @file Orchestrator.js
 * @category Core
 * @description Central Tool Hub. Maps structured plans into actual 
 * cross-tool executions (Gmail, YouTube, Telegram, etc.)
 */

export class BlipToolOrchestrator {
  constructor() {
    this.registry = new Map();
    this.registry.set('chat', async (action) => ({ status: 'ok', response: 'Chat response' }));
    this.registry.set('system', async (action) => ({ status: 'ok', response: 'System response' }));
    this.registry.set('youtube', async (action) => ({ status: 'ok', response: 'YouTube response' }));
  }

  /**
   * Register a capability (ex: Gmail, Telegram)
   */
  register(name, callback) {
    this.registry.set(name, callback);
    return true;
  }

  registerHandler(name, callback) {
    return this.register(name, callback);
  }

  getRegisteredTools() {
    return Array.from(this.registry.keys());
  }

  /**
   * Main execution point for any tool.
   * Uses a normalized schema to keep tools predictable.
   */
  async execute(plan) {
    const intent = typeof plan.intent === 'string' ? { type: plan.intent, entities: plan.entities || {} } : (plan.intent || {});
    const tool = plan.tool || this.mapTypeToTool(intent.type || '');
    const executionReady = plan.executionReady !== false;

    const action = {
      type: intent.type,
      tool: tool,
      intent: intent,
      confidence: intent.confidence || 0.9,
      entities: intent.entities || {},
      state_effect: this.calculateStateEffect(intent.type || ''),
      confirmation_needed: !executionReady,
      execution_plan: plan
    };

    if (executionReady && this.registry.has(tool)) {
      try {
        const result = await this.registry.get(tool)(action);
        // Compatibility: merge result into the return object
        return { success: true, action, result, ...result };
      } catch (err) {
        console.error(`Tool Execution Error [${tool}]:`, err);
        return { success: false, action, error: err.message };
      }
    }

    return { 
      success: false, 
      action, 
      reason: executionReady ? `Tool ${tool} not registered.` : `Awaiting feedback path: ${plan.path}` 
    };
  }

  mapTypeToTool(type) {
    if (type.startsWith('communication')) return 'communication';
    if (type.startsWith('calendar')) return 'calendar';
    if (type.startsWith('notes')) return 'notes';
    if (type.startsWith('timer')) return 'timer';
    if (type.startsWith('youtube')) return 'youtube';
    return 'chat';
  }

  calculateStateEffect(type) {
    const effects = {
      'communication.send': 'focused',
      'calendar.view': 'calm',
      'notes.create': 'focused',
      'timer.create': 'focused',
      'youtube.search': 'playful',
      'ui.dismiss': 'idle'
    };
    return effects[type] || 'idle';
  }
}

export const toolOrchestrator = new BlipToolOrchestrator();
export const createOrchestrator = () => new BlipToolOrchestrator();
