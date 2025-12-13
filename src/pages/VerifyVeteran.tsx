import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { getVerificationStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react'

// ID.me configuration
const IDME_CLIENT_ID = 'd0c3d09a2b5383c04d21f3e9cf1b5f87'
const IDME_REDIRECT_URI = 'https://frilhvlgzihlowulyrnw.supabase.co/functions/v1/idme-callback'
const IDME_SCOPES = 'employee,government,military'

export default function VerifyVeteran() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, refreshVerificationStatus } = useAuthContext()
  const idmeButtonRef = useRef<HTMLDivElement>(null)

  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  // Check for callback parameters
  const success = searchParams.get('success')
  const callbackError = searchParams.get('error')

  useEffect(() => {
    // Check current verification status
    const checkStatus = async () => {
      if (!user?.id) {
        setIsCheckingStatus(false)
        return
      }

      try {
        const result = await getVerificationStatus(user.id)

        if (result.data?.veteran_verified) {
          setIsVerified(true)
        }
      } catch (err) {
        console.error('Error checking verification status:', err)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkStatus()
  }, [user?.id])

  useEffect(() => {
    // Handle callback from ID.me
    if (success === 'true') {
      setIsVerified(true)
      setIsCheckingStatus(false)
      // Refresh auth context verification status
      refreshVerificationStatus()
    } else if (callbackError) {
      setError(decodeURIComponent(callbackError))
      setIsCheckingStatus(false)
    }
  }, [success, callbackError, refreshVerificationStatus])

  // Generate ID.me authorization URL with state parameter containing userId
  const getIdmeAuthUrl = useCallback(() => {
    if (!user?.id) return null

    // Generate state with userId for callback identification
    const state = btoa(JSON.stringify({ userId: user.id, csrf: crypto.randomUUID() }))

    const params = new URLSearchParams({
      client_id: IDME_CLIENT_ID,
      redirect_uri: IDME_REDIRECT_URI,
      response_type: 'code',
      scopes: IDME_SCOPES,
      state: state,
    })

    return `https://groups.id.me/?${params.toString()}`
  }, [user?.id])

  // Load ID.me button script
  useEffect(() => {
    if (isVerified || isCheckingStatus) return

    // Load the ID.me wallet button script for styling
    const script = document.createElement('script')
    script.src = 'https://s3.amazonaws.com/idme/developer/idme-buttons/assets/js/idme-wallet-button.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`)
      if (existingScript) {
        document.body.removeChild(existingScript)
      }
    }
  }, [isVerified, isCheckingStatus])

  const handleVerifyClick = () => {
    const authUrl = getIdmeAuthUrl()
    if (authUrl) {
      window.location.href = authUrl
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const handleContinue = () => {
    navigate('/dashboard')
  }

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-primary">CRSC Filing Assistant</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {isVerified ? (
          // Success state
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Veteran Status Verified</CardTitle>
              <CardDescription className="text-green-700">
                Your military/veteran status has been successfully verified through ID.me.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleContinue} size="lg">
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Verification needed state
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Verify Your Veteran Status</CardTitle>
              <CardDescription>
                To generate your CRSC filing packet, we need to verify your military or veteran status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Why do we need verification?</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ensures only eligible veterans use our CRSC filing service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Protects against fraud and misuse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Required before generating your official CRSC packet</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <img
                    src="https://www.id.me/assets/idme-logo-57c35b19b4fe73c67c7e61f5c12b0c05c9b2d7c17d5f35c2f76a1a7f7fd7eb21.svg"
                    alt="ID.me"
                    className="h-8"
                    onError={(e) => {
                      // Fallback if logo doesn't load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Secure Verification with ID.me</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      ID.me is a trusted identity verification service used by the VA, DoD, and thousands of organizations.
                      Your information is secure and private.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 items-center">
                {/* ID.me Official Button Widget */}
                <div
                  ref={idmeButtonRef}
                  onClick={handleVerifyClick}
                  className="cursor-pointer"
                >
                  <span
                    id="idme-wallet-button"
                    data-scope={IDME_SCOPES}
                    data-client-id={IDME_CLIENT_ID}
                    data-redirect={IDME_REDIRECT_URI}
                    data-response="code"
                    data-text="Verify your military status with ID.me"
                    data-show-verify="true"
                  />
                </div>

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  I'll do this later
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By clicking "Verify with ID.me", you'll be redirected to ID.me to complete verification.
                You can explore the app without verification, but it's required to generate your CRSC packet.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
