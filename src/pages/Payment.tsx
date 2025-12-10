import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useAuthContext } from '@/contexts/AuthContext'
import { usePayment } from '@/hooks/usePayment'
import { useFormData } from '@/hooks/useFormData'
import { PAYMENT_AMOUNT, MILITARY_BRANCHES, BRANCH_MAILING_ADDRESSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  ArrowLeft,
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Mail,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/download`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.')
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess()
    } else {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay ${PAYMENT_AMOUNT.toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Payments securely processed by Stripe</span>
      </div>
    </form>
  )
}

export default function Payment() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const {
    clientSecret,
    loading: paymentLoading,
    error: paymentError,
    initializePayment,
  } = usePayment(user?.id)
  const { militaryService, disabilityClaims, documents, loading, isSectionComplete } = useFormData(
    user?.id
  )

  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const isReadyForPayment =
    isSectionComplete('personal_info') &&
    isSectionComplete('military_service') &&
    isSectionComplete('va_disability') &&
    isSectionComplete('disability_claims') &&
    isSectionComplete('documents')

  useEffect(() => {
    if (isReadyForPayment && user?.id) {
      initializePayment()
    }
  }, [isReadyForPayment, user?.id, initializePayment])

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true)
    toast.success('Payment successful!')
    setTimeout(() => {
      navigate('/download')
    }, 2000)
  }

  const getBranchMailingInfo = () => {
    if (!militaryService?.branch) return null
    return BRANCH_MAILING_ADDRESSES[militaryService.branch as keyof typeof BRANCH_MAILING_ADDRESSES]
  }

  const mailingInfo = getBranchMailingInfo()

  if (loading || paymentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isReadyForPayment) {
    return (
      <div className="min-h-screen bg-muted/50">
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/review')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-primary">CRSC Assistant</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Incomplete Application</AlertTitle>
            <AlertDescription>
              Please complete all required sections before proceeding to payment.
            </AlertDescription>
          </Alert>
          <Button className="mt-4" onClick={() => navigate('/review')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Review
          </Button>
        </main>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Your payment has been processed. Redirecting to download your CRSC packet...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/review')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">CRSC Assistant</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Complete Your Purchase</h1>
          <p className="text-muted-foreground mt-2">
            Review your order and enter payment details
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">CRSC Filing Package</p>
                    <p className="text-sm text-muted-foreground">
                      Complete application packet for Combat-Related Special Compensation
                    </p>
                  </div>
                  <p className="font-bold">${PAYMENT_AMOUNT.toFixed(2)}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="font-medium text-sm">Package Includes:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed DD Form 2860
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Professional cover letter
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Organized supporting documents
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Submission instructions
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <p className="font-bold">Total</p>
                  <p className="text-2xl font-bold text-primary">${PAYMENT_AMOUNT.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Application Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Disability Claims</span>
                  <Badge variant="secondary">{disabilityClaims.length} claims</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Documents Uploaded</span>
                  <Badge variant="secondary">{documents.length} documents</Badge>
                </div>
                {militaryService && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="font-medium">
                      {MILITARY_BRANCHES.find((b) => b.value === militaryService.branch)?.label}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mailing Information */}
            {mailingInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Submission Address
                  </CardTitle>
                  <CardDescription>
                    Your packet will be mailed to this address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="font-medium">{mailingInfo.name}</p>
                    {mailingInfo.address.map((line, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {line}
                      </p>
                    ))}
                    {'email' in mailingInfo && mailingInfo.email && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Email: </span>
                        {mailingInfo.email}
                      </p>
                    )}
                    {'phone' in mailingInfo && mailingInfo.phone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Phone: </span>
                        {mailingInfo.phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
                <CardDescription>
                  Enter your card information to complete your purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{paymentError}</AlertDescription>
                  </Alert>
                )}

                {clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#003f87',
                        },
                      },
                    }}
                  >
                    <CheckoutForm onSuccess={handlePaymentSuccess} />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Initializing payment...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Alert className="mt-4">
              <Lock className="h-4 w-4" />
              <AlertTitle>Secure Payment</AlertTitle>
              <AlertDescription>
                Your payment information is encrypted and securely processed by Stripe.
                We never store your full card details.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </main>
    </div>
  )
}
