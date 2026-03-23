# Voice Command Smoke Checklist

Use this checklist while running Blip in the browser. Test in short passes and note the first failure message or broken UI state.

## Setup

- Start Blip and confirm the mic works.
- Pick one voice engine to start: `browser`, `kokoro`, or `gemini`.
- Keep DevTools open for console errors.
- Test one category at a time.

## Core Wake / System

- [ ] `Hey Blip`
- [ ] `Go to sleep`
- [ ] `Wake up`
- [ ] `Close everything`
- [ ] `Scroll down`
- [ ] `Scroll up`
- [ ] `Make Blip bigger`
- [ ] `Make Blip smaller`
- [ ] `Reset size`

Expected:
- Wake/sleep state changes cleanly.
- No stuck listening/thinking state.
- `Close everything` hides open panels and media.

## Speech / Chat

- [ ] `Hello Blip`
- [ ] `What time is it?`
- [ ] `What is the weather in Madrid?`
- [ ] `Search for the latest news about AI`
- [ ] `Explain black holes for my grandma`
- [ ] `Explain dinosaurs for a five year old`

Expected:
- Blip speaks back.
- Audience-style phrasing changes for senior/kids prompts.
- Search and weather routes do not crash when keys are missing.

## Timers / Alarms

- [ ] `Set a timer for 10 seconds`
- [ ] `Set a pizza timer for 15 seconds`
- [ ] `Set an alarm for 6 pm`
- [ ] `Remind me tomorrow at 9 am to call mom`
- [ ] `Cancel the next timer`
- [ ] `Cancel the pizza timer`
- [ ] `Clear all reminders`

Expected:
- Timer appears in countdown UI.
- When the timer fires, the timer side panel opens and shows `Silence Alarm`.
- Cancel commands remove the matching reminder.

## Camera

- [ ] `Open camera`
- [ ] `Snap photo`
- [ ] `Record video`
- [ ] `Stop video`
- [ ] `Close camera`
- [ ] `Save this to hub`

Expected:
- Camera permission prompt appears if needed.
- Photo/video actions do not break listening state.
- Save-to-hub works after capture.

## Media Gallery

- [ ] `Open gallery`
- [ ] `Show latest photo`
- [ ] `Open photo number one`
- [ ] `Open latest video`
- [ ] `Close gallery`

Expected:
- Gallery opens and closes cleanly.
- Index-based media open works after at least one saved item exists.

## YouTube / Video

- [ ] `Play lo-fi hip hop on YouTube`
- [ ] `Pause video`
- [ ] `Play video`
- [ ] `Mute video`
- [ ] `Unmute video`
- [ ] `Video volume down`
- [ ] `Video volume up`
- [ ] `Make video big`
- [ ] `Make video small`
- [ ] `Restart video`
- [ ] `Next video`
- [ ] `Close video`
- [ ] `Open the last video again`

**Save for later / categories (with a video open):**
- [ ] `Save for later` / `Watch later` / `Add to watch later` → saves to **Watch later**
- [ ] `Save to favorites` / `Save this video` → saves to **Favorites**
- [ ] `Save to music` / `Save to my music list` → saves to **Music** (Blip creates the playlist on first use)
- [ ] `Save to chill` / `Save to workout` / `Save to learn` → same idea for **Chill**, **Workout**, **Learn**
- [ ] Or use the **📌 Watch later** and **❤️ Favorites** buttons under the video in the panel

Expected:
- Search/open is the most fragile path.
- Controls should work once a video is open.
- Browser autoplay restrictions may mute initial playback.
- Saved videos appear in Hub and in the named playlist (state persists in localStorage).

## Charts / Graphs

- [ ] `Make a bar chart of apples 10 bananas 20 oranges 15`
- [ ] `Open the graph`
- [ ] `Save graph to creations`
- [ ] `Close graph`

Expected:
- A chart renders in the side panel.
- Reopen/save commands work after creation.

## Designs / Images

- [ ] `Create a design of a red racing car`
- [ ] `Show the design`
- [ ] `Save design to creations`

Expected:
- Image/design panel appears.
- Save command persists the current creation.

## Maps / Places

- [ ] `Show me sushi near me`
- [ ] `Route from Madrid to Barcelona`
- [ ] `Open the last map again`
- [ ] `Save map to creations`
- [ ] `Close map`

Expected:
- Map/place results render without crashing.
- Route command should open a map-style panel.

## Recipes

- [ ] `Give me a pasta recipe`
- [ ] `Save recipe to creations`

Expected:
- Recipe text appears.
- Save command keeps the current recipe.

## Products / Shopping

- [ ] `Find me the best headphones under 200 euros`
- [ ] `Save this to cart`
- [ ] `Open cart`
- [ ] `What is in my cart?`
- [ ] `Show cart images`
- [ ] `Close cart`

Expected:
- Product results show retailer links.
- Save/review/open cart commands work on the current result set.

## Hub

- [ ] `Open hub`
- [ ] `Save note to hub buy milk and apples`
- [ ] `What is in the hub?`
- [ ] `Remove buy milk from the hub`
- [ ] `Close hub`

Expected:
- Open/review/remove actions work without needing the keyboard.

## Calendar

- [ ] `Open calendar`
- [ ] `Schedule dentist tomorrow at 3 pm`
- [ ] `Create a meeting next Friday at 10 am`
- [ ] `Close calendar`

Expected:
- Simple day/time phrases are the main supported path.
- More complex phrases may still be partial.

## Personalization

- [ ] `Put on a crown`
- [ ] `Wear glasses`
- [ ] `Set your eyes to blue`
- [ ] `Set your aura to gold`
- [ ] `Reset style`

Expected:
- Face styling changes immediately and persists.

## Learning / Games

- [ ] `Open math game`
- [ ] `Start a game`
- [ ] `Close game`

Expected:
- Only pass if those flows are currently wired in your browser session.

## Notes

- Mark any failed command with:
  - the exact phrase spoken
  - what Blip did instead
  - console error text if present
  - which voice engine was active

- Priority failures to fix first:
  - speech stops working
  - timer/alarm UI does not appear
  - camera open fails
  - YouTube controls fail after opening a video
  - calendar command crashes the session
