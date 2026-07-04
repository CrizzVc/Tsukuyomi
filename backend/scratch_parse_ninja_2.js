const fs = require('fs');
const cheerio = require('cheerio');

const content = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2694df9e-83d9-4c9d-a450-bf960da6bc7e/.system_generated/steps/27/content.md', 'utf8');
const htmlContent = content.split('---')[1] || content;

const $ = cheerio.load(htmlContent);

const firstEpisodeHTML = $('article.episodes').first().html();
console.log("First Episode HTML:", firstEpisodeHTML);
