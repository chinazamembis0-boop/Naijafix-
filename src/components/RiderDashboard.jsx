import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { claimFoodOrder } from './FoodData.js'
import { foodOrderReference, formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function RiderDashboard({ user, onBack, onLogin, onSignup }) {
  const [rider, setRider] = useState(null)
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
    const loadDeliveries = async () => {
      if (!rider?.id) {
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
  }, [rider])

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

  const registerRider = async () => {
    if (!user?.user_id) return
    const fullName = user.name || 'Rider'
    const { data, error } = await supabase
      .from('riders')
      .insert({
        user_id: user.user_id,
        full_name: fullName,
        phone: user.phone || '',
        vehicle_type: 'motorcycle',
        active: true,
        available: true,
      })
      .select('*')
      .single()

    if (error) {
      alert('Failed to register: ' + error.message)
    } else {
      setRider(data)
    }
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
              <p>Register as a rider to start accepting delivery assignments.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="primary-full" onClick={onSignup}>Create account</button>
                <button className="secondary-button" onClick={onLogin}>Log in</button>
              </div>
            </>
          ) : (
            <>
              <h2>Become a Delivery Rider</h2>
              <p>Register as a rider to start accepting delivery assignments.</p>
              <button className="primary-full" onClick={registerRider}>Register as Rider</button>
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
        <h2>{rider.full_name}</h2>
        <p>{rider.vehicle_type || 'Motorcycle'}</p>

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
      </main>
    </div>
  )
}

export default RiderDashboard
