import { buildVoiceRoutingSnapshot } from '../../../../src/services/assistantRouter.js';

/**
 * Deterministic Agent: The "Fast Path".
 * Uses the stabilized rule-based router to catch simple commands without LLM latency.
 */
class DeterministicAgent {
  async process(capsule) {
    console.log(`[DeterministicAgent] Checking fast-path for: "${capsule.raw_input}"`);

    // Build a mock state for the legacy router
    const mockState = {
      currentSidePanelAction: capsule.context.active_panel || '',
      pendingEmailReview: capsule.context.pending_email || false,
      pendingTelegramReview: capsule.context.pending_telegram || false,
      // ... add other necessary state flags if needed ...
    };

    const route = buildVoiceRoutingSnapshot(capsule.raw_input, mockState);

    if (route && route.confidence >= 0.8 && !route.needsClarification) {
      console.log(`[DeterministicAgent] High confidence hit (${route.confidence}). Mapping to plan.`);
      
      this.mapRouteToPlan(route, capsule);
      capsule.perception.confidence = route.confidence;
      capsule.addLog('deterministic_hit');
    } else {
      console.log(`[DeterministicAgent] Low confidence or ambiguous. Passing to Smart Path.`);
    }
  }

  mapRouteToPlan(route, capsule) {
    const { family, action, gmailCmd, telegramCmd } = route;
    
    if (family === 'gmail' && gmailCmd) {
      capsule.plan.push({
        step_id: 's1',
        action: gmailCmd.action,
        tool: 'gmail',
        status: 'pending',
        params: gmailCmd.draft || {}
      });
    } else if (family === 'telegram' && telegramCmd) {
      capsule.plan.push({
        step_id: 's1',
        action: telegramCmd.action,
        tool: 'telegram',
        status: 'pending',
        params: telegramCmd.draft || {}
      });
    } else if (family === 'carecam') {
        capsule.plan.push({
            step_id: 's1',
            action: action,
            tool: 'carecam',
            status: 'pending',
            params: {}
        });
    }
  }
}

export default DeterministicAgent;
