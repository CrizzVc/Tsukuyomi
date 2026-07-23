//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region electron/services/sources/animeflv.js
var require_animeflv = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$7 = require("axios");
	var cheerio$3 = require("cheerio");
	var BASE_URL = "https://www4.animeflv.net";
	module.exports = {
		name: "AnimeFLV",
		id: "animeflv",
		getLatest: async () => {
			const response = await axios$7.get(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$3.load(response.data);
			const results = [];
			$(".ListEpisodios li a").each((index, element) => {
				const urlPath = $(element).attr("href");
				const title = $(element).find(".Title").text().trim();
				const episode = $(element).find(".Capi").text().trim();
				let image = $(element).find("img").attr("src");
				if (image && image.startsWith("/")) image = BASE_URL + image;
				let cover = image;
				let animeUrl = BASE_URL + urlPath;
				if (urlPath && urlPath.includes("/ver/")) {
					const slugMatch = urlPath.replace("/ver/", "").match(/^(.+)-\d+$/);
					if (slugMatch) {
						const animeSlug = slugMatch[1];
						cover = `${BASE_URL}/uploads/animes/covers/${animeSlug}.jpg`;
						animeUrl = `${BASE_URL}/anime/${animeSlug}`;
					}
				}
				results.push({
					title,
					episode,
					image,
					cover,
					animeUrl,
					url: BASE_URL + urlPath
				});
			});
			return results;
		},
		getDetails: async (url) => {
			let animeUrl = url;
			if (url.includes("/ver/")) {
				const epResponse = await axios$7.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
				const animePath = cheerio$3.load(epResponse.data)(".CapNvLs").attr("href");
				if (animePath) animeUrl = BASE_URL + animePath;
			}
			const response = await axios$7.get(animeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$3.load(response.data);
			const title = $("h1.Title").text().trim();
			const synopsis = $(".Description p").text().trim();
			let cover = $(".AnimeCover .Image figure img").attr("src");
			if (cover && cover.startsWith("/")) cover = BASE_URL + cover;
			const status = $(".AnmStts span").text().trim();
			const genres = [];
			$(".Genres a").each((i, el) => {
				genres.push($(el).text().trim());
			});
			const related = [];
			$(".ListAnmRel li").each((i, el) => {
				const link = $(el).find("a");
				const title = link.text().trim();
				const url = link.attr("href");
				const type = $(el).text().replace(title, "").trim() || "Relacionado";
				if (url) related.push({
					title,
					url: url.startsWith("http") ? url : BASE_URL + url,
					image: "",
					type
				});
			});
			let episodes = [];
			$("script").each((i, el) => {
				const text = $(el).html();
				if (text && text.includes("var episodes = [")) {
					const match = text.match(/var episodes = (\[.*?\]);/);
					const animeInfoMatch = text.match(/var anime_info = (\[.*?\]);/);
					if (match && animeInfoMatch) try {
						const epData = JSON.parse(match[1]);
						const animeInfo = JSON.parse(animeInfoMatch[1]);
						const animeId = animeInfo[0];
						const animeSlug = animeInfo[2];
						episodes = epData.map((e) => ({
							episode: e[0],
							url: `${BASE_URL}/ver/${animeSlug}-${e[0]}`,
							image: animeId ? `https://cdn.animeflv.net/screenshots/${animeId}/${e[0]}/th_3.jpg` : ""
						}));
					} catch (e) {}
				}
			});
			return {
				title,
				synopsis,
				cover,
				status,
				genres,
				related,
				episodes
			};
		},
		getServers: async (url) => {
			const response = await axios$7.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$3.load(response.data);
			let servers = [];
			$("script").each((index, element) => {
				const scriptContent = $(element).html();
				if (scriptContent && scriptContent.includes("var videos = {")) {
					const match = scriptContent.match(/var videos = (\{.*?\});/);
					if (match && match[1]) try {
						const serversJson = JSON.parse(match[1]);
						if (serversJson.SUB) servers = serversJson.SUB;
					} catch (e) {}
				}
			});
			return servers;
		},
		search: async (query) => {
			const response = await axios$7.get(`${BASE_URL}/browse?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$3.load(response.data);
			const results = [];
			$(".ListAnimes li article").each((i, el) => {
				const title = $(el).find("h3.Title").text().trim();
				const urlPath = $(el).find("a").attr("href");
				let image = $(el).find("img").attr("src");
				if (image && image.startsWith("/")) image = BASE_URL + image;
				results.push({
					title,
					url: BASE_URL + urlPath,
					image
				});
			});
			return results;
		},
		browse: async (page = 1) => {
			const response = await axios$7.get(`${BASE_URL}/browse?page=${page}`, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$3.load(response.data);
			const results = [];
			$(".ListAnimes li article").each((i, el) => {
				const title = $(el).find("h3.Title").text().trim();
				const urlPath = $(el).find("a").attr("href");
				let image = $(el).find("img").attr("src");
				if (image && image.startsWith("/")) image = BASE_URL + image;
				results.push({
					title,
					url: BASE_URL + urlPath,
					image
				});
			});
			return results;
		}
	};
}));
//#endregion
//#region electron/services/sources/animeav1.js
var require_animeav1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$6 = require("axios");
	var cheerio$2 = require("cheerio");
	var BASE_URL = "https://animeav1.com";
	module.exports = {
		name: "AnimeAV1",
		id: "animeav1",
		getLatest: async () => {
			const response = await axios$6.get(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$2.load(response.data);
			const results = [];
			$(".grid.grid-cols-2").first().children().each((i, el) => {
				const link = $(el).find("a[href*=\"/media/\"]").first();
				const title = $(el).find("header div").text().trim() || $(el).find("div.font-bold").text().trim();
				const episode = $(el).find(".text-lead").text().trim() || $(el).find("div.text-xs").text().trim();
				const image = $(el).find("img").attr("src");
				let cover = image;
				let animeUrl = link.length > 0 ? BASE_URL + link.attr("href") : "";
				const parts = (link.attr("href") || "").split("/").filter((p) => p);
				if (parts.length === 3) {
					animeUrl = `${BASE_URL}/media/${parts[1]}`;
					const posterImg = $(el).find("img[src*=\"poster\"], img[src*=\"cover\"], img[src*=\"Poster\"]").attr("src");
					if (posterImg) cover = posterImg;
				}
				if (link.length > 0) results.push({
					title: title || link.text().replace("Ver ", "").trim(),
					episode: episode ? `Episodio ${episode}` : "",
					image,
					cover,
					animeUrl,
					url: BASE_URL + link.attr("href")
				});
			});
			return results;
		},
		getDetails: async (url) => {
			const parts = url.split("/").filter((p) => p);
			let animeUrl = url;
			if (parts.length > 4) animeUrl = BASE_URL + "/media/" + parts[parts.length - 2];
			const response = await axios$6.get(animeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$2.load(response.data);
			const title = $("h1").first().text().trim();
			const synopsis = $(".text-subs.leading-relaxed").text().trim() || $("p").first().text().trim();
			const cover = $("img[alt*=\"Poster\"]").attr("src") || $("img[alt*=\"Poster\"]").attr("data-src") || $("img").eq(2).attr("src");
			const backdrop = $("img[alt*=\"Backdrop\"]").attr("src") || $("img[alt*=\"Backdrop\"]").attr("data-src");
			const status = $("header .flex.flex-wrap.items-center.gap-2.text-sm span:last-child").text().trim();
			const genres = [];
			$("a[href*=\"/catalogo?genre=\"]").each((i, el) => {
				const text = $(el).text().trim();
				if (text) genres.push(text);
			});
			const related = [];
			$(".gradient-cut").find(".group\\/item").each((i, el) => {
				const title = $(el).find("h3").first().text().trim();
				const url = $(el).find("a").attr("href");
				const image = $(el).find("img").attr("src");
				const relation = $(el).find("span, div").filter((i, e) => $(e).text().includes("(")).first().text().trim();
				if (url) related.push({
					title: title || $(el).text().split("(")[0].trim(),
					url: BASE_URL + url,
					image,
					type: relation || "Relacionado"
				});
			});
			const episodes = [];
			$("a[href*=\"/media/\"]").each((i, el) => {
				const href = $(el).attr("href");
				const parts = href.split("/").filter((p) => p);
				if (parts.length === 3) {
					const epNum = parts[2];
					if (!episodes.some((e) => e.episode === epNum)) episodes.push({
						episode: epNum,
						url: BASE_URL + href
					});
				}
			});
			episodes.sort((a, b) => parseInt(b.episode) - parseInt(a.episode));
			return {
				title,
				synopsis,
				cover,
				backdrop,
				status,
				genres,
				related,
				episodes
			};
		},
		getServers: async (url) => {
			const html = (await axios$6.get(url, { headers: { "User-Agent": "Mozilla/5.0" } })).data;
			const servers = [];
			const serverRegex = /{server:"([^"]+)",url:"([^"]+)"}/g;
			let match;
			const counts = {};
			while ((match = serverRegex.exec(html)) !== null) {
				let title = match[1];
				counts[title] = (counts[title] || 0) + 1;
				servers.push({
					title: counts[title] > 1 ? `${title} ${counts[title]}` : title,
					code: match[2].replace(/\\/g, "")
				});
			}
			return servers;
		},
		search: async (query) => {
			const response = await axios$6.get(`${BASE_URL}/catalogo?search=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$2.load(response.data);
			const results = [];
			$(".grid.grid-cols-2").last().children().each((i, el) => {
				const link = $(el).find("a[href*=\"/media/\"]").first();
				const title = $(el).find("h3").first().text().trim() || $(el).find("header div, div.font-bold").first().text().trim();
				const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
				if (link.length > 0) results.push({
					title: title || link.text().replace("Ver ", "").trim(),
					image,
					url: BASE_URL + link.attr("href")
				});
			});
			return results;
		},
		browse: async (page = 1) => {
			const response = await axios$6.get(`${BASE_URL}/catalogo?page=${page}`, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$2.load(response.data);
			const results = [];
			$(".grid.grid-cols-2").last().children().each((i, el) => {
				const link = $(el).find("a[href*=\"/media/\"]").first();
				const title = $(el).find("h3").first().text().trim() || $(el).find("header div, div.font-bold").first().text().trim();
				const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
				if (link.length > 0) results.push({
					title: title || link.text().replace("Ver ", "").trim(),
					image,
					url: BASE_URL + link.attr("href")
				});
			});
			return results;
		},
		getRecentlyAdded: async () => {
			const response = await axios$6.get(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$2.load(response.data);
			const results = [];
			let recentlyAddedSection = null;
			$("section").each((i, el) => {
				if ($(el).find("h2").first().text().trim() === "Animes") {
					recentlyAddedSection = $(el);
					return false;
				}
			});
			if (!recentlyAddedSection) return results;
			recentlyAddedSection.find("article").each((i, el) => {
				const link = $(el).find("a[href*=\"/media/\"]").first();
				const href = link.attr("href") || "";
				if (href.split("/").filter((p) => p).length !== 2) return;
				const title = $(el).find("h3").first().text().trim();
				const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
				const badge = $(el).find(".bg-line").first().text().trim();
				if (link.length > 0 && title) results.push({
					title,
					image,
					url: BASE_URL + href,
					badge: badge || ""
				});
			});
			return results;
		}
	};
}));
//#endregion
//#region electron/services/cfScraper.js
var require_cfScraper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* cfScraper.js – Uses a hidden Electron BrowserWindow to bypass Cloudflare
	* challenges by loading pages in a real Chromium engine.
	* 
	* Cookies are persisted in a dedicated session partition so that after the
	* first successful challenge solve, subsequent requests are usually instant.
	*/
	var { app: app$1, BrowserWindow: BrowserWindow$1, session: session$1 } = require("electron");
	var path$1 = require("path");
	var fs = require("fs");
	var CF_TITLES = [
		"just a moment",
		"un momento",
		"attention required",
		"cloudflare"
	];
	function getCleanUA() {
		return session$1.defaultSession.getUserAgent().replace(/Electron\/[\d\.]+\s/, "").replace(/tsukuyomi\/[\d\.]+\s/i, "").replace(/AnimeWB\/[\d\.]+\s/i, "");
	}
	var STEALTH_JS = `
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
`;
	var stealthPreloadPath = null;
	function getStealthPreloadPath() {
		if (!stealthPreloadPath) {
			stealthPreloadPath = path$1.join(app$1.getPath("userData"), "stealth-preload.js");
			fs.writeFileSync(stealthPreloadPath, STEALTH_JS, "utf8");
		}
		return stealthPreloadPath;
	}
	/**
	* Fetch the fully-rendered HTML of a URL using a hidden BrowserWindow.
	* If Cloudflare is detected, the window is shown so the user can solve the
	* interactive challenge manually. Cookies are persisted for reuse.
	*
	* @param {string} url - The URL to fetch.
	* @param {object} [opts] - Options.
	* @param {number} [opts.timeout=45000] - Max wait time in ms.
	* @param {string} [opts.waitForSelector] - CSS selector to wait for before resolving.
	* @returns {Promise<string>} Fully-rendered HTML of the page.
	*/
	function fetchWithCF(url, opts = {}) {
		const { timeout = 45e3, waitForSelector } = opts;
		return new Promise(async (resolve, reject) => {
			if (!app$1.isReady()) await app$1.whenReady();
			let resolved = false;
			let pollTimer = null;
			let timeoutTimer = null;
			const sess = session$1.fromPartition("persist:animeonlineninja");
			sess.setUserAgent(getCleanUA());
			const preloadPath = getStealthPreloadPath();
			try {
				sess.setPreloads([preloadPath]);
			} catch (e) {
				console.error("Failed to set preload:", e);
			}
			const win = new BrowserWindow$1({
				show: false,
				width: 1280,
				height: 900,
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true,
					sandbox: false,
					session: sess
				}
			});
			win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
			const cleanup = () => {
				if (pollTimer) clearInterval(pollTimer);
				if (timeoutTimer) clearTimeout(timeoutTimer);
				if (win && !win.isDestroyed()) win.close();
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
			timeoutTimer = setTimeout(() => {
				fail(/* @__PURE__ */ new Error(`cfScraper timeout after ${timeout}ms for ${url}`));
			}, timeout);
			win.webContents.on("did-finish-load", () => {
				if (resolved) return;
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = setInterval(async () => {
					if (resolved) return;
					try {
						const title = await win.webContents.executeJavaScript("document.title");
						if (CF_TITLES.some((t) => title.toLowerCase().includes(t))) {
							if (!win.isVisible()) {
								console.log("[cfScraper] Cloudflare challenge detected, showing window for user.");
								win.show();
								win.focus();
							}
							return;
						}
						if (waitForSelector) {
							if (!await win.webContents.executeJavaScript(`!!document.querySelector('${waitForSelector.replace(/'/g, "\\'")}')`)) return;
						}
						done(await win.webContents.executeJavaScript("document.documentElement.outerHTML"));
					} catch (e) {}
				}, 1e3);
			});
			win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
				if (errorCode === -3) return;
				fail(/* @__PURE__ */ new Error(`did-fail-load: ${errorCode} ${errorDescription}`));
			});
			win.loadURL(url, { userAgent: getCleanUA() });
		});
	}
	module.exports = { fetchWithCF };
}));
//#endregion
//#region electron/services/sources/animeonlineninja.js
var require_animeonlineninja = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var cheerio$1 = require("cheerio");
	var { fetchWithCF } = require_cfScraper();
	var BASE_URL = "https://ww3.animeonline.ninja";
	module.exports = {
		name: "AnimeOnline Ninja",
		id: "animeonlineninja",
		getLatest: async () => {
			const html = await fetchWithCF(`${BASE_URL}/inicio/`, { waitForSelector: "article.episodes" });
			const $ = cheerio$1.load(html);
			const results = [];
			$("article.episodes").each((i, el) => {
				const url = $(el).find("a").attr("href");
				let image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
				const title = $(el).find(".data h3").text().trim();
				let episodeText = $(el).find(".epiposter h4").text().trim();
				episodeText = episodeText.replace("Episodio", "").trim();
				if (url) results.push({
					title,
					episode: episodeText ? `Episodio ${episodeText}` : "",
					image,
					url,
					animeUrl: url
				});
			});
			return results;
		},
		getDetails: async (url) => {
			const html = await fetchWithCF(url, { waitForSelector: "#seasons, .sheader" });
			const $ = cheerio$1.load(html);
			const title = $(".sheader .data h1").text().trim() || $("h1").first().text().trim();
			const synopsis = $(".wp-content p").text().trim();
			let cover = $(".sheader .poster img").attr("data-src") || $(".sheader .poster img").attr("src");
			const status = $(".status .text").text().trim() || $("span:contains(\"Estado\")").next().text().trim();
			const genres = [];
			$(".sgeneros a").each((i, el) => {
				genres.push($(el).text().trim());
			});
			const related = [];
			const episodes = [];
			$("#seasons .se-c .episodios li").each((i, el) => {
				let epNum = $(el).find(".numerando").text().trim();
				if (epNum.includes("-")) epNum = epNum.split("-")[1].trim();
				const epUrl = $(el).find(".episodiotitle a").attr("href");
				let image = $(el).find(".imagen img").attr("data-src") || $(el).find(".imagen img").attr("src");
				if (epUrl) episodes.push({
					episode: epNum,
					url: epUrl,
					image
				});
			});
			return {
				title,
				synopsis,
				cover,
				status,
				genres,
				related,
				episodes
			};
		},
		getServers: async (url) => {
			const html = await fetchWithCF(url, { waitForSelector: "#playeroptions" });
			const $ = cheerio$1.load(html);
			const servers = [];
			$("#playeroptions ul li").each((i, el) => {
				const serverName = $(el).find(".title").text().trim();
				const dataType = $(el).attr("data-type");
				const dataPost = $(el).attr("data-post");
				const dataNume = $(el).attr("data-nume");
				if (dataPost && dataNume) servers.push({
					title: serverName,
					resolve: {
						type: dataType,
						post: dataPost,
						nume: dataNume
					}
				});
			});
			for (const s of servers) if (s.resolve) try {
				const formData = new URLSearchParams();
				formData.append("action", "doo_player_ajax");
				formData.append("post", s.resolve.post);
				formData.append("nume", s.resolve.nume);
				formData.append("type", s.resolve.type);
				const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
				`${ajaxUrl}${formData.toString()}`;
				const { session: electronSession } = require("electron");
				const cookieStr = (await electronSession.fromPartition("persist:animeonlineninja").cookies.get({ domain: ".animeonline.ninja" })).map((c) => `${c.name}=${c.value}`).join("; ");
				const pRes = await require("axios").post(ajaxUrl, formData.toString(), { headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
					"Content-Type": "application/x-www-form-urlencoded",
					"Referer": url,
					"Cookie": cookieStr
				} });
				if (pRes.data && pRes.data.embed_url) {
					const embedHtml = pRes.data.embed_url;
					const iframeSrcMatch = embedHtml.match(/src="([^"]+)"/);
					if (iframeSrcMatch) s.code = iframeSrcMatch[1];
					else s.code = embedHtml;
				}
			} catch (e) {
				console.log(`[AnimeOnlineNinja] Failed to resolve server ${s.title}: ${e.message}`);
			}
			return servers.filter((s) => s.code).map((s) => ({
				title: s.title,
				code: s.code
			}));
		},
		search: async (query) => {
			const html = await fetchWithCF(`${BASE_URL}/?s=${encodeURIComponent(query)}`, { waitForSelector: "article.item" });
			const $ = cheerio$1.load(html);
			const results = [];
			$("article.item").each((i, el) => {
				const url = $(el).find("a").attr("href");
				let image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
				const title = $(el).find(".data h3").text().trim() || $(el).find(".data h4").text().trim();
				if (url) results.push({
					title,
					image,
					url
				});
			});
			return results;
		},
		browse: async (page = 1) => {
			const html = await fetchWithCF(`${BASE_URL}/online/page/${page}/`, { waitForSelector: "article.item" });
			const $ = cheerio$1.load(html);
			const results = [];
			$("article.item").each((i, el) => {
				const url = $(el).find("a").attr("href");
				let image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
				const title = $(el).find(".data h3").text().trim() || $(el).find(".data h4").text().trim();
				if (url) results.push({
					title,
					image,
					url
				});
			});
			return results;
		}
	};
}));
//#endregion
//#region electron/services/sources/jkanime.js
var require_jkanime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$5 = require("axios");
	var cheerio = require("cheerio");
	var BASE_URL = "https://jkanime.net";
	module.exports = {
		name: "JKAnime",
		id: "jkanime",
		getLatest: async () => {
			const response = await axios$5.get(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio.load(response.data);
			const results = [];
			$(".card.ml-2.mr-2").each((i, el) => {
				const a = $(el).find("a").first();
				const urlPath = a.attr("href");
				let image = a.find("img").attr("data-animepic") || a.find("img").attr("src");
				const title = a.find("h5").text().trim();
				const episode = a.find(".badge-primary").text().trim().replace("Ep ", "");
				let cover = image;
				let animeUrl = urlPath;
				if (urlPath) {
					const match = urlPath.match(/(https:\/\/jkanime\.net\/[^\/]+\/)\d+\/$/);
					if (match) animeUrl = match[1];
				}
				results.push({
					title,
					episode,
					image,
					cover,
					animeUrl,
					url: urlPath
				});
			});
			return results;
		},
		getDetails: async (url) => {
			const response = await axios$5.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio.load(response.data);
			const title = $(".anime_info h3").first().text().trim() || $("title").first().text().replace(/ - anime .* online JkAnime$/i, "").replace(" - JkAnime", "").trim();
			const synopsis = $(".anime_info p.scroll").first().text().trim() || $("p[rel=\"sinopsis\"]").text().trim();
			const cover = $("meta[property=\"og:image\"]").attr("content") || $("img[src*=\"/image/\"]").first().attr("src");
			const status = $(".anime_data").first().find(".enemision").first().text().trim() || "En emisión";
			const genreSet = /* @__PURE__ */ new Set();
			$("a[href*=\"/genero/\"]").each((i, el) => {
				genreSet.add($(el).text().trim());
			});
			const uniqueGenres = Array.from(genreSet);
			const related = [];
			$("#aditional").each((i, el) => {
				let nextEl = $(el).next();
				const type = $(el).text().trim();
				while (nextEl.length && nextEl[0].tagName.toLowerCase() === "a") {
					related.push({
						title: nextEl.text().trim(),
						url: nextEl.attr("href"),
						image: "",
						type
					});
					nextEl = nextEl.next().next();
				}
			});
			let totalEpisodes = 0;
			const epsLi = $(".anime_data").first().find("li").filter((i, el) => $(el).text().includes("Episodios:"));
			if (epsLi.length) {
				const epsMatch = epsLi.first().text().match(/\d+/);
				if (epsMatch) totalEpisodes = parseInt(epsMatch[0]);
			}
			if (totalEpisodes === 0) {
				const uepHref = $("#uep").attr("href");
				if (uepHref) {
					const epMatch = uepHref.match(/\/(\d+)\/$/);
					if (epMatch) totalEpisodes = parseInt(epMatch[1]);
				}
			}
			const episodes = [];
			if (totalEpisodes > 0) {
				const baseAnimeUrl = url.endsWith("/") ? url : url + "/";
				for (let i = totalEpisodes; i >= 1; i--) episodes.push({
					episode: i,
					url: baseAnimeUrl + i + "/",
					image: cover
				});
			}
			return {
				title,
				synopsis,
				cover,
				status,
				genres: uniqueGenres,
				related,
				episodes
			};
		},
		getServers: async (url) => {
			const html = (await axios$5.get(url, { headers: { "User-Agent": "Mozilla/5.0" } })).data;
			const $ = cheerio.load(html);
			const servers = [];
			const regex = /video\[\d+\]\s*=\s*'[^']*src="([^"]+)"/g;
			let match;
			const serverUrls = [];
			while ((match = regex.exec(html)) !== null) serverUrls.push(match[1]);
			const serverNames = [];
			$("a[href^=\"#option\"]").each((i, el) => {
				serverNames.push($(el).text().trim());
			});
			for (let i = 0; i < Math.min(serverUrls.length, serverNames.length); i++) servers.push({
				server: serverNames[i],
				title: serverNames[i],
				url: serverUrls[i],
				code: serverUrls[i]
			});
			return servers;
		},
		search: async (query) => {
			const response = await axios$5.get(`${BASE_URL}/buscar/${encodeURIComponent(query)}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio.load(response.data);
			const results = [];
			$(".anime__item").each((i, el) => {
				const href = $(el).find("a").first().attr("href");
				const image = $(el).find(".anime__item__pic").attr("data-setbg") || $(el).find("img").attr("src");
				const title = $(el).find("h5 a").text().trim() || $(el).find(".anime__item__text h5").text().trim();
				if (href) results.push({
					title,
					url: href,
					image
				});
			});
			if (results.length === 0) {
				const scriptMatch = response.data.match(/var animes = (\{.*?\});/s);
				if (scriptMatch) try {
					const parsed = JSON.parse(scriptMatch[1]);
					if (parsed.data) parsed.data.forEach((a) => {
						results.push({
							title: a.title,
							url: a.url,
							image: a.image
						});
					});
				} catch (e) {}
			}
			return results;
		},
		browse: async (page = 1) => {
			const url = page <= 1 ? `${BASE_URL}/directorio/1/` : `${BASE_URL}/directorio/1?p=${page}`;
			const scriptMatch = (await axios$5.get(url, { headers: { "User-Agent": "Mozilla/5.0" } })).data.match(/var animes = (\{.*?\});/s);
			if (scriptMatch) try {
				const parsed = JSON.parse(scriptMatch[1]);
				if (parsed.data) return parsed.data.map((a) => ({
					title: a.title,
					url: a.url,
					image: a.image
				}));
			} catch (e) {}
			return [];
		}
	};
}));
//#endregion
//#region electron/services/sources/index.js
var require_sources = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var animeflv = require_animeflv();
	var animeav1 = require_animeav1();
	var animeonlineninja = require_animeonlineninja();
	var jkanime = require_jkanime();
	var sources = {
		[animeflv.id]: animeflv,
		[animeav1.id]: animeav1,
		[animeonlineninja.id]: animeonlineninja,
		[jkanime.id]: jkanime
	};
	module.exports = {
		getSource: (id) => sources[id || "animeflv"] || sources["animeflv"],
		getAllSources: () => Object.values(sources)
	};
}));
//#endregion
//#region electron/services/extractors/extractM3U8.js
var require_extractM3U8 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var extractM3U8FromText = (text) => {
		const match = text.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
		return match ? match[1] : null;
	};
	var extractMP4FromText = (text) => {
		const match = text.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i);
		return match ? match[1] : null;
	};
	module.exports = {
		extractM3U8FromText,
		extractMP4FromText
	};
}));
//#endregion
//#region electron/services/extractors/parseJWPlayer.js
var require_parseJWPlayer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parseJWPlayer = (html) => {
		const result = {
			sources: [],
			tracks: []
		};
		try {
			const sourcesMatch = html.match(/sources:\s*(\[[^\]]+\])/);
			if (sourcesMatch) {
				const sourcesStr = sourcesMatch[1];
				const fileRegex = /file\s*:\s*["']([^"']+)["']/g;
				let match;
				while ((match = fileRegex.exec(sourcesStr)) !== null) result.sources.push({ file: match[1] });
			}
			const tracksMatch = html.match(/tracks:\s*(\[[^\]]+\])/);
			if (tracksMatch) tracksMatch[1].split("}").filter((b) => b.includes("file")).forEach((block) => {
				const fileM = block.match(/file\s*:\s*["']([^"']+)["']/);
				const labelM = block.match(/label\s*:\s*["']([^"']+)["']/);
				const kindM = block.match(/kind\s*:\s*["']([^"']+)["']/);
				if (fileM && (!kindM || kindM[1] === "captions" || kindM[1] === "subtitles")) result.tracks.push({
					file: fileM[1],
					label: labelM ? labelM[1] : "Subtítulos"
				});
			});
		} catch (error) {
			console.error("Error parsing JWPlayer config:", error);
		}
		return result;
	};
	module.exports = { parseJWPlayer };
}));
//#endregion
//#region electron/services/providers/streamwish.js
var require_streamwish = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$4 = require("axios");
	var { extractM3U8FromText } = require_extractM3U8();
	var { parseJWPlayer } = require_parseJWPlayer();
	module.exports = {
		name: "Streamwish",
		canHandle: (url) => url.includes("streamwish") || url.includes("strwish") || url.includes("swish"),
		extract: async (url) => {
			try {
				const html = (await axios$4.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } })).data;
				const { sources, tracks } = parseJWPlayer(html);
				if (sources.length > 0 && sources[0].file) return {
					streamUrl: sources[0].file,
					isDirect: true,
					subtitles: tracks || []
				};
				const m3u8 = extractM3U8FromText(html);
				if (m3u8) return {
					streamUrl: m3u8,
					isDirect: true,
					subtitles: []
				};
				throw new Error("No stream found in Streamwish");
			} catch (e) {
				console.error("Streamwish extractor error:", e.message);
				throw e;
			}
		}
	};
}));
//#endregion
//#region electron/services/extractors/decodeSources.js
var require_decodeSources = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var unpack = (script) => {
		return script;
	};
	var extractPacked = (html) => {
		return html.match(/eval\(function\(p,a,c,k,e,?[d]?\).*?\.split\('\|'\).*?\)/g) || [];
	};
	module.exports = {
		unpack,
		extractPacked
	};
}));
//#endregion
//#region electron/services/providers/filemoon.js
var require_filemoon = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$3 = require("axios");
	var { extractM3U8FromText } = require_extractM3U8();
	var { extractPacked } = require_decodeSources();
	module.exports = {
		name: "Filemoon",
		canHandle: (url) => url.includes("filemoon") || url.includes("fmoon"),
		extract: async (url) => {
			try {
				const html = (await axios$3.get(url, { headers: { "User-Agent": "Mozilla/5.0" } })).data;
				let m3u8 = extractM3U8FromText(html);
				if (m3u8) return {
					streamUrl: m3u8,
					isDirect: true,
					subtitles: []
				};
				if (extractPacked(html).length > 0) console.log("Filemoon stream is packed. Real extraction requires unpacker.");
				throw new Error("No stream found in Filemoon or stream is obfuscated.");
			} catch (e) {
				console.error("Filemoon extractor error:", e.message);
				throw e;
			}
		}
	};
}));
//#endregion
//#region electron/services/providers/yourupload.js
var require_yourupload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$2 = require("axios");
	var { extractMP4FromText } = require_extractM3U8();
	module.exports = {
		name: "YourUpload",
		canHandle: (url) => url.includes("yourupload"),
		extract: async (url) => {
			try {
				const embedUrl = url.includes("/watch/") ? url.replace("/watch/", "/embed/") : url;
				const html = (await axios$2.get(embedUrl, { headers: {
					"User-Agent": "Mozilla/5.0",
					"Referer": "https://www.yourupload.com/"
				} })).data;
				const metaMatch = html.match(/property="og:video"\s*content="([^"]+)"/);
				if (metaMatch) return {
					streamUrl: metaMatch[1],
					isDirect: true,
					subtitles: []
				};
				const mp4 = extractMP4FromText(html);
				if (mp4) return {
					streamUrl: mp4,
					isDirect: true,
					subtitles: []
				};
				throw new Error("No stream found in YourUpload");
			} catch (e) {
				console.error("YourUpload extractor error:", e.message);
				throw e;
			}
		}
	};
}));
//#endregion
//#region electron/services/providers/maru.js
var require_maru = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$1 = require("axios");
	module.exports = {
		name: "Maru",
		canHandle: (url) => url.includes("ok.ru") || url.includes("maru"),
		extract: async (url) => {
			try {
				const match = (await axios$1.get(url, { headers: { "User-Agent": "Mozilla/5.0" } })).data.match(/data-options="([^"]+)"/);
				if (match) {
					const optionsStr = match[1].replace(/&quot;/g, "\"");
					const options = JSON.parse(optionsStr);
					if (options.flashvars && options.flashvars.metadataUrl) {
						const metaJSON = (await axios$1.get(decodeURIComponent(options.flashvars.metadataUrl), { headers: { "User-Agent": "Mozilla/5.0" } })).data;
						if (metaJSON.hlsManifestUrl) return {
							streamUrl: metaJSON.hlsManifestUrl,
							isDirect: true,
							subtitles: []
						};
					}
				}
				throw new Error("No stream found in Maru/Ok.ru");
			} catch (e) {
				console.error("Maru extractor error:", e.message);
				throw e;
			}
		}
	};
}));
//#endregion
//#region electron/services/providers/mp4upload.js
var require_mp4upload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios = require("axios");
	module.exports = {
		name: "MP4Upload",
		canHandle: (url) => url.includes("mp4upload.com"),
		extract: async (url) => {
			const embedUrl = url.includes("embed-") ? url : url.replace(".com/", ".com/embed-") + ".html";
			const html = (await axios.get(embedUrl, { headers: { "User-Agent": "Mozilla/5.0" } })).data;
			const srcMatch = html.match(/src:\s*"(https:\/\/.*?\.mp4)"/);
			if (srcMatch) return {
				streamUrl: srcMatch[1],
				type: "mp4"
			};
			const scriptMatch = html.match(/script[\s\S]*?player\.src\("(.*?)"\)/);
			if (scriptMatch) return {
				streamUrl: scriptMatch[1],
				type: "mp4"
			};
			throw new Error("Could not find video source in MP4Upload");
		}
	};
}));
//#endregion
//#region electron/services/providers/animeProvider.js
var require_animeProvider = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var providers = [
		require_streamwish(),
		require_filemoon(),
		require_yourupload(),
		require_maru(),
		require_mp4upload()
	];
	module.exports = { animeProvider: {
		extract: async (url) => {
			for (const provider of providers) if (provider.canHandle(url)) {
				console.log(`[AnimeProvider] Usando extractor: ${provider.name} para ${url}`);
				try {
					return {
						...await provider.extract(url),
						provider: provider.name,
						originalUrl: url
					};
				} catch (e) {
					console.warn(`[AnimeProvider] Fallo la extraccion con ${provider.name}:`, e.message);
					throw e;
				}
			}
			console.log(`[AnimeProvider] Ningun extractor soportado para: ${url}`);
			throw new Error("Proveedor no soportado");
		},
		canExtract: (url) => {
			return providers.some((p) => p.canHandle(url));
		}
	} };
}));
//#endregion
//#region electron/main.js
var { app, BrowserWindow, ipcMain, session } = require("electron");
var path = require("path");
var sources = require_sources();
var { animeProvider } = require_animeProvider();
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");
function createWindow() {
	const win = new BrowserWindow({
		width: 1480,
		height: 915,
		minWidth: 1480,
		minHeight: 915,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		},
		autoHideMenuBar: true
	});
	if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(__dirname, "../dist/index.html"));
	win.webContents.setWindowOpenHandler((details) => {
		console.log(`Bloqueado popup hacia: ${details.url}`);
		return { action: "deny" };
	});
}
ipcMain.handle("api-latest", async (event, { sourceId }) => {
	return await sources.getSource(sourceId).getLatest();
});
ipcMain.handle("api-details", async (event, { url, sourceId }) => {
	return await sources.getSource(sourceId).getDetails(url);
});
ipcMain.handle("api-servers", async (event, { url, sourceId }) => {
	return (await sources.getSource(sourceId).getServers(url)).map((server) => ({
		...server,
		canExtract: animeProvider.canExtract(server.code)
	}));
});
ipcMain.handle("api-search", async (event, { query, sourceId }) => {
	return await sources.getSource(sourceId).search(query);
});
ipcMain.handle("api-browse", async (event, { page, sourceId }) => {
	return await sources.getSource(sourceId).browse(page);
});
ipcMain.handle("api-recently-added", async (event, { sourceId }) => {
	return await sources.getSource(sourceId).getRecentlyAdded();
});
ipcMain.handle("api-extract", async (event, { url }) => {
	return await animeProvider.extract(url);
});
ipcMain.handle("api-news", async (event, { apiKey }) => {
	try {
		const data = await (await fetch(`https://newsapi.org/v2/everything?qInTitle=anime%20OR%20manga%20OR%20crunchyroll&sortBy=publishedAt&language=es&apiKey=${apiKey}`)).json();
		if (data.status === "ok") return data.articles;
		else throw new Error(data.message || "Error fetching news from NewsAPI");
	} catch (error) {
		console.error("News API error:", error.message);
		return { error: error.message };
	}
});
app.whenReady().then(() => {
	session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["*://*.mp4upload.com/*"] }, (details, callback) => {
		details.requestHeaders["Referer"] = "https://www.mp4upload.com/";
		callback({ requestHeaders: details.requestHeaders });
	});
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
