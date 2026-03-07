const apiKey = "AIzaSyDS5jjsmo9v4YYgO4x1w7-VGZ1FG_GTzk8";
const model = "gemini-1.5-flash-latest";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

const body = {
    contents: [{
        parts: [{ text: "Hello! Are you working? Respond with exactly 'YES'." }]
    }]
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
})
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.log("❌ ERROR:", data.error.message);
        } else if (data.candidates && data.candidates[0].content) {
            console.log("✅ SUCCESS:", data.candidates[0].content.parts[0].text);
        } else {
            console.log("⚠️ EMPTY RESPONSE");
        }
    })
    .catch(err => {
        console.log("❌ FETCH ERROR:", err.message);
    });
