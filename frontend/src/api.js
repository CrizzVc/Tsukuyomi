const { ipcRenderer } = window.require('electron');

export const fetchLatest = async (source = 'animeflv') => {
    try {
        const data = await ipcRenderer.invoke('api-latest', { sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Latest error:", e);
        return [];
    }
};

export const fetchDetails = async (url, source = 'animeflv') => {
    try {
        const data = await ipcRenderer.invoke('api-details', { url, sourceId: source });
        return data || null;
    } catch (e) {
        console.error("IPC Details error:", e);
        return null;
    }
};

export const fetchServers = async (url, source = 'animeflv') => {
    try {
        const servers = await ipcRenderer.invoke('api-servers', { url, sourceId: source });
        return servers || [];
    } catch (e) {
        console.error("IPC Servers error:", e);
        return [];
    }
};

export const searchAnime = async (query, source = 'animeflv') => {
    try {
        const data = await ipcRenderer.invoke('api-search', { query, sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Search error:", e);
        return [];
    }
};

export const fetchCatalog = async (page = 1, source = 'animeflv') => {
    try {
        const data = await ipcRenderer.invoke('api-browse', { page, sourceId: source });
        return data || [];
    } catch (e) {
        console.error("IPC Catalog error:", e);
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
