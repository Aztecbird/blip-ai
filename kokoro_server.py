#!/usr/bin/env python3
"""
Kokoro TTS Server for Blip AI
Runs locally at http://localhost:8765
First run auto-downloads the model files from HuggingFace (~110MB total).
"""

import io
import os
import wave
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Kokoro TTS Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH   = os.path.join(SCRIPT_DIR, "kokoro-v0_19.onnx")
VOICES_PATH = os.path.join(SCRIPT_DIR, "voices-v1.0.bin")

# HuggingFace direct download URLs (no auth required)
HF_BASE = "https://huggingface.co/thewh1teagle/Kokoro/resolve/main"
ONNX_URL   = f"{HF_BASE}/kokoro-v0_19.onnx"
VOICES_URL = f"{HF_BASE}/voices-v1.0.bin"

_kokoro = None


def _download_file(url: str, dest: str, label: str):
    """Stream-download a file with a progress indicator."""
    import urllib.request

    print(f"   ⏳ Downloading {label}…")
    tmp = dest + ".tmp"

    def reporthook(block, block_size, total):
        if total > 0:
            pct = min(100, block * block_size * 100 // total)
            print(f"      {pct}%", end="\r", flush=True)

    urllib.request.urlretrieve(url, tmp, reporthook)
    os.rename(tmp, dest)
    size_mb = os.path.getsize(dest) / 1_048_576
    print(f"   ✅ {label} saved ({size_mb:.1f} MB)")


def _download_if_needed():
    need_onnx   = not os.path.exists(ONNX_PATH)   or os.path.getsize(ONNX_PATH)   < 1_000_000
    need_voices = not os.path.exists(VOICES_PATH) or os.path.getsize(VOICES_PATH) < 1_000_000

    if not need_onnx and not need_voices:
        return

    print("📥 Downloading Kokoro model files from HuggingFace…")
    if need_onnx:
        _download_file(ONNX_URL, ONNX_PATH, "kokoro-v0_19.onnx (~82 MB)")
    if need_voices:
        _download_file(VOICES_URL, VOICES_PATH, "voices-v1.0.bin (~28 MB)")


def get_kokoro():
    global _kokoro
    if _kokoro is None:
        _download_if_needed()
        print("⏳ Loading Kokoro model into memory…")
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(ONNX_PATH, VOICES_PATH)
        print("✅ Kokoro model loaded and ready!")
    return _kokoro


# Pre-warm at startup
try:
    get_kokoro()
except Exception as e:
    print(f"⚠️  {e}")


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_sarah"
    speed: float = 1.0


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "kokoro-onnx"}


@app.post("/tts")
async def tts(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    try:
        kokoro = get_kokoro()
        samples, sample_rate = kokoro.create(
            req.text.strip(),
            voice=req.voice,
            speed=req.speed,
            lang="en-us"
        )

        buf = io.BytesIO()
        with wave.open(buf, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
            wf.writeframes(pcm.tobytes())

        buf.seek(0)
        return StreamingResponse(buf, media_type="audio/wav")

    except Exception as e:
        print(f"❌ TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("🎙️  Kokoro TTS Server starting on http://localhost:8765")
    print("   Voices: af_sarah · af_bella · am_adam · bm_george")
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="warning")
