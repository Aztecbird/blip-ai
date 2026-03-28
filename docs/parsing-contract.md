# Parsing contract (voice and command text)

Use this when you change how Blip interprets transcripts or typed commands. It complements the manual [voice-command-smoke-checklist.md](./voice-command-smoke-checklist.md) (user-facing QA) with **developer rules** so parsers stay consistent.

## How text flows through the system

Rough order matters; skipping layers or mixing them causes subtle bugs.

1. **Raw input** — Voice transcript or text from the UI.
2. **Assistant prefix strip** — `stripVoiceAssistantPrefix` / `normalizeVoiceCommandText` in [`src/services/textParsing.js`](../src/services/textParsing.js) (drops leading “Hey Blip”, trims).
3. **Aggressive command normalize** — `normalizeCommandText` (lowercase, punctuation to spaces) for some matchers.
4. **STT / typo normalize** — `normalizeVoiceTokens` in [`src/main.js`](../src/main.js) (speech fixes like “clothes” → “close”). Many handlers use this **in addition to** or **instead of** step 2; not every path is unified yet.
5. **Domain parsers** — Examples: [`getGmailVoiceCommand`](../src/services/gmailVoice.js), [`getTelegramVoiceCommand`](../src/services/telegramVoice.js), [`parseNaturalMessageFlow`](../src/services/messageFlow.js), [`parseBlipIntent`](../src/services/blipIntent.js), [`advanceFreeformNotesDraft`](../src/services/notesDraftVoice.js).
6. **Central merge** — [`buildVoiceRoutingSnapshot`](../src/services/assistantRouter.js) combines care cam, natural message flow, Gmail/Telegram commands, and vague-message clarification.
7. **Optional structured LLM pass** — [`resolveVoiceRoutingSnapshot`](../src/services/assistantRouter.js) may call [`resolveStructuredVoiceIntent`](../src/services/voiceIntentSchema.js) when heuristics say the utterance is ambiguous **and** a Gemini API key is available; otherwise the deterministic snapshot wins.

**Important:** [`parseNaturalMessageFlow`](../src/services/messageFlow.js) applies its own `normalizeText` pipeline (including ASR-style fixes). If you change Gmail-related phrasing fixes in one place, check the comment there about **keeping Gmail voice parsing and message flow aligned**.

## Checklist before merging parser changes

- [ ] **Match the right normalization layer** — Decide whether your rule runs on raw text, `normalizeVoiceCommandText`, `normalizeVoiceTokens`, or `normalizeCommandText`. Document in a one-line comment if non-obvious.
- [ ] **User-visible vs match-only** — Saved note bodies, email/Telegram draft text, and similar should stay close to what the user said (`sanitizeVoiceQuery` / raw cleanup). Do not run aggressive punctuation-stripping on content that gets stored or sent.
- [ ] **Respect router precedence** — In `buildVoiceRoutingSnapshot`, order is effectively: care cam → natural Gmail/Telegram flow (when channel resolves) → explicit Gmail/Telegram commands → generic “message” clarification. New families should slot in deliberately, not at random.
- [ ] **Follow-up sessions win first** — When `pendingNotesDraft`, `pendingEmailReview`, `pendingTelegramReview`, or similar is active, short replies (`yes`, `cancel`, list items, freeform fragments) must be handled by the pending resolver **before** broad intent routing steals them. Add a test if you add a new pending flow.
- [ ] **Multi-turn “done” phrases** — Freeform notes use explicit finish phrases in [`notesDraftVoice.js`](../src/services/notesDraftVoice.js). New phrases need tests so they are not confused with note body text in common cases.
- [ ] **Structured intent schema** — If you extend Gemini structured routing, update `VOICE_INTENT_SCHEMA`, `normalizeStructuredVoiceIntent`, and `mergeStructuredVoiceIntent` / `buildStructuredFamilyCommand` together; add or extend tests in [`tests/assistantRouter.test.js`](../tests/assistantRouter.test.js).
- [ ] **Infinitive “to” and noise recipients** — For “… to …” patterns, reuse or mirror patterns like [`parseRecipientAfterTo`](../src/services/messageFlow.js) and [`isRecipientNoiseOnly`](../src/services/voiceDialog/emailFollowUpParse.js) / Telegram noise lists so “want **to** send” is not parsed as recipient “send”.
- [ ] **Automated tests** — Run `npm test` (or `node --test tests/*.test.js`). Add a small focused test file or case for every new regex or branch you introduce.

## Residual edge cases (watch list)

These are known friction points; tighten with tests when you touch nearby code.

| Area | Risk |
|------|------|
| **Two normalize stacks** | `textParsing` vs `normalizeVoiceTokens` can diverge; same spoken phrase might match in one parser and miss in another. |
| **Generic “message …”** | Vague messaging triggers clarification; ensure real channels (`send email`, natural flow with `to:`) still resolve to Gmail/Telegram first. |
| **Gemini fallback** | Behavior differs when no API key: only deterministic routing runs. Do not assume structured intent always exists. |
| **Punctuation in commands** | `normalizeCommandText` removes many non-word chars; phrases that rely on `@` or `.` in emails often need raw or partially raw parsing. |
| **Finish vs content** | Any “done / save / finish note” style phrase in a dedicated flow can collide with user dictation; prefer exact-line or guarded patterns and tests. |
| **Care cam vs help** | [`parseBlipIntent`](../src/services/blipIntent.js) overlaps general “help”; context flags (`careCamActive`, etc.) matter. |

## Related docs

- [Notes logic path](./notes-logic-path.md) — Hub notes and voice vs saved content.
- [Voice command smoke checklist](./voice-command-smoke-checklist.md) — End-to-end manual phrases in the browser.
