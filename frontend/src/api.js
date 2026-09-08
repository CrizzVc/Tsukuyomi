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

const TMDB_API_KEY = '647aef6fffac587fb62b2057cf9347aa';
const tmdbBackdropCache = new Map();

// Busca backdrop en TMDB para un título concreto (TV primero, luego película).
// Devuelve el backdrop_path o null.
const _tmdbSearchBackdropPath = async (query) => {
    try {
        const tvRes = await fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es-MX`
        );
        if (tvRes.ok) {
            const tvData = await tvRes.json();
            const path = tvData.results?.[0]?.backdrop_path || null;
            if (path) return path;
        }

        const movieRes = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es-MX`
        );
        if (movieRes.ok) {
            const movieData = await movieRes.json();
            return movieData.results?.[0]?.backdrop_path || null;
        }
    } catch (_) {}
    return null;
};

// Genera variantes del título para ampliar las chances de match en TMDB.
// Orden: título limpio → sin "Season N" → solo la parte base (sin número ordinal)
const _tmdbTitleVariants = (raw) => {
    const base = raw
        .replace(/\([^)]*\)/g, '')   // quita paréntesis completos
        .replace(/\bhd\b/gi, '')      // quita "HD" suelto
        .replace(/\s+/g, ' ')
        .trim();

    const variants = [base];

    // Quita patrones de temporada: "Season 2", "2nd Season", "3ra Temporada", etc.
    const withoutSeason = base
        .replace(/\b\d{1,2}(st|nd|rd|th)?\s+season\b/gi, '')
        .replace(/\bseason\s+\d{1,2}\b/gi, '')
        .replace(/\b\d{1,2}(ra|da|ta|ma|a)?\s+temporada\b/gi, '')
        .replace(/\btemporada\s+\d{1,2}\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (withoutSeason && withoutSeason !== base) {
        variants.push(withoutSeason);
    }

    // Quita cualquier número final suelto o Part/Cour: "Part 2", "Cour 2", ": Zero", etc.
    const withoutPart = withoutSeason
        .replace(/[\s:]+(?:part|cour|vol|volume|arc)\s*\d+/gi, '')
        .replace(/\s+\d+$/, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (withoutPart && withoutPart !== withoutSeason && withoutPart.length > 2) {
        variants.push(withoutPart);
    }

    // Deduplica manteniendo orden
    return [...new Set(variants)];
};

export const fetchTmdbBackdrop = async (animeTitle) => {
    if (!animeTitle) return null;

    const cacheKey = animeTitle.trim();
    if (tmdbBackdropCache.has(cacheKey)) {
        return tmdbBackdropCache.get(cacheKey);
    }

    try {
        const variants = _tmdbTitleVariants(animeTitle);
        let backdropPath = null;

        for (const variant of variants) {
            backdropPath = await _tmdbSearchBackdropPath(variant);
            if (backdropPath) break;
        }

        const url = backdropPath
            ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
            : null;

        tmdbBackdropCache.set(cacheKey, url);
        return url;
    } catch (e) {
        console.error('[TMDB] Error fetching backdrop:', e);
        return null;
    }
};

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
