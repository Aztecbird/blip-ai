# Notes Logic Path

This is the current logic path for Blip's `Take Notes` tool.

## Goal

Keep notes simple:

- fast to save by voice
- easy to review in one place
- stored with existing local Blip data
- separate enough from the generic Hub flow to feel like a real tool

## Main Path

1. User input arrives

- voice transcript or typed input reaches `src/main.js`

2. Notes intent is checked

- `getNotesVoiceCommand(cmd)` decides whether the user wants to:
  - open notes
  - close notes
  - save a note
  - remove the latest note
  - remove a matching note
  - clear all notes

3. Intent parsing uses two text forms

- normalized text:
  - used for command matching
  - produced by `normalizeVoiceTokens(cmd)`
- raw cleaned text:
  - used for the actual saved note content
  - produced from the original transcript with `sanitizeVoiceQuery(cmd)`

This is important because command matching should be forgiving, but saved notes should stay as close as possible to what the user actually said.

4. Notes action runs

- handled in the main voice-command flow in `src/main.js`
- actions:
  - `open` -> `openNotesPanel()`
  - `saveNote` -> `addNoteItem(...)`
  - `removeLatest` -> `removeLatestNoteItem()`
  - `removeMatch` -> `removeMatchingNoteItem(...)`
  - `clear` -> `clearNotes()`

5. Notes are stored

- notes are saved inside `state.hubItems`
- notes use `type: 'note'`
- storage remains local through the existing Hub persistence

6. Notes UI is rendered

- `openNotesPanel()` calls `renderActionInSidePanel(...)`
- side panel action is `notes`
- panel supports:
  - textarea input
  - save note
  - clear notes
  - delete individual note

## Core Helpers

These helpers define the current notes model:

- `getNoteItems()`
- `addNoteItem(content, data)`
- `removeLatestNoteItem()`
- `removeMatchingNoteItem(query)`
- `clearNotes()`
- `openNotesPanel(message, prefill)`

## Current Voice Phrases

Examples that should work now:

- `take note buy milk tomorrow`
- `save note call mom tonight`
- `note that pick up medicine`
- `open notes`
- `read notes`
- `delete last note`
- `clear notes`

## Design Rule

Notes should follow this rule:

- parse commands from normalized speech
- save content from raw speech

That avoids a common failure where Blip correctly understands "this is a note command" but saves distorted content.

## Next Best Upgrades

1. Add a confidence/confirmation layer

- if a note sounds uncertain, Blip can answer:
  - `I heard: buy in Dubai. Save that?`

2. Add note search

- example:
  - `find my note about market`

3. Turn notes into actions

- examples:
  - `turn this note into reminder`
  - `add this note to calendar`

4. Add note categories

- shopping
- ideas
- reminders
- personal

## Multi-turn and freeform drafts

- List-style drafts (`awaiting_items`) still use “save note” style completion.
- Freeform dictation (`awaiting_freeform`) accumulates text until an explicit finish phrase; see [`src/services/notesDraftVoice.js`](../src/services/notesDraftVoice.js) and tests in `tests/notesDraftVoice.test.js`.
- Broader rules for changing parsers: [parsing contract](./parsing-contract.md).

## File References

- `src/main.js`
- `src/services/notesDraftVoice.js`
- `docs/notes-logic-path.md`
- `docs/parsing-contract.md`
