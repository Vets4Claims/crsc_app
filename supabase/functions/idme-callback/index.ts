import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

// ID.me OAuth endpoints
const IDME_TOKEN_URL = 'https://api.id.me/oauth/token'
const IDME_ATTRIBUTES_URL = 'https://api.id.me/api/public/v3/attributes.json'

// Create PostgreSQL client for Google Cloud
async function getDbClient(): Promise<Client> {
  const hostname = Deno.env.get('DB_HOST')!
  const port = parseInt(Deno.env.get('DB_PORT') || '5432')
  const user = Deno.env.get('DB_USER')!
  const password = Deno.env.get('DB_PASSWORD')!
  const database = Deno.env.get('DB_NAME')!

  const client = new Client({
    hostname,
    port,
    user,
    password,
    database,
    tls: {
      enabled: true,
      enforce: true,
      caCertificates: [],
    },
  })

  await client.connect()
  return client
}

interface StatePayload {
  userId: string
  csrf: string
}

interface IdmeTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

interface IdmeAttribute {
  handle: string
  name: string
  value: string
}

interface IdmeAttributesResponse {
  attributes: IdmeAttribute[]
  status: IdmeAttribute[]
}

serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://crsc.vets4claims.com'

  // Helper to redirect with error
  const redirectWithError = (message: string) => {
    const redirectUrl = `${frontendUrl}/verify-veteran?error=${encodeURIComponent(message)}`
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    })
  }

  // Helper to redirect with success
  const redirectWithSuccess = () => {
    const redirectUrl = `${frontendUrl}/verify-veteran?success=true`
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    })
  }

  let db: Client | null = null

  try {
    // Handle OAuth errors from ID.me
    if (error) {
      console.error(`[idme-callback] OAuth error: ${error} - ${errorDescription}`)
      return redirectWithError(errorDescription || 'Verification was cancelled or failed')
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[idme-callback] Missing code or state parameter')
      return redirectWithError('Invalid callback parameters')
    }

    // Decode and validate state
    let statePayload: StatePayload
    try {
      statePayload = JSON.parse(atob(state))
      if (!statePayload.userId || !statePayload.csrf) {
        throw new Error('Invalid state payload')
      }
    } catch (e) {
      console.error('[idme-callback] Invalid state parameter:', e)
      return redirectWithError('Invalid state parameter')
    }

    const { userId } = statePayload

    // Get ID.me credentials
    const clientId = Deno.env.get('IDME_CLIENT_ID')
    const clientSecret = Deno.env.get('IDME_CLIENT_SECRET')
    const redirectUri = Deno.env.get('IDME_REDIRECT_URI')

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[idme-callback] Missing ID.me configuration')
      return redirectWithError('Server configuration error')
    }

    // Connect to database
    db = await getDbClient()

    // Log verification attempt
    await db.queryObject`
      INSERT INTO verification_log (user_id, provider, status, created_at)
      VALUES (${userId}, 'idme', 'initiated', NOW())
    `

    // Exchange authorization code for access token
    console.log('[idme-callback] Exchanging code for token...')
    const tokenResponse = await fetch(IDME_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[idme-callback] Token exchange failed:', errorText)

      await db.queryObject`
        INSERT INTO verification_log (user_id, provider, status, error_message, created_at)
        VALUES (${userId}, 'idme', 'failed', ${`Token exchange failed: ${errorText}`}, NOW())
      `

      return redirectWithError('Failed to verify with ID.me')
    }

    const tokenData: IdmeTokenResponse = await tokenResponse.json()
    console.log('[idme-callback] Token exchange successful')

    // Fetch user attributes from ID.me
    console.log('[idme-callback] Fetching user attributes...')
    const attributesResponse = await fetch(IDME_ATTRIBUTES_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!attributesResponse.ok) {
      const errorText = await attributesResponse.text()
      console.error('[idme-callback] Attributes fetch failed:', errorText)

      await db.queryObject`
        INSERT INTO verification_log (user_id, provider, status, error_message, created_at)
        VALUES (${userId}, 'idme', 'failed', ${`Attributes fetch failed: ${errorText}`}, NOW())
      `

      return redirectWithError('Failed to retrieve verification data')
    }

    const attributesData: IdmeAttributesResponse = await attributesResponse.json()
    console.log('[idme-callback] Attributes received:', JSON.stringify(attributesData.status))

    // Extract military status from attributes
    // ID.me returns status array with verification statuses
    let militaryStatus: string | null = null
    let idmeUuid: string | null = null
    let isVerifiedVeteran = false

    // Look for military-related status
    for (const status of attributesData.status || []) {
      if (status.handle === 'uuid') {
        idmeUuid = status.value
      }
      // Check for military verification statuses
      if (status.handle === 'military' || status.handle === 'veteran') {
        if (status.value === 'true' || status.value === 'verified') {
          isVerifiedVeteran = true
          militaryStatus = status.handle
        }
      }
    }

    // Also check attributes array
    for (const attr of attributesData.attributes || []) {
      if (attr.handle === 'uuid' && !idmeUuid) {
        idmeUuid = attr.value
      }
      if (attr.handle === 'group') {
        // ID.me group affiliations (e.g., 'military', 'veteran')
        if (attr.value.toLowerCase().includes('veteran') || attr.value.toLowerCase().includes('military')) {
          isVerifiedVeteran = true
          militaryStatus = attr.value
        }
      }
    }

    if (isVerifiedVeteran) {
      // Update user as verified
      await db.queryObject`
        UPDATE users SET
          veteran_verified = TRUE,
          veteran_verified_at = NOW(),
          idme_uuid = ${idmeUuid},
          military_status = ${militaryStatus},
          updated_at = NOW()
        WHERE id = ${userId}
      `

      // Log successful verification
      await db.queryObject`
        INSERT INTO verification_log (user_id, provider, status, military_status, idme_uuid, created_at)
        VALUES (${userId}, 'idme', 'success', ${militaryStatus}, ${idmeUuid}, NOW())
      `

      console.log(`[idme-callback] User ${userId} verified as veteran`)
      await db.end()
      return redirectWithSuccess()
    } else {
      // User verified with ID.me but not as veteran/military
      await db.queryObject`
        INSERT INTO verification_log (user_id, provider, status, error_message, idme_uuid, created_at)
        VALUES (${userId}, 'idme', 'failed', 'No military/veteran status found', ${idmeUuid}, NOW())
      `

      console.log(`[idme-callback] User ${userId} verified but not as veteran`)
      await db.end()
      return redirectWithError('Your ID.me account does not have verified military or veteran status. Please ensure you have completed military verification on ID.me.')
    }

  } catch (error) {
    console.error('[idme-callback] Unexpected error:', error)

    if (db) {
      try {
        await db.end()
      } catch {
        // Ignore close errors
      }
    }

    return redirectWithError('An unexpected error occurred during verification')
  }
})
