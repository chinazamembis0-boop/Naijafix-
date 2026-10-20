import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fetchCustomerOkadaRides, cancelOkadaRide, okadaStatusLabel, okadaStatusIcon, okadaRideReference } from './OkadaData.js'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function OkadaHistory({ user, onBack, onBookOkada }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!user?.user_id) {
      setLoading(false)
      return
    }
    const t0 = performance.now()
    console.log('[OkadaHistory] mount->query start', Math.round(t0), 'ms')
    setLoading(true)
    setError('')
    try {
      const t1 = performance.now()
      const data = await fetchCustomerOkadaRides(user.user_id)
      console.log('[OkadaHistory] query finished in', Math.round(performance.now() - t1), 'ms; rides:', (data || []).length)
      setRides(data)
    } catch (e) {
      console.error('Could not load your Okada rides.')
      setError('Could not load your Okada rides.')
    }
    setLoading(false)
    console.log('[OkadaHistory] total mount->done', Math.round(performance.now() - t0), 'ms')
  }

  useEffect(() => {
    load()
  }, [user])

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
        {loading ? (
          <div className="empty-box large-empty"><span>⏳</span><h4>Loading...</h4></div>
        ) : error ? (
          <p className="nf-form-error">{error}</p>
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
