import { useState, useEffect } from 'react'
import { cancelFoodOrder, fetchFoodOrder } from './FoodData.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import {
  FOOD_ORDER_STATUS_SEQUENCE,
  foodOrderReference,
  foodStatusLabel,
  formatNaira,
  formatOrderDateTime,
  isFoodOrderCancellable,
} from './foodUtils.js'
import { Logo } from './Logo.jsx'

function OrderTimeline({ status }) {
  const current = String(status ?? '').toLowerCase()

  if (current === 'cancelled') {
    return (
      <div className="nf-timeline">
        <div className="nf-timeline-step nf-timeline-step--cancelled">
          <span className="nf-timeline-dot" />
          <div>
            <strong>Order cancelled</strong>
            <p>This order will not be delivered.</p>
          </div>
        </div>
      </div>
    )
  }

  const currentIndex = FOOD_ORDER_STATUS_SEQUENCE.findIndex((s) => s.status === current)

  return (
    <div className="nf-timeline">
      {FOOD_ORDER_STATUS_SEQUENCE.map((step, index) => {
        const done = currentIndex >= 0 && index < currentIndex
        const active = step.status === current
        const state = done ? 'done' : active ? 'active' : 'upcoming'
        return (
          <div key={step.status} className={`nf-timeline-step nf-timeline-step--${state}`}>
            <span className="nf-timeline-dot">{done ? '✓' : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              {active && <p>Current status</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FoodOrderStatus({ orderId, user, onBack, onBrowseFood, onViewOrders }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadOrder = async () => {
      const data = await fetchFoodOrder(orderId, user?.user_id)
      if (cancelled) return
      if (!data) {
        setLoadError('We could not find this order. It may belong to another account.')
        setOrder(null)
      } else {
        setOrder(data)
        setLoadError('')
      }
      setLoading(false)
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [orderId, user])

  const refreshOrder = async () => {
    const data = await fetchFoodOrder(orderId, user?.user_id)
    if (data) {
      setOrder(data)
      setLoadError('')
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError('')
    // Only the reason is sent. cancelled_at and cancelled_by are set by
    // the database trigger, so they are never supplied from the client.
    const result = await cancelFoodOrder(orderId, user?.user_id, 'Cancelled by customer')
    setCancelling(false)

    if (result.success) {
      setConfirmOpen(false)
      setCancelled(true)
      setOrder((current) => (current ? { ...current, status: 'cancelled' } : current))
    } else {
      setCancelError(result.error || 'This order could not be cancelled.')
      await refreshOrder()
    }
  }

  const status = String(order?.status ?? '').toLowerCase()
  const cancellable = isFoodOrderCancellable(status) && !cancelled

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo size="small" showTagline={false} />
      </header>

      <main className="inner-content">
        {loading ? (
          <div className="empty-box">
            <span>⏳</span>
            <h4>Loading your order...</h4>
          </div>
        ) : loadError || !order ? (
          <div className="empty-box large-empty">
            <span>🔍</span>
            <h4>Order not found</h4>
            <p>{loadError || 'We could not find this order.'}</p>
            <button className="primary-full" onClick={onViewOrders}>
              My Food Orders
            </button>
          </div>
        ) : (
          <>
            <div className="nf-order-success">
              <span className="nf-order-success-icon">{cancelled ? '✕' : '✓'}</span>
              <h2>{cancelled ? 'Order cancelled' : 'Order placed successfully'}</h2>
              <p>
                {cancelled
                  ? 'This order has been cancelled. The restaurant has been notified.'
                  : `Your order has been sent to ${order.restaurantName}.`}
              </p>
            </div>

            <div className="nf-cart-restaurant">
              <span className="nf-cart-restaurant-label">Order</span>
              <strong className="nf-cart-restaurant-name">{foodOrderReference(order)}</strong>
              <span className="nf-cart-restaurant-meta">{order.restaurantName}</span>
              <span className="nf-cart-restaurant-meta">
                Placed {formatOrderDateTime(order.created_at)}
              </span>
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Items</h3>
              <div className="nf-checkout-items">
                {order.items.map((item) => (
                  <div key={item.id} className="nf-checkout-item">
                    <span className="nf-checkout-item-name">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="nf-checkout-item-price">{formatNaira(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="nf-cart-summary">
              <div className="nf-cart-summary-row">
                <span>Food subtotal</span>
                <span>{formatNaira(order.subtotal)}</span>
              </div>
              <div className="nf-cart-summary-row">
                <span>Delivery fee</span>
                <span>{formatNaira(order.delivery_fee)}</span>
              </div>
              <div className="nf-cart-summary-row nf-cart-summary-total">
                <span>Total</span>
                <span>{formatNaira(order.total)}</span>
              </div>
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Delivery Location</h3>
              <p className="nf-order-delivery-address">📍 {order.delivery_address}</p>
              {order.notes && <p className="nf-order-notes">📝 {order.notes}</p>}
            </div>

            <div className="nf-checkout-section">
              <h3 className="nf-checkout-heading">Order Status</h3>
              <p className="nf-order-current-status">{foodStatusLabel(status)}</p>
              <OrderTimeline status={status} />
            </div>

            <div className="nf-payment-notice">
              <strong>Payment not collected online</strong>
              <p>
                Ewizzy does not process online payments for food orders. Pay {formatNaira(order.total)}{' '}
                to the restaurant on delivery.
              </p>
            </div>

            {cancellable && (
              <button className="nf-cancel-order-btn" onClick={() => setConfirmOpen(true)}>
                Cancel Order
              </button>
            )}

            {status !== 'cancelled' && !cancellable && (
              <p className="nf-cart-note">
                This order can no longer be cancelled because the restaurant has already started
                processing it.
              </p>
            )}

            {cancelError && <p className="nf-form-error">{cancelError}</p>}

            <div className="nf-order-actions">
              <button className="dash-btn dash-btn-outline dash-btn-full" onClick={onViewOrders}>
                My Food Orders
              </button>
              <button className="dash-btn dash-btn-primary dash-btn-full" onClick={onBrowseFood}>
                Order More Food
              </button>
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this order?"
        message="Are you sure you want to cancel this order? The restaurant will stop preparing it."
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        destructive
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default FoodOrderStatus
