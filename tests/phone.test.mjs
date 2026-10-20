import { normalizePhoneE164 } from '../src/utils/phone.js'

test('normalizePhoneE164 strips non-digits and adds +', () => {
  expect(normalizePhoneE164('(234) 801-234-5678')).toBe('+2348012345678')
  expect(normalizePhoneE164(null)).toBeNull()
  expect(normalizePhoneE164('')).toBeNull()
})
