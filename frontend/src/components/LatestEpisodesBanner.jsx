import React, { useState, useEffect, useRef } from 'react';
import { fetchTmdbBackdrop } from '../api';

/**
 * LatestEpisodesBanner
 *
 * Shows a full-width cinematic backdrop fetched from TMDB that corresponds
 * to the currently-focused anime in the "Últimos Episodios" row.
 *
 * Props:
 *   focusedAnime  — the anime object that is currently focused in the row
 *                   (needs at least .title and .image)
 *   onPlay        — callback fired when the "Reproducir" button is clicked
 */
function LatestEpisodesBanner({ focusedAnime, onPlay }) {
    // The URL currently being displayed (fully transitioned in)
    const [displayedBackdrop, setDisplayedBackdrop] = useState(null);
    // The URL being loaded in the background before cross-fading in
    const [nextBackdrop, setNextBackdrop] = useState(null);
    // Whether the next image has finished loading and is fading in
    const [isFadingIn, setIsFadingIn] = useState(false);

    const [displayedTitle, setDisplayedTitle] = useState('');
    const [displayedImage, setDisplayedImage] = useState(null);

    const loadingForRef = useRef(null);
    const fadeTimerRef = useRef(null);

    useEffect(() => {
        if (!focusedAnime?.title) return;

        const title = focusedAnime.title;
        if (loadingForRef.current === title) return; // already loading / loaded this one
        loadingForRef.current = title;

        // Reset the fade state for the incoming image
        setIsFadingIn(false);
        clearTimeout(fadeTimerRef.current);

        fetchTmdbBackdrop(title).then((url) => {
            // Guard: by the time the fetch resolves the user may have moved on
            if (loadingForRef.current !== title) return;

            const incoming = url || focusedAnime.image || null;
            setNextBackdrop(incoming);
        });

        // Update the text info immediately so the label feels responsive
        setDisplayedTitle(title);
        setDisplayedImage(focusedAnime.image || null);
    }, [focusedAnime?.title]);

    // When a new backdrop image has been pre-loaded, cross-fade it in
    const handleNextLoaded = () => {
        setIsFadingIn(true);
        fadeTimerRef.current = setTimeout(() => {
            setDisplayedBackdrop(nextBackdrop);
            setIsFadingIn(false);
            setNextBackdrop(null);
        }, 700); // matches the CSS transition duration
    };

    return (
        <div className="leb-banner">
            {/* ── Static / outgoing backdrop layer ── */}
            <div
                className="leb-backdrop-layer leb-backdrop-base"
                style={{ backgroundImage: displayedBackdrop ? `url(${displayedBackdrop})` : 'none' }}
            />

            {/* ── Incoming backdrop (fades in on top) ── */}
            {nextBackdrop && (
                <>
                    {/* Hidden img tag to trigger onLoad */}
                    <img
                        src={nextBackdrop}
                        alt=""
                        style={{ display: 'none' }}
                        onLoad={handleNextLoaded}
                        onError={handleNextLoaded} // fall back gracefully
                    />
                    <div
                        className="leb-backdrop-layer leb-backdrop-next"
                        style={{
                            backgroundImage: `url(${nextBackdrop})`,
                            opacity: isFadingIn ? 1 : 0,
                        }}
                    />
                </>
            )}

            {/* ── Gradient vignette overlay ── */}
            <div className="leb-vignette" />

            {/* ── Content ── */}
            <div className="leb-content">
                {/* Thumbnail */}
                {displayedImage && (
                    <img
                        src={displayedImage}
                        alt={displayedTitle}
                        className="leb-thumb"
                    />
                )}

                {/* Text + action */}
                <div className="leb-info">
                    <div className="leb-label">ÚLTIMOS EPISODIOS</div>
                    <div className="leb-title">{displayedTitle}</div>
                    {onPlay && (
                        <button className="leb-play-btn" onClick={onPlay}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Ver ahora
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LatestEpisodesBanner;
