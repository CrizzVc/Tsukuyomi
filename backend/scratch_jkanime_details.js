const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const response = await axios.get('https://jkanime.net/saijo-no-osewa-takane-no-hanadarake-na-meimonkou-de-gakuin-ichi-no-ojousama-seikatsu-nouryoku-kaimu-wo-kagenagara-osewa-suru-koto-ni-narimashita/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        fs.writeFileSync('jkanime_details.html', response.data);
        console.log('Saved to jkanime_details.html');
    } catch (e) {
        console.error(e.message);
    }
}
test();
