import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ID.me OAuth configuration
const IDME_AUTHORIZATION_URL = 'https://api.id.me/oauth/authorize'

interface AuthRequest {
  userId: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json() as AuthRequest

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = Deno.env.get('IDME_CLIENT_ID')
    const redirectUri = Deno.env.get('IDME_REDIRECT_URI')

    if (!clientId || !redirectUri) {
      console.error('[idme-auth] Missing IDME_CLIENT_ID or IDME_REDIRECT_URI')
      return new Response(
        JSON.stringify({ error: 'ID.me integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a random state parameter for CSRF protection
    // State contains: userId + random string for verification
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)
    const randomString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const state = btoa(JSON.stringify({ userId, csrf: randomString }))

    // Build the ID.me authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'military', // Request military verification scope
      state: state,
    })

    const authorizationUrl = `${IDME_AUTHORIZATION_URL}?${params.toString()}`

    console.log(`[idme-auth] Generated authorization URL for user ${userId}`)

    return new Response(
      JSON.stringify({ authorizationUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[idme-auth] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate authorization URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
