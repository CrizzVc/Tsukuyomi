const FANART_API_KEY = '6e3398f78dee2049af59890ee0d5e004';
const cleanTitle = 'Dragon Ball Super';
(async () => {
    try {
        let logoUrl = null;
        let searchIds = [];
        const kitsuRes = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&include=mappings`);
        const kitsuData = await kitsuRes.json();
        const mappings = kitsuData?.included?.filter(inc => inc.type === 'mappings' && inc.attributes?.externalSite?.includes('tvdb'));
        if (mappings) {
            mappings.forEach(m => {
                const tvdbId = m.attributes.externalId.split('/')[0];
                if (tvdbId && !searchIds.includes(tvdbId)) searchIds.push(tvdbId);
            });
        }
        for (const id of searchIds) {
            const fanartRes = await fetch(`https://webservice.fanart.tv/v3/tv/${id}?api_key=${FANART_API_KEY}`);
            if (fanartRes.ok) {
                const fanartData = await fanartRes.json();
                logoUrl = fanartData?.hdtvlogo?.[0]?.url || fanartData?.clearlogo?.[0]?.url;
                if (logoUrl) break;
            }
        }
        console.log('Result for ' + cleanTitle + ':', logoUrl);
    } catch(e) { console.error(e) }
})();
