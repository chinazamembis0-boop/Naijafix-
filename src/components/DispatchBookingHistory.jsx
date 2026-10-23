import { useState, useEffect } from 'react'
import { fetchCustomerDispatchBookings, cancelDispatchBooking } from './DispatchData.js'
import {
  dispatchBookingReference,
  dispatchStatusLabel,
  dispatchStatusIcon,
  isDispatchCancellable,
} from './DispatchData.js'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

function DispatchBookingHistory({ user, onBack, onBookDispatch, onOpenBooking, onSignIn }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.user_id) {
        setBookings([])
        setLoading(false)
        return
      }
      setLoading(true)
      const data = await fetchCustomerDispatchBookings(user.user_id)
      if (!cancelled) {
        setBookings(data)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const active = bookings.filter(
    (b) => b.status !== 'delivered' && b.status !== 'cancelled'
  )
  const past = bookings.filter(
    (b) => b.status === 'delivered' || b.status === 'cancelled'
  )

  const visible =
    filter === 'active' ? active : filter === 'past' ? past : bookings

  const bookingToCancel = bookings.find((b) => b.id === cancellingId)

  const handleCancel = async () => {
    if (!bookingToCancel) return
    setCancelError('')
    const result = await cancelDispatchBooking(
      bookingToCancel.id,
      user.user_id,
      cancelReason.trim() || 'Cancelled by customer'
    )
    setCancellingId(null)
    if (result.success) {
      setConfirmOpen(false)
      setCancelReason('')
      setBookings((current) =>
        current.map((b) =>
          b.id === bookingToCancel.id ? { ...b, status: 'cancelled' } : b
        )
      )
    } else {
      setCancelError(result.error || 'This booking could not be cancelled.')
    }
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>
      <main className="inner-content">
        <span className="section-label">DISPATCH BOOKINGS</span>
        <h2>My Dispatch Bookings</h2>
        <p>
          Track your parcel deliveries and view past dispatch bookings.
        </p>

        {!user?.user_id && (
          <div className="empty-box large-empty">
            <span>🔐</span>
            <h4>Sign in to see your bookings</h4>
            <p>Your dispatch bookings are saved to your Ewizzy account.</p>
            {onSignIn && (
              <button className="primary-full" onClick={onSignIn}>
                Sign In
              </button>
            )}
          </div>
        )}

        {user?.user_id && (
          <>
            <div className="nf-order-tabs">
              {[
                { id: 'all', label: `All (${bookings.length})` },
                { id: 'active', label: `Active (${active.length})` },
                { id: 'past', label: `Past (${past.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`nf-order-tab ${filter === tab.id ? 'nf-order-tab--active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty-box">
                <span>⏳</span>
                <h4>Loading your bookings...</h4>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-box large-empty">
                <span>📦</span>
                <h4>No dispatch bookings yet</h4>
                <p>Book a dispatch rider and it will appear here.</p>
                <button className="primary-full" onClick={onBookDispatch}>
                  Book a Dispatch Rider
                </button>
              </div>
            ) : (
              <div className="nf-order-list">
                {visible.map((booking) => {
                  const cancellable = isDispatchCancellable(
                    booking.status,
                    booking.rider_id
                  )
                  return (
                    <div key={booking.id} className="nf-order-card nf-history-card">
                      <button
                        className="nf-history-card-main"
                        onClick={() => onOpenBooking?.(booking.id)}
                      >
                        <div className="nf-order-card-header">
                          <h4>{dispatchBookingReference(booking.id)}</h4>
                          <span
                            className={`nf-order-status nf-order-status--${booking.status}`}
                          >
                            {dispatchStatusIcon(booking.status)}
                            {dispatchStatusLabel(booking.status)}
                          </span>
                        </div>

                        <p className="nf-order-restaurant">
                          📦 {booking.item_description}
                        </p>
                        <p className="nf-order-time">
                          📅 {new Date(booking.created_at).toLocaleDateString(
                            'en-NG',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                        </p>

                        <div className="nf-order-details">
                          <span>📍 {booking.pickup_address}</span>
                          <span>🎯 {booking.dropoff_address}</span>
                        </div>

                        {booking.fare_estimate != null && (
                          <p className="nf-history-fare">
                            💰 Fare: {formatNaira(booking.fare_estimate)}
                          </p>
                        )}

                        {booking.rider_id && (
                          <p className="nf-history-rider-hint">
                            Rider assigned to your delivery.
                          </p>
                        )}
                      </button>

                      {cancellable && (
                        <div className="nf-history-cancel-row">
                          <span className="nf-history-cancel-hint">
                            No rider has accepted yet — you can cancel this
                            booking.
                          </span>
                          <button
                            className="dash-btn dash-btn-danger dash-btn-full"
                            onClick={(event) => {
                              event.stopPropagation()
                              setCancellingId(booking.id)
                              setCancelReason('')
                              setCancelError('')
                              setConfirmOpen(true)
                            }}
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}

                      {!cancellable && booking.status !== 'cancelled' && (
                        <p className="nf-history-cancel-hint">
                          This booking can no longer be cancelled because a
                          rider has already accepted it.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {cancelError && <p className="nf-form-error">{cancelError}</p>}

            <ConfirmDialog
              open={confirmOpen && !!bookingToCancel}
              title="Cancel this booking?"
              message={
                'Are you sure you want to cancel this dispatch booking? ' +
                'The rider will not be assigned if no one has accepted it yet.'
              }
              confirmLabel="Cancel Booking"
              cancelLabel="Keep Booking"
              destructive
              busy={cancellingId !== null}
              reasonLabel="Reason for cancelling (optional)"
              reasonValue={cancelReason}
              onReasonChange={setCancelReason}
              onConfirm={handleCancel}
              onCancel={() => setConfirmOpen(false)}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default DispatchBookingHistory
