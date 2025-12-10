import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { createPaymentIntent, createPayment, getPayments } from '@/lib/api'
import { PAYMENT_AMOUNT } from '@/lib/constants'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentState {
  clientSecret: string | null
  loading: boolean
  error: string | null
  paymentComplete: boolean
}

export function usePayment(userId: string | undefined) {
  const [state, setState] = useState<PaymentState>({
    clientSecret: null,
    loading: false,
    error: null,
    paymentComplete: false,
  })

  const initializePayment = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({ ...prev, error: 'Not authenticated' }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Check if user already paid
      const paymentsResult = await getPayments(userId)
      const completedPayment = paymentsResult.data?.find(
        (p) => p.status === 'completed'
      )

      if (completedPayment) {
        setState((prev) => ({
          ...prev,
          loading: false,
          paymentComplete: true,
        }))
        return
      }

      // Create payment intent
      const result = await createPaymentIntent(userId, PAYMENT_AMOUNT)

      if (result.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: result.error,
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        clientSecret: result.data?.clientSecret || null,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Payment initialization failed',
      }))
    }
  }, [userId])

  const handlePaymentSuccess = useCallback(
    async (paymentIntentId: string) => {
      if (!userId) return

      await createPayment(userId, {
        stripe_payment_id: paymentIntentId,
        amount: PAYMENT_AMOUNT,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })

      setState((prev) => ({
        ...prev,
        paymentComplete: true,
      }))
    },
    [userId]
  )

  const handlePaymentError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    stripePromise,
    initializePayment,
    handlePaymentSuccess,
    handlePaymentError,
    clearError,
    amount: PAYMENT_AMOUNT,
  }
}
