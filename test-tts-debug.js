const apiKey = "AIzaSyDS5jjsmo9v4YYgO4x1w7-VGZ1FG_GTzk8";

async function testTTS() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: "Testing TTS." }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
        }
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Referer': 'http://localhost:5173' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log(JSON.stringify(data.candidates[0].content.parts[0]).substring(0, 300));
    } catch (e) { console.error(e.message); }
}

testTTS();
