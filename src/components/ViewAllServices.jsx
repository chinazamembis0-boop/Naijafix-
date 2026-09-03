import { useState } from 'react'
import { serviceCategories, allServices } from './ServicesData.js'
import { getServiceImage, getServiceIcon } from './ServiceImages.js'

function ViewAllServices({ initialCategory, onBack, onService }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '')
  const searchText = search.trim().toLowerCase()

  const filteredServices = allServices.filter((service) => {
    const matchesSearch =
      !searchText ||
      String(service.name).toLowerCase().includes(searchText) ||
      String(service.description).toLowerCase().includes(searchText) ||
      String(service.category).toLowerCase().includes(searchText)

    const matchesCategory =
      !selectedCategory ||
      serviceCategories.find((c) => c.id === selectedCategory)?.services.some((s) => s.id === service.id)

    return matchesSearch && matchesCategory
  })

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <div className="brand">
          <div className="brand-icon">
            <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
          </div>
          <div>
            <h1>NaijaFix</h1>
            <span>All Services</span>
          </div>
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">ALL SERVICES</span>
        <h2>What service do you need?</h2>
        <p>Browse all {allServices.length} services across {serviceCategories.length} categories.</p>

        <section className="dashboard-search provider-search">
          <span>🔍</span>
          <input
            type="search"
            placeholder="Search services..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>

        <div className="nf-category-scroll">
          <button
            className={`nf-category-chip ${selectedCategory === '' ? 'nf-category-chip--active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Categories
          </button>
          {serviceCategories.map((cat) => (
            <button
              key={cat.id}
              className={`nf-category-chip ${selectedCategory === cat.id ? 'nf-category-chip--active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {selectedCategory ? (
          <div className="nf-services-list">
            {filteredServices.map((service) => (
              <button
                className="nf-service-list-item"
                key={service.id}
                onClick={() => onService(service)}
              >
                <div className="nf-service-list-icon">
                  {getServiceImage(service) ? (
                    <img
                      src={getServiceImage(service)}
                      alt={service.name}
                      className="nf-service-list-icon-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : (
                    <div className="nf-service-list-icon-fallback" style={{ display: 'flex' }}>
                      {getServiceIcon(service)}
                    </div>
                  )}
                  <div className="nf-service-list-icon-fallback" style={{ display: 'none' }}>
                    {getServiceIcon(service)}
                  </div>
                </div>
                <div className="nf-service-list-info">
                  <h4>{service.name}</h4>
                  <p>{service.description}</p>
                </div>
                <span className="nf-service-list-arrow">→</span>
              </button>
            ))}
          </div>
        ) : (
          serviceCategories.map((category) => {
            const categoryServices = filteredServices.filter((s) =>
              category.services.some((cs) => cs.id === s.id)
            )
            if (categoryServices.length === 0) return null
            return (
              <section key={category.id} className="nf-service-category-section">
                <h3 className="nf-service-category-title">
                  {category.icon} {category.name}
                </h3>
                <div className="nf-services-grid">
                  {categoryServices.map((service) => (
                    <button
                      className="service-card service-card--image"
                      key={service.id}
                      onClick={() => onService(service)}
                    >
                       <div className="service-card-image-wrapper">
                         {getServiceImage(service) ? (
                           <img
                             src={getServiceImage(service)}
                             alt={service.name}
                             className="service-card-image"
                             loading="lazy"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none'
                               e.currentTarget.nextSibling.style.display = 'flex'
                             }}
                           />
                         ) : (
                           <div className="service-card-image-fallback" style={{ display: 'flex' }}>
                             {getServiceIcon(service)}
                           </div>
                         )}
                         <div className="service-card-image-fallback" style={{ display: 'none' }}>
                           {getServiceIcon(service)}
                         </div>
                       </div>
                      <strong>{service.name}</strong>
                      <span>{service.description}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })
        )}

        {filteredServices.length === 0 && (
          <div className="empty-box">
            <span>🔎</span>
            <h4>No services found</h4>
            <p>Try searching for another service or category.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default ViewAllServices
