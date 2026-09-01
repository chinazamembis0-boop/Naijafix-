import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

function RiderDashboard({ user, onBack }) {
  const [rider, setRider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [activeTab, setActiveTab] = useState('available')

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

  const handleStatusUpdate = async (orderId, newStatus, riderId = null) => {
    const updates = { status: newStatus, updated_at: new Date().toISOString() }
    if (riderId) updates.rider_id = riderId

    const { error } = await supabase
      .from('food_orders')
      .update(updates)
      .eq('id', orderId)

    if (!error) {
      setDeliveries((current) =>
        current.map((d) => (d.id === orderId ? { ...d, status: newStatus, ...(riderId ? { rider_id: riderId } : {}) } : d))
      )
    }
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
          <div className="brand">
            <div className="brand-icon">
              <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
            </div>
            <div><h1>NaijaFix</h1><span>Rider Dashboard</span></div>
          </div>
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
          <div className="brand">
            <div className="brand-icon">
              <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
            </div>
            <div><h1>NaijaFix</h1><span>Rider Dashboard</span></div>
          </div>
        </header>
        <main className="inner-content">
          <span className="section-label">RIDER</span>
          <h2>Become a Delivery Rider</h2>
          <p>Register as a rider to start accepting delivery assignments.</p>
          <button className="primary-full" onClick={registerRider}>Register as Rider</button>
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
        <div className="brand">
          <div className="brand-icon">
            <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
          </div>
          <div><h1>NaijaFix</h1><span>Rider Dashboard</span></div>
        </div>
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
                  <h4>Order #{order.id}</h4>
                  <span className={`nf-order-status nf-order-status--${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="nf-order-address">📍 {order.delivery_address}</p>
                <p style={{ fontSize: 13, color: '#607068' }}>From: {order.restaurant?.name || 'Restaurant'}</p>
                <div className="nf-order-total">
                  <span>Total</span>
                  <span>{formatNaira(order.total)}</span>
                </div>

                {activeTab === 'available' && order.status === 'ready_for_pickup' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'picked_up', rider.id)}
                  >
                    Accept Delivery
                  </button>
                )}

                {activeTab === 'my-deliveries' && order.status === 'picked_up' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}
                  >
                    Start Delivery
                  </button>
                )}

                {activeTab === 'my-deliveries' && order.status === 'out_for_delivery' && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                  >
                    Mark Delivered
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
