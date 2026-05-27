import React, { useEffect } from 'react';

const KEYBOARD_ROWS = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['g', 'h', 'i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p', 'q', 'r'],
    ['s', 't', 'u', 'v', 'w', 'x'],
    ['y', 'z', '1', '2', '3', '4'],
    ['5', '6', '7', '8', '9', '0'],
];

const SearchOverlay = ({
    searchQuery,
    setSearchQuery,
    handleSearch,
    searchResults,
    searchIndex,
    rowIndex,
    handleAnimeClick,
    onClose
}) => {
    const handleKeyPress = (char) => {
        setSearchQuery(prev => prev + char);
    };

    const handleBackspace = () => {
        setSearchQuery(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setSearchQuery('');
    };

    const handleSpace = () => {
        setSearchQuery(prev => prev + ' ');
    };

    const triggerSearch = () => {
        handleSearch({ key: 'Enter' });
    };

    // Auto-search on query change (debounced)
    useEffect(() => {
        if (!searchQuery.trim()) return;
        const timer = setTimeout(() => {
            handleSearch({ key: 'Enter' });
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const featuredResult = searchResults && searchResults.length > 0 ? searchResults[0] : null;
    const restResults = searchResults && searchResults.length > 1 ? searchResults.slice(1) : [];

    return (
        <div className="tv-search-overlay">

            {/* ── LEFT PANEL ── */}
            <div className="tv-search-left">

                {/* Query display */}
                <div className="tv-query-display">
                    <span className="tv-query-text">
                        {searchQuery || ''}
                    </span>
                    <span className="tv-query-cursor">|</span>
                </div>

                {/* Virtual keyboard */}
                <div className="tv-keyboard">
                    {KEYBOARD_ROWS.map((row, rowIdx) => (
                        <div key={rowIdx} className="tv-keyboard-row">
                            {row.map((char) => (
                                <button
                                    key={char}
                                    className="tv-key"
                                    onClick={() => handleKeyPress(char)}
                                >
                                    {char}
                                </button>
                            ))}
                        </div>
                    ))}

                    {/* Action row */}
                    <div className="tv-keyboard-row tv-keyboard-actions">
                        <button className="tv-key tv-key-space" onClick={handleSpace} title="Espacio">
                            ⎵
                        </button>
                        <button className="tv-key tv-key-backspace" onClick={handleBackspace} title="Borrar">
                            ⌫
                        </button>
                        <button className="tv-key tv-key-clear" onClick={handleClear}>
                            Clear
                        </button>
                    </div>
                </div>

                {/* Close button */}
                <button className="tv-close-btn" onClick={onClose}>
                    ✕ Cerrar
                </button>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="tv-search-right">
                {featuredResult ? (
                    <>
                        {/* Featured top result */}
                        <div
                            className="tv-featured-result"
                            onClick={() => handleAnimeClick(featuredResult)}
                        >
                            <div className="tv-featured-info">
                                <h2 className="tv-featured-title">{featuredResult.title}</h2>
                                <div className="tv-featured-meta">
                                    {featuredResult.episode && (
                                        <span className="tv-featured-ep">
                                            {featuredResult.episode}
                                        </span>
                                    )}
                                    <span className="tv-featured-badge">Anime</span>
                                </div>
                            </div>
                            <div className="tv-featured-img-wrap">
                                <img
                                    src={featuredResult.image}
                                    alt={featuredResult.title}
                                    className="tv-featured-img"
                                />
                            </div>
                        </div>

                        {/* Results grid */}
                        {restResults.length > 0 && (
                            <div className="tv-results-grid">
                                {restResults.map((anime, idx) => (
                                    <div
                                        key={idx}
                                        className={`tv-result-card ${searchIndex === idx + 1 && rowIndex !== -1 ? 'focused' : ''}`}
                                        onClick={() => handleAnimeClick(anime)}
                                    >
                                        <div className="tv-result-img-wrap">
                                            <img
                                                src={anime.image}
                                                alt={anime.title}
                                                className="tv-result-img"
                                            />
                                            <div className="tv-result-overlay" />
                                        </div>
                                        <div className="tv-result-title">{anime.title}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="tv-search-empty">
                        {searchQuery.trim() === '' ? (
                            <>
                                <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                                </svg>
                                <p className="tv-empty-title">Busca tus animes favoritos</p>
                                <p className="tv-empty-sub">Usa el teclado para escribir el nombre</p>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                </svg>
                                <p className="tv-empty-title">Sin resultados para "{searchQuery}"</p>
                                <p className="tv-empty-sub">Intenta con otras palabras clave</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchOverlay;