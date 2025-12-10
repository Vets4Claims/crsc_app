import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@14.21.0'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create PostgreSQL client for Google Cloud
async function getDbClient(): Promise<Client> {
  const client = new Client({
    hostname: Deno.env.get('DB_HOST')!,
    port: parseInt(Deno.env.get('DB_PORT') || '5432'),
    user: Deno.env.get('DB_USER')!,
    password: Deno.env.get('DB_PASSWORD')!,
    database: Deno.env.get('DB_NAME')!,
    tls: {
      enabled: true,
      enforce: true,
    },
  })
  await client.connect()
  return client
}

interface PaymentRequest {
  userId: string
  amount: number
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let db: Client | null = null

  try {
    const { userId, amount } = await req.json() as PaymentRequest

    if (!userId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate amount
    if (amount <= 0 || amount > 10000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // Connect to Google Cloud PostgreSQL
    db = await getDbClient()

    // Get user email for Stripe receipt
    const userResult = await db.queryObject<{email: string}>`
      SELECT email FROM users WHERE id = ${userId}
    `
    const userEmail = userResult.rows[0]?.email

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        product: 'CRSC Filing Package',
      },
      receipt_email: userEmail,
      description: 'CRSC Filing Package - Combat-Related Special Compensation Application',
    })

    // Save payment record to database
    await db.queryObject`
      INSERT INTO payments (user_id, stripe_payment_id, amount, currency, status, created_at)
      VALUES (${userId}, ${paymentIntent.id}, ${amount}, 'USD', 'pending', NOW())
    `

    // Create audit log entry
    await db.queryObject`
      INSERT INTO audit_log (user_id, action, resource_type, details, created_at)
      VALUES (${userId}, 'payment_intent_created', 'payment', ${JSON.stringify({ payment_intent_id: paymentIntent.id, amount })}, NOW())
    `

    await db.end()

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Payment handler error:', error)
    if (db) {
      try {
        await db.end()
      } catch {
        // Ignore close errors
      }
    }
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
