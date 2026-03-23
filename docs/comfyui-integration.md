# ComfyUI integration (design note)

## Your flow → Blip fit

The flow you described maps cleanly onto how Blip already handles images:

| Step | Your flow | Blip today | ComfyUI integration |
|------|-----------|------------|---------------------|
| 1 | Blip decides image needed | Same: “visual explain”, design, product preview, etc. | No change; same triggers. |
| 2 | App sends workflow JSON to `POST /prompt` | N/A (Gemini one-shot) | New: `comfyuiImage.js` builds/uses workflow, POSTs to ComfyUI. |
| 3 | ComfyUI runs | N/A | ComfyUI server does the work. |
| 4 | Blip watches progress via `/ws` or `/history/{prompt_id}` | N/A | Poll `GET /history/{prompt_id}` until done (or optional `/ws` for progress UI). |
| 5 | App fetches result from `/view` | N/A | `GET /view?filename=...&subfolder=...&type=...` → image bytes. |
| 6 | Blip shows image on screen / projector | ✅ Already: `lastDesignDataUrl`, `projecting-visual`, media gallery | Return same shape as Gemini: `{ dataUrl, mimeType?, ... }` → existing UI unchanged. |

So the only new surface is a **ComfyUI image provider** that speaks the same contract as `generateImage()` in `geminiImage.js`: prompt in, `{ dataUrl, mimeType, … }` out. The rest of the app (orchestrator, tool handlers, panel, gallery, projector) stays the same.

## Design choices

- **Workflow**: Start with one built-in workflow (e.g. txt2img with a single CLIP text node or a simple default from ComfyUI). Later: optional “workflow template” per use case or user-editable JSON.
- **Progress**: Polling `/history/{prompt_id}` is enough for “wait until done”. Optional: WebSocket for a “Generating… 45%” style message in the UI.
- **Settings**: One new setting, e.g. `ComfyUI base URL` (default `http://127.0.0.1:8188`). Optionally an “Image engine” dropdown: **Gemini** | **ComfyUI** (and only call Comfy when “ComfyUI” is selected).
- **Fallback**: If ComfyUI is chosen but unreachable or errors, fall back to Gemini (or show a clear “ComfyUI unavailable” message).

## File changes (minimal)

1. **`src/services/comfyuiImage.js`** (done)  
   - `generateImageComfyUI(prompt, options)`  
   - Options: `baseUrl`, `clientId`, `workflowTemplate?`, `timeoutMs`, `pollIntervalMs`.  
   - Internally: build workflow (e.g. inject prompt into node), POST `/prompt`, poll `/history/{prompt_id}`, GET `/view`, convert to `dataUrl`.  
   - Return `{ mimeType, base64, dataUrl, source: 'comfyui' }` so existing consumers don’t care.

2. **`src/services/geminiImage.js`** or a tiny **`src/services/imageProvider.js`**  
   - Single entry point, e.g. `generateImage(prompt, apiKeyOrOptions, options)` that:
     - If “image engine” is ComfyUI and baseUrl set → call `generateImageComfyUI(prompt, …)`.
     - Else → call existing Gemini `generateImage(prompt, apiKey, options)`.

3. **Settings UI**  
   - Input for ComfyUI base URL.  
   - Optional: “Image engine” = Gemini | ComfyUI (and maybe “ComfyUI (default)” if you want Comfy as default when URL is set).

4. **State**  
   - `state.comfyuiBaseUrl`, `state.imageEngine` (or derive engine from “if comfyuiBaseUrl then comfy else gemini”).

No change to orchestrator, tool handlers, or panel logic beyond calling the same `generateImage` (or the new dispatcher) and still using `result.image.dataUrl` / `lastDesignDataUrl` and `projecting-visual`.

## Summary

Your 1–6 flow is the right one. Implementing it as a **drop-in ComfyUI image provider** that matches the existing `generateImage` contract keeps the rest of Blip unchanged and gives you ComfyUI quality and workflows where you want them, with a simple settings toggle and optional Gemini fallback.

---

## How to use (after you download ComfyUI)

1. **Install and run ComfyUI locally** (default: `http://127.0.0.1:8188`). Ensure you have a checkpoint in ComfyUI’s `models/checkpoints` (e.g. `v1-5-pruned-emaonly.safetensors`), or edit the default workflow in `src/services/comfyuiImage.js` to use your checkpoint name.
2. **In Blip:** open **Settings** → set **Image engine** to **ComfyUI (local)** → set **ComfyUI URL** to your server (e.g. `http://127.0.0.1:8188`). Save/close.
3. When Blip needs an image (e.g. “explain photosynthesis”, design tool, product preview), it will send the prompt to your local ComfyUI and show the result in the panel or projector as before.
