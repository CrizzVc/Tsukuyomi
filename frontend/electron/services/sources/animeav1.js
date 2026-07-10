const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeav1.com';

const animeav1 = {
    name: 'AnimeAV1',
    id: 'animeav1',

    getLatest: async () => {
        const response = await axios.get(BASE_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        
        // Find the grid with episodes
        const grid = $('.grid.grid-cols-2').first();
        
        grid.children().each((i, el) => {
            const link = $(el).find('a[href*="/media/"]').first();
            // Title is in header div
            const title = $(el).find('header div').text().trim() || $(el).find('div.font-bold').text().trim();
            // Episode is in div with bg-line or similar
            const episode = $(el).find('.text-lead').text().trim() || $(el).find('div.text-xs').text().trim();
            const image = $(el).find('img').attr('src');

            // Derive anime URL from episode link: /media/{slug}/{epNum}
            let cover = image;
            let animeUrl = link.length > 0 ? BASE_URL + link.attr('href') : '';
            const href = link.attr('href') || '';
            const parts = href.split('/').filter(p => p);
            if (parts.length === 3) { // /media/{slug}/{epNum}
                animeUrl = `${BASE_URL}/media/${parts[1]}`;
                // AnimeAV1 uses /storage/... for covers; try to find the poster img specifically
                const posterImg = $(el).find('img[src*="poster"], img[src*="cover"], img[src*="Poster"]').attr('src');
                if (posterImg) cover = posterImg;
            }
            
            if (link.length > 0) {
                results.push({
                    title: title || link.text().replace('Ver ', '').trim(),
                    episode: episode ? `Episodio ${episode}` : '',
                    image,
                    cover,
                    animeUrl,
                    url: BASE_URL + link.attr('href')
                });
            }
        });
        return results;
    },

    getDetails: async (url) => {
        // Handle if URL is an episode URL (contains two parts after /media/)
        const parts = url.split('/').filter(p => p);
        let animeUrl = url;
        if (parts.length > 4) { // e.g. https, animeav1.com, media, slug, episode
            animeUrl = BASE_URL + '/media/' + parts[parts.length - 2];
        }

        const response = await axios.get(animeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        
        const title = $('h1').first().text().trim();
        const synopsis = $('.text-subs.leading-relaxed').text().trim() || $('p').first().text().trim();
        const cover = $('img[alt*="Poster"]').attr('src') || $('img[alt*="Poster"]').attr('data-src') || $('img').eq(2).attr('src');
        const backdrop = $('img[alt*="Backdrop"]').attr('src') || $('img[alt*="Backdrop"]').attr('data-src');

        const status = $('header .flex.flex-wrap.items-center.gap-2.text-sm span:last-child').text().trim();
        const genres = [];
        $('a[href*="/catalogo?genre="]').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                genres.push(text);
            }
        });

        const related = [];
        $('.gradient-cut').find('.group\\/item').each((i, el) => {
            const title = $(el).find('h3').first().text().trim();
            const url = $(el).find('a').attr('href');
            const image = $(el).find('img').attr('src');
            // Try to find relation text like (Precuela)
            const relation = $(el).find('span, div').filter((i, e) => $(e).text().includes('(')).first().text().trim();
            
            if (url) {
                related.push({ 
                    title: title || $(el).text().split('(')[0].trim(), 
                    url: BASE_URL + url, 
                    image,
                    type: relation || 'Relacionado'
                });
            }
        });

        const episodes = [];
        $('a[href*="/media/"]').each((i, el) => {
            const href = $(el).attr('href');
            const parts = href.split('/').filter(p => p);
            if (parts.length === 3) { // It's an episode link e.g. /media/slug/1
                const epNum = parts[2];
                // Check if already added
                if (!episodes.some(e => e.episode === epNum)) {
                    episodes.push({
                        episode: epNum,
                        url: BASE_URL + href
                    });
                }
            }
        });

        // Sort episodes descending
        episodes.sort((a, b) => parseInt(b.episode) - parseInt(a.episode));

        return { title, synopsis, cover, backdrop, status, genres, related, episodes };
    },

    getServers: async (url) => {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = response.data;
        const servers = [];
        
        // Extraction logic based on subagent findings: {server:"...",url:"..."}
        const serverRegex = /{server:"([^"]+)",url:"([^"]+)"}/g;
        let match;
        const counts = {};
        while ((match = serverRegex.exec(html)) !== null) {
            let title = match[1];
            counts[title] = (counts[title] || 0) + 1;
            
            servers.push({
                title: counts[title] > 1 ? `${title} ${counts[title]}` : title,
                code: match[2].replace(/\\/g, '') // Unescape URL
            });
        }
        
        return servers;
    },

    search: async (query) => {
        const response = await axios.get(`${BASE_URL}/catalogo?search=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        
        const grid = $('.grid.grid-cols-2').last();
        
        grid.children().each((i, el) => {
            const link = $(el).find('a[href*="/media/"]').first();
            const title = $(el).find('h3').first().text().trim() || $(el).find('header div, div.font-bold').first().text().trim();
            const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            
            if (link.length > 0) {
                results.push({
                    title: title || link.text().replace('Ver ', '').trim(),
                    image,
                    url: BASE_URL + link.attr('href')
                });
            }
        });
        return results;
    },

    browse: async (page = 1) => {
        const response = await axios.get(`${BASE_URL}/catalogo?page=${page}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        
        const grid = $('.grid.grid-cols-2').last();
        
        grid.children().each((i, el) => {
            const link = $(el).find('a[href*="/media/"]').first();
            const title = $(el).find('h3').first().text().trim() || $(el).find('header div, div.font-bold').first().text().trim();
            const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            
            if (link.length > 0) {
                results.push({
                    title: title || link.text().replace('Ver ', '').trim(),
                    image,
                    url: BASE_URL + link.attr('href')
                });
            }
        });
        return results;
    },

    getRecentlyAdded: async () => {
        const response = await axios.get(BASE_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const results = [];

        // The homepage has two sections: "Episodios - Recientemente Actualizado" (first)
        // and "Animes - Recientemente Agregados" (second). We target the second one.
        // We find it by looking for the section whose h2 text is "Animes"
        let recentlyAddedSection = null;
        $('section').each((i, el) => {
            const h2 = $(el).find('h2').first().text().trim();
            if (h2 === 'Animes') {
                recentlyAddedSection = $(el);
                return false; // break
            }
        });

        if (!recentlyAddedSection) return results;

        recentlyAddedSection.find('article').each((i, el) => {
            const link = $(el).find('a[href*="/media/"]').first();
            const href = link.attr('href') || '';
            // Only include direct anime links (no episode number: /media/{slug})
            const parts = href.split('/').filter(p => p);
            if (parts.length !== 2) return; // skip episode links

            const title = $(el).find('h3').first().text().trim();
            const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            const badge = $(el).find('.bg-line').first().text().trim(); // e.g. "TV Anime"

            if (link.length > 0 && title) {
                results.push({
                    title,
                    image,
                    url: BASE_URL + href,
                    badge: badge || ''
                });
            }
        });

        return results;
    }
};

module.exports = animeav1;
