# Gemini Service Architecture

## Services

- `src/services/geminiCore.js`
  - shared API key validation
  - model defaults
  - shared Gemini POST helper

- `src/services/geminiText.js`
  - `askGemini()`
  - `generateWithPrompt()`
  - Blip text/system prompts

- `src/services/geminiTts.js`
  - `generateSpeech()`

- `src/services/geminiImage.js`
  - `generateImage()`

- `src/services/orchestrator.js`
  - `explainWithImage()`
  - runs text + image generation together

- `src/services/gemini.js`
  - compatibility barrel
  - re-exports the split services

## Intended Usage

Text / reasoning:

```js
import { askGemini, generateWithPrompt } from './services/geminiText.js';
```

Voice:

```js
import { generateSpeech } from './services/geminiTts.js';
```

Image generation:

```js
import { generateImage } from './services/geminiImage.js';
```

Multimodal orchestration:

```js
import { explainWithImage } from './services/orchestrator.js';
```
