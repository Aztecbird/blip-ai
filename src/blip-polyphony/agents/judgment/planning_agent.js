import { generateWithPrompt } from '../../services/geminiText.js';
import { runKaprekarLoop } from '../../../services/reasoning.js';
import { PLANNING_PROMPT } from './planning_prompt.js';
import { config } from '../../config.js';

/**
 * Planning Agent (Upgraded): Dynamically sequences actions using Gemini.
 */
class PlanningAgent {
  async process(capsule) {
    console.log(`[PlanningAgent] Dynamic planning for: "${capsule.raw_input}"`);
    
    const apiKey = config.GEMINI_API_KEY;
    
    // Proceeding to call services (GeminiCore will handle backend routing if apiKey is missing)
    try {
      // Build context for the prompt
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        entities: capsule.perception.entities
      }, null, 2);

      // We pass the full context as the "userQuery" so the Kaprekar loop has everything it needs.
      const planOutput = await runKaprekarLoop(
        `Generate an array of step objects for this context:\n${context}\nIMPORTANT: Your 'newPlan' output MUST be a valid JSON array of step objects (e.g., [{"step_id":"s1","action":"...","tool":"...","status":"pending","params":{}}]).`,
        { apiKey: apiKey }
      );

      // Because Kaprekar returns a string or array, we parse it if it's a string
      let parsedPlan = [];
      if (typeof planOutput === 'string') {
        const jsonStart = planOutput.indexOf('[');
        const jsonEnd = planOutput.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsedPlan = JSON.parse(planOutput.substring(jsonStart, jsonEnd + 1));
        }
      } else if (Array.isArray(planOutput)) {
        parsedPlan = planOutput;
      }
      
      // Update the capsule with the new converged plan
      capsule.plan = parsedPlan || [];
      console.log(`[PlanningAgent] Converged on ${capsule.plan.length} steps via Kaprekar Logic.`);

    } catch (error) {
      console.error("[PlanningAgent] Gemini failure:", error.message);
      this.fallbackHeuristic(capsule);
    }
  }

  /**
   * Basic hardcoded fallback if Gemini is unavailable
   */
  fallbackHeuristic(capsule) {
    const intents = capsule.intention.sub_intents || [];
    capsule.plan = [];

    for (const intent of intents) {
      if (intent === 'message.send') {
        capsule.plan.push({
          step_id: `s${capsule.plan.length + 1}`,
          action: 'message.send',
          tool: 'gmail',
          status: 'pending',
          params: { 
            to: capsule.context.contact_name || 'Ana', 
            body: `Regarding: ${capsule.raw_input}` 
          }
        });
      } else if (intent.includes('reminder') || intent.includes('calendar')) {
         capsule.plan.push({
          step_id: `s${capsule.plan.length + 1}`,
          action: intent,
          tool: 'google_calendar',
          status: 'pending',
          params: { text: capsule.raw_input }
        });
      }
    }

    if (capsule.plan.length === 0) {
      capsule.plan.push({
        step_id: 's1',
        action: 'chat.respond',
        tool: 'llm',
        status: 'pending'
      });
    }
  }
}

export default PlanningAgent;
