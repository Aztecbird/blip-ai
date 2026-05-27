import test from 'node:test';
import assert from 'node:assert/strict';
import PlanningAgent from '../src/blip-polyphony/agents/judgment/planning_agent.js';
import Capsule from '../src/blip-polyphony/core/capsule.js';

test('PlanningAgent fallbackHeuristic maps telegram message intent correctly', () => {
    const planner = new PlanningAgent();
    const capsule = new Capsule("send telegram message to Ana saying hello");
    
    capsule.intention.primary = 'multi_action';
    capsule.intention.sub_intents = ['message.send'];
    capsule.context.contact_name = 'Ana';
    
    planner.fallbackHeuristic(capsule);
    
    assert.equal(capsule.plan.length, 1);
    assert.equal(capsule.plan[0].tool, 'gmail');
    assert.equal(capsule.plan[0].action, 'message.send');
    assert.equal(capsule.plan[0].params.to, 'Ana');
});

test('PlanningAgent fallbackHeuristic maps calendar and reminder intents correctly', () => {
    const planner = new PlanningAgent();
    const capsule = new Capsule("remind me tomorrow at 9am");
    
    capsule.intention.primary = 'scheduling';
    capsule.intention.sub_intents = ['reminder.create'];
    
    planner.fallbackHeuristic(capsule);
    
    assert.equal(capsule.plan.length, 1);
    assert.equal(capsule.plan[0].tool, 'google_calendar');
    assert.equal(capsule.plan[0].status, 'pending');
});

test('PlanningAgent fallbackHeuristic defaults to llm response for unknown intents', () => {
    const planner = new PlanningAgent();
    const capsule = new Capsule("what is the meaning of life?");
    
    capsule.intention.primary = 'general';
    capsule.intention.sub_intents = [];
    
    planner.fallbackHeuristic(capsule);
    
    assert.equal(capsule.plan.length, 1);
    assert.equal(capsule.plan[0].tool, 'llm');
    assert.equal(capsule.plan[0].action, 'chat.respond');
});
