const axios = require('axios');

async function test() {
    try {
        const url = encodeURIComponent('https://ww3.animeonline.ninja/inicio/');
        const response = await axios.get(`https://api.allorigins.win/get?url=${url}`);
        const html = response.data.contents;
        
        console.log("Success! HTML length:", html.length);
        if (html.includes('article class="episodes"')) {
            console.log("Verified: Contains episodes list.");
        } else {
            console.log("No episodes list found. Might be blocked.");
        }
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
test();
