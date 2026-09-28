// NaijaFix: Robase OTP integration for phone authentication.
// Server-side only. Never exposes the Robase API key to the client.
// Uses Supabase service-role key to create/confirm users after Robase verification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ROBASE_API_URL = 'https://api.robase.dev/v1/otp'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getRobaseApiKey(): string {
  const key = Deno.env.get('ROBASE_API_KEY')
  if (!key) {
    throw new Error('ROBASE_API_KEY is not configured')
  }
  return key
}

function getServiceRoleKey(): string {
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
  const serviceKey =
    secretKeys.default ||
    secretKeys.SUPABASE_SERVICE_KEY ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_KEY') ||
    ''
  if (!serviceKey) {
    throw new Error('Service role key is not configured')
  }
  return serviceKey
}

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('0')) {
    return '+234' + trimmed.slice(1)
  }
  if (trimmed.startsWith('234')) {
    return '+' + trimmed
  }
  return trimmed
}

async function callRobaseSend(phone: string): Promise<{ otp_id: string }> {
  const response = await fetch(`${ROBASE_API_URL}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getRobaseApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phone,
      code_length: 6,
      ttl_seconds: 600,
    }),
  })

  if (!response.ok) {
    let message = `Robase send failed: ${response.status}`
    try {
      const errorData = await response.json()
      message = errorData?.message || message
    } catch {
      // Ignore JSON parse errors for non-OK responses
    }
    throw new Error(message)
  }

  const data = await response.json()
  const otpId = data?.otp_id ?? data?.id
  if (!otpId) {
    throw new Error('Robase did not return an OTP ID')
  }
  return { otp_id: otpId }
}

async function callRobaseVerify(otpId: string, code: string): Promise<void> {
  const response = await fetch(`${ROBASE_API_URL}/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getRobaseApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      otp_id: otpId,
      code,
    }),
  })

  if (!response.ok) {
    let message = `Robase verify failed: ${response.status}`
    try {
      const errorData = await response.json()
      message = errorData?.message || message
    } catch {
      // Ignore JSON parse errors for non-OK responses
    }
    if (message.toLowerCase().includes('expired')) {
      throw new Error('OTP_EXPIRED:' + message)
    }
    if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('incorrect')) {
      throw new Error('OTP_INVALID:' + message)
    }
    throw new Error(message)
  }

  await response.json()
}

async function getOrCreateUserByPhone(supabaseAdmin: any, phone: string, shouldCreateUser: boolean) {
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`)
  }

  const normalizedPhone = phone.startsWith('+') ? phone : '+' + phone.replace(/^\+/, '')
  const existingUser = users.users.find((u: any) => u.phone === normalizedPhone)

  if (existingUser) {
    if (!existingUser.phone_confirmed_at && shouldCreateUser) {
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { phone_confirm: true }
      )
      if (updateError) {
        throw new Error(`Failed to confirm phone: ${updateError.message}`)
      }
      return updated.user
    }
    return existingUser
  }

  if (!shouldCreateUser) {
    throw new Error('USER_NOT_FOUND:No account found for this phone number')
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: normalizedPhone,
    phone_confirm: true,
    user_metadata: { phone: normalizedPhone },
  })
  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`)
  }
  return created.user
}

async function generateSession(supabaseAdmin: any, userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    user_id: userId,
  })
  if (error || !data?.properties?.action_link) {
    throw new Error('Failed to generate session link')
  }
  return data.properties.action_link
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const action = body?.action
  const phone = body?.phone
  const otpId = body?.otp_id
  const code = body?.code
  const shouldCreateUser = body?.shouldCreateUser !== false

  if (!action || !['send', 'verify'].includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid action. Use "send" or "verify"' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (action === 'send') {
      if (!phone) {
        return new Response(JSON.stringify({ error: 'Phone number is required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const normalizedPhone = normalizePhoneNumber(phone)
      const result = await callRobaseSend(normalizedPhone)

      return new Response(JSON.stringify({ ok: true, otp_id: result.otp_id }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify') {
      if (!otpId || !code) {
        return new Response(JSON.stringify({ error: 'otp_id and code are required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      await callRobaseVerify(otpId, code)

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        getServiceRoleKey()
      )

      const phoneForUser = body?.phone
      if (!phoneForUser) {
        return new Response(JSON.stringify({ error: 'Phone number is required for verification' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const normalizedPhone = normalizePhoneNumber(phoneForUser)
      const user = await getOrCreateUserByPhone(supabaseAdmin, normalizedPhone, shouldCreateUser)

      const sessionLink = await generateSession(supabaseAdmin, user.id)

      return new Response(JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
        },
        session_link: sessionLink,
        is_new_account: body?.isNewAccount === true || !user.phone_confirmed_at,
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('robase-otp error:', message)

    let status = 500
    let errorCode = 'SERVER_ERROR'

    if (message.startsWith('OTP_EXPIRED:')) {
      status = 400
      errorCode = 'OTP_EXPIRED'
    } else if (message.startsWith('OTP_INVALID:')) {
      status = 400
      errorCode = 'OTP_INVALID'
    } else if (message.startsWith('USER_NOT_FOUND:')) {
      status = 404
      errorCode = 'USER_NOT_FOUND'
    } else if (message.includes('ROBASE_API_KEY') || message.includes('Service role key')) {
      status = 500
      errorCode = 'CONFIG_ERROR'
    }

    return new Response(JSON.stringify({ error: message, code: errorCode }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})