import { useState, useEffect, useMemo } from 'react'
import { fetchRestaurantMenu } from './FoodData.js'
import {
  FOOD_CATEGORIES,
  cartTotals,
  categoryLabel,
  formatNaira,
} from './foodUtils.js'
import { Logo } from './Logo.jsx'

function FoodMenu({ restaurant, onBack, onViewCart, cart = [], onUpdateCart, onAddToCart, onSwitchRestaurant }) {
  const { name, image, rating, reviewCount, cuisine, deliveryTime, deliveryFee, description, address, id: restaurantId, isDemo } =
    restaurant
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadMenu = async () => {
      setLoading(true)
      try {
        const items = await fetchRestaurantMenu(restaurantId)
        if (!cancelled) setMenu(items || [])
      } catch (error) {
        console.error('Failed to load menu:', error)
        if (!cancelled) setMenu([])
      }
      if (!cancelled) setLoading(false)
    }

    loadMenu()
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  // Only show categories that actually contain available food items.
  const availableCategories = useMemo(() => {
    const present = new Set(menu.map((item) => item.category))
    return FOOD_CATEGORIES.filter((category) => category.id === 'all' || present.has(category.id))
  }, [menu])

  const visibleMenu = useMemo(
    () => (activeCategory === 'all' ? menu : menu.filter((item) => item.category === activeCategory)),
    [menu, activeCategory]
  )

  const cartForRestaurant = cart.filter((item) => String(item.restaurantId) === String(restaurantId))
  const cartItemCount = cartForRestaurant.reduce((sum, item) => sum + item.quantity, 0)
  const { subtotal, total } = cartTotals(cartForRestaurant, cartItemCount > 0 ? deliveryFee : 0)

  const quantityInCart = (menuItemId) =>
    cartForRestaurant.find((item) => String(item.menuItemId) === String(menuItemId))?.quantity || 0

  const handleAdd = (item) => {
    const result = onAddToCart?.(item, restaurant, deliveryFee)
    if (result?.switched) {
      setNotice('Your cart was cleared because you started an order from a different restaurant.')
    } else if (result?.rejected) {
      setNotice(result.reason || 'This item cannot be added to your cart.')
    } else {
      setNotice('')
    }
  }

  const handleDecrement = (item) => {
    const existing = cartForRestaurant.find((i) => String(i.menuItemId) === String(item.menuItemId))
    if (!existing) return
    if (existing.quantity <= 1) {
      onUpdateCart?.(cart.filter((i) => String(i.menuItemId) !== String(item.menuItemId)))
      return
    }
    onUpdateCart?.(
      cart.map((i) => (String(i.menuItemId) === String(item.menuItemId) ? { ...i, quantity: i.quantity - 1 } : i))
    )
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo size="small" showTagline={false} />
        {onViewCart && (
          <button className="nf-cart-icon-btn" onClick={onViewCart} aria-label="View cart">
            🛒
            {cartItemCount > 0 && <span className="nf-cart-badge">{cartItemCount}</span>}
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
            <span className="nf-menu-rating">
              ⭐ {Number(rating || 0).toFixed(1)}{' '}
              <span className="nf-menu-reviews">
                ({Number(reviewCount) > 0 ? `${reviewCount} reviews` : 'No reviews yet'})
              </span>
            </span>
            <span className="nf-menu-delivery-time">🕐 {deliveryTime}</span>
            <span className="nf-menu-delivery-fee">{formatNaira(deliveryFee)} delivery</span>
          </div>
          {address && <p className="nf-menu-address">📍 {address}</p>}
          {isDemo && (
            <p className="nf-demo-note">
              Demo listing — this restaurant has no database record, so orders cannot be saved.
            </p>
          )}
        </div>

        {cartItemCount > 0 && (
          <div className="nf-menu-cart-summary" onClick={onViewCart}>
            <span>
              {cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in cart
            </span>
            <span className="nf-menu-cart-total">{formatNaira(total)}</span>
            <span className="nf-menu-cart-view">View cart →</span>
          </div>
        )}

        {notice && <p className="nf-menu-notice">{notice}</p>}

        {!loading && menu.length > 0 && (
          <div className="nf-category-scroll nf-menu-category-scroll">
            {availableCategories.map((category) => (
              <button
                key={category.id}
                className={`nf-category-chip ${activeCategory === category.id ? 'nf-category-chip--active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.icon} {category.name}
              </button>
            ))}
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
            <p>This restaurant has not added any available food items yet.</p>
          </div>
        ) : visibleMenu.length === 0 ? (
          <div className="empty-box">
            <span>🔍</span>
            <h4>No food in this category</h4>
            <p>Try another category to see more of this menu.</p>
          </div>
        ) : (
          visibleMenu.map((item) => {
            const quantity = quantityInCart(item.menuItemId)
            return (
              <section key={`${item.menuItemId ?? item.id}-${item.name}`} className="nf-menu-section nf-menu-section--item">
                <div className="nf-menu-items">
                  <div className="nf-menu-item">
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
                    </div>

                    <div className="nf-menu-item-info">
                      <div className="nf-menu-item-header">
                        <h4 className="nf-menu-item-name">{item.name}</h4>
                        {item.popular && <span className="nf-menu-item-popular">Popular</span>}
                      </div>
                      <p className="nf-menu-item-category">{categoryLabel(item.category)}</p>
                      {item.description && <p className="nf-menu-item-desc">{item.description}</p>}
                      <p className="nf-menu-item-price">{formatNaira(item.price)}</p>

                      <div className="nf-menu-item-footer">
                        {quantity > 0 ? (
                          <div className="nf-menu-quantity-controls">
                            <button
                              className="nf-menu-qty-btn"
                              onClick={() => handleDecrement(item)}
                              aria-label={`Remove one ${item.name}`}
                            >
                              −
                            </button>
                            <span className="nf-menu-qty-value">{quantity}</span>
                            <button
                              className="nf-menu-qty-btn"
                              onClick={() => handleAdd(item)}
                              aria-label={`Add one more ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                        ) : null}

                        <button className="nf-menu-add-to-cart" onClick={() => handleAdd(item)}>
                          {quantity > 0 ? `Add to Cart (${quantity})` : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          })
        )}

        {cartItemCount > 0 && (
          <div className="nf-menu-sticky-bar">
            <div className="nf-menu-sticky-info">
              <span>
                {cartItemCount} item{cartItemCount !== 1 ? 's' : ''} · {formatNaira(subtotal)}
              </span>
              <span className="nf-menu-sticky-total">
                Total {formatNaira(total)} incl. {formatNaira(deliveryFee)} delivery
              </span>
            </div>
            <button className="nf-menu-sticky-cart" onClick={onViewCart}>
              🛒 Cart ({cartItemCount})
            </button>
          </div>
        )}

        {onSwitchRestaurant && (
          <p className="nf-menu-notice">
            Ordering from a different restaurant?{' '}
            <button className="nf-link-button" onClick={onSwitchRestaurant}>
              Browse other restaurants
            </button>
          </p>
        )}
      </main>
    </div>
  )
}

export default FoodMenu
