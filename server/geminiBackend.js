import http from 'http';
import url from 'url';

// Unified secret management: reading safely from environment variables
// (These are loaded from .env.local by start-dev.sh / blip-stack.sh)
const PORT = process.env.GEMINI_BACKEND_PORT || 8793;
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Apply strict CORS as defined in existing backends
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.BLIP_ALLOWED_ORIGINS || process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173').split(',');
    
    if (origin && (allowedOrigins.includes(origin) || origin.includes('blipai.es'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Proxy Gemini generateContent. Google-style endpoints use
    // `.../models/{model}:generateContent`, so match the suffix token directly.
    if (parsedUrl.pathname.includes(':generateContent') && req.method === 'POST') {
        if (!GEMINI_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY is missing from .env.local' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Extract model from path or use default
                const modelMatch = parsedUrl.pathname.match(/\/models\/([^:]+):generateContent/);
                const requestedModel = modelMatch ? modelMatch[1] : 'gemini-2.5-flash';
                const model = /^minimax(?:[-\s_]?)/i.test(String(requestedModel || '').trim())
                    ? 'gemini-2.5-flash'
                    : requestedModel;
                
                const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
                
                const response = await fetch(googleUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });

                const data = await response.json();
                
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                console.error('[Gemini Backend Error]:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Make sure GOOGLE_GEMINI_API_KEY is set securely in your .env.local file!`);
});
