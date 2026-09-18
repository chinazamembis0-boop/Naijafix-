import { useEffect, useState } from 'react'
import { supabase, getSignedStorageUrl } from '../supabase.js'

export default function ShareableProvider({ provider, onBack }) {
  const [samples, setSamples] = useState([])
  const [packages, setPackages] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!provider?.user_id) {
        setLoading(false)
        return
      }
      try {
        const [samplesRes, packagesRes, reviewsRes] = await Promise([
          supabase.from('provider_work_samples').select('*').eq('provider_user_id', provider.user_id).order('created_at', { ascending: false }),
          supabase.from('service_packages').select('*').eq('provider_user_id', provider.user_id),
          supabase.from('reviews').select('*').eq('provider_user_id', provider.user_id).order('created_at', { ascending: false }).limit(10),
        ])

        const signedSamples = []
        for (const s of (samplesRes.data || [])) {
          try {
            const url = await getSignedStorageUrl('provider-work-samples', s.image_url)
            signedSamples.push({ ...s, signedUrl: url })
          } catch {
            signedSamples.push({ ...s, signedUrl: '' })
          }
        }
        setSamples(signedSamples)
        setPackages(packagesRes.data || [])
        setReviews(reviewsRes.data || [])
      } catch (error) {
        console.error('Failed to load shareable profile:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [provider?.user_id])

  const handleShare = async () => {
    const url = window.location.origin + '/share-provider?provider=' + provider.user_id
    if (navigator.share) {
      try {
        await navigator.share({ title: provider.business_name, text: provider.description || '', url })
        return
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard')
    } catch {
      alert(url)
    }
  }

  if (loading) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>Back</button>
          <div className="brand"><div className="brand-icon">🇳🇬</div><div><div style={{ fontWeight: 800, fontSize: 18 }}>NaijaFix</div></div></div>
        </header>
        <main className="inner-content"><div className="empty-box large-empty"><span>⏳</span><h4>Loading provider...</h4></div></main>
      </div>
    )
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>Back</button>
        <div className="brand"><div className="brand-icon">🇳🇬</div><div><div style={{ fontWeight: 800, fontSize: 18 }}>NaijaFix</div></div></div>
      </header>
      <main className="provider-details">
        <div className="large-avatar">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt={provider.business_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            provider.business_name?.charAt(0)?.toUpperCase() || 'P'
          )}
        </div>
        <h2>{provider.business_name}</h2>
        {provider.verified && <span className="verified-badge">Verified provider</span>}
        {averageRating && <span className="verified-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Star {averageRating} ({reviews.length} reviews)</span>}
        {provider.emergency_available && <span className="verified-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Emergency available</span>}
        <p className="provider-location">Location {provider.location || 'not provided'}</p>
        <section className="details-card">
          <h3>About this provider</h3>
          <p>{provider.description || 'This provider has not added a description yet.'}</p>
        </section>
        {packages.length > 0 && (
          <section className="details-card">
            <h3>Service packages</h3>
            <div className="sample-grid">
              {packages.map((pkg) => (
                <div key={pkg.id} style={{ background: 'var(--nf-bg)', padding: 12, borderRadius: 10 }}>
                  <strong>{pkg.name}</strong>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>{pkg.description}</p>
                  <p style={{ fontWeight: 800, color: 'var(--nf-navy)' }}>N{Number(pkg.price).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {samples.length > 0 && (
          <section className="details-card">
            <h3>Work samples</h3>
            <div className="sample-grid">
              {samples.map((s) => (
                <div key={s.id}>
                  {s.signedUrl ? <img src={s.signedUrl} alt={s.caption || 'Work sample'} loading="lazy" /> : null}
                  {s.caption && <p>{s.caption}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {reviews.length > 0 && (
          <section className="details-card">
            <h3>Reviews</h3>
            {reviews.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid #e2e8e4', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Star {r.rating}/5</strong><small style={{ color: 'var(--nf-text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</small></div>
                {r.comment && <p style={{ margin: '4px 0', fontSize: 14 }}>{r.comment}</p>}
                {r.provider_response && <div style={{ background: 'var(--nf-navy-light)', padding: 8, borderRadius: 6, marginTop: 6 }}><strong style={{ fontSize: 12 }}>Provider response</strong><p style={{ margin: 0, fontSize: 13 }}>{r.provider_response}</p></div>}
              </div>
            ))}
          </section>
        )}
        <button className="primary-full" onClick={handleShare} style={{ marginTop: 16 }}>Share provider</button>
      </main>
    </div>
  )
}