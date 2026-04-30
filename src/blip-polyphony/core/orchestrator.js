import Capsule from './capsule.js';
import { memoryStore } from '../services/memoryStore.js';
import { towerService } from '../services/towerService.js';

class Orchestrator {
  constructor() {
    this.agents = {};
  }

  registerAgent(name, agentInstance) {
    this.agents[name] = agentInstance;
    console.log(`[Orchestrator] Registered agent: ${name}`);
  }

  /**
   * The main pipeline for processing a user request through the polyphony.
   */
  async process(input, context = {}) {
    const origin = context.origin || 'voice';
    const capsule = new Capsule(input, origin);
    
    // Tower: Start tracking
    if (towerService) towerService.setCapsule(capsule.capsule_id);
    
    // Inject long-term memory context from the Library District
    capsule.context.memory = memoryStore.getMemoryContext();
    
    capsule.context = { ...capsule.context, ...context };
    console.log(`[Orchestrator] Starting processing for: ${capsule.capsule_id}`);

    try {
      // 0. Deterministic (Circle: Fast Path)
      await this.runAgent('deterministic', capsule);

      // 1. Perception & Planning (Circle: Smart Path)
      // Only run if the fast path didn't already lock in a high-confidence plan
      if (capsule.plan.length === 0) {
        await this.runAgent('perception', capsule);
        
        if (capsule.status !== 'failed') {
          await this.runAgent('planning', capsule);
        }
      }

      // 3. Action (Circle: Action) - Execute tools
      if (capsule.status !== 'failed' && capsule.plan.length > 0) {
        await this.runAgent('tool', capsule);
      }

      // 4. Memory (Circle: Library District)
      await this.runAgent('memory', capsule);

      // 5. Bridge (Circle: Action - Proactive)
      // Check if we should cross any bridges based on results
      await this.runAgent('bridge', capsule);

      // 6. Expression (Circle: Presence) - Generate final response
      await this.runAgent('expression', capsule);

      capsule.status = 'completed';
      if (towerService) towerService.setCompleted();
      return capsule;

    } catch (error) {
      console.error(`[Orchestrator] Critical failure:`, error);
      capsule.status = 'failed';
      capsule.errors.push(error.message);
      if (towerService) towerService.hide();
      return capsule;
    }
  }

  async runAgent(name, capsule) {
    if (!this.agents[name]) {
      console.warn(`[Orchestrator] Agent ${name} not found, skipping.`);
      return;
    }

    console.log(`[Orchestrator] Routing to ${name}_agent...`);
    if (towerService) towerService.updateDistrict(name);
    
    capsule.current_location = `${name}_agent`;
    capsule.addLog(name);
    
    await this.agents[name].process(capsule);
  }
}

export default Orchestrator;
