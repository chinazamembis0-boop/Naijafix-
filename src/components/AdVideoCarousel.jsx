import { useState, useEffect, useRef, useCallback, useId } from 'react'

const VIDEO_ADS = [
  {
    id: 'naijafix-ad-1',
    video: '/videos/ads/naijafix-ad-1.mp4',
    poster: '/images/ad-promo.jpg',
    label: 'Sponsored',
    title: 'Trusted Services, Right at Your Door',
    description: 'Find reliable local professionals with NaijaFix.',
    ctaText: 'Explore Services',
  },
  {
    id: 'naijafix-ad-2',
    video: '/videos/ads/naijafix-ad-2.mp4',
    poster: '/images/ad-promo.jpg',
    label: 'NaijaFix Promotion',
    title: 'Get Your Home Looking New',
    description: 'Professional cleaning and renovation services nearby.',
    ctaText: 'Learn More',
  },
  {
    id: 'naijafix-ad-3',
    video: '/videos/ads/naijafix-ad-3.mp4',
    poster: '/images/ad-promo.jpg',
    label: 'Sponsored',
    title: 'Emergency Repairs? We\'ve Got You',
    description: '24/7 available professionals for urgent fixes.',
    ctaText: 'Find Help Now',
  },
  {
    id: 'naijafix-ad-4',
    video: '/videos/ads/naijafix-ad-4.mp4',
    poster: '/images/ad-promo.jpg',
    label: 'Sponsored',
    title: 'Find a Trusted Professional',
    description: 'Verified providers ready to help near you.',
    ctaText: 'Book a Service',
  },
  {
    id: 'naijafix-ad-5',
    video: '/videos/ads/naijafix-ad-5.mp4',
    poster: '/images/ad-promo.jpg',
    label: 'NaijaFix',
    title: 'Get Help Near You',
    description: 'Connect with top-rated experts in your area.',
    ctaText: 'Get Started',
  },
]

/* eslint-disable react-refresh/only-export-components */
export function getVideoAds() {
  return VIDEO_ADS
}

