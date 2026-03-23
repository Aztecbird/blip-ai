# Blip Architecture Plan

## Goal

Blip should become more agentic gradually, without losing what makes it feel special:

- expressive
- clear
- safe
- lightweight
- human-centered

The target is not a fully autonomous agent. The target is a guided assistant with strong personality, reliable tool use, and small useful memory.

## Product Stance

Blip should be:

- a multimodal assistant with soul
- visually expressive and emotionally readable
- tool-aware
- memory-aware
- confirmation-first for important actions

Blip should not become, yet:

- an autonomous background worker
- a broad system controller
- a multi-agent orchestration platform
- a high-permission desktop agent

## Core Principles

### 1. Keep Agency Light

Use just enough agent behavior to improve usefulness:

- choose the right tool
- remember recent context
- ask before doing important actions
- recover gracefully when a tool fails

Avoid hidden autonomous behavior.

### 2. Defend Blip's Soul

Architecture should support:

- face and mood expression
- clear stage states
- memorable UI
- guided conversation instead of raw automation

The system should never turn Blip into a generic assistant shell.

### 3. Confirm Important Actions

Any action that creates, sends, deletes, books, or changes something important should default to confirmation first.

Examples:

- create calendar event
- delete saved item
- send message
- clear media or creations

### 4. Prefer Skills Over a Monolith

Each feature should behave like a small skill with:

- a trigger parser
- a handler
- a UI surface
- optional saved context

This keeps Blip easier to evolve without building a heavy agent framework too early.

## Recommended System Layers

### 1. Experience Layer

Lives mostly in [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js) and [`src/style.css`](/Users/pabloarellano/Desktop/blip-ai/src/style.css).

Responsibilities:

- face state
- mood transitions
- sleep/wake state
- side panels
- stage visuals
- voice and chat entry

This is Blip's identity layer. It should stay expressive and fast.

### 2. Memory Layer

Use a small structured memory model, not a giant open-ended memory store.

Recommended memory buckets:

- `preferences`
  - voice engine
  - weather location
  - personalization choices
  - wake preferences
- `session`
  - last user query
  - last open tool
  - last search topic
  - last opened link
  - last generated image/design/chart
- `recent_tasks`
  - last few successful actions
  - last few failed actions
- `reminders`
  - scheduled reminders
  - recently completed reminders

Memory should stay small, explainable, and easy to clear.

### 3. Routing Layer

Blip already has a light routing pattern. That should be formalized, not replaced with a giant planner.

Routing should answer:

- is this a direct command?
- is this a tool request?
- is this a conversational reply?
- does this need confirmation?
- does this need a fallback?

Good candidates for first-class routing:

- weather
- calendar
- YouTube
- image lookup
- image generation
- map
- reminders
- media and creations

### 4. Skill Layer

Each major feature should move toward a common shape:

- `parse`
- `canHandle`
- `run`
- `render`
- `confirmIfNeeded`
- `remember`

Suggested first skill set:

- weather skill
- calendar skill
- media skill
- creations skill
- reminder skill
- image lookup skill
- image generation skill
- YouTube skill
- map skill

### 5. Service Layer

Keep external integrations isolated in services.

Current examples already fit this direction:

- [`src/services/web.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/web.js)
- [`src/services/googleCalendar.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/googleCalendar.js)
- [`src/services/geminiText.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/geminiText.js)
- [`src/services/geminiImage.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/geminiImage.js)
- [`src/services/speech.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/speech.js)

The service layer should avoid UI logic and avoid deciding personality.

## What To Build Now

### Phase 1: Stabilize the Light Agent

Focus:

- structured recent memory
- cleaner tool routing
- better open/close consistency
- confirmation rules
- saved item persistence

Concrete targets:

- centralize `lastContext` into clearer buckets
- unify open/close command handling
- add confirmation before destructive actions by default
- keep reminder and media persistence reliable

### Phase 2: Convert Features Into Skills

Focus:

- reduce `src/main.js` sprawl
- make each tool easier to test
- preserve UI behavior while simplifying internals

Concrete targets:

- extract skill modules one by one
- keep a common result shape
- keep side-panel rendering reusable

Suggested order:

1. reminders
2. media/creations
3. weather
4. calendar
5. image lookup and generation
6. YouTube
7. maps

### Phase 3: Add Safe Intelligence

Focus:

- better tool choice
- better confirmation
- better error recovery

Concrete targets:

- lightweight intent scoring
- explainable routing decisions
- retries and fallbacks
- "I found this, do you want me to continue?" style interactions

### Phase 4: Optional Later Expansion

Only after the earlier phases feel stable:

- selected integrations
- home assistant behaviors
- teacher or caregiver modes
- more advanced memory categories

Still avoid:

- uncontrolled background work
- broad app or file permissions
- hidden autonomous loops

## Human-in-the-Loop Policy

Blip should ask before:

- deleting user data
- sending messages
- adding calendar events when the date is ambiguous
- purchasing or opening external transactional flows
- clearing media, creations, cart, or hub in bulk

Blip can act directly for:

- opening panels
- showing weather
- showing saved media
- showing maps
- showing YouTube
- generating visuals
- setting reminders when the request is clear

## Memory Policy

Blip memory should be:

- small
- local-first
- user-readable
- erasable

Recommended future commands:

- `what do you remember`
- `forget that`
- `clear recent memory`
- `show my reminders`

## Near-Term Refactor Map

### Keep in `main.js` for now

- stage orchestration
- face states
- UI transitions
- direct DOM bindings

### Gradually move out of `main.js`

- tool parsers
- tool handlers
- confirmation helpers
- memory formatting helpers
- reusable panel builders

## Success Criteria

This plan is working if Blip feels:

- more reliable
- easier to extend
- more personal, not less
- safer for real use
- still visually and emotionally distinct

## Short Version

Blip should evolve into:

- a modular assistant
- with small structured memory
- with light tool routing
- with confirmation for important actions
- with expressive UI as a first-class feature

Not:

- a full autonomous agent system
- not yet
