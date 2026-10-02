import { useState, useEffect } from 'react'
import { supabase, getSignedStorageUrl } from '../supabase.js'
import { claimFoodOrder } from './FoodData.js'
import { foodOrderReference, formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'
import RiderRegistration, { RIDER_VEHICLE_LABEL } from './RiderRegistration.jsx'

/**
 * Rider-facing wording for the stored verification status. The status
 * itself always comes from the database, never from local state.
 */
function verificationLabel(status) {
  if (status === 'approved') return 'Verified'
  if (status === 'rejected') return 'Verification needs attention'
  return 'Pending Verification'
}

function verificationIcon(status) {
  if (status === 'approved') return '✅'
  if (status === 'rejected') return '⚠️'
  return '⏳'
}

function RiderDashboard({ user, onBack, onLogin, onSignup }) {
  const [rider, setRider] = useState(null)
  const [verification, setVerification] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [activeTab, setActiveTab] = useState('available')
  const [busyOrderId, setBusyOrderId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const loadRider = async () => {
      if (!user?.user_id) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load rider:', error)
      }
      setRider(data)
      setLoading(false)
    }
    loadRider()
  }, [user])

  useEffect(() => {
    const loadVerification = async () => {
      if (!user?.user_id) {
        setVerification(null)
        return
      }
      const { data, error } = await supabase
        .from('rider_verifications')
        .select('id, status, rejection_reason, submitted_at, reviewed_at')
        .eq('rider_user_id', user.user_id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load rider verification:', error)
        return
      }
      setVerification(data)
    }
    loadVerification()
  }, [user, registered])

  useEffect(() => {
    const loadPhoto = async () => {
      if (!rider?.photo_path) {
        setPhotoUrl('')
        return
      }
      try {
        setPhotoUrl(await getSignedStorageUrl('profile-photos', rider.photo_path))
      } catch (error) {
        console.error('Failed to load rider photo:', error)
        setPhotoUrl('')
      }
    }
    loadPhoto()
  }, [rider?.photo_path])

  const isApproved = verification?.status === 'approved'

  useEffect(() => {
    const loadDeliveries = async () => {
      // The database refuses to return claimable deliveries to an
      // unverified rider, so there is nothing to request yet.
      if (!rider?.id || !isApproved) {
        setDeliveries([])
        return
      }
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          *,
          restaurant:restaurants(name),
          items:food_order_items(*)
        `)
        .or(`rider_id.eq.${rider.id},status.eq.ready_for_pickup`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to load deliveries:', error)
      }
      setDeliveries(data || [])
    }
    loadDeliveries()
  }, [rider, isApproved])

  const currentStatusFor = (orderId) => deliveries.find((d) => d.id === orderId)?.status

  /**
   * Advance a delivery the rider already owns.
   * The database decides whether the transition is allowed; this only
   * performs the write for an order that is already assigned to this
   * rider. Rider assignment itself never happens here.
   */
  const handleStatusUpdate = async (orderId, newStatus) => {
    setBusyOrderId(orderId)
    setActionError('')

    const { error } = await supabase
      .from('food_orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .eq('rider_id', rider?.id)
      .eq('status', currentStatusFor(orderId))

    setBusyOrderId(null)

    if (error) {
      console.error('Failed to update delivery status:', error)
      setActionError('This delivery could not be updated. Please try again.')
      return
    }

    setDeliveries((current) =>
      current.map((d) => (d.id === orderId ? { ...d, status: newStatus } : d))
    )
  }

  /**
   * Claim an available delivery. The claim_food_order RPC assigns
   * rider_id and leaves the status at 'ready_for_pickup', so the order
   * becomes this rider's responsibility without being marked as picked
   * up. Marking the physical pickup is a separate action below.
   */
  const handleClaim = async (orderId) => {
    setBusyOrderId(orderId)
    setActionError('')

    const result = await claimFoodOrder(orderId)

    setBusyOrderId(null)

    if (!result.success) {
      setActionError(result.error || 'This delivery could not be claimed.')
      // The order may have been taken while this rider was looking at it.
      setDeliveries((current) => current.filter((d) => d.id !== orderId))
      return
    }

    setDeliveries((current) =>
      current.map((d) =>
        d.id === orderId
          ? // Merge only the assigned fields so the joined restaurant
            // and items already on this row survive the update.
            { ...d, rider_id: result.order.rider_id, status: result.order.status }
          : d
      )
    )
    setActiveTab('my-deliveries')
  }

  const toggleAvailability = async () => {
    if (!rider) return
    const { error } = await supabase
      .from('riders')
      .update({ available: !rider.available, updated_at: new Date().toISOString() })
      .eq('id', rider.id)

    if (!error) {
      setRider((current) => ({ ...current, available: !current.available }))
    }
  }

if (loading) {
  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>
        <main className="inner-content">
          <div className="empty-box"><span>⏳</span><h4>Loading...</h4></div>
        </main>
      </div>
    )
  }

  if (!rider) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>← Back</button>
          <Logo size="small" showTagline={false} />
        </header>
        <main className="inner-content">
          <span className="section-label">RIDER</span>
          {!user ? (
            <>
              <h2>Become a Delivery Rider</h2>
              <p>Join Ewizzy as a motorcycle/Okada delivery and dispatch rider.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="primary-full" onClick={onSignup}>Create account</button>
                <button className="secondary-button" onClick={onLogin}>Log in</button>
              </div>
            </>
          ) : registered ? (
            <>
              <h2>Become a Delivery Rider</h2>
              <p>Join Ewizzy as a motorcycle/Okada delivery and dispatch rider.</p>
              <div className="empty-box rider-success">
                <span>✅</span>
                <h4>Registration submitted successfully.</h4>
                <p>
                  Your Ewizzy rider account is pending verification. We will review your
                  information and ID before you can receive delivery requests.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2>Become a Delivery Rider</h2>
              <p>Join Ewizzy as a motorcycle/Okada delivery and dispatch rider.</p>
              <p className="rider-hint">
                Fill this in once. You need your name, phone, one photo, the area you
                deliver in, an emergency contact and one ID card.
              </p>
              <RiderRegistration
                user={user}
                defaultName={user.name || ''}
                defaultPhone={user.phone || ''}
                onRegistered={async (submitted) => {
                  setVerification(submitted)
                  setRegistered(true)
                  const { data } = await supabase
                    .from('riders')
                    .select('*')
                    .eq('user_id', user.user_id)
                    .maybeSingle()
                  setRider(data)
                }}
              />
            </>
          )}
        </main>
      </div>
    )
  }

  const myDeliveries = deliveries.filter((d) => d.rider_id === rider.id)
  const availableDeliveries = deliveries.filter((d) => d.status === 'ready_for_pickup' && !d.rider_id)
  const displayDeliveries = activeTab === 'available' ? availableDeliveries : myDeliveries

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>

      <main className="inner-content">
        <span className="section-label">RIDER</span>

        <div className="rider-identity">
          {photoUrl ? (
            <img className="rider-identity-photo" src={photoUrl} alt={rider.full_name} />
          ) : (
            <div className="rider-identity-photo rider-identity-photo--empty">🏍️</div>
          )}
          <div>
            <h2>{rider.full_name}</h2>
            <p>🏍️ {RIDER_VEHICLE_LABEL}</p>
            {rider.operating_area && <p>📍 {rider.operating_area}</p>}
          </div>
        </div>

        <div className={`rider-verification rider-verification--${verification?.status || 'pending'}`}>
          <span className="rider-verification-icon">
            {verificationIcon(verification?.status)}
          </span>
          <div>
            <strong>{verificationLabel(verification?.status)}</strong>
            {verification?.status === 'rejected' && verification.rejection_reason && (
              <p>{verification.rejection_reason}</p>
            )}
            {verification?.status === 'pending' && (
              <p>We are checking your details and ID. You will be able to take deliveries soon.</p>
            )}
            {verification?.status === 'approved' && (
              <p>You are verified and can receive delivery requests.</p>
            )}
          </div>
        </div>

        {/* A rider who is not approved yet is shown the status instead of
            the delivery board. The database enforces the same rule, so
            this is presentation only. */}
        {!isApproved ? (
          verification?.status === 'rejected' ? (
            <>
              <div className="empty-box">
                <span>⚠️</span>
                <h4>Verification needs attention</h4>
                <p>Send a new ID card photo below. Delivery requests open once an Ewizzy admin approves your account.</p>
              </div>
              <RiderRegistration
                user={user}
                defaultName={rider.full_name || ''}
                defaultPhone={rider.phone || ''}
                onRegistered={(submitted) => setVerification(submitted)}
              />
            </>
          ) : (
            <div className="empty-box">
              <span>🔒</span>
              <h4>No deliveries yet</h4>
              <p>Delivery requests unlock as soon as an Ewizzy admin approves your verification.</p>
            </div>
          )
        ) : (
          <>
        <button
          className={`dash-btn ${rider.available ? 'dash-btn-primary' : 'dash-btn-outline'} dash-btn-full`}
          onClick={toggleAvailability}
        >
          {rider.available ? '🟢 Online - Accepting Deliveries' : '⚪ Offline'}
        </button>

        <div className="nf-order-tabs">
          <button
            className={`nf-order-tab ${activeTab === 'available' ? 'nf-order-tab--active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            Available ({availableDeliveries.length})
          </button>
          <button
            className={`nf-order-tab ${activeTab === 'my-deliveries' ? 'nf-order-tab--active' : ''}`}
            onClick={() => setActiveTab('my-deliveries')}
          >
            My Deliveries ({myDeliveries.length})
          </button>
        </div>

        {displayDeliveries.length === 0 ? (
          <div className="empty-box">
            <span>📦</span>
            <h4>No deliveries</h4>
            <p>{activeTab === 'available' ? 'No deliveries available right now.' : 'You have no active deliveries.'}</p>
          </div>
        ) : (
          <div className="nf-order-list">
            {displayDeliveries.map((order) => (
                <div key={order.id} className="nf-order-card">
                  <div className="nf-order-card-header">
                    <h4>{foodOrderReference(order)}</h4>
                    <span className={`nf-order-status nf-order-status--${order.status}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                <p className="nf-order-address">📍 {order.delivery_address}</p>
                <p style={{ fontSize: 13, color: 'var(--nf-text-muted)' }}>From: {order.restaurant?.name || 'Restaurant'}</p>
                <div className="nf-order-total">
                  <span>Total</span>
                  <span>{formatNaira(order.total)}</span>
                </div>

                {actionError && busyOrderId === null && (
                  <p className="nf-form-error">{actionError}</p>
                )}

                {/* Available board: claim only. The status is left at
                    ready_for_pickup so the customer sees "Rider assigned". */}
                {!order.rider_id && order.status === 'ready_for_pickup' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleClaim(order.id)}
                    disabled={busyOrderId === order.id}
                  >
                    {busyOrderId === order.id ? 'Claiming...' : 'Claim Order'}
                  </button>
                )}

                {/* Own deliveries: pickup is a separate step from claiming. */}
                {order.rider_id === rider.id && order.status === 'ready_for_pickup' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'picked_up')}
                    disabled={busyOrderId === order.id}
                  >
                    {busyOrderId === order.id ? 'Updating...' : 'Mark Picked Up'}
                  </button>
                )}

                {order.rider_id === rider.id && order.status === 'picked_up' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}
                    disabled={busyOrderId === order.id}
                  >
                    {busyOrderId === order.id ? 'Updating...' : 'Start Delivery'}
                  </button>
                )}

                {order.rider_id === rider.id && order.status === 'out_for_delivery' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                    disabled={busyOrderId === order.id}
                  >
                    {busyOrderId === order.id ? 'Updating...' : 'Mark Delivered'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}

export default RiderDashboard
