// supabase/functions/duplicate-account-check/index.ts
// Prepared (not deployed): server-side duplicate account guard.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, phone } = await req.json().catch(() => ({}))
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Canonical email
  const normEmail = email ? String(email).trim().toLowerCase() : null
  // Canonical phone (digits only with leading +)
  const normPhone = phone ? '+' + String(phone).replace(/\D/g, '') : null

  // Check email uniqueness (case-insensitive)
  if (normEmail) {
    const { data } = await supabase.from('profiles').select('id').ilike('email', normEmail).limit(1)
    if (data && data.length > 0) {
      return new Response(JSON.stringify({ allowed: false, reason: 'duplicate_email' }), { status: 200 })
    }
  }
  // Check phone uniqueness
  if (normPhone) {
    const { data } = await supabase.from('profiles').select('id').eq('phone_e164', normPhone).limit(1)
    if (data && data.length > 0) {
      return new Response(JSON.stringify({ allowed: false, reason: 'duplicate_phone' }), { status: 200 })
    }
  }
  return new Response(JSON.stringify({ allowed: true }), { status: 200 })
})
