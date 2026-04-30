import { generateWithPrompt } from '../../services/geminiText.js';
import { EXPRESSION_PROMPT } from './expression_prompt.js';
import { config } from '../../config.js';

/**
 * Expression Agent (Upgraded): Turns the internal results into "One Calm Voice" using Gemini.
 */
class ExpressionAgent {
  async process(capsule) {
    // Zero-Latency Bypass for Simple Commands
    const isDeterministic = capsule.route_log.some(log => log.agent === 'deterministic_hit');
    if (isDeterministic) {
      console.log(`[ExpressionAgent] Fast-path hit. Bypassing LLM.`);
      this.fastPathTemplates(capsule);
      return;
    }

    console.log(`[ExpressionAgent] Synthesizing final response via LLM...`);
    
    const apiKey = config.GEMINI_API_KEY;
    
    // Proceeding to call services (GeminiCore will handle backend routing if apiKey is missing)
    try {
      // Build context for the prompt
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        results: capsule.results,
        errors: capsule.errors,
        proactive_suggestion: capsule.proactive_suggestion
      }, null, 2);

      const responseText = await generateWithPrompt(
        EXPRESSION_PROMPT, 
        `Synthesize a response for this context:\n${context}`, 
        apiKey
      );

      // Extract JSON
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const data = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
        capsule.response = data.response;
        capsule.perception.mode = data.emotion || 'happy';
      } else {
        capsule.response = responseText;
      }
      
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

  /**
   * Zero-latency templates for deterministic hits
   */
  fastPathTemplates(capsule) {
    if (capsule.errors.length > 0) {
      capsule.response = "I hit a snag trying to do that.";
      capsule.perception.mode = "sad";
      return;
    }

    // Default fast-path success
    capsule.response = "I've handled that.";
    capsule.perception.mode = "happy";

    // Refine based on the successful tool
    const successfulTools = capsule.results.map(r => capsule.plan.find(p => p.step_id === r.step_id)?.tool);
    
    if (successfulTools.includes('telegram')) {
      capsule.response = "Telegram sent.";
    } else if (successfulTools.includes('gmail')) {
      capsule.response = "Email updated.";
    } else if (successfulTools.includes('carecam')) {
      capsule.response = "Opening Care Cam.";
    } else if (successfulTools.includes('timer')) {
      capsule.response = "Timer started.";
    } else if (successfulTools.includes('youtube')) {
      capsule.response = "Opening YouTube.";
    } else if (successfulTools.includes('notes')) {
      capsule.response = "Note handled.";
    } else if (successfulTools.includes('calendar')) {
      capsule.response = "Opening Calendar.";
    }

    console.log(`[Blip Output] (FastPath): "${capsule.response}"`);
  }
}

export default ExpressionAgent;
