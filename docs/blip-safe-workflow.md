# Blip-safe workflow

This is a lightweight way to keep changes from “pressing sand”: combine **Git lanes**, **fast automated checks**, **manual contracts**, and **clear file boundaries**. It complements (does not replace) full `npm test` and the longer checklists in this folder.

## 1. Git: stable lane vs experiments

**Idea:** `main` (or `stable`) stays mergeable; risky work happens on a branch you can delete.

```bash
# From a clean tree
git status
git checkout main
git pull   # if you use a remote

# New experiment
git checkout -b dev/calendar-tweak

# Work, commit often with clear messages
git add -p
git commit -m "Calendar scroll: target mirror-content before window scroll"

# When happy, merge (or open a PR)
git checkout main
git merge dev/calendar-tweak
```

**Checkpoint commits** (easy return points):

```bash
git commit -m "checkpoint: calendar panel + voice scroll verified manually"
```

**Throw away a bad experiment:**

```bash
git checkout main
git branch -D dev/bad-experiment
```

## 2. Automated guards (what you already have)

Run **all** Node tests before you merge or tag:

```bash
npm test
```

For a **quick** logic-only pass (~seconds), use:

```bash
npm run test:smoke
```

This runs a small subset of fast unit tests. It does **not** replace `npm test`; use it after small edits when you want immediate feedback.

**Adding a new guard:** put a file under `tests/` named `*.test.js` and add assertions. Prefer testing **pure functions** (parsers, resolvers, routing helpers) — they’re stable and don’t need a browser.

## 3. Working contract (manual, 2 minutes)

Before you call a feature “done” for the day, skim this list in the running app (localhost):

| Must work | Quick check |
|-----------|-------------|
| Calendar | Open calendar; month panel fills; close works |
| Ask / chat | Send a prompt; reply appears |
| Face / layout | Face centered; no overlapping panels |
| Weather / time | Card shows sensible text if enabled |
| Tools close | “Close everything” or equivalent clears panels |

Adjust rows to match what you ship; the point is a **fixed** short list, not perfection.

Deeper voice checks: [voice-command-smoke-checklist.md](./voice-command-smoke-checklist.md)  
Other prep: [pre-verbal-test-checklist.md](./pre-verbal-test-checklist.md)

## 4. Voice tool priority (photos vs YouTube)

Local **Photos / shots** open through a dedicated check in `src/voice/voiceToolIntent.js` that runs **before** prioritized YouTube shortcuts in `handleCommand`. That way “open photos” / “show my pictures” cannot be pre-empted by `openVideos` when the transcript clearly names photo nouns (and does not say `youtube` / `yt`). A short follow-up lock (`setVoiceToolFollowUpLock`) is set when photos open from voice so later follow-ups can reuse the same lane if you extend routing.

## 5. Component boundaries (reduce spillover)

- **Calendar:** keep logic in `src/features/calendar/` and calendar-specific CSS under scoped classes (e.g. `.blip-calendar-mirror-*`).
- **Voice routing:** prefer small, testable helpers (e.g. `resolveYouTubeLibraryViewFromVoice`) instead of growing one giant `if` chain without tests.
- **Global CSS:** changing `#blip-side-panel` or `body` rules affects many tools — touch those only when you intend a global change.

## 6. Cursor / AI prompt (copy-paste)

Use this when asking for code changes:

> Before changing anything, identify what currently works. Make the smallest possible change. Do not modify unrelated files. After editing, confirm these still make sense: calendar panel opens, Ask Blip sends input, side/tool panels can close, face layout not broken. Prefer adding or updating a small test in `tests/` for any new routing or parser logic.

## 7. Optional next steps (when you want more “solid ground”)

| Layer | Tool | When |
|-------|------|------|
| More unit tests | `node --test` (already in use) | Any pure JS helper |
| Browser E2E | Playwright | Critical clicks (open calendar, send chat) — add only if you’ll run it in CI |
| Visual regression | Playwright screenshots or Percy | When layout regressions hurt you often |

You don’t need all of these at once. **Branch + `npm test` + working contract** already stops most accidental breakage.
