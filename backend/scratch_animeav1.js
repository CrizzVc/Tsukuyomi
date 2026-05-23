const animeav1 = require('./sources/animeav1');

async function testAnimeAV1() {
    try {
        console.log("1. Testing getLatest (Home)...");
        const latest = await animeav1.getLatest();
        console.log("Latest episodes count:", latest.length);
        if (latest.length > 0) {
            console.log("Sample latest episode:", latest[0]);
        }

        console.log("\n2. Testing Search (Naruto)...");
        const results = await animeav1.search('naruto');
        console.log("Search results count:", results.length);
        if (results.length > 0) {
            console.log("Sample search result:", results[0]);
            
            const firstUrl = results[0].url;
            console.log(`\n3. Testing getDetails for URL: ${firstUrl}...`);
            const details = await animeav1.getDetails(firstUrl);
            console.log("Details found:");
            console.log("- Title:", details.title);
            console.log("- Synopsis length:", details.synopsis ? details.synopsis.length : 0);
            console.log("- Genres:", details.genres);
            console.log("- Status:", details.status);
            console.log("- Cover URL:", details.cover);
            console.log("- Backdrop URL:", details.backdrop);
            console.log("- Related count:", details.related.length);
            console.log("- Episodes count:", details.episodes.length);

            if (details.episodes.length > 0) {
                const sampleEp = details.episodes[details.episodes.length - 1]; // First episode chronologically
                console.log(`\n4. Testing getServers for Episode ${sampleEp.episode} (${sampleEp.url})...`);
                const servers = await animeav1.getServers(sampleEp.url);
                console.log("Servers count:", servers.length);
                if (servers.length > 0) {
                    console.log("Sample server:", servers[0]);
                }
            }
        }

        console.log("\n5. Testing Browse (Catalogo Page 1)...");
        const browseResults = await animeav1.browse(1);
        console.log("Browse results count:", browseResults.length);
        if (browseResults.length > 0) {
            console.log("Sample browse result:", browseResults[0]);
        }

        console.log("\nSuccess: All provider functions executed successfully!");

    } catch (e) {
        console.error("Test failed with error:", e.message);
    }
}

testAnimeAV1();
