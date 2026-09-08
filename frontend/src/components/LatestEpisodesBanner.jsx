import React, { useState, useEffect, useRef } from 'react';
import { fetchTmdbBackdrop, fetchDetails } from '../api';

/**
 * LatestEpisodesBanner
 *
 * Shows a full-width cinematic backdrop fetched from TMDB that corresponds
 * to the currently-focused anime in the "Últimos Episodios" row.
 *
 * Props:
 *   focusedAnime  — the anime object that is currently focused in the row
 *                   (needs at least .title and .image, optionally .animeUrl/.url and .source)
 *   onPlay        — callback fired when the "Reproducir" button is clicked
 */
function LatestEpisodesBanner({ focusedAnime, onPlay }) {
    const [displayedBackdrop, setDisplayedBackdrop] = useState(null);
    const [nextBackdrop, setNextBackdrop] = useState(null);
    const [isFadingIn, setIsFadingIn] = useState(false);

    const [displayedTitle, setDisplayedTitle] = useState('');
    const [displayedImage, setDisplayedImage] = useState(null);

    const loadingForRef = useRef(null);
    const fadeTimerRef = useRef(null);

    useEffect(() => {
        if (!focusedAnime?.title) return;

        const title = focusedAnime.title;
        if (loadingForRef.current === title) return;
        loadingForRef.current = title;

        setIsFadingIn(false);
        clearTimeout(fadeTimerRef.current);

        // Update text immediately so the label feels responsive
        setDisplayedTitle(title);
        setDisplayedImage(focusedAnime.image || null);

        const animeUrl = focusedAnime.animeUrl || focusedAnime.url || null;
        const source   = focusedAnime.source || 'animeav1';

        // Step 1: try with the display title (+ season-strip variants)
        fetchTmdbBackdrop(title).then(async (url) => {
            if (loadingForRef.current !== title) return;

            if (url) {
                setNextBackdrop(url);
                return;
            }

            // Step 2: backdrop not found — try fetching titleJP from details
            if (animeUrl) {
                try {
                    const details = await fetchDetails(animeUrl, source);
                    if (loadingForRef.current !== title) return;

                    const titleJP = details?.titleJP || null;
                    const url2 = await fetchTmdbBackdrop(title, titleJP);
                    if (loadingForRef.current !== title) return;

                    setNextBackdrop(url2 || focusedAnime.image || null);
                } catch (_) {
                    if (loadingForRef.current === title) {
                        setNextBackdrop(focusedAnime.image || null);
                    }
                }
            } else {
                setNextBackdrop(focusedAnime.image || null);
            }
        });
    }, [focusedAnime?.title]);

    // When a new backdrop image has been pre-loaded, cross-fade it in
    const handleNextLoaded = () => {
        setIsFadingIn(true);
        fadeTimerRef.current = setTimeout(() => {
            setDisplayedBackdrop(nextBackdrop);
            setIsFadingIn(false);
            setNextBackdrop(null);
        }, 1200); // matches the CSS transition duration
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
        </div>
    );
}

export default LatestEpisodesBanner;
