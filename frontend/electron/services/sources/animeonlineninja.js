const cheerio = require('cheerio');
const { fetchWithCF } = require('../cfScraper');

const BASE_URL = 'https://ww3.animeonline.ninja';

const animeonlineninja = {
    name: 'AnimeOnline Ninja',
    id: 'animeonlineninja',

    getLatest: async () => {
        const html = await fetchWithCF(`${BASE_URL}/inicio/`, {
            waitForSelector: 'article.episodes'
        });
        const $ = cheerio.load(html);
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
                    title,
                    episode: episodeText ? `Episodio ${episodeText}` : '',
                    image,
                    url,
                    animeUrl: url
                });
            }
        });
        return results;
    },

    getDetails: async (url) => {
        const html = await fetchWithCF(url, {
            waitForSelector: '#seasons, .sheader'
        });
        const $ = cheerio.load(html);

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
                    image
                });
            }
        });

        return { title, synopsis, cover, status, genres, related, episodes };
    },

    getServers: async (url) => {
        const html = await fetchWithCF(url, {
            waitForSelector: '#playeroptions'
        });
        const $ = cheerio.load(html);
        const servers = [];

        $('#playeroptions ul li').each((i, el) => {
            const serverName = $(el).find('.title').text().trim();
            const dataType = $(el).attr('data-type');
            const dataPost = $(el).attr('data-post');
            const dataNume = $(el).attr('data-nume');

            if (dataPost && dataNume) {
                servers.push({
                    title: serverName,
                    resolve: { type: dataType, post: dataPost, nume: dataNume }
                });
            }
        });

        // Resolve each server's embed URL via the Dooplay AJAX endpoint
        for (const s of servers) {
            if (s.resolve) {
                try {
                    const formData = new URLSearchParams();
                    formData.append('action', 'doo_player_ajax');
                    formData.append('post', s.resolve.post);
                    formData.append('nume', s.resolve.nume);
                    formData.append('type', s.resolve.type);

                    // Use cfScraper's persisted session cookies via a fetch-in-BrowserWindow approach
                    const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
                    const script = `
                        (async () => {
                            const resp = await fetch('${ajaxUrl}', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: '${formData.toString()}'
                            });
                            return await resp.json();
                        })()
                    `;
                    // We can't easily run fetch inside the BrowserWindow from here,
                    // so we use a simpler approach: try a direct fetch with the session cookies.
                    const { session: electronSession } = require('electron');
                    const sess = electronSession.fromPartition('persist:animeonlineninja');
                    const cookies = await sess.cookies.get({ domain: '.animeonline.ninja' });
                    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

                    const axios = require('axios');
                    const pRes = await axios.post(ajaxUrl, formData.toString(), {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Referer': url,
                            'Cookie': cookieStr
                        }
                    });

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
        const html = await fetchWithCF(`${BASE_URL}/?s=${encodeURIComponent(query)}`, {
            waitForSelector: 'article.item'
        });
        const $ = cheerio.load(html);
        const results = [];

        $('article.item').each((i, el) => {
            const url = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const title = $(el).find('.data h3').text().trim() || $(el).find('.data h4').text().trim();

            if (url) {
                results.push({ title, image, url });
            }
        });
        return results;
    },

    browse: async (page = 1) => {
        const html = await fetchWithCF(`${BASE_URL}/online/page/${page}/`, {
            waitForSelector: 'article.item'
        });
        const $ = cheerio.load(html);
        const results = [];

        $('article.item').each((i, el) => {
            const url = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const title = $(el).find('.data h3').text().trim() || $(el).find('.data h4').text().trim();

            if (url) {
                results.push({ title, image, url });
            }
        });
        return results;
    }
};

module.exports = animeonlineninja;
