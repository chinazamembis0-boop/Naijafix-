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
const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000

const ROBASE_OTP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robase-otp`

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

  const otpRequestedAt = useRef(0)
  const otpIdRef = useRef(null)

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
    otpRequestedAt.current = Date.now()

    try {
      const response = await fetch(ROBASE_OTP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'send',
          phone: parsed.e164,
          shouldCreateUser: mode !== 'login',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Phone OTP request failed:', data)
        setStatus('')
        setError(describeSendError(data, mode))
        return
      }

      if (!data.otp_id) {
        console.error('No OTP ID returned:', data)
        setStatus('')
        setError('We could not send a verification code. Please try again.')
        return
      }

      setSentTo(parsed.e164)
      setCode('')
      setAttempts(0)
      setStatus('sent')
      setStep('otp')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      // Store otp_id in a ref for verification
      otpIdRef.current = data.otp_id
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

    const otpId = otpIdRef.current
    if (!otpId) {
      setError('Verification session expired. Please request a new code.')
      return
    }

    setVerifying(true)
    setStatus('verifying')
    beginPhoneAuthHandoff()

    try {
      const response = await fetch(ROBASE_OTP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'verify',
          otp_id: otpId,
          code: token,
          phone: sentTo,
          shouldCreateUser: mode !== 'login',
          isNewAccount: mode !== 'login',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Phone OTP verification failed:', data)
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        setStatus('')
        setCode('')
        setError(
          describeVerifyError({ message: data.error || data.message }, MAX_VERIFY_ATTEMPTS - nextAttempts)
        )
        return
      }

      const authUser = data.user

      if (!authUser) {
        setStatus('')
        setError('Verification did not return an account. Please try again.')
        return
      }

      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (sessionError) {
          console.error('Failed to set Supabase session:', sessionError)
        }
      }

      setStatus('verified')

      const createdAt = authUser.created_at
        ? new Date(authUser.created_at).getTime()
        : 0
      const isNewAccount =
        mode !== 'login' &&
        createdAt > 0 &&
        createdAt >= otpRequestedAt.current - NEW_ACCOUNT_WINDOW_MS

      if (onVerified) {
        await onVerified(authUser, { phone: sentTo, isNewAccount: data.is_new_account || isNewAccount })
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
    otpIdRef.current = null
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
                aria-label="Country"
              >
                {countryOption && (
                  <>
                    <span className="country-flag" aria-hidden="true">🏳️</span>
                    <span>{countryOption.name}</span>
                    <span className="country-code">+{countryOption.callingCode}</span>
                  </>
                )}
                <span className="dropdown-arrow" aria-hidden="true">▼</span>
              </button>

              {countryDropdownOpen && (
                <div className="phone-country-dropdown" role="listbox" aria-label="Select country">
                  <div className="country-search-wrap">
                    <input
                      type="search"
                      className="country-search-input"
                      placeholder="Search country"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoComplete="off"
                      aria-label="Search country"
                    />
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
                          <span className="country-flag" aria-hidden="true">🏳️</span>
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
