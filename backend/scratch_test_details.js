const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www4.animeflv.net/anime/shingeki-no-kyojin';
  const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(response.data);
  $('script').each((i, el) => {
    const text = $(el).html();
    if (text && text.includes('var anime_info =')) {
      console.log(text);
    }
  });
}
test().catch(console.error);
