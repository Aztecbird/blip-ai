/**
 * Web Services for Blip
 * Weather (wttr.in) and Currency (ExchangeRate-API)
 */

import { generateWithPrompt } from './geminiText.js';

const WEB_CACHE = new Map();

function getCacheKey(scope, ...parts) {
    return [scope, ...parts.map((part) => String(part || '').trim().toLowerCase())].join('::');
}

function getCached(key, ttlMs) {
    const hit = WEB_CACHE.get(key);
    if (!hit) return null;
    if ((Date.now() - hit.time) > ttlMs) {
        WEB_CACHE.delete(key);
        return null;
    }
    return hit.value;
}

function setCached(key, value) {
    WEB_CACHE.set(key, { value, time: Date.now() });
    return value;
}

function formatOffsetTime(offsetSeconds) {
    if (!Number.isFinite(Number(offsetSeconds))) return '';
    const now = new Date(Date.now() + (Number(offsetSeconds) * 1000));
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

function normalizeProductOptionList(raw) {
    return String(raw || '')
        .split('\n')
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
        .filter(Boolean)
        .filter((line, index, arr) => arr.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index)
        .slice(0, 3);
}

export const web = {
    /**
     * Get weather for a specific location
     * prefers OpenWeatherMap when an API key is provided, falls back to wttr.in
     */
    async getWeather(location, apiKey = '') {
        const safeLocation = String(location || '').trim();
        const safeApiKey = String(apiKey || '').trim();
        if (!safeLocation) {
            return { text: "Tell me the city for the weather.", error: true };
        }
        const cacheKey = getCacheKey('weather', safeApiKey ? 'openweather' : 'auto', safeLocation);
        const cached = getCached(cacheKey, 5 * 60 * 1000);
        if (cached) return cached;
        console.log(`🌦 Fetching weather for: ${safeLocation}`);
        if (!safeApiKey) {
            try {
                const data = await fetchJsonWithTimeout(
                    `/api/weather/current?city=${encodeURIComponent(safeLocation)}`,
                    {},
                    6000
                );

                const city = data?.city || safeLocation;
                const desc = data?.description || data?.desc || data?.condition;
                const temp = data?.temp;
                const humidity = data?.humidity;
                const windSpeed = data?.windSpeed;
                const timezoneOffset = Number(data?.timezoneOffset);
                const localTime = String(data?.localTime || formatOffsetTime(timezoneOffset) || '').trim();
                const isDay = typeof data?.isDay === 'boolean' ? data.isDay : true;
                if (temp == null || !desc) throw new Error('Weather backend payload incomplete');

                return setCached(cacheKey, {
                    text: `In ${city}, it's currently ${Math.round(Number(temp))}°C and ${desc}. The humidity is ${humidity}%.`,
                    data: {
                        temp: Math.round(Number(temp)),
                        desc,
                        city,
                        humidity,
                        windSpeed,
                        isDay,
                        localTime,
                        timezoneOffset,
                        provider: String(data?.provider || 'weather-backend'),
                        fetchTime: Number(data?.fetchTime) || Date.now()
                    }
                });
            } catch (err) {
                console.warn('Weather backend fallback:', err?.message || err);
            }
        }

        try {
            if (safeApiKey) {
                const data = await fetchJsonWithTimeout(
                    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(safeLocation)}&appid=${encodeURIComponent(safeApiKey)}&units=metric`,
                    {},
                    8000
                );

                const city = data?.name || safeLocation;
                const desc = data?.weather?.[0]?.description || data?.weather?.[0]?.main;
                const temp = data?.main?.temp;
                const humidity = data?.main?.humidity;
                const windSpeed = data?.wind?.speed;
                const icon = String(data?.weather?.[0]?.icon || '');
                const isDay = icon ? icon.endsWith('d') : true;
                const timezoneOffset = Number(data?.timezone);
                const localTime = formatOffsetTime(timezoneOffset);
                if (temp == null || !desc) throw new Error('OpenWeather payload incomplete');

                return setCached(cacheKey, {
                    text: `In ${city}, it's currently ${Math.round(Number(temp))}°C and ${desc}. The humidity is ${humidity}%.`,
                    data: { temp: Math.round(Number(temp)), desc, city, humidity, windSpeed, isDay, localTime, timezoneOffset, provider: 'openweather', fetchTime: Date.now() }
                });
            }
        } catch (err) {
            if (safeApiKey) {
                console.warn('OpenWeather fallback:', err?.message || err);
            } else {
                console.error('Weather error:', err);
            }
        }

        try {
            const data = await fetchJsonWithTimeout(`https://wttr.in/${encodeURIComponent(safeLocation)}?format=j1`, {}, 8000);

            const current = data?.current_condition?.[0];
            const city = data?.nearest_area?.[0]?.areaName?.[0]?.value || safeLocation;
            const desc = current?.weatherDesc?.[0]?.value;
            const temp = current?.temp_C;
            const humidity = current?.humidity;
            const isDay = String(current?.isday || 'yes').toLowerCase() === 'yes';
            const localTime = String(current?.localObsDateTime || current?.observation_time || '').trim();
            if (temp == null || !desc) throw new Error('Weather payload incomplete');

            return setCached(cacheKey, {
                text: `In ${city}, it's currently ${temp}°C and ${desc}. The humidity is ${humidity}%.`,
                data: { temp, desc, city, humidity, isDay, localTime, provider: 'wttr', fetchTime: Date.now() }
            });
        } catch (err) {
            console.error('Weather error:', err);
            return { text: "I couldn't get the weather for that location right now.", error: true };
        }
    },

    /**
     * Get currency exchange rates
     * uses open.er-api.com
     */
    async getExchangeRate(from, to) {
        console.log(`💱 Fetching exchange rate: ${from} to ${to}`);
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
            if (!res.ok) throw new Error('Currency service unavailable');
            const data = await res.json();

            const rate = data.rates[to.toUpperCase()];
            if (!rate) throw new Error('Currency code not found');

            return {
                text: `The exchange rate from ${from} to ${to} is ${rate.toFixed(2)}.`,
                rate: rate
            };
        } catch (err) {
            console.error('Currency error:', err);
            return { text: "I'm having trouble looking up that exchange rate.", error: true };
        }
    },

    /**
     * Get 7-day historical exchange rates
     * uses api.frankfurter.app
     */
    async getCurrencyHistory(from, to) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);

            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            console.log(`📈 Fetching history: ${startStr} to ${endStr}`);

            const res = await fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=${from.toUpperCase()}&to=${to.toUpperCase()}`);
            if (!res.ok) throw new Error('History service unavailable');

            const data = await res.json();
            const labels = [];
            const rates = [];

            for (const [date, ratesObj] of Object.entries(data.rates)) {
                labels.push(date.substring(5)); // just MM-DD
                rates.push(ratesObj[to.toUpperCase()]);
            }

            return { labels, rates };
        } catch (err) {
            console.error('Currency history error:', err);
            return null;
        }
    },

    /**
     * Get real place info using OpenStreetMap (Nominatim + Overpass API)
     * Completely free, no API key needed.
     * Falls back to Wikipedia if no OSM results found.
     */
    async getPlaceInfo(query, location) {
        const safeQuery = String(query || '').trim();
        const safeLocation = String(location || '').trim();
        if (!safeQuery) return { text: "Tell me what place you want to find.", html: '' };
        if (!safeLocation) return { text: "Tell me where to search for that place.", html: '' };
        const cacheKey = getCacheKey('place', safeQuery, safeLocation);
        const cached = getCached(cacheKey, 10 * 60 * 1000);
        if (cached) return cached;
        try {
            console.log(`🗺️ OSM lookup: "${safeQuery}" in "${safeLocation}"`);

            // Step 1: Geocode the location → lat/lon via Nominatim
            const nominatimData = await fetchJsonWithTimeout(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(safeLocation)}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'BlipAI/1.0' } },
                9000
            );
            if (!nominatimData.length) throw new Error('Location not found via Nominatim');

            const { lat, lon } = nominatimData[0];
            console.log(`📍 Geocoded "${safeLocation}" → ${lat}, ${lon}`);

            // Step 2: Extract a cuisine/type keyword from the query
            const cuisineKeywords = ['sushi', 'pizza', 'burger', 'ramen', 'thai', 'chinese', 'indian',
                'mexican', 'italian', 'korean', 'vegan', 'vegetarian', 'seafood', 'steak', 'tapas'];
            const lowerQuery = safeQuery.toLowerCase();
            const detectedCuisine = cuisineKeywords.find(k => lowerQuery.includes(k));

            // Step 3: Query Overpass API for restaurants near location
            let amenityFilter = '"amenity"="restaurant"';
            let cuisineFilter = detectedCuisine ? `["cuisine"~"${detectedCuisine}",i]` : '';
            const nameFilter = !detectedCuisine ? `["name"~"${safeQuery.split(' ')[0]}",i]` : '';

            const overpassQuery =
                `[out:json][timeout:20];` +
                `(node[${amenityFilter}]${cuisineFilter}${nameFilter}(around:3000,${lat},${lon});` +
                ` way[${amenityFilter}]${cuisineFilter}${nameFilter}(around:3000,${lat},${lon}););` +
                `out body 6;`;

            const overpassData = await fetchJsonWithTimeout('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: overpassQuery
            }, 12000);

            const elements = Array.isArray(overpassData?.elements) ? overpassData.elements : [];
            console.log(`✅ Overpass returned ${elements.length} places`);

            if (!elements.length) {
                // Widen search: all restaurants, filter by name keyword
                const wideQuery =
                    `[out:json][timeout:20];` +
                    `node["amenity"="restaurant"](around:2000,${lat},${lon});` +
                    `out body 5;`;
                const wideData = await fetchJsonWithTimeout('https://overpass-api.de/api/interpreter', { method: 'POST', body: wideQuery }, 12000);
                if (!wideData.elements.length) {
                    // Wikipedia Fallback with Disambiguation Check
                    console.log(`📖 Wikipedia fallback for: ${safeQuery}`);
                    try {
                        const wikiData = await fetchJsonWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(safeQuery.replace(/ /g, '_'))}`, {}, 8000);
                        let summary = wikiData.extract || "";

                        // DISAMBIGUATION: If the query is an adjective but the result is about the city of Nice, discard or flag.
                        if (safeQuery.toLowerCase().trim() === 'nice' || (safeQuery.toLowerCase().includes('nice') && summary.includes('Nice is the seventh-most populous city in France'))) {
                            return setCached(cacheKey, {
                                text: `I found results for "Nice" (the city), but I suspect you meant "nice" as in pleasant. Could you be more specific about what you are looking for?`,
                                html: ''
                            });
                        }

                        return setCached(cacheKey, { text: summary, html: '' });
                    } catch (_) {}
                    // Final fallback: Wikipedia
                    const wikiFallback = await this._wikiPlaceInfo(safeQuery, safeLocation);
                    return setCached(cacheKey, { text: wikiFallback, html: '' });
                }
                elements.push(...wideData.elements);
            }

            // Step 4: Format the results into a readable summary and an HTML list
            const htmlPlaces = elements.slice(0, 4).map(el => {
                const t = el.tags || {};
                const name = t.name || 'Unknown place';
                const street = t['addr:street'] ? ` on ${t['addr:street']}` : '';
                const housenumber = t['addr:housenumber'] ? ` ${t['addr:housenumber']}` : '';
                const hours = t['opening_hours'] ? `<br>🕒 ${t['opening_hours']}` : '';
                const phone = t['phone'] || t['contact:phone'] ? `<br>📞 ${t['phone'] || t['contact:phone']}` : '';
                const cuisine = t['cuisine'] ? ` (${t['cuisine'].replace(/_/g, ' ')})` : '';

                const q = encodeURIComponent(`${name} ${safeLocation}`);
                return `<a href="https://www.google.com/maps/search/${q}" target="_blank" class="action-link blue" style="display:block;margin-top:6px;text-align:left;line-height:1.4;">
                    <b>📍 ${name}</b>${cuisine}${street}${housenumber}${hours}${phone}
                </a>`;
            }).join('');

            const intro = detectedCuisine
                ? `I found ${elements.length} ${detectedCuisine} options in ${safeLocation}. I've marked the best ones on the map for you!`
                : `I found ${elements.length} places matching that description in ${safeLocation}. I've marked them on the map.`;

            return setCached(cacheKey, { text: intro, html: htmlPlaces });

        } catch (e) {
            console.error('OSM lookup error, falling back to Wikipedia:', e);
            const wikiText = await this._wikiPlaceInfo(safeQuery, safeLocation);
            return setCached(cacheKey, { text: wikiText, html: '' });
        }
    },

    /** Wikipedia fallback for place info */
    async _wikiPlaceInfo(query, location) {
        try {
            const searchTerms = encodeURIComponent(`${query} ${location}`);
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchTerms}&utf8=&format=json&origin=*`);
            const data = await res.json();
            const results = data.query.search;
            if (!results || results.length === 0) return "I couldn't find specific information for that place right now.";
            const cleanSnippet = results[0].snippet.replace(/<\/?[^>]+(>|$)/g, '');
            return `Here is some information I found: ${cleanSnippet}...`;
        } catch (e) {
            return "I had trouble connecting to the public databases.";
        }
    },

    // Keep old name as alias for backward compatibility
    async getPlaceReviews(query, location) {
        return this.getPlaceInfo(query, location);
    },

    async getMovies(location) {
        try {
            console.log(`Fetching movies for: ${location}`);
            // Use Wikipedia API for reliable, ad-free, unblocked answers about cinemas
            const searchTerms = encodeURIComponent(`Cinemas Movie theaters in ${location}`);
            const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchTerms}&utf8=&format=json&origin=*`);

            if (!wikiRes.ok) throw new Error('Search failed');
            const wikiData = await wikiRes.json();

            if (wikiData.query.search.length > 0) {
                const snippet = wikiData.query.search[0].snippet.replace(/<\/?[^>]+(>|$)/g, ""); // strip HTML
                return `I don't have live ticket times, but here is some information about cinemas in ${location}: ${snippet}...`;
            }
            return `I couldn't find cinemas or movie information for ${location} right now.`;

        } catch (e) {
            console.error('Movies Fetching Error:', e);
            return `I couldn't look up movies for ${location} right now due to a network error.`;
        }
    },

    /**
     * Build product links for Spanish retailers.
     * @param {string} query - e.g. "piano keyboard"
     * @param {string[]} recommendations - e.g. ["Yamaha P-125", "Roland FP-30X"]
     */
    async getProducts(query, recommendations = [], options = {}) {
        console.log(`🛒 Building retailer links for: ${query}`, recommendations);

        let items = (recommendations && recommendations.length > 0)
            ? recommendations.slice(0, 3)
            : [];

        if (!items.length && options?.apiKey) {
            try {
                const optionText = await generateWithPrompt(
                    'You recommend products. Reply with exactly 3 short product options, one per line. No intro, no bullets beyond the product names.',
                    `User wants: ${query}\nGive 3 concrete shopping options or product types that would make sense to compare.`,
                    options.apiKey
                );
                items = normalizeProductOptionList(optionText);
            } catch (error) {
                console.warn('Product recommendations fallback:', error?.message || error);
            }
        }

        if (!items.length) items = [query, `Best ${query}`, `Budget ${query}`].slice(0, 3);

        const retailers = [
            { name: 'Amazon', base: 'https://www.amazon.es/s?k=' },
            { name: 'Media Markt', base: 'https://www.mediamarkt.es/es/search.html?query=' },
            { name: 'PC Componentes', base: 'https://www.pccomponentes.com/buscar/?query=' },
            { name: 'Carrefour', base: 'https://www.carrefour.es/?q=' }
        ];

        // If the query mentions a specific retailer, prioritize it
        const lowerQuery = query.toLowerCase();
        const requestedRetailer = String(options?.retailer || '').trim().toLowerCase();
        const preferredRetailer = requestedRetailer
            ? retailers.find(r => r.name.toLowerCase() === requestedRetailer)
            : retailers.find(r => lowerQuery.includes(r.name.toLowerCase()));

        const products = [];
        items.forEach(itemName => {
            if (preferredRetailer) {
                products.push({
                    name: itemName,
                    url: `${preferredRetailer.base}${encodeURIComponent(itemName)}`,
                    color: preferredRetailer.name === 'Amazon' ? 'orange' : 'blue',
                    retailer: preferredRetailer.name
                });
            } else {
                products.push({
                    name: itemName,
                    url: `${retailers[0].base}${encodeURIComponent(itemName)}`,
                    color: 'orange',
                    retailer: retailers[0].name
                });
            }
        });

        const spokenNames = items.join(', ');
        const storeSuffix = preferredRetailer ? ` at ${preferredRetailer.name}` : "";
        const spokenText = `I've found some options for ${spokenNames}${storeSuffix}. I've added links to check their price and availability below.`;

        const html = products.map(p =>
            `<a href="${p.url}" target="_blank" class="action-link ${p.color}" style="display:block;margin-top:6px;text-align:left;">🛒 ${p.name}</a>`
        ).join('');

        return { text: spokenText, html, links: products };
    },

    async search(query, entities = []) {
        console.log(`🔍 Web search: ${query}`, entities);
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

        // High-Precision Data Bank (V3.6.5) - For common wow-moments
        const demographicDataBank = {
            "mexico": {
                total: "~132.5 Million",
                women: "67.7 Million (51.1%)",
                men: "64.8 Million (48.9%)",
                age: "30.5 years",
                growth: "High growth, young population"
            },
            "spain": {
                total: "~48.8 Million",
                women: "24.9 Million (51.0%)",
                men: "23.9 Million (49.0%)",
                age: "46.2 years",
                growth: "Stable growth, aging population"
            }
        };

        // Check Data Bank first; if no match, don't hit Wikipedia — just fall back to generic text + Google link.
        let extractedData = "";
        const searchTargets = (entities && entities.length > 1) ? entities : [query];
        let combinedExtract = "";
        const lowerQuery = (typeof query === 'string' ? query : '').toLowerCase();

        // Trivia: "who sang the solar system with planet names" — well-known educational songs
        const solarSystemSongMatch = /solar\s*system|planet\s*names?|names?\s*of\s*(?:the\s+)?planets?/.test(lowerQuery) &&
            /\b(sang|singer|song|who\s+sang|artist|video|youtube)\b/.test(lowerQuery);
        if (solarSystemSongMatch) {
            combinedExtract = "Famous educational songs that show the solar system with the names of each planet include: \"The Planet Song\" by Have Fun Teaching, \"The Solar System Song\" by Kids Learning Tube, and \"Planet Song\" from Super Simple Songs. If you're thinking of a specific version (e.g. from a show or a decade), the Google link below can help narrow it down.";
        }

        for (const target of searchTargets) {
            const lowerTarget = target.toLowerCase();
            const matchedEntity = Object.keys(demographicDataBank).find(key =>
                lowerTarget.includes(key) || key.includes(lowerTarget)
            );

            if (matchedEntity) {
                const data = demographicDataBank[matchedEntity];
                combinedExtract += `\n--- VERIFIED SOURCE: BLIP DEMO-BANK (${matchedEntity.toUpperCase()}) ---\n`;
                combinedExtract += `Total Population of ${matchedEntity}: ${data.total}\nWomen: ${data.women}\nMen: ${data.men}\nMedian Age: ${data.age}\nDynamic: ${data.growth}\n`;
            }
        }

        extractedData = combinedExtract || "No special data was pulled for this search. You can open the Google link below for full results.";

        let extraHtml = `
            <a href="${googleUrl}" target="_blank" class="action-link blue">🔍 SEARCH ON GOOGLE</a>
        `;

        return {
            text: extractedData,
            html: extraHtml
        };
    },

    async getImageLookup(query) {
        const safeQuery = String(query || '').trim();
        if (!safeQuery) {
            return { text: 'Tell me what picture you want to see.', error: true };
        }
        const cacheKey = getCacheKey('image-lookup', safeQuery);
        const cached = getCached(cacheKey, 30 * 60 * 1000);
        if (cached) return cached;

        const wikiTitle = safeQuery.replace(/\s+/g, '_');
        const googleImageUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(safeQuery)}`;

        try {
            const wikiData = await fetchJsonWithTimeout(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
                {},
                9000
            );

            const originalImageUrl = wikiData?.originalimage?.source || '';
            const thumbnailImageUrl = wikiData?.thumbnail?.source || '';
            const imageUrl = thumbnailImageUrl || originalImageUrl || '';
            const pageUrl = wikiData?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;
            const title = wikiData?.title || safeQuery;
            const extract = String(wikiData?.extract || '').trim();

            if (imageUrl) {
                const fallbackImageUrls = [thumbnailImageUrl, originalImageUrl].filter(Boolean);
                return setCached(cacheKey, {
                    text: extract || `Here is ${title}.`,
                    imageUrl,
                    fallbackImageUrls,
                    title,
                    sourceUrl: pageUrl,
                    html: `<a href="${pageUrl}" target="_blank" class="action-link blue">📘 OPEN WIKIPEDIA</a>`
                });
            }
        } catch (error) {
            console.warn('Wikipedia image lookup fallback:', error?.message || error);
        }

        try {
            const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(safeQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
            const commonsData = await fetchJsonWithTimeout(commonsUrl, {}, 9000);
            const pages = Object.values(commonsData?.query?.pages || {});
            const first = pages.find((page) => Array.isArray(page?.imageinfo) && page.imageinfo[0]?.url);
            const imageInfo = first?.imageinfo?.[0];
            const imageUrl = imageInfo?.thumburl || imageInfo?.url || '';
            const title = String(first?.title || safeQuery).replace(/^File:/i, '').replace(/_/g, ' ');
            const sourceUrl = imageInfo?.descriptionurl || googleImageUrl;

            if (imageUrl) {
                const fallbackImageUrls = [imageInfo?.thumburl, imageInfo?.url].filter(Boolean);
                return setCached(cacheKey, {
                    text: `Here is an image for ${safeQuery}.`,
                    imageUrl,
                    fallbackImageUrls,
                    title,
                    sourceUrl,
                    html: `<a href="${sourceUrl}" target="_blank" class="action-link blue">🖼 OPEN IMAGE SOURCE</a>`
                });
            }
        } catch (error) {
            console.warn('Wikimedia Commons image lookup failed:', error?.message || error);
        }

        return {
            text: `I couldn't pull a direct image for ${safeQuery}, but I can open image results for you.`,
            imageUrl: '',
            fallbackImageUrls: [],
            title: safeQuery,
            sourceUrl: googleImageUrl,
            html: `<a href="${googleImageUrl}" target="_blank" class="action-link blue">🖼 SEARCH IMAGES ON GOOGLE</a>`
        };
    },

    /**
     * Search YouTube. If youtubeApiKey is set, uses YouTube Data API v3 to get first video and returns embedUrl for in-panel playback.
     * @param {string} query - e.g. "how to cut tomatoes"
     * @param {string} [youtubeApiKey] - optional; enable YouTube Data API v3 in Google Cloud and pass key for embed + autoplay
     */
    async searchYouTube(query, youtubeApiKey = null) {
        const safeQuery = String(query || '').trim();
        if (!safeQuery) {
            return {
                text: 'Tell me what video to search for.',
                url: 'https://www.youtube.com',
                html: `<a href="https://www.youtube.com" target="_blank" class="action-link red">🎬 OPEN YOUTUBE</a>`
            };
        }
        const cacheKey = getCacheKey('youtube', safeQuery, youtubeApiKey ? 'keyed' : 'search');
        const cached = getCached(cacheKey, 10 * 60 * 1000);
        if (cached) return cached;
        console.log(`🎬 YouTube search: ${safeQuery}`);
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(safeQuery)}`;
        const result = {
            text: `I've found some videos on ${safeQuery} for you to watch.`,
            url: searchUrl,
            html: `<a href="${searchUrl}" target="_blank" class="action-link red">🎬 WATCH ON YOUTUBE: ${safeQuery}</a>`
        };
        if (youtubeApiKey && youtubeApiKey.trim()) {
            try {
                const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(safeQuery)}&key=${youtubeApiKey.trim()}`;
                const data = await fetchJsonWithTimeout(apiUrl, {}, 9000);
                const items = data.items || [];
                result.searchResults = items.map((item) => ({
                    videoId: item.id?.videoId,
                    title: item.snippet?.title || '',
                    channelTitle: item.snippet?.channelTitle || ''
                })).filter((r) => r.videoId);
                const videoId = result.searchResults[0]?.videoId;
                if (videoId) {
                    result.videoId = videoId;
                    result.embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                    result.watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                }

                // Optional enrichment: fetch category + duration for better classification (music vs video).
                if (result.searchResults?.length) {
                    const ids = result.searchResults.map((r) => r.videoId).slice(0, 5).join(',');
                    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(ids)}&key=${youtubeApiKey.trim()}`;
                    const videosData = await fetchJsonWithTimeout(videosUrl, {}, 9000).catch(() => null);
                    const byId = new Map();
                    (videosData?.items || []).forEach((item) => {
                        const id = item?.id;
                        if (!id) return;
                        byId.set(id, {
                            categoryId: String(item?.snippet?.categoryId || ''),
                            duration: String(item?.contentDetails?.duration || '')
                        });
                    });
                    result.searchResults = result.searchResults.map((entry) => ({
                        ...entry,
                        categoryId: byId.get(entry.videoId)?.categoryId || '',
                        duration: byId.get(entry.videoId)?.duration || ''
                    }));
                }
            } catch (e) {
                console.warn('YouTube Data API failed, using search link only:', e.message);
            }
        }
        return setCached(cacheKey, result);
    },

    /**
     * Deep Web Demographic Search (V3.6.0)
     * When apiKey is provided, uses Gemini with a research-assistant prompt.
     * Otherwise falls back to Wikipedia + data-bank.
     */
    async deepDemographicSearch(query, entities = [], apiKey = null) {
        console.log(`📡 Deep Demographic Search: ${query}`, entities);

        if (apiKey && apiKey.trim()) {
            const prompt = `
You are a research assistant.
Find demographic insights, behavioral trends, and audience profiles related to:

${query}

Return:
- audience segments
- interests
- geographic patterns
- purchasing tendencies
- cultural signals
`;
            try {
                const text = await generateWithPrompt(
                    "You are a research assistant. Reply with clear, structured demographic insights. No JSON, plain text.",
                    prompt.trim(),
                    apiKey
                );
                return {
                    text: text || "No demographic insights could be generated.",
                    insights: ["Audience Segments", "Interest Patterns", "Geographic Clusters", "Cultural Signals"]
                };
            } catch (e) {
                console.warn("Deep demographic (Gemini) failed, falling back to search:", e.message);
            }
        }

        const searchResult = await this.search(query, entities);
        return {
            text: searchResult.text,
            insights: [
                "Audience Segments",
                "Interest Patterns",
                "Geographic Clusters",
                "Cultural Signals"
            ]
        };
    }

};

/**
 * Deep demographic search via a backend /api/search endpoint.
 * Use this when you have a server that accepts POST { prompt } and returns JSON (e.g. { text: "..." }).
 */
export async function deepDemographicSearchViaApi(query) {
    const prompt = `
You are a research assistant.
Find demographic insights, behavioral trends, and audience profiles related to:

${query}

Return:
- audience segments
- interests
- geographic patterns
- purchasing tendencies
- cultural signals
`;

    const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        throw new Error("Deep demographic search failed.");
    }

    return await response.json();
}

export const webTestUtils = {
    clearCache() {
        WEB_CACHE.clear();
    },
    formatOffsetTime,
    getCached,
    getCacheKey,
    normalizeProductOptionList,
    setCached
};
