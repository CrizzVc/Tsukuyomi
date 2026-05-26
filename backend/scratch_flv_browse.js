const animeflv = require('./sources/animeflv');
animeflv.browse(1)
  .then(r => {
    console.log('FLV browse count:', r.length);
    if (r.length > 0) {
      console.log('Sample:', r[0]);
    }
  })
  .catch(console.error);
