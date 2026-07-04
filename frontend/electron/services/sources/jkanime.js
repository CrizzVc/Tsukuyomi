const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://jkanime.net';

const jkanime = {
    name: 'JKAnime',
    id: 'jkanime',

    getLatest: async () => {
        const response = await axios.get(BASE_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.card.ml-2.mr-2').each((i, el) => {
            const a = $(el).find('a').first();
            const urlPath = a.attr('href');
            let image = a.find('img').attr('data-animepic') || a.find('img').attr('src');
            const title = a.find('h5').text().trim();
            const episodeText = a.find('.badge-primary').text().trim();
            const episode = episodeText.replace('Ep ', '');
            
            let cover = image;
            let animeUrl = urlPath;
            if (urlPath) {
                // urlPath is like https://jkanime.net/slug/episode/
                const match = urlPath.match(/(https:\/\/jkanime\.net\/[^\/]+\/)\d+\/$/);
                if (match) {
                    animeUrl = match[1];
                }
            }

            results.push({ title, episode, image, cover, animeUrl, url: urlPath });
        });
        return results;
    },

    getDetails: async (url) => {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        
        const title = $('title').first().text().replace(' - anime ', '').replace(' online JkAnime', '').split(' - ')[0].trim();
        const synopsis = $('p[rel="sinopsis"]').text().trim() || $('p').filter((i, el) => $(el).text().length > 50).first().text().trim();
        const cover = $('img[src*="/image/"]').first().attr('src') || $('img').filter((i, el) => $(el).attr('src') && $(el).attr('src').includes('image')).attr('src') || $('.anime__details__pic').attr('data-setbg') || $('.d-thumb img').attr('src');
        
        const status = $('.anime-status').text().trim() || $('.enemision.finished').text().trim() || 'En emisión';
        const genres = [];
        $('a[href*="/genero/"]').each((i, el) => {
            genres.push($(el).text().trim());
        });
        // Deduplicate genres
        const uniqueGenres = [...new Set(genres)];

        const related = [];
        // JKAnime usually links related anime in <h5> related blocks
        $('#aditional').each((i, el) => {
            let nextEl = $(el).next();
            const type = $(el).text().trim();
            while (nextEl.length && nextEl[0].tagName.toLowerCase() === 'a') {
                related.push({
                    title: nextEl.text().trim(),
                    url: nextEl.attr('href'),
                    image: '',
                    type
                });
                nextEl = nextEl.next().next(); // skip <br>
            }
        });

        // Determine number of episodes
        let totalEpisodes = 0;
        const epsTextMatch = $('.anime_data li:contains("Episodios:")').text().match(/\d+/);
        if (epsTextMatch) {
            totalEpisodes = parseInt(epsTextMatch[0]);
        }
        
        if (totalEpisodes === 0) {
            const uepHref = $('#uep').attr('href');
            if (uepHref) {
                const epMatch = uepHref.match(/\/(\d+)\/$/);
                if (epMatch) {
                    totalEpisodes = parseInt(epMatch[1]);
                }
            }
        }

        const episodes = [];
        if (totalEpisodes > 0) {
            // Anime urls usually end with /
            const baseAnimeUrl = url.endsWith('/') ? url : url + '/';
            for (let i = totalEpisodes; i >= 1; i--) {
                episodes.push({
                    episode: i,
                    url: baseAnimeUrl + i + '/',
                    image: cover // JkAnime doesn't usually provide separate episode thumbnails
                });
            }
        }

        return { title, synopsis, cover, status, genres: uniqueGenres, related, episodes };
    },

    getServers: async (url) => {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = response.data;
        const $ = cheerio.load(html);
        
        const servers = [];
        const regex = /video\[\d+\]\s*=\s*'[^']*src="([^"]+)"/g;
        let match;
        const serverUrls = [];
        while ((match = regex.exec(html)) !== null) {
            serverUrls.push(match[1]);
        }

        const serverNames = [];
        $('a[href^="#option"]').each((i, el) => {
            serverNames.push($(el).text().trim());
        });

        for (let i = 0; i < Math.min(serverUrls.length, serverNames.length); i++) {
            servers.push({
                server: serverNames[i],
                title: serverNames[i],
                url: serverUrls[i]
            });
        }

        return servers;
    },

    search: async (query) => {
        const response = await axios.get(`${BASE_URL}/buscar/${encodeURIComponent(query)}/`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        // JKAnime search results use .anime__item
        $('.anime__item').each((i, el) => {
            const a = $(el).find('a').first();
            const href = a.attr('href');
            const image = $(el).find('.anime__item__pic').attr('data-setbg') || $(el).find('img').attr('src');
            const title = $(el).find('h5 a').text().trim() || $(el).find('.anime__item__text h5').text().trim();
            if (href) results.push({ title, url: href, image });
        });
        // Fallback: try embedded JSON (same structure as directory)
        if (results.length === 0) {
            const scriptMatch = response.data.match(/var animes = (\{.*?\});/s);
            if (scriptMatch) {
                try {
                    const parsed = JSON.parse(scriptMatch[1]);
                    if (parsed.data) {
                        parsed.data.forEach(a => {
                            results.push({ title: a.title, url: a.url, image: a.image });
                        });
                    }
                } catch (e) { }
            }
        }
        return results;
    },

    browse: async (page = 1) => {
        // JKAnime directory paginates via ?p=PAGE, all under /directorio/1
        const url = page <= 1
            ? `${BASE_URL}/directorio/1/`
            : `${BASE_URL}/directorio/1?p=${page}`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        // The page embeds anime data as JSON: var animes = {...};
        const scriptMatch = response.data.match(/var animes = (\{.*?\});/s);
        if (scriptMatch) {
            try {
                const parsed = JSON.parse(scriptMatch[1]);
                if (parsed.data) {
                    return parsed.data.map(a => ({
                        title: a.title,
                        url: a.url,
                        image: a.image
                    }));
                }
            } catch (e) { }
        }
        return [];
    }
};

module.exports = jkanime;
