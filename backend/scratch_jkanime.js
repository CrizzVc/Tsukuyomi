const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('jkanime.html', 'utf8');
const $ = cheerio.load(html);

const firstCard = $('.card.ml-2.mr-2').first();
console.log('First card HTML:', firstCard.html());

const latest = [];
$('.card.ml-2.mr-2').each((i, el) => {
    const a = $(el).find('a').first();
    const href = a.attr('href');
    const image = a.find('img').attr('src');
    const h5 = a.find('h5').text().trim();
    const episodeText = a.find('h6').text().trim();
    
    if (href) {
        latest.push({ href, image, title: h5, episodeText });
    }
});
console.log('Latest:', latest.slice(0, 3));
