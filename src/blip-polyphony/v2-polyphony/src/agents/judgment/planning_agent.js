import { generateWithPrompt } from '../../services/geminiText.js';
import { PLANNING_PROMPT } from './planning_prompt.js';

/**
 * Planning Agent (Upgraded): Dynamically sequences actions using Gemini.
 */
class PlanningAgent {
  async process(capsule) {
    console.log(`[PlanningAgent] Dynamic planning for: "${capsule.raw_input}"`);
    
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    // Proceeding to call services (GeminiCore will handle backend routing if apiKey is missing)
    try {
      // Build context for the prompt
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        entities: capsule.perception.entities
      }, null, 2);

      const response = await generateWithPrompt(
        PLANNING_PROMPT, 
        `Generate a plan for this input context:\n${context}`, 
        apiKey
      );

      // Extract JSON from response
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid Gemini response format");
      
      const data = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
      
      // Update the capsule with the new plan
      capsule.plan = data.plan || [];
      console.log(`[PlanningAgent] Generated ${capsule.plan.length} steps.`);

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
