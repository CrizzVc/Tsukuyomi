const jkanime = require('./sources/jkanime');

async function test() {
    // Test a current-season anime
    console.log('--- Testing episode count detection ---');
    const urls = [
        'https://jkanime.net/one-piece/',
        'https://jkanime.net/mairimashita-iruma-kun-4th-season/',
        'https://jkanime.net/black-torch/',
    ];
    
    for (const url of urls) {
        const details = await jkanime.getDetails(url);
        console.log(`\nURL: ${url}`);
        console.log(`  Title: ${details.title}`);
        console.log(`  Episodes: ${details.episodes.length}`);
        if (details.episodes.length > 0) {
            console.log(`  Sample ep:`, details.episodes[0]);
        }
    }
}
test().catch(console.error);
