import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import './index.css';
import VideoPlayer from './components/Player/VideoPlayer';
import BannerImages from './components/bannerimages';

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
    const [searchIndex, setSearchIndex] = useState(-1); // -1: input focused

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

    const handleSearch = async (e) => {
        if (e.key === 'Enter') {
            setStatus('Buscando...');
            const results = await api.searchAnime(searchQuery, currentSource);
            setSearchResults(results);
            setSearchIndex(-1); // reset focus to input
            setStatus('');
        }
    };

    const selectSource = (sourceId) => {
        setCurrentSource(sourceId);
        setSearchQuery('');
        setSearchResults([]);

        if (previousView === STATES.SEARCH) {
            setView(STATES.SEARCH);
        } else if (previousView === STATES.CATALOG) {
            loadCatalog(1, sourceId);
        } else {
            setView(STATES.HOME);
            loadLatest(sourceId);
            loadGridAnimes(sourceId);
        }
    };

    const loadCatalog = async (page = 1, source = currentSource) => {
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
        else if (view === STATES.SEARCH) setView(STATES.HOME);
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
                            setColIndex(prev => Math.min(prev + cols, listLength - 1));
                        } else {
                            setRowIndex(3);
                            setColIndex(0);
                        }
                    }
                }
                if (e.key === 'ArrowUp') {
                    if (rowIndex === 3) {
                        setRowIndex(2);
                        const listLength = Math.min(24, gridAnimes.length);
                        const cols = 5;
                        setColIndex(listLength > cols ? cols : 0);
                    } else if (rowIndex === 2) {
                        if (colIndex >= 5) {
                            setColIndex(prev => prev - 5);
                        } else {
                            setRowIndex(1);
                            setColIndex(0);
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
                        else if (colIndex === 2) setView(STATES.SEARCH);
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
            } else if (view === STATES.SEARCH || view === STATES.CATALOG) {
                if (rowIndex === -1) {
                    // Header navigation in Search/Catalog views
                    if (e.key === 'ArrowRight') setColIndex(prev => Math.min(prev + 1, 3));
                    if (e.key === 'ArrowLeft') setColIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') {
                        setRowIndex(0);
                        setSearchIndex(prev => prev >= 0 ? prev : 0);
                    }
                    if (e.key === 'Enter') {
                        if (colIndex === 0) setView(STATES.HOME);
                        else if (colIndex === 1) loadCatalog(1);
                        else if (colIndex === 2) setView(STATES.SEARCH);
                        else if (colIndex === 3) setView(STATES.EXTENSIONS_MODAL);
                    }
                } else {
                    // Grid navigation
                    const results = view === STATES.SEARCH ? searchResults : catalogResults;
                    if (e.key === 'ArrowRight') setSearchIndex(prev => Math.min(prev + 1, results.length - 1));
                    if (e.key === 'ArrowLeft') setSearchIndex(prev => Math.max(prev - 1, 0));
                    if (e.key === 'ArrowDown') setSearchIndex(prev => Math.min(prev + 5, results.length - 1));
                    if (e.key === 'ArrowUp') {
                        if (searchIndex < 5) {
                            setRowIndex(-1);
                            setColIndex(view === STATES.CATALOG ? 1 : 2); // Return to corresponding tab
                        } else {
                            setSearchIndex(prev => Math.max(prev - 5, 0));
                        }
                    }
                    if (e.key === 'Enter' && results[searchIndex]) handleAnimeClick(results[searchIndex]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, colIndex, rowIndex, searchIndex, latest, favorites, searchResults, catalogResults, profiles]);

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
                                className={`nav-link ${(rowIndex === -1 && colIndex === 1) ? 'focused' : ''} ${view === STATES.CATALOG ? 'active' : ''}`}
                                onClick={() => loadCatalog(1)}
                            >
                                Catálogo de Anime
                            </span>
                        </div>
                        <div className="header-right">
                            <div
                                className={`search-pill ${(rowIndex === -1 && colIndex === 2) ? 'focused' : ''}`}
                                onClick={() => setView(STATES.SEARCH)}
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                </svg>
                                <span>Search</span>
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
                                        <div className="carousel" style={{ transform: `translateX(-${colIndices[0] * 465}px)` }}>
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

                                <BannerImages />

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

                                <div className="carousel-container mt-10">
                                    <h2 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div><span className="title-marker"></span>Noticias de Anime</div>
                                        {newsApiKey && !newsLoading && (
                                            <button
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.4)',
                                                    cursor: 'pointer',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                                                onMouseOut={(e) => { e.target.style.color = 'rgba(255,255,255,0.4)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                                onClick={() => {
                                                    localStorage.removeItem('news_api_key');
                                                    setNewsApiKey('');
                                                    setNewsError('');
                                                    setNewsArticles([]);
                                                }}
                                            >
                                                Cambiar API Key
                                            </button>
                                        )}
                                    </h2>
                                    {!newsApiKey ? (
                                        <div className="news-config-container">
                                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 15px 0' }}>Configura tu API Key de <a href="https://newsapi.org" target="_blank" rel="noreferrer" style={{ color: '#00E5FF', textDecoration: 'underline' }}>newsapi.org</a> para ver las últimas noticias.</p>
                                            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
                                                <input
                                                    type="password"
                                                    id="news-key-input"
                                                    className="news-key-input"
                                                    placeholder="Ingresa tu API Key y presiona Enter..."
                                                />
                                                <button
                                                    className="modal-btn"
                                                    style={{ width: 'auto', marginTop: 0, padding: '8px 20px', fontSize: '0.9rem' }}
                                                    onClick={() => {
                                                        const val = document.getElementById('news-key-input')?.value;
                                                        if (val) saveNewsApiKey(val.trim());
                                                    }}
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    ) : newsLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                            <div style={{ width: '40px', height: '40px', border: '4px solid #00E5FF', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin"></div>
                                        </div>
                                    ) : newsError ? (
                                        <div className="news-config-container">
                                            <p style={{ color: '#ff4d4d', margin: '0 0 15px 0' }}>Error: {newsError}</p>
                                            <button
                                                className="modal-btn"
                                                style={{ width: 'auto', marginTop: 0, padding: '8px 20px', fontSize: '0.9rem' }}
                                                onClick={() => {
                                                    localStorage.removeItem('news_api_key');
                                                    setNewsApiKey('');
                                                    setNewsError('');
                                                    setNewsArticles([]);
                                                }}
                                            >
                                                Restablecer API Key
                                            </button>
                                        </div>
                                    ) : newsArticles.length > 0 ? (
                                        <div
                                            className="carousel-wrapper"
                                            onTouchStart={(e) => handleTouchStart(e, 3)}
                                            onTouchEnd={(e) => handleTouchEnd(e, newsArticles.length - 1)}
                                        >
                                            <div className="carousel" style={{ transform: `translateX(-${colIndices[3] * 340}px)` }}>
                                                {newsArticles.map((article, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`news-card ${rowIndex === 3 && colIndices[3] === idx ? 'focused' : ''}`}
                                                        onClick={() => {
                                                            setRowIndex(3);
                                                            setColIndex(idx);
                                                            const { shell } = window.require('electron');
                                                            shell.openExternal(article.url);
                                                        }}
                                                    >
                                                        {article.urlToImage && (
                                                            <img
                                                                src={article.urlToImage}
                                                                alt=""
                                                                className="news-img"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                        )}
                                                        <div className="news-content">
                                                            <div className="news-source">{article.source?.name}</div>
                                                            <div className="news-title">{article.title}</div>
                                                            <div className="news-description">{article.description}</div>
                                                            <div className="news-date">
                                                                {new Date(article.publishedAt).toLocaleDateString('es-ES', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="news-config-container">
                                            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No se encontraron noticias recientes.</p>
                                            <button
                                                className="modal-btn"
                                                style={{ width: 'auto', marginTop: 10, padding: '8px 20px', fontSize: '0.9rem' }}
                                                onClick={() => {
                                                    localStorage.removeItem('news_api_key');
                                                    setNewsApiKey('');
                                                    setNewsError('');
                                                    setNewsArticles([]);
                                                }}
                                            >
                                                Cambiar API Key
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {view === STATES.CATALOG && (
                            <div className="catalog-tab" style={{ padding: '20px 40px' }}>
                                <h2 className="section-title"><span className="title-marker"></span>Catálogo Completo</h2>
                                <div className="search-grid" style={{ marginTop: '20px' }}>
                                    {catalogResults.map((anime, idx) => (
                                        <div
                                            key={idx}
                                            className={`search-card ${searchIndex === idx && rowIndex !== -1 ? 'focused' : ''}`}
                                            onClick={() => handleAnimeClick(anime)}
                                        >
                                            <img src={anime.image} alt={anime.title} />
                                            <div className="search-card-info">
                                                <div className="search-card-title">{anime.title}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                <div className="view-overlay">
                    <div className="details-bg" style={{ backgroundImage: `url(${details.backdrop || details.cover})` }}></div>
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
                        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>{details.title}</h1>

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

                        <h3 style={{ marginTop: '40px', fontSize: '1.5rem' }}>Episodios</h3>
                        <div className="episodes-list">
                            {details.episodes.map((ep, idx) => (
                                <div key={idx} className="episode-item" onClick={() => openServers(ep.url)}>
                                    Episodio {ep.episode}
                                </div>
                            ))}
                        </div>
                        <button className="modal-btn mt-6" onClick={() => setView(STATES.HOME)}>Cerrar</button>
                    </div>
                </div>
            )}

            {view === STATES.SEARCH && (
                <div className="view-overlay" style={{ flexDirection: 'column' }}>
                    <div className="search-header">
                        <input
                            autoFocus
                            className="search-input"
                            placeholder="Buscar anime..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                    {searchResults && searchResults.length > 0 ? (
                        <div className="search-grid">
                            {searchResults.map((anime, idx) => (
                                <div
                                    key={idx}
                                    className={`search-card ${searchIndex === idx && rowIndex !== -1 ? 'focused' : ''}`}
                                    onClick={() => handleAnimeClick(anime)}
                                >
                                    <img src={anime.image} alt={anime.title} />
                                    <div className="search-card-info">
                                        <div className="search-card-title">{anime.title}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="search-empty-container">
                            <div className="search-empty-icon">
                                {searchQuery.trim() === '' ? (
                                    <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                    </svg>
                                )}
                            </div>
                            <h3 className="search-empty-text">
                                {searchQuery.trim() === ''
                                    ? 'Busca tus animes favoritos'
                                    : `No se encontraron resultados para "${searchQuery}"`}
                            </h3>
                            <p className="search-empty-subtext">
                                {searchQuery.trim() === ''
                                    ? 'Escribe el nombre del anime en el cuadro superior y presiona Enter'
                                    : 'Intenta con palabras clave diferentes o verifica la ortografía'}
                            </p>
                        </div>
                    )}
                    <button className="modal-btn" style={{ width: '200px', alignSelf: 'center' }} onClick={() => setView(STATES.HOME)}>Cerrar</button>
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
