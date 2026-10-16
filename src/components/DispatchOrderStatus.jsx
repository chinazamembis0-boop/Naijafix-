import { useState, useEffect } from 'react'
import { fetchDispatchBooking, cancelDispatchBooking } from './DispatchData.js'
import {
  dispatchBookingReference,
  dispatchStatusLabel,
  dispatchStatusIcon,
  isDispatchCancellable,
} from './DispatchData.js'
import { Logo } from './Logo.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

function DispatchOrderStatus({ bookingId, user, onBack, onBookDispatch, onOpenHistory }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBooking = async () => {
      const data = await fetchDispatchBooking(bookingId, user?.user_id)
      if (cancelled) return
      if (!data) {
        setLoadError('We could not find this booking. It may belong to another account.')
        setBooking(null)
      } else {
        setBooking(data)
        setLoadError('')
      }
      setLoading(false)
    }

    loadBooking()
    return () => {
      cancelled = true
    }
  }, [bookingId, user])

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError('')
    const result = await cancelDispatchBooking(
      booking.id,
      user?.user_id,
      'Cancelled by customer'
    )
    setCancelling(false)

    if (result.success) {
      setConfirmOpen(false)
      setCancelled(true)
      setBooking((current) => (current ? { ...current, status: 'cancelled' } : current))
    } else {
      setCancelError(result.error || 'This booking could not be cancelled.')
    }
  }

  const status = String(booking?.status ?? '').toLowerCase()
  const cancellable = isDispatchCancellable(status, booking?.rider_id) && !cancelled

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>
      <main className="inner-content">
        {loading ? (
          <div className="empty-box">
            <span>⏳</span>
            <h4>Loading your booking...</h4>
          </div>
        ) : loadError || !booking ? (
          <div className="empty-box large-empty">
            <span>🔍</span>
            <h4>Booking not found</h4>
            <p>{loadError || 'We could not find this booking.'}</p>
            <button className="primary-full" onClick={onOpenHistory}>
              My Dispatch Bookings
            </button>
          </div>
        ) : (
          <>
            <div className="nf-order-success">
              <span className="nf-order-success-icon">{cancelled ? '✕' : '✅'}</span>
              <h2>{cancelled ? 'Booking cancelled' : 'Booking created successfully'}</h2>
              <p>
                {cancelled
                  ? 'This dispatch booking has been cancelled.'
                  : 'Your parcel delivery request has been submitted.'}
              </p>
            </div>

            <div className="nf-cart-restaurant">
              <span className="nf-cart-restaurant-label">Booking</span>
              <strong className="nf-cart-restaurant-name">{dispatchBookingReference(booking.id)}</strong>
              <span className="nf-cart-restaurant-meta">
                Placed {new Date(booking.created_at).toLocaleString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Pickup</h3>
              <p className="nf-order-delivery-address">
                📦 <strong>{booking.pickup_contact_name}</strong> — {booking.pickup_contact_phone}
              </p>
              <p>📍 {booking.pickup_address}</p>
              <p>🏘️ {booking.pickup_area}</p>
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Drop-off</h3>
              <p className="nf-order-delivery-address">
                🎯 <strong>{booking.recipient_name}</strong> — {booking.recipient_phone}
              </p>
              <p>📍 {booking.dropoff_address}</p>
              <p>🏘️ {booking.dropoff_area}</p>
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Parcel</h3>
              <p><strong>Item:</strong> {booking.item_description}</p>
              {booking.package_details && <p><strong>Package:</strong> {booking.package_details}</p>}
              {booking.additional_instructions && (
                <p><strong>Instructions:</strong> {booking.additional_instructions}</p>
              )}
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Booking Status</h3>
              <p className="nf-order-current-status">
                {dispatchStatusIcon(booking.status)} {dispatchStatusLabel(booking.status)}
              </p>
            </div>

            <div className="nf-payment-notice">
              <strong>Payment is not collected online</strong>
              <p>
                Ewizzy does not process online payments for dispatch bookings.
                The rider will confirm the fare with you before the job starts.
                No money will be taken now.
              </p>
            </div>

            {cancellable && (
              <button className="nf-cancel-order-btn" onClick={() => setConfirmOpen(true)}>
                Cancel Booking
              </button>
            )}

            {status !== 'cancelled' && !cancellable && (
              <p className="nf-cart-note">
                This booking can no longer be cancelled because a rider has already accepted it.
              </p>
            )}

            {cancelError && <p className="nf-form-error">{cancelError}</p>}

            <div className="nf-order-actions">
              <button className="dash-btn dash-btn-outline dash-btn-full" onClick={onOpenHistory}>
                My Dispatch Bookings
              </button>
              <button className="dash-btn dash-btn-primary dash-btn-full" onClick={onBookDispatch}>
                Book Another Dispatch
              </button>
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this booking?"
        message="Are you sure you want to cancel this dispatch booking? The rider will not be assigned if no one has accepted it yet."
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        destructive
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default DispatchOrderStatus