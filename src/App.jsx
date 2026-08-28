import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import './App.css'
import './components/DashboardUI.css'
import {
  SectionHeader,
  StatusBadge,
  EmptyState,
  LoadingState,
  DashboardCard,
  VerificationCard,
  ReportCard,
  DocPreview,
  ImageModal,
  DashboardShell,
  AdminSidebar,
  StatCard,
  StatGrid,
  BookingCard,
  ServiceGrid,
  SearchBar,
  TopBar,
  BottomNav,
} from './components/DashboardUI.jsx'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const defaultServices = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Pipes, leaks, toilets and water systems',
    category: 'Plumbing',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Wiring, sockets, lighting and repairs',
    category: 'Electrical',
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    description: 'Home, office and deep cleaning',
    category: 'Cleaning',
  },
  {
    id: 'ac-repair',
    name: 'AC Repair',
    description: 'Air conditioner installation and repair',
    category: 'AC Repair',
  },
  {
    id: 'generator-repair',
    name: 'Generator Repair',
    description: 'Generator servicing and repairs',
    category: 'Generator Repair',
  },
  {
    id: 'phone-repair',
    name: 'Phone Repair',
    description: 'Screen, battery and software repairs',
    category: 'Phone Repair',
  },
  {
    id: 'computer-repair',
    name: 'Computer Repair',
    description: 'Laptop, desktop and software support',
    category: 'Computer Repair',
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    description: 'Furniture, doors and woodwork',
    category: 'Carpentry',
  },
  {
    id: 'painting',
    name: 'Painting',
    description: 'Interior and exterior painting',
    category: 'Painting',
  },
  {
    id: 'fashion-tailoring',
    name: 'Fashion & Tailoring',
    description: 'Tailoring, alterations and fashion',
    category: 'Fashion and Tailoring',
  },
  {
    id: 'barbering',
    name: 'Barbering',
    description: 'Professional haircut and grooming',
    category: 'Barbering',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    description: 'Hair, makeup and beauty services',
    category: 'Beauty',
  },
]

const serviceIcons = {
  plumbing: '🔧',
  electrical: '⚡',
  cleaning: '🧹',
  'ac repair': '❄️',
  'generator repair': '🔌',
  'phone repair': '📱',
  'computer repair': '💻',
  carpentry: '🪚',
  painting: '🎨',
  'fashion and tailoring': '👕',
  barbering: '💈',
  beauty: '💇',
}

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
}

function getServiceIcon(service) {
  const category = normalizeCategory(service?.category)
  const name = normalizeCategory(service?.name)

  return serviceIcons[category] || serviceIcons[name] || '🛠️'
}

function Logo() {
  return (
    <div className="brand">
      <div className="brand-icon">N</div>

      <div>
        <h1>NaijaFix</h1>
        <span>Local people. Trusted services.</span>
      </div>
    </div>
  )
}

function MapView({ providers, onProviderSelect }) {
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [searchArea, setSearchArea] = useState(false)

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setLocationError('Location permission denied. You can still browse providers.')
      }
    )
  }

  const searchThisArea = () => {
    setSearchArea(true)
    setTimeout(() => setSearchArea(false), 2000)
  }

  const mappableProviders = providers.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  )

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const displayedProviders = searchArea
    ? mappableProviders.filter((p) => {
        const center = userLocation || { lat: 9.082, lng: 8.675 }
        const distance = getDistanceFromLatLonInKm(center.lat, center.lng, p.latitude, p.longitude)
        return distance <= 50
      })
    : mappableProviders

  const center =
    userLocation ||
    (mappableProviders.length > 0
      ? { lat: mappableProviders[0].latitude, lng: mappableProviders[0].longitude }
      : { lat: 9.082, lng: 8.675 })

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={requestLocation}>
          📍 Use my location
        </button>
        <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={searchThisArea}>
          🔍 Search this area
        </button>
        {locationError && (
          <span style={{ fontSize: 12, color: 'var(--nf-text-muted)', alignSelf: 'center' }}>
            {locationError}
          </span>
        )}
      </div>
      <div style={{ height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8e4' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={mappableProviders.length > 0 ? 12 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your location</Popup>
            </Marker>
          )}
          {displayedProviders.map((provider) => {
            const distance =
              userLocation &&
              getDistanceFromLatLonInKm(
                userLocation.lat,
                userLocation.lng,
                provider.latitude,
                provider.longitude
              )
            return (
              <Marker
                key={provider.id}
                position={[provider.latitude, provider.longitude]}
                eventHandlers={{
                  click: () => onProviderSelect?.(provider),
                }}
              >
                <Popup>
                  <strong>{provider.business_name}</strong>
                  <br />
                  {provider.category}
                  <br />
                  {provider.location}
                  <br />
                  ⭐ {provider.rating ?? 'New'}
                  {distance != null && <br />}
                  {distance != null && <span>{distance.toFixed(1)} km away</span>}
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
      {mappableProviders.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--nf-text-muted)', marginTop: 6 }}>
          No providers have map coordinates yet. Providers can add locations in their dashboard.
        </p>
      )}
    </div>
  )
}

function extractStorageObjectPath(url, bucket) {
  if (!url) return ''

  let path = String(url).trim()

  if (path.startsWith('http')) {
    try {
      const urlObj = new URL(path)
      const pathname = urlObj.pathname

      const signMatch = pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+\/.+)$/)
      if (signMatch) {
        return signMatch[1]
      }

      const objectMatch = pathname.match(/\/storage\/v1\/object\/([^/]+\/.+)$/)
      if (objectMatch) {
        return objectMatch[1]
      }

      const bucketIndex = pathname.indexOf(`/${bucket}/`)
      if (bucketIndex !== -1) {
        return pathname.slice(bucketIndex + 1)
      }
    } catch {
      // not a valid URL, fall through to raw path handling
    }
  }

  if (path.startsWith('/')) {
    path = path.slice(1)
  }

  return path
}

async function getSignedStorageUrl(bucket, path) {
  if (!bucket || !path) {
    throw new Error('Missing bucket or path for signed URL')
  }

  const normalizedPath = extractStorageObjectPath(path, bucket)

  if (!normalizedPath) {
    throw new Error('Empty object path after normalizing: ' + String(path))
  }

  console.log('Creating signed URL:', { bucket, path: normalizedPath })

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, 3600)

  if (error) {
    console.error('Failed to create signed URL:', { bucket, path: normalizedPath, error })
    throw error
  }

  if (!data?.signedUrl) {
    const missingError = new Error('Supabase returned no signed URL')
    console.error('Failed to create signed URL:', { bucket, path: normalizedPath, error: missingError })
    throw missingError
  }

  return data.signedUrl
}

function normalizeNigerianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('234')) return '+' + digits
  if (digits.startsWith('0')) return '+234' + digits.slice(1)
  return '+234' + digits
}

function isLikelyPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

function isEmail(value) {
  return String(value || '').includes('@')
}

async function uploadPrivateFile(bucket, userId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${userId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) {
    throw error
  }

  return path
}

function ReportForm({ user, onComplete }) {
  const [category, setCategory] = useState('Service issue')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const submitReport = async (event) => {
    event.preventDefault()

    if (!user?.user_id || !subject.trim() || !description.trim()) {
      alert('Please complete the report fields.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('support_reports').insert({
      reporter_user_id: user.user_id,
      reporter_role: user.role || 'customer',
      category,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
    })

    if (error) {
      console.error('Failed to submit report:', error)
      alert('Could not submit report: ' + error.message)
    } else {
      alert('Report submitted successfully.')
      setSubject('')
      setDescription('')
      onComplete?.()
    }
    setLoading(false)
  }

  return (
    <form className="request-form" onSubmit={submitReport}>
      <h3>Help and support</h3>
      <select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option>Service issue</option>
        <option>Provider issue</option>
        <option>Customer issue</option>
        <option>Fraud/scam</option>
        <option>Harassment</option>
        <option>Safety concern</option>
        <option>Other</option>
      </select>
      <input
        placeholder="Subject"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <textarea
        placeholder="Describe the problem..."
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button className="primary-full" type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit report'}
      </button>
    </form>
  )
}

function Home({
  services,
  onLogin,
  onSignup,
  onProviderSignup,
  onService,
}) {
  const [search, setSearch] = useState('')
  const searchText = search.trim().toLowerCase()
  const visibleServices = services.filter((service) =>
    [service.name, service.description, service.category]
      .some((value) =>
        String(value || '').toLowerCase().includes(searchText)
      )
  )

  return (
    <div className="page">
      <header className="navbar">
        <Logo />

        <button className="login-button" onClick={onLogin}>
          Log in
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="welcome">BUILT FOR NIGERIA 🇳🇬</span>

            <h2>
              Find trusted local services <strong>near you.</strong>
            </h2>

            <p>
              Connect with reliable service providers around you
              and get the help you need, when you need it.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={onSignup}
              >
                Get started
              </button>

              <button
                className="secondary-button"
                onClick={onLogin}
              >
                I'm a customer
              </button>

              <button
                className="secondary-button"
                onClick={onProviderSignup}
              >
                I'm a service provider
              </button>
            </div>

            <div className="home-search">
              <span>🔍</span>
              <input
                type="search"
                placeholder="Search for a service..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <span className="section-label">POPULAR</span>

            <h3>What service do you need?</h3>
          </div>

          <div className="service-grid">
            {visibleServices.slice(0, 8).map((service) => (
              <button
                className="service-card"
                key={service.id}
                onClick={() => onService(service)}
              >
                <div className="service-icon">
                  {getServiceIcon(service)}
                </div>

                <strong>{service.name}</strong>

                <span>
                  {service.description ||
                    'Professional local service'}
                </span>
              </button>
            ))}
          </div>

          {visibleServices.length === 0 && (
            <div className="empty-box">
              <span>🔎</span>
              <h4>No service found</h4>
              <p>Try searching for another service.</p>
            </div>
          )}
        </section>

        <section className="trust-section">
          <div>
            <span>✓</span>
            <strong>Verified providers</strong>
            <p>Find reliable local professionals.</p>
          </div>

          <div>
            <span>⭐</span>
            <strong>Real ratings</strong>
            <p>See ratings from customers.</p>
          </div>

          <div>
            <span>📍</span>
            <strong>Local services</strong>
            <p>Discover providers around your area.</p>
          </div>
        </section>
      </main>

      <footer>
        <Logo />
        <span>© 2026 NaijaFix. Built for Nigeria.</span>
      </footer>
    </div>
  )
}

function Login({ onBack, onSignup, onDashboard }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()

    const rawIdentifier = identifier.trim()

    if (!rawIdentifier || !password) {
      alert('Please enter your email or phone number and password.')
      return
    }

    setLoading(true)

    try {
      const authPayload = isEmail(rawIdentifier)
        ? { email: rawIdentifier, password }
        : { phone: normalizeNigerianPhone(rawIdentifier), password }

      const { data, error } =
        await supabase.auth.signInWithPassword(authPayload)

      if (error) {
        console.error('Login failed:', error)
        alert('Login failed: ' + error.message)
        setLoading(false)
        return
      }

      const authenticatedUser = data?.user

      if (!authenticatedUser) {
        alert(
          'Login succeeded, but no authenticated user was returned.'
        )
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authenticatedUser.id)
          .maybeSingle()

      if (profileError) {
        console.error(
          'Profile loading failed:',
          profileError
        )

        alert(
          'Login successful, but your NaijaFix profile could not be loaded: ' +
            profileError.message
        )

        setLoading(false)
        return
      }

      if (!profile) {
        alert(
          'Login successful, but no NaijaFix profile was found for this account.'
        )

        setLoading(false)
        return
      }

      const appUser = {
        id: profile.id,
        user_id: authenticatedUser.id,
        name: profile.full_name || '',
        email:
          profile.email ||
          authenticatedUser.email ||
          rawIdentifier,
        phone: profile.phone || '',
        role: profile.role || 'customer',
        avatar_url: profile.avatar_url || '',
      }

      localStorage.setItem(
        'naijafixUser',
        JSON.stringify(appUser)
      )

      alert('Login successful!')

      setLoading(false)
      onDashboard()
    } catch (error) {
      console.error('Unexpected login error:', error)

      alert(
        'Something went wrong during login: ' +
          (error?.message || 'Unknown error')
      )

      setLoading(false)
    }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()

    const rawIdentifier = identifier.trim()

    if (!rawIdentifier || isLikelyPhone(rawIdentifier)) {
      alert('Please enter your email address to reset your password.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(rawIdentifier, {
        redirectTo: window.location.origin,
      })

      if (error) {
        console.error('Password reset failed:', error)
        alert('Could not send reset email: ' + error.message)
      } else {
        setResetSent(true)
      }
    } catch (error) {
      console.error('Unexpected password reset error:', error)
      alert('Something went wrong: ' + (error?.message || 'Unknown error'))
    }

    setLoading(false)
  }

  if (forgotMode && !resetSent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <button className="back-link" onClick={() => { setForgotMode(false); setResetSent(false) }}>
            ← Back
          </button>

          <Logo />

          <h2>Reset password</h2>

          <p>
            Enter your email and we will send you a reset link.
          </p>

          <form onSubmit={handleForgotPassword}>
            <label>Email address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={identifier}
              onChange={(event) =>
                setIdentifier(event.target.value)
              }
              autoComplete="email"
            />

            <button
              className="primary-full"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <p className="auth-switch">
            Remember your password?

            <button onClick={() => setForgotMode(false)}>
              {' '}
              Log in
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (forgotMode && resetSent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <button className="back-link" onClick={() => { setForgotMode(false); setResetSent(false) }}>
            ← Back
          </button>

          <Logo />

          <h2>Check your email</h2>

          <p>
            If an account exists for {identifier || 'that address'}, we sent a password reset link.
          </p>

          <p className="auth-switch">
            Didn’t receive it?

            <button onClick={() => setResetSent(false)}>
              {' '}
              Try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>

        <Logo />

        <h2>Welcome back</h2>

        <p>
          Log in to find trusted local service providers.
        </p>

        <form onSubmit={handleLogin}>
          <label>Email or phone number</label>

          <input
            type="text"
            placeholder="you@example.com or 08012345678"
            value={identifier}
            onChange={(event) =>
              setIdentifier(event.target.value)
            }
            autoComplete="email"
          />

          <label>Password</label>

          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <button
            className="primary-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          <button onClick={() => { setForgotMode(true); setResetSent(false) }} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
            Forgot password?
          </button>
        </p>

        <p className="auth-switch">
          Don't have an account?

          <button onClick={onSignup}>
            {' '}
            Create account
          </button>
        </p>
      </div>
    </div>
  )
}

function Signup({ onBack, onLogin, initialRole = 'customer' }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: initialRole,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [pendingMeta, setPendingMeta] = useState(null)

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSignup = async (event) => {
    event.preventDefault()

    const name = form.name.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const password = form.password
    const role = form.role

    if (!name || !(email || phone) || !password) {
      alert('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (email) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                phone,
              },
            },
          })

        if (signUpError) {
          console.error('Signup failed:', signUpError)
          alert('Signup failed: ' + signUpError.message)
          setLoading(false)
          return
        }

        const authenticatedUser = signUpData.user

        if (!authenticatedUser?.id) {
          alert(
            'Something went wrong during signup. Please try again.'
          )
          setLoading(false)
          return
        }

        const ok = await finishSignup(
          authenticatedUser.id,
          name,
          email,
          phone,
          role
        )

        if (ok) {
          alert('Welcome to NaijaFix!')
          onLogin()
        }
      } else {
        const normalizedPhone = normalizeNigerianPhone(phone)

        const { error: signUpError } =
          await supabase.auth.signUp({
            phone: normalizedPhone,
            password,
            options: {
              data: {
                full_name: name,
              },
            },
          })

        if (signUpError) {
          console.error('Phone signup failed:', signUpError)
          alert('Signup failed: ' + signUpError.message)
          setLoading(false)
          return
        }

        setPendingPhone(normalizedPhone)
        setPendingMeta({ name, phone: normalizedPhone, role })
        setOtpSent(true)
      }
    } catch (error) {
      console.error('Unexpected signup error:', error)

      alert(
        'Something went wrong during signup: ' +
          (error?.message || 'Unknown error')
      )
    }

    setLoading(false)
  }

  const finishSignup = async (userId, name, email, phone, role) => {
    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (existingProfileError) {
      console.error(
        'Existing profile check failed:',
        existingProfileError
      )

      alert(
        'Account was created, but the NaijaFix profile could not be loaded: ' +
          existingProfileError.message
      )

      return false
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            full_name: existingProfile?.full_name || name,
            email: existingProfile?.email || email,
            phone: existingProfile?.phone || phone,
            role: existingProfile?.role || role,
            avatar_url: existingProfile?.avatar_url ?? null,
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .maybeSingle()

    if (profileError) {
      console.error(
        'Profile creation failed:',
        profileError
      )

      alert(
        'Account was created, but the NaijaFix profile could not be saved: ' +
          profileError.message
      )

      return false
    }

    if (role === 'provider') {
      const { error: providerError } =
        await supabase
          .from('providers')
          .upsert(
            {
              user_id: userId,
              business_name: name,
              category: 'General',
              location: phone || 'Nigeria',
              phone,
              description: '',
              verified: false,
              rating: null,
              avatar_url: null,
              emergency_available: false,
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
          )

      if (providerError) {
        console.error(
          'Provider profile creation failed:',
          providerError
        )

        alert(
          'Account was created, but the provider profile could not be saved: ' +
            providerError.message
        )

        return false
      }
    }

    const appUser = {
      id: profile.id,
      user_id: userId,
      name: profile.full_name || name,
      email: profile.email || email,
      phone: profile.phone || phone,
      role: profile.role || 'customer',
      avatar_url: profile.avatar_url || '',
    }

    localStorage.setItem(
      'naijafixUser',
      JSON.stringify(appUser)
    )

    return true
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()

    if (!otp.trim() || !pendingPhone) {
      alert('Please enter the verification code.')
      return
    }

    setOtpLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: otp.trim(),
        type: 'signup',
      })

      if (error) {
        console.error('OTP verification failed:', error)
        alert('Verification failed: ' + error.message)
        setOtpLoading(false)
        return
      }

      const authenticatedUser = data?.user

      if (!authenticatedUser?.id) {
        alert('Verification succeeded, but no user was returned.')
        setOtpLoading(false)
        return
      }

      const ok = await finishSignup(
        authenticatedUser.id,
        pendingMeta?.name || '',
        '',
        pendingMeta?.phone || pendingPhone,
        pendingMeta?.role || 'customer'
      )

      if (ok) {
        alert('Welcome to NaijaFix!')
        onLogin()
      }
    } catch (error) {
      console.error('Unexpected OTP error:', error)
      alert('Something went wrong during verification: ' + (error?.message || 'Unknown error'))
    }

    setOtpLoading(false)
  }

  const handleResendOtp = async () => {
    if (!pendingPhone) return
    setOtpLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        phone: pendingPhone,
        password: form.password,
      })
      if (error) {
        alert('Could not resend code: ' + error.message)
      } else {
        alert('A new verification code has been sent.')
      }
    } catch (error) {
      alert('Something went wrong: ' + (error?.message || 'Unknown error'))
    }
    setOtpLoading(false)
  }

  if (otpSent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>

          <Logo />

          <h2>Verify your phone</h2>

          <p>
            We sent a verification code to {pendingPhone}
          </p>

          <form onSubmit={handleVerifyOtp}>
            <label>Verification code</label>

            <input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              autoComplete="one-time-code"
            />

            <button
              className="primary-full"
              type="submit"
              disabled={otpLoading}
            >
              {otpLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <button
            type="button"
            className="secondary-button"
            onClick={handleResendOtp}
            disabled={otpLoading}
            style={{ marginTop: 10 }}
          >
            Resend code
          </button>

          <p className="auth-switch">
            Wrong number?

            <button onClick={() => { setOtpSent(false); setPendingPhone(''); setPendingMeta(null); }}>
              {' '}
              Change
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>

        <Logo />

        <h2>Create your account</h2>

        <p>
          Join NaijaFix and find trusted services around you.
        </p>

        <form onSubmit={handleSignup}>
          <label>Full name</label>

          <input
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={(event) =>
              updateForm('name', event.target.value)
            }
            autoComplete="name"
          />

          <label>Email address (optional — or use phone)</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) =>
              updateForm('email', event.target.value)
            }
            autoComplete="email"
          />

          <label>Phone number (optional — or use email)</label>

          <input
            type="tel"
            placeholder="08012345678"
            value={form.phone}
            onChange={(event) =>
              updateForm('phone', event.target.value)
            }
            autoComplete="tel"
          />

          <label>Account type</label>

          <select
            value={form.role}
            onChange={(event) =>
              updateForm('role', event.target.value)
            }
          >
            <option value="customer">Customer</option>
            <option value="provider">Service Provider</option>
          </select>

          <label>Password</label>

          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={form.password}
              onChange={(event) =>
                updateForm('password', event.target.value)
              }
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <button
            className="primary-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?

          <button onClick={onLogin}>
            {' '}
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

