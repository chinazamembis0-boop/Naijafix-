import { useState } from 'react'
import { createDispatchBooking } from './DispatchData.js'
import { Logo } from './Logo.jsx'

function DispatchBooking({ user, onBack, onBookingCreated, onViewBookings }) {
  const [form, setForm] = useState({
    pickupContactName: '',
    pickupContactPhone: '',
    pickupAddress: '',
    pickupArea: '',
    recipientName: '',
    recipientPhone: '',
    dropoffAddress: '',
    dropoffArea: '',
    itemDescription: '',
    packageDetails: '',
    additionalInstructions: '',
  })
  const [booking, setBooking] = useState(null)
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
      setError('Please sign in before booking a dispatch rider.')
      return
    }

    const required = [
      { label: 'Pickup contact name', value: form.pickupContactName },
      { label: 'Pickup contact phone', value: form.pickupContactPhone },
      { label: 'Pickup address', value: form.pickupAddress },
      { label: 'Pickup area', value: form.pickupArea },
      { label: 'Recipient name', value: form.recipientName },
      { label: 'Recipient phone', value: form.recipientPhone },
      { label: 'Drop-off address', value: form.dropoffAddress },
      { label: 'Drop-off area', value: form.dropoffArea },
      { label: 'Item description', value: form.itemDescription },
    ]

    for (const field of required) {
      if (!field.value || !String(field.value).trim()) {
        setError(`${field.label} is required.`)
        return
      }
    }

    setCreating(true)
    const result = await createDispatchBooking({
      customerUserId: user.user_id,
      pickupContactName: form.pickupContactName.trim(),
      pickupContactPhone: form.pickupContactPhone.trim(),
      pickupAddress: form.pickupAddress.trim(),
      pickupArea: form.pickupArea.trim(),
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      dropoffAddress: form.dropoffAddress.trim(),
      dropoffArea: form.dropoffArea.trim(),
      itemDescription: form.itemDescription.trim(),
      packageDetails: form.packageDetails.trim() || null,
      additionalInstructions: form.additionalInstructions.trim() || null,
    })
    setCreating(false)

    if (result.success) {
      setBooking(result.booking)
      onBookingCreated?.(result.booking)
    } else {
      setError(result.error || 'Could not create your booking. Please try again.')
    }
  }

  if (booking) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>← Back</button>
          <Logo size="small" showTagline={false} />
        </header>
        <main className="inner-content">
          <div className="empty-box large-empty">
            <span>✅</span>
            <h2>Dispatch booking created</h2>
            <p>
              Your parcel delivery request has been submitted to Ewizzy riders.
              A rider will accept it shortly.
            </p>
            <div className="nf-booking-reference-card">
              <span className="nf-booking-reference-label">Booking reference</span>
              <strong className="nf-booking-reference">
                #DISP-{100000 + booking.id}
              </strong>
            </div>
            <div className="nf-booking-summary">
              <h3>Pickup</h3>
              <p><strong>{form.pickupContactName}</strong> — {form.pickupContactPhone}</p>
              <p>📍 {form.pickupAddress}</p>
              <p>🏘️ {form.pickupArea}</p>
              <h3>Drop-off</h3>
              <p><strong>{form.recipientName}</strong> — {form.recipientPhone}</p>
              <p>📍 {form.dropoffAddress}</p>
              <p>🏘️ {form.dropoffArea}</p>
              {form.itemDescription && (
                <div>
                  <h3>Item</h3>
                  <p>{form.itemDescription}</p>
                </div>
              )}
              {form.packageDetails && (
                <div>
                  <h3>Package details</h3>
                  <p>{form.packageDetails}</p>
                </div>
              )}
            </div>
            <div className="nf-order-actions">
              <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => onViewBookings?.()}>
                View My Dispatch Bookings
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
        <span className="section-label">BOOK A DISPATCH RIDER</span>
        <h2>Send a Parcel with Ewizzy</h2>
        <p>
          Request an Ewizzy motorcycle/Okada rider to collect and deliver
          parcels or other permitted items. No restaurant order needed.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="nf-form-section">
            <h3>Pickup Details</h3>
            <label className="nf-field">
              <span className="nf-field-label">Your name *</span>
              <input
                type="text"
                placeholder="Your full name"
                value={form.pickupContactName}
                onChange={(e) => updateForm('pickupContactName', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Your phone *</span>
              <input
                type="tel"
                placeholder="08012345678"
                value={form.pickupContactPhone}
                onChange={(e) => updateForm('pickupContactPhone', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Pickup address *</span>
              <input
                type="text"
                placeholder="e.g. 12 Allen Avenue, Ikeja"
                value={form.pickupAddress}
                onChange={(e) => updateForm('pickupAddress', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Area / neighbourhood *</span>
              <input
                type="text"
                placeholder="e.g. Ikeja, Lagos"
                value={form.pickupArea}
                onChange={(e) => updateForm('pickupArea', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="nf-form-section">
            <h3>Recipient Details</h3>
            <label className="nf-field">
              <span className="nf-field-label">Recipient name *</span>
              <input
                type="text"
                placeholder="Person receiving the parcel"
                value={form.recipientName}
                onChange={(e) => updateForm('recipientName', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Recipient phone *</span>
              <input
                type="tel"
                placeholder="08012345678"
                value={form.recipientPhone}
                onChange={(e) => updateForm('recipientPhone', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Drop-off address *</span>
              <input
                type="text"
                placeholder="e.g. 45 Victoria Island, Lagos"
                value={form.dropoffAddress}
                onChange={(e) => updateForm('dropoffAddress', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Drop-off area *</span>
              <input
                type="text"
                placeholder="e.g. Victoria Island, Lagos"
                value={form.dropoffArea}
                onChange={(e) => updateForm('dropoffArea', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="nf-form-section">
            <h3>Parcel Details</h3>
            <label className="nf-field">
              <span className="nf-field-label">What are you sending? *</span>
              <textarea
                rows={3}
                placeholder="e.g. documents, small package, electronics"
                value={form.itemDescription}
                onChange={(e) => updateForm('itemDescription', e.target.value)}
                required
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Package size / handling (optional)</span>
              <input
                type="text"
                placeholder="e.g. small box, fragile, handle with care"
                value={form.packageDetails}
                onChange={(e) => updateForm('packageDetails', e.target.value)}
              />
            </label>
            <label className="nf-field">
              <span className="nf-field-label">Additional instructions (optional)</span>
              <textarea
                rows={2}
                placeholder="e.g. call on arrival, leave with security"
                value={form.additionalInstructions}
                onChange={(e) => updateForm('additionalInstructions', e.target.value)}
              />
            </label>
          </div>

          <div className="nf-payment-notice">
            <strong>Payment is not collected online</strong>
            <p>
              Ewizzy does not process online payments for dispatch bookings.
              The rider will confirm the fare with you before the job starts.
              No money will be taken now.
            </p>
          </div>

          {error && <p className="nf-form-error">{error}</p>}

          <button type="submit" className="primary-full" disabled={creating}>
            {creating ? 'Creating booking...' : `Book Dispatch Rider`}
          </button>
        </form>
      </main>
    </div>
  )
}

export default DispatchBooking
