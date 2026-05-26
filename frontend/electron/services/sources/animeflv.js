const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www4.animeflv.net';

const animeflv = {
    name: 'AnimeFLV',
    id: 'animeflv',

    getLatest: async () => {
        const response = await axios.get(BASE_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.ListEpisodios li a').each((index, element) => {
            const urlPath = $(element).attr('href');
            const title = $(element).find('.Title').text().trim();
            const episode = $(element).find('.Capi').text().trim();
            let image = $(element).find('img').attr('src');
            if (image && image.startsWith('/')) image = BASE_URL + image;

            // Derive anime cover from episode URL: /ver/{slug}-{epNum}
            let cover = image;
            let animeUrl = BASE_URL + urlPath;
            if (urlPath && urlPath.includes('/ver/')) {
                const verSlug = urlPath.replace('/ver/', '');
                // Remove the last -number to get anime slug
                const slugMatch = verSlug.match(/^(.+)-\d+$/);
                if (slugMatch) {
                    const animeSlug = slugMatch[1];
                    cover = `${BASE_URL}/uploads/animes/covers/${animeSlug}.jpg`;
                    animeUrl = `${BASE_URL}/anime/${animeSlug}`;
                }
            }

            results.push({ title, episode, image, cover, animeUrl, url: BASE_URL + urlPath });
        });
        return results;
    },

    getDetails: async (url) => {
        let animeUrl = url;
        if (url.includes('/ver/')) {
            const epResponse = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ep = cheerio.load(epResponse.data);
            const animePath = $ep('.CapNvLs').attr('href');
            if (animePath) animeUrl = BASE_URL + animePath;
        }

        const response = await axios.get(animeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        const title = $('h1.Title').text().trim();
        const synopsis = $('.Description p').text().trim();
        let cover = $('.AnimeCover .Image figure img').attr('src');
        if (cover && cover.startsWith('/')) cover = BASE_URL + cover;

        const status = $('.AnmStts span').text().trim();
        const genres = [];
        $('.Genres a').each((i, el) => {
            genres.push($(el).text().trim());
        });

        const related = [];
        $('.ListAnmRel li').each((i, el) => {
            const link = $(el).find('a');
            const title = link.text().trim();
            const url = link.attr('href');
            const type = $(el).text().replace(title, '').trim() || 'Relacionado';
            if (url) {
                related.push({ 
                    title, 
                    url: url.startsWith('http') ? url : BASE_URL + url, 
                    image: '', // AnimeFLV doesn't show images for related in this list
                    type 
                });
            }
        });

        let episodes = [];
        $('script').each((i, el) => {
            const text = $(el).html();
            if (text && text.includes('var episodes = [')) {
                const match = text.match(/var episodes = (\[.*?\]);/);
                const animeInfoMatch = text.match(/var anime_info = (\[.*?\]);/);
                if (match && animeInfoMatch) {
                    try {
                        const epData = JSON.parse(match[1]);
                        const animeInfo = JSON.parse(animeInfoMatch[1]);
                        const animeId = animeInfo[0];
                        const animeSlug = animeInfo[2];
                        episodes = epData.map(e => ({
                            episode: e[0],
                            url: `${BASE_URL}/ver/${animeSlug}-${e[0]}`,
                            image: animeId ? `https://cdn.animeflv.net/screenshots/${animeId}/${e[0]}/th_3.jpg` : ''
                        }));
                    } catch (e) { }
                }
            }
        });

        return { title, synopsis, cover, status, genres, related, episodes };
    },

    getServers: async (url) => {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        let servers = [];
        $('script').each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent && scriptContent.includes('var videos = {')) {
                const match = scriptContent.match(/var videos = (\{.*?\});/);
                if (match && match[1]) {
                    try {
                        const serversJson = JSON.parse(match[1]);
                        if (serversJson.SUB) servers = serversJson.SUB;
                    } catch (e) { }
                }
            }
        });
        return servers;
    },

    search: async (query) => {
        const response = await axios.get(`${BASE_URL}/browse?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.ListAnimes li article').each((i, el) => {
            const title = $(el).find('h3.Title').text().trim();
            const urlPath = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('src');
            if (image && image.startsWith('/')) image = BASE_URL + image;
            results.push({ title, url: BASE_URL + urlPath, image });
        });
        return results;
    },

    browse: async (page = 1) => {
        const response = await axios.get(`${BASE_URL}/browse?page=${page}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.ListAnimes li article').each((i, el) => {
            const title = $(el).find('h3.Title').text().trim();
            const urlPath = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('src');
            if (image && image.startsWith('/')) image = BASE_URL + image;
            results.push({ title, url: BASE_URL + urlPath, image });
        });
        return results;
    }
};

module.exports = animeflv;
