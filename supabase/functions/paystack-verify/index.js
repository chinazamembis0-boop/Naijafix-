// NaijaFix Phase 2B-2 Step 2: Paystack TEST-mode transaction verification.
// Server-side only. Never exposes the secret key to the client.
// The verified amount is checked against the authoritative payment row.
//
// Two Supabase clients are used intentionally:
//   1. ANON client (user token)  -> auth.getUser() and payments SELECT
//      (RLS enforces customer ownership on reads)
//   2. SERVICE client (service_role key) -> confirm_payment() RPC
//      (confirm_payment is service_role-only; the service client
//      bypasses the authenticated GRANT so the server-side layer can
//      record the external Paystack capture event)
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

  const reference = body?.reference
  if (!reference) {
    return new Response(JSON.stringify({ error: 'reference is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const { data: payment, error: paymentError } = await supabaseUser
    .from('payments')
    .select('id, booking_id, customer_user_id, provider_user_id, amount, currency, status, paystack_reference')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (paymentError) {
    return new Response(JSON.stringify({ error: 'Failed to load payment' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  if (!payment) {
    return new Response(JSON.stringify({ error: 'Payment not found for reference' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  if (payment.customer_user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Payment provider is not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` }
  })
  const paystackData = await paystackRes.json()

  if (!paystackRes.ok || !paystackData.status || !paystackData.data) {
    return new Response(JSON.stringify({ error: 'Paystack verification failed', detail: paystackData }), { status: 502, headers: { 'Content-Type': 'application/json' } })
  }

  const tx = paystackData.data
  if (tx.reference !== reference) {
    return new Response(JSON.stringify({ error: 'Reference mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const expectedSubunit = Math.round(Number(payment.amount) * 100)
  if (Number(tx.amount) !== expectedSubunit) {
    return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  if (tx.currency && tx.currency !== (payment.currency || 'NGN')) {
    return new Response(JSON.stringify({ error: 'Currency mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const authorized = tx.status === 'success'

  // confirm_payment() is service_role-only. Use the service-role client
  // (current SUPABASE_SECRET_KEYS server-side secret-key mechanism) so the
  // Edge Function can record the external Paystack capture event. The
  // standard named secret is "default"; legacy fallbacks are retained only
  // for compatibility. The service key is never exposed to the frontend
  // and never written to source code or git.
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

  const { data: result, error: rpcError } = await supabaseService.rpc('confirm_payment', {
    p_booking_id: payment.booking_id,
    p_paystack_reference: reference,
    p_authorized: authorized
  })

  if (rpcError) {
    return new Response(JSON.stringify({ error: 'Failed to confirm payment', detail: rpcError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({
    ok: true,
    payment_id: payment.id,
    status: result?.status,
    authorized,
    reference
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
