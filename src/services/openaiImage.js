export async function generateImageOpenAI(prompt, options = {}) {
  const textPrompt = String(prompt || '').trim();
  if (!textPrompt) throw new Error('OpenAI image generation requires a prompt.');

  const size = options.size || '1024x1024';
  const res = await fetch('/api/openai-image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: textPrompt, size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `OpenAI image backend failed (${res.status})`);
  }
  const base64 = data.base64;
  const mimeType = data.mimeType || 'image/png';
  if (!base64) throw new Error('OpenAI image backend returned no image.');
  return {
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    text: '',
    model: data.model || 'openai',
  };
}

