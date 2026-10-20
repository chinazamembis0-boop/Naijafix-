import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  PHONE_COUNTRIES,
  formatPhoneInput,
  getCallingCode,
  getDefaultCountryIso,
  getCountryOption,
  normalizePhoneNumber,
} from '../phoneNumber.js'
import {
  beginPhoneAuthHandoff,
  endPhoneAuthHandoff,
} from '../phoneAuthHandoff.js'

const RESEND_COOLDOWN_SECONDS = 45
const MAX_VERIFY_ATTEMPTS = 5
const OTP_LENGTH = 6

// Flags are rendered as image assets instead of emoji so they look identical
// on Windows, Android and every other platform (Windows has no flag emoji font
// and shows a blank box or the letters "NG"). The emoji pair is only used if
// the image asset itself cannot be loaded.
function isoToFlagEmoji(iso) {
  const code = String(iso || '').toUpperCase()

  if (!/^[A-Z]{2}$/.test(code)) return ''

  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  )
}

function CountryFlag({ iso }) {
  const [assetFailed, setAssetFailed] = useState(false)
  const code = String(iso || '').toLowerCase()
  const useAsset = /^[a-z]{2}$/.test(code) && !assetFailed

  if (!useAsset) {
    return (
      <span className="country-flag country-flag-emoji" aria-hidden="true">
        {isoToFlagEmoji(iso)}
      </span>
    )
  }

  return (
    <img
      className="country-flag"
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt=""
      aria-hidden="true"
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setAssetFailed(true)}
    />
  )
}

// Supabase creates the auth user when the code is requested, and the
// database trigger seeds a placeholder profile for it. That placeholder is
// the only reliable marker of a genuinely new phone account, so it is used
// instead of any timestamp comparison after verification.
const PLACEHOLDER_PROFILE_NAME = 'Ewizzy user'

function describeSendError(error, mode) {
  const message = String(error?.message || '')

  if (/too many|rate.?limit|requests/i.test(message)) {
    return 'Too many requests. Please wait a moment before requesting another code.'
  }

  if (/signups not allowed|user not found|no account/i.test(message)) {
    return mode === 'login'
      ? 'We could not find an Ewizzy account for that number. Create an account first, or log in with your email address.'
      : 'Phone sign-up is currently unavailable. Please use your email address instead.'
  }

  if (/sms|provider|twilio|messagebird|nexmo|vonage|phone.*enabled|robase|sms.*unavailable/i.test(message)) {
    return 'SMS is temporarily unavailable for this number. Please try another number or use email.'
  }

  if (/invalid|format|valid/i.test(message)) {
    return 'That phone number was not accepted. Check the country and number and try again.'
  }

  return message
    ? 'We could not send a verification code: ' + message
    : 'We could not send a verification code. Please try again.'
}

function describeVerifyError(error, attemptsLeft) {
  const message = String(error?.message || '')

  if (/expired/i.test(message)) {
    return 'That code has expired. Request a new code to continue.'
  }

  if (/too many|rate.?limit/i.test(message)) {
    return 'Too many attempts. Please wait a moment before trying again.'
  }

  if (/token|invalid|expired|not found/i.test(message)) {
    return attemptsLeft > 0
      ? 'That code is incorrect. Check the SMS and try again.'
      : 'Too many incorrect attempts. Request a new code to continue.'
  }

  return message
    ? 'Verification failed: ' + message
    : 'Verification failed. Please try again.'
}

/**
 * Supabase SMS OTP sign-in / sign-up.
 *
 * Uses the official Supabase Auth phone methods only:
 *   1. supabase.auth.signInWithOtp({ phone })
 *   2. supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *
 * No code is ever stored, logged, or verified locally.
 */
