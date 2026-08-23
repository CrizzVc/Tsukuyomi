import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import './index.css';
import VideoPlayer from './components/Player/VideoPlayer';
import BannerImages from './components/bannerimages';
import AnimeNewsCarousel from './components/animeNews';

const STATES = {
    PROFILES: 'PROFILES',
    HOME: 'HOME',
    DETAILS: 'DETAILS',
    SERVER_MODAL: 'SERVER_MODAL',
    PLAYER: 'PLAYER',
    SEARCH: 'SEARCH',
    EXTENSIONS_MODAL: 'EXTENSIONS_MODAL',
    CATALOG: 'CATALOG',
    FAVORITES: 'FAVORITES'
};

const animeav1 = '../src/assets/animeav1.png';
const jkanime = '../src/assets/jkanime.png';

const EXTENSIONS = [
    // { id: 'animeflv', name: 'AnimeFLV', icon: 'AF', color: '#ff8a00' },
    { id: 'animeav1', name: 'AnimeAV1', icon: 'A1', color: '#20a4a1', iconWeb: animeav1 },
    // { id: 'animeonlineninja', name: 'Ninja', icon: 'AN', color: '#ff2a2a' },
    { id: 'jkanime', name: 'JKAnime', icon: 'JK', color: '#00a8ff', iconWeb: jkanime },
    // { id: 'monoschinos', name: 'MonoChinos', icon: 'MC', color: '#00e5ff' },
    // { id: 'tioanime', name: 'TioAnime', icon: 'TA', color: '#ff00e5' }
];

const DEFAULT_PROFILES = [
    { id: 1, name: 'User 1', avatar: 'https://ui-avatars.com/api/?name=U1&background=00E5FF&color=fff', background: '', favorites: [] }
];

const TOTAL_CATALOG_PAGES = 180;

const getAnimeBadge = (anime) => {
    const title = (anime.title || '').toLowerCase();
    const ep = (anime.episode || '').toLowerCase();

    if (title.includes('pelicula') || title.includes('película') || title.includes('movie') || ep.includes('pelicula') || ep.includes('película')) {
        return { text: 'Película', type: 'movie' };
    }
    if (title.includes('especial') || title.includes('special') || title.includes('ova') || ep.includes('especial') || ep.includes('special') || ep.includes('ova')) {
        return { text: 'Especial', type: 'special' };
    }
    return { text: 'TV Anime', type: 'tv' };
};

