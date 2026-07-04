// Anti-detection script injected into every page before any other script runs.
// It patches navigator.webdriver, removes Electron-specific properties, and
// fakes missing browser APIs that Cloudflare Turnstile checks for.

// Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', { get: () => false });

// Remove Electron-specific globals
delete window.process;
delete window.require;
delete window.__electron_log;

// Fake plugins (real Chrome has at least a couple)
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ]
});

// Fake languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['es-ES', 'es', 'en-US', 'en']
});

// Chrome runtime stub (Turnstile checks for window.chrome)
if (!window.chrome) {
    window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
    };
}

// Permissions API patch
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
    window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
    };
}
