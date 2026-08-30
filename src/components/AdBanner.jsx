import { useState } from 'react'
import { AdVideoCarousel } from './AdVideoCarousel.jsx'

const demoAds = [
  {
    id: 'naijafix-ad-1',
    video: '/videos/ads/naijafix-ad-1.mp4',
    image: '/images/ad-promo.jpg',
    title: 'Trusted Services, Right at Your Door',
    description: 'Find reliable local professionals with NaijaFix.',
    label: 'Sponsored',
    ctaText: 'Explore Services',
  },
  {
    id: 'naijafix-ad-2',
    video: '/videos/ads/naijafix-ad-2.mp4',
    image: '/images/ad-promo.jpg',
    title: 'Get Your Home Looking New',
    description: 'Professional cleaning and renovation services nearby.',
    label: 'NaijaFix Promotion',
    ctaText: 'Learn More',
  },
  {
    id: 'naijafix-ad-3',
    video: '/videos/ads/naijafix-ad-3.mp4',
    image: '/images/ad-promo.jpg',
    title: 'Emergency Repairs? We\'ve Got You',
    description: '24/7 available professionals for urgent fixes.',
    label: 'Sponsored',
    ctaText: 'Find Help Now',
  },
  {
    id: 'naijafix-ad-4',
    video: '/videos/ads/naijafix-ad-4.mp4',
    image: '/images/ad-promo.jpg',
    title: 'Find a Trusted Professional',
    description: 'Verified providers ready to help near you.',
    label: 'Sponsored',
    ctaText: 'Book a Service',
  },
  {
    id: 'naijafix-ad-5',
    video: '/videos/ads/naijafix-ad-5.mp4',
    image: '/images/ad-promo.jpg',
    title: 'Get Help Near You',
    description: 'Connect with top-rated experts in your area.',
    label: 'NaijaFix',
    ctaText: 'Get Started',
  },
]

/* eslint-disable react-refresh/only-export-components */
export function getDemoAds() {
  return demoAds
}

export function AdBanner({ ad, onDismiss, onAction }) {
  const [dismissed, setDismissed] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (dismissed || !ad) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.(ad)
  }

  const hasVideo = ad.video
  const videoAds = demoAds.filter(a => a.video)

  return (
    <div className="nf-ad-banner">
      <div className="nf-ad-header">
        <span className="nf-ad-label">{ad.label || 'Sponsored'}</span>
        <button
          type="button"
          className="nf-ad-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss advertisement"
        >
          ×
        </button>
      </div>

      {hasVideo && videoAds.length > 0 ? (
        <AdVideoCarousel
          ads={videoAds}
          poster={ad.image || '/images/ad-promo.jpg'}
          onAction={onAction}
          initialIndex={videoAds.findIndex(a => a.id === ad.id)}
        />
      ) : (
        <>
          {ad.image && !imgError ? (
            <div className="nf-ad-image-wrapper">
              <img
                src={ad.image}
                alt={ad.title}
                className="nf-ad-image"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="nf-ad-visual">
              <div className="nf-ad-visual-inner">
                <span className="nf-ad-visual-icon">🏠</span>
                <span className="nf-ad-visual-text">NaijaFix</span>
              </div>
            </div>
          )}
        </>
      )}

      {!hasVideo && (
        <div className="nf-ad-content">
          <h4 className="nf-ad-title">{ad.title}</h4>
          {ad.description && <p className="nf-ad-description">{ad.description}</p>}
          {ad.ctaText && (
            <button
              type="button"
              className="nf-ad-cta"
              onClick={() => onAction?.(ad)}
            >
              {ad.ctaText}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AdPlacement({ position = 'inline', onAction }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const dismissed = false

  if (dismissed) return null

  const ad = demoAds[currentIndex % demoAds.length]

  if (!ad) return null

  return (
    <div className={`nf-ad-placement nf-ad-${position}`}>
      <AdBanner
        ad={ad}
        onDismiss={() => {
          setCurrentIndex((i) => i + 1)
        }}
        onAction={onAction}
      />
    </div>
  )
}

export default AdBanner