export function AdVideoCarousel({ ads = VIDEO_ADS, poster = '/images/ad-promo.jpg', onAction, className = '', initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const videoRef = useRef(null)
  const interactTimerRef = useRef(null)
  const adId = useId()
  const playAttemptedRef = useRef(false)

  const currentAd = ads[currentIndex] || ads[0]
  const validAds = ads.filter(ad => ad && ad.video)
  const displayIndex = validAds.length > 0 ? validAds.findIndex(ad => ad.id === currentAd?.id) : 0
  const totalAds = validAds.length || ads.length

  const pauseOthers = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('naijafix-ad-play', { detail: { id: adId } }))
    }
  }, [adId])

  useEffect(() => {
    const handleOtherPlay = (event) => {
      if (event.detail?.id && event.detail.id !== adId && videoRef.current) {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }

    window.addEventListener('naijafix-ad-play', handleOtherPlay)
    return () => window.removeEventListener('naijafix-ad-play', handleOtherPlay)
  }, [adId])

  useEffect(() => {
    playAttemptedRef.current = false
    const video = videoRef.current
    if (!video || !currentAd?.video) {
      setHasError(!currentAd?.video)
      return
    }

    const tryPlay = async () => {
      if (playAttemptedRef.current) return
      playAttemptedRef.current = true
      try {
        await video.play()
        setIsPlaying(true)
        pauseOthers()
      } catch {
        setIsPlaying(false)
      }
    }

    if (video.readyState >= 2) {
      tryPlay()
    } else {
      video.addEventListener('canplay', tryPlay, { once: true })
      video.load()
    }

    return () => {
      video.removeEventListener('canplay', tryPlay)
    }
  }, [currentIndex, currentAd?.video, pauseOthers])

  const goTo = useCallback((index) => {
    if (!ads.length) return
    const nextIndex = ((index % ads.length) + ads.length) % ads.length
    setCurrentIndex(nextIndex)
    setHasError(false)
    setIsPlaying(false)
    setShowControls(false)
  }, [ads])

  const goNext = useCallback(() => {
    goTo(currentIndex + 1)
  }, [currentIndex, goTo])

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  const handleEnded = useCallback(() => {
    goNext()
  }, [goNext])

  const handlePlay = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      await video.play()
      setIsPlaying(true)
      pauseOthers()
    } catch {
      setIsPlaying(false)
    }
  }, [pauseOthers])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const handleInteractionStart = useCallback(() => {
    setShowControls(true)
    if (interactTimerRef.current) clearTimeout(interactTimerRef.current)
  }, [])

  const handleInteractionEnd = useCallback(() => {
    interactTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2500)
  }, [])

  const handleVideoError = useCallback(() => {
    setHasError(true)
    setIsPlaying(false)
  }, [])

  const handleAction = useCallback(() => {
    onAction?.(currentAd)
  }, [currentAd, onAction])

  useEffect(() => {
    return () => {
      if (interactTimerRef.current) clearTimeout(interactTimerRef.current)
    }
  }, [])

  const showFallback = !currentAd?.video || hasError

  return (
    <div
      className={`nf-ad-video-carousel ${className}`}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
    >
      <div className="nf-ad-video-wrapper">
        {showFallback ? (
          <div className="nf-ad-video-fallback" role="img" aria-label={currentAd?.title || 'NaijaFix advertisement'}>
            <img
              src={currentAd?.poster || poster}
              alt={currentAd?.title || 'NaijaFix advertisement'}
              loading="lazy"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            className="nf-ad-video"
            src={currentAd.video}
            poster={currentAd.poster || poster}
            autoplay
            muted={isMuted}
            playsInline
            preload="metadata"
            controls={showControls}
            onEnded={handleEnded}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleVideoError}
            onLoadedData={() => setHasError(false)}
            aria-label={`Advertisement: ${currentAd.title}`}
          >
            Your browser does not support the video tag.
          </video>
        )}

        <div className="nf-ad-video-overlay">
          <span className="nf-ad-video-label">{currentAd?.label || 'Sponsored'}</span>
          <span className="nf-ad-video-brand">NaijaFix</span>
        </div>

        {showFallback && currentAd?.ctaText && (
          <div className="nf-ad-video-cta-wrapper">
            <button type="button" className="nf-ad-video-cta" onClick={handleAction}>
              {currentAd.ctaText}
            </button>
          </div>
        )}

        {!showFallback && (
          <div className="nf-ad-video-controls" aria-label="Video advertisement controls">
            <button
              type="button"
              className="nf-ad-video-btn nf-ad-video-prev"
              onClick={goPrev}
              aria-label="Previous advertisement"
              title="Previous"
            >
              ‹
            </button>

            <button
              type="button"
              className="nf-ad-video-btn nf-ad-video-play"
              onClick={isPlaying ? handlePause : handlePlay}
              aria-label={isPlaying ? 'Pause advertisement' : 'Play advertisement'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            <button
              type="button"
              className="nf-ad-video-btn nf-ad-video-mute"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute advertisement' : 'Mute advertisement'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            <button
              type="button"
              className="nf-ad-video-btn nf-ad-video-next"
              onClick={goNext}
              aria-label="Next advertisement"
              title="Next"
            >
              ›
            </button>
          </div>
        )}

        <div className="nf-ad-video-indicator" aria-live="polite">
          {displayIndex + 1} / {totalAds}
        </div>
      </div>

      {!showFallback && currentAd?.ctaText && (
        <div className="nf-ad-video-content">
          <h4 className="nf-ad-video-title">{currentAd.title}</h4>
          {currentAd.description && <p className="nf-ad-video-description">{currentAd.description}</p>}
          <button type="button" className="nf-ad-video-cta" onClick={handleAction}>
            {currentAd.ctaText}
          </button>
        </div>
      )}
    </div>
  )
}

export default AdVideoCarousel