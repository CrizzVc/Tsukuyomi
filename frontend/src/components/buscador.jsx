import React from 'react';

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
    return (
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

            <button
                className="modal-btn"
                style={{ width: '200px', alignSelf: 'center' }}
                onClick={onClose}
            >
                Cerrar
            </button>
        </div>
    );
};

export default SearchOverlay;