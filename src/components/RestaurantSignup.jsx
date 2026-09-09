import { useState } from 'react'
import { supabase } from '../supabase.js'

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

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
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
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          cuisine: form.cuisine.trim() || null,
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
        <div className="brand">
          <div className="brand-icon">
            <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
          </div>
          <div>
            <h1>NaijaFix</h1>
            <span>Restaurant Registration</span>
          </div>
        </div>
      </header>

      <main className="inner-content">
        <span className="section-label">RESTAURANT</span>
        <h2>Register Your Restaurant</h2>
        <p>Create your restaurant profile and start receiving orders on NaijaFix.</p>

        {error && (
          <div className="empty-box" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <h4>{error}</h4>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Restaurant Name *</label>
          <input
            type="text"
            placeholder="e.g. Mama's Kitchen"
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
            required
          />

          <label>Description</label>
          <textarea
            placeholder="Tell customers about your restaurant..."
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 12,
              fontSize: 16,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />

          <label>Phone</label>
          <input
            type="tel"
            placeholder="08012345678"
            value={form.phone}
            onChange={(event) => updateForm('phone', event.target.value)}
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="restaurant@example.com"
            value={form.email}
            onChange={(event) => updateForm('email', event.target.value)}
          />

          <label>Address</label>
          <input
            type="text"
            placeholder="Street address"
            value={form.address}
            onChange={(event) => updateForm('address', event.target.value)}
          />

          <label>City</label>
          <input
            type="text"
            placeholder="e.g. Lagos"
            value={form.city}
            onChange={(event) => updateForm('city', event.target.value)}
          />

          <label>Cuisine</label>
          <input
            type="text"
            placeholder="e.g. Nigerian, Fast Food"
            value={form.cuisine}
            onChange={(event) => updateForm('cuisine', event.target.value)}
          />

          <label>Delivery Fee (₦)</label>
          <input
            type="number"
            placeholder="0"
            min="0"
            step="100"
            value={form.delivery_fee}
            onChange={(event) => updateForm('delivery_fee', event.target.value)}
          />

          <label>Estimated Delivery Time (minutes)</label>
          <input
            type="number"
            placeholder="30"
            min="1"
            value={form.estimated_delivery_minutes}
            onChange={(event) => updateForm('estimated_delivery_minutes', event.target.value)}
          />

          <button
            type="submit"
            className="primary-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Creating Restaurant...' : 'Register Restaurant'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default RestaurantSignup
