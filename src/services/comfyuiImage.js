/**
 * ComfyUI image generation for Blip.
 * Flow: POST /prompt → poll /history/{prompt_id} → GET /view → return dataUrl.
 * Same contract as geminiImage.generateImage so callers can swap provider.
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:8188';
const DEFAULT_POLL_MS = 800;
const DEFAULT_TIMEOUT_MS = 120000;

/** Default workflow: txt2img with one positive CLIP node (node "6"). Replace with your exported workflow. */
function getDefaultWorkflow() {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        cfg: 8,
        denoise: 1,
        latent_image: ['5', 0],
        model: ['4', 0],
        negative: ['7', 0],
        positive: ['6', 0],
        sampler_name: 'euler',
        scheduler: 'normal',
        seed: Math.floor(Math.random() * 2 ** 31),
        steps: 20
      }
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: 'v1-5-pruned-emaonly.safetensors' }
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { batch_size: 1, height: 512, width: 512 }
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['4', 1], text: 'a beautiful landscape' }
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['4', 1], text: 'bad hands, blurry' }
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] }
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { images: ['8', 0], filename_prefix: 'blip' }
    }
  };
}

function applyCheckpointName(workflow, ckptName) {
  let name = String(ckptName || '').trim();
  if (!name) return workflow;
  if (/-fp16\.safetensors$/i.test(name) && !/\.fp16\.safetensors$/i.test(name)) {
    name = name.replace(/-fp16\.safetensors$/i, '.fp16.safetensors');
  }
  if (workflow?.['4']?.inputs) workflow['4'].inputs.ckpt_name = name;
  return workflow;
}

/**
 * Build workflow JSON with prompt injected into the positive CLIP node (id "6" in default workflow).
 * If workflow has a different structure, pass promptKey e.g. ['6','inputs','text'].
 */
function buildWorkflow(prompt, workflowTemplate = null, promptKey = ['6', 'inputs', 'text']) {
  const workflow = workflowTemplate ? JSON.parse(JSON.stringify(workflowTemplate)) : getDefaultWorkflow();
  const text = String(prompt || '').trim() || 'a beautiful image';
  let node = workflow;
  for (let i = 0; i < promptKey.length - 1; i++) {
    const key = promptKey[i];
    if (!node[key]) node[key] = {};
    node = node[key];
  }
  node[promptKey[promptKey.length - 1]] = text;
  return workflow;
}

/**
 * Submit prompt to ComfyUI and return prompt_id.
 */
async function queuePrompt(baseUrl, workflow, clientId) {
  const url = `${baseUrl.replace(/\/$/, '')}/prompt`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ComfyUI /prompt failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`ComfyUI error: ${data.error}`);
  const promptId = data.prompt_id;
  if (!promptId) throw new Error('ComfyUI did not return prompt_id');
  return promptId;
}

/**
 * Poll /history/{prompt_id} until the run is complete and return first image output info.
 */
async function waitForHistory(baseUrl, promptId, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  const url = `${baseUrl.replace(/\/$/, '')}/history/${promptId}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(url);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    const data = await res.json();
    const entry = data[promptId];
    if (!entry) {
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    const outputs = entry.outputs || {};
    for (const nodeId of Object.keys(outputs)) {
      const images = outputs[nodeId].images;
      if (Array.isArray(images) && images.length > 0) {
        const img = images[0];
        return {
          filename: img.filename,
          subfolder: img.subfolder ?? '',
          type: img.type ?? 'output'
        };
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error('ComfyUI: timeout waiting for history');
}

/**
 * Fetch image bytes from ComfyUI /view.
 */
async function viewImage(baseUrl, filename, subfolder, folderType) {
  const params = new URLSearchParams({ filename, subfolder: subfolder || '', type: folderType || 'output' });
  const url = `${baseUrl.replace(/\/$/, '')}/view?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ComfyUI /view failed (${res.status})`);
  const blob = await res.blob();
  // Some ComfyUI builds don't send a Content-Type header for /view.
  // Without a MIME type, FileReader produces a `data:;base64,...` URL that won't render as an image.
  if (!blob.type) {
    const lowerName = String(filename || '').toLowerCase();
    const mime = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
      ? 'image/jpeg'
      : lowerName.endsWith('.webp')
        ? 'image/webp'
        : 'image/png';
    return new Blob([blob], { type: mime });
  }
  return blob;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate an image via ComfyUI. Returns same shape as geminiImage.generateImage for drop-in use.
 * @param {string} prompt - Text prompt for the positive CLIP node.
 * @param {object} options - { baseUrl, clientId, workflowTemplate, promptKey, timeoutMs, pollIntervalMs }
 * @returns {Promise<{ mimeType: string, base64: string, dataUrl: string, source: string }>}
 */
/** In dev, use Vite proxy to avoid CORS when ComfyUI is on 127.0.0.1:8000 or localhost:8000. */
function getComfyBaseUrl(options) {
  let base = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const normalized = base.replace(/^https?:\/\//, '').toLowerCase();
    if (normalized === '127.0.0.1:8000' || normalized === 'localhost:8000') {
      base = window.location.origin + '/api/comfyui';
    }
  }
  return base;
}

export async function generateImageComfyUI(prompt, options = {}) {
  const baseUrl = getComfyBaseUrl(options);
  const clientId = options.clientId || `blip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const workflow = applyCheckpointName(
    buildWorkflow(prompt, options.workflowTemplate, options.promptKey),
    options.ckptName
  );

  const promptId = await queuePrompt(baseUrl, workflow, clientId);
  const imageInfo = await waitForHistory(baseUrl, promptId, {
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_MS
  });

  const blob = await viewImage(baseUrl, imageInfo.filename, imageInfo.subfolder, imageInfo.type);
  const mimeType = blob.type || 'image/png';
  const dataUrl = await blobToDataUrl(blob);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');

  return {
    mimeType,
    base64,
    dataUrl,
    source: 'comfyui'
  };
}
