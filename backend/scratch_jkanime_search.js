const fs = require('fs');

const html = fs.readFileSync('jkanime_naruto_ep1.html', 'utf8');

const regex = /video\[\d+\]\s*=\s*'[^']*src="([^"]+)"/g;
let match;
const servers = [];
while ((match = regex.exec(html)) !== null) {
    servers.push(match[1]);
}

// We should also get server names. Server names are in <a href="#optionX" class="...">ServerName</a>
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const names = [];
$('.bg-servers a, .server-item').each((i, el) => {
    // Actually the log showed "Server link: Desu #option0" so it's `a[href^="#option"]`
});
$('a[href^="#option"]').each((i, el) => {
    names.push($(el).text().trim());
});

console.log('Servers mapped:');
for (let i = 0; i < Math.min(servers.length, names.length); i++) {
    console.log(`${names[i]}: ${servers[i]}`);
}
