import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js'

/**
 * International phone-number helpers.
 *
 * Ewizzy is international, so phone numbers are never assumed to be Nigerian.
 * Country calling codes come from the shared libphonenumber metadata, and every
 * number that reaches Supabase Auth or the profiles table is normalised to
 * E.164 (for example "+2348012345678", "+447700900123", "+12025550123").
 */

const FALLBACK_COUNTRY = 'NG'

let regionNameFormatter = null

function getRegionNameFormatter() {
  if (regionNameFormatter !== null) return regionNameFormatter

  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      regionNameFormatter = new Intl.DisplayNames(['en'], { type: 'region' })
    } else {
      regionNameFormatter = false
    }
  } catch {
    regionNameFormatter = false
  }

  return regionNameFormatter
}

function getCountryName(iso) {
  const formatter = getRegionNameFormatter()

  if (!formatter) return iso

  try {
    return formatter.of(iso) || iso
  } catch {
    return iso
  }
}

export const PHONE_COUNTRIES = getCountries()
  .map((iso) => ({
    iso,
    name: getCountryName(iso),
    callingCode: getCountryCallingCode(iso),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const countryByIso = new Map(PHONE_COUNTRIES.map((country) => [country.iso, country]))

export function getCountryOption(iso) {
  return countryByIso.get(iso) || null
}

export function getCallingCode(iso) {
  const option = countryByIso.get(iso)
  return option ? option.callingCode : ''
}

/**
 * Best-effort default selection based on the visitor's locale. This is only a
 * display default in the country picker; the number itself is always parsed
 * against the country the user actually selects.
 */
export function getDefaultCountryIso() {
  try {
    const locale = typeof navigator !== 'undefined' ? navigator.language : ''
    const region = locale ? new Intl.Locale(locale).region : null

    if (region && countryByIso.has(region)) return region
  } catch {
    // fall through to the default below
  }

  return FALLBACK_COUNTRY
}

/**
 * Live formatting while the user types. Values that already start with "+" are
 * treated as full international numbers and are left alone.
 */
export function formatPhoneInput(value, countryIso) {
  const raw = String(value || '')

  if (raw.trim().startsWith('+')) return raw

  if (!raw) return ''

  try {
    return new AsYouType(countryIso).input(raw)
  } catch {
    return raw
  }
}

/**
 * Validate a user-entered number and normalise it to E.164.
 *
 * Accepts either a national number interpreted against the selected country or
 * a number already written in international form ("+44 7700 900123").
 */
export function normalizePhoneNumber(value, countryIso) {
  const raw = String(value || '').trim()

  if (!raw) {
    return { ok: false, reason: 'empty' }
  }

  const fallbackCountry = countryByIso.has(countryIso) ? countryIso : FALLBACK_COUNTRY

  let parsed

  try {
    parsed = parsePhoneNumberFromString(raw, fallbackCountry)
  } catch {
    parsed = null
  }

  if (!parsed) {
    return { ok: false, reason: 'invalid' }
  }

  if (!parsed.isValid()) {
    return {
      ok: false,
      reason: 'invalid',
      countryIso: parsed.country || fallbackCountry,
    }
  }

  return {
    ok: true,
    e164: parsed.number,
    countryIso: parsed.country || fallbackCountry,
    callingCode: parsed.countryCallingCode,
    national: parsed.formatNational(),
    international: parsed.formatInternational(),
  }
}

/**
 * Best-effort international display for a stored number. Anything that cannot
 * be parsed (legacy local formats) is returned untouched so the app never
 * renders a misleading reformatted value.
 */
export function formatPhoneForDisplay(value, countryIso) {
  const raw = String(value || '').trim()

  if (!raw) return ''

  const result = normalizePhoneNumber(raw, countryIso || FALLBACK_COUNTRY)

  return result.ok ? result.international : raw
}
