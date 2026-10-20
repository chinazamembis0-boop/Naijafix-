export function normalizePhoneE164(input) {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  if (!digits) return null
  // Assume input without country code is invalid; caller must provide full number.
  return '+' + digits
}
