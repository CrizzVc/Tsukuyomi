const { app, net } = require('electron');

app.whenReady().then(async () => {
  try {
    const response = await net.fetch('https://ww3.animeonline.ninja/inicio/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Content start:", text.substring(0, 300));
    if (text.includes('article class="episodes"')) {
      console.log("SUCCESS!");
    } else {
      console.log("FAILED to bypass CF.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
  app.quit();
});
