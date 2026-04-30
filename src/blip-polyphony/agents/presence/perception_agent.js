import { generateWithPrompt } from '../../services/geminiText.js';
import { PERCEPTION_PROMPT } from './perception_prompt.js';
import { config } from '../../config.js';

/**
 * Perception Agent (Upgraded): Uses Gemini to read the user's intent.
 */
class PerceptionAgent {
  async process(capsule) {
    console.log(`[PerceptionAgent] Dynamic analysis for: "${capsule.raw_input}"`);
    
    const apiKey = config.GEMINI_API_KEY;
    
    // Proceeding to call services (GeminiCore will handle backend routing if apiKey is missing)
    try {
      // Build context for the prompt from capsule and memory
      const memory = capsule.context.memory || { recent_summaries: [], top_habits: [], preferences: {} };
      
      const promptData = PERCEPTION_PROMPT
        .replace('{raw_input}', capsule.raw_input)
        .replace('{origin}', capsule.origin)
        .replace('{isThinking}', capsule.context.isThinking || 'false')
        .replace('{recent_summaries}', JSON.stringify(memory.recent_summaries))
        .replace('{top_habits}', JSON.stringify(memory.top_habits))
        .replace('{preferences}', JSON.stringify(memory.preferences));

      const response = await generateWithPrompt(
        promptData, 
        `Analyze this input: "${capsule.raw_input}"`, 
        apiKey
      );

      // Extract JSON from response
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid Gemini response format");
      
      const data = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
      
      // Map Gemini data to the Capsule
      capsule.perception = { ...capsule.perception, ...data.perception };
      capsule.intention = { ...capsule.intention, ...data.intention };
      capsule.context = { ...capsule.context, ...data.context };
      
      console.log(`[PerceptionAgent] Detected intents: ${capsule.intention.sub_intents.join(', ')}`);

    } catch (error) {
      console.error("[PerceptionAgent] Gemini failure:", error.message);
      this.fallbackHeuristic(capsule);
    }
  }

  /**
   * Basic string matching if Gemini is unavailable
   */
  fallbackHeuristic(capsule) {
    if (capsule.raw_input.toLowerCase().includes('send') || capsule.raw_input.toLowerCase().includes('tell')) {
      capsule.intention.primary = 'multi_action';
      capsule.intention.sub_intents = ['message.send'];
      capsule.context.contact_name = 'Ana'; // Hardcoded fallback
    }
  }
}

export default PerceptionAgent;
