# Blip Runtime Requirements

These requirements define the basic protocols that keep Blip fast, safe, and predictable. They are especially important for voice parsing, tool routing, drafts, and Polyphony.

## Core Safety Protocols

1. Deterministic local parsers must run before broad AI reasoning for simple tool commands.
2. Pending user workflows must keep priority over new generic routing. Examples: active notes draft, Gmail draft review, Telegram draft review, active timer/alarm alert.
3. Blip must not role-play real tool actions. If the user asks to send email, send Telegram, save notes, create timers, or create calendar events, the matching tool handler must run or Blip must clearly say it could not run.
4. Destructive or external actions require confirmation when they send, delete, clear, overwrite, or publish user data.
5. UI state and internal state must be updated together. A parser action is not complete if the visual panel/draft/alert does not reflect it.
6. Errors from real tools must be surfaced to the user with a short actionable message. Do not silently swallow failures that affect the visible result.

## Voice Parsing Protocol

1. Normalize voice text once, then share that normalized form across parsers.
2. Pending draft parsers run first:
   - Notes follow-up before Gmail/Telegram/Polyphony.
   - Gmail draft follow-up before generic chat.
   - Telegram draft follow-up before generic chat.
3. Tool-specific parsers run before AI fallback:
   - System controls.
   - Alerts/reminders/timers.
   - Telegram.
   - Gmail.
   - Notes.
   - Student desk.
   - Camera/photo/design.
   - Calendar.
   - Media/YouTube.
4. Generic phrases such as `save note`, `send it`, `open it`, and `yes` must be resolved using active context before any global parser claims them.
5. Parser tests are not enough. Every parser must also have a live caller in `src/main.js` or a clearly wired controller/bridge.
6. Any new parser must include at least one test for:
   - Positive match.
   - False positive avoidance.
   - Active-context behavior if the phrase is ambiguous.
7. Parser priority is part of the product behavior. Do not reorder parser blocks without testing the ambiguous phrases listed in the regression checklist.
8. A parser must return `null` for commands that belong to another obvious tool. Avoid broad keyword ownership such as claiming every phrase that contains `note`, `send`, `save`, `open`, or `message`.
9. Short commands must be treated as contextual commands first. Examples: `save note`, `send it`, `yes`, `open it`, `delete it`, `cancel`.
10. When two tools can plausibly own a phrase, prefer the active panel/draft/workflow over global keyword matching.

## Polyphony Protocol

1. Polyphony is optional and should stay off by default for normal daily voice commands unless the user explicitly enables it.
2. Polyphony must be bypassed completely when the UI toggle is off.
3. Polyphony must not intercept pending draft follow-ups.
4. Polyphony may only start for clearly complex tasks, such as multi-step workflows, cross-tool planning, ambiguous reasoning requests, or commands that cannot be handled by local deterministic parsers.
5. Polyphony must not run for simple fast-path commands such as opening panels, saving notes, sending existing drafts, timers/reminders, camera controls, student desk commands, or basic calendar actions.
6. Polyphony should only take over when it has a real tool plan and the tool is implemented locally or safely mapped.
7. Unsupported Polyphony tool plans must fall back to legacy routing instead of blocking the user command.
8. Fast local commands should stay on the deterministic path unless a command is clearly multi-step or reasoning-heavy.

## State Protocol

1. `state` remains the visible app state source until a full state boundary is implemented.
2. Controllers may own service behavior, but they must receive callbacks that update the visible UI.
3. Draft state must not be duplicated without synchronization.
4. `localStorage` persistence must be treated as best-effort; failures should not break the voice flow.
5. If a command creates a visible object, publish it to the appropriate store/panel immediately.
6. Every pending workflow must have an explicit clear/cancel path.
7. Every pending workflow must clear itself after successful completion.
8. When a handler says an action succeeded, the corresponding visible UI or store must already be updated.

## Stability Guardrails

1. Do not add a second implementation of a parser if a service parser already exists. Import and reuse the service parser.
2. Do not add broad catch-all regular expressions near the top of the voice route.
3. Do not let AI fallback run before checking pending local workflows.
4. Do not let one tool parser silently open another tool unless the command explicitly asks for that handoff.
5. If a build warning points to browser-incompatible code, keep that code out of fast daily command paths until it is browser-safe.
6. Large features should be lazy-loaded when possible so daily voice commands stay fast.
7. Keep the manual regression checklist short enough that it actually gets used.

## Tool Action Protocol

1. Gmail and Telegram send actions must always go through their feature handlers.
2. Notes saves must always go through `addNoteItem` or the notes store.
3. Timer/reminder creation and cancellation must go through `timerController`.
4. Calendar creation must go through `calendarController` or `googleCalendar` service wrappers.
5. Camera/photo/design commands must use the current captured image when available, and clearly ask for/capture one when not available.
6. Student desk commands currently map to the Hub panel/storage unless a dedicated student desk UI is implemented.

## Regression Checklist

Before merging parser or routing changes:

1. Run `npm test`.
2. Run `npm run build`.
3. Manually test:
   - `save note` while a notes draft is active.
   - `send it` with only Gmail draft.
   - `send it` with only Telegram draft.
   - `send it` when both drafts exist.
   - `remind me tomorrow at 9 to call the shop`.
   - `open student desk`.
   - `take a picture and transfer it to design`.
   - Polyphony toggle off, then repeat a fast parser command.
