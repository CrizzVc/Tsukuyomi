const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('jkanime_naruto.html', 'utf8');
const $ = cheerio.load(html);

const eps = [];
$('a').each((i, el) => {
    const text = $(el).text();
    const href = $(el).attr('href');
    if ((text.includes('Episodio') || text.includes('Capitulo') || (href && href.includes('/naruto-shippuden/'))) && !href.includes('facebook') && !href.includes('google')) {
        eps.push({ text: text.trim().substring(0, 30), href });
    }
});
console.log('Found eps:', eps.slice(0, 10));
console.log('Total eps found:', eps.length);

const animeInfoMatch = html.match(/var anime_info = \[.*?\];/);
if (animeInfoMatch) console.log('anime_info:', animeInfoMatch[0]);

// Find any divs with classes like ep, episodes, etc.
console.log($('.anime__video__episodes a').length);
console.log($('a.numbers').length);
