const fs = require('fs');
const cheerio = require('cheerio');

const content = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2694df9e-83d9-4c9d-a450-bf960da6bc7e/.system_generated/steps/66/content.md', 'utf8');
const htmlContent = content.split('---')[1] || content;

const $ = cheerio.load(htmlContent);

const title = $('h1').text().trim();
const synopsis = $('.wp-content p').text().trim();
const cover = $('.sheader .poster img').attr('src');
const status = $('.status .text').text().trim() || $('span:contains("Estado")').next().text().trim();

const genres = [];
$('.sgeneros a').each((i, el) => {
    genres.push($(el).text().trim());
});

const episodes = [];
$('#seasons .se-c .episodios li').each((i, el) => {
    const epNum = $(el).find('.numerando').text().trim(); // e.g. 1 - 24
    const url = $(el).find('.episodiotitle a').attr('href');
    const image = $(el).find('.imagen img').attr('src');
    
    if (url) {
        episodes.push({
            episode: epNum,
            url: url,
            image: image
        });
    }
});

console.log(JSON.stringify({ title, synopsis, cover, status, genres, episodes: episodes.slice(0, 3) }, null, 2));
