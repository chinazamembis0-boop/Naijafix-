import { useState, useEffect } from 'react'
import { fetchRestaurants, fetchRestaurantsByCategory, foodCategories, searchRestaurants } from './FoodData.js'
import RestaurantCard from './RestaurantCard.jsx'
import FoodMenu from './FoodMenu.jsx'

function FoodMarketplace({ onBack, cartItemCount = 0, onViewCart, cart = [], onUpdateCart, onDeliveryFeeChange, onRestaurantSelect, onRestaurantDashboard, onRiderDashboard }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const searchText = search.trim().toLowerCase()

  useEffect(() => {
    const loadRestaurants = async () => {
      setLoading(true)
      try {
        const data = await fetchRestaurants()
        setRestaurants(data)
      } catch (error) {
        console.error('Failed to load restaurants:', error)
      }
      setLoading(false)
    }
    loadRestaurants()
  }, [])

  const displayedRestaurants = selectedCategory
    ? restaurants.filter((r) => r.isOpen && r.categories && r.categories.includes(selectedCategory))
    : searchText
    ? searchRestaurants(searchText, restaurants)
    : restaurants.filter((r) => r.isOpen)

  if (selectedRestaurant) {
    return (
      <FoodMenu
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
        onViewCart={onViewCart}
        cart={cart}
        onUpdateCart={onUpdateCart}
        onDeliveryFeeChange={onDeliveryFeeChange}
      />
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
            <span>Food & Restaurants</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          {onViewCart && cartItemCount > 0 && (
            <button className="nf-cart-icon-btn" onClick={onViewCart} aria-label="View cart">
              🛒
              <span className="nf-cart-badge">{cartItemCount}</span>
            </button>
          )}
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">FOOD & RESTAURANTS</span>
        <h2>Order Food Online</h2>
        <p>Discover restaurants near you and get food delivered to your door.</p>

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
          <button
            className={`nf-category-chip ${selectedCategory === '' ? 'nf-category-chip--active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            🍽️ All
          </button>
          {foodCategories.map((cat) => (
            <button
              key={cat.id}
              className={`nf-category-chip ${selectedCategory === cat.id ? 'nf-category-chip--active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-box">
            <span>⏳</span>
            <h4>Loading restaurants...</h4>
            <p>Please wait.</p>
          </div>
        ) : displayedRestaurants.length === 0 ? (
          <div className="empty-box">
            <span>🍽️</span>
            <h4>No restaurants found</h4>
            <p>Try searching for another restaurant or category.</p>
          </div>
        ) : (
          <div className="nf-restaurant-grid">
            {displayedRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => {
                  onRestaurantSelect?.(restaurant.id)
                  setSelectedRestaurant(restaurant)
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default FoodMarketplace
