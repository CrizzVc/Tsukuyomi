const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://ww3.animeonline.ninja';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': BASE_URL
};

const animeonlineninja = {
    name: 'AnimeOnline Ninja',
    id: 'animeonlineninja',

    getLatest: async () => {
        const response = await axios.get(`${BASE_URL}/inicio/`, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const results = [];

        $('article.episodes').each((i, el) => {
            const url = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const title = $(el).find('.data h3').text().trim();
            let episodeText = $(el).find('.epiposter h4').text().trim();
            
            // Clean up episodeText (e.g. "Episodio 26")
            episodeText = episodeText.replace('Episodio', '').trim();

            if (url) {
                results.push({
                    title: title,
                    episode: episodeText ? `Episodio ${episodeText}` : '',
                    image: image,
                    url: url,
                    animeUrl: url // Needs resolving to actual anime URL if needed
                });
            }
        });
        return results;
    },

    getDetails: async (url) => {
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);

        const title = $('.sheader .data h1').text().trim() || $('h1').first().text().trim();
        const synopsis = $('.wp-content p').text().trim();
        let cover = $('.sheader .poster img').attr('data-src') || $('.sheader .poster img').attr('src');
        const status = $('.status .text').text().trim() || $('span:contains("Estado")').next().text().trim();

        const genres = [];
        $('.sgeneros a').each((i, el) => {
            genres.push($(el).text().trim());
        });

        const related = [];

        const episodes = [];
        $('#seasons .se-c .episodios li').each((i, el) => {
            let epNum = $(el).find('.numerando').text().trim(); 
            // Often format is "1 - 24" (season - episode)
            if (epNum.includes('-')) {
                epNum = epNum.split('-')[1].trim();
            }
            
            const epUrl = $(el).find('.episodiotitle a').attr('href');
            let image = $(el).find('.imagen img').attr('data-src') || $(el).find('.imagen img').attr('src');
            
            if (epUrl) {
                episodes.push({
                    episode: epNum,
                    url: epUrl,
                    image: image
                });
            }
        });

        return { title, synopsis, cover, status, genres, related, episodes };
    },

    getServers: async (url) => {
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const servers = [];

        $('#playeroptions ul li').each((i, el) => {
            const serverName = $(el).find('.title').text().trim();
            const dataType = $(el).attr('data-type');
            const dataPost = $(el).attr('data-post');
            const dataNume = $(el).attr('data-nume');
            
            if (dataPost && dataNume) {
                servers.push({
                    title: serverName,
                    resolve: {
                        type: dataType,
                        post: dataPost,
                        nume: dataNume
                    }
                });
            }
        });

        for (const s of servers) {
            if (s.resolve) {
                try {
                    const formData = new URLSearchParams();
                    formData.append('action', 'doo_player_ajax'); // standard dooplay ajax action
                    formData.append('post', s.resolve.post);
                    formData.append('nume', s.resolve.nume);
                    formData.append('type', s.resolve.type);
                    
                    const pRes = await axios.post(`${BASE_URL}/wp-admin/admin-ajax.php`, formData.toString(), {
                        headers: {
                            ...HEADERS,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                    
                    // The response might be JSON like {embed_url: '...'} or just HTML
                    if (pRes.data && pRes.data.embed_url) {
                        const embedHtml = pRes.data.embed_url;
                        const iframeSrcMatch = embedHtml.match(/src="([^"]+)"/);
                        if (iframeSrcMatch) {
                            s.code = iframeSrcMatch[1];
                        } else {
                            s.code = embedHtml;
                        }
                    }
                } catch (e) {
                    console.log(`[AnimeOnlineNinja] Failed to resolve server ${s.title}: ${e.message}`);
                }
            }
        }

        return servers.filter(s => s.code).map(s => ({ title: s.title, code: s.code }));
    },

    search: async (query) => {
        const response = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(query)}`, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const results = [];

        $('article.item').each((i, el) => {
            const url = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const title = $(el).find('.data h3').text().trim() || $(el).find('.data h4').text().trim();
            
            if (url) {
                results.push({
                    title: title,
                    image: image,
                    url: url
                });
            }
        });
        return results;
    },

    browse: async (page = 1) => {
        const response = await axios.get(`${BASE_URL}/online/page/${page}/`, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const results = [];

        $('article.item').each((i, el) => {
            const url = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const title = $(el).find('.data h3').text().trim() || $(el).find('.data h4').text().trim();
            
            if (url) {
                results.push({
                    title: title,
                    image: image,
                    url: url
                });
            }
        });
        return results;
    }
};

module.exports = animeonlineninja;
