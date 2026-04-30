import '../../core/browser-shim.js'; // Ensure window exists
import arcadeService from '../../services/arcadeService.js';
import { getToolPolicy } from '../../services/policyStore.js';

/**
 * Tool Agent: Executes the plan by calling Arcade AI or Blip V1 services.
 * This is the bridge where the Brain meets the Body.
 */
class ToolAgent {
  async process(capsule) {
    console.log(`[ToolAgent] Executing ${capsule.plan.length} steps...`);
    
    for (const step of capsule.plan) {
      console.log(`[ToolAgent] Running step ${step.step_id}: ${step.action} via ${step.tool}`);
      
      try {
        let result;
        
        // 1. Check if this tool requires confirmation based on policy
        const policy = getToolPolicy(step.tool);
        if (policy.confirm && !step.confirmed) {
          console.log(`[ToolAgent] Step ${step.step_id} (${step.tool}) requires confirmation.`);
          capsule.safety.requires_confirmation = true;
          capsule.safety.reason = `Confirmation needed for ${policy.actionLabel || 'action'}`;
          step.status = 'awaiting_confirmation';
          continue; // Skip execution for now
        }

        // 2. Map tool name to Arcade tool if applicable
        // Note: PlanningAgent should ideally provide Arcade-ready tool names (e.g. 'Google.SendEmail')
        const arcadeToolName = this.mapToArcadeTool(step.tool);
        
        if (arcadeToolName) {
          result = await arcadeService.executeTool(capsule.user_id, arcadeToolName, step.params);
        } else {
          console.warn(`[ToolAgent] No Arcade mapping for tool: ${step.tool}, falling back to legacy...`);
          // Fallback to legacy or other implementations could go here
          result = { success: false, error: 'no_implementation' };
        }
        
        if (result.success) {
          step.status = 'success';
          capsule.results.push({
            step_id: step.step_id,
            output: result.data,
            timestamp: new Date().toISOString()
          });
        } else if (result.requires_auth) {
          step.status = 'failed';
          capsule.errors.push(`${step.tool} requires authentication: ${result.auth_url}`);
        } else {
          throw new Error(result.error || 'Unknown tool error');
        }

      } catch (error) {
        console.error(`[ToolAgent] Step ${step.step_id} failed:`, error.message);
        step.status = 'failed';
        capsule.errors.push(`Error in ${step.tool}: ${error.message}`);
      }
    }
  }

  /**
   * Temporary mapping from friendly names to Arcade toolkit names.
   * Ideally the PlanningAgent should be smart enough to use these directly.
   */
  mapToArcadeTool(name) {
    const mapping = {
      'gmail': 'Google.SendEmail',
      'telegram': null, // Telegram is not yet in Arcade, keeping it legacy if needed
      'google_calendar': 'GoogleCalendar.CreateEvent',
      'google_search': 'Google.Search'
    };
    return mapping[name] || (name.includes('.') ? name : null);
  }
}

export default ToolAgent;
