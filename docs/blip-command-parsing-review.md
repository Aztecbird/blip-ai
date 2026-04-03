# Blip Command Parsing Review

This review captures the command families Blip currently understands in parsing logic and the recommended temperature stance for each group.

## Summary

Blip currently uses three parsing styles:

- deterministic regex and rule parsers in [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js), [`src/services/gmailVoice.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/gmailVoice.js), and [`src/services/telegramVoice.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/telegramVoice.js)
- structured low-temperature voice intent parsing in [`src/services/voiceIntentSchema.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/voiceIntentSchema.js)
- the new modular `blip-next` stack in [`src/blip-next/router/createBlipNextRouter.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/router/createBlipNextRouter.js)

## Temperature Policy

The new explicit policy is:

- core command parsing: default `0.03`, hard cap `0.08`
- general structured parsing: default `0.20`, hard cap `0.35`
- conversation generation: unchanged, higher than parsing

This is implemented in [`src/services/parsingTemperaturePolicy.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/parsingTemperaturePolicy.js).

Core command parsers should stay near zero because they drive:

- tool routing
- drafting targets
- follow-up confirmation behavior
- sensitive actions like sending messages

## Command Coverage

### System And Shell Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js)
- [`src/blip-next/rules/deterministicRouter.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/rules/deterministicRouter.js)

Examples:

- wake up
- go to sleep
- close everything
- close this
- scroll down
- scroll up
- stop scrolling
- make you bigger
- make you smaller
- open latest link
- self diagnostic

Temperature:
- `0.0` to `0.03`

### Timer, Alarm, Reminder Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L14081)
- [`src/blip-next/parsers/tools/timerParser.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/parsers/tools/timerParser.js)

Examples:

- set a timer for 8 minutes
- 10 minute timer
- cancel timer
- set an alarm for 7 tomorrow
- cancel all reminders
- cancel the reminder for medicine

Temperature:
- `0.0` to `0.03`

### Gmail Commands

Source:
- [`src/services/gmailVoice.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/gmailVoice.js)
- [`src/blip-next/parsers/tools/gmailParser.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/parsers/tools/gmailParser.js)

Examples:

- open Gmail
- open inbox
- open sent
- compose email to Natasha
- send email to teo@example.com with subject hi
- send this note by email
- save teo@example.com as Teo
- do you know Teo's email
- did you send it

Temperature:
- deterministic where possible, otherwise `0.03`

### Telegram Commands

Source:
- [`src/services/telegramVoice.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/telegramVoice.js)
- [`src/blip-next/parsers/tools/telegramParser.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/parsers/tools/telegramParser.js)

Examples:

- open Telegram
- send telegram message to Teo saying hello
- send this photo on Telegram
- send this video to Telegram
- share this link to Telegram
- send test on Telegram

Temperature:
- deterministic where possible, otherwise `0.03`

### Notes And Hub Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L14276)
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L14239)

Examples:

- take a note
- save note buy milk
- open notes
- remove latest note
- clear notes
- open hub
- save this to hub
- remove that from hub

Temperature:
- `0.0` to `0.08`

### Weather, Time, And Date Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L14464)
- [`src/blip-next/rules/deterministicRouter.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/rules/deterministicRouter.js)

Examples:

- weather in Valencia
- what is the weather
- what time is it
- what day is today

Temperature:
- `0.0` to `0.03`

### Calendar Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js)

Examples:

- open calendar
- show agenda
- delete that event
- move that meeting to tomorrow
- return to calendar

Temperature:
- parse at `0.03` to `0.08`
- create, move, delete still require confirmation checks

### Camera, CareCam, And Safety Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L16769)
- [`src/services/blipIntent.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/blipIntent.js)

Examples:

- open camera
- snap photo
- record video
- start live watch
- stop alert
- start care cam
- send help

Temperature:
- `0.0` to `0.05`

### Media, Gallery, And Panel Navigation

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L17043)
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L17217)

Examples:

- open media
- open photo 2
- next photo
- close image
- delete latest photo
- open latest video
- back to gallery

Temperature:
- `0.0` to `0.08`

### YouTube Commands

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js#L17276)
- [`src/blip-next/planning/workflowComposer.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/planning/workflowComposer.js)

Examples:

- open YouTube
- play
- pause
- mute
- unmute
- next video
- open music
- open videos
- search YouTube and send it on Telegram

Temperature:
- direct panel controls `0.0` to `0.05`
- search/workflow composition `0.2`

### Cart, Products, Learning Games, And Personalization

Source:
- [`src/main.js`](/Users/pabloarellano/Desktop/blip-ai/src/main.js)

Examples:

- open cart
- show cart images
- remove latest cart item
- start math game
- eye color blue
- hat off

Temperature:
- `0.0` to `0.08`

## Short Follow-Ups That Must Stay Contextual

Source:
- [`src/blip-next/parsers/intentClassifier.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/parsers/intentClassifier.js)
- [`src/blip-next/repair/repairHandler.js`](/Users/pabloarellano/Desktop/blip-ai/src/blip-next/repair/repairHandler.js)
- [`src/services/blipNextBridge.js`](/Users/pabloarellano/Desktop/blip-ai/src/services/blipNextBridge.js)

Examples:

- yes
- no
- send it
- the second one
- tomorrow instead
- not Natasha, Teo
- email instead
- cancel it

These should always be interpreted against active workflow memory before being treated as new standalone commands.

## Recommendations

- Keep all core command routing on deterministic rules or near-zero structured parsing.
- Keep send, delete, contact, and camera actions behind confirmation and validation.
- Expand `blip-next` gradually until it owns more of the command surface now handled by `main.js`.
- Avoid using the general conversation temperature for parser decisions.
