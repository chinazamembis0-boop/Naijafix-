/**
 * Coordination between the phone OTP screens and the app's generic session
 * bootstrap.
 *
 * Supabase dispatches SIGNED_IN the instant verifyOtp succeeds, which is before
 * a phone sign-up has written the real Ewizzy profile (the auth trigger has only
 * seeded a placeholder row). The app's onAuthStateChange bootstrap consults
 * this flag and stands down for that window, so it cannot overwrite the finished
 * profile with the placeholder - which would otherwise show a placeholder name
 * and downgrade a brand new provider to the customer dashboard.
 *
 * Email/password flows do not set this flag, so their behaviour is unchanged.
 */

let phoneAuthHandoffActive = false

export function beginPhoneAuthHandoff() {
  phoneAuthHandoffActive = true
}

export function endPhoneAuthHandoff() {
  phoneAuthHandoffActive = false
}

export function isPhoneAuthHandoffActive() {
  return phoneAuthHandoffActive
}
