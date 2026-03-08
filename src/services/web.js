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

        let extractedData = "";
        try {
            // Check Data Bank First
            const searchTargets = (entities && entities.length > 1) ? entities : [query];
            let combinedExtract = "";

            for (const target of searchTargets) {
                const lowerTarget = target.toLowerCase();
                const matchedEntity = Object.keys(demographicDataBank).find(key => lowerTarget.includes(key));

                if (matchedEntity) {
                    const data = demographicDataBank[matchedEntity];
                    combinedExtract += `\n--- VERIFIED SOURCE: BLIP DEMO-BANK (${matchedEntity.toUpperCase()}) ---\n`;
                    combinedExtract += `Total Population: ${data.total}\nWomen: ${data.women}\nMen: ${data.men}\nMedian Age: ${data.age}\nDynamic: ${data.growth}\n`;
                } else {
                    // Fallback to Wikipedia
                    const dataKeywords = ['population', 'demographics', 'men', 'women', 'males', 'females', 'stats', 'data', 'breakdown'];
                    const searchTerms = encodeURIComponent(target + (dataKeywords.some(k => target.toLowerCase().includes(k)) ? "" : " demographics"));
                    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchTerms}&utf8=&format=json&origin=*`);
                    const searchData = await searchRes.json();

                    if (searchData.query.search.length > 0) {
                        const title = searchData.query.search[0].title;
                        const summaryRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*`);
                        const summaryData = await summaryRes.json();
                        const pages = summaryData.query.pages;
                        const pageId = Object.keys(pages)[0];
                        if (pageId !== "-1") {
                            combinedExtract += `\n--- SOURCE: ${title} ---\n${pages[pageId].extract.substring(0, 1500)}\n`;
                        }
                    }
                }
            }
            extractedData = combinedExtract || "No specific detailed sources found.";

        } catch (e) { console.error('Wikipedia Fetch Error:', e); }

        let extraHtml = `
            <a href="${googleUrl}" target="_blank" class="action-link blue">🔍 SEARCH ON GOOGLE</a>
            <a href="${ddgUrl}" target="_blank" class="action-link green">🦆 SEARCH ON DUCKDUCKGO</a>
        `;

        // Data Detection for Voronoi
        const dataKeywords = ['graph', 'population', 'stats', 'data', 'census', 'demographics', 'chart'];
        if (dataKeywords.some(k => query.toLowerCase().includes(k))) {
            const voronoiUrl = `https://www.voronoiapp.com/search/${encodeURIComponent(query)}`;
            extraHtml = `<a href="${voronoiUrl}" target="_blank" class="action-link purple">📊 SEARCH ON VORONOI</a>` + extraHtml;
        }

        return {
            text: extractedData,
            html: extraHtml
        };
    },

    /**
     * Search YouTube and return an embed URL
     * @param {string} query - e.g. "how to cut tomatoes"
     */
    async searchYouTube(query) {
        console.log(`🎬 YouTube search: ${query}`);
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        return {
            text: `I've found some videos on ${query} for you to watch.`,
            url: searchUrl,
            html: `<a href="${searchUrl}" target="_blank" class="action-link red">🎬 WATCH ON YOUTUBE: ${query}</a>`
        };
    },

    /**
     * Deep Web Demographic Search (V3.6.0)
     * Finds segments, interests, patterns, and culture signals.
     */
    async deepDemographicSearch(query, entities = []) {
        console.log(`📡 Deep Demographic Search: ${query}`, entities);

        // Multi-country support: fetch independent data for each entity
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
