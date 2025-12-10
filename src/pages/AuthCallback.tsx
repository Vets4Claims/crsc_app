import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Shield, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )

        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
          return
        }

        setStatus('success')

        // Redirect after a brief delay to show success
        setTimeout(() => {
          navigate('/onboarding')
        }, 2000)
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary">
            <Shield className="h-8 w-8" />
            <span className="text-xl font-bold">CRSC Filing Assistant</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
                <CardDescription>
                  Please wait while we verify your account...
                </CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Email Verified!</CardTitle>
                <CardDescription>
                  Your account has been verified. Redirecting you to get started...
                </CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl">Verification Failed</CardTitle>
                <CardDescription>
                  {errorMessage || 'We couldn\'t verify your email. The link may have expired.'}
                </CardDescription>
              </>
            )}
          </CardHeader>

          {status === 'error' && (
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Please try signing up again or contact support if the problem persists.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/register')}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
