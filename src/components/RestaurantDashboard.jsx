import { useState, useEffect, useRef } from 'react'
import { supabase, getSignedStorageUrl, uploadPrivateFile } from '../supabase.js'
import { fetchRestaurantOrders, updateFoodOrderStatus } from './FoodData.js'

const RESTAURANT_IMAGE_BUCKET = 'restaurant-images'

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

function RestaurantDashboard({ user, onBack }) {
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [logoUrl, setLogoUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [imageError, setImageError] = useState('')
  const logoInputRef = useRef(null)
  const coverInputRef = useRef(null)

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!user?.user_id) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_user_id', user.user_id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load restaurant:', error)
      }
      setRestaurant(data)

      if (data?.logo_url) {
        try {
          setLogoUrl(await getSignedStorageUrl(RESTAURANT_IMAGE_BUCKET, data.logo_url))
        } catch {
          setLogoUrl('')
        }
      }

      if (data?.cover_image_url) {
        try {
          setCoverImageUrl(await getSignedStorageUrl(RESTAURANT_IMAGE_BUCKET, data.cover_image_url))
        } catch {
          setCoverImageUrl('')
        }
      }

      setLoading(false)
    }
    loadRestaurant()
  }, [user])

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.user_id || !restaurant) return

    setUploadingLogo(true)
    setImageError('')
    try {
      const path = await uploadPrivateFile(RESTAURANT_IMAGE_BUCKET, user.user_id, file)
      const { error } = await supabase
        .from('restaurants')
        .update({ logo_url: path })
        .eq('id', restaurant.id)

      if (error) throw error

      setLogoUrl(await getSignedStorageUrl(RESTAURANT_IMAGE_BUCKET, path))
      setRestaurant((current) => ({ ...current, logo_url: path }))
    } catch (error) {
      console.error('Failed to upload logo:', error)
      setImageError('Failed to upload logo: ' + error.message)
    }
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.user_id || !restaurant) return

    setUploadingCover(true)
    setImageError('')
    try {
      const path = await uploadPrivateFile(RESTAURANT_IMAGE_BUCKET, user.user_id, file)
      const { error } = await supabase
        .from('restaurants')
        .update({ cover_image_url: path })
        .eq('id', restaurant.id)

      if (error) throw error

      setCoverImageUrl(await getSignedStorageUrl(RESTAURANT_IMAGE_BUCKET, path))
      setRestaurant((current) => ({ ...current, cover_image_url: path }))
    } catch (error) {
      console.error('Failed to upload cover image:', error)
      setImageError('Failed to upload cover image: ' + error.message)
    }
    setUploadingCover(false)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleRemoveLogo = async () => {
    if (!restaurant) return
    setImageError('')
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ logo_url: null })
        .eq('id', restaurant.id)

      if (error) throw error

      setLogoUrl('')
      setRestaurant((current) => ({ ...current, logo_url: null }))
    } catch (err) {
      console.error('Failed to remove logo:', err)
      setImageError('Failed to remove logo: ' + err.message)
    }
  }

  const handleRemoveCover = async () => {
    if (!restaurant) return
    setImageError('')
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ cover_image_url: null })
        .eq('id', restaurant.id)

      if (error) throw error

      setCoverImageUrl('')
      setRestaurant((current) => ({ ...current, cover_image_url: null }))
    } catch (err) {
      console.error('Failed to remove cover image:', err)
      setImageError('Failed to remove cover image: ' + err.message)
    }
  }

  useEffect(() => {
    const loadOrders = async () => {
      if (!restaurant?.id) {
        setOrders([])
        return
      }
      const data = await fetchRestaurantOrders(restaurant.id)
      setOrders(data)
    }
    loadOrders()
  }, [restaurant])

  const handleStatusUpdate = async (orderId, newStatus) => {
    const result = await updateFoodOrderStatus(orderId, newStatus)
    if (result.success) {
      setOrders((current) =>
        current.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } else {
      alert('Failed to update order: ' + (result.error || 'Unknown error'))
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'pending') return o.status === 'pending'
    if (activeTab === 'preparing') return ['confirmed', 'preparing'].includes(o.status)
    if (activeTab === 'ready') return ['ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(o.status)
    if (activeTab === 'completed') return o.status === 'delivered'
    if (activeTab === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const getNextStatus = (status) => {
    const transitions = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready_for_pickup',
      ready_for_pickup: 'picked_up',
      picked_up: 'out_for_delivery',
      out_for_delivery: 'delivered',
    }
    return transitions[status] || null
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready_for_pickup: 'Ready for Pickup',
      picked_up: 'Picked Up',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-icon">
              <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
            </div>
            <div>
              <h1>NaijaFix</h1>
              <span>Restaurant Dashboard</span>
            </div>
          </div>
        </header>
        <main className="inner-content">
          <div className="empty-box">
            <span>⏳</span>
            <h4>Loading...</h4>
          </div>
        </main>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="inner-page">
        <header className="inner-header">
          <button className="back-link" onClick={onBack}>← Back</button>
          <div className="brand">
            <div className="brand-icon">
              <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
            </div>
            <div>
              <h1>NaijaFix</h1>
              <span>Restaurant Dashboard</span>
            </div>
          </div>
        </header>
        <main className="inner-content">
          <span className="section-label">RESTAURANT</span>
          <h2>No Restaurant Found</h2>
          <p>You have not registered a restaurant yet. Contact NaijaFix support to set up your restaurant.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <div className="brand">
          <div className="brand-icon">
            <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
          </div>
          <div>
            <h1>NaijaFix</h1>
            <span>Restaurant Dashboard</span>
          </div>
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">RESTAURANT</span>
        <h2>{restaurant.name}</h2>
        <p>{restaurant.description || 'Manage your incoming food orders.'}</p>

        <div className="nf-restaurant-images">
          <div className="nf-restaurant-image-card">
            <span className="nf-restaurant-image-label">Logo</span>
            <div className="nf-restaurant-image-preview">
              {logoUrl ? (
                <img src={logoUrl} alt="Restaurant logo" />
              ) : (
                <div className="nf-restaurant-image-placeholder">No logo</div>
              )}
            </div>
            {imageError && <p className="nf-restaurant-image-error">{imageError}</p>}
            <div className="nf-restaurant-image-actions">
              <button
                className="dash-btn dash-btn-primary"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button
                  className="dash-btn dash-btn-danger"
                  onClick={handleRemoveLogo}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
          </div>

          <div className="nf-restaurant-image-card">
            <span className="nf-restaurant-image-label">Cover Image</span>
            <div className="nf-restaurant-image-preview nf-restaurant-image-preview--cover">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Restaurant cover" />
              ) : (
                <div className="nf-restaurant-image-placeholder">No cover image</div>
              )}
            </div>
            {imageError && <p className="nf-restaurant-image-error">{imageError}</p>}
            <div className="nf-restaurant-image-actions">
              <button
                className="dash-btn dash-btn-primary"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
              >
                {uploadingCover ? 'Uploading...' : 'Upload Cover'}
              </button>
              {coverImageUrl && (
                <button
                  className="dash-btn dash-btn-danger"
                  onClick={handleRemoveCover}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverUpload}
            />
          </div>
        </div>

        <div className="nf-order-tabs">
          {['pending', 'preparing', 'ready', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              className={`nf-order-tab ${activeTab === tab ? 'nf-order-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-box">
            <span>📋</span>
            <h4>No orders</h4>
            <p>No orders in this category.</p>
          </div>
        ) : (
          <div className="nf-order-list">
            {filteredOrders.map((order) => {
              const nextStatus = getNextStatus(order.status)
              return (
                <div key={order.id} className="nf-order-card">
                  <div className="nf-order-card-header">
                    <h4>Order #{order.id}</h4>
                    <span className={`nf-order-status nf-order-status--${order.status}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="nf-order-address">📍 {order.delivery_address}</p>
                  <p className="nf-order-time">
                    🕐 {new Date(order.created_at).toLocaleString()}
                  </p>
                  {order.notes && <p className="nf-order-notes">📝 {order.notes}</p>}
                  <div className="nf-order-items">
                    {order.items && order.items.map((item) => (
                      <div key={item.id} className="nf-order-item-row">
                        <span>{item.quantity}x {item.item_name_snapshot}</span>
                        <span>{formatNaira(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="nf-order-total">
                    <span>Total</span>
                    <span>{formatNaira(order.total)}</span>
                  </div>
                  {nextStatus && (
                    <button
                      className="dash-btn dash-btn-primary dash-btn-full"
                      onClick={() => handleStatusUpdate(order.id, nextStatus)}
                    >
                      Mark as {getStatusLabel(nextStatus)}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button
                      className="dash-btn dash-btn-danger dash-btn-full"
                      style={{ marginTop: 8 }}
                      onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default RestaurantDashboard
