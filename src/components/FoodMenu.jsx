import { useState, useEffect } from 'react'
import { fetchRestaurantMenu } from './FoodData.js'

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

function FoodMenu({ restaurant, onBack, onViewCart, cart = [], onUpdateCart, onDeliveryFeeChange }) {
  const { name, image, rating, reviewCount, cuisine, deliveryTime, deliveryFee, description, address, id: restaurantId } = restaurant
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true)
      try {
        const items = await fetchRestaurantMenu(restaurantId)
        setMenu(items || [])
      } catch (error) {
        console.error('Failed to load menu:', error)
      }
      setLoading(false)
    }
    loadMenu()
  }, [restaurantId])

  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id)
    let updated
    if (existing) {
      updated = cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      updated = [...cart, { ...item, quantity: 1 }]
    }
    onUpdateCart?.(updated)
    onDeliveryFeeChange?.(deliveryFee)
  }

  const removeFromCart = (itemId) => {
    const existing = cart.find((i) => i.id === itemId)
    let updated
    if (existing && existing.quantity > 1) {
      updated = cart.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    } else {
      updated = cart.filter((i) => i.id !== itemId)
    }
    onUpdateCart?.(updated)
    if (updated.length === 0) {
      onDeliveryFeeChange?.(0)
    }
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + deliveryFee

  const menuCategories = []
  menu.forEach((item) => {
    if (!menuCategories.includes(item.category)) {
      menuCategories.push(item.category)
    }
  })

  const getCategoryName = (catId) => {
    const map = {
      'nigerian-food': 'Nigerian Food',
      'jollof-rice': 'Jollof Rice',
      'fried-rice': 'Fried Rice',
      swallow: 'Swallow',
      'soups-stews': 'Soups & Stews',
      'suya-grills': 'Suya & Grills',
      chicken: 'Chicken',
      'fish-seafood': 'Fish & Seafood',
      shawarma: 'Shawarma',
      pizza: 'Pizza',
      burgers: 'Burgers',
      'fast-food': 'Fast Food',
      'small-chops': 'Small Chops',
      pastries: 'Pastries',
      cakes: 'Cakes',
      desserts: 'Desserts',
      drinks: 'Drinks',
      breakfast: 'Breakfast',
      'healthy-meals': 'Healthy Meals',
      main: 'Menu',
    }
    return map[catId] || catId
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
            <span>Food & Restaurants</span>
          </div>
        </div>
        {cartItemCount > 0 && (
          <button className="nf-cart-icon-btn" onClick={onViewCart} aria-label="View cart">
            🛒
            <span className="nf-cart-badge">{cartItemCount}</span>
          </button>
        )}
      </header>

      <main className="nf-menu-content">
        <div className="nf-menu-hero">
          <img
            src={image}
            alt={name}
            className="nf-menu-hero-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          <div className="nf-menu-hero-fallback" style={{ display: 'none' }}>
            🍽️
          </div>
        </div>

        <div className="nf-menu-restaurant-info">
          <h2>{name}</h2>
          <p className="nf-menu-cuisine">{cuisine}</p>
          {description && <p className="nf-menu-desc">{description}</p>}
          <div className="nf-menu-meta">
            <span className="nf-menu-rating">⭐ {rating} ({reviewCount} reviews)</span>
            <span className="nf-menu-delivery-time">🕐 {deliveryTime}</span>
            <span className="nf-menu-delivery-fee">{formatNaira(deliveryFee)} delivery</span>
          </div>
          {address && <p className="nf-menu-address">📍 {address}</p>}
        </div>

        {cartItemCount > 0 && (
          <div className="nf-menu-cart-summary" onClick={onViewCart}>
            <span>{cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in cart</span>
            <span className="nf-menu-cart-total">{formatNaira(total)}</span>
            <span className="nf-menu-cart-view">View cart →</span>
          </div>
        )}

        {loading ? (
          <div className="empty-box">
            <span>⏳</span>
            <h4>Loading menu...</h4>
            <p>Please wait.</p>
          </div>
        ) : menu.length === 0 ? (
          <div className="empty-box">
            <span>🍽️</span>
            <h4>No menu items available</h4>
            <p>This restaurant has not added menu items yet.</p>
          </div>
        ) : (
          menuCategories.map((catId) => (
            <section key={catId} className="nf-menu-section">
              <h3 className="nf-menu-section-title">{getCategoryName(catId)}</h3>
              <div className="nf-menu-items">
                {menu
                  .filter((item) => item.category === catId)
                  .map((item) => {
                    const cartItem = cart.find((i) => i.id === item.id)
                    const quantity = cartItem?.quantity || 0
                    return (
                      <div key={item.id} className="nf-menu-item">
                        <div className="nf-menu-item-info">
                          <div className="nf-menu-item-header">
                            <h4 className="nf-menu-item-name">{item.name}</h4>
                            {item.popular && <span className="nf-menu-item-popular">Popular</span>}
                          </div>
                          <p className="nf-menu-item-desc">{item.description}</p>
                          <p className="nf-menu-item-price">{formatNaira(item.price)}</p>
                        </div>
                        <div className="nf-menu-item-image-wrapper">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="nf-menu-item-image"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextSibling.style.display = 'flex'
                            }}
                          />
                          <div className="nf-menu-item-image-fallback" style={{ display: 'none' }}>
                            🍽️
                          </div>
                          <div className="nf-menu-item-actions">
                            {quantity === 0 ? (
                              <button className="nf-menu-add-btn" onClick={() => addToCart(item)}>
                                +
                              </button>
                            ) : (
                              <div className="nf-menu-quantity-controls">
                                <button className="nf-menu-qty-btn" onClick={() => removeFromCart(item.id)}>
                                  −
                                </button>
                                <span className="nf-menu-qty-value">{quantity}</span>
                                <button className="nf-menu-qty-btn" onClick={() => addToCart(item)}>
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}

export default FoodMenu
