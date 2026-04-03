# Blip Next Architecture

This document defines a build-ready, modular conversation and parsing stack for a new local Blip version while leaving the existing `4.3.25` runtime unchanged.

## Versioning Approach

- Keep `package.json` aligned with the shipping runtime (e.g. `4.3.25`).
- Add the new architecture in [`src/blip-next`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/index.js).
- Treat `src/blip-next` as the local next-generation conversation kernel that can be integrated incrementally behind feature flags.

## Folder Structure

```text
src/blip-next/
  contracts/
    blipContracts.ts
    schemas.js
  state/
    conversationState.js
  rules/
    deterministicRouter.js
  parsers/
    intentClassifier.js
    entityExtractor.js
    tools/
      gmailParser.js
      telegramParser.js
      timerParser.js
  resolution/
    referenceResolver.js
  repair/
    repairHandler.js
  planning/
    confirmationPolicy.js
    workflowComposer.js
  validation/
    validateEnvelope.js
  prompts/
    baselineSystemPrompt.js
    intentClassificationPrompt.js
    toolParsingPrompt.js
    workflowCompositionPrompt.js
    repairHandlingPrompt.js
    responseGenerationPrompt.js
  examples/
    utteranceExamples.js
  router/
    createBlipNextRouter.js
  index.js
```

## Architectural Plan

### 1. Conversation Baseline Layer

Responsibilities:

- maintain conversation state
- maintain short-lived working memory
- classify the moment before tool execution
- enforce tone and turn policy

Key state model:

- `idle`
- `listening`
- `understanding`
- `chatting`
- `clarifying`
- `drafting`
- `waiting_confirmation`
- `executing`
- `reporting_result`
- `repairing`
- `alert_mode`

This layer answers: "What kind of interaction is this turn, and how should Blip behave before any tool acts?"

### 2. Parsing And Routing Layer

Responsibilities:

- deterministic rule-first routing
- intent frame classification
- entity extraction
- reference resolution
- tool parser selection
- repair handling

This layer answers: "What does the user mean in this turn, given the active interaction context?"

### 3. Tool Execution Planning Layer

Responsibilities:

- build single-tool and multi-tool workflow plans
- connect outputs to downstream inputs by object compatibility
- evaluate confirmation requirements
- validate execution safety

This layer answers: "What exact steps can Blip take safely and in what order?"

## Router Order Of Operations

1. Normalize utterance and load current conversation state.
2. Run deterministic pass for high-confidence commands.
3. If no deterministic hit, classify conversation frame.
4. Extract entities.
5. Resolve references from working memory.
6. Run repair parser if the turn looks like a correction.
7. Detect tool candidates.
8. Run tool-specific parsers.
9. Compose a workflow plan.
10. Apply confirmation policy.
11. Validate envelope and policy constraints.
12. Update working memory and derive next state.
13. Hand the result to execution or response generation.

## Common Envelope Contract

Every parser stage resolves into the same envelope:

- `intent_type`
- `conversation_frame`
- `tool_targets`
- `confidence`
- `extracted_entities`
- `shared_objects_in`
- `shared_objects_out`
- `requires_confirmation`
- `risk_level`
- `repairable_fields`
- `execution_plan`
- `follow_up_needed`
- `clarification_question`
- `response_style`
- `turn_policy`

This lets the router, validator, and executor work against one stable shape even as tools grow.

## Conversation Contracts

### Gmail Draft Flow

`recipient -> subject -> body -> review -> confirm -> send`

### Telegram Flow

`recipient -> message -> optional review -> confirm -> send`

### Calendar Flow

`title -> date/time -> attendees optional -> review -> confirm -> create`

### Timer Flow

`duration -> optional label -> set`

### Notes Flow

`capture -> store -> optional retrieval -> optional transform to another tool`

### Cross-Tool Flow

`source -> transform if needed -> target -> review -> confirm -> execute`

## Rules Vs Model Parsing

Use deterministic rules when:

- the command is short, frequent, and low ambiguity
- the action shape is obvious
- the cost of parsing uncertainty is not worth a model call

Good rule-first cases:

- `open Gmail`
- `open Telegram`
- `set a timer for 8 minutes`
- `cancel timer`
- `weather in Valencia`
- `close everything`

Use model or structured parsing when:

- the user compresses multiple actions into one turn
- the request depends on conversational context
- references or corrections need active-memory resolution
- the action contains natural language payloads

Good model-parsed cases:

- `find that note and email it`
- `search YouTube and send the link on Telegram`
- `tomorrow instead`
- `send it to Natasha`
- `the second one`

Use high creativity only for:

- conversational interpretation
- supportive chat
- ambiguous phrasing recovery

Never let high-creativity output execute sensitive actions directly.

## Temperature Strategy

- deterministic rules: `0.0`
- entity extraction: `0.0`
- critical action parsers: `0.0 - 0.1`
- navigation and UI parsers: `0.1 - 0.2`
- informational lookup parsers: `0.2 - 0.35`
- workflow composer: `0.2 - 0.35`
- reference resolver: `0.1 - 0.2`
- repair parser: `0.1 - 0.2`
- conversational interpretation: `0.4 - 0.6`

## Example Structured Outputs

### Direct Command

User: `set a timer for 8 minutes`

Output:

```json
{
  "intent_type": "timer.set",
  "conversation_frame": "direct_command",
  "tool_targets": ["timer"],
  "confidence": 0.99,
  "extracted_entities": {
    "duration": { "value": 8, "unit": "minutes" }
  },
  "requires_confirmation": false,
  "turn_policy": "respond_and_act"
}
```

### Confirmation-Required Outbound Action

User: `email Natasha that I am running ten minutes late`

Output:

```json
{
  "intent_type": "gmail.draft",
  "conversation_frame": "direct_command",
  "tool_targets": ["gmail"],
  "confidence": 0.91,
  "extracted_entities": {
    "recipient": "Natasha",
    "body": "I am running ten minutes late"
  },
  "requires_confirmation": true,
  "turn_policy": "ask_before_acting"
}
```

### Multi-Tool Workflow

User: `search YouTube for lo fi study mix and send it to Teo on Telegram`

Output:

```json
{
  "intent_type": "workflow.compose",
  "conversation_frame": "direct_command",
  "tool_targets": ["youtube", "telegram"],
  "execution_plan": {
    "summary": "Search YouTube and send the result over Telegram",
    "next_step_id": "youtube-search"
  },
  "requires_confirmation": true,
  "turn_policy": "ask_before_acting"
}
```

### Follow-Up

User: `the second one`

Output:

```json
{
  "conversation_frame": "follow_up",
  "extracted_entities": {
    "ordinal": 2,
    "reference_item": "second search result"
  },
  "turn_policy": "respond_and_act"
}
```

### Repair

User: `tomorrow instead`

Output:

```json
{
  "intent_type": "repair.apply",
  "conversation_frame": "correction",
  "turn_policy": "repair_existing_state",
  "extracted_entities": {
    "date_reference": "tomorrow"
  }
}
```

## Testing Guidance

Add tests for:

- direct deterministic commands
- ambiguous commands that should clarify
- short follow-ups in an active workflow
- pronoun resolution from working memory
- recipient and date corrections
- multi-tool workflow construction
- confirmation-gated actions
- blocked actions when confirmation is already pending
- unsupported or unsafe actions

The main starting point is [`tests/blipNextRouter.test.js`](/Users/pabloarellano/Desktop/blip-ai/tests/blipNextRouter.test.js).
