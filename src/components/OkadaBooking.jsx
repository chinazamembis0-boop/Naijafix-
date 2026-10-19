import { useState } from 'react'
import { createOkadaRide } from './OkadaData.js'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function OkadaBooking({ user, onBack, onRideCreated, onViewRides }) {
  const [form, setForm] = useState({
    passengerName: '',
    passengerPhone: '',
    pickupAddress: '',
    pickupArea: '',
    destinationAddress: '',
    destinationArea: '',
    fareEstimate: '',
  })
  const [ride, setRide] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!user?.user_id) {
      setError('Please sign in before booking an Okada ride.')
      return
    }
    const required = [
      { label: 'Passenger name', value: form.passengerName },
      { label: 'Passenger phone', value: form.passengerPhone },
      { label: 'Pickup address', value: form.pickupAddress },
      { label: 'Pickup area', value: form.pickupArea },
      { label: 'Destination address', value: form.destinationAddress },
      { label: 'Destination area', value: form.destinationArea },
    ]
    for (const field of required) {
      if (!field.value || !String(field.value).trim()) {
        setError(`${field.label} is required.`)
        return
      }
    }
    if (!form.fareEstimate || Number(form.fareEstimate) <= 0) {
      setError('Fare estimate is required.')
      return
    }
    setCreating(true)
    const result = await createOkadaRide({
      passengerName: form.passengerName.trim(),
      passengerPhone: form.passengerPhone.trim(),
      pickupAddress: form.pickupAddress.trim(),
      pickupArea: form.pickupArea.trim(),
      destinationAddress: form.destinationAddress.trim(),
      destinationArea: form.destinationArea.trim(),
      fareEstimate: form.fareEstimate,
    })
    setCreating(false)
    if (result.success) {
      setRide(result.ride)
      onRideCreated?.(result.ride)
    } else {
      setError(result.error || 'Could not create your ride. Please try again.')
    }
  }

  if (ride) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>← Back</button>
          <Logo size="small" showTagline={false} />
        </header>
        <main className="inner-content">
          <div className="empty-box large-empty">
            <span>✅</span>
            <h2>Okada ride requested</h2>
            <p>Your passenger ride request has been submitted to Ewizzy riders.</p>
            <div className="nf-booking-reference-card">
              <span className="nf-booking-reference-label">Ride reference</span>
              <strong className="nf-booking-reference">#OKADA-{100000 + ride.id}</strong>
            </div>
            <div className="nf-order-actions">
              <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => onViewRides?.()}>
                View My Okada Rides
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>
      <main className="inner-content">
        <span className="section-label">BOOK AN OKADA RIDE</span>
        <h2>Ride with Ewizzy</h2>
        <p>Request an Ewizzy motorcycle/Okada rider to transport you from pickup to destination.</p>
        <form onSubmit={handleSubmit}>
          <div className="nf-form-section">
            <h3>Passenger Details</h3>
            <label className="nf-field">
              <span className="nf-field-label">Passenger name *</span>
              <input type="text" value={form.passengerName} onChange={(e) => updateForm('passengerName', e.target.value)} required />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Passenger phone *</span>
              <input type="tel" value={form.passengerPhone} onChange={(e) => updateForm('passengerPhone', e.target.value)} required />
            </label>
          </div>
          <div className="nf-form-section">
            <h3>Pickup</h3>
            <label className="nf-field">
              <span className="nf-field-label">Pickup address *</span>
              <input type="text" value={form.pickupAddress} onChange={(e) => updateForm('pickupAddress', e.target.value)} required />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Pickup area *</span>
              <input type="text" value={form.pickupArea} onChange={(e) => updateForm('pickupArea', e.target.value)} required />
            </label>
          </div>
          <div className="nf-form-section">
            <h3>Destination</h3>
            <label className="nf-field">
              <span className="nf-field-label">Destination address *</span>
              <input type="text" value={form.destinationAddress} onChange={(e) => updateForm('destinationAddress', e.target.value)} required />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Destination area *</span>
              <input type="text" value={form.destinationArea} onChange={(e) => updateForm('destinationArea', e.target.value)} required />
            </label>
          </div>
          <div className="nf-form-section">
            <label className="nf-field">
              <span className="nf-field-label">Fare estimate (naira) *</span>
              <input type="number" min="0" step="1" value={form.fareEstimate} onChange={(e) => updateForm('fareEstimate', e.target.value)} required />
            </label>
          </div>
          {error && <p className="nf-form-error">{error}</p>}
          <button type="submit" className="primary-full" disabled={creating}>
            {creating ? 'Requesting...' : 'Request Okada Ride'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default OkadaBooking
