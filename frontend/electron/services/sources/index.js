const animeflv = require('./animeflv');
const animeav1 = require('./animeav1');
const animeonlineninja = require('./animeonlineninja');

const sources = {
    [animeflv.id]: animeflv,
    [animeav1.id]: animeav1,
    [animeonlineninja.id]: animeonlineninja
};

module.exports = {
    getSource: (id) => sources[id || 'animeflv'] || sources['animeflv'],
    getAllSources: () => Object.values(sources)
};