function App() {
    const [profiles, setProfiles] = useState(() => {
        const saved = localStorage.getItem('profiles');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    });
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'cyber');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarIndex, setSidebarIndex] = useState(0);
    const episodesRowRef = useRef(null);
    const [activeProfile, setActiveProfile] = useState(null);
    const [editingProfile, setEditingProfile] = useState(null);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [view, setView] = useState(STATES.PROFILES);
    const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
    const [moduleModalIndex, setModuleModalIndex] = useState(0);
    const [expandedSynopsis, setExpandedSynopsis] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [relatedActiveIndex, setRelatedActiveIndex] = useState(0);
    const [selectedRelatedIndex, setSelectedRelatedIndex] = useState(-1); // -1 = anime actual
    const [relatedDetailsData, setRelatedDetailsData] = useState(null);
    const [relatedDetailsLoading, setRelatedDetailsLoading] = useState(false);
    const [currentSource, setCurrentSource] = useState('animeav1');
    const [latest, setLatest] = useState([]);
    const [gridAnimes, setGridAnimes] = useState([]); // First 24 from catalog for the home grid
    const [catalogResults, setCatalogResults] = useState([]);
    const [catalogPage, setCatalogPage] = useState(1);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [details, setDetails] = useState(null);
    const [servers, setServers] = useState([]);
    const [playerUrl, setPlayerUrl] = useState('');
    const [isDirectStream, setIsDirectStream] = useState(false);
    const [playerMode, setPlayerMode] = useState('interno');
    const [playerSubtitles, setPlayerSubtitles] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('');
    const [clock, setClock] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    const [previousView, setPreviousView] = useState(STATES.HOME);
    const [detailsPreviousView, setDetailsPreviousView] = useState(STATES.HOME);
    const [isGameWipeActive, setIsGameWipeActive] = useState(false);
    const [wipeDirection, setWipeDirection] = useState('right');
    const [wipeKey, setWipeKey] = useState(0);

    const triggerGameTransition = (onCovered, direction = 'right') => {
        setWipeDirection(direction);
        setWipeKey(prev => prev + 1);
        setIsGameWipeActive(true);
        setTimeout(async () => {
            if (onCovered) {
                await onCovered();
            }
        }, 380);
        setTimeout(() => {
            setIsGameWipeActive(false);
        }, 900);
    };

    // News API states
    const [newsApiKey, setNewsApiKey] = useState(() => localStorage.getItem('news_api_key') || '');
    const [newsArticles, setNewsArticles] = useState([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState('');

    // Navigation state for "spatial" focus simulation
    const [rowIndex, setRowIndex] = useState(0); // -1: Header, 0: Latest, 1: Favorites, 2: Recent Grid, 3: News
    const [colIndices, setColIndices] = useState({ '-1': 0, 0: 0, 1: 0, 2: 0, 3: 0 });
    const colIndex = colIndices[rowIndex] || 0;
    const [slideDirection, setSlideDirection] = useState('right'); // 'right' | 'left'
    const prevColIndexRef = useRef(colIndices[0] || 0);

    const setColIndex = (updater) => {
        setColIndices(prev => {
            const currentCol = prev[rowIndex] || 0;
            const nextCol = typeof updater === 'function' ? updater(currentCol) : updater;
            if (rowIndex === 0 && nextCol !== currentCol) {
                setSlideDirection(nextCol > currentCol ? 'right' : 'left');
            }
            return {
                ...prev,
                [rowIndex]: nextCol
            };
        });
    };

    const touchStartX = useRef(null);
    const searchDebounceRef = useRef(null);
    const lastWheelTime = useRef(0);
    const [isSearchActive, setIsSearchActive] = useState(false); // true: barra de búsqueda expandida en el header
    const [searchIndex, setSearchIndex] = useState(-1); // -1: input focused
    const [detailsActiveIndex, setDetailsActiveIndex] = useState(0);
    const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
    const [isEpisodeSearchVisible, setIsEpisodeSearchVisible] = useState(false);
    const [episodeSortOrder, setEpisodeSortOrder] = useState('desc');

    // Watched episodes state (persisted per profile in localStorage)
    const [watchedEpisodes, setWatchedEpisodes] = useState(() => {
        try {
            const saved = localStorage.getItem('watched_episodes');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const getWatchedKey = (animeUrl, epNumber) => `${animeUrl}::ep${epNumber}`;

    const isEpisodeWatched = (animeUrl, epNumber) => {
        if (!activeProfile) return false;
        const profileWatched = watchedEpisodes[activeProfile.id] || {};
        return !!profileWatched[getWatchedKey(animeUrl, epNumber)];
    };

    const markEpisodeWatched = (animeUrl, epNumber, fullAnimeInfo = null) => {
        if (!activeProfile) return;
        setWatchedEpisodes(prev => {
            const profileWatched = { ...(prev[activeProfile.id] || {}) };
            profileWatched[getWatchedKey(animeUrl, epNumber)] = Date.now();
            const next = { ...prev, [activeProfile.id]: profileWatched };
            localStorage.setItem('watched_episodes', JSON.stringify(next));
            return next;
        });

        if (fullAnimeInfo) {
            addToWatchHistory({
                title: fullAnimeInfo.title,
                image: fullAnimeInfo.cover || fullAnimeInfo.image,
                episodeUrl: fullAnimeInfo.episodeUrl || fullAnimeInfo.url,
                animeUrl: animeUrl,
                episode: epNumber,
                source: fullAnimeInfo.source || currentSource
            });
        }
    };

    const addToWatchHistory = (historyItem) => {
        if (!activeProfile) return;
        setWatchedEpisodes(prev => {
            const next = { ...prev };
            if (!next[`${activeProfile.id}_history`]) {
                next[`${activeProfile.id}_history`] = [];
            }
            let history = [...next[`${activeProfile.id}_history`]];

            // Remove duplicates for the same anime
            history = history.filter(item => item.animeUrl !== historyItem.animeUrl);

            // Add to beginning
            history.unshift({ ...historyItem, timestamp: Date.now() });

            // Limit to 20 items
            if (history.length > 20) {
                history = history.slice(0, 20);
            }

            next[`${activeProfile.id}_history`] = history;
            localStorage.setItem('watched_episodes', JSON.stringify(next));
            return next;
        });
    };

    const toggleEpisodeWatched = (e, animeUrl, epNumber) => {
        e.stopPropagation();
        if (!activeProfile) return;
        setWatchedEpisodes(prev => {
            const profileWatched = { ...(prev[activeProfile.id] || {}) };
            const key = getWatchedKey(animeUrl, epNumber);
            if (profileWatched[key]) {
                delete profileWatched[key];
            } else {
                profileWatched[key] = Date.now();
            }
            const next = { ...prev, [activeProfile.id]: profileWatched };
            localStorage.setItem('watched_episodes', JSON.stringify(next));
            return next;
        });
    };

    const handleTouchStart = (e, row) => {
        touchStartX.current = e.touches[0].clientX;
        if (rowIndex !== row) setRowIndex(row);
    };

    const handleTouchEnd = (e, maxCols) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchStartX.current - touchEndX;

        if (deltaX > 50) {
            setColIndex(prev => Math.min(prev + 1, maxCols));
        } else if (deltaX < -50) {
            setColIndex(prev => Math.max(prev - 1, 0));
        }
        touchStartX.current = null;
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    useEffect(() => {
        if (view !== STATES.EXTENSIONS_MODAL) {
            setPreviousView(view);
        }
    }, [view]);

    // Bloquea el scroll/movimiento del fondo mientras el modal de módulos está abierto
    useEffect(() => {
        if (isExtensionsModalOpen) {
            const activeExtIndex = EXTENSIONS.findIndex(ext => ext.id === currentSource);
            setModuleModalIndex(activeExtIndex >= 0 ? activeExtIndex : 0);

            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = previousOverflow;
            };
        }
    }, [isExtensionsModalOpen]);

    useEffect(() => {
        const timer = setInterval(() => {
            setClock(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        loadLatest();
        loadGridAnimes();
    }, []);

    useEffect(() => {
        if (activeProfile) {
            const filteredFavs = activeProfile.favorites.filter(f => f.source === currentSource);
            setFavorites(filteredFavs);
        }
    }, [activeProfile, currentSource]);

    useEffect(() => {
        if (view === STATES.DETAILS && episodesRowRef.current) {
            const focusedEl = episodesRowRef.current.querySelector('.persona-ep-card.focused');
            if (focusedEl) {
                focusedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
    }, [detailsActiveIndex, view]);






    const loadNews = async (key = newsApiKey) => {
        if (!key) return;
        setNewsLoading(true);
        setNewsError('');
        try {
            const data = await api.fetchNews(key);
            if (data && data.error) {
                setNewsError(data.error);
                setNewsArticles([]);
            } else if (Array.isArray(data)) {
                const filtered = data.filter(art =>
                    art.title &&
                    art.title !== '[Removed]' &&
                    art.description &&
                    art.description !== '[Removed]'
                );
                setNewsArticles(filtered.slice(0, 12));
            } else {
                setNewsError('Error al cargar noticias de NewsAPI.');
                setNewsArticles([]);
            }
        } catch (e) {
            setNewsError('Error de conexión.');
            setNewsArticles([]);
        } finally {
            setNewsLoading(false);
        }
    };

    const saveNewsApiKey = (key) => {
        localStorage.setItem('news_api_key', key);
        setNewsApiKey(key);
    };

    useEffect(() => {
        if (newsApiKey) {
            loadNews(newsApiKey);
        }
    }, [newsApiKey]);

    const loadLatest = async (source = currentSource) => {
        setStatus('Cargando últimos episodios...');
        try {
            const data = await api.fetchLatest(source);
            setLatest(data);
            setStatus('');
        } catch (e) {
            setStatus('Error al cargar datos.');
        }
    };

    const loadGridAnimes = async (source = currentSource) => {
        try {
            const data = await api.fetchRecentlyAdded(source);
            setGridAnimes(data.slice(0, 24));
        } catch (e) {
            console.error('Error al cargar grid de animes:', e);
        }
    };

    const handleAnimeClick = (anime) => {
        setSelectedAnime(anime);
        openDetails(anime); // Skip ACTION_MODAL
    };

    const openDetails = async (anime, changeView = true) => {
        setStatus('Cargando detalles...');
        const animeSource = anime.source || currentSource;
        setCurrentSource(animeSource);
        const fetchPromise = api.fetchDetails(anime.animeUrl || anime.url, animeSource);

        if (changeView && view !== STATES.DETAILS) {
            setDetailsPreviousView(view);
            triggerGameTransition(async () => {
                try {
                    const data = await fetchPromise;
                    setDetails(data);
                    setView(STATES.DETAILS);
                    setShowDescription(false);
                    setDetailsActiveIndex(0);
                    setRelatedActiveIndex(0);
                    setSelectedRelatedIndex(-1);
                    setRelatedDetailsData(null);
                    setEpisodeSearchQuery('');
                    setIsEpisodeSearchVisible(false);
                    setEpisodeSortOrder('desc');
                    setStatus('');

                    if (data && data.title) {
                        api.fetchFanartLogo(data.title).then(logoUrl => {
                            if (logoUrl) {
                                setDetails(prev => prev ? { ...prev, logo: logoUrl } : prev);
                            }
                        }).catch(logoErr => {
                            console.error("Logo fetch error:", logoErr);
                        });
                    }
                } catch (e) {
                    setStatus('Error al cargar detalles.');
                }
            });
        } else {
            try {
                const data = await fetchPromise;
                setDetails(data);
                setShowDescription(false);
                setDetailsActiveIndex(0);
                setRelatedActiveIndex(0);
                setSelectedRelatedIndex(-1);
                setRelatedDetailsData(null);
                setEpisodeSearchQuery('');
                setIsEpisodeSearchVisible(false);
                setEpisodeSortOrder('desc');
                setStatus('');
            } catch (e) {
                setStatus('Error al cargar detalles.');
            }
        }
    };

    const handleSelectRelated = async (item, idx) => {
        setRelatedActiveIndex(idx);
        setSelectedRelatedIndex(idx);

        // Si ya estamos viendo el mismo anime, no hace falta re-navegar
        if (details && details.url === item.url) return;

        triggerGameTransition(async () => {
            try {
                setStatus('Cargando detalles...');
                const data = await api.fetchDetails(item.url, currentSource);
                setSelectedAnime(item);
                setDetails(data);
                setShowDescription(false);
                setDetailsActiveIndex(0);
                setRelatedActiveIndex(0);
                setSelectedRelatedIndex(-1);
                setRelatedDetailsData(null);
                setEpisodeSearchQuery('');
                setIsEpisodeSearchVisible(false);
                setEpisodeSortOrder('desc');
                setStatus('');

                if (data && data.title) {
                    api.fetchFanartLogo(data.title).then(logoUrl => {
                        if (logoUrl) {
                            setDetails(prev => prev ? { ...prev, logo: logoUrl } : prev);
                        }
                    }).catch(logoErr => {
                        console.error("Logo fetch error:", logoErr);
                    });
                }
            } catch (e) {
                setStatus('Error al cargar detalles.');
            }
        });
    };

    const handleBackToSelf = () => {
        setSelectedRelatedIndex(-1);
        setRelatedDetailsData(null);
    };

    const openServers = async (url) => {
        setStatus('Buscando servidores...');
        try {
            const data = await api.fetchServers(url, currentSource);
            setServers(data || []);
            setView(STATES.SERVER_MODAL);
            setStatus('');
        } catch (e) {
            console.error("Error al obtener servidores:", e);
            setServers([]);
            setView(STATES.SERVER_MODAL);
            setStatus('Error al cargar servidores.');
        }
    };

    const playVideo = async (server, animeTitle = '', useExternal = false) => {
        setStatus('Resolviendo enlace de video...');
        setDetails(prev => ({ ...prev, currentServer: server, animeTitle: animeTitle }));

        if (!useExternal) {
            try {
                const extracted = await api.extractStream(server.code);
                if (extracted && extracted.streamUrl) {
                    setPlayerUrl(extracted.streamUrl);
                    setPlayerSubtitles(extracted.subtitles || []);
                    setIsDirectStream(true);
                    console.log("Enlace resuelto desde backend:", extracted.streamUrl);
                } else {
                    throw new Error("Extracción fallida");
                }
            } catch (e) {
                console.log("Usando iframe como fallback para:", server.code);
                setPlayerUrl(server.code);
                setPlayerSubtitles([]);
                setIsDirectStream(false);
            }
        } else {
            console.log("Usando iframe explícitamente para:", server.code);
            setPlayerUrl(server.code);
            setPlayerSubtitles([]);
            setIsDirectStream(false);
        }

        setStatus('');
        setView(STATES.PLAYER);
    };

    const selectProfile = (profile) => {
        setActiveProfile(profile);
        setColIndex(0);
        setRowIndex(0);
        setView(STATES.HOME);
    };

    const fileInputRef = useRef(null);
    const [fileType, setFileType] = useState('avatar'); // 'avatar' or 'background'

    const openFileExplorer = (type) => {
        setFileType(type);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && editingProfile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                setEditingProfile(prev => ({
                    ...prev,
                    [fileType]: base64
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const saveProfile = () => {
        if (!editingProfile) return;

        let updatedProfiles;
        if (isCreatingProfile) {
            updatedProfiles = [...profiles, editingProfile];
        } else {
            updatedProfiles = profiles.map(p => p.id === editingProfile.id ? editingProfile : p);
        }

        setProfiles(updatedProfiles);
        localStorage.setItem('profiles', JSON.stringify(updatedProfiles));

        if (activeProfile && activeProfile.id === editingProfile.id) {
            setActiveProfile(editingProfile);
        }

        setEditingProfile(null);
        setIsCreatingProfile(false);
    };

    const deleteProfile = (profileId) => {
        if (profiles.length <= 1) {
            alert('Debe haber al menos un perfil.');
            return;
        }
        if (confirm('¿Estás seguro de que quieres eliminar este perfil?')) {
            const updatedProfiles = profiles.filter(p => p.id !== profileId);
            setProfiles(updatedProfiles);
            localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
            setEditingProfile(null);
            setColIndex(0);
        }
    };

    const addUser = () => {
        if (profiles.length >= 5) {
            alert('Límite de 5 usuarios alcanzado.');
            return;
        }
        setIsCreatingProfile(true);
        setEditingProfile({
            id: Date.now(),
            name: '',
            avatar: 'https://ui-avatars.com/api/?name=New&background=random&color=fff',
            background: '',
            favorites: []
        });
    };

    const isAnimeFavorite = (animeObj) => {
        if (!activeProfile || !animeObj || !activeProfile.favorites) return false;
        const targetUrl = (animeObj.animeUrl || animeObj.url || '').replace(/\/$/, '');
        const targetTitle = (animeObj.title || '').trim().toLowerCase();

        return activeProfile.favorites.some(f => {
            if (f.source !== currentSource) return false;
            const fUrl = (f.animeUrl || f.url || '').replace(/\/$/, '');
            const fTitle = (f.title || '').trim().toLowerCase();
            const matchUrl = Boolean(targetUrl && fUrl && fUrl === targetUrl);
            const matchTitle = Boolean(targetTitle && fTitle && fTitle === targetTitle);
            return matchUrl || matchTitle;
        });
    };

    const toggleFavorite = (anime) => {
        if (!activeProfile) return;

        const animeUrl = anime.animeUrl || anime.url;
        const targetUrl = (animeUrl || '').replace(/\/$/, '');
        const targetTitle = (anime.title || '').trim().toLowerCase();

        const isFav = isAnimeFavorite(anime);
        let newProfileFavorites;

        if (isFav) {
            newProfileFavorites = activeProfile.favorites.filter(f => {
                const fUrl = (f.animeUrl || f.url || '').replace(/\/$/, '');
                const fTitle = (f.title || '').trim().toLowerCase();
                const matchUrl = Boolean(targetUrl && fUrl && fUrl === targetUrl);
                const matchTitle = Boolean(targetTitle && fTitle && fTitle === targetTitle);
                return !(matchUrl || matchTitle);
            });
        } else {
            newProfileFavorites = [
                {
                    title: anime.title,
                    url: animeUrl,
                    animeUrl: animeUrl,
                    image: anime.image || anime.cover,
                    cover: anime.cover || anime.image,
                    source: anime.source || currentSource
                },
                ...activeProfile.favorites
            ];
        }

        const updatedProfile = { ...activeProfile, favorites: newProfileFavorites };
        const updatedProfiles = profiles.map(p => p.id === activeProfile.id ? updatedProfile : p);

        setProfiles(updatedProfiles);
        setActiveProfile(updatedProfile);
        localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
    };

    const activateSearch = () => {
        setIsSearchActive(true);
        setSearchQuery('');
        setSearchResults([]);
        setSearchIndex(-1);
        setRowIndex(-1);
        setColIndex(2);
        setView(STATES.CATALOG);
    };

    const deactivateSearch = () => {
        setIsSearchActive(false);
        setSearchQuery('');
        setSearchResults([]);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };

    // Búsqueda reactiva: dispara una petición cada vez que el usuario escribe (con debounce)
    useEffect(() => {
        if (!isSearchActive) return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        const query = searchQuery.trim();
        if (query === '') {
            setSearchResults([]);
            setStatus('');
            return;
        }

        setStatus('Buscando...');
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const results = await api.searchAnime(query, currentSource);
                setSearchResults(results);
                setSearchIndex(prev => (prev === -1 ? -1 : 0));
            } catch (e) {
                console.error('Error al buscar:', e);
            } finally {
                setStatus('');
            }
        }, 350);

        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery, isSearchActive, currentSource]);

    const handleSearch = async (e) => {
        if (e.key === 'Enter') {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            const query = searchQuery.trim();
            if (query === '') return;
            setStatus('Buscando...');
            const results = await api.searchAnime(query, currentSource);
            setSearchResults(results);
            setSearchIndex(-1); // reset focus to input
            setStatus('');
        } else if (e.key === 'Escape') {
            deactivateSearch();
            setView(STATES.HOME);
        }
    };

    const selectSource = (sourceId) => {
        setCurrentSource(sourceId);
        setSearchQuery('');
        setSearchResults([]);
        setIsExtensionsModalOpen(false);

        if (isSearchActive) {
            setView(STATES.CATALOG);
        } else if (previousView === STATES.CATALOG) {
            loadCatalog(1, sourceId);
        } else {
            // El selector es un modal independiente de la navegación.
            // No cambiamos la vista actual para que Home (u otra vista)
            // permanezca visible detrás del modal.
            loadLatest(sourceId);
            loadGridAnimes(sourceId);
        }
    };

    const loadCatalog = async (page = 1, source = currentSource) => {
        deactivateSearch();
        setStatus('Cargando catálogo...');
        setCatalogLoading(true);
        setCatalogResults([]);
        setView(STATES.CATALOG);
        try {
            const data = await api.fetchCatalog(page, source);
            setCatalogResults(data);
            setCatalogPage(page);
            setSearchIndex(0);
            setRowIndex(0); // Move focus from header to grid automatically on load
            setStatus('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Error al cargar catálogo:", e);
            setStatus('Error de conexión. Reinicia tu backend (node server.js).');
        } finally {
            setCatalogLoading(false);
        }
    };

    const goBack = () => {
        if (view === STATES.PLAYER) setView(STATES.SERVER_MODAL);
        else if (view === STATES.SERVER_MODAL) setView(details ? STATES.DETAILS : STATES.HOME);
        else if (view === STATES.DETAILS) {
            triggerGameTransition(() => {
                setView(detailsPreviousView);
            }, 'left');
        }
        else if (view === STATES.CATALOG && isSearchActive) { deactivateSearch(); setView(STATES.HOME); }
        else if (view === STATES.CATALOG) setView(STATES.HOME);
        else if (view === STATES.HOME) setView(STATES.PROFILES);
    };

    // Keyboard navigation simulation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isSidebarOpen) {
                if (e.key === 'Escape') {
                    setIsSidebarOpen(false);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSidebarIndex(prev => Math.min(prev + 1, 3));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSidebarIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                    if (sidebarIndex === 0) {
                        setView(STATES.HOME);
                        setIsSidebarOpen(false);
                    } else if (sidebarIndex === 1) {
                        loadCatalog(1);
                        setIsSidebarOpen(false);
                    } else if (sidebarIndex === 2) {
                        setView(STATES.FAVORITES);
                        setIsSidebarOpen(false);
                    } else if (sidebarIndex === 3) {
                        setView(STATES.PROFILES);
                        setIsSidebarOpen(false);
                    }
                }
                return; // Prevent background navigation
            }

            if (isExtensionsModalOpen) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsExtensionsModalOpen(false);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setModuleModalIndex(prev => Math.min(prev + 1, EXTENSIONS.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setModuleModalIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const ext = EXTENSIONS[moduleModalIndex];
                    if (ext) selectSource(ext.id);
                }
                return; // Prevent background navigation while the module modal is open
            }

            if (e.key === 'Escape') {
                if (view === STATES.HOME || view === STATES.CATALOG || view === STATES.FAVORITES) {
                    setIsSidebarOpen(true);
                    setSidebarIndex(0);
                } else {
                    goBack();
                }
            }

            if (document.activeElement && document.activeElement.id === 'news-key-input') {
                if (e.key === 'Escape') {
                    document.activeElement.blur();
                }
                if (e.key === 'Enter') {
                    const val = document.getElementById('news-key-input')?.value;
                    if (val) saveNewsApiKey(val.trim());
                }
                return; // Let standard input typing happen without spatial interference
            }

            if (view === STATES.PROFILES) {
                if (e.key === 'ArrowDown') setColIndex(prev => Math.min(prev + 1, profiles.length));
                if (e.key === 'ArrowUp') setColIndex(prev => Math.max(prev - 1, 0));
                if (e.key === 'Enter') {
                    if (colIndex === profiles.length) addUser();
                    else selectProfile(profiles[colIndex]);
                }
            } else if (view === STATES.HOME) {
                if (e.key === 'ArrowRight') {
                    let maxCol = 0;
                    if (rowIndex === -1) maxCol = 3;
                    else if (rowIndex === 0) maxCol = latest.length; // including "Ver Catálogo" card
                    else if (rowIndex === 1) maxCol = 3; // up to 4 items in history
                    else if (rowIndex === 2) maxCol = Math.max(0, favorites.length - 1);
                    else if (rowIndex === 3) maxCol = Math.max(0, Math.min(23, gridAnimes.length - 1));
                    setColIndex(prev => Math.min(prev + 1, maxCol));
                }
                if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                if (e.key === 'ArrowDown') {
                    if (rowIndex === -1) {
                        setRowIndex(0);
                    } else if (rowIndex === 0) {
                        setRowIndex(1);
                        setColIndex(0);
                    } else if (rowIndex === 1) {
                        setRowIndex(2);
                        setColIndex(0);
                    } else if (rowIndex === 2) {
                        setRowIndex(3);
                        setColIndex(0);
                    } else if (rowIndex === 3) {
                        const listLength = Math.min(24, gridAnimes.length);
                        const cols = 5; // grid has 5 columns
                        if (colIndex + cols < listLength) {
                            setColIndex(prev => prev + cols);
                        }
                    }
                }
                if (e.key === 'ArrowUp') {
                    if (rowIndex === 3) {
                        if (colIndex >= 5) {
                            setColIndex(prev => prev - 5);
                        } else {
                            setRowIndex(2);
                            setColIndex(0);
                        }
                    } else if (rowIndex === 2) {
                        setRowIndex(1);
                        setColIndex(0);
                    } else if (rowIndex === 1) {
                        setRowIndex(0);
                        setColIndex(0);
                    } else if (rowIndex === 0) {
                        setRowIndex(-1);
                    }
                }
                if (e.key === 'Enter') {
                    if (rowIndex === -1) {
                        if (colIndex === 0) setView(STATES.HOME);
                        else if (colIndex === 1) loadCatalog(1);
                        else if (colIndex === 2) activateSearch();
                        else if (colIndex === 3) setIsExtensionsModalOpen(true);
                    }
                    else if (rowIndex === 3) {
                        if (gridAnimes[colIndex]) {
                            handleAnimeClick(gridAnimes[colIndex]);
                        }
                    }
                    else if (rowIndex === 2) {
                        if (favorites[colIndex]) {
                            handleAnimeClick(favorites[colIndex]);
                        }
                    }
                    else if (rowIndex === 1) {
                        // The user has a "Reanudar" button for history. If they press enter, trigger the button.
                        const btn = document.querySelector('.lw-resume-btn.focused');
                        if (btn) btn.click();
                    }
                    else if (rowIndex === 0) {
                        if (colIndex === latest.length) {
                            loadCatalog(1);
                        } else if (latest[colIndex]) {
                            handleAnimeClick(latest[colIndex]);
                        }
                    }
                }
            } else if (view === STATES.CATALOG) {
                if (rowIndex === -1) {
                    // Header navigation in Catalog view (incluye búsqueda)
                    if (e.key === 'ArrowRight') setColIndex(prev => Math.min(prev + 1, 3));
                    if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') {
                        setRowIndex(0);
                        setSearchIndex(prev => prev >= 0 ? prev : 0);
                    }
                    if (e.key === 'Enter') {
                        if (colIndex === 0) setView(STATES.HOME);
                        else if (colIndex === 1) loadCatalog(1);
                        else if (colIndex === 2) activateSearch();
                        else if (colIndex === 3) setIsExtensionsModalOpen(true);
                    }
                } else {
                    // Grid navigation
                    const results = (isSearchActive && searchQuery.trim() !== '') ? searchResults : catalogResults;
                    if (e.key === 'ArrowRight') setSearchIndex(prev => Math.min(prev + 1, results.length - 1));
                    if (e.key === 'ArrowLeft') setSearchIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') {
                        setSearchIndex(prev => prev + 5 < results.length ? prev + 5 : prev);
                    }
                    if (e.key === 'ArrowUp') {
                        if (searchIndex < 5) {
                            setRowIndex(-1);
                            setColIndex(isSearchActive ? 2 : 1); // Volver a la pestaña correspondiente
                        } else {
                            setSearchIndex(prev => Math.max(prev - 5, 0));
                        }
                    }
                    if (e.key === 'Enter' && results[searchIndex]) handleAnimeClick(results[searchIndex]);
                }
            } else if (view === STATES.FAVORITES) {
                if (rowIndex === -1) {
                    if (e.key === 'ArrowRight') setColIndex(prev => Math.min(prev + 1, 3));
                    if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') {
                        setRowIndex(0);
                        setSearchIndex(prev => prev >= 0 ? prev : 0);
                    }
                    if (e.key === 'Enter') {
                        if (colIndex === 0) setView(STATES.HOME);
                        else if (colIndex === 1) loadCatalog(1);
                        else if (colIndex === 2) activateSearch();
                        else if (colIndex === 3) setIsExtensionsModalOpen(true);
                    }
                } else {
                    if (e.key === 'ArrowRight') setSearchIndex(prev => Math.min(prev + 1, favorites.length - 1));
                    if (e.key === 'ArrowLeft') setSearchIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') {
                        setSearchIndex(prev => prev + 5 < favorites.length ? prev + 5 : prev);
                    }
                    if (e.key === 'ArrowUp') {
                        if (searchIndex < 5) {
                            setRowIndex(-1);
                            setColIndex(0); // Volver al home link
                        } else {
                            setSearchIndex(prev => Math.max(prev - 5, 0));
                        }
                    }
                    if (e.key === 'Enter' && favorites[searchIndex]) handleAnimeClick(favorites[searchIndex]);
                }
            } else if (view === STATES.DETAILS && details && showDescription) {
                const relatedList = details.related || [];

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    setRelatedActiveIndex(prev => Math.min(relatedList.length - 1, prev + 1));
                }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    setRelatedActiveIndex(prev => Math.max(0, prev - 1));
                }
                if (e.key === 'Enter') {
                    if (relatedList[relatedActiveIndex]) {
                        handleSelectRelated(relatedList[relatedActiveIndex], relatedActiveIndex);
                    }
                }
            } else if (view === STATES.DETAILS && details) {
                const filteredEpisodes = (details.episodes || [])
                    .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))
                    .sort((a, b) => {
                        const numA = parseFloat(a.episode);
                        const numB = parseFloat(b.episode);
                        return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                    });

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    setDetailsActiveIndex(prev => Math.min(prev + 1, filteredEpisodes.length - 1));
                }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    setDetailsActiveIndex(prev => Math.max(prev - 1, 0));
                }
                if (e.key === 'Enter') {
                    if (filteredEpisodes[detailsActiveIndex]) {
                        openServers(filteredEpisodes[detailsActiveIndex].url);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, colIndex, rowIndex, searchIndex, latest, favorites, searchResults, catalogResults, profiles, detailsActiveIndex, episodeSearchQuery, episodeSortOrder, details, isSidebarOpen, sidebarIndex, showDescription, relatedActiveIndex, isExtensionsModalOpen, moduleModalIndex]);

    // Cinematic scroll to follow focus
    useEffect(() => {
        if (![STATES.HOME, STATES.CATALOG, STATES.PROFILES, STATES.DETAILS, STATES.FAVORITES].includes(view)) return;

        const timeout = setTimeout(() => {
            const activeEl = document.querySelector('.focused, .large-card.expanded');
            if (activeEl) {
                const rect = activeEl.getBoundingClientRect();
                const wrapperEl = document.querySelector('.focused-episode-info-wrapper');
                const wrapperHeight = (rowIndex > 0 && wrapperEl) ? wrapperEl.getBoundingClientRect().height : 0;
                const targetY = Math.max(0, window.scrollY + (rect.top - wrapperHeight) - (window.innerHeight / 2) + (rect.height / 2));
                if (Math.abs(targetY - window.scrollY) > 2) {
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                }
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [rowIndex, colIndex, searchIndex, view]);

    useEffect(() => {
        if (view !== STATES.DETAILS) return;
        const row = episodesRowRef.current;
        if (!row) return;

        const focused = row.querySelector('.episode-card.focused');
        if (!focused) return;

        // Only scroll the row container horizontally, never touch the page scroll
        const rowRect = row.getBoundingClientRect();
        const cardRect = focused.getBoundingClientRect();
        const cardOffsetInRow = cardRect.left - rowRect.left;
        const scrollTarget = row.scrollLeft + cardOffsetInRow - (rowRect.width / 2) + (cardRect.width / 2);
        row.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }, [detailsActiveIndex, view]);

    const renderPagination = () => {
        const items = [];
        items.push({ type: 'first', label: '<<', disabled: catalogPage === 1 });
        items.push({ type: 'prev', label: '<', disabled: catalogPage === 1 });

        const pagesToShow = new Set();
        pagesToShow.add(1);
        pagesToShow.add(TOTAL_CATALOG_PAGES);
        pagesToShow.add(catalogPage);
        pagesToShow.add(catalogPage - 1);
        pagesToShow.add(catalogPage + 1);

        const validPages = Array.from(pagesToShow).filter(p => p > 0 && p <= TOTAL_CATALOG_PAGES).sort((a, b) => a - b);

        const pageItems = [];
        let last = 0;
        for (const p of validPages) {
            if (last && p - last > 1) {
                pageItems.push({ type: 'ellipsis', label: '...' });
            }
            pageItems.push({ type: 'page', label: p });
            last = p;
        }

        items.push(...pageItems);
        items.push({ type: 'next', label: '>', disabled: catalogPage === TOTAL_CATALOG_PAGES });
        items.push({ type: 'last', label: '>>', disabled: catalogPage === TOTAL_CATALOG_PAGES });
        return items;
    };

    return (
        <div id="app-root">
            <style>{`
                .search-bar-expandable {
                    display: flex;
                    align-items: center;
                    height: 38px;
                    border-radius: 19px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    overflow: hidden;
                    cursor: pointer;
                    transition: width 0.32s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, border-color 0.2s ease;
                    width: 110px;
                    flex-shrink: 0;
                }
                .search-bar-expandable.expanded {
                    width: 320px;
                    cursor: default;
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.25);
                }
                .search-bar-expandable.focused {
                    border-color: rgba(255,255,255,0.4);
                }
                .search-bar-expandable .search-icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: currentColor;
                    cursor: pointer;
                    padding: 0;
                }
                .search-bar-expandable .search-label {
                    white-space: nowrap;
                    opacity: 1;
                    transition: opacity 0.2s ease;
                    color: #ffffff33;
                }
                .search-bar-expandable.expanded .search-label {
                    display: none;
                }
                .search-bar-expandable .search-inline-input {
                    flex: 1;
                    height: 100%;
                    background: none;
                    border: none;
                    outline: none;
                    color: #fff;
                    font-size: 14px;
                    min-width: 0;
                    opacity: 0;
                    transition: opacity 0.18s ease 0.05s;
                }
                .search-bar-expandable.expanded .search-inline-input {
                    opacity: 1;
                }
                .search-bar-expandable .search-clear-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.6);
                    cursor: pointer;
                    font-size: 16px;
                }
                .search-clear-btn:hover { color: #fff; }
                .header-left .nav-link.catalog-link {
                    transition: opacity 0.25s ease, max-width 0.3s ease, margin 0.3s ease, transform 0.25s ease;
                    max-width: 220px;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .header-left .nav-link.catalog-link.hidden-by-search {
                    opacity: 0;
                    max-width: 0;
                    margin-left: 0 !important;
                    transform: translateX(-10px);
                    pointer-events: none;
                }

                /* --- Details view --- */
                .details-view {
                    flex-direction: column !important;
                    gap: 0 !important;
                    padding: 50px 60px 0 60px !important;
                    overflow: hidden !important;
                    display: flex !important;
                }

                .details-top-section {
                    display: flex;
                    flex-direction: row;
                    gap: 60px;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-bottom: 20px;
                }

                .details-view .details-left {
                    flex: 0 0 280px;
                }

                .details-view .details-right {
                    flex: 1;
                    min-width: 0;
                }

                /* ── Episodios anclados abajo ── */
                .details-episodes-section {
                    flex-shrink: 0;
                    width: 100%;
                    padding: 14px 0 20px 0;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }

                .details-episodes-section .episodes-header-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                    margin-top: 0;
                }

                .details-episodes-section .episodes-section-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: rgba(255,255,255,0.7);
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .details-episodes-section .episodes-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    gap: 12px;
                    overflow-x: auto;
                    overflow-y: visible;
                    padding-bottom: 12px;
                    scroll-snap-type: x proximity;
                    -webkit-overflow-scrolling: touch;
                    align-items: flex-start;
                }

                .details-episodes-section .episodes-row::-webkit-scrollbar {
                    height: 4px;
                }
                .details-episodes-section .episodes-row::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.04);
                    border-radius: 2px;
                }
                .details-episodes-section .episodes-row::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                }

                .details-episodes-section .episode-card {
                    flex: 0 0 400px;
                    width: 400px;
                    height: calc(400px * 9 / 16);
                    position: relative;
                    border-radius: 10px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 2px solid transparent;
                    scroll-snap-align: start;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .details-episodes-section .episode-card:hover,
                .details-episodes-section .episode-card.focused {
                    border-color: var(--primary-color);
                    box-shadow: 0 4px 20px rgba(var(--glow-rgb), 0.25);
                }

                .details-episodes-section .episode-thumbnail-container {
                    position: absolute;
                    inset: 0;
                }

                .details-episodes-section .episode-thumbnail-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .details-episodes-section .episode-badge {
                    position: absolute;
                    bottom: 6px;
                    left: 6px;
                    background: rgba(14,14,18,0.82);
                    backdrop-filter: blur(4px);
                    color: rgba(255,255,255,0.9);
                    padding: 4px 9px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    border-radius: 5px;
                    z-index: 2;
                }

                /* Watched episode badge */
                .episode-watched-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: #22c55e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3;
                    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.45), 0 0 0 2px rgba(255,255,255,0.15);
                    animation: watchedBadgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer;
                    transition: transform 0.15s ease, background 0.15s ease;
                }
                .episode-watched-badge:hover {
                    transform: scale(1.15);
                    background: #16a34a;
                }
                .episode-watched-badge svg {
                    width: 16px;
                    height: 16px;
                    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
                }
                @keyframes watchedBadgePop {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); }
                }
                .episode-card.watched-episode {
                    opacity: 0.7;
                    transition: opacity 0.3s ease, border-color 0.2s, box-shadow 0.2s;
                }
                .episode-card.watched-episode:hover,
                .episode-card.watched-episode.focused {
                    opacity: 1;
                }
                .episodes-row-wrapper .episodes-header-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .episodes-row-wrapper .episodes-section-title {
                    font-size: 1.1rem;
                    margin: 0;
                    white-space: nowrap;
                }
                .episodes-row-wrapper .episode-search-input {
                    width: 130px;
                }
                .episodes-row-wrapper .episode-search-input:focus {
                    width: 160px;
                }
                
                .synopsis-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                }
                .synopsis-header h2 {
                    margin: 0;
                    white-space: nowrap;
                }
                .synopsis-header .genres-list {
                    margin-bottom: 0;
                }

                .episodes-row {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    gap: 12px;
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding-bottom: 10px;
                    scroll-snap-type: x proximity;
                    -webkit-overflow-scrolling: touch;
                    margin-top: 0;
                    margin-bottom: 0;
                }
                /* Las tarjetas dentro de la fila siempre mantienen el formato miniatura,
                   sin importar el breakpoint de 1200px que las convierte en lista en .episodes-grid */

                .episodes-row .episode-thumbnail-container {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                }
                .episodes-row .episode-thumbnail-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .episodes-row .episode-badge {
                    position: absolute;
                    bottom: 6px;
                    left: 6px;
                    background: rgba(20, 21, 28, 0.85);
                    color: rgba(255, 255, 255, 0.9);
                    padding: 4px 8px;
                    font-size: 0.7rem;
                    border-radius: 5px;
                    backdrop-filter: blur(4px);
                    z-index: 2;
                }
                .episodes-row .episode-card:hover .episode-badge,
                .episodes-row .episode-card.focused .episode-badge {
                    background: rgba(20, 21, 28, 0.95);
                    color: white;
                }
                .episodes-row::-webkit-scrollbar {
                    height: 6px;
                }
                .episodes-row::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.05);
                    border-radius: 3px;
                }
                .episodes-row::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.25);
                    border-radius: 3px;
                }
                .episodes-row::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.4);
                }
                .episodes-row-wrapper .no-episodes-found {
                    padding: 20px;
                    font-size: 0.95rem;
                }

                .details-title {
                    font-size: 3rem;
                    margin-bottom: 10px;
                    line-height: 1.1;
                }

                /* Tablet */
                @media (max-width: 1024px) {
                    .details-view {
                        gap: 36px !important;
                    }
                    .details-view .details-left {
                        flex: 0 0 260px !important;
                    }
                    .details-title {
                        font-size: 2.2rem;
                    }
                    .episodes-row .episode-card,
                    .episodes-row .episode-thumbnail-container {
                        width: 130px;
                    }
                }

            `}</style>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />
            {view === STATES.PROFILES ? (
                <div className="profiles-screen">
                    {/* Background layers for smooth cross-fade */}
                    {profiles.map((p, idx) => (
                        <div
                            key={`bg-${p.id}`}
                            className={`profile-bg-layer ${colIndex === idx ? 'active' : ''}`}
                            style={{
                                backgroundImage: p.background ? `url(${p.background})` : 'none',
                                backgroundColor: 'var(--bg-color)'
                            }}
                        />
                    ))}
                    {/* Dynamic fallback layer when focusing Add Profile button */}
                    <div
                        className={`profile-bg-layer ${colIndex >= profiles.length ? 'active' : ''}`}
                        style={{
                            backgroundImage: 'none',
                            backgroundColor: 'var(--bg-color)'
                        }}
                    />

                    <h1 className="profiles-title">¿Quién está viendo?</h1>
                    <div className="profiles-container">
                        {profiles.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`profile-card ${colIndex === idx ? 'focused' : ''}`}
                                onClick={() => selectProfile(p)}
                            >
                                <button
                                    className="profile-card-edit-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatingProfile(false);
                                        setEditingProfile(p);
                                    }}
                                    title="Editar Perfil"
                                >
                                    ✎
                                </button>
                                <div className="profile-avatar-wrapper">
                                    <img src={p.avatar} alt={p.name} className="profile-avatar" />
                                </div>
                                <div className="profile-name">{p.name}</div>
                            </div>
                        ))}
                        {profiles.length < 5 && (
                            <div
                                className={`profile-card add-profile-card ${colIndex === profiles.length ? 'focused' : ''}`}
                                onClick={addUser}
                            >
                                <div className="profile-avatar-wrapper add-icon">
                                    <span>+</span>
                                </div>
                                <div className="profile-name">Agregar perfil</div>
                            </div>
                        )}
                    </div>

                    {editingProfile && (
                        <div className="side-panel-overlay" onClick={(e) => e.target.className === 'side-panel-overlay' && setEditingProfile(null)}>
                            <div className="side-panel">
                                <div className="side-panel-header">
                                    <h2>{isCreatingProfile ? 'Crear Perfil' : 'Editar Perfil'}</h2>
                                    {!isCreatingProfile && (
                                        <button className="delete-btn-top" onClick={() => deleteProfile(editingProfile.id)} title="Eliminar Perfil">
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div className="edit-field">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        value={editingProfile.name}
                                        onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                    />
                                </div>
                                <div className="edit-field">
                                    <label>Avatar</label>
                                    <div className="avatar-preview" onClick={() => openFileExplorer('avatar')}>
                                        <img src={editingProfile.avatar} alt="Avatar" />
                                        <span>Cambiar</span>
                                    </div>
                                </div>
                                <div className="edit-field">
                                    <label>Fondo</label>
                                    <div className="bg-preview" onClick={() => openFileExplorer('background')}>
                                        {editingProfile.background ? <img src={editingProfile.background} /> : <div className="no-bg">Sin fondo</div>}
                                        <span>Cambiar</span>
                                    </div>
                                </div>
                                <div className="side-panel-actions">
                                    <button className="modal-btn save" onClick={saveProfile}>Guardar</button>
                                    <button className="modal-btn" onClick={() => setEditingProfile(null)}>Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div id="app-container">
                    <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
                        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
                        <div className="sidebar-panel">
                            <div className="sidebar-header">
                                <img src={activeProfile?.avatar} className="sidebar-avatar" alt="User" />
                                <span className="sidebar-username">{activeProfile?.name}</span>
                            </div>
                            <div className="sidebar-menu">
                                <div className={`sidebar-item ${sidebarIndex === 0 ? 'sidebar-focused' : ''}`} onClick={() => { setView(STATES.HOME); setIsSidebarOpen(false); }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    Home
                                </div>
                                <div className={`sidebar-item ${sidebarIndex === 1 ? 'sidebar-focused' : ''}`} onClick={() => { loadCatalog(1); setIsSidebarOpen(false); }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                    Catálogo
                                </div>
                                <div className={`sidebar-item ${sidebarIndex === 2 ? 'sidebar-focused' : ''}`} onClick={() => { setView(STATES.FAVORITES); setIsSidebarOpen(false); }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    Mis Favoritos
                                </div>
                            </div>
                            <div className="sidebar-footer">
                                <div className={`sidebar-item ${sidebarIndex === 3 ? 'sidebar-focused' : ''}`} onClick={() => { setView(STATES.PROFILES); setIsSidebarOpen(false); }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    Cambiar de usuario
                                </div>
                            </div>
                        </div>
                    </div>
                    <header>
                        <div className="header-left">
                            <div className="header-user" onClick={() => setIsSidebarOpen(true)}>
                                <img src={activeProfile?.avatar} className="header-avatar" alt="User" />
                            </div>
                            <span
                                className={`nav-link ${(rowIndex === -1 && colIndex === 0) ? 'focused' : ''} ${view === STATES.HOME ? 'active' : ''}`}
                                onClick={() => setView(STATES.HOME)}
                            >
                                Home
                            </span>
                            <span
                                className={`nav-link catalog-link ${(rowIndex === -1 && colIndex === 1) ? 'focused' : ''} ${view === STATES.CATALOG && !isSearchActive ? 'active' : ''} ${isSearchActive ? 'hidden-by-search' : ''}`}
                                onClick={() => loadCatalog(1)}
                            >
                                Catálogo de Anime
                            </span>
                        </div>
                        <div className="header-right">
                            <div
                                className={`search-bar-expandable ${isSearchActive ? 'expanded' : ''} ${(rowIndex === -1 && colIndex === 2) ? 'focused' : ''}`}
                                onClick={() => { if (!isSearchActive) activateSearch(); }}
                            >
                                <button
                                    type="button"
                                    className="search-icon-btn"
                                    onClick={(e) => { e.stopPropagation(); if (!isSearchActive) activateSearch(); }}
                                    aria-label="Buscar"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                                {!isSearchActive && <span className="search-label">Search</span>}
                                {isSearchActive && (
                                    <>
                                        <input
                                            autoFocus
                                            className="search-inline-input"
                                            placeholder="Buscar anime..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleSearch}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                            type="button"
                                            className="search-clear-btn"
                                            onClick={(e) => { e.stopPropagation(); deactivateSearch(); setView(STATES.HOME); }}
                                            aria-label="Cerrar búsqueda"
                                        >
                                            ✕
                                        </button>
                                    </>
                                )}
                            </div>

                            <div
                                className={`extension-selector ${(rowIndex === -1 && colIndex === 3) ? 'focused' : ''}`}
                                onClick={() => setIsExtensionsModalOpen(true)}
                            >   </div>

                            <div className="source-indicator" onClick={() => setIsExtensionsModalOpen(true)}>
                                <div className="source-circle" style={{ backgroundColor: EXTENSIONS.find(e => e.id === currentSource)?.color }}>
                                    <img src={EXTENSIONS.find(e => e.id === currentSource)?.iconWeb} alt={EXTENSIONS.find(e => e.id === currentSource)?.name} style={{ filter: 'brightness(0) invert(1)' }} />
                                </div>
                            </div>

                            <button
                                className="settings-btn"
                                onClick={() => setIsSettingsOpen(true)}
                                title="Ajustes"
                                aria-label="Ajustes"
                            >
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    <main>
                        {view === STATES.HOME && (
                            <div className="home-view-content">
                                <div className="section-header" style={{ justifyContent: 'flex-start' }}>
                                    <div className="title-marker-flat" style={{ marginRight: '10px' }}></div>
                                    <h2 className="section-title fw-bold" style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: 900 }}>ULTIMOS EPISODIOS</h2>
                                </div>

                                <div className="carousel-container mt-4">
                                    <div
                                        className="carousel-wrapper"
                                        onTouchStart={(e) => handleTouchStart(e, 0)}
                                        onTouchEnd={(e) => handleTouchEnd(e, latest.length)}
                                    >
                                        <div className="carousel new-episodes-carousel" style={{ position: 'relative', transform: `translateX(-${colIndices[0] * 315}px)` }}>
                                            {latest.map((anime, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`card new-ep-card ${rowIndex === 0 && colIndices[0] === idx ? 'focused active' : ''}`}
                                                    style={{ backgroundImage: `url(${anime.image})` }}
                                                    onClick={() => { setRowIndex(0); setColIndex(idx); handleAnimeClick(anime); }}
                                                >
                                                    <div className="card-overlay-flat"></div>
                                                </div>
                                            ))}
                                            <div
                                                className={`card new-ep-card see-more-card ${rowIndex === 0 && colIndices[0] === latest.length ? 'focused active' : ''}`}
                                                onClick={() => { setRowIndex(0); setColIndex(latest.length); loadCatalog(1); }}
                                            >
                                                <div className="see-more-content">
                                                    <div className="see-more-icon">
                                                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const history = activeProfile ? (watchedEpisodes[`${activeProfile.id}_history`] || []).slice(0, 4) : [];
                                    const hasHistory = history.length > 0;
                                    const focusedHistoryItem = history[colIndices[1]] || history[0];

                                    return (
                                        <div className="last-watched-bar-container">
                                            {hasHistory ? (
                                                <div className="last-watched-bar">
                                                    <div className="last-watched-carousel-wrapper">
                                                        <button
                                                            className="lw-nav-btn left"
                                                            onClick={() => setColIndex(prev => Math.max(0, prev - 1))}
                                                            disabled={colIndices[1] === 0}
                                                        >&lt;</button>
                                                        <div className="last-watched-carousel">
                                                            {history.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`lw-parallax-item ${rowIndex === 1 && colIndices[1] === idx ? 'focused active' : ''}`}
                                                                    onClick={() => { setRowIndex(1); setColIndex(idx); }}
                                                                    style={{ backgroundImage: `url(${item.image})` }}
                                                                >
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button
                                                            className="lw-nav-btn right"
                                                            onClick={() => setColIndex(prev => Math.min(history.length - 1, prev + 1))}
                                                            disabled={colIndices[1] === history.length - 1}
                                                        >&gt;</button>
                                                    </div>

                                                    <div className="last-watched-divider"></div>

                                                    {focusedHistoryItem && (
                                                        <div className="last-watched-info">
                                                            <div className="lw-text-info">
                                                                <div className="lw-title">{focusedHistoryItem.title}</div>
                                                                <div className="lw-meta">Capítulo {String(focusedHistoryItem.episode).replace(/episodio/i, '').replace(/^ep\.?\s*/i, '').trim()} · {new Date(focusedHistoryItem.timestamp).toLocaleDateString()}</div>
                                                            </div>
                                                            <button
                                                                className={`lw-resume-btn ${rowIndex === 1 ? 'focused' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedAnime({
                                                                        title: focusedHistoryItem.title,
                                                                        url: focusedHistoryItem.animeUrl,
                                                                        source: focusedHistoryItem.source,
                                                                        image: focusedHistoryItem.image
                                                                    });
                                                                    openDetails({ url: focusedHistoryItem.animeUrl, source: focusedHistoryItem.source }, false);
                                                                    openServers(focusedHistoryItem.episodeUrl);
                                                                }}
                                                            >
                                                                Reanudar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="last-watched-bar empty">
                                                    <div className="lw-empty-text">No has visto ningún episodio recientemente</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="carousel-container mt-4 mb-10">
                                    <div className="section-header" style={{ justifyContent: 'flex-start' }}>
                                        <div className="title-marker-flat" style={{ marginRight: '10px' }}></div>
                                        <h2 className="section-title fw-bold" style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: 900 }}>FAVORITOS</h2>
                                    </div>
                                    <div
                                        className="carousel-wrapper"
                                        onTouchStart={(e) => handleTouchStart(e, 2)}
                                        onTouchEnd={(e) => handleTouchEnd(e, Math.max(0, favorites.length - 1))}
                                    >
                                        {favorites.length > 0 ? (
                                            <div className="carousel fav-carousel" style={{ transform: `translateX(-${colIndices[2] * 215}px)` }}>
                                                {favorites.map((anime, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`card fav-poster-card ${rowIndex === 2 && colIndices[2] === idx ? 'focused active' : ''}`}
                                                        style={{ backgroundImage: `url(${anime.image})` }}
                                                        onClick={() => { setRowIndex(2); setColIndex(idx); handleAnimeClick(anime); }}
                                                    >
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={`empty-favorites ${rowIndex === 2 ? 'focused' : ''}`} style={{ color: 'var(--text-color)' }}>
                                                <p>Tu lista de favoritos está vacía</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <BannerImages onExplore={() => loadCatalog(1)} />

                                <div className="recent-grid-section mt-10">
                                    <div className="section-header" style={{ justifyContent: 'flex-start' }}>
                                        <div className="title-marker-flat" style={{ marginRight: '10px' }}></div>
                                        <h2 className="section-title fw-bold" style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: 900 }}>ÚLTIMO AGREGADO</h2>
                                    </div>

                                    <div className="recent-anime-grid mt-4">
                                        {gridAnimes.length === 0 ? (
                                            Array.from({ length: 10 }).map((_, idx) => (
                                                <div key={idx} className="anime-card-v2">
                                                    <div className="anime-card-v2-img-container anime-card-skeleton"></div>
                                                    <div className="anime-card-skeleton-title"></div>
                                                </div>
                                            ))
                                        ) : gridAnimes.map((anime, idx) => {
                                            const isFocused = rowIndex === 3 && colIndex === idx;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`anime-card-v2 ${isFocused ? 'focused' : ''}`}
                                                    onClick={() => {
                                                        setRowIndex(3);
                                                        setColIndex(idx);
                                                        handleAnimeClick(anime);
                                                    }}
                                                >
                                                    <div className="anime-card-v2-img-container">
                                                        <img src={anime.image} alt={anime.title} className="anime-card-v2-img" />
                                                    </div>
                                                    <div className="anime-card-v2-title">
                                                        {anime.title}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === STATES.CATALOG && (
                            <div className="catalog-tab" style={{ padding: '20px 40px' }}>
                                <h2 className="section-title">
                                    <span className="title-marker"></span>
                                    {isSearchActive
                                        ? (searchQuery.trim() === '' ? 'Buscar anime' : `Resultados para "${searchQuery}"`)
                                        : 'Catálogo Completo'}
                                </h2>

                                {isSearchActive && searchQuery.trim() === '' ? (
                                    <div className="search-empty-container">
                                        <div className="search-empty-icon">
                                            <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                                            </svg>
                                        </div>
                                        <h3 className="search-empty-text">Busca tus animes favoritos</h3>
                                        <p className="search-empty-subtext">Escribe el nombre del anime en la barra superior</p>
                                    </div>
                                ) : isSearchActive && searchResults.length === 0 ? (
                                    <div className="search-empty-container">
                                        <div className="search-empty-icon">
                                            <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                            </svg>
                                        </div>
                                        <h3 className="search-empty-text">No se encontraron resultados para "{searchQuery}"</h3>
                                        <p className="search-empty-subtext">Intenta con palabras clave diferentes o verifica la ortografía</p>
                                    </div>
                                ) : catalogLoading ? (
                                    <div className="search-grid" style={{ marginTop: '20px' }}>
                                        {Array.from({ length: 24 }).map((_, idx) => (
                                            <div key={idx} className="anime-card-v2">
                                                <div className="anime-card-v2-img-container anime-card-skeleton"></div>
                                                <div className="anime-card-skeleton-title"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="search-grid" style={{ marginTop: '20px' }}>
                                        {(isSearchActive ? searchResults : catalogResults).map((anime, idx) => (
                                            <div
                                                key={idx}
                                                className={`anime-card-v2 ${searchIndex === idx && rowIndex !== -1 ? 'focused' : ''}`}
                                                onClick={() => handleAnimeClick(anime)}
                                            >
                                                <div className="anime-card-v2-img-container">
                                                    <img src={anime.image} alt={anime.title} className="anime-card-v2-img" />
                                                </div>
                                                <div className="anime-card-v2-title">{anime.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isSearchActive && (
                                    <div className="custom-pagination">
                                        {renderPagination().map((item, idx) => {
                                            if (item.type === 'ellipsis') {
                                                return <span key={idx} className="page-ellipsis">...</span>;
                                            }

                                            let onClick = () => { };
                                            if (!item.disabled) {
                                                if (item.type === 'page') onClick = () => loadCatalog(item.label);
                                                else if (item.type === 'first') onClick = () => loadCatalog(1);
                                                else if (item.type === 'prev') onClick = () => loadCatalog(catalogPage - 1);
                                                else if (item.type === 'next') onClick = () => loadCatalog(catalogPage + 1);
                                                else if (item.type === 'last') onClick = () => loadCatalog(TOTAL_CATALOG_PAGES);
                                            }

                                            const className = `page-btn ${item.type === 'page' && item.label === catalogPage ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`;

                                            return (
                                                <button key={idx} className={className} disabled={item.disabled} onClick={onClick}>
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {view === STATES.FAVORITES && (
                            <div className="catalog-tab" style={{ padding: '20px 40px' }}>
                                <h2 className="section-title">
                                    <span className="title-marker"></span>
                                    Mis Favoritos
                                </h2>

                                {favorites.length === 0 ? (
                                    <div className="search-empty-container">
                                        <div className="search-empty-icon">
                                            <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </div>
                                        <h3 className="search-empty-text">No tienes animes favoritos guardados</h3>
                                        <p className="search-empty-subtext">Agrega animes a tus favoritos desde la vista de detalles</p>
                                    </div>
                                ) : (
                                    <div className="search-grid" style={{ marginTop: '20px' }}>
                                        {favorites.map((anime, idx) => (
                                            <div
                                                key={idx}
                                                className={`anime-card-v2 ${searchIndex === idx && rowIndex !== -1 ? 'focused' : ''}`}
                                                onClick={() => handleAnimeClick(anime)}
                                            >
                                                <div className="anime-card-v2-img-container">
                                                    <img src={anime.image} alt={anime.title} className="anime-card-v2-img" />
                                                </div>
                                                <div className="anime-card-v2-title">{anime.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </main>

                    <div id="status">{status}</div>
                </div>
            )}

            {/* Modals */}
            {view === STATES.SERVER_MODAL && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <button
                                onClick={() => setPlayerMode(playerMode === 'interno' ? 'externo' : 'interno')}
                                className="text-white/50 hover:text-white text-2xl transition-colors p-2"
                                title="Cambiar reproductor"
                            >
                                ❮
                            </button>
                            <h2 className="m-0 text-xl font-bold flex flex-col items-center">
                                <span>Reproductores</span>
                                <span className="text-sm font-normal text-anime-primary mt-1">
                                    Modo {playerMode === 'interno' ? 'Interno' : 'Externo'}
                                </span>
                            </h2>
                            <button
                                onClick={() => setPlayerMode(playerMode === 'interno' ? 'externo' : 'interno')}
                                className="text-white/50 hover:text-white text-2xl transition-colors p-2"
                                title="Cambiar reproductor"
                            >
                                ❯
                            </button>
                        </div>
                        {(() => {
                            const filteredServers = servers ? servers.filter(s => playerMode === 'interno' ? s.canExtract : true) : [];
                            return filteredServers.length > 0 ? (
                                <div className="server-grid">
                                    {filteredServers.map((s, idx) => (
                                        <button key={idx} className="modal-btn flex items-center justify-center gap-2" onClick={() => playVideo(s, details?.title, playerMode === 'externo')}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            {s.title}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-servers">
                                    <div className="empty-servers-icon">
                                        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <p className="empty-servers-text">No hay servidores compatibles con este modo</p>
                                </div>
                            );
                        })()}
                        <button className="modal-btn" onClick={() => setView(details ? STATES.DETAILS : STATES.HOME)}>Atrás</button>
                    </div>
                </div>
            )}
            {view === STATES.DETAILS && details && (
                <div className={`persona-details-view ${showDescription ? 'desc-mode' : ''}`}>
                    {/* Diagonal split background */}
                    <div className="persona-bg-dark"></div>
                    <div className="persona-bg-yellow"></div>

                    {/* SVG overlay for accent lines & triangles matching mockup */}
                    <svg className="persona-svg-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                        {/* Normal mode: single straight diagonal */}
                        <g className="persona-svg-diagonal-group persona-svg-normal">
                            <line x1="180" y1="0" x2="700" y2="1000" stroke="var(--persona-bg-accent)" strokeWidth="8" />
                            <line x1="175" y1="0" x2="695" y2="1000" stroke="#000000" strokeWidth="4" />
                            <polygon points="165,0 195,0 180,35" fill="var(--persona-bg-accent)" stroke="#000" strokeWidth="3" />
                            <polygon points="950,1000 1000,1000 1000,930" fill="var(--persona-bg-accent)" stroke="#000" strokeWidth="3" />
                            <line x1="760" y1="0" x2="1000" y2="300" stroke="var(--persona-bg-accent)" strokeWidth="6" />
                        </g>

                        {/* Description mode: bent diagonal matching the desc-mode clip-path */}
                        <g className="persona-svg-diagonal-group persona-svg-desc">
                            <polyline points="860,0 390,620 100,1000" fill="none" stroke="var(--persona-bg-accent)" strokeWidth="8" />
                            <polyline points="855,0 385,620 95,1000" fill="none" stroke="#000000" strokeWidth="4" />
                            <polygon points="845,0 875,0 860,35" fill="var(--persona-bg-accent)" stroke="#000" strokeWidth="3" />
                            <polygon points="85,1000 115,1000 100,965" fill="var(--persona-bg-accent)" stroke="#000" strokeWidth="3" />
                        </g>
                    </svg>

                    {/* Top Right Header Controls (Search + Sort) to the left of Close (X) button */}
                    {!showDescription && (
                        <div className="persona-episodes-controls">
                            <input
                                type="text"
                                className="persona-ep-search-input"
                                placeholder="Buscar episodio..."
                                value={episodeSearchQuery}
                                onChange={(e) => {
                                    setEpisodeSearchQuery(e.target.value);
                                    setDetailsActiveIndex(0);
                                }}
                            />
                            <button
                                className={`persona-control-btn ${episodeSortOrder === 'asc' ? 'active' : ''}`}
                                onClick={() => setEpisodeSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                title="Ordenar episodios"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Close Button */}
                    <button className="persona-close-btn" onClick={goBack} title="Cerrar">✕</button>

                    {/* ── LEFT SECTION (YELLOW AREA) ── */}
                    <div className="persona-left-section">
                        {!showDescription ? (
                            <>
                                {/* Top Cover Card */}
                                <div className="persona-cover-container">
                                    <div className="persona-cover-card">
                                        <img src={details.cover} alt={details.title} className="persona-cover-img" />
                                    </div>
                                </div>

                                {/* Bottom Left: Title + Action Buttons */}
                                <div className="persona-bottom-info">
                                    <div className="persona-title-container">
                                        <h1 className="persona-anime-title">{details.title}</h1>
                                        {details.status && (
                                            <span className={`persona-status-tag ${details.status.toLowerCase().includes('finalizado') ? 'finalizado' : ''}`}>
                                                {details.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="persona-action-buttons">
                                        {/* Button 1: Toggle Description */}
                                        <button
                                            className="persona-btn-square"
                                            onClick={() => setShowDescription(true)}
                                            title="Ver descripción"
                                        >
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                            </svg>
                                        </button>

                                        {/* Button 2: Save to Favorites */}
                                        <button
                                            className={`persona-btn-square ${isAnimeFavorite(selectedAnime || details) ? 'active-fav' : ''}`}
                                            onClick={() => toggleFavorite(selectedAnime || details)}
                                            title="Guardar a favoritos"
                                        >
                                            {isAnimeFavorite(selectedAnime || details) ? '❤' : '♡'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (() => {
                            const isRelatedView = selectedRelatedIndex !== -1;
                            const displayedTitle = isRelatedView ? (relatedDetailsData?.title || '') : details.title;
                            const displayedSynopsis = isRelatedView ? (relatedDetailsData?.synopsis || 'Cargando...') : (details.synopsis || 'Sin descripción disponible.');
                            const displayedCover = isRelatedView ? (relatedDetailsData?.cover || details.cover) : details.cover;
                            const displayedEpisodesCount = isRelatedView
                                ? (relatedDetailsData?.episodesCount ?? null)
                                : (details.episodes ? details.episodes.length : null);

                            return (
                                /* Description View: texto sobre el amarillo (sin portada, sin caja negra) */
                                <div className="persona-desc-view">
                                    <div className="persona-desc-top-row">
                                        <div className="persona-desc-text-block">
                                            <h2 className="persona-desc-anime-title">{displayedTitle}</h2>

                                            {!isRelatedView && details.genres && details.genres.length > 0 && (
                                                <div className="persona-genres-list">
                                                    {details.genres.map((g, idx) => (
                                                        <span key={idx} className="persona-genre-pill">{g}</span>
                                                    ))}
                                                </div>
                                            )}

                                            <p className={`persona-desc-synopsis ${relatedDetailsLoading && isRelatedView ? 'loading' : ''}`}>
                                                {displayedSynopsis}
                                            </p>

                                            <span className="persona-desc-episodes-count">
                                                Capítulos: {displayedEpisodesCount !== null ? displayedEpisodesCount : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="persona-bottom-info">
                                        <div className="persona-title-container"></div>
                                        <div className="persona-action-buttons">
                                            {/* Button 1: Toggle back to Cover & Title */}
                                            <button
                                                className="persona-btn-square active"
                                                onClick={() => {
                                                    setShowDescription(false);
                                                    handleBackToSelf();
                                                }}
                                                title="Volver a la portada"
                                            >
                                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                                </svg>
                                            </button>

                                            {/* Button 2: Favorites */}
                                            <button
                                                className={`persona-btn-square ${isAnimeFavorite(selectedAnime || details) ? 'active-fav' : ''}`}
                                                onClick={() => toggleFavorite(selectedAnime || details)}
                                                title="Guardar a favoritos"
                                            >
                                                {isAnimeFavorite(selectedAnime || details) ? '❤' : '♡'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* ── RIGHT SECTION (DARK AREA - DIAGONAL CHAPTER ROW) ── */}
                    <div className="persona-right-section">

                        {/* Diagonal 5-Card Episode Carousel Wheel */}
                        {!showDescription && (
                            <div
                                className="persona-diagonal-episodes-container"
                                ref={episodesRowRef}
                                onWheel={(e) => {
                                    const now = Date.now();
                                    if (now - lastWheelTime.current < 90) return;
                                    lastWheelTime.current = now;

                                    const filtered = (details.episodes || [])
                                        .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))
                                        .sort((a, b) => {
                                            const numA = parseFloat(a.episode);
                                            const numB = parseFloat(b.episode);
                                            return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                                        });

                                    if (e.deltaY > 0) {
                                        setDetailsActiveIndex(prev => Math.min(filtered.length - 1, prev + 1));
                                    } else if (e.deltaY < 0) {
                                        setDetailsActiveIndex(prev => Math.max(0, prev - 1));
                                    }
                                }}
                            >
                                {(() => {
                                    const filteredEpisodes = (details.episodes || [])
                                        .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))
                                        .sort((a, b) => {
                                            const numA = parseFloat(a.episode);
                                            const numB = parseFloat(b.episode);
                                            return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                                        });

                                    if (filteredEpisodes.length === 0) {
                                        return (
                                            <div className="no-episodes-found" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                                No se encontraron episodios
                                            </div>
                                        );
                                    }

                                    const offsets = [-2, -1, 0, 1, 2];

                                    return offsets.map(offset => {
                                        const actualIdx = detailsActiveIndex + offset;
                                        if (actualIdx < 0 || actualIdx >= filteredEpisodes.length) return null;

                                        const ep = filteredEpisodes[actualIdx];
                                        const isFocused = offset === 0;
                                        const epThumb = ep.image || details.backdrop || details.cover;
                                        const animeUrl = selectedAnime?.url || details?.url || '';
                                        const watched = isEpisodeWatched(animeUrl, ep.episode);

                                        // Wide diagonal sweep aligned with right-shifted dark inclination (34% -> 74%)
                                        const translateY = `calc(${offset} * clamp(125px, 16vh, 190px))`;
                                        const translateX = `calc(clamp(140px, 11vw, 210px) + ${offset} * clamp(100px, 8.5vw, 155px))`;
                                        const scale = isFocused ? 1.06 : (Math.abs(offset) === 1 ? 0.92 : 0.80);
                                        const opacity = isFocused ? 1 : (Math.abs(offset) === 1 ? 0.65 : 0.25);
                                        const zIndex = isFocused ? 10 : (Math.abs(offset) === 1 ? 5 : 2);

                                        return (
                                            <div
                                                key={ep.url || ep.episode || actualIdx}
                                                className={`persona-ep-card ${isFocused ? 'focused' : ''} ${watched ? 'watched-ep' : ''}`}
                                                style={{
                                                    transform: `translate(${translateX}, ${translateY}) scale(${scale})`,
                                                    opacity: opacity,
                                                    zIndex: zIndex
                                                }}
                                                onClick={() => {
                                                    if (isFocused) {
                                                        markEpisodeWatched(animeUrl, ep.episode, details);
                                                        openServers(ep.url);
                                                    } else {
                                                        setDetailsActiveIndex(actualIdx);
                                                    }
                                                }}
                                            >
                                                <div className="persona-ep-thumb-box">
                                                    <img
                                                        src={epThumb}
                                                        className="persona-ep-thumb"
                                                        alt={`Episodio ${ep.episode}`}
                                                        onError={(e) => {
                                                            if (e.target.src !== details.cover) {
                                                                e.target.src = details.cover;
                                                            }
                                                        }}
                                                    />
                                                    {watched && (
                                                        <div
                                                            className="persona-ep-watched-check"
                                                            title="Marcar como no visto"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleEpisodeWatched(e, animeUrl, ep.episode);
                                                            }}
                                                        >
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="persona-ep-info">
                                                    <div className="persona-ep-title">Capítulo {ep.episode}</div>
                                                    <div className="persona-ep-lines">
                                                        <div className="persona-ep-line"></div>
                                                        <div className="persona-ep-line short"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        {/* Diagonal Related Anime Carousel (shown in description mode) */}
                        {showDescription && (
                            <div
                                className="persona-diagonal-related-container"
                                onWheel={(e) => {
                                    const now = Date.now();
                                    if (now - lastWheelTime.current < 90) return;
                                    lastWheelTime.current = now;

                                    const relatedList = details.related || [];

                                    if (e.deltaY > 0) {
                                        setRelatedActiveIndex(prev => Math.min(relatedList.length - 1, prev + 1));
                                    } else if (e.deltaY < 0) {
                                        setRelatedActiveIndex(prev => Math.max(0, prev - 1));
                                    }
                                }}
                            >
                                {(() => {
                                    const relatedList = details.related || [];

                                    if (relatedList.length === 0) {
                                        return (
                                            <div className="no-episodes-found" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                                No hay animes relacionados
                                            </div>
                                        );
                                    }

                                    const offsets = [-2, -1, 0, 1, 2];

                                    return offsets.map(offset => {
                                        const actualIdx = relatedActiveIndex + offset;
                                        if (actualIdx < 0 || actualIdx >= relatedList.length) return null;

                                        const item = relatedList[actualIdx];
                                        const isFocused = offset === 0;
                                        const isSelected = selectedRelatedIndex === actualIdx;
                                        const itemThumb = item.image || details.backdrop || details.cover;

                                        // Inverted horizontal direction vs the normal episodes carousel:
                                        // items above (negative offset) shift right, items below (positive offset) shift left.
                                        const translateY = `calc(${offset} * clamp(125px, 16vh, 190px))`;
                                        const translateX = `calc(clamp(40px, 5vw, 90px) - 200px + ${-offset} * clamp(80px, 7vw, 130px))`;
                                        const scale = isFocused ? 1.06 : (Math.abs(offset) === 1 ? 0.92 : 0.80);
                                        const opacity = isFocused ? 1 : (Math.abs(offset) === 1 ? 0.65 : 0.25);
                                        const zIndex = isFocused ? 10 : (Math.abs(offset) === 1 ? 5 : 2);

                                        return (
                                            <div
                                                key={item.url || item.title || actualIdx}
                                                className={`persona-ep-card ${isFocused ? 'focused' : ''} ${isSelected ? 'watched-ep' : ''}`}
                                                style={{
                                                    transform: `translate(${translateX}, ${translateY}) scale(${scale})`,
                                                    opacity: opacity,
                                                    zIndex: zIndex
                                                }}
                                                onClick={() => {
                                                    if (isFocused) {
                                                        handleSelectRelated(item, actualIdx);
                                                    } else {
                                                        setRelatedActiveIndex(actualIdx);
                                                    }
                                                }}
                                            >
                                                <div className="persona-ep-thumb-box">
                                                    <img
                                                        src={itemThumb}
                                                        className="persona-ep-thumb"
                                                        alt={item.title}
                                                        onError={(e) => {
                                                            if (e.target.src !== details.cover) {
                                                                e.target.src = details.cover;
                                                            }
                                                        }}
                                                    />
                                                    {isSelected && (
                                                        <div className="persona-ep-watched-check" title="Viendo esta info">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="persona-ep-info">
                                                    <div className="persona-ep-title">{item.title}</div>
                                                    <div className="persona-ep-lines">
                                                        <div className="persona-ep-line"></div>
                                                        <div className="persona-ep-line short"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}



            {isExtensionsModalOpen && (
                <div
                    className="modal-overlay modmail-overlay"
                    style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                    onClick={(e) => e.target.classList.contains('modmail-overlay') && setIsExtensionsModalOpen(false)}
                >
                    <div className="modmail-svg-wrap" role="dialog" aria-modal="true" aria-label="Selector de módulos">
                        <svg className="modmail-svg" width="866" height="1084" viewBox="0 0 866 1084" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Tilted card silhouette */}
                            <rect width="858.226" height="1240.87" transform="matrix(0.986892 0.161383 -0.195072 0.980789 246.483 -197.766)" fill="#1F1F1F" />
                            <rect x="10.2028" y="12.5106" width="764.838" height="1075.81" transform="matrix(0.995594 0.0937744 -0.108396 0.994108 167.837 -90.3835)" stroke="white" strokeWidth="23" />

                            {/* HTML content, warped to match the tilted frame exactly */}
                            <foreignObject x="10.2028" y="12.5106" width="764.838" height="1075.81" transform="matrix(0.995594 0.0937744 -0.108396 0.994108 167.837 -90.3835)">
                                <div xmlns="http://www.w3.org/1999/xhtml" className="modmail-content">

                                    {/* Header — like "休日 | Day off" + "TODAY's NewMail" */}
                                    <div className="modmail-header">
                                        <div className="modmail-chip" style={{ background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 55%, red))` }}>
                                            <span className="modmail-chip-main">MÓDULOS</span>
                                            <span className="modmail-chip-div"></span>
                                            <span className="modmail-chip-sub">Selecciona uno</span>
                                        </div>
                                        <div className="modmail-heading2">
                                            <span className="modmail-heading2-top">TUS</span>
                                            <span className="modmail-heading2-main">MÓDULOS</span>
                                            <div className="modmail-heading2-flag" style={{ background: 'var(--primary-color)' }}></div>
                                        </div>
                                    </div>

                                    {/* Module list — mail-style entries */}
                                    <div className="modmail-list">
                                        {EXTENSIONS.map((ext, extIndex) => {
                                            const isActive = currentSource === ext.id;
                                            const isFocused = moduleModalIndex === extIndex;
                                            return (
                                                <div
                                                    key={ext.id}
                                                    className={`modmail-item ${isActive ? 'modmail-item-active' : ''} ${isFocused ? 'modmail-item-focused' : ''}`}
                                                    onClick={() => selectSource(ext.id)}
                                                    onMouseEnter={() => setModuleModalIndex(extIndex)}
                                                    style={{
                                                        background: isActive ? 'rgba(255, 255, 255, 0.9)' : '#161616',
                                                        borderRadius: '8px',
                                                        boxShadow: isActive ? `8px 8px 0px 0px var(--primary-color)` : '4px 4px 0px 0px #080808',
                                                        outline: isFocused ? `3px solid var(--primary-color)` : 'none',
                                                        outlineOffset: isFocused ? '2px' : '0',
                                                        transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                                                        transition: 'transform 0.15s ease, outline 0.15s ease'
                                                    }}
                                                >
                                                    {!isActive && <div className="modmail-item-flag">!</div>}
                                                    <div className="modmail-item-main">
                                                        <div className="modmail-item-topbar" style={{ borderColor: isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.25)' }}>
                                                            {isActive && <span className="modmail-item-tag" style={{ color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>ACTIVO</span>}
                                                            <span className="modmail-item-name" style={{ color: isActive ? '#1f1f1f' : 'rgba(255,255,255,0.9)' }}>{ext.name}</span>
                                                            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <circle cx="12" cy="12" r="9" stroke={isActive ? 'var(--primary-color)' : '#fff'} strokeWidth="1.5" />
                                                                <ellipse cx="12" cy="12" rx="3.8" ry="9" stroke={isActive ? 'var(--primary-color)' : '#fff'} strokeWidth="1.1" opacity="0.85" />
                                                                <line x1="3" y1="12" x2="21" y2="12" stroke={isActive ? 'var(--primary-color)' : '#fff'} strokeWidth="1.1" opacity="0.85" />
                                                            </svg>
                                                        </div>
                                                        <div className="modmail-item-message" style={{ color: isActive ? '#202020' : 'rgba(255, 255, 255, 0.9)' }}>
                                                            {isActive ? 'Módulo activo ahora mismo' : 'Toca para cambiar de módulo…'}
                                                        </div>
                                                    </div>
                                                    <div className="modmail-item-avatar" style={{ background: `${ext.color}26`, borderColor: ext.color }}>
                                                        {/* agregar icono aquí. */}
                                                        <img src={ext.iconWeb} alt={ext.name} style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer control hints */}
                                    <div className="modmail-footer">
                                        <span className="modmail-footer-hint">
                                            <span className="modmail-footer-key">A</span> Activar
                                        </span>
                                        <span className="modmail-footer-hint" onClick={() => setView(previousView)}>
                                            <span className="modmail-footer-key">B</span> Cerrar
                                        </span>
                                    </div>

                                </div>
                            </foreignObject>
                        </svg>
                    </div>
                </div>
            )}

            {/* Settings Panel */}
            {isSettingsOpen && (
                <div
                    className="settings-panel-overlay"
                    onClick={(e) => e.target.className === 'settings-panel-overlay' && setIsSettingsOpen(false)}
                >
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2 className="settings-panel-title">Ajustes</h2>
                            <button className="settings-close-btn" onClick={() => setIsSettingsOpen(false)}>✕</button>
                        </div>

                        <div className="settings-section-label">Tema de color</div>
                        <div className="theme-grid">
                            {/* Tema Cyber */}
                            <div
                                className={`theme-card ${theme === 'cyber' ? 'active' : ''}`}
                                style={{ background: theme === 'cyber' ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)', borderColor: theme === 'cyber' ? '#00E5FF' : 'rgba(255,255,255,0.08)' }}
                                onClick={() => setTheme('cyber')}
                            >
                                {theme === 'cyber' && <div className="theme-active-badge">✓</div>}
                                <div className="theme-card-preview" style={{ background: '#141416' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#00E5FF' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#00E5FF', opacity: 0.7 }}></div>
                                </div>
                                <div className="theme-card-name">Cyber</div>
                                <div className="theme-card-desc">Cyan · Oscuro frío</div>
                            </div>

                            {/* Tema Ember */}
                            <div
                                className={`theme-card ${theme === 'ember' ? 'active' : ''}`}
                                style={{ background: theme === 'ember' ? 'rgba(184,74,50,0.12)' : 'rgba(255,255,255,0.04)', borderColor: theme === 'ember' ? '#b84a32' : 'rgba(255,255,255,0.08)' }}
                                onClick={() => setTheme('ember')}
                            >
                                {theme === 'ember' && <div className="theme-active-badge" style={{ background: '#b84a32' }}>✓</div>}
                                <div className="theme-card-preview" style={{ background: '#1c1714' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#b84a32' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(232,213,181,0.2)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(232,213,181,0.12)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#b84a32', opacity: 0.85 }}></div>
                                </div>
                                <div className="theme-card-name">Ember</div>
                                <div className="theme-card-desc">Óxido · Negro cálido</div>
                            </div>

                            {/* Tema Glitch */}
                            <div
                                className={`theme-card ${theme === 'glitch' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'glitch' ? 'rgba(77,45,255,0.14)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'glitch' ? '#4d2dff' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('glitch')}
                            >
                                {theme === 'glitch' && (
                                    <div className="theme-active-badge" style={{ background: '#4d2dff' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#0a0a0a' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#4d2dff' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#c8ff00', opacity: 0.9 }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 26, width: 6, height: 14, borderRadius: 2, background: '#4d2dff', opacity: 0.8 }}></div>
                                </div>
                                <div className="theme-card-name">Glitch</div>
                                <div className="theme-card-desc">Violeta · Negro puro</div>
                            </div>

                            {/* Tema Crimson */}
                            <div
                                className={`theme-card ${theme === 'crimson' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'crimson' ? 'rgba(212,22,60,0.12)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'crimson' ? '#d4163c' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('crimson')}
                            >
                                {theme === 'crimson' && (
                                    <div className="theme-active-badge" style={{ background: '#d4163c' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#111113' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#d4163c' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(232,221,234,0.15)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(232,221,234,0.08)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#d4163c', opacity: 0.9 }}></div>
                                </div>
                                <div className="theme-card-name">Crimson</div>
                                <div className="theme-card-desc">Rojo · Negro grafito</div>
                            </div>

                            {/* Tema Aqua */}
                            <div
                                className={`theme-card ${theme === 'aqua' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'aqua' ? 'rgba(39,233,181,0.1)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'aqua' ? '#27e9b5' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('aqua')}
                            >
                                {theme === 'aqua' && (
                                    <div className="theme-active-badge" style={{ background: '#27e9b5', color: '#051824' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#051824' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#27e9b5' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#27e9b5', opacity: 0.9 }}></div>
                                </div>
                                <div className="theme-card-name">Aqua</div>
                                <div className="theme-card-desc">Menta · Azul marino</div>
                            </div>

                            {/* Tema Nova */}
                            <div
                                className={`theme-card ${theme === 'green' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'green' ? 'rgba(33, 237, 169, 0.12)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'green' ? '#21ed76' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('green')}
                            >
                                {theme === 'green' && (
                                    <div className="theme-active-badge" style={{ background: '#21ed76' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#111419' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#21ed76' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#21ed76', opacity: 0.9 }}></div>
                                </div>
                                <div className="theme-card-name">Green</div>
                                <div className="theme-card-desc">Verde · Negro azulado</div>
                            </div>

                            {/* Tema Golden */}
                            <div
                                className={`theme-card ${theme === 'golden' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'golden' ? 'rgba(255,201,14,0.12)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'golden' ? '#FFC90E' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('golden')}
                            >
                                {theme === 'golden' && (
                                    <div className="theme-active-badge" style={{ background: '#FFC90E' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#1f1f1f' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#FFC90E' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#FFC90E', opacity: 0.9 }}></div>
                                </div>
                                <div className="theme-card-name">Golden</div>
                                <div className="theme-card-desc">Dorado · Negro cálido</div>
                            </div>

                            {/* Tema Blueprint */}
                            <div
                                className={`theme-card ${theme === 'blueprint' ? 'active' : ''}`}
                                style={{
                                    background: theme === 'blueprint' ? 'rgba(74,108,247,0.1)' : 'rgba(255,255,255,0.04)',
                                    borderColor: theme === 'blueprint' ? '#4a6cf7' : 'rgba(255,255,255,0.08)'
                                }}
                                onClick={() => setTheme('blueprint')}
                            >
                                {theme === 'blueprint' && (
                                    <div className="theme-active-badge" style={{ background: '#4a6cf7' }}>✓</div>
                                )}
                                <div className="theme-card-preview" style={{ background: '#f0ede6' }}>
                                    <div style={{ position: 'absolute', top: 8, left: 10, width: 28, height: 3, borderRadius: 2, background: '#4a6cf7' }}></div>
                                    <div style={{ position: 'absolute', top: 16, left: 10, width: 50, height: 2, borderRadius: 2, background: 'rgba(26,31,78,0.2)' }}></div>
                                    <div style={{ position: 'absolute', top: 22, left: 10, width: 38, height: 2, borderRadius: 2, background: 'rgba(26,31,78,0.12)' }}></div>
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderRadius: 3, background: '#4a6cf7', opacity: 0.85 }}></div>
                                </div>
                                <div className="theme-card-name" style={{ color: 'white' }}>Blueprint</div>
                                <div className="theme-card-desc">Azul · Fondo claro</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === STATES.PLAYER && (
                <div id="player-overlay" className="fixed inset-0 z-[100] bg-black">
                    <VideoPlayer
                        src={playerUrl}
                        isDirect={isDirectStream}
                        title={`${details?.title} - Servidor: ${details?.currentServer?.title}`}
                        subtitles={playerSubtitles}
                        episodes={details?.episodes}
                        currentEpisodeIndex={detailsActiveIndex}
                        episodeSortOrder={episodeSortOrder}
                        animeUrl={selectedAnime?.url || details?.url || ''}
                        isEpisodeWatched={isEpisodeWatched}
                        markEpisodeWatched={markEpisodeWatched}
                        onPlayEpisodeIndex={(idx) => {
                            if (details?.episodes && details.episodes[idx]) {
                                const ep = details.episodes[idx];
                                setDetailsActiveIndex(idx);
                                markEpisodeWatched(selectedAnime?.url || details?.url || '', ep.episode, details);
                                openServers(ep.url);
                            }
                        }}
                        onBack={() => setView(STATES.SERVER_MODAL)}
                        onEnded={() => {
                            console.log("Video ended");
                            // Logic for next episode could go here
                        }}
                    />
                </div>
            )}

            {/* Global Game-style screen transition wipe overlay */}
            {isGameWipeActive && (
                <div className={`persona-game-wipe direction-${wipeDirection}`} key={wipeKey}>
                    <div className="persona-wipe-curtain">
                        <div className="persona-wipe-layer layer-dark"></div>
                        <div className="persona-wipe-layer layer-yellow"></div>
                        <div className="persona-wipe-layer layer-red"></div>
                        <div className="persona-wipe-layer layer-cyan"></div>
                        <div className="persona-wipe-layer layer-main"></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;