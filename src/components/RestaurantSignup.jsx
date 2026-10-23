import { useState } from 'react'
import { supabase } from '../supabase.js'
import { Logo } from './Logo.jsx'

function RestaurantSignup({ user, onBack, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    cuisine: '',
    delivery_fee: '',
    estimated_delivery_minutes: '30',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    if (!user?.user_id) {
      setError('You must be logged in to register a restaurant.')
      setLoading(false)
      return
    }

    const name = form.name.trim()
    if (!name) {
      setError('Restaurant name is required.')
      setLoading(false)
      return
    }

    const phone = form.phone.trim()
    if (!phone) {
      setError('Phone number is required.')
      setLoading(false)
      return
    }

    const email = form.email.trim()
    if (!email) {
      setError('Email address is required.')
      setLoading(false)
      return
    }

    const address = form.address.trim()
    if (!address) {
      setError('Address is required.')
      setLoading(false)
      return
    }

    const city = form.city.trim()
    if (!city) {
      setError('City is required.')
      setLoading(false)
      return
    }

    const cuisine = form.cuisine.trim()
    if (!cuisine) {
      setError('Cuisine type is required.')
      setLoading(false)
      return
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_user_id', user.user_id)
        .maybeSingle()

      if (existingError) {
        console.error('Failed to check existing restaurant:', existingError)
        setError('Could not verify existing restaurant. Please try again.')
        setLoading(false)
        return
      }

      if (existing?.id) {
        setError('You already have a registered restaurant.')
        setLoading(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('restaurants')
        .insert({
          owner_user_id: user.user_id,
          name,
          description: form.description.trim() || null,
          phone,
          email,
          address,
          city,
          cuisine,
          delivery_fee: Number(form.delivery_fee) || 0,
          estimated_delivery_minutes: Number(form.estimated_delivery_minutes) || 30,
          is_open: true,
          is_active: true,
        })
        .select('*')
        .single()

      if (insertError) {
        console.error('Restaurant creation failed:', insertError)
        setError('Failed to create restaurant: ' + insertError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err) {
      console.error('Unexpected restaurant signup error:', err)
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo size="small" showTagline={false} />
      </header>

      <main className="inner-content">
        <div className="rsvp-card">
          <span className="section-label">RESTAURANT</span>
          <h2>Register Your Restaurant</h2>
          <p>Create your restaurant profile and start receiving orders on Ewizzy.</p>

          {error && (
            <div className="rsvp-message rsvp-message-error" role="alert">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="rsvp-message rsvp-message-success" role="alert">
              <span>✅</span>
              Restaurant registered successfully! Redirecting to your dashboard…
            </div>
          )}

          <form onSubmit={handleSubmit} className="rsvp-form">
          <fieldset className="rsvp-section">
            <legend>Restaurant Information</legend>
            <div className="rsvp-grid">
              <div className="rsvp-field">
                <label htmlFor="rsvp-name">Restaurant Name</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-name"
                  type="text"
                  placeholder="e.g. Mama's Kitchen"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  required
                />
              </div>
              <div className="rsvp-field rsvp-field-full">
                <label htmlFor="rsvp-description">Description</label>
                <textarea
                  id="rsvp-description"
                  placeholder="Tell customers about your restaurant — what you serve, your story, your specialties…"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="rsvp-section">
            <legend>Contact Information</legend>
            <div className="rsvp-grid">
              <div className="rsvp-field">
                <label htmlFor="rsvp-phone">Phone</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-phone"
                  type="tel"
                  placeholder="08012345678"
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  required
                />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-email">Email</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-email"
                  type="email"
                  placeholder="restaurant@example.com"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="rsvp-section">
            <legend>Restaurant Location</legend>
            <div className="rsvp-grid">
              <div className="rsvp-field">
                <label htmlFor="rsvp-address">Address</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-address"
                  type="text"
                  placeholder="Street address"
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  required
                />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-city">City</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-city"
                  type="text"
                  placeholder="e.g. Lagos"
                  value={form.city}
                  onChange={(event) => updateForm('city', event.target.value)}
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="rsvp-section">
            <legend>Cuisine and Delivery</legend>
            <div className="rsvp-grid">
              <div className="rsvp-field">
                <label htmlFor="rsvp-cuisine">Cuisine</label>
                <span className="rsvp-required">Required</span>
                <input
                  id="rsvp-cuisine"
                  type="text"
                  placeholder="e.g. Nigerian, Fast Food"
                  value={form.cuisine}
                  onChange={(event) => updateForm('cuisine', event.target.value)}
                  required
                />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-delivery-fee">Delivery Fee (₦)</label>
                <input
                  id="rsvp-delivery-fee"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="100"
                  value={form.delivery_fee}
                  onChange={(event) => updateForm('delivery_fee', event.target.value)}
                />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-delivery-time">Estimated Delivery Time</label>
                <input
                  id="rsvp-delivery-time"
                  type="number"
                  placeholder="30"
                  min="1"
                  step="5"
                  value={form.estimated_delivery_minutes}
                  onChange={(event) => updateForm('estimated_delivery_minutes', event.target.value)}
                />
                <span className="rsvp-hint">minutes</span>
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            className="primary-full rsvp-submit"
            disabled={loading}
          >
            {loading ? 'Creating Restaurant…' : 'Register Restaurant'}
          </button>
        </form>
        </div>
      </main>
    </div>
  )
}

export default RestaurantSignup
