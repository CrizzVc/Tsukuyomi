import React from 'react';

const AnimeNewsCarousel = ({
    newsApiKey,
    setNewsApiKey,
    newsLoading,
    newsError,
    setNewsError,
    newsArticles,
    setNewsArticles,
    saveNewsApiKey,
    rowIndex,
    setRowIndex,
    colIndices,
    setColIndex,
    handleTouchStart,
    handleTouchEnd
}) => {

    const resetApiKey = () => {
        localStorage.removeItem('news_api_key');
        setNewsApiKey('');
        setNewsError('');
        setNewsArticles([]);
    };

    const openArticle = (url) => {
        // Se asume el uso dentro de un entorno de Electron
        const { shell } = window.require('electron');
        shell.openExternal(url);
    };

    return (
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
                        onClick={resetApiKey}
                    >
                        Cambiar API Key
                    </button>
                )}
            </h2>

            {!newsApiKey ? (
                <div className="news-config-container">
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 15px 0' }}>
                        Configura tu API Key de <a href="https://newsapi.org" target="_blank" rel="noreferrer" style={{ color: '#00E5FF', textDecoration: 'underline' }}>newsapi.org</a> para ver las últimas noticias.
                    </p>
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
                        onClick={resetApiKey}
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
                                    openArticle(article.url);
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
                        onClick={resetApiKey}
                    >
                        Cambiar API Key
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnimeNewsCarousel;