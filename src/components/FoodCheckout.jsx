import { useState } from 'react'
import { createFoodOrder } from './FoodData.js'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function FoodCheckout({ cart = [], restaurant, deliveryFee = 0, user, customerLocation, onBack, onPlaced, onSignIn }) {
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const fee = Number(deliveryFee) || 0
  const total = subtotal + fee

  const handlePlaceOrder = async () => {
    setError('')

  if (cart.length === 0) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <Logo size="small" showTagline={false} />
        </header>
        <main className="inner-content">
          <div className="empty-box large-empty">
            <span>🛒</span>
            <h4>There is nothing to check out</h4>
            <p>Add food to your cart before placing an order.</p>
            <button className="primary-full" onClick={onBack}>
              Back to Cart
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!user?.user_id) {
      setError('Please sign in to place your order.')
      return
    }
    if (!address.trim()) {
      setError('Please enter your delivery address.')
      return
    }
    if (restaurant?.isDemo) {
      setError(
        'This is a demo restaurant with no database record, so an order cannot be saved. Please order from a registered Ewizzy restaurant.'
      )
      return
    }

    setPlacing(true)
    const result = await createFoodOrder({
      customerUserId: user.user_id,
      restaurantId: restaurant?.id,
      items: cart,
      deliveryAddress: address.trim(),
      notes: notes.trim() || null,
      deliveryLatitude: customerLocation?.latitude ?? null,
      deliveryLongitude: customerLocation?.longitude ?? null,
    })
    setPlacing(false)

    if (result.success) {
      // The totals handed back come from the database, not from the cart,
      // so any price change between browsing and checkout is reflected
      // truthfully on the confirmation screen.
      onPlaced?.({
        order: result.order,
        restaurant,
        address: address.trim(),
        total: Number(result.order?.total) || total,
      })
    } else {
      setError(result.error || 'Could not place your order. Please try again.')
    }
  }

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
          <div className="empty-box large-empty">
            <span>🔐</span>
            <h4>Sign in to continue</h4>
            <p>Your food order is saved to your Ewizzy account, so you need to be signed in.</p>
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

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo size="small" showTagline={false} />
      </header>

      <main className="inner-content">
        <span className="section-label">CHECKOUT</span>
        <h2>Confirm Your Order</h2>

        {restaurant && (
          <div className="nf-cart-restaurant">
            <span className="nf-cart-restaurant-label">Restaurant</span>
            <strong className="nf-cart-restaurant-name">{restaurant.name}</strong>
            {restaurant.address && <span className="nf-cart-restaurant-meta">📍 {restaurant.address}</span>}
          </div>
        )}

        <div className="nf-checkout-section">
          <h3 className="nf-checkout-heading">Ordered Food</h3>
          <div className="nf-checkout-items">
            {cart.map((item) => (
              <div key={item.menuItemId ?? item.id} className="nf-checkout-item">
                <span className="nf-checkout-item-name">
                  {item.quantity}× {item.name}
                </span>
                <span className="nf-checkout-item-price">{formatNaira(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="nf-checkout-section">
          <h3 className="nf-checkout-heading">Delivery Details</h3>

          <label className="nf-field">
            <span className="nf-field-label">Delivery address</span>
            <input
              type="text"
              placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label className="nf-field">
            <span className="nf-field-label">Phone number</span>
            <input
              type="tel"
              placeholder="e.g. 0803 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <p className="nf-field-hint">The rider will use this number to contact you on arrival.</p>

          <label className="nf-field">
            <span className="nf-field-label">Order notes (optional)</span>
            <textarea
              rows={3}
              placeholder="e.g. extra pepper, no onions, call on arrival"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="nf-cart-summary">
          <div className="nf-cart-summary-row">
            <span>Food subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="nf-cart-summary-row">
            <span>Delivery fee</span>
            <span>{formatNaira(fee)}</span>
          </div>
          <div className="nf-cart-summary-row nf-cart-summary-total">
            <span>Total amount</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>

        <div className="nf-payment-notice">
          <strong>Payment not available online yet</strong>
          <p>
            Ewizzy does not process online payments for food orders. Your order will be saved and the
            restaurant will contact you to arrange payment on delivery. No money will be taken now.
          </p>
        </div>

        {error && <p className="nf-form-error">{error}</p>}

        <button className="primary-full" onClick={handlePlaceOrder} disabled={placing}>
          {placing ? 'Placing order...' : `Place Order — ${formatNaira(total)}`}
        </button>
      </main>
    </div>
  )
}

export default FoodCheckout
