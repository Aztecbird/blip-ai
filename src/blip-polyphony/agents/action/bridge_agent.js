import { generateWithPrompt } from '../../services/geminiText.js';
import { BRIDGE_PROMPT } from './bridge_prompt.js';
import { config } from '../../config.js';

/**
 * Bridge Agent: Decides if a completed action should trigger a proactive follow-up.
 */
class BridgeAgent {
  async process(capsule) {
    // Only bridge if we have successful results
    if (capsule.results.length === 0) return;

    console.log(`[BridgeAgent] Analyzing results for cross-district potential...`);
    
    const apiKey = config.GEMINI_API_KEY;

    try {
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        results: capsule.results
      }, null, 2);

      const response = await generateWithPrompt(
        BRIDGE_PROMPT, 
        `Completed context:\n${context}`, 
        apiKey
      );

      // Extract JSON
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const data = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
        
        if (data.suggest_follow_up && data.next_input) {
          console.log(`[BridgeAgent] Proactive suggestion: ${data.next_input}`);
          capsule.proactive_suggestion = {
            reason: data.reasoning,
            input: data.next_input
          };
        }
      }

    } catch (error) {
      console.error("[BridgeAgent] Gemini failure:", error.message);
    }
  }
}

export default BridgeAgent;
