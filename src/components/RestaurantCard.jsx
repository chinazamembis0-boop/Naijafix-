import { formatNaira } from './foodUtils.js'

function RestaurantCard({ restaurant, onClick }) {
  const { name, image, rating, reviewCount, cuisine, deliveryTime, deliveryFee, isOpen, description, isDemo } =
    restaurant

  const hasReviews = Number(reviewCount) > 0

  return (
    <div className={`nf-restaurant-card ${!isOpen ? 'nf-restaurant-card--closed' : ''}`}>
      <div className="nf-restaurant-card-image-wrapper">
        <img
          src={image}
          alt={name}
          className="nf-restaurant-card-image"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'flex'
          }}
        />
        <div className="nf-restaurant-card-image-fallback" style={{ display: 'none' }}>
          🍽️
        </div>
        {!isOpen && <div className="nf-restaurant-card-closed-overlay">Closed</div>}
        {isDemo && isOpen && <div className="nf-restaurant-card-demo-badge">Demo</div>}
      </div>

      <div className="nf-restaurant-card-body">
        <div className="nf-restaurant-card-header">
          <h4 className="nf-restaurant-card-name">{name}</h4>
          <div className="nf-restaurant-card-rating">
            ⭐ {Number(rating || 0).toFixed(1)}{' '}
            <span>({hasReviews ? reviewCount : 'No reviews yet'})</span>
          </div>
        </div>

        <p className="nf-restaurant-card-cuisine">{cuisine}</p>
        {description && <p className="nf-restaurant-card-desc">{description}</p>}

        <div className="nf-restaurant-card-footer">
          <span className="nf-restaurant-card-time">🕐 {deliveryTime}</span>
          <span className="nf-restaurant-card-fee">{formatNaira(deliveryFee)} delivery</span>
        </div>

        <button className="nf-restaurant-card-cta" onClick={onClick} disabled={!isOpen}>
          {isOpen ? 'View Menu' : 'Closed'}
        </button>
      </div>
    </div>
  )
}

export default RestaurantCard
