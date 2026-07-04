const fs = require('fs');
const cheerio = require('cheerio');

const content = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2694df9e-83d9-4c9d-a450-bf960da6bc7e/.system_generated/steps/27/content.md', 'utf8');
const htmlContent = content.split('---')[1] || content;

const $ = cheerio.load(htmlContent);

// Let's find episodes. In Dooplay they are often in `.episodes` or have an `id="post-xxx"`
const items = [];
$('article.item').each((i, el) => {
    if (i < 5) {
        items.push({
            title: $(el).find('h3.title').text() || $(el).find('h3').text(),
            url: $(el).find('a').attr('href'),
            image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
            type: $(el).find('.item_type').text() || $(el).find('.epiposter').text() || $(el).find('.type').text(),
            year: $(el).find('.data span').text()
        });
    }
});

console.log("Articles:", JSON.stringify(items, null, 2));

const epi = [];
$('article.episodes').each((i, el) => {
    if (i < 5) {
        epi.push({
            title: $(el).find('h3').text(),
            url: $(el).find('a').attr('href'),
            image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
        });
    }
});

console.log("Episodes:", JSON.stringify(epi, null, 2));
