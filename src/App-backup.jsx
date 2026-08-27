import { useState } from 'react'
import './App.css'

const services = [
  { name: 'Plumbing', icon: '🔧' },
  { name: 'Electrical', icon: '⚡' },
  { name: 'Cleaning', icon: '🧹' },
  { name: 'AC Repair', icon: '❄️' },
  { name: 'Generator', icon: '🔌' },
  { name: 'Phone Repair', icon: '📱' },
  { name: 'Computer Repair', icon: '💻' },
  { name: 'Carpentry', icon: '🪚' },
]

const providers = [
  {
    name: 'Mike Plumbing Services',
    service: 'Plumbing',
    location: 'Lagos',
    rating: 4.9,
  },
  {
    name: 'Bright Spark Electrical',
    service: 'Electrical',
    location: 'Lagos',
    rating: 4.8,
  },
  {
    name: 'CleanHome Nigeria',
    service: 'Cleaning',
    location: 'Abuja',
    rating: 4.7,
  },
]

function Home({ onLogin }) {
  const [search, setSearch] = useState('')

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">N</div>
          <div>
            <h1>NaijaFix</h1>
            <span>Local people. Trusted services.</span>
          </div>
        </div>

        <button className="login-button" onClick={onLogin}>
          Log in
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="welcome">🇳🇬 Built for Nigeria</span>

            <h2>
              Find trusted
              <br />
              <strong>local services</strong>
            </h2>

            <p>
              Connect with reliable service providers around you.
              Get the help you need, when you need it.
            </p>

            <div className="search-box">
              <span>🔍</span>

              <input
                type="text"
                placeholder="What service do you need?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <button>Search</button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <span className="section-label">EXPLORE</span>
              <h3>Popular services</h3>
            </div>
          </div>

          <div className="service-grid">
            {filteredServices.map((service) => (
              <button className="service-card" key={service.name}>
                <div className="service-icon">{service.icon}</div>
                <span>{service.name}</span>
              </button>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <p className="no-results">
              No service found. Try another search.
            </p>
          )}
        </section>

        <section className="section providers-section">
          <div className="section-heading">
            <div>
              <span className="section-label">NEAR YOU</span>
              <h3>Trusted service providers</h3>
            </div>
          </div>

          <div className="provider-grid">
            {providers.map((provider) => (
              <article className="provider-card" key={provider.name}>
                <div className="provider-avatar">
                  {provider.name.charAt(0)}
                </div>

                <div className="provider-info">
                  <div className="verified">✓ Verified</div>

                  <h4>{provider.name}</h4>

                  <p>{provider.service}</p>

                  <span>📍 {provider.location}</span>
                </div>

                <div className="rating">
                  ⭐ {provider.rating}
                </div>

                <button className="profile-button">
                  View profile
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="cta">
          <div>
            <span className="section-label">
              FOR SERVICE PROVIDERS
            </span>

            <h3>Want more customers?</h3>

            <p>
              List your business on NaijaFix and connect with people
              looking for your services.
            </p>
          </div>

          <button className="provider-button">
            Join as a provider →
          </button>
        </section>
      </main>

      <footer>
        <strong>NaijaFix</strong>
        <span>Local people. Trusted services.</span>
      </footer>
    </div>
  )
}

function Login({ onBack, onSignup }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon login-logo">N</div>

        <h2>Welcome to NaijaFix</h2>

        <p>Log in to find trusted local services.</p>

        <label>Email address</label>

        <input
          type="email"
          placeholder="Enter your email"
        />

        <label>Password</label>

        <input
          type="password"
          placeholder="Enter your password"
        />

        <button className="login-submit">
          Log in
        </button>

        <p className="signup-text">
          Don't have an account?{' '}
          <button onClick={onSignup}>
            Sign up
          </button>
        </p>

        <button className="back-button" onClick={onBack}>
          ← Back to NaijaFix
        </button>
      </div>
    </div>
  )
}

function Signup({ onBack, onLogin }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    accountType: 'Customer',
  })

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.password
    ) {
      alert('Please fill in all required fields.')
      return
    }

    localStorage.setItem(
      'naijafixUser',
      JSON.stringify(form)
    )

    alert('Welcome to NaijaFix!')

    onLogin()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon login-logo">N</div>

        <h2>Create your account</h2>

        <p>
          Join NaijaFix and find trusted local services.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Full name</label>

          <input
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
          />

          <label>Email address</label>

          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
          />

          <label>Phone number</label>

          <input
            name="phone"
            type="tel"
            placeholder="0800 000 0000"
            value={form.phone}
            onChange={handleChange}
          />

          <label>Password</label>

          <input
            name="password"
            type="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
          />

          <label>Account type</label>

          <select
            className="account-select"
            name="accountType"
            value={form.accountType}
            onChange={handleChange}
          >
            <option value="Customer">Customer</option>
            <option value="Service Provider">
              Service Provider
            </option>
          </select>

          <button
            type="submit"
            className="login-submit"
          >
            Create account
          </button>
        </form>

        <p className="signup-text">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onLogin}
          >
            Log in
          </button>
        </p>

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to NaijaFix
        </button>
      </div>
    </div>
  )
}

function App() {
  const [page, setPage] = useState('home')

  if (page === 'login') {
    return (
      <Login
        onBack={() => setPage('home')}
        onSignup={() => setPage('signup')}
      />
    )
  }

  if (page === 'signup') {
    return (
      <Signup
        onBack={() => setPage('home')}
        onLogin={() => setPage('login')}
      />
    )
  }

  return (
    <Home
      onLogin={() => setPage('login')}
    />
  )
}

export default App