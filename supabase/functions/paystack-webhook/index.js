// NaijaFix Phase 2B-2 Step 2: Paystack TEST-mode webhook receiver.
// Server-side only. Validates HMAC SHA512 signature, verifies the
// transaction server-side, and updates payment state through the
// protected confirm_payment() RPC. Never trusts amount/status blindly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') || Deno.env.get('PAYSTACK_SECRET_KEY')

async function hmacSha512(message, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('x-paystack-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 401 })
  }

  const rawBody = await req.text()
  if (!WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const expected = await hmacSha512(rawBody, WEBHOOK_SECRET)
  if (expected !== signature) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event
  try { event = JSON.parse(rawBody) } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const eventType = event?.event
  const data = event?.data
  const reference = data?.reference
if (!reference) {
    return new Response('OK: no reference', { status: 200 })
  }

  // The service-role key is read from the current Supabase server-side
  // secret-key mechanism. SUPABASE_SECRET_KEYS is a JSON object injected
  // by the Supabase Edge Functions runtime; the standard named secret is
  // "default". Legacy/custom fallbacks are retained only for compatibility
  // with manually configured secrets. The key is never exposed to the
  // browser, never written to source code, and never committed to git.
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
  const serviceKey =
    secretKeys.default ||
    secretKeys.SUPABASE_SERVICE_KEY ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_KEY') ||
    ''
  if (!serviceKey) {
    return new Response('Server-side credentials are not configured', { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey
  )

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, booking_id, customer_user_id, amount, currency, status, paystack_reference')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (paymentError || !payment) {
    return new Response('OK: unknown reference', { status: 200 })
  }

  if (payment.status === 'authorized' || payment.status === 'released' || payment.status === 'refunded') {
    return new Response('OK: already advanced', { status: 200 })
  }

  if (eventType === 'charge.success') {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` }
    })
    const paystackData = await paystackRes.json()
    const tx = paystackData?.data
    if (!tx || tx.reference !== reference) {
      return new Response('OK: verification failed', { status: 200 })
    }
    const expectedSubunit = Math.round(Number(payment.amount) * 100)
    if (Number(tx.amount) !== expectedSubunit) {
      return new Response('OK: amount mismatch', { status: 200 })
    }
    const authorized = tx.status === 'success'
    await supabase.rpc('confirm_payment', {
      p_booking_id: payment.booking_id,
      p_paystack_reference: reference,
      p_authorized: authorized
    })
    return new Response('OK', { status: 200 })
  }

  if (eventType === 'charge.failed') {
    await supabase.rpc('confirm_payment', {
      p_booking_id: payment.booking_id,
      p_paystack_reference: reference,
      p_authorized: false
    })
    return new Response('OK', { status: 200 })
  }

  return new Response('OK: unhandled event', { status: 200 })
}
