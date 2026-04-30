import { generateWithPrompt } from '../../services/geminiText.js';
import { EXPRESSION_PROMPT } from './expression_prompt.js';

/**
 * Expression Agent (Upgraded): Turns the internal results into "One Calm Voice" using Gemini.
 */
class ExpressionAgent {
  async process(capsule) {
    console.log(`[ExpressionAgent] Synthesizing final response...`);
    
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    // Proceeding to call services (GeminiCore will handle backend routing if apiKey is missing)
    try {
      // Build context for the prompt
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        results: capsule.results,
        errors: capsule.errors
      }, null, 2);

      const response = await generateWithPrompt(
        EXPRESSION_PROMPT, 
        `Synthesize a response for this context:\n${context}`, 
        apiKey
      );

      capsule.response = response;
      console.log(`[Blip Output]: "${capsule.response}"`);

    } catch (error) {
      console.error("[ExpressionAgent] Gemini failure:", error.message);
      this.fallbackTemplates(capsule);
    }
  }

  /**
   * Basic templates if Gemini is unavailable
   */
  fallbackTemplates(capsule) {
    if (capsule.errors.length > 0) {
      capsule.response = "I've run into a small issue. I was able to do part of it, but I couldn't finish everything.";
    } else if (capsule.intention.primary === 'multi_action') {
      capsule.response = "I've handled those tasks for you.";
    } else {
      capsule.response = "I'm on it.";
    }
    console.log(`[Blip Output]: "${capsule.response}"`);
  }
}

export default ExpressionAgent;
