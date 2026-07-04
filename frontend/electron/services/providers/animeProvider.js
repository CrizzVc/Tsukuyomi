const streamwish = require('./streamwish');
const filemoon = require('./filemoon');
const yourupload = require('./yourupload');
const maru = require('./maru');
const mp4upload = require('./mp4upload');

const providers = [
    streamwish,
    filemoon,
    yourupload,
    maru,
    mp4upload
];

const animeProvider = {
    extract: async (url) => {
        for (const provider of providers) {
            if (provider.canHandle(url)) {
                console.log(`[AnimeProvider] Usando extractor: ${provider.name} para ${url}`);
                try {
                    const result = await provider.extract(url);
                    return {
                        ...result,
                        provider: provider.name,
                        originalUrl: url
                    };
                } catch (e) {
                    console.warn(`[AnimeProvider] Fallo la extraccion con ${provider.name}:`, e.message);
                    throw e;
                }
            }
        }
        
        console.log(`[AnimeProvider] Ningun extractor soportado para: ${url}`);
        throw new Error("Proveedor no soportado");
    },
    canExtract: (url) => {
        return providers.some(p => p.canHandle(url));
    }
};

module.exports = {
    animeProvider
};
