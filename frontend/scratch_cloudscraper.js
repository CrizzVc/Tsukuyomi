const cloudscraper = require('cloudscraper');

async function test() {
    try {
        const response = await cloudscraper.get('https://ww3.animeonline.ninja/inicio/');
        console.log("Success, got HTML length:", response.length);
        if (response.includes('article class="episodes"')) {
            console.log("Verified: Contains episodes list.");
        } else {
            console.log("Does not contain episodes. Might still be blocked.");
            console.log(response.substring(0, 500));
        }
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
test();
