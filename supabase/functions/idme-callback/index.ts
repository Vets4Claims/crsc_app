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

interface IdmeGroupStatus {
  group: string
  subgroups?: string[]
  verified: boolean
}

interface IdmeAttributesResponse {
  attributes?: IdmeAttribute[]
  // Status can be either the old format (IdmeAttribute[]) or new group format (IdmeGroupStatus[])
  status?: IdmeAttribute[] | IdmeGroupStatus[]
  // Group verification response fields
  verified?: boolean
  affiliation?: string
  group?: string
  uuid?: string
  // Could also be an array of groups
  groups?: Array<{
    name: string
    type: string
    verified: boolean
  }>
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
    // Log full response for debugging
    console.log('[idme-callback] Full attributes response:', JSON.stringify(attributesData))

    // Extract military status from attributes
    let militaryStatus: string | null = null
    let idmeUuid: string | null = null
    let isVerifiedVeteran = false

    // Check for direct group verification response (from groups.id.me)
    if (attributesData.verified === true) {
      isVerifiedVeteran = true
      militaryStatus = attributesData.affiliation || attributesData.group || 'verified'
      idmeUuid = attributesData.uuid || null
      console.log('[idme-callback] Direct verified flag found:', militaryStatus)
    }

    // Check for groups array
    if (attributesData.groups && Array.isArray(attributesData.groups)) {
      for (const group of attributesData.groups) {
        if (group.verified) {
          const groupName = group.name?.toLowerCase() || ''
          const groupType = group.type?.toLowerCase() || ''
          if (groupName.includes('military') || groupName.includes('veteran') ||
              groupType.includes('military') || groupType.includes('veteran')) {
            isVerifiedVeteran = true
            militaryStatus = group.name || group.type
            console.log('[idme-callback] Verified group found:', militaryStatus)
          }
        }
      }
    }

    // Look for military-related status in status array
    // Status can be in two formats:
    // 1. Group format: { group: "military", subgroups: ["Retiree"], verified: true }
    // 2. Old format: { handle: "...", name: "...", value: "..." }
    for (const status of attributesData.status || []) {
      // Check for group verification format (from groups.id.me)
      const groupStatus = status as IdmeGroupStatus
      if (groupStatus.group && groupStatus.verified === true) {
        const groupName = groupStatus.group.toLowerCase()
        if (groupName === 'military' || groupName === 'veteran' ||
            groupName.includes('military') || groupName.includes('veteran')) {
          isVerifiedVeteran = true
          // Include subgroups in status (e.g., "military - Retiree")
          militaryStatus = groupStatus.subgroups && groupStatus.subgroups.length > 0
            ? `${groupStatus.group} - ${groupStatus.subgroups.join(', ')}`
            : groupStatus.group
          console.log('[idme-callback] Group status verified:', militaryStatus)
        }
      }

      // Check for old attribute format
      const attrStatus = status as IdmeAttribute
      if (attrStatus.handle === 'uuid') {
        idmeUuid = attrStatus.value
      }
      // Check for military verification statuses in old format
      const handle = attrStatus.handle?.toLowerCase() || ''
      const value = attrStatus.value?.toLowerCase() || ''
      if (handle.includes('military') || handle.includes('veteran') ||
          handle === 'group' || handle === 'affiliation') {
        if (value === 'true' || value === 'verified' ||
            value.includes('military') || value.includes('veteran')) {
          isVerifiedVeteran = true
          militaryStatus = attrStatus.value || attrStatus.handle
          console.log('[idme-callback] Attribute status verified:', militaryStatus)
        }
      }
    }

    // Also check attributes array
    for (const attr of attributesData.attributes || []) {
      if (attr.handle === 'uuid' && !idmeUuid) {
        idmeUuid = attr.value
      }
      const handle = attr.handle?.toLowerCase() || ''
      const value = attr.value?.toLowerCase() || ''
      if (handle === 'group' || handle === 'affiliation' ||
          handle.includes('military') || handle.includes('veteran')) {
        if (value.includes('veteran') || value.includes('military') ||
            value === 'true' || value === 'verified') {
          isVerifiedVeteran = true
          militaryStatus = attr.value
          console.log('[idme-callback] Attribute verified:', militaryStatus)
        }
      }
    }

    // For sandbox/test mode: if we got a valid token and attributes response,
    // consider it verified (test users may not have full military attributes)
    if (!isVerifiedVeteran && attributesData.uuid) {
      idmeUuid = attributesData.uuid
      console.log('[idme-callback] UUID found directly in response:', idmeUuid)
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
      // Store the raw response for debugging
      const rawResponse = JSON.stringify(attributesData).substring(0, 500)

      // User verified with ID.me but not as veteran/military
      await db.queryObject`
        INSERT INTO verification_log (user_id, provider, status, error_message, idme_uuid, created_at)
        VALUES (${userId}, 'idme', 'failed', ${`No military/veteran status found. Response: ${rawResponse}`}, ${idmeUuid}, NOW())
      `

      console.log(`[idme-callback] User ${userId} verified but not as veteran. Response:`, rawResponse)
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
