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
    CATALOG: 'CATALOG'
};

const EXTENSIONS = [
    { id: 'animeflv', name: 'AnimeFLV', icon: 'AF', color: '#ff8a00' },
    { id: 'animeav1', name: 'AnimeAV1', icon: 'A1', color: '#6366f1' },
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
    const [activeProfile, setActiveProfile] = useState(null);
    const [editingProfile, setEditingProfile] = useState(null);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [view, setView] = useState(STATES.PROFILES);
    const [expandedSynopsis, setExpandedSynopsis] = useState(false);
    const [currentSource, setCurrentSource] = useState('animeflv');
    const [latest, setLatest] = useState([]);
    const [gridAnimes, setGridAnimes] = useState([]); // First 24 from catalog for the home grid
    const [catalogResults, setCatalogResults] = useState([]);
    const [catalogPage, setCatalogPage] = useState(1);
    const [favorites, setFavorites] = useState([]);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [details, setDetails] = useState(null);
    const [servers, setServers] = useState([]);
    const [playerUrl, setPlayerUrl] = useState('');
    const [playerSubtitles, setPlayerSubtitles] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('');
    const [clock, setClock] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    const [previousView, setPreviousView] = useState(STATES.HOME);

    // News API states
    const [newsApiKey, setNewsApiKey] = useState(() => localStorage.getItem('news_api_key') || '');
    const [newsArticles, setNewsArticles] = useState([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState('');

    // Navigation state for "spatial" focus simulation
    const [rowIndex, setRowIndex] = useState(0); // -1: Header, 0: Latest, 1: Favorites, 2: Recent Grid, 3: News
    const [colIndices, setColIndices] = useState({ '-1': 0, 0: 0, 1: 0, 2: 0, 3: 0 });
    const colIndex = colIndices[rowIndex] || 0;

    const setColIndex = (updater) => {
        setColIndices(prev => ({
            ...prev,
            [rowIndex]: typeof updater === 'function' ? updater(prev[rowIndex]) : updater
        }));
    };

    const touchStartX = useRef(null);
    const searchDebounceRef = useRef(null);
    const [isSearchActive, setIsSearchActive] = useState(false); // true: barra de búsqueda expandida en el header
    const [searchIndex, setSearchIndex] = useState(-1); // -1: input focused
    const [detailsActiveIndex, setDetailsActiveIndex] = useState(0);
    const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
    const [isEpisodeSearchVisible, setIsEpisodeSearchVisible] = useState(false);
    const [episodeSortOrder, setEpisodeSortOrder] = useState('desc');

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
        if (view !== STATES.EXTENSIONS_MODAL) {
            setPreviousView(view);
        }
    }, [view]);

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
            const data = await api.fetchCatalog(1, source);
            setGridAnimes(data.slice(0, 24));
        } catch (e) {
            console.error('Error al cargar grid de animes:', e);
        }
    };

    const handleAnimeClick = (anime) => {
        setSelectedAnime(anime);
        openDetails(anime); // Skip ACTION_MODAL
    };

    const openDetails = async (anime) => {
        setStatus('Cargando detalles...');
        try {
            const animeSource = anime.source || currentSource;
            setCurrentSource(animeSource);
            const data = await api.fetchDetails(anime.url, animeSource);
            setDetails(data);
            setView(STATES.DETAILS);
            setDetailsActiveIndex(0);
            setEpisodeSearchQuery('');
            setIsEpisodeSearchVisible(false);
            setEpisodeSortOrder('desc');
            setStatus('');
        } catch (e) {
            setStatus('Error al cargar detalles.');
        }
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

    const playVideo = async (server, animeTitle = '') => {
        setStatus('Resolviendo enlace de video...');
        setDetails(prev => ({ ...prev, currentServer: server, animeTitle: animeTitle }));

        try {
            const extracted = await api.extractStream(server.code);
            if (extracted && extracted.streamUrl) {
                setPlayerUrl(extracted.streamUrl);
                setPlayerSubtitles(extracted.subtitles || []);
                console.log("Enlace resuelto desde backend:", extracted.streamUrl);
            } else {
                throw new Error("Extracción fallida");
            }
        } catch (e) {
            console.log("Usando iframe como fallback para:", server.code);
            setPlayerUrl(server.code);
            setPlayerSubtitles([]);
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

    const toggleFavorite = (anime) => {
        if (!activeProfile) return;

        const isFav = activeProfile.favorites.some(f => f.url === anime.url);
        let newProfileFavorites;

        if (isFav) {
            newProfileFavorites = activeProfile.favorites.filter(f => f.url !== anime.url);
        } else {
            newProfileFavorites = [
                {
                    title: anime.title,
                    url: anime.url,
                    image: anime.image || anime.cover,
                    source: currentSource
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

        if (isSearchActive) {
            setView(STATES.CATALOG);
        } else if (previousView === STATES.CATALOG) {
            loadCatalog(1, sourceId);
        } else {
            setView(STATES.HOME);
            loadLatest(sourceId);
            loadGridAnimes(sourceId);
        }
    };

    const loadCatalog = async (page = 1, source = currentSource) => {
        deactivateSearch();
        setStatus('Cargando catálogo...');
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
        }
    };

    const goBack = () => {
        if (view === STATES.PLAYER) setView(STATES.SERVER_MODAL);
        else if (view === STATES.SERVER_MODAL) setView(details ? STATES.DETAILS : STATES.HOME);
        else if (view === STATES.DETAILS) setView(catalogResults.length > 0 && view !== STATES.HOME ? STATES.CATALOG : STATES.HOME);
        else if (view === STATES.CATALOG && isSearchActive) { deactivateSearch(); setView(STATES.HOME); }
        else if (view === STATES.CATALOG) setView(STATES.HOME);
        else if (view === STATES.EXTENSIONS_MODAL) setView(previousView);
        else if (view === STATES.HOME) setView(STATES.PROFILES);
    };

    // Keyboard navigation simulation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') goBack();

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
                if (e.key === 'ArrowRight') setColIndex(prev => Math.min(prev + 1, profiles.length));
                if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                if (e.key === 'Enter') {
                    if (colIndex === profiles.length) addUser();
                    else selectProfile(profiles[colIndex]);
                }
            } else if (view === STATES.HOME) {
                if (e.key === 'ArrowRight') {
                    let maxCol = 0;
                    if (rowIndex === -1) maxCol = 3;
                    else if (rowIndex === 0) maxCol = latest.length; // including "Ver Catálogo" card
                    else if (rowIndex === 1) maxCol = Math.max(0, favorites.length - 1);
                    else if (rowIndex === 2) maxCol = Math.max(0, Math.min(23, gridAnimes.length - 1));
                    else if (rowIndex === 3) maxCol = Math.max(0, newsArticles.length - 1);
                    setColIndex(prev => Math.min(prev + 1, maxCol));
                }
                if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                if (e.key === 'ArrowDown') {
                    if (rowIndex === -1) {
                        setRowIndex(0);
                    } else if (rowIndex === 0) {
                        setRowIndex(1);
                    } else if (rowIndex === 1) {
                        setRowIndex(2);
                        setColIndex(0);
                    } else if (rowIndex === 2) {
                        const listLength = Math.min(24, gridAnimes.length);
                        const cols = 5; // grid has 5 columns
                        if (colIndex + cols < listLength) {
                            setColIndex(prev => prev + cols);
                        } else {
                            setRowIndex(3);
                            // Mantener una columna similar visualmente en noticias
                            setColIndex(Math.min(colIndex % cols, Math.max(0, newsArticles.length - 1)));
                        }
                    }
                }
                if (e.key === 'ArrowUp') {
                    if (rowIndex === 3) {
                        setRowIndex(2);
                        const listLength = Math.min(24, gridAnimes.length);
                        const cols = 5;
                        // Apuntar a la última fila del grid manteniendo la columna
                        const lastRowStartIndex = Math.floor((listLength - 1) / cols) * cols;
                        const targetIndex = lastRowStartIndex + Math.min(colIndex, cols - 1);
                        setColIndex(targetIndex < listLength ? targetIndex : listLength - 1);
                    } else if (rowIndex === 2) {
                        if (colIndex >= 5) {
                            setColIndex(prev => prev - 5);
                        } else {
                            setRowIndex(1);
                            setColIndex(Math.min(colIndex, Math.max(0, favorites.length - 1)));
                        }
                    } else if (rowIndex === 1) {
                        setRowIndex(0);
                    } else if (rowIndex === 0) {
                        setRowIndex(-1);
                    }
                }
                if (e.key === 'Enter') {
                    if (rowIndex === -1) {
                        if (colIndex === 0) setView(STATES.HOME);
                        else if (colIndex === 1) loadCatalog(1);
                        else if (colIndex === 2) activateSearch();
                        else if (colIndex === 3) setView(STATES.EXTENSIONS_MODAL);
                    }
                    else if (rowIndex === 3) {
                        const article = newsArticles[colIndex];
                        if (article) {
                            const { shell } = window.require('electron');
                            shell.openExternal(article.url);
                        }
                    }
                    else if (rowIndex === 2) {
                        if (gridAnimes[colIndex]) {
                            handleAnimeClick(gridAnimes[colIndex]);
                        }
                    }
                    else {
                        const list = rowIndex === 0 ? latest : favorites;
                        if (rowIndex === 0 && colIndex === latest.length) {
                            loadCatalog(1);
                        } else if (list[colIndex]) {
                            handleAnimeClick(list[colIndex]);
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
                        else if (colIndex === 3) setView(STATES.EXTENSIONS_MODAL);
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
            } else if (view === STATES.DETAILS && details) {
                const filteredEpisodes = (details.episodes || [])
                    .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))
                    .sort((a, b) => {
                        const numA = parseFloat(a.episode);
                        const numB = parseFloat(b.episode);
                        return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                    });

                if (e.key === 'ArrowRight') {
                    setDetailsActiveIndex(prev => Math.min(prev + 1, filteredEpisodes.length - 1));
                }
                if (e.key === 'ArrowLeft') {
                    setDetailsActiveIndex(prev => Math.max(prev - 1, 0));
                }
                if (e.key === 'ArrowDown') {
                    setDetailsActiveIndex(prev => Math.min(prev + 5, filteredEpisodes.length - 1));
                }
                if (e.key === 'ArrowUp') {
                    setDetailsActiveIndex(prev => Math.max(prev - 5, 0));
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
    }, [view, colIndex, rowIndex, searchIndex, latest, favorites, searchResults, catalogResults, profiles, detailsActiveIndex, episodeSearchQuery, episodeSortOrder, details]);

    // Cinematic scroll to follow focus
    useEffect(() => {
        if (![STATES.HOME, STATES.CATALOG, STATES.PROFILES, STATES.DETAILS].includes(view)) return;

        const timeout = setTimeout(() => {
            const activeEl = document.querySelector('.focused, .large-card.expanded');
            if (activeEl) {
                const rect = activeEl.getBoundingClientRect();
                const targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
                window.scrollTo({ top: targetY, behavior: 'smooth' });
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [rowIndex, colIndex, searchIndex, view]);

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
                    box-shadow: 0 4px 20px rgba(0,229,255,0.25);
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

                /* Móvil: apilar columnas */
                @media (max-width: 760px) {
                    .details-view {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        padding: 30px 20px 40px !important;
                        gap: 24px !important;
                    }
                    .details-view .details-left {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        align-items: center;
                        overflow-y: visible;
                        max-height: none;
                    }
                    .details-view .details-cover {
                        max-width: 220px;
                    }
                    .details-view .details-right {
                        width: 100% !important;
                        padding-right: 0 !important;
                    }
                    .details-title {
                        font-size: 1.7rem;
                        text-align: center;
                    }
                    .episodes-row-wrapper {
                        margin-top: 18px;
                        width: 100%;
                    }
                    .episodes-row-wrapper .episodes-header-container {
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    .episodes-row .episode-card,
                    .episodes-row .episode-thumbnail-container {
                        width: 130px;
                    }
                    .episodes-section-title {
                        font-size: 1rem;
                    }
                }

                @media (max-width: 420px) {
                    #app-container {
                        padding: 20px 16px !important;
                    }
                    .episodes-row .episode-card,
                    .episodes-row .episode-thumbnail-container {
                        width: 110px;
                    }
                    .search-bar-expandable.expanded {
                        width: 200px;
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
                <div className="profiles-screen" style={{ backgroundImage: profiles[colIndex]?.background ? `url(${profiles[colIndex].background})` : 'none' }}>
                    <h1 className="profiles-title">¿Quién está viendo?</h1>
                    <div className="profiles-container">
                        {profiles.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`profile-card ${colIndex === idx ? 'focused' : ''}`}
                                onClick={() => selectProfile(p)}
                            >
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

                    <button className="edit-floating-btn" onClick={() => { setIsCreatingProfile(false); setEditingProfile(profiles[colIndex] || profiles[0]); }}>✎</button>

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
                    <header>
                        <div className="header-left">
                            <div className="header-user" onClick={() => changeAvatar(activeProfile.id)}>
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
                                onClick={() => setView(STATES.EXTENSIONS_MODAL)}
                            >   </div>

                            <div className="source-indicator" onClick={() => setView(STATES.EXTENSIONS_MODAL)}>
                                <div className="source-circle" style={{ backgroundColor: EXTENSIONS.find(e => e.id === currentSource)?.color }}>
                                    {EXTENSIONS.find(e => e.id === currentSource)?.icon}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main>
                        {view === STATES.HOME && (
                            <>
                                <div className="carousel-container">
                                    <div
                                        className="carousel-wrapper"
                                        onTouchStart={(e) => handleTouchStart(e, 0)}
                                        onTouchEnd={(e) => handleTouchEnd(e, latest.length)}
                                    >
                                        <h2 className="section-title"><span className="title-marker"></span>Ultimos episodios</h2>
                                        <div className="carousel" style={{ position: 'relative', transform: `translateX(-${colIndices[0] * 465}px)` }}>
                                            <div
                                                className={`dynamic-card-glow ${rowIndex === 0 ? 'active' : ''}`}
                                                style={{
                                                    transform: `translateX(${colIndices[0] * 465}px)`,
                                                    backgroundImage: latest[colIndices[0]]?.image ? `url(${latest[colIndices[0]].image})` : 'none'
                                                }}
                                            />
                                            {latest.map((anime, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`card large-card ${rowIndex === 0 && colIndices[0] === idx ? 'expanded' : ''}`}
                                                    style={{ backgroundImage: `url(${anime.image})` }}
                                                    onClick={() => { setRowIndex(0); setColIndex(idx); handleAnimeClick(anime); }}
                                                >
                                                    <div className="card-overlay-gradient"></div>
                                                    <div className="card-info">
                                                        <div className="card-title">{anime.title}</div>
                                                        <div className="card-rating">
                                                            <span className="score"> {anime.episode || anime.number || '#'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div
                                                className={`card large-card see-more-card ${rowIndex === 0 && colIndices[0] === latest.length ? 'expanded' : ''}`}
                                                onClick={() => { setRowIndex(0); setColIndex(latest.length); loadCatalog(1); }}
                                            >
                                                <div className="card-overlay-gradient"></div>
                                                <div className="see-more-content">
                                                    <div className="see-more-icon"><span>+</span></div>
                                                    <div className="see-more-text">Ver Catálogo</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="carousel-container mt-10">
                                    <h2 className="section-title"><span className="title-marker"></span>Favoritos</h2>
                                    <div
                                        className="carousel-wrapper"
                                        onTouchStart={(e) => handleTouchStart(e, 1)}
                                        onTouchEnd={(e) => handleTouchEnd(e, Math.max(0, favorites.length - 1))}
                                    >
                                        {favorites.length > 0 ? (
                                            <div className="carousel" style={{ transform: `translateX(-${colIndices[1] * 265}px)` }}>
                                                {favorites.map((anime, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`card small-card ${rowIndex === 1 && colIndices[1] === idx ? 'focused' : ''}`}
                                                        style={{ backgroundImage: `url(${anime.image})` }}
                                                        onClick={() => { setRowIndex(1); setColIndex(idx); handleAnimeClick(anime); }}
                                                    >
                                                        <div className="card-overlay-gradient"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={`empty-favorites ${rowIndex === 1 ? 'focused' : ''}`}>
                                                <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style={{ opacity: 0.5 }}>
                                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                </svg>
                                                <p>Your favorites list is empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <BannerImages onExplore={() => loadCatalog(1)} />

                                <div className="recent-grid-section">
                                    <div className="recent-grid-header"></div>

                                    <div className="recent-anime-grid">
                                        {gridAnimes.length === 0 ? (
                                            // Loading skeletons
                                            Array.from({ length: 10 }).map((_, idx) => (
                                                <div key={idx} className="anime-card-v2">
                                                    <div className="anime-card-v2-img-container anime-card-skeleton"></div>
                                                    <div className="anime-card-skeleton-title"></div>
                                                </div>
                                            ))
                                        ) : gridAnimes.map((anime, idx) => {
                                            const isFocused = rowIndex === 2 && colIndex === idx;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`anime-card-v2 ${isFocused ? 'focused' : ''}`}
                                                    onClick={() => {
                                                        setRowIndex(2);
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

                                {/* Noticias componente*/}

                                {/* <AnimeNewsCarousel
                                    newsApiKey={newsApiKey}
                                    setNewsApiKey={setNewsApiKey}
                                    newsLoading={newsLoading}
                                    newsError={newsError}
                                    setNewsError={setNewsError}
                                    newsArticles={newsArticles}
                                    setNewsArticles={setNewsArticles}
                                    saveNewsApiKey={saveNewsApiKey}
                                    rowIndex={rowIndex}
                                    setRowIndex={setRowIndex}
                                    colIndices={colIndices}
                                    setColIndex={setColIndex}
                                    handleTouchStart={handleTouchStart}
                                    handleTouchEnd={handleTouchEnd}
                                /> */}
                            </>
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
                    </main>

                    <div id="status">{status}</div>
                </div>
            )}

            {/* Modals */}
            {view === STATES.SERVER_MODAL && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h2>Seleccionar Servidor</h2>
                        {servers && servers.length > 0 ? (
                            <div className="server-grid">
                                {servers.map((s, idx) => (
                                    <button key={idx} className="modal-btn flex items-center justify-center gap-2" onClick={() => playVideo(s, details?.title)}>
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
                                <p className="empty-servers-text">No se encontraron opciones de reproducción</p>
                            </div>
                        )}
                        <button className="modal-btn" onClick={() => setView(details ? STATES.DETAILS : STATES.HOME)}>Atrás</button>
                    </div>
                </div>
            )}

            {view === STATES.DETAILS && details && (
                <div className="view-overlay details-view">
                    <button className="details-close-btn" onClick={goBack} title="Cerrar">✕</button>
                    <div className="details-bg" style={{ backgroundImage: `url(${details.backdrop || details.cover})` }}></div>

                    {/* ── Zona superior: portada + info ── */}
                    <div className="details-top-section">
                        <div className="details-left">
                            <img src={details.cover} className="details-cover" alt="Cover" />
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    className={`modal-btn ${favorites.some(f => f.url === selectedAnime?.url) ? 'active' : ''}`}
                                    onClick={() => toggleFavorite(selectedAnime || details)}
                                    style={{ marginTop: 0, width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', borderRadius: '50%' }}
                                >
                                    {favorites.some(f => f.url === selectedAnime?.url) ? '❤' : '♡'}
                                </button>
                                {details.status && (
                                    <div className={`status-badge ${details.status.toLowerCase().includes('finalizado') ? 'finalizado' : ''}`} style={{ marginTop: 0 }}>
                                        <span className="ic-monitor ic-before"></span>
                                        {details.status}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="details-right">
                            <h1 className="details-title">{details.title}</h1>
                            <div className="synopsis-box">
                                <h2>Sinopsis</h2>
                                {details.genres && details.genres.length > 0 && (
                                    <div className="genres-list">
                                        {details.genres.map((g, idx) => (
                                            <span key={idx} className="genre-pill">{g}</span>
                                        ))}
                                    </div>
                                )}
                                <p className={`synopsis-text ${expandedSynopsis ? 'expanded' : ''}`}>
                                    {details.synopsis}
                                </p>
                                {details.synopsis && details.synopsis.length > 200 && (
                                    <button
                                        className="text-white mt-2 font-bold hover:underline"
                                        onClick={() => setExpandedSynopsis(!expandedSynopsis)}
                                    >
                                        {expandedSynopsis ? 'Leer menos' : 'Leer más...'}
                                    </button>
                                )}
                            </div>
                            {details.related && details.related.length > 0 && (
                                <div className="related-section">
                                    <h3>Relacionados</h3>
                                    <div className="related-row">
                                        {details.related.map((rel, idx) => (
                                            <div key={idx} className="related-card" onClick={() => openDetails(rel)}>
                                                {rel.image ? (
                                                    <img src={rel.image} alt="" />
                                                ) : (
                                                    <div className="related-placeholder">▶</div>
                                                )}
                                                <div className="related-info">
                                                    <div className="related-card-title">{rel.title}</div>
                                                    <div className="related-type">{rel.type || 'Relacionado'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Zona inferior: episodios full-width ── */}
                    <div className="details-episodes-section">
                        <div className="episodes-header-container">
                            <h3 className="episodes-section-title">Episodios</h3>
                            <div className="episodes-controls">
                                {isEpisodeSearchVisible && (
                                    <input
                                        type="text"
                                        className="episode-search-input"
                                        placeholder="Buscar episodio..."
                                        value={episodeSearchQuery}
                                        onChange={(e) => {
                                            setEpisodeSearchQuery(e.target.value);
                                            setDetailsActiveIndex(0);
                                        }}
                                        autoFocus
                                    />
                                )}
                                <button
                                    className={`episode-control-btn ${isEpisodeSearchVisible ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsEpisodeSearchVisible(!isEpisodeSearchVisible);
                                        if (isEpisodeSearchVisible) setEpisodeSearchQuery('');
                                    }}
                                    title="Buscar episodio"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                                <button
                                    className={`episode-control-btn ${episodeSortOrder === 'asc' ? 'active' : ''}`}
                                    onClick={() => setEpisodeSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    title="Ordenar episodios"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="episodes-row">
                            {(details.episodes || [])
                                .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))
                                .sort((a, b) => {
                                    const numA = parseFloat(a.episode);
                                    const numB = parseFloat(b.episode);
                                    return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                                })
                                .map((ep, idx) => {
                                    const isFocused = detailsActiveIndex === idx;
                                    const epThumb = ep.image || details.backdrop || details.cover;
                                    return (
                                        <div
                                            key={idx}
                                            className={`episode-card ${isFocused ? 'focused' : ''}`}
                                            onClick={() => {
                                                setDetailsActiveIndex(idx);
                                                openServers(ep.url);
                                            }}
                                        >
                                            <div className="episode-thumbnail-container">
                                                <img
                                                    src={epThumb}
                                                    className="episode-thumbnail"
                                                    alt={`Episodio ${ep.episode}`}
                                                    onError={(e) => {
                                                        if (e.target.src !== details.cover) {
                                                            e.target.src = details.cover;
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="episode-badge">
                                                Episodio {ep.episode}
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>

                        {((details.episodes || [])
                            .filter(ep => ep.episode.toString().toLowerCase().includes(episodeSearchQuery.toLowerCase()))).length === 0 && (
                                <div className="no-episodes-found">
                                    No se encontraron episodios
                                </div>
                            )
                        }
                    </div>
                </div>
            )}



            {view === STATES.EXTENSIONS_MODAL && (
                <div
                    className="modal-overlay stellar-overlay"
                    onClick={(e) => e.target.classList.contains('stellar-overlay') && setView(previousView)}
                >
                    <div className="stellar-card">

                        {/* Crosshair lines */}
                        <div className="stellar-crosshair stellar-crosshair-v"></div>
                        <div className="stellar-crosshair stellar-crosshair-h"></div>

                        {/* Cardinal tick marks */}
                        <div className="stellar-tick stellar-tick-top">
                            <svg width="13" height="16" viewBox="0 0 13 16">
                                <polygon points="6.5,0 13,16 0,16" fill="rgba(255,255,255,0.55)" />
                            </svg>
                        </div>
                        <div className="stellar-tick stellar-tick-right">
                            <svg width="18" height="14" viewBox="0 0 18 14">
                                <line x1="0" y1="7" x2="10" y2="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                <circle cx="14" cy="7" r="3" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
                                <circle cx="14" cy="7" r="1" fill="rgba(255,255,255,0.6)" />
                            </svg>
                        </div>
                        <div className="stellar-tick stellar-tick-bottom">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                                <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.3)" />
                            </svg>
                        </div>
                        <div className="stellar-tick stellar-tick-left">
                            <svg width="10" height="10" viewBox="0 0 10 10">
                                <rect x="1" y="1" width="8" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
                            </svg>
                        </div>

                        {/* Corner labels */}
                        <div className="stellar-coord-tl">CARTA ESTELAR<br />J2000.0 · ECL</div>
                        <div className="stellar-coord-tr">MÓDULOS<br />No. 564</div>

                        {/* Orbit rings — SVG entrecortado */}
                        <svg className="stellar-orbits" width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
                            {/* Ejes entrecortados */}
                            <line x1="210" y1="0" x2="210" y2="80" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 5" />
                            <line x1="210" y1="340" x2="210" y2="420" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 5" />
                            <line x1="0" y1="210" x2="80" y2="210" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 5" />
                            <line x1="340" y1="210" x2="420" y2="210" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="4 5" />
                            {/* Órbita circular principal */}
                            <circle cx="210" cy="210" r="142" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" strokeDasharray="6 5" />
                            {/* Elipse horizontal */}
                            <ellipse cx="210" cy="210" rx="180" ry="50" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" strokeDasharray="5 6" />
                            {/* Elipse vertical */}
                            <ellipse cx="210" cy="210" rx="50" ry="180" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" strokeDasharray="5 6" />
                            {/* Elipse diagonal 1 */}
                            <ellipse cx="210" cy="210" rx="160" ry="70" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" strokeDasharray="4 7" transform="rotate(35 210 210)" />
                            {/* Elipse diagonal 2 */}
                            <ellipse cx="210" cy="210" rx="160" ry="70" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" strokeDasharray="4 7" transform="rotate(-35 210 210)" />
                            {/* Órbita exterior */}
                            <circle cx="210" cy="210" r="170" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" strokeDasharray="3 8" />
                            {/* Nodos */}
                            <circle cx="210" cy="68" r="2.5" fill="rgba(255,255,255,0.4)" />
                            <circle cx="210" cy="352" r="2" fill="rgba(255,255,255,0.25)" />
                            <circle cx="68" cy="210" r="2" fill="rgba(255,255,255,0.25)" />
                            <circle cx="352" cy="210" r="2.5" fill="rgba(255,255,255,0.4)" />
                            <circle cx="310" cy="110" r="1.8" fill="rgba(255,255,255,0.3)" />
                            <circle cx="110" cy="310" r="1.8" fill="rgba(255,255,255,0.3)" />
                        </svg>

                        {/* Central planet — SVG estático con degradado y cuadrícula */}
                        <div className="stellar-planet">
                            <svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <radialGradient id="pg" cx="36%" cy="32%" r="62%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="35%" stopColor="#aaaaaa" />
                                        <stop offset="70%" stopColor="#444444" />
                                        <stop offset="100%" stopColor="#0a0a0a" />
                                    </radialGradient>
                                    <radialGradient id="pshine" cx="30%" cy="28%" r="48%">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                    </radialGradient>
                                    <clipPath id="pc">
                                        <circle cx="45" cy="45" r="44" />
                                    </clipPath>
                                </defs>
                                <circle cx="45" cy="45" r="44" fill="url(#pg)" />
                                <g clipPath="url(#pc)" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.28">
                                    {/* Horizontales */}
                                    {[9, 18, 27, 36, 45, 54, 63, 72, 81].map(y => (
                                        <line key={`h${y}`} x1="1" y1={y} x2="89" y2={y} />
                                    ))}
                                    {/* Verticales */}
                                    {[9, 18, 27, 36, 45, 54, 63, 72, 81].map(x => (
                                        <line key={`v${x}`} x1={x} y1="1" x2={x} y2="89" />
                                    ))}
                                    {/* Elipses internas */}
                                    <ellipse cx="45" cy="45" rx="44" ry="7" />
                                    <ellipse cx="45" cy="45" rx="44" ry="14" />
                                    <ellipse cx="45" cy="45" rx="44" ry="28" />
                                    <ellipse cx="45" cy="45" rx="32" ry="42" />
                                    <ellipse cx="45" cy="45" rx="16" ry="44" />
                                </g>
                                <circle cx="45" cy="45" r="44" fill="url(#pshine)" />
                                <circle cx="45" cy="45" r="44" fill="none" stroke="#ffffff" strokeWidth="0.7" opacity="0.45" />
                            </svg>
                        </div>

                        {/* Active module indicator */}
                        <div className="active-info" style={{ color: currentSource ? EXTENSIONS.find(e => e.id === currentSource)?.color : 'rgba(255,255,255,0.55)' }}>
                            {currentSource ? EXTENSIONS.find(e => e.id === currentSource)?.name.toUpperCase() + ' · ACTIVO' : 'SELECCIONA UN MÓDULO'}
                        </div>

                        {/* Moons */}
                        {EXTENSIONS.map((ext, idx) => {
                            const total = EXTENSIONS.length;
                            const angle = (360 / total) * idx - 90;
                            const rad = (angle * Math.PI) / 180;
                            const radius = 130;
                            const x = Math.cos(rad) * radius;
                            const y = Math.sin(rad) * radius;
                            const isActive = currentSource === ext.id;
                            return (
                                <div
                                    key={ext.id}
                                    className={`stellar-moon ${isActive ? 'stellar-moon-active' : ''}`}
                                    style={{
                                        '--moon-color': ext.color,
                                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    }}
                                    onClick={() => selectSource(ext.id)}
                                    title={ext.name}
                                >
                                    <div
                                        className="stellar-moon-core"
                                        style={{
                                            backgroundColor: isActive ? `${ext.color}22` : 'rgba(255,255,255,0.05)',
                                            borderColor: isActive ? ext.color : 'rgba(255,255,255,0.18)',
                                        }}
                                    >
                                        <span className="stellar-moon-icon">{ext.icon}</span>
                                        {isActive && (
                                            <div className="stellar-moon-pulse" style={{ '--pulse-color': ext.color }}></div>
                                        )}
                                    </div>
                                    <div className="stellar-moon-label">{ext.name}</div>
                                </div>
                            );
                        })}

                        {/* Bottom label */}
                        <div className="stellar-label">MÓDULO ACTUAL</div>
                        <div
                            className="stellar-sublabel"
                            style={{ color: currentSource ? EXTENSIONS.find(e => e.id === currentSource)?.color : 'rgba(255,255,255,0.7)' }}
                        >
                            {currentSource ? EXTENSIONS.find(e => e.id === currentSource)?.name.toUpperCase() : '—'}
                        </div>

                        {/* Close button */}
                        <button className="stellar-close-btn" onClick={() => setView(previousView)}>✕</button>

                    </div>
                </div>
            )}

            {view === STATES.PLAYER && (
                <div id="player-overlay" className="fixed inset-0 z-[100] bg-black">
                    <VideoPlayer
                        src={playerUrl}
                        title={`${details?.title} - Servidor: ${details?.currentServer?.title}`}
                        subtitles={playerSubtitles}
                        onBack={() => setView(STATES.SERVER_MODAL)}
                        onEnded={() => {
                            console.log("Video ended");
                            // Logic for next episode could go here
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;