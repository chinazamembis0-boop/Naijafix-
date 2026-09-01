import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'
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

function isFullUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function resolveAdUrl(value) {
  if (!value) return ''

  const trimmed = String(value).trim()

  if (isFullUrl(trimmed)) {
    return `${trimmed}?t=${Date.now()}`
  }

  const { data } = supabase.storage.from('ad-images').getPublicUrl(trimmed)
  const publicUrl = data?.publicUrl || ''
  return publicUrl ? `${publicUrl}?t=${Date.now()}` : ''
}

function normalizeAd(row) {
  if (!row) return null

  const hasMedia = Boolean(row.image_url) || Boolean(row.video_url)

  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    image: row.image_url ? resolveAdUrl(row.image_url) : '',
    video: row.video_url ? resolveAdUrl(row.video_url) : '',
    label: row.label || 'Sponsored',
    ctaText: row.cta_text || '',
    hasMedia,
  }
}

/* eslint-disable react-refresh/only-export-components */
export function getDemoAds() {
  return demoAds
}

export function useAdvertisements() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (error) throw error

        const fetched = (data || [])
          .map(normalizeAd)
          .filter((ad) => ad && (ad.image || ad.video))

        if (!cancelled) {
          setAds(fetched.length ? fetched : demoAds)
        }
      } catch (err) {
        console.error('Failed to load advertisements:', err)
        if (!cancelled) setAds(demoAds)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { ads, loading }
}

export function AdBanner({ ad, onDismiss, onAction, allAds = null }) {
  const [dismissed, setDismissed] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (dismissed || !ad) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.(ad)
  }

  const sourceAds = allAds && allAds.length ? allAds : demoAds
  const hasVideo = ad.video
  const videoAds = sourceAds.filter((a) => a.video)

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
          initialIndex={videoAds.findIndex((a) => a.id === ad.id)}
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
  const { ads, loading } = useAdvertisements()
  const [index, setIndex] = useState(0)
  const [dismissedIds, setDismissedIds] = useState(() => new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (ads.length && !initializedRef.current) {
      setIndex(Math.floor(Math.random() * ads.length))
      initializedRef.current = true
    }
  }, [ads])

  const visibleAds = ads.filter((ad) => !dismissedIds.has(ad.id))

  useEffect(() => {
    if (!visibleAds.length) return
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % visibleAds.length)
    }, 30000)
    return () => clearInterval(interval)
  }, [visibleAds])

  if (loading) {
    return (
      <div className={`nf-ad-placement nf-ad-${position}`}>
        <div className="nf-ad-banner" />
      </div>
    )
  }

  if (!visibleAds.length) return null

  const ad = visibleAds[index % visibleAds.length]

  return (
    <div className={`nf-ad-placement nf-ad-${position}`}>
      <AdBanner
        key={ad.id}
        ad={ad}
        allAds={ads}
        onDismiss={() => {
          setDismissedIds((prev) => {
            const next = new Set(prev)
            next.add(ad.id)
            return next
          })
          setIndex(0)
        }}
        onAction={onAction}
      />
    </div>
  )
}

export default AdBanner
