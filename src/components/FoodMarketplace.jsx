import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchRestaurantMenu, fetchRestaurants, filterRestaurantsByCategory, searchRestaurants } from './FoodData.js'
import { FOOD_CATEGORIES, cartItemCount as countCartItems, cartTotals, formatNaira } from './foodUtils.js'
import RestaurantCard from './RestaurantCard.jsx'
import FoodMenu from './FoodMenu.jsx'
import { Logo } from './Logo.jsx'

function FoodMarketplace({
  onBack,
  onViewCart,
  onViewOrders,
  cart = [],
  onUpdateCart,
  onRestaurantChange,
  onRestaurantDashboard,
  onRiderDashboard,
}) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuLoading, setMenuLoading] = useState(false)
  const [categoryFiltered, setCategoryFiltered] = useState(null)
  const searchText = search.trim().toLowerCase()

  useEffect(() => {
    const loadRestaurants = async () => {
      setLoading(true)
      try {
        const data = await fetchRestaurants()
        setRestaurants(data)
        setCategoryFiltered(null)
      } catch (error) {
        console.error('Failed to load restaurants:', error)
        setRestaurants([])
      }
      setLoading(false)
    }
    loadRestaurants()
  }, [])

  /**
   * Category filtering loads the real menu items for each restaurant, so a
   * category chip only keeps restaurants that actually sell food in it.
   * This runs from the click handler rather than an effect because the
   * result is derived from user input, not an external subscription.
   */
  const handleCategoryChange = async (categoryId) => {
    setSelectedCategory(categoryId)

    if (categoryId === 'all') {
      setCategoryFiltered(null)
      return
    }

    setMenuLoading(true)
    const menusById = new Map()
    await Promise.all(
      restaurants.map(async (restaurant) => {
        if (restaurant.isDemo) return
        try {
          menusById.set(String(restaurant.id), await fetchRestaurantMenu(restaurant.id))
        } catch {
          menusById.set(String(restaurant.id), [])
        }
      })
    )
    setCategoryFiltered(await filterRestaurantsByCategory(restaurants, categoryId, menusById))
    setMenuLoading(false)
  }

  const baseRestaurants = useMemo(() => {
    const source = categoryFiltered ?? restaurants
    return searchText ? searchRestaurants(searchText, source) : source.filter((r) => r.isOpen)
  }, [categoryFiltered, restaurants, searchText])

  const itemCount = countCartItems(cart)
  const cartRestaurant = cart[0]?.restaurantName
  const { subtotal, total } = cartTotals(cart, cart[0]?.deliveryFee || 0)

  const handleAddToCart = useCallback(
    (item, restaurant, deliveryFee) => {
      const menuItemId = item.menuItemId ?? item.id
      const sameRestaurant = cart.length > 0 && String(cart[0].restaurantId) === String(restaurant.id)

      if (cart.length > 0 && !sameRestaurant) {
        // One order comes from one restaurant, so the cart is replaced
        // rather than silently mixing menus from different kitchens.
        onUpdateCart?.([
          {
            menuItemId,
            name: item.name,
            price: Number(item.price),
            quantity: 1,
            image: item.image,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            deliveryFee: Number(deliveryFee) || 0,
          },
        ])
        return { switched: true }
      }

      const existing = cart.find((i) => String(i.menuItemId) === String(menuItemId))
      const updated = existing
        ? cart.map((i) => (String(i.menuItemId) === String(menuItemId) ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...cart,
            {
              menuItemId,
              name: item.name,
              price: Number(item.price),
              quantity: 1,
              image: item.image,
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              deliveryFee: Number(deliveryFee) || 0,
            },
          ]

      onUpdateCart?.(updated)
      return { added: true }
    },
    [cart, onUpdateCart]
  )

  useEffect(() => {
    onRestaurantChange?.(selectedRestaurant)
  }, [selectedRestaurant, onRestaurantChange])

  if (selectedRestaurant) {
    return (
      <FoodMenu
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
        onViewCart={onViewCart}
        onViewOrders={onViewOrders}
        cart={cart}
        onUpdateCart={onUpdateCart}
        onAddToCart={handleAddToCart}
        onSwitchRestaurant={() => setSelectedRestaurant(null)}
      />
    )
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo size="small" showTagline={false} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onViewOrders && (
            <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onViewOrders}>
              🧾 Orders
            </button>
          )}
          {onRestaurantDashboard && (
            <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onRestaurantDashboard}>
              🏪 Restaurant
            </button>
          )}
          {onRiderDashboard && (
            <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onRiderDashboard}>
              🏍️ Rider
            </button>
          )}
          {onViewCart && (
            <button className="nf-cart-icon-btn" onClick={onViewCart} aria-label="View cart">
              🛒
              {itemCount > 0 && <span className="nf-cart-badge">{itemCount}</span>}
            </button>
          )}
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">FOOD &amp; RESTAURANTS</span>
        <h2>Order Food Online</h2>
        <p>Discover restaurants near you and get food delivered to your door.</p>

        {onViewOrders && (
          <button className="nf-history-link" onClick={onViewOrders}>
            🧾 View my food orders
          </button>
        )}

        {itemCount > 0 && (
          <button className="nf-mini-cart" onClick={onViewCart}>
            <span>
              🛒 Cart ({itemCount}) · {cartRestaurant}
            </span>
            <span className="nf-mini-cart-total">
              {formatNaira(total)} <em>· view cart →</em>
            </span>
          </button>
        )}

        <section className="dashboard-search provider-search">
          <span>🔍</span>
          <input
            type="search"
            placeholder="Search restaurants, cuisines..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>

        <div className="nf-category-scroll">
          {FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`nf-category-chip ${selectedCategory === cat.id ? 'nf-category-chip--active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {loading || menuLoading ? (
          <div className="empty-box">
            <span>⏳</span>
            <h4>{menuLoading ? 'Checking menus...' : 'Loading restaurants...'}</h4>
            <p>Please wait.</p>
          </div>
        ) : baseRestaurants.length === 0 ? (
          <div className="empty-box">
            <span>🍽️</span>
            <h4>No restaurants found</h4>
            <p>
              {selectedCategory !== 'all'
                ? `No open restaurant currently offers ${FOOD_CATEGORIES.find((c) => c.id === selectedCategory)?.name}.`
                : 'Try searching for another restaurant or category.'}
            </p>
          </div>
        ) : (
          <div className="nf-restaurant-grid">
            {baseRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => setSelectedRestaurant(restaurant)}
              />
            ))}
          </div>
        )}

        {itemCount > 0 && subtotal > 0 && (
          <p className="nf-cart-note">
            Cart subtotal {formatNaira(subtotal)} · delivery {formatNaira(cart[0]?.deliveryFee || 0)}
          </p>
        )}
      </main>
    </div>
  )
}

export default FoodMarketplace
