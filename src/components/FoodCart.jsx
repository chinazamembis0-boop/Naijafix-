import { useState } from 'react'
import { createFoodOrder } from './FoodData.js'

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

function FoodCart({ cart = [], deliveryFee = 0, onUpdateCart, onBack, onPlaceOrder, user, restaurantId }) {
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [placing, setPlacing] = useState(false)

  const updateQuantity = (itemId, delta) => {
    const updated = cart
      .map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity: item.quantity + delta }
        }
        return item
      })
      .filter((item) => item.quantity > 0)
    onUpdateCart?.(updated)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + deliveryFee

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      alert('Please enter your delivery address.')
      return
    }
    if (!user?.user_id) {
      alert('Please log in to place an order.')
      return
    }
    if (!restaurantId) {
      alert('Restaurant information is missing.')
      return
    }

    setPlacing(true)
    try {
      const result = await createFoodOrder({
        customerUserId: user.user_id,
        restaurantId,
        items: cart,
        deliveryAddress: deliveryAddress.trim(),
        deliveryFee,
      })

      if (result.success) {
        onPlaceOrder?.({ items: cart, deliveryAddress, subtotal, deliveryFee, total, order: result.order })
      } else {
        alert('Could not place order: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Something went wrong: ' + (error?.message || 'Unknown error'))
    }
    setPlacing(false)
  }

  if (cart.length === 0) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <div className="brand">
            <div className="brand-icon">N</div>
            <div>
              <h1>NaijaFix</h1>
              <span>Your Cart</span>
            </div>
          </div>
        </header>
        <main className="inner-content">
          <div className="empty-box large-empty">
            <span>🛒</span>
            <h4>Your cart is empty</h4>
            <p>Add items from a restaurant to get started.</p>
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
        <div className="brand">
          <div className="brand-icon">N</div>
          <div>
            <h1>NaijaFix</h1>
            <span>Your Cart</span>
          </div>
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">YOUR ORDER</span>
        <h2>Cart</h2>

        <div className="nf-cart-items">
          {cart.map((item) => (
            <div key={item.id} className="nf-cart-item">
              <div className="nf-cart-item-info">
                <h4 className="nf-cart-item-name">{item.name}</h4>
                <p className="nf-cart-item-price">{formatNaira(item.price)} each</p>
              </div>
              <div className="nf-cart-item-controls">
                <div className="nf-menu-quantity-controls">
                  <button className="nf-menu-qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                    −
                  </button>
                  <span className="nf-menu-qty-value">{item.quantity}</span>
                  <button className="nf-menu-qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
                <p className="nf-cart-item-subtotal">{formatNaira(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="nf-cart-address">
          <h3>Delivery Address</h3>
          <input
            type="text"
            placeholder="Enter your delivery address (e.g. Ikeja, Lagos)"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />
        </div>

        <div className="nf-cart-summary">
          <div className="nf-cart-summary-row">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="nf-cart-summary-row">
            <span>Delivery fee</span>
            <span>{formatNaira(deliveryFee)}</span>
          </div>
          <div className="nf-cart-summary-row nf-cart-summary-total">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>

        <button className="primary-full" onClick={handlePlaceOrder} disabled={placing}>
          {placing ? 'Placing order...' : `Place order — ${formatNaira(total)}`}
        </button>

        <p className="nf-cart-note">
          Payment integration coming soon. Order will be saved to your account.
        </p>
      </main>
    </div>
  )
}

export default FoodCart
