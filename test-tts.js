const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) environment variable.");
    process.exit(1);
}

async function testTTS(model, config) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: "Testing TTS." }] }],
        generationConfig: config
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Referer': 'http://localhost:5173' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.error) {
            console.log(`❌ ${model} ERROR:`, data.error.message);
        } else {
            console.log(`✅ ${model} SUCCESS! Part keys:`, Object.keys(data.candidates[0].content.parts[0]));
        }
    } catch (e) { console.error(e.message); }
}

async function run() {
    // Test 1: gemini-2.5-flash-preview-tts + audio/mp3 + voiceName
    await testTTS('gemini-2.5-flash-preview-tts', {
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
    });

    // Test 2: gemini-2.5-flash-preview-tts + responseModalities = AUDIO + voiceName
    await testTTS('gemini-2.5-flash-preview-tts', {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
    });

    // Test 3: gemini-2.5-flash + responseModalities = AUDIO + voiceName
    await testTTS('gemini-2.5-flash', {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
    });
}
run();
