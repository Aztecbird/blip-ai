import { generateWithPrompt } from '../../services/geminiText.js';
import { MEMORY_PROMPT } from './memory_prompt.js';
import { memoryStore } from '../../services/memoryStore.js';
import { config } from '../../config.js';

/**
 * Memory Agent: Updates the Library District with new habits, facts, and preferences.
 */
class MemoryAgent {
  async process(capsule) {
    // Only update memory if the action was successful or completed
    if (capsule.status !== 'completed' && capsule.results.length === 0) return;

    console.log(`[MemoryAgent] Updating library from interaction...`);
    
    const apiKey = config.GEMINI_API_KEY;

    try {
      const context = JSON.stringify({
        raw_input: capsule.raw_input,
        intention: capsule.intention,
        results: capsule.results
      }, null, 2);

      const response = await generateWithPrompt(
        MEMORY_PROMPT, 
        `Interaction to analyze:\n${context}`, 
        apiKey
      );

      // Extract JSON
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const data = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
        
        // Persist to store
        if (data.summary) memoryStore.addSummary(data.summary);
        if (data.habits) data.habits.forEach(h => memoryStore.addHabit(h));
        if (data.preferences) {
          Object.entries(data.preferences).forEach(([k, v]) => memoryStore.updatePreference(k, v));
        }
        
        console.log(`[MemoryAgent] Library updated: ${data.summary}`);
      }

    } catch (error) {
      console.error("[MemoryAgent] Gemini failure:", error.message);
    }
  }
}

export default MemoryAgent;
