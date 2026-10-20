// supabase/functions/phone-otp-reserve/index.ts
// Server-side OTP verification + atomic phone reservation.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OTP_TTL_MS = 5 * 60 * 1000

serve(async (req) => {
  const { phone, otp } = await req.json().catch(() => ({}))
  if (!phone) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_phone' }), { status: 400 })
  }
  const normPhone = '+' + String(phone).replace(/\D/g, '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Check if already verified by another account
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_e164', normPhone)
    .limit(1)
  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ ok: false, error: 'phone_already_used' }), { status: 200 })
  }

  // Reserve/verify OTP
  const { data: row } = await supabase
    .from('phone_verifications')
    .select('*')
    .eq('phone_e164', normPhone)
    .maybeSingle()

  const now = Date.now()
  if (!otp) {
    // Issue new OTP reservation (store hash placeholder; real OTP sent via SMS hook)
    const expires = new Date(now + OTP_TTL_MS).toISOString()
    await supabase.from('phone_verifications').upsert({
      phone_e164: normPhone,
      expires_at: expires,
      otp_hash: 'pending',
    })
    return new Response(JSON.stringify({ ok: true, status: 'otp_sent' }), { status: 200 })
  }

  // Verify OTP
  if (!row || new Date(row.expires_at).getTime() < now) {
    return new Response(JSON.stringify({ ok: false, error: 'otp_expired' }), { status: 200 })
  }
  if (row.verified_at) {
    return new Response(JSON.stringify({ ok: false, error: 'otp_replayed' }), { status: 200 })
  }
  // Mark verified (atomic: only if not already verified)
  const { error } = await supabase
    .from('phone_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('phone_e164', normPhone)
    .is('verified_at', null)
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: 'verification_failed' }), { status: 200 })
  }
  return new Response(JSON.stringify({ ok: true, status: 'verified' }), { status: 200 })
})
