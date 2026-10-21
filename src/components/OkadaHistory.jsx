import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fetchCustomerOkadaRides, cancelOkadaRide, okadaStatusLabel, okadaStatusIcon, okadaRideReference } from './OkadaData.js'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function OkadaHistory({ user, onBack, onBookOkada }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [diag, setDiag] = useState({ mountToQueryStart: null, queryDuration: null, total: null, count: 0, error: null, mounted: true })

  const load = async () => {
    if (!user?.user_id) {
      setDiag((d) => ({ ...d, error: 'no_user_id', total: 0 }))
      setLoading(false)
      setError('Please sign in to view your Okada rides.')
      return
    }
    const t0 = performance.now()
    setLoading(true)
    setError('')
    try {
      const t1 = performance.now()
      const data = await fetchCustomerOkadaRides(user.user_id)
      setDiag({ mountToQueryStart: Math.round(t1 - t0), queryDuration: Math.round(performance.now() - t1), total: Math.round(performance.now() - t0), count: (data || []).length, error: null })
      setRides(data || [])
    } catch (e) {
      setDiag({ mountToQueryStart: null, queryDuration: null, total: Math.round(performance.now() - t0), count: 0, error: 'query_failed' })
      setError('Could not load your Okada rides. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [user?.user_id])

  const handleCancel = async (rideId) => {
    const result = await cancelOkadaRide(rideId, 'Cancelled by passenger')
    if (result.success) {
      setRides((current) => current.map((r) => (r.id === rideId ? result.ride : r)))
    } else {
      setError(result.error || 'Could not cancel this ride.')
    }
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>
      <main className="inner-content">
        <span className="section-label">OKADA RIDES</span>
        <h2>My Okada Rides</h2>
        <div style={{ border: '1px dashed #999', padding: 8, marginBottom: 12, fontSize: 12 }}>
          <strong>Temporary performance diagnostics</strong>
          <div>Mounted: {diag.mounted ? 'yes' : 'no'}</div>
          <div>Mount→query start: {diag.mountToQueryStart ?? '…'} ms</div>
          <div>Query duration: {diag.queryDuration ?? '…'} ms</div>
          <div>Total mount→done: {diag.total ?? '…'} ms</div>
          <div>Rides returned: {diag.count}</div>
          {diag.error && <div>Error: {diag.error}</div>}
        </div>
        {loading ? (
          <div className="empty-box large-empty"><span>⏳</span><h4>Loading...</h4></div>
        ) : error ? (
          <div className="empty-box">
            <p className="nf-form-error">{error}</p>
            <button className="dash-btn dash-btn-primary dash-btn-full" onClick={load}>Retry</button>
          </div>
        ) : rides.length === 0 ? (
          <div className="empty-box">
            <span>🏍️</span>
            <h4>No Okada rides yet</h4>
            <p>Book your first Okada ride.</p>
            <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => onBookOkada?.()}>Book Okada Ride</button>
          </div>
        ) : (
          <div className="nf-order-list">
            {rides.map((ride) => (
              <div key={ride.id} className="nf-order-card">
                <div className="nf-order-card-header">
                  <h4>{okadaRideReference(ride.id)}</h4>
                  <span className={`nf-order-status nf-order-status--${ride.status}`}>
                    {okadaStatusIcon(ride.status)} {okadaStatusLabel(ride.status)}
                  </span>
                </div>
                <p className="nf-order-address">📍 {ride.pickup_address} → 🎯 {ride.destination_address}</p>
                <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>
                  Passenger: {ride.passenger_name} ({ride.passenger_phone})
                </p>
                <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>
                  Fare estimate: {formatNaira(ride.fare_estimate)}
                </p>
                {['pending', 'searching_for_rider'].includes(ride.status) && !ride.rider_id && (
                  <button
                    className="dash-btn dash-btn-outline dash-btn-full"
                    onClick={() => handleCancel(ride.id)}
                  >
                    Cancel Ride
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default OkadaHistory
