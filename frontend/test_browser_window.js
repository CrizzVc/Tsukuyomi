const { app, BrowserWindow } = require('electron');

async function fetchHtmlWithElectron(url) {
  return new Promise((resolve, reject) => {
    let win = new BrowserWindow({
      show: true, // Show to see if it solves automatically
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:animeonlineninja'
      }
    });

    win.webContents.on('did-finish-load', async () => {
      try {
        const title = await win.webContents.executeJavaScript('document.title');
        console.log("Title loaded:", title);
        
        if (title.toLowerCase().includes('momento') || title.toLowerCase().includes('attention') || title.toLowerCase().includes('cloudflare') || title.toLowerCase().includes('just a moment')) {
          console.log("Waiting for Cloudflare challenge to pass...");
          // We don't resolve yet, we wait for next did-finish-load
        } else {
          const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
          resolve(html);
          setTimeout(() => win.close(), 1000);
        }
      } catch (e) {
        reject(e);
        win.close();
      }
    });

    win.loadURL(url, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    });

    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        reject(new Error("Timeout waiting for Cloudflare"));
        win.close();
      }
    }, 30000);
  });
}

app.whenReady().then(async () => {
  try {
    console.log("Fetching...");
    const html = await fetchHtmlWithElectron('https://ww3.animeonline.ninja/inicio/');
    console.log("Success! HTML length:", html.length);
    if (html.includes('article class="episodes"')) {
      console.log("Verified: Contains episodes list.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
  app.quit();
});
