const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const response = await axios.get('https://jkanime.net/naruto-shippuden/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        fs.writeFileSync('jkanime_naruto.html', response.data);
        console.log('Saved to jkanime_naruto.html');
    } catch (e) {
        console.error(e.message);
    }
}
test();
