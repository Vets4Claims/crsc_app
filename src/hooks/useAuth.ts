import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createUserProfile, createAuditLog, getVerificationStatus } from '@/lib/api'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  veteranVerified: boolean
  veteranVerifiedAt: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    veteranVerified: false,
    veteranVerifiedAt: null,
  })

  // Function to check verification status
  const checkVerificationStatus = useCallback(async (userId: string) => {
    const result = await getVerificationStatus(userId)
    if (result.data) {
      setState((prev) => ({
        ...prev,
        veteranVerified: result.data?.veteran_verified ?? false,
        veteranVerifiedAt: result.data?.veteran_verified_at ?? null,
      }))
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: error?.message ?? null,
      }))

      // Check verification status if user is logged in
      if (session?.user) {
        await checkVerificationStatus(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }))

        // Create user profile on sign up
        if (event === 'SIGNED_IN' && session?.user) {
          await createUserProfile(session.user.id, session.user.email!)
          await createAuditLog(session.user.id, 'sign_in', 'auth')
          // Check verification status
          await checkVerificationStatus(session.user.id)
        }

        if (event === 'SIGNED_OUT') {
          await createAuditLog(null, 'sign_out', 'auth')
          // Reset verification state
          setState((prev) => ({
            ...prev,
            veteranVerified: false,
            veteranVerifiedAt: null,
          }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [checkVerificationStatus])

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true, user: data.user }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true, user: data.user }
  }, [])

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signOut()

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false, user: null, session: null }))
    return { success: true }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true }
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Allow manual refresh of verification status
  const refreshVerificationStatus = useCallback(async () => {
    if (state.user?.id) {
      await checkVerificationStatus(state.user.id)
    }
  }, [state.user?.id, checkVerificationStatus])

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    refreshVerificationStatus,
    isAuthenticated: !!state.user,
    isVeteranVerified: state.veteranVerified,
  }
}
