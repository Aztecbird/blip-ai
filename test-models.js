const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) environment variable.");
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url, {
    headers: { 'Referer': 'http://localhost:5173' }
})
    .then(res => res.json())
    .then(data => {
        if (data.models) {
            console.log("=== ALL MODELS ===");
            data.models.forEach(m => {
                console.log(m.name, "|", m.supportedGenerationMethods?.join(", "));
            });
        } else {
            console.log("Error:", data);
        }
    })
    .catch(console.error);
