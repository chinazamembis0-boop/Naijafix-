import { useState } from 'react'

const demoAds = [
  {
    id: 'ad-1',
    title: 'Trusted Services, Right at Your Door',
    description: 'Find reliable local professionals with NaijaFix.',
    image: '/images/ad-promo.jpg',
    label: 'Sponsored',
    ctaText: 'Explore Services',
  },
  {
    id: 'ad-2',
    title: 'Get Your Home Looking New',
    description: 'Professional cleaning and renovation services nearby.',
    image: '/images/ad-promo.jpg',
    label: 'NaijaFix Promotion',
    ctaText: 'Learn More',
  },
  {
    id: 'ad-3',
    title: 'Emergency Repairs? We\'ve Got You',
    description: '24/7 available professionals for urgent fixes.',
    image: '/images/ad-promo.jpg',
    label: 'Sponsored',
    ctaText: 'Find Help Now',
  },
]

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
    </div>
  )
}

export function AdPlacement({ position = 'inline', onAction }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

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
