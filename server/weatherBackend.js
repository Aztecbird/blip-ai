import http from 'http';
import url from 'url';
import { logApiExpense } from './utils/expenseLogger.js';

// Unified secret management: reading safely from environment variables
// (These are loaded from .env.local by start-dev.sh / blip-stack.sh)
const PORT = process.env.WEATHER_BACKEND_PORT || 8792;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';

function formatOffsetTime(offsetSeconds) {
    if (!Number.isFinite(Number(offsetSeconds))) return '';
    const now = new Date(Date.now() + (Number(offsetSeconds) * 1000));
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Apply strict CORS as defined in existing backends
    const origin = req.headers.origin;
    const allowedOrigins = new Set(
        String(process.env.BLIP_ALLOWED_ORIGINS || process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173')
            .split(',')
            .map((value) => value.trim().replace(/\/$/, ''))
            .filter(Boolean)
    );
    const normalizedOrigin = String(origin || '').trim().replace(/\/$/, '');
    
    if (origin && allowedOrigins.has(normalizedOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (parsedUrl.pathname === '/api/weather/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, configured: Boolean(WEATHER_API_KEY) }));
        return;
    }

    if (parsedUrl.pathname === '/api/weather/current' && req.method === 'GET') {
        const city = parsedUrl.query.city;

        if (!city) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'City parameter is required' }));
            return;
        }

        try {
            // Prefer OpenWeatherMap when configured.
            // If WEATHER_API_KEY is missing (common for local dev), fall back to wttr.in.
            if (WEATHER_API_KEY) {
                const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`Weather API returned ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                const timezoneOffset = Number(data?.timezone);
                const humidity = data?.main?.humidity;
                const windSpeed = data?.wind?.speed;
                const icon = String(data?.weather?.[0]?.icon || '');
                const isDay = icon ? icon.endsWith('d') : true;
                const description = data?.weather?.[0]?.description;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    city: data.name,
                    temp: data.main.temp,
                    description,
                    humidity,
                    windSpeed,
                    timezoneOffset,
                    localTime: formatOffsetTime(timezoneOffset),
                    isDay,
                    provider: 'openweather',
                    fetchTime: Date.now()
                }));
                void logApiExpense({
                    provider: 'openweathermap',
                    product: 'current_weather',
                    operation: 'requests',
                    model: 'openweather-current',
                    quantity: 1,
                    unit: 'per_request',
                    status: 'success',
                    metadata: { city: String(city) }
                });
                return;
            }

            // wttr.in fallback (server-side; avoids browser CORS issues)
            const wttrUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
            const wttrRes = await fetch(wttrUrl);
            if (!wttrRes.ok) {
                throw new Error(`wttr.in returned ${wttrRes.status}: ${wttrRes.statusText}`);
            }
            const wttr = await wttrRes.json();

            const current = wttr?.current_condition?.[0] || {};
            const cityName = wttr?.nearest_area?.[0]?.areaName?.[0]?.value || city;
            const desc = current?.weatherDesc?.[0]?.value || current?.condition || '';
            const temp = current?.temp_C;
            const humidity = current?.humidity;
            const windSpeed = current?.windspeedKmph ?? current?.windspeedMiles;
            const localTime = String(current?.localObsDateTime || '').trim();
            const isDay = String(current?.isday || 'yes').toLowerCase() === 'yes';

            // timezoneOffset isn't provided reliably by wttr.in JSON; keep it null.
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                city: cityName,
                temp,
                description: desc,
                humidity,
                windSpeed,
                timezoneOffset: null,
                localTime,
                isDay,
                provider: 'wttr',
                fetchTime: Date.now()
            }));
            void logApiExpense({
                provider: 'wttr',
                product: 'current_weather',
                operation: 'requests',
                model: 'wttr-j1',
                quantity: 1,
                unit: 'per_request',
                status: 'success',
                metadata: { city: String(city) }
            });
        } catch (error) {
            console.error('[Weather Backend Error]:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, process.env.BLIP_BACKEND_HOST || '127.0.0.1', () => {
    console.log(`Weather backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Make sure WEATHER_API_KEY is set securely in your .env.local file!`);
});
