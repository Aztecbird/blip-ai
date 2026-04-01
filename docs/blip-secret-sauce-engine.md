# Blip Secret Sauce Engine (Phase 1 + Starter Phase 2)

This engine gives Blip a behavior stack that is independent from any single LLM prompt.

## Architecture

Pipeline per voice turn:

1. `Intent Interpreter`
2. `Confidence Router`
3. `Blip State Engine`
4. `Signature Behavior Layer`
5. `Originality Layer`
6. `Tool Orchestrator`
7. `Shared Memory update`

This keeps "how Blip behaves" separate from "which model answered".

## Folder structure

```txt
src/
  blip-core/
    index.js
    types.js
    intents/
      intentInterpreter.js
    state/
      blipStateEngine.js
    behavior/
      signatureBehaviorLayer.js
    memory/
      sharedMemory.js
    routing/
      confidenceRouter.js
    orchestration/
      toolOrchestrator.js
    originality/
      originalityLayer.js
    integration/
      uiVoiceBridge.js
docs/
  blip-secret-sauce-engine.md
```

## Key modules

- `intentInterpreter`: hybrid rules + optional reasoning parser, with ambiguity and confidence.
- `blipStateEngine`: persistent runtime mood/mode that changes pacing and UI policy.
- `signatureBehaviorLayer`: customizable behavior rules (confirm gently, summarize before send).
- `sharedMemory`: scoped session memory with expiry and durable hooks.
- `confidenceRouter`: decides rule vs reasoning vs clarify vs block vs act-now.
- `toolOrchestrator`: executes normalized action plans using tool handlers.
- `originalityLayer`: continuity logic (rhythm memory, repeat-mistake adaptation, projector/safe mode influence).
- `uiVoiceBridge`: adapter to plug into existing `main.js` voice flow incrementally.

## Normalized action schema

```js
{
  type,
  tool,
  intent,
  confidence,
  entities,
  state_effect,
  ui_effect,
  confirmation_needed,
  execution_plan
}
```

## Sample flow

Input:

`"tell Teo I'm arriving late"`

Output shape:

1. Interpreter -> `intent: "message_send"`, `tool: "telegram"`, `confidence: 0.55`, `ambiguous: true`
2. Router -> `decision: "clarify"`
3. State -> mode becomes `uncertain`, softer tone
4. Signature -> adds gentle confirmation line + summary-before-send
5. Orchestrator -> asks for confirmation instead of sending immediately

## How to connect to current UI

In your voice command handler:

```js
import { createBlipVoiceBridge } from './blip-core/integration/uiVoiceBridge.js';

const bridge = createBlipVoiceBridge({
  telegramHandler: async (action) => ({ ok: true, response: 'Message ready.' }),
  timerHandler: async (action) => ({ ok: true, response: 'Timer started.' }),
  chatHandler: async () => ({ ok: true, response: 'Here for you.' }),
  onUiPolicy: (uiPolicy) => {
    // Drive face animation + timing from uiPolicy
  },
});

const result = await bridge.handleVoiceCommand(commandText, {
  activePanel: state.currentSidePanelAction,
  confirmed: false,
});
```

## Phase 3 integration plan

1. Replace only the first intent-routing branch in `main.js` with `bridge.handleVoiceCommand`.
2. Keep your existing tool executors as handlers, one by one.
3. Use `output.actionPlan` for panel transitions and signature transitions.
4. Feed existing follow-up memory (drafts/current panel) into `context`.
5. Once stable, migrate old routing helpers into custom `ruleParsers`.
