/**
 * cfScraper.js – Uses a hidden Electron BrowserWindow to bypass Cloudflare
 * challenges by loading pages in a real Chromium engine.
 * 
 * Cookies are persisted in a dedicated session partition so that after the
 * first successful challenge solve, subsequent requests are usually instant.
 */
const { app, BrowserWindow, session } = require('electron');

const CF_TITLES = ['just a moment', 'un momento', 'attention required', 'cloudflare'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Fetch the fully-rendered HTML of a URL using a hidden BrowserWindow.
 * If Cloudflare is detected, the window is shown so the user can solve the
 * interactive challenge manually. Cookies are persisted for reuse.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} [opts] - Options.
 * @param {number} [opts.timeout=30000] - Max wait time in ms.
 * @param {string} [opts.waitForSelector] - CSS selector to wait for before resolving.
 * @returns {Promise<string>} Fully-rendered HTML of the page.
 */
function fetchWithCF(url, opts = {}) {
    const { timeout = 30000, waitForSelector } = opts;

    return new Promise(async (resolve, reject) => {
        // Ensure Electron is ready before creating windows
        if (!app.isReady()) await app.whenReady();

        let resolved = false;
        let pollTimer = null;
        let timeoutTimer = null;

        const win = new BrowserWindow({
            show: false,
            width: 1024,
            height: 768,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'persist:animeonlineninja' // persists cookies across app restarts
            }
        });

        const cleanup = () => {
            if (pollTimer) clearInterval(pollTimer);
            if (timeoutTimer) clearTimeout(timeoutTimer);
            if (win && !win.isDestroyed()) {
                win.close();
            }
        };

        const done = (html) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(html);
        };

        const fail = (err) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(err);
        };

        // Timeout – after this we give up
        timeoutTimer = setTimeout(() => {
            fail(new Error(`cfScraper timeout after ${timeout}ms for ${url}`));
        }, timeout);

        // Once the page starts loading, poll until CF is gone and content is ready
        win.webContents.on('did-finish-load', () => {
            if (resolved) return;

            // Start polling
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(async () => {
                if (resolved) return;
                try {
                    const title = await win.webContents.executeJavaScript('document.title');
                    const isCF = CF_TITLES.some(t => title.toLowerCase().includes(t));

                    if (isCF) {
                        // Show window so user can solve the challenge
                        if (!win.isVisible()) {
                            console.log('[cfScraper] Cloudflare challenge detected, showing window for user.');
                            win.show();
                            win.focus();
                        }
                        return; // keep polling
                    }

                    // CF is gone – if we need a specific selector, wait for it
                    if (waitForSelector) {
                        const found = await win.webContents.executeJavaScript(
                            `!!document.querySelector('${waitForSelector.replace(/'/g, "\\'")}')`
                        );
                        if (!found) return; // keep polling
                    }

                    // Extract the full rendered HTML
                    const html = await win.webContents.executeJavaScript(
                        'document.documentElement.outerHTML'
                    );
                    done(html);
                } catch (e) {
                    // Page might be navigating, ignore and retry
                }
            }, 1000);
        });

        // Handle navigation errors
        win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
            if (errorCode === -3) return; // ERR_ABORTED is normal during redirects
            fail(new Error(`did-fail-load: ${errorCode} ${errorDescription}`));
        });

        win.loadURL(url, { userAgent: USER_AGENT });
    });
}

module.exports = { fetchWithCF };
