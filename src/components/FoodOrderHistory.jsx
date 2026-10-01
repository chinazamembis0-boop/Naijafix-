import { useState, useEffect } from 'react'
import { fetchCustomerFoodOrders } from './FoodData.js'
import {
  foodOrderReference,
  foodStatusLabel,
  formatNaira,
  formatOrderDate,
  isFoodOrderCancellable,
} from './foodUtils.js'
import { Logo } from './Logo.jsx'

function FoodOrderHistory({ user, onBack, onBrowseFood, onOpenOrder, onSignIn }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.user_id) {
        setOrders([])
        setLoading(false)
        return
      }
      setLoading(true)
      const data = await fetchCustomerFoodOrders(user.user_id)
      if (!cancelled) {
        setOrders(data)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user?.user_id) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <Logo size="small" showTagline={false} />
        </header>
        <main className="inner-content">
          <span className="section-label">FOOD ORDERS</span>
          <h2>My Food Orders</h2>
          <div className="empty-box large-empty">
            <span>🔐</span>
            <h4>Sign in to see your orders</h4>
            <p>Your food orders are saved to your Ewizzy account.</p>
            {onSignIn && (
              <button className="primary-full" onClick={onSignIn}>
                Sign In
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
  const past = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled')

  const visible = filter === 'active' ? active : filter === 'past' ? past : orders

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo size="small" showTagline={false} />
      </header>

      <main className="inner-content">
        <span className="section-label">FOOD ORDERS</span>
        <h2>My Food Orders</h2>
        <p>Track your food deliveries and revisit past orders.</p>

        <div className="nf-order-tabs">
          {[
            { id: 'all', label: `All (${orders.length})` },
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
            <h4>Loading your orders...</h4>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-box large-empty">
            <span>🍽️</span>
            <h4>No food orders yet</h4>
            <p>Order from a restaurant and it will appear here.</p>
            <button className="primary-full" onClick={onBrowseFood}>
              Order Food
            </button>
          </div>
        ) : (
          <div className="nf-order-list">
            {visible.map((order) => (
              <button
                key={order.id}
                className="nf-order-card nf-history-card"
                onClick={() => onOpenOrder?.(order.id)}
              >
                <div className="nf-order-card-header">
                  <h4>{foodOrderReference(order)}</h4>
                  <span className={`nf-order-status nf-order-status--${order.status}`}>
                    {foodStatusLabel(order.status)}
                  </span>
                </div>

                <p className="nf-order-restaurant">{order.restaurantName}</p>
                <p className="nf-order-time">📅 {formatOrderDate(order.created_at)}</p>

                <div className="nf-order-items">
                  {order.items.map((item) => (
                    <div key={item.id} className="nf-order-item-row">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span>{formatNaira(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="nf-order-total">
                  <span>Total</span>
                  <span>{formatNaira(order.total)}</span>
                </div>

                {isFoodOrderCancellable(order.status) && (
                  <p className="nf-history-cancel-hint">You can cancel this order while it is still new.</p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default FoodOrderHistory
