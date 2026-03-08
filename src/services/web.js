/**
 * Web Services for Blip
 * Weather (wttr.in) and Currency (ExchangeRate-API)
 */

export const web = {
    /**
     * Get weather for a specific location
     * uses wttr.in format=j1 (JSON)
     */
    async getWeather(location) {
        console.log(`🌦 Fetching weather for: ${location}`);
        try {
            const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
            if (!res.ok) throw new Error('Weather service unavailable');
            const data = await res.json();

            const current = data.current_condition[0];
            const city = data.nearest_area[0].areaName[0].value;
            const desc = current.weatherDesc[0].value;
            const temp = current.temp_C;
            const humidity = current.humidity;

            return {
                text: `In ${city}, it's currently ${temp}°C and ${desc}. The humidity is ${humidity}%.`,
                data: { temp, desc, city, humidity }
            };
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
        try {
            console.log(`🗺️ OSM lookup: "${query}" in "${location}"`);

            // Step 1: Geocode the location → lat/lon via Nominatim
            const nominatimRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'BlipAI/1.0' } }
            );
            const nominatimData = await nominatimRes.json();
            if (!nominatimData.length) throw new Error('Location not found via Nominatim');

            const { lat, lon } = nominatimData[0];
            console.log(`📍 Geocoded "${location}" → ${lat}, ${lon}`);

            // Step 2: Extract a cuisine/type keyword from the query
            const cuisineKeywords = ['sushi', 'pizza', 'burger', 'ramen', 'thai', 'chinese', 'indian',
                'mexican', 'italian', 'korean', 'vegan', 'vegetarian', 'seafood', 'steak', 'tapas'];
            const lowerQuery = query.toLowerCase();
            const detectedCuisine = cuisineKeywords.find(k => lowerQuery.includes(k));

            // Step 3: Query Overpass API for restaurants near location
            let amenityFilter = '"amenity"="restaurant"';
            let cuisineFilter = detectedCuisine ? `["cuisine"~"${detectedCuisine}",i]` : '';
            const nameFilter = !detectedCuisine ? `["name"~"${query.split(' ')[0]}",i]` : '';

            const overpassQuery =
                `[out:json][timeout:20];` +
                `(node[${amenityFilter}]${cuisineFilter}${nameFilter}(around:3000,${lat},${lon});` +
                ` way[${amenityFilter}]${cuisineFilter}${nameFilter}(around:3000,${lat},${lon}););` +
                `out body 6;`;

            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: overpassQuery
            });
            if (!overpassRes.ok) throw new Error('Overpass API failed');
            const overpassData = await overpassRes.json();

            const elements = overpassData.elements;
            console.log(`✅ Overpass returned ${elements.length} places`);

            if (!elements.length) {
                // Widen search: all restaurants, filter by name keyword
                const wideQuery =
                    `[out:json][timeout:20];` +
                    `node["amenity"="restaurant"](around:2000,${lat},${lon});` +
                    `out body 5;`;
                const wideRes = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: wideQuery });
                const wideData = await wideRes.json();
                if (!wideData.elements.length) {
                    // Wikipedia Fallback with Disambiguation Check
                    console.log(`📖 Wikipedia fallback for: ${query}`);
                    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`);
                    if (wikiRes.ok) {
                        const wikiData = await wikiRes.json();
                        let summary = wikiData.extract || "";

                        // DISAMBIGUATION: If the query is an adjective but the result is about the city of Nice, discard or flag.
                        if (query.toLowerCase().trim() === 'nice' || (query.toLowerCase().includes('nice') && summary.includes('Nice is the seventh-most populous city in France'))) {
                            return `I found results for "Nice" (the city), but I suspect you meant "nice" as in pleasant. Could you be more specific about what you are looking for?`;
                        }

                        return summary;
                    }
                    // Final fallback: Wikipedia
                    return this._wikiPlaceInfo(query, location);
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

                const q = encodeURIComponent(`${name} ${location}`);
                return `<a href="https://www.google.com/maps/search/${q}" target="_blank" class="action-link blue" style="display:block;margin-top:6px;text-align:left;line-height:1.4;">
                    <b>📍 ${name}</b>${cuisine}${street}${housenumber}${hours}${phone}
                </a>`;
            }).join('');

            const intro = detectedCuisine
                ? `I found ${elements.length} ${detectedCuisine} options in ${location}. I've marked the best ones on the map for you!`
                : `I found ${elements.length} places matching that description in ${location}. I've marked them on the map.`;

            return { text: intro, html: htmlPlaces };

        } catch (e) {
            console.error('OSM lookup error, falling back to Wikipedia:', e);
            const wikiText = await this._wikiPlaceInfo(query, location);
            return { text: wikiText, html: '' };
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
    async getProducts(query, recommendations = []) {
        console.log(`🛒 Building retailer links for: ${query}`, recommendations);

        const items = (recommendations && recommendations.length > 0)
            ? recommendations.slice(0, 3)
            : [query];

        const retailers = [
            { name: 'Amazon', base: 'https://www.amazon.es/s?k=' },
            { name: 'Media Markt', base: 'https://www.mediamarkt.es/es/search.html?query=' },
            { name: 'PC Componentes', base: 'https://www.pccomponentes.com/buscar/?query=' },
            { name: 'Carrefour', base: 'https://www.carrefour.es/?q=' }
        ];

        // If the query mentions a specific retailer, prioritize it
        const lowerQuery = query.toLowerCase();
        const preferredRetailer = retailers.find(r => lowerQuery.includes(r.name.toLowerCase()));

        const products = [];
        items.forEach(itemName => {
            if (preferredRetailer) {
                products.push({
                    name: `${itemName} @ ${preferredRetailer.name}`,
                    url: `${preferredRetailer.base}${encodeURIComponent(itemName)}`,
                    color: 'blue'
                });
            } else {
                // Default to top 2 results for variety
                retailers.slice(0, 2).forEach(r => {
                    products.push({
                        name: `${itemName} (${r.name})`,
                        url: `${r.base}${encodeURIComponent(itemName)}`,
                        color: r.name === 'Amazon' ? 'orange' : 'blue'
                    });
                });
            }
        });

        const spokenNames = items.join(', ');
        const storeSuffix = preferredRetailer ? ` at ${preferredRetailer.name}` : "";
        const spokenText = `I've found some options for ${spokenNames}${storeSuffix}. I've added links to check their price and availability below.`;

        const html = products.map(p =>
            `<a href="${p.url}" target="_blank" class="action-link ${p.color}" style="display:block;margin-top:6px;text-align:left;">🛒 ${p.name}</a>`
        ).join('');

        return { text: spokenText, html };
    },

    /**
     * General Web Search (Uses Wikipedia for data extraction + Google/DDG links)
     */
    async search(query) {
        console.log(`🔍 Web search: ${query}`);
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

        let extractedData = "I've provided some links below for you to explore.";
        try {
            // Try to grab some real facts from Wikipedia so Blip has "context memory" of the search
            const searchTerms = encodeURIComponent(query);
            const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchTerms}&utf8=&format=json&origin=*`);
            if (wikiRes.ok) {
                const wikiData = await wikiRes.json();
                if (wikiData.query.search.length > 0) {
                    // Clean HTML tags from snippet
                    extractedData = "Here is what I found: " + wikiData.query.search[0].snippet.replace(/<\/?[^>]+(>|$)/g, "") + ". " +
                        (wikiData.query.search[1] ? wikiData.query.search[1].snippet.replace(/<\/?[^>]+(>|$)/g, "") : "");
                }
            }
        } catch (e) { /* ignore */ }

        return {
            text: extractedData,
            html: `
                <a href="${googleUrl}" target="_blank" class="action-link blue">🔍 SEARCH ON GOOGLE</a>
                <a href="${ddgUrl}" target="_blank" class="action-link green">🦆 SEARCH ON DUCKDUCKGO</a>
            `
        };
    },

    /**
     * Search YouTube and return an embed URL
     * @param {string} query - e.g. "how to cut tomatoes"
     */
    async searchYouTube(query) {
        console.log(`🎬 YouTube search: ${query}`);
        // Since we don't have a YouTube Data API key, we'll construct a direct search URL 
        // and a plausible "Lucky" embed URL approach or just direct link.
        // For a better "Projector" feel, we'll provide a direct link to the search results.
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        return {
            text: `I've found some videos on ${query} for you to watch.`,
            url: searchUrl,
            html: `<a href="${searchUrl}" target="_blank" class="action-link red">🎬 WATCH ON YOUTUBE: ${query}</a>`
        };
    }
};
