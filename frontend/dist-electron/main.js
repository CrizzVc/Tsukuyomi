//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region electron/services/sources/animeav1.js
var require_animeav1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$6 = require("axios");
	var cheerio$1 = require("cheerio");
	var BASE_URL = "https://animeav1.com";
	module.exports = {
		name: "AnimeAV1",
		id: "animeav1",
		getLatest: async () => {
			const response = await axios$6.get(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
			const $ = cheerio$1.load(response.data);
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
			const $ = cheerio$1.load(response.data);
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
			const $ = cheerio$1.load(response.data);
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
			const $ = cheerio$1.load(response.data);
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
			const $ = cheerio$1.load(response.data);
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
//#region electron/services/sources/jkanime.js
var require_jkanime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var axios$5 = require("axios");
	var cheerio = require("cheerio");
	var BASE_URL = "https://jkanime.net";
	var jkanime = {
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
					animeUrl: a.url,
					image: a.image
				}));
			} catch (e) {}
			return [];
		},
		getRecentlyAdded: async () => {
			return await jkanime.browse(1);
		}
	};
	module.exports = jkanime;
}));
//#endregion
//#region electron/services/sources/index.js
var require_sources = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var animeav1 = require_animeav1();
	var jkanime = require_jkanime();
	var sources = {
		[animeav1.id]: animeav1,
		[jkanime.id]: jkanime
	};
	module.exports = {
		getSource: (id) => sources[id || "animeav1"] || sources["animeav1"],
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
		icon: process.env.VITE_DEV_SERVER_URL ? path.join(__dirname, "../public/icon.png") : path.join(__dirname, "../dist/icon.png"),
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
	const source = sources.getSource(sourceId);
	if (typeof source.getRecentlyAdded === "function") return await source.getRecentlyAdded();
	else if (typeof source.browse === "function") return await source.browse(1);
	return [];
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
ipcMain.handle("api-fanart", async (event, { tvdbId, apiKey }) => {
	try {
		const response = await fetch(`https://webservice.fanart.tv/v3/tv/${tvdbId}?api_key=${apiKey}`);
		if (response.ok) return await response.json();
		return null;
	} catch (error) {
		console.error("Fanart API error:", error.message);
		return null;
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
