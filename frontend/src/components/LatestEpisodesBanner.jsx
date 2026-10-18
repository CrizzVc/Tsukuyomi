import React, { useState, useEffect, useRef } from 'react';
import { fetchTmdbBackdrop, fetchDetails } from '../api';

/**
 * LatestEpisodesBanner
 *
 * Muestra las imágenes/backdrops de los últimos 3 animes de los últimos episodios,
 * rotando automáticamente con un temporizador (crossfade suave)
 * de forma independiente del foco del carrusel.
 *
 * Props:
 *   animes       — Array de animes (se toman los 3 primeros de Últimos Episodios)
 *   interval     — Tiempo en milisegundos entre cada cambio de imagen (por defecto 6000ms)
 *   focusedAnime — Fallback por retrocompatibilidad
 *   onPlay       — Callback opcional al interactuar
 */
function LatestEpisodesBanner({ animes = [], focusedAnime = null, interval = 6000, onPlay }) {
    // Tomar los últimos 3 animes
    const items = (animes && animes.length > 0)
        ? animes.slice(0, 3)
        : (focusedAnime ? [focusedAnime] : []);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [backdrops, setBackdrops] = useState([]);
    const [displayedBackdrop, setDisplayedBackdrop] = useState(null);
    const [nextBackdrop, setNextBackdrop] = useState(null);
    const [isFadingIn, setIsFadingIn] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const fadeTimerRef = useRef(null);
    const intervalRef = useRef(null);
    const nextBackdropRef = useRef(null);
    const displayedBackdropRef = useRef(null);
    const isMountedRef = useRef(true);

    displayedBackdropRef.current = displayedBackdrop;

    const itemsKey = items.map((a) => a.title || a.url || a.image || '').join('|');

    // 1. Cargar / resolver backdrops para los 3 animes
    useEffect(() => {
        isMountedRef.current = true;
        if (!items.length) {
            setBackdrops([]);
            setDisplayedBackdrop(null);
            setNextBackdrop(null);
            return;
        }

        // Inicializar inmediatamente con poster/image para evitar pantalla negra
        const initial = items.map((a) => a.image || null);
        setBackdrops(initial);
        setCurrentIndex(0);

        // Pre-cargar y resolver TMDB backdrop para cada uno
        items.forEach((anime, idx) => {
            if (!anime?.title) return;
            const title = anime.title;
            const animeUrl = anime.animeUrl || anime.url || null;
            const source = anime.source || 'animeav1';

            fetchTmdbBackdrop(title).then(async (url) => {
                if (!isMountedRef.current) return;
                let finalUrl = url;

                if (!finalUrl && animeUrl) {
                    try {
                        const details = await fetchDetails(animeUrl, source);
                        if (!isMountedRef.current) return;
                        const titleJP = details?.titleJP || null;
                        finalUrl = await fetchTmdbBackdrop(title, titleJP);
                    } catch (_) {}
                }

                const resolvedUrl = finalUrl || anime.image || null;
                if (resolvedUrl && isMountedRef.current) {
                    // Pre-cache en el navegador
                    const preloader = new Image();
                    preloader.src = resolvedUrl;

                    setBackdrops((prev) => {
                        const updated = [...prev];
                        updated[idx] = resolvedUrl;
                        return updated;
                    });
                }
            });
        });

        return () => {
            isMountedRef.current = false;
        };
    }, [itemsKey]);

    // 2. Temporizador para rotar automáticamente entre los animes
    useEffect(() => {
        if (items.length <= 1 || isPaused) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, interval);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [items.length, interval, isPaused]);

    // 3. Cuando cambia el currentIndex o se actualizan los backdrops
    useEffect(() => {
        if (!items.length) return;
        const targetUrl = backdrops[currentIndex] || items[currentIndex]?.image;
        if (!targetUrl) return;

        // Primer render o carga inicial
        if (!displayedBackdropRef.current) {
            setDisplayedBackdrop(targetUrl);
            return;
        }

        // Si ya está mostrando esta imagen, no hacer nada
        if (displayedBackdropRef.current === targetUrl) return;

        // Iniciar transición suave hacia targetUrl
        nextBackdropRef.current = targetUrl;
        setNextBackdrop(targetUrl);
        setIsFadingIn(false);
    }, [currentIndex, backdrops, itemsKey]);

    // 4. Cuando la siguiente imagen terminó de cargarse en el DOM, hacer crossfade
    const handleNextLoaded = () => {
        setIsFadingIn(true);
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => {
            if (nextBackdropRef.current) {
                setDisplayedBackdrop(nextBackdropRef.current);
            }
            setIsFadingIn(false);
            setNextBackdrop(null);
        }, 1200); // Coincide con la duración de la transición CSS
    };

    return (
        <div
            className="leb-banner"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* ── Capa base / imagen actual ── */}
            <div
                className="leb-backdrop-layer leb-backdrop-base"
                style={{ backgroundImage: displayedBackdrop ? `url(${displayedBackdrop})` : 'none' }}
            />

            {/* ── Siguiente imagen que entra con crossfade ── */}
            {nextBackdrop && (
                <>
                    <img
                        src={nextBackdrop}
                        alt=""
                        style={{ display: 'none' }}
                        onLoad={handleNextLoaded}
                        onError={handleNextLoaded}
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

            {/* ── Viñeta oscura con degradado ── */}
            <div className="leb-vignette" />

            {/* ── Indicadores visuales de los animes ── */}
            {items.length > 1 && (
                <div className="leb-indicators">
                    {items.map((anime, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className={`leb-indicator-dot ${currentIndex === idx ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            title={anime?.title || `Anime ${idx + 1}`}
                            aria-label={`Anime ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default LatestEpisodesBanner;
