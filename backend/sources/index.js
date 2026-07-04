const animeflv = require('./animeflv');
const animeav1 = require('./animeav1');
const animeonlineninja = require('./animeonlineninja');
const jkanime = require('./jkanime');

const sources = {
    [animeflv.id]: animeflv,
    [animeav1.id]: animeav1,
    [animeonlineninja.id]: animeonlineninja,
    [jkanime.id]: jkanime
};

module.exports = {
    getSource: (id) => sources[id || 'animeflv'] || sources['animeflv'],
    getAllSources: () => Object.values(sources)
};