function Dashboard({
  user,
  services,
  providers,
  onService,
  onBookings,
  onNotifications,
  onProfile,
  onProviderDashboard,
  onAdminDashboard,
  onConversations,
  onFavorites,
  onProvider,
  onLogout,
}) {
  const [search, setSearch] = useState('')
  const [recentBookings, setRecentBookings] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [activityLoading, setActivityLoading] = useState(true)
  const [supportReports, setSupportReports] = useState([])
  const [customerVerification, setCustomerVerification] = useState(null)
  const [dashboardAvatarUrl, setDashboardAvatarUrl] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const avatar = user?.avatar_url
      if (!avatar) {
        setDashboardAvatarUrl('')
        return
      }

      try {
        const url = await getSignedStorageUrl('profile-photos', avatar)
        if (!cancelled) setDashboardAvatarUrl(url)
      } catch {
        if (!cancelled) setDashboardAvatarUrl('')
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [user?.avatar_url])

  const loadUnreadNotifications = useCallback(async () => {
    if (!user?.user_id) {
      setUnreadNotifications(0)
      return
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', user.user_id)
      .eq('is_read', false)
    if (error) {
      console.error('Failed to load unread notifications:', error)
      return
    }
    setUnreadNotifications(count || 0)
  }, [user])

  useEffect(() => {
    const loadActivity = async () => {
      if (!user?.user_id) {
        setRecentBookings([])
        setUnreadNotifications(0)
        setSupportReports([])
        setActivityLoading(false)
        return
      }

      setActivityLoading(true)

      const [bookingsResult, notificationsResult, reportsResult] =
        await Promise.all([
          supabase
            .from('bookings')
            .select('*')
            .eq('customer_user_id', user.user_id)
            .order('created_at', {
              ascending: false,
            })
            .limit(3),
          supabase
            .from('notifications')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', user.user_id)
            .eq('is_read', false),
          supabase
            .from('support_reports')
            .select('*')
            .eq('reporter_user_id', user.user_id)
            .order('created_at', {
              ascending: false,
            }),
        ])

      if (bookingsResult.error) {
        console.error(
          'Failed to load recent bookings:',
          bookingsResult.error
        )
      } else {
        setRecentBookings(bookingsResult.data || [])
      }

      if (notificationsResult.error) {
        console.error(
          'Failed to load unread notifications:',
          notificationsResult.error
        )
      } else {
        setUnreadNotifications(notificationsResult.count || 0)
      }

      if (reportsResult.error) {
        console.error(
          'Failed to load support reports:',
          reportsResult.error
        )
      } else {
        setSupportReports(reportsResult.data || [])
      }

      const { data: cvData, error: cvError } = await supabase
        .from('customer_verifications')
        .select('*')
        .eq('customer_user_id', user.user_id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cvError) {
        console.error('Failed to load customer verification:', cvError)
      } else {
        setCustomerVerification(cvData || null)
      }

      setActivityLoading(false)
    }

    loadActivity()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadNotifications()
      }
    }
    const handleFocus = () => {
      loadUnreadNotifications()
    }
    const handlePopstate = () => {
      loadUnreadNotifications()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('popstate', handlePopstate)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [user, loadUnreadNotifications])

  const searchText = search.trim().toLowerCase()

  const filteredServices = services.filter((service) => {
    const name = String(
      service.name || ''
    ).toLowerCase()

    const description = String(
      service.description || ''
    ).toLowerCase()

    const category = String(
      service.category || ''
    ).toLowerCase()

    return (
      name.includes(searchText) ||
      description.includes(searchText) ||
      category.includes(searchText)
    )
  })

  const pendingCount = recentBookings.filter(b => String(b.status).toLowerCase() === 'pending').length
  const acceptedCount = recentBookings.filter(b => String(b.status).toLowerCase() === 'accepted').length

  const popularProviders = (providers || [])
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6)

  const upcomingBookings = recentBookings.filter(
    (b) => String(b.status || '').toLowerCase() === 'pending' || String(b.status || '').toLowerCase() === 'accepted'
  )

  return (
    <div className="dash-shell-main" style={{ minHeight: '100vh', background: 'var(--nf-bg)' }}>
      <TopBar
        greeting="NAIJAFIX"
        name={`Welcome back, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="What service do you need today?"
        avatarUrl={dashboardAvatarUrl}
        onProfile={onProfile}
        onNotification={onNotifications}
        notificationCount={unreadNotifications}
        actions={
          user?.role === 'admin' ? (
            <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onAdminDashboard}>⚙️ Admin</button>
          ) : user?.role === 'provider' ? (
            <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onProviderDashboard}>Provider</button>
          ) : null
        }
      />

      <main className="dash-shell-content" style={{ paddingBottom: 100 }}>
        <DashboardCard>
          <div className="dash-profile-header">
            <div className="dash-profile-avatar">
              {dashboardAvatarUrl ? <img src={dashboardAvatarUrl} alt="Profile" /> : (user?.name?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="dash-profile-info">
              <h3>{user?.name || 'Customer'}</h3>
              <p>{user?.email || ''}</p>
              {user?.phone && <p>📞 {user.phone}</p>}
              <p style={{ textTransform: 'capitalize' }}>{user?.role || 'customer'} account</p>
              <StatusBadge status={customerVerification?.status || 'unverified'} />
            </div>
          </div>
          <div className="dash-btn-group">
            <button className="dash-btn dash-btn-outline dash-btn-full" onClick={onProfile}>
              Edit Profile
            </button>
            <button className="dash-btn dash-btn-outline dash-btn-full" onClick={onNotifications}>
              Notifications {unreadNotifications > 0 && `(${unreadNotifications})`}
            </button>
            {onFavorites && (
              <button className="dash-btn dash-btn-outline dash-btn-full" onClick={onFavorites}>
                ❤️ Saved providers
              </button>
            )}
          </div>
        </DashboardCard>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search for a service..."
        />

        <StatGrid>
          <StatCard icon="📅" value={recentBookings.length} label="Total bookings" color="green" />
          <StatCard icon="⏳" value={pendingCount} label="Pending" color="yellow" />
          <StatCard icon="✅" value={acceptedCount} label="Accepted" color="blue" />
          <StatCard icon="📋" value={supportReports.length} label="Reports" color="red" />
        </StatGrid>

        <SectionHeader label="SERVICES" title="Find a service" />
        <ServiceGrid
          services={filteredServices.slice(0, 8).map(s => ({ ...s, icon: getServiceIcon(s) }))}
          onSelect={onService}
        />
        {filteredServices.length === 0 && (
          <EmptyState icon="🔎" title="No service found" description="Try searching for another service." />
        )}

        {popularProviders.length > 0 && (
          <>
            <SectionHeader label="POPULAR" title="Popular providers" />
            <div className="provider-list">
              {popularProviders.slice(0, 4).map((provider) => (
                <button
                  className="provider-card"
                  key={provider.id}
                  onClick={() => onProvider?.(provider)}
                >
                  <div className="provider-avatar">
                    {provider.business_name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="provider-info">
                    <h4>{provider.business_name}</h4>
                    {provider.verified && <span className="verified">✓ Verified provider</span>}
                    <p>⭐ {provider.rating ?? 'New'} rating</p>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
          </>
        )}

        <SectionHeader
          label="YOUR ACTIVITY"
          title="My bookings"
          action={<button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onBookings}>View all →</button>}
        />
        {activityLoading ? (
          <LoadingState text="Loading your activity..." />
        ) : recentBookings.length > 0 ? (
          <div>
            {upcomingBookings.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--nf-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming</p>
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showActions={false} />
                ))}
              </div>
            )}
            {recentBookings.filter(b => !upcomingBookings.includes(b)).length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--nf-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Past</p>
                {recentBookings.filter(b => !upcomingBookings.includes(b)).map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showActions={false} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="No bookings yet"
            description="Your service requests will appear here."
            action={
              <button className="dash-btn dash-btn-primary" onClick={() => onService(services[0] || { id: 'plumbing', name: 'Plumbing', category: 'Plumbing' })}>
                Find a provider
              </button>
            }
          />
        )}

        <SectionHeader label="SUPPORT" title="Your reports" />
        {activityLoading ? (
          <LoadingState text="Loading reports..." />
        ) : supportReports.length === 0 ? (
          <EmptyState icon="📋" title="No reports yet" description="Submit a support report below." />
        ) : (
          supportReports.map((report) => (
            <ReportCard key={report.id} report={report} reporterName={user?.name} />
          ))
        )}

        <SectionHeader label="SUPPORT" title="Help and support" />
        <DashboardCard>
          <ReportForm user={user} />
        </DashboardCard>

        {onLogout && (
          <DashboardCard>
            <button className="dash-btn dash-btn-danger dash-btn-full" onClick={onLogout}>
              Log out
            </button>
          </DashboardCard>
        )}

        <SectionHeader label="MESSAGES" title="Your conversations" />
        <EmptyState
          icon="💬"
          title="Message providers"
          description="Chat about your bookings and service requests."
          action={
            <button className="dash-btn dash-btn-primary" onClick={onConversations}>
              Open messages
            </button>
          }
        />
      </main>

      <BottomNav
        items={[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'services', icon: '🔍', label: 'Services' },
          { id: 'bookings', icon: '📅', label: 'Bookings' },
          { id: 'notifications', icon: '🔔', label: 'Alerts', badge: unreadNotifications },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ]}
        active="home"
        onChange={(id) => {
          if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
          else if (id === 'services') onService(services[0] || { id: 'plumbing', name: 'Plumbing', category: 'Plumbing' })
          else if (id === 'bookings') onBookings()
          else if (id === 'notifications') onNotifications()
          else if (id === 'profile') onProfile()
        }}
      />
    </div>
  )
}

function Services({
  service,
  providers,
  loading,
  onBack,
  onProvider,
}) {
  const [search, setSearch] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [emergencyOnly, setEmergencyOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState('default')
  const serviceCategory = normalizeCategory(
    normalizeCategory(service?.category) ===
      'home services'
      ? service?.name || service?.category || ''
      : service?.category || service?.name || ''
  )

  const searchText = search.trim().toLowerCase()
  let matchingProviders = providers.filter((provider) => {
    const providerCategory = normalizeCategory(
      provider.category
    )
    const providerText = [
      provider.business_name,
      provider.category,
      provider.location,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    const matchesCategory =
      providerCategory === serviceCategory ||
      providerCategory.includes(serviceCategory) ||
      serviceCategory.includes(providerCategory)

    const matchesSearch = !searchText || providerText.includes(searchText)
    const matchesVerified = !verifiedOnly || provider.verified
    const matchesEmergency = !emergencyOnly || provider.emergency_available
    const matchesRating =
      !minRating ||
      (typeof provider.rating === 'number' && provider.rating >= minRating)

    return (
      matchesCategory &&
      matchesSearch &&
      matchesVerified &&
      matchesEmergency &&
      matchesRating
    )
  })

  if (sortBy === 'rating-desc') {
    matchingProviders = matchingProviders.slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (sortBy === 'name-asc') {
    matchingProviders = matchingProviders.slice().sort((a, b) =>
      String(a.business_name || '').localeCompare(String(b.business_name || '')),
    )
  } else if (sortBy === 'emergency-first') {
    matchingProviders = matchingProviders.slice().sort((a, b) =>
      (b.emergency_available ? 1 : 0) - (a.emergency_available ? 1 : 0),
    )
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back
        </button>

        <Logo />
      </header>

      <main className="inner-content">
        <span className="section-label">
          SERVICE
        </span>

        <h2>
          {getServiceIcon(service)} {service?.name}
        </h2>

        <p>
          {service?.description ||
            'Find trusted providers for this service.'}
        </p>

        <section className="dashboard-search provider-search">
          <span>🔍</span>
          <input
            type="search"
            placeholder="Search providers or locations..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </section>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`dash-btn ${showMap ? 'dash-btn-outline' : 'dash-btn-primary'} dash-btn-sm`}
            onClick={() => setShowMap(false)}
          >
            📋 List
          </button>
          <button
            type="button"
            className={`dash-btn ${showMap ? 'dash-btn-primary' : 'dash-btn-outline'} dash-btn-sm`}
            onClick={() => setShowMap(true)}
          >
            🗺️ Map
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            ✓ Verified only
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={emergencyOnly}
              onChange={(e) => setEmergencyOnly(e.target.checked)}
            />
            🚨 Emergency
          </label>
          <select
            className="dash-form-input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value="0">Any rating</option>
            <option value="3">3+ stars</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
          <select
            className="dash-form-input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Sort: Default</option>
            <option value="rating-desc">Sort: Top rated</option>
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="emergency-first">Sort: Emergency first</option>
          </select>
        </div>

        {showMap && (
          <MapView providers={matchingProviders} onProviderSelect={onProvider} />
        )}

        {loading ? (
          <div className="empty-box large-empty">
            <span>⏳</span>

            <h4>Loading providers...</h4>

            <p>Please wait.</p>
          </div>
        ) : matchingProviders.length > 0 ? (
          <div className="provider-list">
            {matchingProviders.map((provider) => (
              <button
                className="provider-card"
                key={provider.id}
                onClick={() =>
                  onProvider(provider)
                }
              >
                <div className="provider-avatar">
                  {provider.business_name
                    ?.charAt(0)
                    ?.toUpperCase() || 'P'}
                </div>

                <div className="provider-info">
                  <h4>
                    {provider.business_name}
                  </h4>

                  {provider.verified && (
                    <span className="verified">
                      ✓ Verified provider
                    </span>
                  )}

                  {provider.emergency_available && (
                    <span className="verified" style={{ color: '#b52b2b' }}>
                      🚨 Emergency available
                    </span>
                  )}

                  <p>
                    📍{' '}
                    {provider.location ||
                      'Location not provided'}
                  </p>

                  <p>
                    ⭐ {provider.rating ?? 'New'} rating
                  </p>

                  {provider.phone && (
                    <p>
                      📞 {provider.phone}
                    </p>
                  )}
                </div>

                <span className="arrow">→</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-box">
            <span>🛠️</span>

            <h4>No providers found</h4>

            <p>
              There are currently no providers listed
              in this category.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function ProviderDetails({
  provider,
  service,
  user,
  onBack,
  onRequest,
  onChat,
}) {
  const [samples, setSamples] = useState([])
  const [loadingSamples, setLoadingSamples] = useState(true)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [availability, setAvailability] = useState([])

  useEffect(() => {
    const loadSamples = async () => {
      if (!provider?.user_id) {
        setLoadingSamples(false)
        return
      }

      const { data, error } = await supabase
        .from('provider_work_samples')
        .select('*')
        .eq('provider_user_id', provider.user_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load work samples:', error)
        setSamples([])
      } else {
        const signed = []
        for (const sample of (data || [])) {
          try {
            const signedUrl = await getSignedStorageUrl('provider-work-samples', sample.image_url)
            signed.push({ ...sample, signedUrl })
          } catch (error) {
            console.error('Failed to load work sample:', error)
            signed.push({ ...sample, signedUrl: '' })
          }
        }
        setSamples(signed)
      }

      setLoadingSamples(false)
    }

    const loadReviews = async () => {
      if (!provider?.user_id) {
        setLoadingReviews(false)
        return
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('provider_user_id', provider.user_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to load reviews:', error)
        setReviews([])
      } else {
        setReviews(data || [])
      }
      setLoadingReviews(false)
    }

    const loadFavorite = async () => {
      if (!provider?.user_id || !user?.user_id) {
        setIsFavorite(false)
        return
      }
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('customer_user_id', user.user_id)
        .eq('provider_user_id', provider.user_id)
        .maybeSingle()
      setIsFavorite(!!data)
    }

    const loadPackages = async () => {
      if (!provider?.user_id) {
        return
      }
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('provider_user_id', provider.user_id)
        .order('price', { ascending: true })

      if (error) {
        console.error('Failed to load packages:', error)
        setPackages([])
      } else {
        setPackages(data || [])
      }
    }

    const loadAvailability = async () => {
      if (!provider?.user_id) {
        setAvailability([])
        return
      }
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_user_id', provider.user_id)

      if (error) {
        console.error('Failed to load availability:', error)
        setAvailability([])
      } else {
        setAvailability(data || [])
      }
    }

    loadSamples()
    loadReviews()
    loadFavorite()
    loadPackages()
    loadAvailability()
  }, [provider, user])

  const toggleFavorite = async () => {
    if (!provider?.user_id || !user?.user_id) {
      alert('Please log in to save providers.')
      return
    }
    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('customer_user_id', user.user_id)
          .eq('provider_user_id', provider.user_id)
        if (error) throw error
        setIsFavorite(false)
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            customer_user_id: user.user_id,
            provider_user_id: provider.user_id,
          })
        if (error) throw error
        setIsFavorite(true)
      }
    } catch (error) {
      alert('Could not update favorites: ' + error.message)
    }
    setFavoriteLoading(false)
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null

  if (!provider) {
    return null
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back
        </button>

        <Logo />
      </header>

      <main className="provider-details">
        <div className="large-avatar">
          {provider.business_name
            ?.charAt(0)
            ?.toUpperCase() || 'P'}
        </div>

        <h2>{provider.business_name}</h2>

        {provider.verified && (
          <span className="verified-badge">
            ✓ Verified provider
          </span>
        )}

        {averageRating && (
          <span className="verified-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
            ⭐ {averageRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
          </span>
        )}

        {provider.emergency_available && (
          <span className="verified-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
            🚨 Emergency available
          </span>
        )}

        {(() => {
          const availableDays = availability.filter((a) => a.is_available).length
          if (availableDays > 0) {
            return (
              <span className="verified-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                🟢 Available {availableDays} day{availableDays !== 1 ? 's' : ''}/week
              </span>
            )
          }
          return null
        })()}

        {averageRating && Number(averageRating) >= 4.5 && reviews.length >= 3 && (
          <span className="verified-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
            🏆 Top rated
          </span>
        )}

        {reviews.length >= 10 && (
          <span className="verified-badge" style={{ background: '#e0f2fe', color: '#075985' }}>
            🧰 Experienced provider
          </span>
        )}

        <p className="provider-location">
          📍{' '}
          {provider.location ||
            'Location not provided'}
        </p>

        {provider.phone && (
          <p className="provider-location">
            📞 {provider.phone}
          </p>
        )}

        <div className="stats-row">
          <div>
            <strong>
              ⭐ {provider.rating ?? averageRating ?? 'New'}
            </strong>

            <span>Rating</span>
          </div>

          <div>
            <strong>
              {provider.verified ? '✓' : '—'}
            </strong>

            <span>Verified</span>
          </div>

          <div>
            <strong>
              {service?.name || 'Service'}
            </strong>

            <span>Category</span>
          </div>
        </div>

        <section className="details-card">
          <h3>About this provider</h3>

          <p>
            {provider.description ||
              'This provider has not added a description yet.'}
          </p>

          <p>
            Service:{' '}
            {service?.name ||
              provider.category ||
              'Local service'}
          </p>
        </section>

        {packages.length > 0 && (
          <section className="details-card">
            <h3>Service packages</h3>
            <div className="sample-grid">
              {packages.map((pkg) => (
                <div key={pkg.id} style={{ background: 'var(--nf-bg)', padding: 12, borderRadius: 10 }}>
                  <strong>{pkg.name}</strong>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>{pkg.description}</p>
                  <p style={{ fontWeight: 800, color: 'var(--nf-green)' }}>₦{Number(pkg.price).toLocaleString()}</p>
                  {pkg.estimated_duration && <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>Duration: {pkg.estimated_duration}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="details-card">
          <h3>Work samples</h3>

          {loadingSamples ? (
            <div className="empty-box">
              <span>⏳</span>
              <h4>Loading samples...</h4>
            </div>
          ) : samples.length === 0 ? (
            <div className="empty-box">
              <span>🛠️</span>
              <h4>No work samples yet</h4>
            </div>
          ) : (
            <div className="sample-grid">
              {samples.map((sample) => (
                <div key={sample.id}>
                  <img src={sample.signedUrl} alt={sample.caption || 'Work sample'} />
                  {sample.caption && <p>{sample.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="details-card">
          <h3>Reviews</h3>
          {loadingReviews ? (
            <div className="empty-box">
              <span>⏳</span>
              <h4>Loading reviews...</h4>
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-box">
              <span>⭐</span>
              <h4>No reviews yet</h4>
            </div>
          ) : (
            <div>
              {reviews.map((review) => (
                <div key={review.id} style={{ borderBottom: '1px solid #e2e8e4', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>⭐ {review.rating}/5</strong>
                    <small style={{ color: 'var(--nf-text-muted)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  {review.comment && <p style={{ margin: '4px 0', fontSize: 14 }}>{review.comment}</p>}
                  {review.provider_response && (
                    <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, marginTop: 6 }}>
                      <strong style={{ fontSize: 12 }}>Provider response</strong>
                      <p style={{ margin: 0, fontSize: 13 }}>{review.provider_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="details-card">
          <h3>Leave a review</h3>
          {user && user.role === 'customer' ? (
            <ReviewForm providerUserId={provider.user_id} user={user} onReviewSubmitted={() => {
              const loadReviews = async () => {
                const { data } = await supabase.from('reviews').select('*').eq('provider_user_id', provider.user_id).order('created_at', { ascending: false }).limit(10)
                setReviews(data || [])
              }
              loadReviews()
            }} />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--nf-text-muted)' }}>Log in as a customer to leave a review.</p>
          )}
        </section>

        <button
          className="primary-full"
          onClick={onRequest}
        >
          Request this service
        </button>

        <button
          className="dash-btn dash-btn-outline dash-btn-full"
          onClick={toggleFavorite}
            disabled={favoriteLoading || !user}
            style={{ marginTop: 10 }}
          >
            {favoriteLoading ? 'Saving...' : isFavorite ? '❤️ Saved' : '🤍 Save provider'}
          </button>

        {onChat && (
          <button
            className="secondary-button"
            onClick={() => onChat(provider)}
            style={{ marginTop: 10 }}
          >
            Message provider
          </button>
        )}
      </main>
    </div>
  )
}

function RequestService({
  provider,
  service,
  user,
  onBack,
  onComplete,
}) {
  const [description, setDescription] =
    useState('')

  const [location, setLocation] =
    useState('')

  const [date, setDate] = useState('')

  const [preferredTime, setPreferredTime] = useState('')

  const [loading, setLoading] =
    useState(false)

  const [bookingPhotos, setBookingPhotos] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [packages, setPackages] = useState([])
  const [isEmergency, setIsEmergency] = useState(false)

  useEffect(() => {
    const loadPackages = async () => {
      if (!provider?.user_id) {
        return
      }
      const { data } = await supabase
        .from('service_packages')
        .select('*')
        .eq('provider_user_id', provider.user_id)
        .order('price', { ascending: true })
      setPackages(data || [])
    }
    loadPackages()
  }, [provider])

  const addBookingPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB.')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setBookingPhotos((current) => [...current, { id: Date.now() + Math.random(), file, preview: objectUrl }])
    event.target.value = ''
  }

  const removeBookingPhoto = (id) => {
    setBookingPhotos((current) => {
      const item = current.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return current.filter((p) => p.id !== id)
    })
  }

  const uploadBookingPhotos = async (bookingId) => {
    for (const photo of bookingPhotos) {
      try {
        const path = await uploadPrivateFile('booking-photos', user?.user_id || 'anon', photo.file)
        await supabase.from('booking_photos').insert({
          booking_id: bookingId,
          uploader_user_id: user?.user_id,
          file_path: path,
        })
      } catch (error) {
        console.error('Failed to upload booking photo:', error)
      }
    }
  }

  const submitRequest = async (event) => {
    event.preventDefault()

    if (
      !description.trim() ||
      !location.trim() ||
      !date
    ) {
      alert(
        'Please fill in all the service request fields.'
      )
      return
    }

    if (!user?.name) {
      alert(
        'Please log in again before requesting a service.'
      )
      return
    }

    setLoading(true)

    try {
      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authenticatedUser?.id) {
        console.error(
          'Failed to load authenticated user for booking:',
          authError || 'No authenticated user found'
        )
        alert(
          'Please log in again before requesting a service.'
        )
        setLoading(false)
        return
      }

      const { data, error } =
        await supabase
          .from('bookings')
          .insert({
            customer_name: user.name,
            customer_user_id: authenticatedUser.id,
            provider_name:
              provider?.business_name || '',
            service_name:
              service?.name ||
              provider?.category ||
              'Service',
            booking_date: date,
            preferred_time: preferredTime || null,
            status: 'Pending',
            notes: description.trim(),
            total_price: selectedPackage ? selectedPackage.price : null,
            service_location:
              location.trim(),
            provider_user_id: provider?.user_id || null,
            emergency: isEmergency,
          })
          .select('*')

      if (error) {
        console.error(
          'Booking submission failed:',
          error
        )

        alert(
          'Could not submit service request: ' +
            error.message
        )

        setLoading(false)
        return
      }

      if (data?.[0]?.id) {
        await uploadBookingPhotos(data[0].id)

        if (provider?.user_id) {
          const { error: notificationError } =
            await supabase.rpc('create_booking_notification', {
              p_booking_id: data[0].id,
              p_event: 'new_booking',
            })

          if (notificationError) {
            console.error(
              'Failed to create provider notification:',
              notificationError
            )
          }
        }
      }

      alert(
        'Service request submitted successfully!'
      )

      setLoading(false)
      onComplete()
    } catch (error) {
      console.error(
        'Unexpected booking error:',
        error
      )

      alert(
        'Something went wrong: ' +
          (error?.message || 'Unknown error')
      )

      setLoading(false)
    }
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back
        </button>

        <Logo />
      </header>

      <main className="form-page">
        <span className="section-label">
          REQUEST SERVICE
        </span>

        <h2>
          Request{' '}
          {provider?.business_name ||
            'this provider'}
        </h2>

        <p>
          Tell the provider what you need.
        </p>

        <form
          className="request-form"
          onSubmit={submitRequest}
        >
          <label>What do you need?</label>

          <textarea
            placeholder="Describe the problem or service you need..."
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />

          <label>Service location</label>

          <input
            type="text"
            placeholder="e.g. Ikeja, Lagos"
            value={location}
            onChange={(event) =>
              setLocation(
                event.target.value
              )
            }
          />

          <label>Preferred date</label>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />

          <label>Preferred time (optional)</label>

          <select
            value={preferredTime}
            onChange={(event) =>
              setPreferredTime(event.target.value)
            }
          >
            <option value="">Select a time</option>
            <option value="09:00">9:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="18:00">6:00 PM</option>
          </select>

          {packages.length > 0 && (
            <>
              <label>Service package (optional)</label>
              <select
                value={selectedPackage?.id || ''}
                onChange={(event) => {
                  const pkg = packages.find((p) => String(p.id) === event.target.value)
                  setSelectedPackage(pkg || null)
                }}
              >
                <option value="">Select a package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — ₦{Number(pkg.price).toLocaleString()}
                  </option>
                ))}
              </select>
            </>
          )}

          <label>Attach photos (optional)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {bookingPhotos.map((photo) => (
              <div key={photo.id} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8e4' }}>
                <img src={photo.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removeBookingPhoto(photo.id)}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', border: 0, borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="dash-btn dash-btn-outline dash-btn-full" style={{ marginBottom: 10 }}>
            Add photo
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={loading} onChange={addBookingPhoto} />
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            🚨 Mark as emergency request
          </label>

          <button
            className="primary-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Submitting...'
              : 'Submit service request'}
          </button>
        </form>
      </main>
    </div>
  )
}

function Bookings({ user, onBack, onChat, onRebook, dbProviders }) {
  const [bookings, setBookings] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    const loadBookings = async () => {
      if (!user?.name) {
        setBookings([])
        setLoading(false)
        return
      }

      const [ownedResult, legacyResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('customer_user_id', user.user_id)
          .order('created_at', {
            ascending: false,
          }),
        supabase
          .from('bookings')
          .select('*')
          .eq('customer_name', user.name)
          .order('created_at', {
            ascending: false,
          }),
      ])

      if (ownedResult.error && legacyResult.error) {
        console.error(
          'Failed to load bookings:',
          ownedResult.error
        )

        setLoading(false)
        return
      }

      const bookingMap = new Map()

      ;[ownedResult.data, legacyResult.data]
        .flatMap((rows) => rows || [])
        .forEach((booking) => {
          bookingMap.set(booking.id, booking)
        })

      setBookings(
        Array.from(bookingMap.values()).sort(
          (firstBooking, secondBooking) =>
            new Date(secondBooking.created_at || 0) -
            new Date(firstBooking.created_at || 0)
        )
      )
      setLoading(false)
    }

    loadBookings()
  }, [user])

  const handleRebook = async (booking) => {
    if (!onRebook) return
    const provider = dbProviders.find((p) => p.business_name === booking.provider_name)
    if (provider) {
      onRebook(provider, booking.service_name)
    } else {
      alert('Provider not found for rebooking.')
    }
  }

  const confirmCompletion = async (booking) => {
    if (!booking?.id) return
    const { error } = await supabase
      .from('bookings')
      .update({ completed_at: new Date().toISOString(), reviewed: false })
      .eq('id', booking.id)
      .eq('customer_user_id', user.user_id)

    if (error) {
      alert('Could not confirm completion: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, completed_at: new Date().toISOString(), reviewed: false } : b))
    }
  }

  const acceptProposedTime = async (booking) => {
    if (!booking?.id) return
    const { error } = await supabase
      .from('bookings')
      .update({ time_accepted: true })
      .eq('id', booking.id)
      .eq('customer_user_id', user.user_id)
    if (error) {
      alert('Could not accept proposed time: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, time_accepted: true } : b))
    }
  }

  const rejectProposedTime = async (booking) => {
    if (!booking?.id) return
    const { error } = await supabase
      .from('bookings')
      .update({ proposed_time: null })
      .eq('id', booking.id)
      .eq('customer_user_id', user.user_id)
    if (error) {
      alert('Could not reject proposed time: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, proposed_time: null } : b))
    }
  }

  const cancelBooking = async (booking) => {
    if (!booking?.id) return
    const status = String(booking.status || '').toLowerCase()
    if (status === 'completed' || status === 'cancelled' || status === 'declined') {
      alert('This booking can no longer be cancelled.')
      return
    }
    const confirmed = window.confirm('Are you sure you want to cancel this booking?')
    if (!confirmed) return
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled', cancel_reason: 'Cancelled by customer' })
      .eq('id', booking.id)
      .eq('customer_user_id', user.user_id)
    if (error) {
      alert('Could not cancel booking: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, status: 'Cancelled' } : b))
      if (booking.provider_user_id) {
        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: booking.provider_user_id,
          p_type: 'booking',
          p_title: 'Booking cancelled',
          p_message: `${booking.customer_name || 'A customer'} cancelled their booking.`,
        })
        if (notificationError) {
          console.error('Failed to create cancellation notification:', notificationError)
        }
      }
    }
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back
        </button>

        <Logo />
      </header>

      <main className="inner-content">
        <span className="section-label">
          YOUR ACTIVITY
        </span>

        <h2>My bookings</h2>

        {loading ? (
          <div className="empty-box large-empty">
            <span>⏳</span>

            <h4>Loading bookings...</h4>

            <p>
              Please wait while we load your
              service requests.
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-box large-empty">
            <span>📅</span>

            <h4>No bookings yet</h4>

            <p>
              Your service requests will appear
              here.
            </p>
          </div>
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <div
                className="booking-card"
                key={booking.id}
              >
                <span
                  className={`booking-status ${String(
                    booking.status || 'Pending'
                  ).toLowerCase()}`}
                >
                  {booking.status || 'Pending'}
                </span>

                <h3>
                  {booking.provider_name ||
                    'Service provider'}
                </h3>

                <p>
                  🛠️{' '}
                  {booking.service_name ||
                    'Service'}
                </p>

                <p>
                  📅 {booking.booking_date}
                </p>

                {booking.preferred_time && (
                  <p>
                    ⏰ Preferred: {booking.preferred_time}
                  </p>
                )}

                {booking.proposed_time && (
                  <p>
                    🔄 Proposed: {booking.proposed_time}
                  </p>
                )}

                {booking.service_location && (
                  <p>
                    📍{' '}
                    {booking.service_location}
                  </p>
                )}

                {booking.notes && (
                  <p>{booking.notes}</p>
                )}

                {booking.total_price !==
                  null &&
                  booking.total_price !==
                    undefined && (
                    <p>
                      💰 ₦
                      {booking.total_price}
                    </p>
                  )}

                {onChat && (
                  <button
                    className="secondary-button"
                    onClick={() => onChat(booking)}
                    style={{ marginTop: 10 }}
                  >
                    Message provider
                  </button>
                )}

                {String(booking.status || '').toLowerCase() !== 'completed' && String(booking.status || '').toLowerCase() !== 'cancelled' && String(booking.status || '').toLowerCase() !== 'declined' && (
                  <button
                    className="dash-btn dash-btn-danger dash-btn-full"
                    onClick={() => cancelBooking(booking)}
                    style={{ marginTop: 8 }}
                  >
                    Cancel booking
                  </button>
                )}

                {onRebook && String(booking.status || '').toLowerCase() === 'completed' && (
                  <button
                    className="dash-btn dash-btn-outline dash-btn-full"
                    onClick={() => handleRebook(booking)}
                    style={{ marginTop: 8 }}
                  >
                    Book again
                  </button>
                )}

                {booking.proposed_time && !booking.time_accepted && String(booking.status || '').toLowerCase() !== 'cancelled' && String(booking.status || '').toLowerCase() !== 'declined' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="dash-btn dash-btn-primary" onClick={() => acceptProposedTime(booking)}>
                      ✓ Accept time
                    </button>
                    <button className="dash-btn dash-btn-danger" onClick={() => rejectProposedTime(booking)}>
                      Reject
                    </button>
                  </div>
                )}

                {String(booking.status || '').toLowerCase() === 'completed' && !booking.reviewed && (
                  <button
                    className="dash-btn dash-btn-primary dash-btn-full"
                    onClick={() => confirmCompletion(booking)}
                    style={{ marginTop: 8 }}
                  >
                    ✅ Confirm job completed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Favorites({ user, onBack, onProvider }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user?.user_id) {
        setFavorites([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('customer_user_id', user.user_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load favorites:', error)
        setFavorites([])
      } else {
        const enriched = await Promise.all((data || []).map(async (fav) => {
          const { data: provider } = await supabase
            .from('providers')
            .select('*')
            .eq('user_id', fav.provider_user_id)
            .maybeSingle()
          return { ...fav, provider }
        }))
        setFavorites(enriched)
      }
      setLoading(false)
    }
    loadFavorites()
  }, [user])

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <Logo />
      </header>
      <main className="inner-content">
        <span className="section-label">SAVED</span>
        <h2>Saved providers</h2>
        {loading ? (
          <div className="empty-box large-empty">
            <span>⏳</span>
            <h4>Loading favorites...</h4>
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-box large-empty">
            <span>❤️</span>
            <h4>No saved providers yet</h4>
            <p>Save providers you like to find them easily later.</p>
          </div>
        ) : (
          <div className="provider-list">
            {favorites.map((fav) => (
              fav.provider ? (
                <button
                  key={fav.id}
                  className="provider-card"
                  onClick={() => onProvider(fav.provider)}
                >
                  <div className="provider-avatar">
                    {fav.provider.business_name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="provider-info">
                    <h4>{fav.provider.business_name}</h4>
                    {fav.provider.verified && <span className="verified">✓ Verified provider</span>}
                    <p>📍 {fav.provider.location || 'Location not provided'}</p>
                    <p>⭐ {fav.provider.rating ?? 'New'} rating</p>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ) : null
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Notifications({ user, onBack }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.user_id) {
        setNotifications([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'Failed to load notifications:',
          error
        )
        setNotifications([])
        setLoading(false)
        return
      }

      setNotifications(data || [])
      setLoading(false)

      const unreadIds = (data || [])
        .filter((n) => !n.is_read)
        .map((n) => n.id)

      if (unreadIds.length === 0) return

      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds)
          .eq('user_id', user.user_id)

        if (updateError) {
          console.error(
            'Failed to mark notifications as read:',
            updateError
          )
          return
        }

        setNotifications((current) =>
          current.map((n) =>
            unreadIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        )
      } catch (err) {
        console.error(
          'Unexpected error marking notifications as read:',
          err
        )
      }
    }

    loadNotifications()
  }, [user])

  const getNotificationIcon = (type) => {
    const icons = {
      accepted: '✅',
      declined: '❌',
      booking: '📅',
      update: '🔔',
    }

    return icons[String(type || '').toLowerCase()] || '🔔'
  }

  return (
    <div className="inner-page">
      <header className="inner-header">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back
        </button>

        <Logo />
      </header>

      <main className="inner-content">
        <span className="section-label">
          UPDATES
        </span>

        <h2>Notifications</h2>

        {loading ? (
          <div className="empty-box large-empty">
            <span>⏳</span>

            <h4>Loading notifications...</h4>

            <p>Please wait.</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-box large-empty">
            <span>🔔</span>

            <h4>No notifications yet</h4>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                className={`notification-card ${
                  notification.is_read ? 'read' : 'unread'
                }`}
                key={notification.id}
              >
                <span>
                  {getNotificationIcon(notification.type)}
                </span>

                <div>
                  <strong>
                    {notification.title || 'Notification'}
                  </strong>

                  <p>
                    {notification.message || ''}
                  </p>

                  <small>
                    {notification.type || 'update'}{' '}
                    {notification.created_at
                      ? new Date(
                          notification.created_at
                        ).toLocaleString()
                      : ''}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Profile({ user, onBack, onLogout }) {
  const [profile, setProfile] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [avatarUrl, setAvatarUrl] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.user_id) {
        setLoading(false)
        return
      }

      const { data, error } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.user_id)
          .maybeSingle()

      if (error) {
        console.error(
          'Failed to load profile:',
          error
        )

        setLoading(false)
        return
      }

      setProfile(data)
      try {
        setAvatarUrl(await getSignedStorageUrl('profile-photos', data?.avatar_url))
      } catch (error) {
        console.error('Failed to load profile photo:', error)
        setAvatarUrl('')
      }
      setLoading(false)
    }

    loadProfile()
  }, [user])

  const updatePhoto = async (file) => {
    if (!file || !user?.user_id) return
    setPhotoLoading(true)
    try {
      const path = await uploadPrivateFile('profile-photos', user.user_id, file)
      const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('user_id', user.user_id)
      if (error) throw error
      setAvatarUrl(await getSignedStorageUrl('profile-photos', path))
      setProfile((current) => ({ ...current, avatar_url: path }))
    } catch (error) {
      console.error('Failed to update profile photo:', error)
      alert('Could not update profile photo: ' + error.message)
    }
    setPhotoLoading(false)
  }

  const removePhoto = async () => {
    setPhotoLoading(true)
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.user_id)
    if (error) {
      console.error('Failed to remove profile photo:', error)
      alert('Could not remove profile photo: ' + error.message)
    } else {
      setAvatarUrl('')
      setProfile((current) => ({ ...current, avatar_url: null }))
    }
    setPhotoLoading(false)
  }

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [customerVerification, setCustomerVerification] = useState(null)
  const [cvDocPreview, setCvDocPreview] = useState('')
  const [cvDocName, setCvDocName] = useState('')
  const [cvDocFile, setCvDocFile] = useState(null)
  const [cvResubmitPreview, setCvResubmitPreview] = useState('')
  const [cvResubmitName, setCvResubmitName] = useState('')
  const [cvResubmitFile, setCvResubmitFile] = useState(null)
  const [cvLoading, setCvLoading] = useState(false)

  const startEditing = () => {
    setEditName(profile?.full_name || '')
    setEditPhone(profile?.phone || '')
    setEditing(true)
  }

  const saveProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      alert('Please fill in all fields.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim(),
      })
      .eq('user_id', user.user_id)

    if (error) {
      console.error('Failed to update profile:', error)
      alert('Could not update profile: ' + error.message)
    } else {
      setProfile((current) => ({
        ...current,
        full_name: editName.trim(),
        phone: editPhone.trim(),
      }))
      alert('Profile updated successfully.')
      setEditing(false)
    }

    setSaving(false)
  }

  useEffect(() => {
    const loadCustomerVerification = async () => {
      if (!user?.user_id) {
        setCustomerVerification(null)
        return
      }

      const { data, error } = await supabase
        .from('customer_verifications')
        .select('*')
        .eq('customer_user_id', user.user_id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Failed to load customer verification:', error)
      } else {
        setCustomerVerification(data || null)
      }
    }

    loadCustomerVerification()
  }, [user])

  const handleCvDocSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPG, PNG, WEBP, or PDF file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be smaller than 5MB.')
      return
    }

    if (cvDocPreview) {
      URL.revokeObjectURL(cvDocPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setCvDocPreview(objectUrl)
    setCvDocName(file.name)
    setCvDocFile(file)
    event.target.value = ''
  }

  const clearCvDoc = () => {
    if (cvDocPreview) {
      URL.revokeObjectURL(cvDocPreview)
    }
    setCvDocPreview('')
    setCvDocName('')
    setCvDocFile(null)
  }

  const handleCvResubmitSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPG, PNG, WEBP, or PDF file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be smaller than 5MB.')
      return
    }

    if (cvResubmitPreview) {
      URL.revokeObjectURL(cvResubmitPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setCvResubmitPreview(objectUrl)
    setCvResubmitName(file.name)
    setCvResubmitFile(file)
    event.target.value = ''
  }

  const clearCvResubmit = () => {
    if (cvResubmitPreview) {
      URL.revokeObjectURL(cvResubmitPreview)
    }
    setCvResubmitPreview('')
    setCvResubmitName('')
    setCvResubmitFile(null)
  }

  const submitCustomerVerification = async (file) => {
    if (!file || !user?.user_id) return
    setCvLoading(true)
    try {
      const path = await uploadPrivateFile('customer-verification-documents', user.user_id, file)
      const { data, error } = await supabase.from('customer_verifications').insert({ customer_user_id: user.user_id, id_document_url: path, status: 'pending' }).select('*').single()
      if (error) throw error
      setCustomerVerification(data)

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminProfiles?.length > 0) {
        const title = 'New customer verification'
        const message = `${user.name || 'A customer'} has submitted an identity verification for review.`

        await Promise.allSettled(
          adminProfiles.map((admin) =>
            supabase.rpc('create_notification', {
              p_user_id: admin.user_id,
              p_type: 'verification',
              p_title: title,
              p_message: message,
            }).catch((notificationError) => {
              console.error('Failed to create customer verification notification for admin:', notificationError)
            })
          )
        )
      }

      setCvDocPreview('')
      setCvDocName('')
      setCvDocFile(null)
      alert('Identity verification submitted successfully.')
    } catch (error) {
      alert('Could not submit verification: ' + error.message)
    }
    setCvLoading(false)
  }

  const resubmitCustomerVerification = async (file) => {
    if (!file || !user?.user_id || !customerVerification?.id) return
    setCvLoading(true)
    try {
      const path = await uploadPrivateFile('customer-verification-documents', user.user_id, file)
      const { data, error } = await supabase.from('customer_verifications').update({ id_document_url: path, status: 'pending', rejection_reason: null, reviewed_at: null, reviewed_by: null, resubmitted_at: new Date().toISOString() }).eq('id', customerVerification.id).eq('customer_user_id', user.user_id).select('*')
      if (error) throw error

      const updatedRow = data?.[0]
      if (!updatedRow || updatedRow.status !== 'pending') {
        throw new Error('Verification update did not apply. Please try again or contact support.')
      }

      setCustomerVerification((current) => current ? { ...current, id_document_url: path, status: 'pending', rejection_reason: null, resubmitted_at: updatedRow.resubmitted_at } : null)

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminProfiles?.length > 0) {
        const title = 'Customer verification resubmitted'
        const message = `${user.name || 'A customer'} has resubmitted their identity verification.`

        await Promise.allSettled(
          adminProfiles.map((admin) =>
            supabase.rpc('create_notification', {
              p_user_id: admin.user_id,
              p_type: 'verification',
              p_title: title,
              p_message: message,
            }).catch((notificationError) => {
              console.error('Failed to create customer verification resubmission notification for admin:', notificationError)
            })
          )
        )
      }

      setCvResubmitPreview('')
      setCvResubmitName('')
      setCvResubmitFile(null)
      alert('Identity verification resubmitted successfully.')
    } catch (error) {
      alert('Could not resubmit verification: ' + error.message)
    }
    setCvLoading(false)
  }

  const displayName =
    profile?.full_name ||
    user?.full_name ||
    user?.name ||
    'NaijaFix Customer'

  const displayEmail =
    profile?.email ||
    user?.email ||
    'Not provided'

  const displayPhone =
    profile?.phone ||
    user?.phone ||
    'Not provided'

  const displayRole =
    profile?.role ||
    user?.role ||
    'customer'

  return (
    <div className="dash-shell-main" style={{ minHeight: '100vh', background: 'var(--nf-bg)' }}>
      <div className="dash-topbar">
        <div className="dash-topbar-left">
          <button className="dash-back-link" onClick={onBack}>← Back</button>
          <h2 className="dash-topbar-name" style={{ marginTop: 8 }}>My Profile</h2>
        </div>
      </div>

      <main className="dash-shell-content">
        <DashboardCard>
          <div className="dash-profile-header">
            <div className="dash-profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : displayName.charAt(0).toUpperCase()}
            </div>
            <div className="dash-profile-info">
              <h3>{displayName}</h3>
              <p>{displayEmail}</p>
              <p>📞 {displayPhone}</p>
              <p style={{ textTransform: 'capitalize' }}>{displayRole} account</p>
            </div>
          </div>
        </DashboardCard>

        {loading ? (
          <LoadingState text="Loading profile..." />
        ) : editing ? (
          <DashboardCard>
            <div className="dash-form-group">
              <label className="dash-form-label">Full name</label>
              <input className="dash-form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Phone</label>
              <input className="dash-form-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Email</label>
              <strong style={{ fontSize: 14 }}>{displayEmail}</strong>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Role</label>
              <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>{displayRole}</strong>
            </div>
            <div className="dash-btn-group">
              <button className="dash-btn dash-btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="dash-btn dash-btn-outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </DashboardCard>
        ) : (
          <DashboardCard>
            <div className="dash-profile-field">
              <span className="dash-profile-field-label">Full name</span>
              <span className="dash-profile-field-value">{displayName}</span>
            </div>
            <div className="dash-profile-field">
              <span className="dash-profile-field-label">Email</span>
              <span className="dash-profile-field-value">{displayEmail}</span>
            </div>
            <div className="dash-profile-field">
              <span className="dash-profile-field-label">Phone</span>
              <span className="dash-profile-field-value">{displayPhone}</span>
            </div>
            <div className="dash-profile-field">
              <span className="dash-profile-field-label">Role</span>
              <span className="dash-profile-field-value" style={{ textTransform: 'capitalize' }}>{displayRole}</span>
            </div>
            <button className="dash-btn dash-btn-outline dash-btn-full" onClick={startEditing}>
              Edit profile
            </button>
          </DashboardCard>
        )}

        <DashboardCard>
          <div className="dash-btn-group" style={{ flexDirection: 'column' }}>
            <label className="dash-btn dash-btn-outline dash-btn-full" style={{ margin: 0 }}>
              {photoLoading ? 'Uploading...' : 'Upload photo'}
              <input type="file" accept="image/*" hidden disabled={photoLoading} onChange={(event) => updatePhoto(event.target.files?.[0])} />
            </label>
            {avatarUrl && (
              <button type="button" className="dash-btn dash-btn-danger dash-btn-full" onClick={removePhoto} disabled={photoLoading}>
                Remove photo
              </button>
            )}
          </div>
        </DashboardCard>

        <SectionHeader label="ID VERIFICATION" title="Identity verification" />
        <VerificationCard verification={customerVerification} type="customer">
          {customerVerification?.status === 'rejected' && (
            <div style={{ marginTop: 12 }}>
              <label className="dash-btn dash-btn-primary dash-btn-full">
                Resubmit Verification
                <input type="file" accept="image/*,.pdf" hidden disabled={cvLoading} onChange={handleCvResubmitSelect} />
              </label>
              {cvResubmitPreview && (
                <DocPreview url={cvResubmitPreview} name={cvResubmitName} onClear={clearCvResubmit} />
              )}
              {cvResubmitFile && (
                <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => resubmitCustomerVerification(cvResubmitFile)} disabled={cvLoading}>
                  {cvLoading ? 'Submitting...' : 'Submit new verification'}
                </button>
              )}
            </div>
          )}
          {!customerVerification && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--nf-text-muted)', marginBottom: 10 }}>Verify your identity to build trust and confidence on NaijaFix.</p>
              <label className="dash-btn dash-btn-outline dash-btn-full">
                Verify identity
                <input type="file" accept="image/*,.pdf" hidden disabled={cvLoading} onChange={handleCvDocSelect} />
              </label>
            </div>
          )}
          {cvDocPreview && customerVerification?.status !== 'rejected' && (
            <div style={{ marginTop: 12 }}>
              <DocPreview url={cvDocPreview} name={cvDocName} onClear={clearCvDoc} />
              <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => submitCustomerVerification(cvDocFile)} disabled={cvLoading}>
                {cvLoading ? 'Submitting...' : 'Submit verification'}
              </button>
            </div>
          )}
          {customerVerification?.id_document_url && !cvDocPreview && customerVerification?.status !== 'rejected' && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--nf-green)' }}>✓ Document submitted</p>
          )}
        </VerificationCard>

        <SectionHeader label="SUPPORT" title="Help and support" />
        <DashboardCard>
          <ReportForm user={user} />
        </DashboardCard>

        <button className="dash-btn dash-btn-danger dash-btn-full" onClick={onLogout}>
          Log out
        </button>
      </main>
    </div>
  )
}

function ReviewResponse({ reviewId, onRespond }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setSending(true)
    await onRespond(reviewId, text)
    setText('')
    setSending(false)
  }

  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
      <input
        className="dash-form-input"
        placeholder="Write a response..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="button" className="dash-btn dash-btn-primary dash-btn-sm" onClick={submit} disabled={sending}>
        {sending ? '...' : 'Reply'}
      </button>
    </div>
  )
}

function ReviewForm({ providerUserId, user, onReviewSubmitted }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReview = async () => {
    if (rating === 0) {
      alert('Please select a rating.')
      return
    }
    setSubmitting(true)
    try {
      const { data: completedBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_user_id', user.user_id)
        .eq('provider_user_id', providerUserId)
        .eq('status', 'Completed')
        .limit(1)
        .maybeSingle()

      if (!completedBooking) {
        alert('You can only review providers after a completed booking.')
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('reviews').insert({
        booking_id: completedBooking.id,
        customer_user_id: user.user_id,
        provider_user_id: providerUserId,
        rating,
        comment: comment.trim() || null,
      })

      if (error) {
        if (error.code === '23505') {
          alert('You have already reviewed this provider for this booking.')
        } else {
          alert('Could not submit review: ' + error.message)
        }
      } else {
        alert('Review submitted successfully!')
        setRating(0)
        setComment('')
        onReviewSubmitted?.()

        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: providerUserId,
          p_type: 'review',
          p_title: 'New review',
          p_message: `${user.name || 'A customer'} left you a ${rating}-star review.`,
        })

        if (notificationError) {
          console.error('Failed to create review notification:', notificationError)
        }
      }
    } catch (error) {
      alert('Could not submit review: ' + error.message)
    }
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: star <= (hoverRating || rating) ? '#fbbf24' : '#d1d5db',
            }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="dash-form-textarea"
        placeholder="Write your review..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="button" className="dash-btn dash-btn-primary dash-btn-full" onClick={submitReview} disabled={submitting || rating === 0}>
        {submitting ? 'Submitting...' : 'Submit review'}
      </button>
    </div>
  )
}

function ProviderDashboard({
  user,
  onHome,
  onNotifications,
  onConversations,
  onBookings,
  onProfile,
  onLogout,
}) {
  const [bookings, setBookings] = useState([])
  const [providerProfile, setProviderProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingBookingId, setUpdatingBookingId] = useState(null)
  const [samples, setSamples] = useState([])
  const [verification, setVerification] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [featureLoading, setFeatureLoading] = useState(false)
  const [sampleCaption, setSampleCaption] = useState('')
  const [editingProvider, setEditingProvider] = useState(false)
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingProvider, setSavingProvider] = useState(false)
  const [verificationDocPreview, setVerificationDocPreview] = useState('')
  const [verificationDocName, setVerificationDocName] = useState('')
  const [verificationDocFile, setVerificationDocFile] = useState(null)
  const [resubmitDocPreview, setResubmitDocPreview] = useState('')
  const [resubmitDocName, setResubmitDocName] = useState('')
  const [resubmitDocFile, setResubmitDocFile] = useState(null)
  const [supportReports, setSupportReports] = useState([])
  const [availability, setAvailability] = useState([])
  const [packages, setPackages] = useState([])
  const [editingPackageId, setEditingPackageId] = useState(null)
  const [editPackageName, setEditPackageName] = useState('')
  const [editPackageDescription, setEditPackageDescription] = useState('')
  const [editPackagePrice, setEditPackagePrice] = useState('')
  const [editPackageDuration, setEditPackageDuration] = useState('')
  const [quotes, setQuotes] = useState([])
  const [providerReviews, setProviderReviews] = useState([])
  const [newPackageName, setNewPackageName] = useState('')
  const [newPackageDescription, setNewPackageDescription] = useState('')
  const [newPackagePrice, setNewPackagePrice] = useState('')
  const [newPackageDuration, setNewPackageDuration] = useState('')
  const [newQuoteAmount, setNewQuoteAmount] = useState('')
  const [newQuoteDescription, setNewQuoteDescription] = useState('')
  const [newQuoteBookingId, setNewQuoteBookingId] = useState('')
  const [proposedTimes, setProposedTimes] = useState({})

  useEffect(() => {
    return () => {
      if (verificationDocPreview) {
        URL.revokeObjectURL(verificationDocPreview)
      }
      if (resubmitDocPreview) {
        URL.revokeObjectURL(resubmitDocPreview)
      }
    }
  }, [verificationDocPreview, resubmitDocPreview])

  const startEditingProvider = () => {
    if (!providerProfile) return
    setEditBusinessName(providerProfile.business_name || '')
    setEditDescription(providerProfile.description || '')
    setEditCategory(providerProfile.category || '')
    setEditLocation(providerProfile.location || '')
    setEditPhone(providerProfile.phone || '')
    setEditingProvider(true)
  }

  const saveProviderProfile = async () => {
    if (!providerProfile) return
    setSavingProvider(true)

    const updates = {
      business_name: editBusinessName.trim(),
      description: editDescription.trim(),
      category: editCategory.trim(),
      location: editLocation.trim(),
      phone: editPhone.trim(),
      emergency_available: providerProfile?.emergency_available ?? false,
    }

    const { error } = await supabase
      .from('providers')
      .update(updates)
      .eq('user_id', user.user_id)

    if (error) {
      console.error('Failed to update provider profile:', error)
      alert('Could not update provider profile: ' + error.message)
    } else {
      setProviderProfile((current) => ({ ...current, ...updates }))
      alert('Provider profile updated successfully.')
      setEditingProvider(false)
    }

    setSavingProvider(false)
  }

  const updateBookingStatus = async (bookingId, newStatus, reason) => {
    if (updatingBookingId !== null) {
      return
    }

    setUpdatingBookingId(bookingId)

    const updates = { status: newStatus }
    if (reason) {
      updates.decline_reason = reason
    }

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)

    if (error) {
      console.error(
        'Failed to update booking status:',
        error
      )
      alert(
        'Could not update booking status: ' +
          error.message
      )
    } else {
      const booking = bookings.find(
        (currentBooking) =>
          currentBooking.id === bookingId
      )

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: newStatus, decline_reason: reason || booking.decline_reason }
            : booking
        )
      )

      if (booking?.customer_user_id) {
        const { error: notificationError } =
          await supabase.rpc('create_booking_notification', {
            p_booking_id: booking.id,
            p_event: newStatus.toLowerCase(),
          })

        if (notificationError) {
          console.error(
            'Failed to create customer notification:',
            notificationError
          )
        }

        if (newStatus.toLowerCase() === 'completed') {
          const { error: completionError } =
            await supabase.rpc('create_notification', {
              p_user_id: booking.customer_user_id,
              p_type: 'booking',
              p_title: 'Job completed',
              p_message: 'The provider marked this job as completed. Please confirm completion.',
            })

          if (completionError) {
            console.error(
              'Failed to create completion notification:',
              completionError
            )
          }
        }

        if (newStatus.toLowerCase() === 'declined' && reason) {
          const { error: declineError } =
            await supabase.rpc('create_notification', {
              p_user_id: booking.customer_user_id,
              p_type: 'booking',
              p_title: 'Booking declined',
              p_message: `Your booking was declined. Reason: ${reason}`,
            })

          if (declineError) {
            console.error(
              'Failed to create decline notification:',
              declineError
            )
          }
        }
      }
    }

    setUpdatingBookingId(null)
  }

  const acceptScheduledTime = async (booking) => {
    if (!booking?.id) return
    setUpdatingBookingId(booking.id)
    const { error } = await supabase
      .from('bookings')
      .update({ time_accepted: true })
      .eq('id', booking.id)
    if (error) {
      alert('Could not accept time: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, time_accepted: true } : b))
    }
    setUpdatingBookingId(null)
  }

  const proposeAlternativeTime = async (booking) => {
    if (!booking?.id) return
    const proposed = proposedTimes[booking.id]?.trim()
    if (!proposed) {
      alert('Please enter a proposed time.')
      return
    }
    setUpdatingBookingId(booking.id)
    const { error } = await supabase
      .from('bookings')
      .update({ proposed_time: proposed })
      .eq('id', booking.id)
    if (error) {
      alert('Could not propose time: ' + error.message)
    } else {
      setBookings((current) => current.map((b) => b.id === booking.id ? { ...b, proposed_time: proposed } : b))
      setProposedTimes((current) => { const next = { ...current }; delete next[booking.id]; return next })
    }
    setUpdatingBookingId(null)
  }

  useEffect(() => {
    const loadProviderBookings = async () => {
      console.log('[loadProviderBookings] user.user_id =', user?.user_id)
      if (!user?.user_id) {
        console.log('PROVIDER PROFILE NULL - BRANCH: no user.user_id')
        setProviderProfile(null)
        setBookings([])
        setLoading(false)
        return
      }

      setLoading(true)

      const {
        data: existingProvider,
        error: existingProviderError,
      } = await supabase
        .from('providers')
        .select('user_id')
        .eq('user_id', user.user_id)
        .maybeSingle()

      console.log('[loadProviderBookings] existingProvider =', existingProvider)
      console.log('[loadProviderBookings] existingProviderError =', existingProviderError)
      if (existingProviderError) {
        console.error(
          'Failed to check existing provider profile:',
          existingProviderError
        )
        console.log('PROVIDER PROFILE NULL - BRANCH: existingProviderError')
        setProviderProfile(null)
        setBookings([])
        setLoading(false)
        return
      }

      if (!existingProvider) {
        const { error: createProviderError } =
          await supabase
            .from('providers')
            .upsert(
              {
                user_id: user.user_id,
                business_name: user.name || 'My Business',
                category: 'General',
                location: 'Nigeria',
                phone: user.phone || '',
                description: '',
                verified: false,
                rating: null,
                avatar_url: null,
                emergency_available: false,
              },
              { onConflict: 'user_id', ignoreDuplicates: true }
            )

        console.log('[loadProviderBookings] createProviderError =', createProviderError)
        if (createProviderError) {
          console.error(
            'Failed to create provider profile:',
            createProviderError
          )
          console.log('PROVIDER PROFILE NULL - BRANCH: createProviderError')
          setProviderProfile(null)
          setBookings([])
          setLoading(false)
          return
        }
      }

      const {
        data: provider,
        error: providerError,
      } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle()

      console.log('[loadProviderBookings] provider =', provider)
      console.log('[loadProviderBookings] providerError =', providerError)
      if (providerError) {
        console.error(
          'Failed to load provider profile:',
          providerError
        )
        console.log('PROVIDER PROFILE NULL - BRANCH: providerError')
        setProviderProfile(null)
        setBookings([])
        setLoading(false)
        return
      }

      console.log('[loadProviderBookings] provider =', provider)
      if (!provider) {
        console.log('PROVIDER PROFILE NULL - BRANCH: no provider row')
        setProviderProfile(null)
        setBookings([])
        setLoading(false)
        return
      }

      console.log('PROVIDER PROFILE LOADED')
      setProviderProfile(provider)
      try {
        setPhotoUrl(await getSignedStorageUrl('profile-photos', provider.avatar_url))
      } catch (error) {
        console.error('Failed to load provider photo:', error)
        setPhotoUrl('')
      }

      const [samplesResult, verificationResult] = await Promise.all([
        supabase.from('provider_work_samples').select('*').eq('provider_user_id', user.user_id).order('created_at', { ascending: false }),
        supabase.from('provider_verifications').select('*').eq('provider_user_id', user.user_id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const signedSamples = []
      for (const sample of (samplesResult.data || [])) {
        try {
          const signedUrl = await getSignedStorageUrl('provider-work-samples', sample.image_url)
          signedSamples.push({ ...sample, signedUrl })
        } catch (error) {
          console.error('Failed to load work sample:', error)
          signedSamples.push({ ...sample, signedUrl: '' })
        }
      }
      setSamples(signedSamples)
      setVerification(verificationResult.data || null)

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_user_id', user.user_id)
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'Failed to load provider bookings:',
          error
        )
        setBookings([])
      } else {
        setBookings(data || [])
      }

      const { data: reportsData, error: reportsError } = await supabase
        .from('support_reports')
        .select('*')
        .eq('reporter_user_id', user.user_id)
        .order('created_at', { ascending: false })

      if (reportsError) {
        console.error('Failed to load support reports:', reportsError)
      } else {
        setSupportReports(reportsData || [])
      }

      const { count: unreadCount, error: unreadError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('is_read', false)

      if (unreadError) {
        console.error('Failed to load provider unread notifications:', unreadError)
      } else {
        setUnreadNotifications(unreadCount || 0)
      }

      const [availabilityResult, packagesResult, quotesResult, reviewsResult] = await Promise.all([
        supabase.from('provider_availability').select('*').eq('provider_user_id', user.user_id),
        supabase.from('service_packages').select('*').eq('provider_user_id', user.user_id).order('price', { ascending: true }),
        supabase.from('quotes').select('*').eq('provider_user_id', user.user_id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').eq('provider_user_id', user.user_id).order('created_at', { ascending: false }).limit(20),
      ])

      if (!availabilityResult.error) setAvailability(availabilityResult.data || [])
      if (!packagesResult.error) setPackages(packagesResult.data || [])
      if (!quotesResult.error) setQuotes(quotesResult.data || [])
      if (!reviewsResult.error) setProviderReviews(reviewsResult.data || [])

      setLoading(false)
    }

    loadProviderBookings()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProviderBookings()
      }
    }
    const handleFocus = () => {
      loadProviderBookings()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const uploadProviderPhoto = async (file) => {
    if (!file || !user?.user_id || !providerProfile) return
    setFeatureLoading(true)
    try {
      const path = await uploadPrivateFile('profile-photos', user.user_id, file)
      const { error } = await supabase.from('providers').update({ avatar_url: path }).eq('user_id', user.user_id)
      if (error) throw error
      setPhotoUrl(await getSignedStorageUrl('profile-photos', path))
      setProviderProfile((current) => ({ ...current, avatar_url: path }))
    } catch (error) { alert('Could not update provider photo: ' + error.message) }
    setFeatureLoading(false)
  }

  const uploadSample = async (file, caption) => {
    if (!file || !user?.user_id) return
    setFeatureLoading(true)
    try {
      const path = await uploadPrivateFile('provider-work-samples', user.user_id, file)
      const { data, error } = await supabase.from('provider_work_samples').insert({ provider_user_id: user.user_id, image_url: path, caption: caption || null }).select('*').single()
      if (error) throw error
      const signedUrl = await getSignedStorageUrl('provider-work-samples', path)
      setSamples((current) => [{ ...data, signedUrl }, ...current])
      setSampleCaption('')
    } catch (error) { alert('Could not upload work sample: ' + error.message) }
    setFeatureLoading(false)
  }

  const submitVerification = async (file) => {
    if (!file || !user?.user_id) return
    setFeatureLoading(true)
    try {
      const path = await uploadPrivateFile('provider-verification-documents', user.user_id, file)
      const { data, error } = await supabase.from('provider_verifications').insert({ provider_user_id: user.user_id, id_document_url: path, status: 'pending' }).select('*').single()
      if (error) throw error
      setVerification(data)

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminProfiles?.length > 0) {
        const title = 'New verification submitted'
        const message = `${user.name || 'A provider'} has submitted a verification document for review.`

        await Promise.allSettled(
          adminProfiles.map((admin) =>
            supabase.rpc('create_notification', {
              p_user_id: admin.user_id,
              p_type: 'verification',
              p_title: title,
              p_message: message,
            }).catch((notificationError) => {
              console.error('Failed to create verification notification for admin:', notificationError)
            })
          )
        )
      }

      setVerificationDocPreview('')
      setVerificationDocName('')
      setVerificationDocFile(null)
    } catch (error) { alert('Could not submit verification: ' + error.message) }
    setFeatureLoading(false)
  }

  const resubmitVerification = async (file) => {
    if (!file || !user?.user_id || !verification?.id) return
    setFeatureLoading(true)
    try {
      const path = await uploadPrivateFile('provider-verification-documents', user.user_id, file)
      const { data, error } = await supabase.from('provider_verifications').update({ id_document_url: path, status: 'pending', rejection_reason: null, reviewed_at: null, reviewed_by: null, resubmitted_at: new Date().toISOString() }).eq('id', verification.id).eq('provider_user_id', user.user_id).select('*')
      if (error) throw error

      const updatedRow = data?.[0]
      if (!updatedRow || updatedRow.status !== 'pending') {
        throw new Error('Verification update did not apply. Please try again or contact support.')
      }

      setVerification((current) => current ? { ...current, id_document_url: path, status: 'pending', rejection_reason: null, resubmitted_at: updatedRow.resubmitted_at } : null)

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminProfiles?.length > 0) {
        const title = 'Verification resubmitted'
        const message = `${user.name || 'A provider'} has resubmitted their verification document and it is ready for review.`

        await Promise.allSettled(
          adminProfiles.map((admin) =>
            supabase.rpc('create_notification', {
              p_user_id: admin.user_id,
              p_type: 'verification',
              p_title: title,
              p_message: message,
            }).catch((notificationError) => {
              console.error('Failed to create verification resubmission notification for admin:', notificationError)
            })
          )
        )
      }

      setResubmitDocPreview('')
      setResubmitDocName('')
      setResubmitDocFile(null)
      alert('Verification resubmitted successfully. Your document is now pending review.')
    } catch (error) { alert('Could not resubmit verification: ' + error.message) }
    setFeatureLoading(false)
  }

  const handleResubmitDocSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (resubmitDocPreview) {
      URL.revokeObjectURL(resubmitDocPreview)
    }
    const objectUrl = URL.createObjectURL(file)
    setResubmitDocPreview(objectUrl)
    setResubmitDocName(file.name)
    setResubmitDocFile(file)
  }

  const clearResubmitDoc = () => {
    if (resubmitDocPreview) {
      URL.revokeObjectURL(resubmitDocPreview)
    }
    setResubmitDocPreview('')
    setResubmitDocName('')
    setResubmitDocFile(null)
  }

  const handleVerificationDocSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (verificationDocPreview) {
      URL.revokeObjectURL(verificationDocPreview)
    }
    const objectUrl = URL.createObjectURL(file)
    setVerificationDocPreview(objectUrl)
    setVerificationDocName(file.name)
    setVerificationDocFile(file)
  }

  const clearVerificationDoc = () => {
    if (verificationDocPreview) {
      URL.revokeObjectURL(verificationDocPreview)
    }
    setVerificationDocPreview('')
    setVerificationDocName('')
    setVerificationDocFile(null)
  }

  const saveAvailability = async () => {
    if (!user?.user_id) return
    setFeatureLoading(true)
    try {
      const rows = []
      for (let day = 0; day < 7; day++) {
        const existing = availability.find((a) => a.day_of_week === day)
        rows.push({
          provider_user_id: user.user_id,
          day_of_week: day,
          start_time: existing?.start_time || '09:00:00',
          end_time: existing?.end_time || '17:00:00',
          is_available: existing ? existing.is_available : true,
        })
      }
      const { error } = await supabase.from('provider_availability').upsert(rows, { onConflict: ['provider_user_id', 'day_of_week'] })
      if (error) throw error
      const { data } = await supabase.from('provider_availability').select('*').eq('provider_user_id', user.user_id)
      setAvailability(data || [])
      alert('Availability saved.')
    } catch (error) {
      alert('Could not save availability: ' + error.message)
    }
    setFeatureLoading(false)
  }

  const toggleDayAvailability = (day) => {
    setAvailability((current) => current.map((a) => a.day_of_week === day ? { ...a, is_available: !a.is_available } : a))
  }

  const addPackage = async () => {
    if (!newPackageName.trim() || !newPackagePrice) {
      alert('Please enter package name and price.')
      return
    }
    setFeatureLoading(true)
    const { data, error } = await supabase.from('service_packages').insert({
      provider_user_id: user.user_id,
      name: newPackageName.trim(),
      description: newPackageDescription.trim() || null,
      price: Number(newPackagePrice),
      estimated_duration: newPackageDuration.trim() || null,
    }).select('*').single()
    if (error) {
      alert('Could not add package: ' + error.message)
    } else {
      setPackages((current) => [...current, data])
      setNewPackageName('')
      setNewPackageDescription('')
      setNewPackagePrice('')
      setNewPackageDuration('')
    }
    setFeatureLoading(false)
  }

  const deletePackage = async (id) => {
    setFeatureLoading(true)
    const { error } = await supabase.from('service_packages').delete().eq('id', id)
    if (error) {
      alert('Could not delete package: ' + error.message)
    } else {
      setPackages((current) => current.filter((p) => p.id !== id))
    }
    setFeatureLoading(false)
  }

  const startEditingPackage = (pkg) => {
    setEditingPackageId(pkg.id)
    setEditPackageName(pkg.name || '')
    setEditPackageDescription(pkg.description || '')
    setEditPackagePrice(pkg.price != null ? String(pkg.price) : '')
    setEditPackageDuration(pkg.estimated_duration || '')
  }

  const cancelEditingPackage = () => {
    setEditingPackageId(null)
    setEditPackageName('')
    setEditPackageDescription('')
    setEditPackagePrice('')
    setEditPackageDuration('')
  }

  const updatePackage = async (id) => {
    if (!editPackageName.trim() || !editPackagePrice) {
      alert('Please enter package name and price.')
      return
    }
    setFeatureLoading(true)
    const { data, error } = await supabase.from('service_packages').update({
      name: editPackageName.trim(),
      description: editPackageDescription.trim() || null,
      price: Number(editPackagePrice),
      estimated_duration: editPackageDuration.trim() || null,
    }).eq('id', id).select('*').single()
    if (error) {
      alert('Could not update package: ' + error.message)
    } else {
      setPackages((current) => current.map((p) => p.id === id ? data : p))
      cancelEditingPackage()
    }
    setFeatureLoading(false)
  }

  const sendQuote = async () => {
    if (!newQuoteBookingId || !newQuoteAmount || !newQuoteDescription.trim()) {
      alert('Please fill in all quote fields.')
      return
    }
    setFeatureLoading(true)
    const { data, error } = await supabase.from('quotes').insert({
      booking_id: Number(newQuoteBookingId),
      provider_user_id: user.user_id,
      amount: Number(newQuoteAmount),
      description: newQuoteDescription.trim(),
      status: 'pending',
    }).select('*').single()
    if (error) {
      alert('Could not send quote: ' + error.message)
    } else {
      setQuotes((current) => [data, ...current])
      setNewQuoteBookingId('')
      setNewQuoteAmount('')
      setNewQuoteDescription('')

      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_user_id')
        .eq('id', Number(newQuoteBookingId))
        .maybeSingle()

      if (booking?.customer_user_id) {
        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: booking.customer_user_id,
          p_type: 'quote',
          p_title: 'New quote received',
          p_message: `You received a new quote of ₦${Number(newQuoteAmount).toLocaleString()} for your booking.`,
        })

        if (notificationError) {
          console.error('Failed to create quote notification:', notificationError)
        }
      }
    }
    setFeatureLoading(false)
  }

  const updateQuoteStatus = async (quoteId, status) => {
    setFeatureLoading(true)
    const { error } = await supabase.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', quoteId)
    if (error) {
      alert('Could not update quote: ' + error.message)
    } else {
      setQuotes((current) => current.map((q) => q.id === quoteId ? { ...q, status } : q))

      const quote = quotes.find((q) => q.id === quoteId)
      if (quote?.provider_user_id) {
        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: quote.provider_user_id,
          p_type: 'quote',
          p_title: status === 'accepted' ? 'Quote accepted' : 'Quote declined',
          p_message: `Your quote for booking #${quote.booking_id} was ${status}.`,
        })

        if (notificationError) {
          console.error('Failed to create quote status notification:', notificationError)
        }
      }
    }
    setFeatureLoading(false)
  }

  const respondToReview = async (reviewId, response) => {
    if (!response.trim()) return
    setFeatureLoading(true)
    const { error } = await supabase.from('reviews').update({ provider_response: response.trim(), responded_at: new Date().toISOString() }).eq('id', reviewId)
    if (error) {
      alert('Could not respond to review: ' + error.message)
    } else {
      setProviderReviews((current) => current.map((r) => r.id === reviewId ? { ...r, provider_response: response.trim(), responded_at: new Date().toISOString() } : r))
    }
    setFeatureLoading(false)
  }

  const pendingBookings = bookings.filter(b => String(b.status || 'Pending').toLowerCase() === 'pending')
  const acceptedBookings = bookings.filter(b => String(b.status || '').toLowerCase() === 'accepted')
  const declinedBookings = bookings.filter(b => String(b.status || '').toLowerCase() === 'declined')

  return (
    <div className="dash-shell-main" style={{ minHeight: '100vh', background: 'var(--nf-bg)' }}>
      <TopBar
        greeting="NAIJAFIX PROVIDER"
        name={`Welcome back, ${user?.name?.split(' ')[0] || 'provider'}`}
        subtitle={providerProfile?.business_name || 'Review your service requests'}
        avatarUrl={photoUrl}
        onNotification={onNotifications}
        notificationCount={unreadNotifications}
        actions={
          <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={onConversations}>
            💬 Messages
          </button>
        }
      />

      <main className="dash-shell-content" style={{ paddingBottom: 100 }}>
        <DashboardCard>
          <div className="dash-profile-header">
            <div className="dash-profile-avatar">
              {photoUrl ? <img src={photoUrl} alt="Business" /> : providerProfile?.business_name?.charAt(0) || 'P'}
            </div>
            <div className="dash-profile-info">
              <h3>{providerProfile?.business_name || user?.name || 'Provider'}</h3>
              <p>{user?.email || ''}</p>
              {providerProfile?.phone && <p>📞 {providerProfile.phone}</p>}
              {providerProfile?.category && <p>🏷️ {providerProfile.category}</p>}
              {providerProfile?.location && <p>📍 {providerProfile.location}</p>}
              <StatusBadge status={verification?.status || 'unverified'} />
            </div>
          </div>
          <div className="dash-btn-group">
            <button className="dash-btn dash-btn-outline dash-btn-full" onClick={startEditingProvider}>
              Edit Profile
            </button>
          </div>
        </DashboardCard>

        <StatGrid>
          <StatCard icon="⏳" value={pendingBookings.length} label="Pending" color="yellow" />
          <StatCard icon="✅" value={acceptedBookings.length} label="Accepted" color="green" />
          <StatCard icon="❌" value={declinedBookings.length} label="Declined" color="red" />
          <StatCard icon="📋" value={supportReports.length} label="Reports" color="blue" />
        </StatGrid>

        <SectionHeader label="OVERVIEW" title="Service requests" />
        {!loading && !providerProfile ? (
          <EmptyState icon="⚠️" title="No provider profile linked to this account" />
        ) : loading ? (
          <LoadingState text="Loading service requests..." />
        ) : bookings.length === 0 ? (
          <EmptyState icon="📅" title="No service requests yet" />
        ) : (
          bookings.map((booking) => {
            const status = String(booking.status || 'Pending').toLowerCase()
            const isPending = status === 'pending'
            const isAccepted = status === 'accepted'
            const isOnTheWay = status === 'provider_on_the_way'
            const isInProgress = status === 'in_progress'
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAccept={isPending ? () => updateBookingStatus(booking.id, 'Accepted') : null}
                onDecline={isPending ? () => {
                  const reason = window.prompt('Please provide a reason for declining this booking:')
                  if (reason === null) return
                  updateBookingStatus(booking.id, 'Declined', reason.trim() || 'No reason provided')
                } : null}
                onProviderOnTheWay={isAccepted ? () => updateBookingStatus(booking.id, 'Provider on the way') : null}
                onMarkInProgress={isOnTheWay || isAccepted ? () => updateBookingStatus(booking.id, 'In progress') : null}
                onMarkCompleted={isInProgress || isOnTheWay || isAccepted ? () => updateBookingStatus(booking.id, 'Completed') : null}
                onAcceptTime={isAccepted && booking.preferred_time && !booking.time_accepted ? () => acceptScheduledTime(booking) : null}
                onProposeTime={isAccepted && booking.preferred_time && !booking.time_accepted ? (time) => proposeAlternativeTime({ ...booking, proposed_time: time }) : null}
                proposedTime={proposedTimes[booking.id]}
                onProposedTimeChange={(value) => setProposedTimes((current) => ({ ...current, [booking.id]: value }))}
              />
            )
          })
        )}

        <SectionHeader label="BUSINESS PROFILE" title="Your business profile" />
        <DashboardCard>
          {editingProvider ? (
            <div>
              <div className="dash-profile-header">
                <div className="dash-profile-avatar">
                  {photoUrl ? <img src={photoUrl} alt="Business" /> : providerProfile?.business_name?.charAt(0) || 'P'}
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Business name</label>
                <input className="dash-form-input" value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Description</label>
                <input className="dash-form-input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Category</label>
                <input className="dash-form-input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Location</label>
                <input className="dash-form-input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Phone</label>
                <input className="dash-form-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Emergency services available</label>
                <select className="dash-form-input" value={providerProfile?.emergency_available ? 'yes' : 'no'} onChange={(e) => {
                  const val = e.target.value === 'yes'
                  setProviderProfile((current) => ({ ...current, emergency_available: val }))
                }}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="dash-btn-group">
                <button className="dash-btn dash-btn-primary" onClick={saveProviderProfile} disabled={savingProvider}>
                  {savingProvider ? 'Saving...' : 'Save'}
                </button>
                <button className="dash-btn dash-btn-outline" onClick={() => setEditingProvider(false)} disabled={savingProvider}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="dash-profile-header">
                <div className="dash-profile-avatar">
                  {photoUrl ? <img src={photoUrl} alt="Business" /> : providerProfile?.business_name?.charAt(0) || 'P'}
                </div>
                <div className="dash-profile-info">
                  <h3>{providerProfile?.business_name || 'Provider profile'}</h3>
                  {providerProfile?.description && <p>{providerProfile.description}</p>}
                  {providerProfile?.category && <p>🛠️ {providerProfile.category}</p>}
                  {providerProfile?.location && <p>📍 {providerProfile.location}</p>}
                  {providerProfile?.phone && <p>📞 {providerProfile.phone}</p>}
                </div>
              </div>
              <button className="dash-btn dash-btn-outline dash-btn-full" onClick={startEditingProvider}>
                Edit profile
              </button>
            </div>
          )}
          <label className="dash-btn dash-btn-outline dash-btn-full" style={{ marginTop: 10 }}>
            {featureLoading ? 'Uploading...' : 'Upload business photo'}
            <input type="file" accept="image/*" hidden disabled={featureLoading} onChange={(event) => uploadProviderPhoto(event.target.files?.[0])} />
          </label>
        </DashboardCard>

        <SectionHeader label="VERIFICATION" title="Provider verification" />
        <VerificationCard verification={verification} type="provider">
          {verification?.status === 'rejected' && (
            <div style={{ marginTop: 12 }}>
              <label className="dash-btn dash-btn-primary dash-btn-full">
                Resubmit Verification
                <input type="file" accept="image/*,.pdf" hidden disabled={featureLoading} onChange={handleResubmitDocSelect} />
              </label>
              {resubmitDocPreview && (
                <DocPreview url={resubmitDocPreview} name={resubmitDocName} onClear={clearResubmitDoc} />
              )}
              {resubmitDocFile && (
                <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => resubmitVerification(resubmitDocFile)} disabled={featureLoading}>
                  {featureLoading ? 'Submitting...' : 'Submit new verification'}
                </button>
              )}
            </div>
          )}
          {verification?.status !== 'rejected' && verification?.status !== 'approved' && (
            <div style={{ marginTop: 12 }}>
              {verificationDocPreview && (
                <DocPreview url={verificationDocPreview} name={verificationDocName} onClear={clearVerificationDoc} />
              )}
              {!verificationDocPreview && !verification?.id_document_url && (
                <label className="dash-btn dash-btn-outline dash-btn-full">
                  Select document
                  <input type="file" accept="image/*,.pdf" hidden disabled={featureLoading} onChange={handleVerificationDocSelect} />
                </label>
              )}
              {verificationDocFile && (
                <button className="dash-btn dash-btn-primary dash-btn-full" onClick={() => submitVerification(verificationDocFile)} disabled={featureLoading}>
                  {featureLoading ? 'Submitting...' : 'Submit verification'}
                </button>
              )}
              {verification?.id_document_url && !verificationDocPreview && (
                <p style={{ marginTop: 8, fontSize: 13, color: 'var(--nf-green)' }}>✓ Document submitted</p>
              )}
            </div>
          )}
        </VerificationCard>

        <SectionHeader label="WORK SAMPLES" title="Your work samples" />
        <DashboardCard>
          <div className="dash-form-group">
            <label className="dash-form-label">Caption (optional)</label>
            <input className="dash-form-input" placeholder="Caption" value={sampleCaption} onChange={(e) => setSampleCaption(e.target.value)} />
          </div>
          <label className="dash-btn dash-btn-outline dash-btn-full">
            Upload sample
            <input type="file" accept="image/*" hidden disabled={featureLoading} onChange={(event) => { const file = event.target.files?.[0]; if (file) { uploadSample(file, sampleCaption); } }} />
          </label>
          {samples.length > 0 && (
            <div className="dash-sample-grid">
              {samples.map((sample) => (
                <div className="dash-sample-item" key={sample.id}>
                  <img src={sample.signedUrl} alt={sample.caption || 'Work sample'} />
                  <p>{sample.caption}</p>
                  <button type="button" className="dash-btn dash-btn-danger dash-btn-sm" onClick={async () => { await supabase.from('provider_work_samples').delete().eq('id', sample.id); setSamples((current) => current.filter((item) => item.id !== sample.id)) }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <SectionHeader label="MESSAGES" title="Your conversations" />
        <EmptyState
          icon="💬"
          title="Message customers"
          description="Chat with customers who booked your services."
          action={
            <button className="dash-btn dash-btn-primary" onClick={onConversations}>
              Open messages
            </button>
          }
        />

        <SectionHeader label="SUPPORT" title="Your reports" />
        {loading ? (
          <LoadingState text="Loading reports..." />
        ) : supportReports.length === 0 ? (
          <EmptyState icon="📋" title="No reports yet" description="Submit a support report below." />
        ) : (
          supportReports.map((report) => (
            <ReportCard key={report.id} report={report} reporterName={user?.name} />
          ))
        )}

        <SectionHeader label="AVAILABILITY" title="Your availability" />
        <DashboardCard>
          <div style={{ display: 'grid', gap: 8 }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
              const slot = availability.find((a) => a.day_of_week === index)
              return (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8e4' }}>
                  <strong>{day}</strong>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: slot?.is_available ? 'var(--nf-green)' : 'var(--nf-text-muted)' }}>
                      {slot?.is_available ? '🟢 Available' : '🔴 Unavailable'}
                    </span>
                    <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={() => toggleDayAvailability(index)}>
                      {slot?.is_available ? 'Set unavailable' : 'Set available'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" className="dash-btn dash-btn-primary dash-btn-full" onClick={saveAvailability} disabled={featureLoading} style={{ marginTop: 12 }}>
            {featureLoading ? 'Saving...' : 'Save availability'}
          </button>
        </DashboardCard>

        <SectionHeader label="SERVICE PACKAGES" title="Your packages" />
        <DashboardCard>
          {packages.length > 0 && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              {packages.map((pkg) => (
                <div key={pkg.id} style={{ padding: 10, background: 'var(--nf-bg)', borderRadius: 8 }}>
                  {editingPackageId === pkg.id ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <input className="dash-form-input" placeholder="Package name" value={editPackageName} onChange={(e) => setEditPackageName(e.target.value)} />
                      <input className="dash-form-input" placeholder="Description" value={editPackageDescription} onChange={(e) => setEditPackageDescription(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="dash-form-input" placeholder="Price (₦)" type="number" value={editPackagePrice} onChange={(e) => setEditPackagePrice(e.target.value)} />
                        <input className="dash-form-input" placeholder="Duration" value={editPackageDuration} onChange={(e) => setEditPackageDuration(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="dash-btn dash-btn-primary dash-btn-sm" onClick={() => updatePackage(pkg.id)} disabled={featureLoading}>Save</button>
                        <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={cancelEditingPackage} disabled={featureLoading}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{pkg.name}</strong>
                        <p style={{ margin: 0, fontSize: 13 }}>{pkg.description}</p>
                        <p style={{ margin: 0, fontWeight: 800, color: 'var(--nf-green)' }}>₦{Number(pkg.price).toLocaleString()}</p>
                        {pkg.estimated_duration && <p style={{ margin: 0, fontSize: 12, color: 'var(--nf-text-muted)' }}>Duration: {pkg.estimated_duration}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={() => startEditingPackage(pkg)}>Edit</button>
                        <button type="button" className="dash-btn dash-btn-danger dash-btn-sm" onClick={() => deletePackage(pkg.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            <input className="dash-form-input" placeholder="Package name" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} />
            <input className="dash-form-input" placeholder="Description" value={newPackageDescription} onChange={(e) => setNewPackageDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="dash-form-input" placeholder="Price (₦)" type="number" value={newPackagePrice} onChange={(e) => setNewPackagePrice(e.target.value)} />
              <input className="dash-form-input" placeholder="Duration" value={newPackageDuration} onChange={(e) => setNewPackageDuration(e.target.value)} />
            </div>
            <button type="button" className="dash-btn dash-btn-outline dash-btn-full" onClick={addPackage} disabled={featureLoading}>
              {featureLoading ? 'Adding...' : 'Add package'}
            </button>
          </div>
        </DashboardCard>

        <SectionHeader label="QUOTES" title="Send a quote" />
        <DashboardCard>
          <div style={{ display: 'grid', gap: 8 }}>
            <input className="dash-form-input" placeholder="Booking ID" type="number" value={newQuoteBookingId} onChange={(e) => setNewQuoteBookingId(e.target.value)} />
            <input className="dash-form-input" placeholder="Amount (₦)" type="number" value={newQuoteAmount} onChange={(e) => setNewQuoteAmount(e.target.value)} />
            <textarea className="dash-form-textarea" placeholder="Quote description" value={newQuoteDescription} onChange={(e) => setNewQuoteDescription(e.target.value)} />
            <button type="button" className="dash-btn dash-btn-primary dash-btn-full" onClick={sendQuote} disabled={featureLoading}>
              {featureLoading ? 'Sending...' : 'Send quote'}
            </button>
          </div>
          {quotes.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {quotes.map((quote) => (
                <div key={quote.id} style={{ padding: 10, background: 'var(--nf-bg)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>₦{Number(quote.amount).toLocaleString()}</strong>
                    <StatusBadge status={quote.status} />
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>{quote.description}</p>
                  {quote.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button type="button" className="dash-btn dash-btn-primary dash-btn-sm" onClick={() => updateQuoteStatus(quote.id, 'accepted')}>Accept</button>
                      <button type="button" className="dash-btn dash-btn-danger dash-btn-sm" onClick={() => updateQuoteStatus(quote.id, 'declined')}>Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <SectionHeader label="REVIEWS" title="Customer reviews" />
        <DashboardCard>
          {providerReviews.length === 0 ? (
            <EmptyState icon="⭐" title="No reviews yet" description="Reviews from customers will appear here." />
          ) : (
            <div>
              {providerReviews.map((review) => (
                <div key={review.id} style={{ borderBottom: '1px solid #e2e8e4', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>⭐ {review.rating}/5</strong>
                    <small style={{ color: 'var(--nf-text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</small>
                  </div>
                  {review.comment && <p style={{ margin: '4px 0', fontSize: 14 }}>{review.comment}</p>}
                  {review.provider_response ? (
                    <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, marginTop: 6 }}>
                      <strong style={{ fontSize: 12 }}>Provider response</strong>
                      <p style={{ margin: 0, fontSize: 13 }}>{review.provider_response}</p>
                    </div>
                  ) : (
                    <ReviewResponse reviewId={review.id} onRespond={respondToReview} />
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <SectionHeader label="SUPPORT" title="Help and support" />
        <DashboardCard>
          <ReportForm user={user} />
        </DashboardCard>

        {onLogout && (
          <DashboardCard>
            <button className="dash-btn dash-btn-danger dash-btn-full" onClick={onLogout}>
              Log out
            </button>
          </DashboardCard>
        )}
      </main>

      <BottomNav
        items={[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'bookings', icon: '📅', label: 'Requests' },
          { id: 'messages', icon: '💬', label: 'Messages' },
          { id: 'notifications', icon: '🔔', label: 'Alerts' },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ]}
        active="home"
        onChange={(id) => {
          if (id === 'home') onHome()
          else if (id === 'bookings') onBookings()
          else if (id === 'messages') onConversations()
          else if (id === 'notifications') onNotifications()
          else if (id === 'profile') onProfile()
        }}
      />
    </div>
  )
}

function AdminDashboard({ user, onLogout, onHome }) {
  const [verifications, setVerifications] = useState([])
  const [customerVerifications, setCustomerVerifications] = useState([])
  const [reports, setReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [reviews, setReviews] = useState([])
  const [quotes, setQuotes] = useState([])
  const [users, setUsers] = useState([])
  const [providers, setProviders] = useState([])
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState({})
  const [providerNames, setProviderNames] = useState({})
  const [customerNames, setCustomerNames] = useState({})
  const [reporterNames, setReporterNames] = useState({})
  const [reportStatus, setReportStatus] = useState({})
  const [reportResponse, setReportResponse] = useState({})
  const [viewingDocUrl, setViewingDocUrl] = useState('')
  const [loadingDoc, setLoadingDoc] = useState(false)

  const loadAdminDataRef = useRef(null)

  useEffect(() => {
    loadAdminDataRef.current = async () => {
      setLoading(true)

      const [verificationsResult, customerVerificationsResult, reportsResult, notificationsResult, reviewsResult, quotesResult, usersResult, providersResult, bookingsResult, servicesResult] = await Promise.all([
        supabase
          .from('provider_verifications')
          .select('*')
          .order('submitted_at', { ascending: false }),
        supabase
          .from('customer_verifications')
          .select('*')
          .order('submitted_at', { ascending: false }),
        supabase
          .from('support_reports')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user?.user_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('providers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('*')
          .order('name', { ascending: true }),
      ])

      if (verificationsResult.error) {
        console.error('Failed to load verifications:', verificationsResult.error)
      } else {
        setVerifications(verificationsResult.data || [])
        const providerUserIds = [...new Set((verificationsResult.data || []).map((v) => v.provider_user_id))]
        if (providerUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', providerUserIds)
          if (profiles) {
            const names = {}
            profiles.forEach((p) => {
              names[p.user_id] = p.full_name
            })
            setProviderNames(names)
          }
        }
      }

      if (customerVerificationsResult.error) {
        console.error('Failed to load customer verifications:', customerVerificationsResult.error)
      } else {
        setCustomerVerifications(customerVerificationsResult.data || [])
        const customerUserIds = [...new Set((customerVerificationsResult.data || []).map((v) => v.customer_user_id))]
        if (customerUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', customerUserIds)
          if (profiles) {
            const names = {}
            profiles.forEach((p) => {
              names[p.user_id] = p.full_name
            })
            setCustomerNames(names)
          }
        }
      }

      if (reportsResult.error) {
        console.error('Failed to load reports:', reportsResult.error)
      } else {
        setReports(reportsResult.data || [])
        const reporterUserIds = [...new Set((reportsResult.data || []).map((r) => r.reporter_user_id))]
        if (reporterUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', reporterUserIds)
          if (profiles) {
            const names = {}
            profiles.forEach((p) => {
              names[p.user_id] = p.full_name
            })
            setReporterNames(names)
          }
        }
      }

      if (notificationsResult.error) {
        console.error('Failed to load admin notifications:', notificationsResult.error)
      } else {
        setNotifications(notificationsResult.data || [])
        setUnreadNotifications((notificationsResult.data || []).filter((n) => !n.is_read).length)
      }

      if (reviewsResult.error) {
        console.error('Failed to load reviews:', reviewsResult.error)
      } else {
        setReviews(reviewsResult.data || [])
      }

      if (quotesResult.error) {
        console.error('Failed to load quotes:', quotesResult.error)
      } else {
        setQuotes(quotesResult.data || [])
      }

      if (usersResult.error) {
        console.error('Failed to load users:', usersResult.error)
      } else {
        setUsers(usersResult.data || [])
      }

      if (providersResult.error) {
        console.error('Failed to load providers:', providersResult.error)
      } else {
        setProviders(providersResult.data || [])
      }

      if (bookingsResult.error) {
        console.error('Failed to load bookings:', bookingsResult.error)
      } else {
        setBookings(bookingsResult.data || [])
      }

      if (servicesResult.error) {
        console.error('Failed to load services:', servicesResult.error)
      } else {
        setServices(servicesResult.data || [])
      }

      setLoading(false)
    }

    loadAdminDataRef.current()
  }, [user])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAdminDataRef.current?.()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const updateVerification = async (verificationId, newStatus) => {
    if (verificationLoading) return
    setVerificationLoading(true)

    const updates = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.user_id,
    }

    if (newStatus === 'rejected') {
      const reason = rejectReason[verificationId]?.trim()
      if (!reason) {
        alert('Please provide a rejection reason.')
        setVerificationLoading(false)
        return
      }
      updates.rejection_reason = reason
    }

    const { error } = await supabase
      .from('provider_verifications')
      .update(updates)
      .eq('id', verificationId)

    if (error) {
      console.error('Failed to update verification:', error)
      alert('Could not update verification: ' + error.message)
      setVerificationLoading(false)
      return
    }

    const verification = verifications.find((v) => v.id === verificationId)
    if (verification?.provider_user_id) {
      const title = newStatus === 'approved' ? 'Verification approved' : 'Verification rejected'
      const message = newStatus === 'approved'
        ? 'Your provider verification has been approved.'
        : `Your provider verification was rejected. Reason: ${updates.rejection_reason || 'Not provided'}`

      const { error: notificationError } = await supabase.rpc('create_verification_notification', {
        p_user_id: verification.provider_user_id,
        p_type: newStatus,
        p_title: title,
        p_message: message,
      })

      if (notificationError) {
        console.error('Failed to create verification notification:', notificationError)
      }
    }

    setVerifications((current) =>
      current.map((v) =>
        v.id === verificationId ? { ...v, ...updates } : v
      )
    )
    setRejectReason((current) => {
      const next = { ...current }
      delete next[verificationId]
      return next
    })

    setVerificationLoading(false)
  }

  const updateReport = async (reportId) => {
    if (reportLoading) return
    const newStatus = reportStatus[reportId]
    const response = reportResponse[reportId]?.trim()

    if (!newStatus && !response && response !== '') {
      return
    }

    setReportLoading(true)

    const updates = {
      admin_response: response || null,
    }

    if (newStatus) {
      updates.status = newStatus
    }

    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('support_reports')
      .update(updates)
      .eq('id', reportId)

    if (error) {
      console.error('Failed to update report:', error)
      alert('Could not update report: ' + error.message)
    } else {
      setReports((current) =>
        current.map((r) =>
          r.id === reportId ? { ...r, ...updates } : r
        )
      )

      const report = reports.find((r) => r.id === reportId)
      if (report?.reporter_user_id) {
        const title = 'Support report updated'
        const message = newStatus
          ? `Your support report has been updated to ${newStatus}.`
          : 'An admin has responded to your support report.'

        try {
          const { error: notificationError } = await supabase.rpc('create_notification', {
            p_user_id: report.reporter_user_id,
            p_type: 'support_update',
            p_title: title,
            p_message: message,
          })

          if (notificationError) {
            console.error('Failed to create support report notification:', notificationError)
          }
        } catch (notificationError) {
          console.error('Failed to create support report notification:', notificationError)
        }
      }
    }

    setReportLoading(false)
  }

  const updateCustomerVerification = async (verificationId, newStatus) => {
    if (verificationLoading) return
    setVerificationLoading(true)

    const updates = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.user_id,
    }

    if (newStatus === 'rejected') {
      const reason = rejectReason[verificationId]?.trim()
      if (!reason) {
        alert('Please provide a rejection reason.')
        setVerificationLoading(false)
        return
      }
      updates.rejection_reason = reason
    }

    const { error } = await supabase
      .from('customer_verifications')
      .update(updates)
      .eq('id', verificationId)

    if (error) {
      console.error('Failed to update customer verification:', error)
      alert('Could not update verification: ' + error.message)
      setVerificationLoading(false)
      return
    }

    const verification = customerVerifications.find((v) => v.id === verificationId)
    if (verification?.customer_user_id) {
      const title = newStatus === 'approved' ? 'Identity verification approved' : 'Identity verification rejected'
      const message = newStatus === 'approved'
        ? 'Your NaijaFix identity verification has been approved.'
        : `Your identity verification was rejected. Reason: ${updates.rejection_reason || 'Not provided'}`

      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: verification.customer_user_id,
        p_type: newStatus,
        p_title: title,
        p_message: message,
      })

      if (notificationError) {
        console.error('Failed to create customer verification notification:', notificationError)
      }
    }

    setCustomerVerifications((current) =>
      current.map((v) =>
        v.id === verificationId ? { ...v, ...updates } : v
      )
    )
    setRejectReason((current) => {
      const next = { ...current }
      delete next[verificationId]
      return next
    })

    setVerificationLoading(false)
  }

  const markReportsAsViewed = useCallback(async () => {
    const unviewedReports = reports.filter((r) => !r.viewed_by_admin)
    if (unviewedReports.length === 0) return

    const unviewedIds = unviewedReports.map((r) => r.id)

    try {
      const { error } = await supabase
        .from('support_reports')
        .update({ viewed_by_admin: true })
        .in('id', unviewedIds)

      if (error) {
        console.error('Failed to mark reports as viewed:', error)
        return
      }

      setReports((current) =>
        current.map((r) =>
          unviewedIds.includes(r.id) ? { ...r, viewed_by_admin: true } : r
        )
      )
    } catch (err) {
      console.error('Unexpected error marking reports as viewed:', err)
    }
  }, [reports])

  const markNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('user_id', user?.user_id)

      if (error) {
        console.error('Failed to mark notifications as read:', error)
        return
      }

      setNotifications((current) =>
        current.map((n) =>
          unreadIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      setUnreadNotifications(0)
    } catch (err) {
      console.error('Unexpected error marking notifications as read:', err)
    }
  }, [notifications, user])

  const [activeTab, setActiveTab] = useState('overview')

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    if (tabId === 'support-reports') {
      setTimeout(() => markReportsAsViewed(), 0)
    } else if (tabId === 'notifications') {
      setTimeout(() => markNotificationsAsRead(), 0)
    }
  }, [markReportsAsViewed, markNotificationsAsRead])

  const openVerificationDocument = async (path, type) => {
    if (!path) return
    setLoadingDoc(true)
    try {
      const bucket = type === 'customer' ? 'customer-verification-documents' : 'provider-verification-documents'
      const signedUrl = await getSignedStorageUrl(bucket, path)
      setViewingDocUrl(signedUrl)
    } catch (error) {
      console.error('Could not load verification document:', error)
      alert('Could not load document: ' + (error?.message || 'Unknown error'))
    }
    setLoadingDoc(false)
  }

  const closeVerificationDocument = () => {
    setViewingDocUrl('')
  }

  const pendingProvider = verifications.filter(v => v.status === 'pending').length
  const pendingCustomer = customerVerifications.filter(v => v.status === 'pending').length
  const openReports = reports.filter(r => r.status === 'open' || r.status === 'in_review').length

  const tabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'providers', icon: '🛠️', label: 'Providers' },
    { id: 'bookings', icon: '📅', label: 'Bookings' },
    { id: 'services', icon: '🏷️', label: 'Services' },
    { id: 'provider-verifications', icon: '🪪', label: 'Providers', badge: pendingProvider },
    { id: 'customer-verifications', icon: '🆔', label: 'Customers', badge: pendingCustomer },
    { id: 'support-reports', icon: '📋', label: 'Reports', badge: openReports },
    { id: 'reviews', icon: '⭐', label: 'Reviews' },
    { id: 'quotes', icon: '💰', label: 'Quotes' },
    { id: 'notifications', icon: '🔔', label: 'Alerts' },
  ]

  const renderVerificationCard = (verification, names, type) => (
    <div className="dash-card dash-verification-card" key={verification.id}>
      <div className="dash-verification-header">
        <h4>{names[type === 'provider' ? verification.provider_user_id : verification.customer_user_id] || 'Unknown user'}</h4>
        <div className="dash-verification-badges">
          <StatusBadge status={verification.status} />
          {verification.resubmitted_at && <span className="dash-resubmit-badge">Resubmitted</span>}
        </div>
      </div>
      <div className="dash-verification-body">
        <p><strong>Submitted:</strong> {verification.submitted_at ? new Date(verification.submitted_at).toLocaleString() : 'N/A'}</p>
        {verification.resubmitted_at && <p><strong>Resubmitted:</strong> {new Date(verification.resubmitted_at).toLocaleString()}</p>}
        {verification.rejection_reason && <p className="dash-rejection-reason"><strong>Reason:</strong> {verification.rejection_reason}</p>}
        {verification.id_document_url && (
          <button type="button" className="dash-btn dash-btn-outline dash-btn-sm" onClick={() => openVerificationDocument(verification.id_document_url, type)} disabled={loadingDoc}>
            {loadingDoc ? 'Loading...' : 'View document'}
          </button>
        )}
      </div>
      {verification.status === 'pending' && (
        <div className="dash-report-actions">
          <input
            className="dash-form-input"
            placeholder="Rejection reason (required if rejecting)"
            value={rejectReason[verification.id] || ''}
            onChange={(e) => setRejectReason((current) => ({ ...current, [verification.id]: e.target.value }))}
          />
          <div className="dash-btn-group">
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => type === 'provider' ? updateVerification(verification.id, 'approved') : updateCustomerVerification(verification.id, 'approved')} disabled={verificationLoading}>
              {verificationLoading ? 'Updating...' : 'Approve'}
            </button>
            <button type="button" className="dash-btn dash-btn-danger" onClick={() => type === 'provider' ? updateVerification(verification.id, 'rejected') : updateCustomerVerification(verification.id, 'rejected')} disabled={verificationLoading}>
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <DashboardShell
        sidebar={
          <AdminSidebar
            active={activeTab}
            onChange={setActiveTab}
            stats={{ pendingProvider, pendingCustomer, openReports, unreadNotifications, onLogout }}
          />
        }
        header={
          <div className="dash-admin-header">
            <div>
              <h2>Admin Control Center</h2>
              <p>Manage verifications, reports, and platform activity.</p>
            </div>
            <button
              className="dash-btn dash-btn-outline dash-btn-sm"
              onClick={() => loadAdminDataRef.current?.()}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
         {activeTab === 'overview' && (
          <>
            <StatGrid>
              <StatCard icon="🪪" value={pendingProvider} label="Pending providers" color="yellow" />
              <StatCard icon="🆔" value={pendingCustomer} label="Pending customers" color="yellow" />
              <StatCard icon="📋" value={openReports} label="Open reports" color="red" />
              <StatCard icon="✅" value={verifications.filter(v => v.status === 'approved').length + customerVerifications.filter(v => v.status === 'approved').length} label="Approved" color="green" />
            </StatGrid>
            <SectionHeader label="RECENT ACTIVITY" title="Latest provider verifications" />
            {loading ? (
              <LoadingState text="Loading data..." />
            ) : verifications.length === 0 ? (
              <EmptyState icon="✅" title="No provider verifications yet" />
            ) : (
              verifications.slice(0, 3).map((v) => renderVerificationCard(v, providerNames, 'provider'))
            )}
            <SectionHeader label="SUPPORT" title="Latest reports" />
            {reports.length === 0 ? (
              <EmptyState icon="📋" title="No reports yet" />
            ) : (
              reports.slice(0, 3).map((report) => <ReportCard key={report.id} report={report} reporterName={reporterNames[report.reporter_user_id]} />)
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <SectionHeader label="USERS" title="All users" />
            {loading ? (
              <LoadingState text="Loading users..." />
            ) : users.length === 0 ? (
              <EmptyState icon="👥" title="No users yet" />
            ) : (
              users.map((u) => (
                <div key={u.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{u.full_name || 'Unnamed'}</strong>
                    <StatusBadge status={u.role} />
                  </div>
                  <p>{u.email}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>{u.phone || 'No phone'}</p>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'providers' && (
          <>
            <SectionHeader label="PROVIDERS" title="All providers" />
            {loading ? (
              <LoadingState text="Loading providers..." />
            ) : providers.length === 0 ? (
              <EmptyState icon="🛠️" title="No providers yet" />
            ) : (
              providers.map((p) => (
                <div key={p.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{p.business_name || 'Unnamed'}</strong>
                    {p.verified && <span className="verified">✓ Verified</span>}
                  </div>
                  <p>{p.category}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>{p.location || 'No location'}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>⭐ {p.rating ?? 'New'} rating</p>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'bookings' && (
          <>
            <SectionHeader label="BOOKINGS" title="All bookings" />
            {loading ? (
              <LoadingState text="Loading bookings..." />
            ) : bookings.length === 0 ? (
              <EmptyState icon="📅" title="No bookings yet" />
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>#{b.id}</strong>
                    <StatusBadge status={b.status} />
                  </div>
                  <p><strong>Customer:</strong> {b.customer_name || 'Unknown'}</p>
                  <p><strong>Provider:</strong> {b.provider_name || 'Unknown'}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>{b.booking_date} {b.preferred_time || ''}</p>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'services' && (
          <>
            <SectionHeader label="SERVICES" title="All services" />
            {loading ? (
              <LoadingState text="Loading services..." />
            ) : services.length === 0 ? (
              <EmptyState icon="🏷️" title="No services yet" />
            ) : (
              services.map((s) => (
                <div key={s.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <strong>{s.name}</strong>
                  <p style={{ fontSize: 12, color: 'var(--nf-text-muted)' }}>{s.category}</p>
                  {s.description && <p>{s.description}</p>}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'provider-verifications' && (
          <>
            <SectionHeader label="VERIFICATIONS" title="Provider verifications" />
            {loading ? (
              <LoadingState text="Loading verifications..." />
            ) : verifications.length === 0 ? (
              <EmptyState icon="✅" title="No provider verifications yet" />
            ) : (
              verifications.map((v) => renderVerificationCard(v, providerNames, 'provider'))
            )}
          </>
        )}

        {activeTab === 'customer-verifications' && (
          <>
            <SectionHeader label="VERIFICATIONS" title="Customer verifications" />
            {loading ? (
              <LoadingState text="Loading verifications..." />
            ) : customerVerifications.length === 0 ? (
              <EmptyState icon="✅" title="No customer verifications yet" />
            ) : (
              customerVerifications.map((v) => renderVerificationCard(v, customerNames, 'customer'))
            )}
          </>
        )}

        {activeTab === 'support-reports' && (
          <>
            <SectionHeader label="SUPPORT REPORTS" title="Reports & complaints" />
            {loading ? (
              <LoadingState text="Loading reports..." />
            ) : reports.length === 0 ? (
              <EmptyState icon="📋" title="No reports yet" />
            ) : (
              reports.map((report) => (
                <div className={`dash-card dash-report-card ${report.viewed_by_admin ? 'dash-report-viewed' : 'dash-report-unviewed'}`} key={report.id}>
                  <div className="dash-report-header">
                    <h4>{report.subject}</h4>
                    <div className="dash-verification-badges">
                      <StatusBadge status={report.status} />
                      {!report.viewed_by_admin && <span className="dash-unread-badge">New</span>}
                    </div>
                  </div>
                  <div className="dash-report-body">
                    <p><strong>Category:</strong> {report.category}</p>
                    <p><strong>Reporter:</strong> {reporterNames[report.reporter_user_id] || 'Unknown user'}</p>
                    <p className="dash-report-desc">{report.description}</p>
                    <p><strong>Created:</strong> {new Date(report.created_at).toLocaleString()}</p>
                    {report.admin_response && (
                      <div className="dash-admin-response">
                        <strong>Admin response:</strong>
                        <p>{report.admin_response}</p>
                      </div>
                    )}
                  </div>
                  <div className="dash-report-actions">
                    <select
                      className="dash-form-select"
                      value={reportStatus[report.id] || report.status}
                      onChange={(e) => setReportStatus((current) => ({ ...current, [report.id]: e.target.value }))}
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <textarea
                      className="dash-form-textarea"
                      placeholder="Admin response"
                      value={reportResponse[report.id] ?? report.admin_response ?? ''}
                      onChange={(e) => setReportResponse((current) => ({ ...current, [report.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="dash-btn dash-btn-primary dash-btn-full"
                      onClick={() => updateReport(report.id)}
                      disabled={reportLoading}
                    >
                      {reportLoading ? 'Updating...' : 'Update Report'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <>
            <SectionHeader label="REVIEWS" title="All reviews" />
            {loading ? (
              <LoadingState text="Loading reviews..." />
            ) : reviews.length === 0 ? (
              <EmptyState icon="⭐" title="No reviews yet" />
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>⭐ {review.rating}/5</strong>
                    <small style={{ color: 'var(--nf-text-muted)' }}>{new Date(review.created_at).toLocaleString()}</small>
                  </div>
                  <p><strong>Customer:</strong> {customerNames[review.customer_user_id] || 'Unknown'}</p>
                  <p><strong>Provider:</strong> {providerNames[review.provider_user_id] || 'Unknown'}</p>
                  {review.comment && <p>{review.comment}</p>}
                  {review.provider_response && <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, marginTop: 6 }}><strong>Provider response:</strong> <p style={{ margin: 0 }}>{review.provider_response}</p></div>}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'quotes' && (
          <>
            <SectionHeader label="QUOTES" title="All quotes" />
            {loading ? (
              <LoadingState text="Loading quotes..." />
            ) : quotes.length === 0 ? (
              <EmptyState icon="💰" title="No quotes yet" />
            ) : (
              quotes.map((quote) => (
                <div key={quote.id} className="dash-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>₦{Number(quote.amount).toLocaleString()}</strong>
                    <StatusBadge status={quote.status} />
                  </div>
                  <p>{quote.description}</p>
                  <small style={{ color: 'var(--nf-text-muted)' }}>Booking ID: {quote.booking_id} • Provider: {providerNames[quote.provider_user_id] || 'Unknown'}</small>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <SectionHeader label="NOTIFICATIONS" title="Admin notifications" />
            {loading ? (
              <LoadingState text="Loading notifications..." />
            ) : notifications.length === 0 ? (
              <EmptyState icon="🔔" title="No notifications" description="Platform notifications will appear here." />
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    className={`dash-notification-item ${notification.is_read ? 'dash-notification-read' : 'dash-notification-unread'}`}
                    key={notification.id}
                  >
                    <span className="dash-notification-icon">
                      {notification.type === 'verification' ? '🪪' :
                       notification.type === 'support_update' ? '📋' :
                       notification.type === 'message' ? '💬' :
                       notification.type === 'booking' ? '📅' :
                       notification.type === 'accepted' ? '✅' :
                       notification.type === 'declined' ? '❌' : '🔔'}
                    </span>
                    <div className="dash-notification-content">
                      <strong>{notification.title || 'Notification'}</strong>
                      <p>{notification.message || ''}</p>
                      <small>
                        {notification.type || 'update'}
                        {notification.created_at ? ' • ' + new Date(notification.created_at).toLocaleString() : ''}
                      </small>
                    </div>
                    {!notification.is_read && <span className="dash-notification-dot" />}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <button className="dash-btn dash-btn-outline" onClick={onHome}>
                ← Back to NaijaFix
              </button>
            </div>
          </>
        )}
      </DashboardShell>

      {viewingDocUrl && (
        <ImageModal url={viewingDocUrl} onClose={closeVerificationDocument} />
      )}
    </>
  )
}

function ConversationList({ user, onBack, onChat }) {
  const [conversations, setConversations] = useState([])
  const [conversationMessages, setConversationMessages] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.user_id) {
        setConversations([])
        setConversationMessages({})
        setLoading(false)
        return
      }

      setLoading(true)

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .or(`customer_user_id.eq.${user.user_id},provider_user_id.eq.${user.user_id}`)
        .order('updated_at', { ascending: false })

      if (conversationsError) {
        console.error('Failed to load conversations:', conversationsError)
        setConversations([])
        setConversationMessages({})
        setLoading(false)
        return
      }

      setConversations(conversationsData || [])

      if (conversationsData && conversationsData.length > 0) {
        const conversationIds = conversationsData.map((c) => c.id)
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true })

        const messageMap = {}
        for (const message of messagesData || []) {
          if (!messageMap[message.conversation_id]) {
            messageMap[message.conversation_id] = []
          }
          messageMap[message.conversation_id].push(message)
        }
        setConversationMessages(messageMap)
      } else {
        setConversationMessages({})
      }

      setLoading(false)
    }

    loadConversations()
  }, [user])

  const getPartnerName = (conversation) => {
    if (!user?.user_id) return 'User'
    if (conversation.customer_user_id === user.user_id) {
      return conversation.provider_name || 'Provider'
    }
    return conversation.customer_name || 'Customer'
  }

  const getConversationUnread = (conversation) => {
    const messages = conversationMessages[conversation.id] || []
    return messages.filter((m) => m.sender_user_id !== user?.user_id && !m.is_read).length
  }

  const getLastMessage = (conversation) => {
    const messages = conversationMessages[conversation.id] || []
    if (messages.length === 0) return null
    return messages[messages.length - 1]
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="conversation-list">
      <header className="inner-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <Logo />
      </header>

      <main className="inner-content">
        <span className="section-label">MESSAGES</span>
        <h2>Your conversations</h2>

        {loading ? (
          <div className="empty-box large-empty">
            <span>⏳</span>
            <h4>Loading conversations...</h4>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-box large-empty">
            <span>💬</span>
            <h4>No messages yet</h4>
            <p>Start a conversation with a provider after booking a service.</p>
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => {
              const lastMessage = getLastMessage(conversation)
              const unreadCount = getConversationUnread(conversation)
              return (
                <button
                  key={conversation.id}
                  className="conversation-item"
                  onClick={() => onChat(conversation)}
                >
                  <div className="conversation-avatar">
                    {getPartnerName(conversation)?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="conversation-body">
                    <h3>{getPartnerName(conversation)}</h3>
                    <p>
                      {lastMessage
                        ? lastMessage.message_type === 'image'
                          ? '📷 Photo'
                          : lastMessage.message_text || 'No content'
                        : 'Start a conversation'}
                    </p>
                  </div>
                  <div className="conversation-meta">
                    <time>{formatTime(lastMessage?.created_at || conversation.updated_at)}</time>
                    {unreadCount > 0 && (
                      <span className="conversation-unread">{unreadCount}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function ChatScreen({ user, conversation, partnerName, partnerAvatar, bookingContext, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imageModal, setImageModal] = useState('')
  const [chatImageUrls, setChatImageUrls] = useState({})
  const [loadingImageUrls, setLoadingImageUrls] = useState({})
  const messagesEndRef = useRef(null)
  const textInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation?.id) {
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load messages:', error)
      } else {
        setMessages(data || [])
      }

      setLoading(false)

      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_user_id', user?.user_id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to mark messages as read:', error)
          }
        })
        .catch((error) => {
          console.error('Failed to mark messages as read:', error)
        })
    }

    loadMessages()
  }, [conversation, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const loadImageUrls = async () => {
      const imageMessages = messages.filter((m) => m.message_type === 'image' && m.attachment_path)
      if (imageMessages.length === 0) {
        setChatImageUrls({})
        return
      }

      const urlMap = {}
      const loadingSet = new Set()

      await Promise.allSettled(
        imageMessages.map(async (message) => {
          loadingSet.add(message.id)
          setLoadingImageUrls((current) => ({ ...current, [message.id]: true }))

          try {
            const signedUrl = await getSignedStorageUrl('chat-attachments', message.attachment_path)
            urlMap[message.id] = signedUrl
          } catch (error) {
            console.error('Failed to load chat image:', error)
            urlMap[message.id] = ''
          } finally {
            loadingSet.delete(message.id)
            setLoadingImageUrls((current) => {
              const next = { ...current }
              delete next[message.id]
              return next
            })
          }
        })
      )

      setChatImageUrls(urlMap)
    }

    loadImageUrls()
  }, [messages])

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB.')
      return
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
    setPhotoFile(file)
    event.target.value = ''
  }

  const clearPhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoPreview('')
    setPhotoFile(null)
  }

  const uploadPhoto = async (file) => {
    if (!conversation?.id || !user?.user_id) return null
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${conversation.id}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, { upsert: false })

    if (error) {
      throw error
    }

    return path
  }

  const sendMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed && !photoFile) return
    if (!conversation?.id || !user?.user_id) return

    setSending(true)

    try {
      let attachmentPath = null

      if (photoFile) {
        attachmentPath = await uploadPhoto(photoFile)
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_user_id: user.user_id,
          message_type: photoFile ? 'image' : 'text',
          message_text: trimmed || null,
          attachment_path: attachmentPath,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      setMessages((current) => [...current, data])

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id)

      const recipientId = conversation.customer_user_id === user.user_id
        ? conversation.provider_user_id
        : conversation.customer_user_id

      if (recipientId) {
        const otherName = conversation.customer_user_id === user.user_id
          ? conversation.provider_name
          : conversation.customer_name

        try {
          const { error: notificationError } = await supabase.rpc('create_notification', {
            p_user_id: recipientId,
            p_type: 'message',
            p_title: 'New message',
            p_message: `${user.name || 'Someone'} sent you a message${otherName ? ' about ' + otherName : ''}.`,
          })

          if (notificationError) {
            console.error('Failed to create message notification:', notificationError)
          }
        } catch (notificationError) {
          console.error('Failed to create message notification:', notificationError)
        }
      }

      setText('')
      clearPhoto()
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Could not send message: ' + error.message)
    }

    setSending(false)
    textInputRef.current?.focus()
  }

  const otherPartyName = partnerName || 'User'

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <button className="back-link" onClick={onBack}>← Back</button>
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {partnerAvatar ? <img src={partnerAvatar} alt={otherPartyName} /> : otherPartyName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="chat-header-text">
            <h3>{otherPartyName}</h3>
            {bookingContext && <span>{bookingContext}</span>}
          </div>
        </div>
      </header>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-empty">
            <span>⏳</span>
            <h4>Loading messages...</h4>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <span>💬</span>
            <h4>No messages yet</h4>
            <p>Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSent = message.sender_user_id === user?.user_id
            return (
              <div
                key={message.id}
                className={`chat-message ${isSent ? 'sent' : 'received'}`}
              >
                {message.message_type === 'image' && message.attachment_path && (
                  <div className="chat-image-wrapper">
                    {loadingImageUrls[message.id] ? (
                      <div className="chat-image-loading">Loading photo...</div>
                    ) : chatImageUrls[message.id] ? (
                      <img
                        src={chatImageUrls[message.id]}
                        alt="Shared photo"
                        className="chat-message-image"
                        onClick={() => setImageModal(chatImageUrls[message.id])}
                      />
                    ) : (
                      <div className="chat-image-error">Unable to load photo</div>
                    )}
                  </div>
                )}
                {message.message_text && <p>{message.message_text}</p>}
                <div className="chat-message-time">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {photoPreview && (
        <div className="chat-photo-preview">
          <img src={photoPreview} alt="Preview" />
          <button type="button" onClick={clearPhoto}>Remove</button>
        </div>
      )}

      <div className="chat-composer">
        <input
          ref={textInputRef}
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <label className="photo-button" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: '20px', border: '1px solid #cfdad3', background: 'white', color: '#087f3d', fontWeight: 800, fontSize: 14 }}>
          📷
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={sending} onChange={handlePhotoSelect} />
        </label>
        <button type="button" onClick={sendMessage} disabled={sending || (!text.trim() && !photoFile)}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {imageModal && (
        <div className="image-modal" onClick={() => setImageModal('')}>
          <button type="button" className="image-modal-close" onClick={() => setImageModal('')}>×</button>
          <img src={imageModal} alt="Full size" />
        </div>
      )}
    </div>
  )
}

function App() {
  const [page, setPage] =
    useState('home')

  const [dbServices, setDbServices] =
    useState(defaultServices)

  const [dbProviders, setDbProviders] =
    useState([])

  const [selectedService, setSelectedService] =
    useState(null)

  const [selectedProvider, setSelectedProvider] =
    useState(null)

  const [user, setCurrentUser] =
    useState(null)

  const [loadingData, setLoadingData] =
    useState(true)

  const [selectedConversation, setSelectedConversation] = useState(null)
  const [chatPartner, setChatPartner] = useState(null)

  const getOrCreateConversation = async (otherUserId, otherUserName, otherUserAvatar, bookingId) => {
    if (!user?.user_id) return null

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(customer_user_id.eq.${user.user_id},provider_user_id.eq.${otherUserId}),and(provider_user_id.eq.${user.user_id},customer_user_id.eq.${otherUserId})`)
      .maybeSingle()

    if (existing) {
      return existing
    }

    const isCustomer = user.role === 'customer'
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        booking_id: bookingId || null,
        customer_user_id: isCustomer ? user.user_id : otherUserId,
        provider_user_id: isCustomer ? otherUserId : user.user_id,
        customer_name: isCustomer ? user.name : otherUserName,
        provider_name: isCustomer ? otherUserName : user.name,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to create conversation:', error)
      alert('Could not start conversation: ' + error.message)
      return null
    }

    return data
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingData(true)

      const [
        servicesResult,
        providersResult,
      ] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('providers')
          .select('*')
          .order('business_name', {
            ascending: true,
          }),
      ])

      if (
        !servicesResult.error &&
        servicesResult.data &&
        servicesResult.data.length > 0
      ) {
        setDbServices(
          servicesResult.data
        )
      }

      if (servicesResult.error) {
        console.error(
          'Failed to load services:',
          servicesResult.error
        )
      }

      if (providersResult.error) {
        console.error(
          'Failed to load providers:',
          providersResult.error
        )
      } else {
        setDbProviders(
          providersResult.data || []
        )
      }

      setLoadingData(false)
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCurrentUser(null)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

      if (profileError) {
        console.error(
          'Failed to load user profile during bootstrap:',
          profileError
        )

        alert(
          'Your account is signed in, but your NaijaFix profile could not be loaded: ' +
            profileError.message
        )

        setCurrentUser(null)
        return
      }

      if (!profile) {
        alert(
          'You are signed in to NaijaFix, but no NaijaFix profile was found for this account. Please contact support.'
        )

        setCurrentUser(null)
        return
      }

      const appUser = {
        id: profile.id,
        user_id: user.id,
        name:
          profile.full_name || '',
        email:
          profile.email ||
          user.email ||
          '',
        phone:
          profile.phone || '',
        role:
          profile.role ||
          'customer',
        avatar_url:
          profile.avatar_url ||
          '',
      }

      setCurrentUser(appUser)

      localStorage.setItem(
        'naijafixUser',
        JSON.stringify(appUser)
      )
    }

    loadCurrentUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadCurrentUser()
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        localStorage.removeItem('naijafixUser')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const goToService = (service) => {
    setSelectedService(service)
    setPage('services')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()

    localStorage.removeItem(
      'naijafixUser'
    )

    setCurrentUser(null)
    setSelectedService(null)
    setSelectedProvider(null)
    setPage('home')
  }

  const effectivePage =
    page === 'admin-dashboard' && user?.role !== 'admin'
      ? 'home'
      : page

  if (effectivePage === 'login') {
    return (
      <Login
        onBack={() => setPage('home')}
        onSignup={() =>
          setPage('signup')
        }
        onDashboard={() => {
          const saved = JSON.parse(
            localStorage.getItem(
              'naijafixUser'
            ) || 'null'
          )

          setCurrentUser(saved)
          setPage(
            saved?.role === 'provider'
              ? 'provider-dashboard'
              : saved?.role === 'admin'
              ? 'admin-dashboard'
              : 'dashboard'
          )
        }}
      />
    )
  }

  if (effectivePage === 'signup') {
    return (
      <Signup
        onBack={() => setPage('home')}
        onLogin={() => {
          const saved = JSON.parse(
            localStorage.getItem(
              'naijafixUser'
            ) || 'null'
          )

          setCurrentUser(saved)

          if (saved?.user_id) {
            setPage(
              saved.role === 'provider'
                ? 'provider-dashboard'
                : saved.role === 'admin'
                ? 'admin-dashboard'
                : 'dashboard'
            )
          } else {
            setPage('login')
          }
        }}
      />
    )
  }

  if (effectivePage === 'provider-signup') {
    return (
      <Signup
        initialRole="provider"
        onBack={() => setPage('home')}
        onLogin={() => {
          const saved = JSON.parse(
            localStorage.getItem(
              'naijafixUser'
            ) || 'null'
          )

          setCurrentUser(saved)

          if (saved?.user_id) {
            setPage(
              saved.role === 'provider'
                ? 'provider-dashboard'
                : saved.role === 'admin'
                ? 'admin-dashboard'
                : 'dashboard'
            )
          } else {
            setPage('login')
          }
        }}
      />
    )
  }

  if (effectivePage === 'admin-dashboard') {
    return (
      <AdminDashboard
        key="admin-dashboard"
        user={user}
        onLogout={handleLogout}
        onHome={() => setPage('home')}
      />
    )
  }

  if (effectivePage === 'provider-dashboard') {
    return (
      <ProviderDashboard
        key="provider-dashboard"
        user={user}
        onHome={() => setPage('home')}
        onNotifications={() =>
          setPage('provider-notifications')
        }
        onConversations={() =>
          setPage('conversations')
        }
        onBookings={() =>
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        onProfile={() => {
          const el = document.querySelector('.dash-profile-header')
          el?.scrollIntoView({ behavior: 'smooth' })
        }}
        onLogout={handleLogout}
      />
    )
  }

  if (effectivePage === 'dashboard') {
    return (
      <Dashboard
        key="dashboard"
        user={user}
        services={dbServices}
        providers={dbProviders}
        onService={goToService}
        onBookings={() =>
          setPage('bookings')
        }
        onNotifications={() =>
          setPage('notifications')
        }
        onProfile={() =>
          setPage('profile')
        }
        onProviderDashboard={() =>
          setPage('provider-dashboard')
        }
        onConversations={() =>
          setPage('conversations')
        }
        onFavorites={() =>
          setPage('favorites')
        }
        onProvider={(provider) => {
          setSelectedProvider(provider)
          setPage('provider')
        }}
        onLogout={handleLogout}
      />
    )
  }

  if (effectivePage === 'services') {
    return (
      <Services
        service={selectedService}
        providers={dbProviders}
        loading={loadingData}
        onBack={() =>
          setPage('dashboard')
        }
        onProvider={(provider) => {
          setSelectedProvider(provider)
          setPage('provider')
        }}
      />
    )
  }

  if (effectivePage === 'provider') {
    return (
      <ProviderDetails
        provider={selectedProvider}
        service={selectedService}
        user={user}
        onBack={() =>
          setPage('services')
        }
        onRequest={() =>
          setPage('request')
        }
        onChat={(provider) => {
          const conversationPromise = getOrCreateConversation(
            provider.user_id,
            provider.business_name,
            provider.avatar_url,
            null
          )
          conversationPromise.then((conversation) => {
            if (conversation) {
              setSelectedConversation(conversation)
              setChatPartner({
                user_id: provider.user_id,
                name: provider.business_name,
                avatar_url: provider.avatar_url,
              })
              setPage('chat')
            }
          }).catch((error) => {
            console.error('Failed to start conversation:', error)
          })
        }}
      />
    )
  }

  if (effectivePage === 'request') {
    return (
      <RequestService
        provider={selectedProvider}
        service={selectedService}
        user={user}
        onBack={() =>
          setPage('provider')
        }
        onComplete={() =>
          setPage('bookings')
        }
      />
    )
  }

  if (effectivePage === 'bookings') {
    return (
      <Bookings
        user={user}
        dbProviders={dbProviders}
        onBack={() =>
          setPage('dashboard')
        }
        onChat={async (booking) => {
          let providerId = booking.provider_user_id
          if (!providerId && booking.provider_name) {
            const { data } = await supabase
              .from('providers')
              .select('user_id')
              .eq('business_name', booking.provider_name)
              .maybeSingle()
            providerId = data?.user_id
          }
          if (!providerId) {
            alert('Provider not found for this booking.')
            return
          }
          const conversation = await getOrCreateConversation(
            providerId,
            booking.provider_name,
            null,
            booking.id
          )
          if (conversation) {
            setSelectedConversation(conversation)
            setChatPartner({
              user_id: providerId,
              name: booking.provider_name,
            })
            setPage('chat')
          }
        }}
        onRebook={(provider, serviceName) => {
          setSelectedProvider(provider)
          setSelectedService({ id: serviceName || provider.category, name: serviceName || provider.category, category: provider.category })
          setPage('request')
        }}
      />
    )
  }

  if (effectivePage === 'notifications') {
    return (
      <Notifications
        user={user}
        onBack={() =>
          setPage('dashboard')
        }
      />
    )
  }

  if (effectivePage === 'favorites') {
    return (
      <Favorites
        user={user}
        onBack={() =>
          setPage('dashboard')
        }
        onProvider={(provider) => {
          setSelectedProvider(provider)
          setPage('provider')
        }}
      />
    )
  }

  if (effectivePage === 'provider-notifications') {
    return (
      <Notifications
        user={user}
        onBack={() =>
          setPage('provider-dashboard')
        }
      />
    )
  }

  if (effectivePage === 'profile') {
    return (
      <Profile
        user={user}
        onBack={() =>
          setPage('dashboard')
        }
        onLogout={handleLogout}
      />
    )
  }

  if (effectivePage === 'conversations') {
    return (
      <ConversationList
        user={user}
        onBack={() => setPage('dashboard')}
        onChat={(conversation) => {
          const partnerId = conversation.customer_user_id === user?.user_id
            ? conversation.provider_user_id
            : conversation.customer_user_id
          const partnerName = conversation.customer_user_id === user?.user_id
            ? conversation.provider_name
            : conversation.customer_name
          setSelectedConversation(conversation)
          setChatPartner({ user_id: partnerId, name: partnerName })
          setPage('chat')
        }}
      />
    )
  }

  if (effectivePage === 'chat') {
    return (
      <ChatScreen
        user={user}
        conversation={selectedConversation}
        partnerName={chatPartner?.name}
        partnerAvatar={chatPartner?.avatar_url}
        bookingContext={
          selectedConversation?.booking_id
            ? 'Booking #' + selectedConversation.booking_id
            : null
        }
        onBack={() => {
          setSelectedConversation(null)
          setChatPartner(null)
          setPage('conversations')
        }}
      />
    )
  }

  return (
    <Home
      services={dbServices}
      onLogin={() =>
        setPage('login')
      }
      onSignup={() =>
        setPage('signup')
      }
      onProviderSignup={() =>
        setPage('provider-signup')
      }
      onService={goToService}
      user={user}
    />
  )
}

export default App