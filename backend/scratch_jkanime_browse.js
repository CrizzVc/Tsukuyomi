const jkanime = require('./sources/jkanime');

async function test() {
    console.log('--- Browse page 1 ---');
    const results = await jkanime.browse(1);
    console.log('Total:', results.length);
    console.log('First 3:', results.slice(0, 3));
    
    console.log('\n--- Browse page 2 ---');
    const results2 = await jkanime.browse(2);
    console.log('Total:', results2.length);
    console.log('First 1:', results2.slice(0, 1));
}
test().catch(console.error);
