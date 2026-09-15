// NaijaFix Phase 2B-2 Step 2: Paystack TEST-mode transaction initialization.
// Server-side only. Never exposes the secret key to the client.
// Amount is read from the database; the client never supplies it.
//
// Two Supabase clients are used intentionally:
//   1. USER client (ANON key + user token) -> auth.getUser(), payments
//      and bookings SELECTs. RLS enforces customer ownership on reads.
//   2. SERVICE client (service-role key) -> initialize_payment_reference()
//      RPC. This is the ONLY privileged write path; it is service_role-
//      only so a customer cannot forge a Paystack reference.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const bookingId = body?.booking_id
  const idempotencyKey = body?.idempotency_key
  if (!bookingId || !idempotencyKey) {
    return new Response(JSON.stringify({ error: 'booking_id and idempotency_key are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const { data: payment, error: paymentError } = await supabaseUser
    .from('payments')
    .select('id, booking_id, customer_user_id, provider_user_id, amount, currency, status, idempotency_key, paystack_reference')
    .eq('booking_id', bookingId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (paymentError) {
    return new Response(JSON.stringify({ error: 'Failed to load payment' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  if (!payment) {
    return new Response(JSON.stringify({ error: 'No payment initiated for this booking' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  if (payment.customer_user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  if (payment.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Payment already progressed past pending', status: payment.status }), { status: 409, headers: { 'Content-Type': 'application/json' } })
  }

  const { data: booking, error: bookingError } = await supabaseUser
    .from('bookings')
    .select('id, status, customer_user_id, provider_user_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (bookingError || !booking || booking.customer_user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  if (!['accepted', 'provider on the way', 'in progress', 'completed'].includes(booking.status)) {
    return new Response(JSON.stringify({ error: 'Booking is not eligible for payment' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const amountNgn = Number(payment.amount)
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid payment amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  const amountSubunit = Math.round(amountNgn * 100)

  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Payment provider is not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const reference = `naijafix_${payment.id}_${Date.now()}`
  const email = user.email || `${user.id}@example.com`

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountSubunit,
      email,
      reference,
      currency: payment.currency || 'NGN',
      callback_url: `${Deno.env.get('SITE_URL') || ''}/booking/${bookingId}/payment/return`
    })
  })

  const paystackData = await paystackRes.json()
  if (!paystackRes.ok || !paystackData.status || !paystackData.data) {
    return new Response(JSON.stringify({ error: 'Payment initialization failed', detail: paystackData }), { status: 502, headers: { 'Content-Type': 'application/json' } })
  }

  // Store the Paystack reference/access code through the privileged
  // service_role-only RPC. This keeps the write path out of RLS reach
  // and prevents a customer from forging a reference. The payment
  // status stays 'pending'; only confirm_payment() may move it to
  // 'authorized' after server-side Paystack verification.
  //
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
    return new Response(JSON.stringify({ error: 'Server-side credentials are not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey
  )

  const { data: result, error: rpcError } = await supabaseService.rpc(
    'initialize_payment_reference',
    {
      p_payment_id: payment.id,
      p_paystack_reference: paystackData.data.reference,
      p_paystack_access_code: paystackData.data.access_code
    }
  )

  if (rpcError) {
    return new Response(JSON.stringify({ error: 'Failed to store Paystack reference', detail: rpcError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({
    ok: true,
    payment_id: result.payment_id,
    reference: result.paystack_reference,
    access_code: result.paystack_access_code,
    authorization_url: paystackData.data.authorization_url,
    amount_ngn: amountNgn,
    currency: payment.currency,
    status: result.status
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
