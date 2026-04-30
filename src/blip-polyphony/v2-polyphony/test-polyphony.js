import './src/env.js';

import Orchestrator from './src/core/orchestrator.js';
import DeterministicAgent from './src/agents/presence/deterministic_agent.js';
import PerceptionAgent from './src/agents/presence/perception_agent.js';
import PlanningAgent from './src/agents/judgment/planning_agent.js';
import ToolAgent from './src/agents/action/tool_agent.js';
import ExpressionAgent from './src/agents/presence/expression_agent.js';

async function testDrive() {
  const blipBrain = new Orchestrator();

  // Register our ensemble
  blipBrain.registerAgent('deterministic', new DeterministicAgent());
  blipBrain.registerAgent('perception', new PerceptionAgent());
  blipBrain.registerAgent('planning', new PlanningAgent());
  blipBrain.registerAgent('tool', new ToolAgent());
  blipBrain.registerAgent('expression', new ExpressionAgent());

  console.log('\n--- CASE 1: FAST PATH ---');
  const input1 = "Open telegram";
  console.log(`User says: "${input1}"`);
  const cap1 = await blipBrain.process(input1);
  console.log('Result Action:', cap1.plan[0]?.action || 'none');

  console.log('\n--- CASE 2: SMART PATH ---');
  const input2 = "Send Ana the Friday plan and remind me tomorrow";
  console.log(`User says: "${input2}"`);
  const cap2 = await blipBrain.process(input2);
  console.log('Plan length:', cap2.plan.length);
  // Planning result is in the last log entry or action result
  console.log('Reasoning:', cap2.results[0]?.reasoning || 'N/A');

  console.log('\n--- TEST COMPLETE ---');
}

testDrive().catch(console.error);
