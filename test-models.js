const apiKey = "AIzaSyDS5jjsmo9v4YYgO4x1w7-VGZ1FG_GTzk8";
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
