import { useState } from 'react'
import { formatNaira } from './foodUtils.js'
import { Logo } from './Logo.jsx'

function FoodCart({ cart = [], restaurant, deliveryFee = 0, onUpdateCart, onBack, onProceed, user, onSignIn }) {
  const [signInPrompt, setSignInPrompt] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const fee = Number(deliveryFee) || 0
  const total = subtotal + fee

  const updateQuantity = (itemId, delta) => {
    const updated = cart
      .map((item) => (String(item.menuItemId) === String(itemId) ? { ...item, quantity: item.quantity + delta } : item))
      .filter((item) => item.quantity > 0)
    onUpdateCart?.(updated)
  }

  const removeItem = (itemId) => {
    onUpdateCart?.(cart.filter((item) => String(item.menuItemId) !== String(itemId)))
  }

  const handleProceed = () => {
    if (!user?.user_id) {
      setSignInPrompt(true)
      return
    }
    onProceed?.()
  }

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
            <h4>Your cart is empty</h4>
            <p>Open a restaurant menu and add food to get started.</p>
            <button className="primary-full" onClick={onBack}>
              Browse Restaurants
            </button>
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
        <span className="section-label">YOUR ORDER</span>
        <h2>Your Cart</h2>

        {restaurant && (
          <div className="nf-cart-restaurant">
            <span className="nf-cart-restaurant-label">Restaurant</span>
            <strong className="nf-cart-restaurant-name">{restaurant.name}</strong>
            {restaurant.cuisine && <span className="nf-cart-restaurant-meta">{restaurant.cuisine}</span>}
            {restaurant.isDemo && (
              <p className="nf-demo-note">
                This is a demo restaurant with no database record, so an order cannot be saved.
              </p>
            )}
          </div>
        )}

        <div className="nf-cart-items">
          {cart.map((item) => (
            <div key={item.menuItemId ?? item.id} className="nf-cart-item">
              <div className="nf-cart-item-info">
                <h4 className="nf-cart-item-name">{item.name}</h4>
                <p className="nf-cart-item-price">{formatNaira(item.price)} each</p>
                <p className="nf-cart-item-subtotal-label">
                  Subtotal: {formatNaira(item.price * item.quantity)}
                </p>
              </div>

              <div className="nf-cart-item-controls">
                <div className="nf-menu-quantity-controls">
                  <button
                    className="nf-menu-qty-btn"
                    onClick={() => updateQuantity(item.menuItemId, -1)}
                    aria-label={`Decrease ${item.name}`}
                  >
                    −
                  </button>
                  <span className="nf-menu-qty-value">{item.quantity}</span>
                  <button
                    className="nf-menu-qty-btn"
                    onClick={() => updateQuantity(item.menuItemId, 1)}
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <button className="nf-cart-remove" onClick={() => removeItem(item.menuItemId)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="nf-cart-summary">
          <div className="nf-cart-summary-row">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="nf-cart-summary-row">
            <span>Delivery fee</span>
            <span>{formatNaira(fee)}</span>
          </div>
          <div className="nf-cart-summary-row nf-cart-summary-total">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>

        <button className="primary-full" onClick={handleProceed}>
          Proceed to Order — {formatNaira(total)}
        </button>

        {signInPrompt && (
          <div className="nf-inline-notice">
            <p>Please sign in to place your food order so it can be saved to your account.</p>
            <div className="nf-inline-notice-actions">
              <button className="dash-btn dash-btn-outline" onClick={() => setSignInPrompt(false)}>
                Keep Shopping
              </button>
              {onSignIn && (
                <button className="dash-btn dash-btn-primary" onClick={onSignIn}>
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}

        <p className="nf-cart-note">
          Online payment is not available for food orders on Ewizzy yet. You will confirm your order and
          pay the restaurant on delivery.
        </p>
      </main>
    </div>
  )
}

export default FoodCart
