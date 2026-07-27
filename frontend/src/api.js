const { ipcRenderer } = window.require('electron');

export const fetchLatest = async (source = 'animeav1') => {
    try {
        const data = await ipcRenderer.invoke('api-latest', { sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Latest error:", e);
        return [];
    }
};

export const fetchDetails = async (url, source = 'animeav1') => {
    try {
        const data = await ipcRenderer.invoke('api-details', { url, sourceId: source });
        return data || null;
    } catch (e) {
        console.error("IPC Details error:", e);
        return null;
    }
};

export const fetchServers = async (url, source = 'animeav1') => {
    try {
        const servers = await ipcRenderer.invoke('api-servers', { url, sourceId: source });
        return servers || [];
    } catch (e) {
        console.error("IPC Servers error:", e);
        return [];
    }
};

export const searchAnime = async (query, source = 'animeav1') => {
    try {
        const data = await ipcRenderer.invoke('api-search', { query, sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Search error:", e);
        return [];
    }
};

export const fetchCatalog = async (page = 1, source = 'animeav1') => {
    try {
        const data = await ipcRenderer.invoke('api-browse', { page, sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Catalog error:", e);
        return [];
    }
};

export const fetchRecentlyAdded = async (source = 'animeav1') => {
    try {
        const data = await ipcRenderer.invoke('api-recently-added', { sourceId: source });
        return data || [];
    } catch (e) {
        console.error('IPC Recently Added error:', e);
        return [];
    }
};

export const extractStream = async (url) => {
    try {
        const data = await ipcRenderer.invoke('api-extract', { url });
        return { success: true, ...data };
    } catch (e) {
        console.error("IPC Extraction error:", e);
        return { success: false, error: e.message };
    }
};

export const fetchNews = async (apiKey) => {
    try {
        const data = await ipcRenderer.invoke('api-news', { apiKey });
        return data;
    } catch (e) {
        console.error("IPC News error:", e);
        return { error: e.message };
    }
};

const FANART_API_KEY = '6e3398f78dee2049af59890ee0d5e004';
const logoCache = new Map();

export const fetchFanartLogo = async (animeTitle) => {
    if (!animeTitle) return null;
    const cleanTitle = animeTitle.replace(/\([^)]*\)/g, '').replace(/hd/gi, '').trim();
    
    if (logoCache.has(cleanTitle)) {
        const cached = logoCache.get(cleanTitle);
        if (cached) return cached;
    }

    try {
        let logoUrl = null;
        let searchIds = [];

        // Try Kitsu API to get direct title_logo if available or TVDB ID
        try {
            const kitsuRes = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&include=mappings`);
            if (kitsuRes.ok) {
                const kitsuData = await kitsuRes.json();
                
                // Get tvdb mappings
                const mappings = kitsuData?.included?.filter(inc => inc.type === 'mappings' && inc.attributes?.externalSite?.includes('tvdb'));
                if (mappings && mappings.length > 0) {
                    mappings.forEach(m => {
                        const tvdbId = m.attributes.externalId.split('/')[0];
                        if (tvdbId && !searchIds.includes(tvdbId)) searchIds.push(tvdbId);
                    });
                }
            }
        } catch (e) {}

        for (const id of searchIds) {
            try {
                const fanartData = await ipcRenderer.invoke('api-fanart', { tvdbId: id, apiKey: FANART_API_KEY });
                if (fanartData) {
                    logoUrl = fanartData?.hdtvlogo?.[0]?.url || 
                              fanartData?.clearlogo?.[0]?.url || 
                              fanartData?.hdmaingameart?.[0]?.url || null;
                    if (logoUrl) break;
                }
            } catch (err) {}
        }

        console.log(`[API] Logo resolved for "${cleanTitle}":`, logoUrl);
        if (logoUrl) {
            logoCache.set(cleanTitle, logoUrl);
        }
        return logoUrl;
    } catch (e) {
        console.error("Error fetching logo from Fanart:", e);
        return null;
    }
};