export default function PhoneAuth({
  mode = 'login',
  validateBeforeSend,
  onVerified,
}) {
  const [country, setCountry] = useState(getDefaultCountryIso)
  const [number, setNumber] = useState('')
  const [step, setStep] = useState('number')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined

    const timer = setTimeout(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const isInternationalEntry = number.trim().startsWith('+')
  const callingCode = getCallingCode(country)
  const countryOption = getCountryOption(country)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef(null)

  const filteredCountries = PHONE_COUNTRIES.filter((c) => {
    const search = countrySearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(search) ||
      c.callingCode.toString().includes(search) ||
      `+${c.callingCode}`.includes(search) ||
      c.iso.toLowerCase().includes(search)
    )
  })

  useEffect(() => {
    function handleClickOutside(event) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false)
        setCountrySearch('')
      }
    }
    if (countryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [countryDropdownOpen])

  const handleCountrySelect = (iso) => {
    setCountry(iso)
    setCountryDropdownOpen(false)
    setCountrySearch('')
  }

  const sendOtp = async (event) => {
    if (event) event.preventDefault()

    setError('')

    if (cooldown > 0) {
      setError(
        'Please wait ' +
          cooldown +
          ' second' +
          (cooldown === 1 ? '' : 's') +
          ' before requesting another code.'
      )
      return
    }

    const validationMessage = validateBeforeSend ? validateBeforeSend() : null

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    const parsed = normalizePhoneNumber(number, country)

    if (!parsed.ok) {
      setError(
        parsed.reason === 'empty'
          ? 'Please enter your phone number.'
          : 'That phone number does not look valid. Check the country and number and try again.'
      )
      return
    }

    setSending(true)
    setStatus('sending')

    try {
      // No options.data: seeding signup form fields into user metadata would
      // stop the auth trigger from creating the placeholder profile that
      // identifies a new account after verification.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: parsed.e164,
        options: {
          shouldCreateUser: mode !== 'login',
        },
      })

      if (otpError) {
        console.error('Phone OTP request failed:', otpError)
        setStatus('')
        setError(describeSendError(otpError, mode))
        return
      }

      setSentTo(parsed.e164)
      setCode('')
      setAttempts(0)
      setStatus('sent')
      setStep('otp')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (otpError) {
      console.error('Unexpected phone OTP request error:', otpError)
      setStatus('')
      setError('We could not send a verification code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()

    setError('')

    const token = code.replace(/\D/g, '')

    if (token.length !== OTP_LENGTH) {
      setError('Enter the ' + OTP_LENGTH + '-digit code from your SMS.')
      return
    }

    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      setError('Too many incorrect attempts. Request a new code to continue.')
      return
    }

    setVerifying(true)
    setStatus('verifying')
    beginPhoneAuthHandoff()

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: sentTo,
        token,
        type: 'sms',
      })

      if (verifyError) {
        console.error('Phone OTP verification failed:', verifyError)
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        setStatus('')
        setCode('')
        setError(
          describeVerifyError(verifyError, MAX_VERIFY_ATTEMPTS - nextAttempts)
        )
        return
      }

       const authUser = data?.user

       if (!authUser) {
         setStatus('')
         setError('Verification did not return an account. Please try again.')
         return
       }

       // Server-side phone reservation (best-effort; does not block client flow).
       try {
         await supabase.functions.invoke('phone-otp-reserve', {
           body: { phone: sentTo, otp: token },
         })
       } catch (reserveError) {
         console.error('Phone reservation call failed:', reserveError)
       }

      // Only the just-verified user's own profile is readable under RLS, so
      // this is a self-check and never reveals whether another phone exists.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile lookup after phone verification failed:', profileError)
        setStatus('')
        setError(
          'Your code was verified, but we could not load your Ewizzy profile. Please request a new code and try again.'
        )
        return
      }

      const isNewAccount =
        mode === 'signup' &&
        profile?.full_name === PLACEHOLDER_PROFILE_NAME &&
        profile?.email == null &&
        profile?.role === 'customer'

      setStatus('verified')

      if (onVerified) {
        await onVerified(authUser, { phone: sentTo, isNewAccount })
      }
    } catch (verifyError) {
      console.error('Unexpected phone OTP verification error:', verifyError)
      setStatus('')
      setError('We could not verify that code. Please try again.')
    } finally {
      setVerifying(false)
      endPhoneAuthHandoff()
    }
  }

  const changePhoneNumber = () => {
    setStep('number')
    setCode('')
    setError('')
    setStatus('')
    setAttempts(0)
  }

  if (step === 'otp') {
    return (
      <div className="phone-auth">
        <p>
          Enter the {OTP_LENGTH}-digit code we sent by SMS to{' '}
          <strong>{sentTo}</strong>.
        </p>

        <form onSubmit={verifyOtp}>
          <label>Verification code</label>

          <input
            className="auth-otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            placeholder="000000"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
            }
            aria-label="Verification code"
          />

          {status === 'verifying' && (
            <p className="auth-otp-status">Verifying your code...</p>
          )}

          {status === 'verified' && (
            <p className="auth-otp-status">
              Verified. Taking you to your dashboard...
            </p>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-full"
            type="submit"
            disabled={verifying || status === 'verified'}
          >
            {verifying ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>

        <div className="auth-otp-actions">
          <button type="button" onClick={sendOtp} disabled={cooldown > 0}>
            {cooldown > 0
              ? 'Resend code in ' + cooldown + 's'
              : 'Resend code'}
          </button>

          <button type="button" onClick={changePhoneNumber}>
            Change phone number
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="phone-auth">
      <p>
        {mode === 'login'
          ? 'Log in with the phone number verified on your Ewizzy account.'
          : 'Create your account with any international phone number.'}
      </p>

      <form onSubmit={sendOtp}>
        <label>Phone number</label>

<div className="phone-field">
            <div className="phone-country-wrapper" ref={countryDropdownRef}>
              <button
                type="button"
                className="phone-country-select"
                onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={countryDropdownOpen}
                aria-label={
                  countryOption
                    ? `Country: ${countryOption.name}, +${countryOption.callingCode}`
                    : 'Country'
                }
              >
                {countryOption && (
                  <>
                    <CountryFlag iso={countryOption.iso} />
                    <span className="country-code">+{countryOption.callingCode}</span>
                  </>
                )}
                <span className="dropdown-arrow" aria-hidden="true">▼</span>
              </button>

              {countryDropdownOpen && (
                <div className="phone-country-dropdown" role="listbox" aria-label="Select country">
                  <div className="country-picker-head">
                    <div className="country-search-wrap">
                      <input
                        type="search"
                        className="country-search-input"
                        placeholder="Search"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoComplete="off"
                        aria-label="Search country"
                      />
                    </div>
                    <button
                      type="button"
                      className="country-picker-close"
                      onClick={handleCountrySelect.bind(null, country)}
                      aria-label="Close country list"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="country-list" role="listbox">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((option) => (
                        <li
                          key={option.iso}
                          role="option"
                          aria-selected={option.iso === country}
                          className={`country-item ${option.iso === country ? 'selected' : ''}`}
                          onClick={() => handleCountrySelect(option.iso)}
                        >
                          <CountryFlag iso={option.iso} />
                          <span className="country-name">{option.name}</span>
                          <span className="country-code">+{option.callingCode}</span>
                        </li>
                      ))
                    ) : (
                      <li className="country-not-found" role="option" aria-disabled="true">
                        No countries found
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="phone-number-wrap">
            {!isInternationalEntry && callingCode && (
              <span className="phone-calling-code" aria-hidden="true">
                +{callingCode}
              </span>
            )}

            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={isInternationalEntry ? '+44 7700 900123' : '801 234 5678'}
              value={number}
              onChange={(event) => {
                setError('')
                setNumber(formatPhoneInput(event.target.value, country))
              }}
              aria-label="Phone number"
            />
          </div>
        </div>

        <p className="auth-hint">
          {countryOption
            ? countryOption.name + ' (' + countryOption.callingCode + ') selected. You can also type a full international number starting with +.'
            : 'Select your country, or type a full international number starting with +.'}
        </p>

        {status === 'sending' && <p className="auth-otp-status">Sending code...</p>}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="primary-full" type="submit" disabled={sending}>
          {sending ? 'Sending code...' : 'Send verification code'}
        </button>
      </form>
    </div>
  )
}
