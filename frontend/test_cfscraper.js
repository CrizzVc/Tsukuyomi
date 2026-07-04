const { fetchWithCF } = require('./electron/services/cfScraper');
const { app } = require('electron');

app.whenReady().then(async () => {
    try {
        console.log("Fetching Anime Ninja...");
        const html = await fetchWithCF('https://ww3.animeonline.ninja/inicio/', { timeout: 30000 });
        console.log("Success! HTML length:", html.length);
        if (html.includes('article class="episodes"')) {
            console.log("Verified: Contains episodes list.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    app.quit();
});
