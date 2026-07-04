import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import VideoControls from './VideoControls';

const VideoPlayer = ({ src, title, subtitles: externalSubtitles = [], nextEpisode, onBack, onEnded, isDirect }) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const containerRef = useRef(null);
    const hideTimeoutRef = useRef(null);
    const isTouchDevice = useRef('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(() => {
        return parseFloat(localStorage.getItem('player-volume')) || 0.7;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [subtitles, setSubtitles] = useState([]);
    const [currentSubtitle, setCurrentSubtitle] = useState(-1);
    const [isBuffering, setIsBuffering] = useState(true);

    // Sync external subtitles
    useEffect(() => {
        setSubtitles(externalSubtitles);
        if (externalSubtitles.length > 0) {
            setCurrentSubtitle(0); // Select first subtitle by default if available
        } else {
            setCurrentSubtitle(-1);
        }
    }, [externalSubtitles]);

    // Initialize HLS or native player
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const isMp4 = src && src.includes('.mp4');

        if (isMp4) {
            video.src = src;
            // Resume from saved progress if available
            const savedProgress = localStorage.getItem(`progress-${src}`);
            if (savedProgress) {
                video.currentTime = parseFloat(savedProgress);
            }
            video.play().catch(e => console.log("Autoplay blocked", e));
        } else if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels.map(l => ({
                    height: l.height,
                    bitrate: l.bitrate
                }));
                setQualities(levels);
                
                // Resume from saved progress if available
                const savedProgress = localStorage.getItem(`progress-${src}`);
                if (savedProgress) {
                    video.currentTime = parseFloat(savedProgress);
                }
                
                video.play().catch(e => console.log("Autoplay blocked", e));
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                if (currentQuality === -1) {
                    // Auto quality switch update if needed
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log("HLS Network Error, trying to recover...");
                            // If it's a manifest load error (CORS or not HLS), fallback might be better than infinite loop
                            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                                console.log("Manifest load failed (possibly CORS or MP4 without extension). Falling back to native.");
                                hls.destroy();
                                video.src = src;
                                video.play().catch(e => console.log("Autoplay blocked on fallback", e));
                            } else {
                                hls.startLoad();
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("HLS Media Error, trying to recover...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.log("HLS Error unrecoverable, falling back to native playback...");
                            hls.destroy();
                            // Fallback a reproductor nativo
                            video.src = src;
                            video.play().catch(e => console.log("Autoplay blocked on fallback", e));
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src]);

    // Handle Time Updates and Buffering
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            setProgress(video.currentTime);
            // Save progress every 5 seconds to local storage
            if (Math.floor(video.currentTime) % 5 === 0) {
                localStorage.setItem(`progress-${src}`, video.currentTime.toString());
            }
        };

        const onDurationChange = () => setDuration(video.duration);
        
        const onProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('progress', onProgress);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('progress', onProgress);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
        };
    }, [src]);

    // Volume handling
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent scrolling
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                    togglePlay();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'arrowleft':
                    skip(-10);
                    break;
                case 'arrowright':
                    skip(10);
                    break;
                case 'arrowup':
                    setVolume(v => Math.min(1, v + 0.1));
                    break;
                case 'arrowdown':
                    setVolume(v => Math.max(0, v - 0.1));
                    break;
                case 'm':
                    setIsMuted(prev => !prev);
                    break;
                case 'escape':
                    if (isFullscreen) toggleFullscreen();
                    break;
                default:
                    break;
            }
            showControls();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const isDirectVideo = isDirect !== undefined ? isDirect : (src && (src.includes('.m3u8') || src.includes('.mp4')));

    // Mouse/Touch movement to show/hide controls
    const showControls = useCallback(() => {
        setIsControlsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        
        // On touch devices, always auto-hide after 3s (regardless of play state)
        // On desktop, hide only if playing or if it's an iframe
        if (isTouchDevice.current || isPlaying || !isDirectVideo) {
            hideTimeoutRef.current = setTimeout(() => {
                setIsControlsVisible(false);
            }, 3000);
        }
    }, [isPlaying, isDirectVideo]);

    // Toggle controls on touch tap (show if hidden, hide if visible)
    const handleTouchTap = useCallback(() => {
        setIsControlsVisible(prev => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (!prev) {
                // Showing controls — start auto-hide timer
                hideTimeoutRef.current = setTimeout(() => {
                    setIsControlsVisible(false);
                }, 3000);
                return true;
            } else {
                // Already visible — hide immediately
                return false;
            }
        });
    }, []);

    // Auto-hide controls on initial load
    useEffect(() => {
        showControls();
        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [src, showControls]);

    // Fullscreen handling
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play().catch(e => console.log("Play failed:", e));
        } else {
            videoRef.current.pause();
        }
    };

    const seek = (time) => {
        videoRef.current.currentTime = time;
        setProgress(time);
    };

    const skip = (seconds) => {
        videoRef.current.currentTime += seconds;
    };

    const handleVolumeChange = (newVolume) => {
        setVolume(newVolume);
        localStorage.setItem('player-volume', newVolume.toString());
        if (newVolume > 0) setIsMuted(false);
    };

    const handleQualityChange = (index) => {
        setCurrentQuality(index);
        if (hlsRef.current) {
            hlsRef.current.currentLevel = index;
        }
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group"
            onMouseMove={isTouchDevice.current ? undefined : showControls}
            onMouseEnter={isTouchDevice.current ? undefined : showControls}
            onClick={isTouchDevice.current ? handleTouchTap : showControls}
            onTouchStart={isTouchDevice.current ? undefined : showControls}
            onMouseLeave={() => !isTouchDevice.current && isPlaying && setIsControlsVisible(false)}
        >
            {isDirectVideo ? (
                <>
                    <video 
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        onEnded={onEnded}
                    />

                    {/* Buffering Indicator */}
                    {isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                            <div className="w-16 h-16 border-4 border-anime-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,138,0,0.4)]"></div>
                        </div>
                    )}

                    {/* Controls Layer */}
                    <VideoControls 
                        isPlaying={isPlaying}
                        progress={progress}
                        duration={duration}
                        buffered={buffered}
                        volume={volume}
                        isMuted={isMuted}
                        isFullscreen={isFullscreen}
                        isVisible={isControlsVisible}
                        title={title}
                        qualities={qualities}
                        currentQuality={currentQuality}
                        subtitles={subtitles}
                        currentSubtitle={currentSubtitle}
                        onTogglePlay={togglePlay}
                        onSeek={seek}
                        onSkip={skip}
                        onVolumeChange={handleVolumeChange}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        onToggleFullscreen={toggleFullscreen}
                        onQualityChange={handleQualityChange}
                        onSubtitleChange={setCurrentSubtitle}
                        onBack={onBack}
                        onNextEpisode={nextEpisode}
                    />
                </>
            ) : (
                <>
                    <iframe
                        src={src}
                        className="w-full h-full border-none"
                        allowFullScreen
                        allow="autoplay; fullscreen"
                    ></iframe>
                    
                    {/* Simplified Top Bar for iFrames */}
                    <div className={`
                        absolute inset-x-0 top-0 z-40 flex flex-col justify-between transition-opacity duration-500 pointer-events-none
                        ${isControlsVisible ? 'opacity-100' : 'opacity-0'}
                    `}>
                        <div className="h-32 bg-gradient-to-b from-black/80 to-transparent p-6 flex items-start justify-between pointer-events-auto">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={onBack}
                                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"></line>
                                        <polyline points="12 19 5 12 12 5"></polyline>
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-white text-xl font-medium drop-shadow-md">{title || 'Reproduciendo...'}</h1>
                                    <p className="text-white/60 text-sm">Servidor Externo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VideoPlayer;
