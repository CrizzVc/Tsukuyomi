const animeonlineninja = require('./sources/animeonlineninja');

async function test() {
    try {
        console.log("Testing getLatest...");
        const latest = await animeonlineninja.getLatest();
        console.log(`Got ${latest.length} latest episodes.`);
        if (latest.length > 0) console.log("First:", latest[0]);

        console.log("\nTesting search for 'Naruto'...");
        const search = await animeonlineninja.search('Naruto');
        console.log(`Got ${search.length} search results.`);
        if (search.length > 0) console.log("First:", search[0]);

        console.log("\nTesting getDetails...");
        const detailsUrl = search.length > 0 ? search[0].url : 'https://ww3.animeonline.ninja/online/darling-in-the-franxx-121024/';
        const details = await animeonlineninja.getDetails(detailsUrl);
        console.log("Details Title:", details.title);
        console.log(`Got ${details.episodes.length} episodes.`);
        
        if (details.episodes.length > 0) {
            console.log("\nTesting getServers for first episode...");
            const servers = await animeonlineninja.getServers(details.episodes[0].url);
            console.log(`Got ${servers.length} servers.`);
            console.log("Servers:", servers);
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
