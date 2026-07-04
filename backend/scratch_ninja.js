const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
        const response = await axios.get('https://ww3.animeonline.ninja/inicio/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        console.log("Title: ", $('title').text());
        // Let's print out some common class names used for listing items
        let elements = [];
        $('article').each((i, el) => {
            if (i < 5) elements.push($(el).html().substring(0, 300));
        });
        console.log("Articles HTML snippet:", elements);
        
        let listItems = [];
        $('li').each((i, el) => {
            if ($(el).find('a').length > 0 && $(el).find('img').length > 0) {
                if (listItems.length < 5) listItems.push($(el).html().substring(0, 300));
            }
        });
        console.log("LI HTML snippet:", listItems);
    } catch (e) {
        console.error(e.message);
    }
}
test();
