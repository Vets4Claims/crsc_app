import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  resetPasswordSchema,
  newPasswordSchema,
  type ResetPasswordFormData,
  type NewPasswordFormData,
} from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const isResetMode = searchParams.get('type') === 'recovery'

  const { resetPassword, updatePassword, loading, error, clearError } = useAuthContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)

  // Request reset form
  const requestForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // New password form
  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  })

  const password = newPasswordForm.watch('password', '')

  const passwordRequirements = [
    { met: password.length >= 12, text: 'At least 12 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
  ]

  const onRequestReset = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true)
    clearError()

    const result = await resetPassword(data.email)

    if (result.success) {
      setEmailSent(true)
      toast.success('Password reset email sent')
    } else {
      toast.error(result.error || 'Failed to send reset email')
    }

    setIsSubmitting(false)
  }

  const onResetPassword = async (data: NewPasswordFormData) => {
    setIsSubmitting(true)
    clearError()

    const result = await updatePassword(data.password)

    if (result.success) {
      setPasswordReset(true)
      toast.success('Password updated successfully')
    } else {
      toast.error(result.error || 'Failed to reset password')
    }

    setIsSubmitting(false)
  }

  // Password reset success
  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">CRSC Filing Assistant</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Password Reset Complete</CardTitle>
              <CardDescription>
                Your password has been successfully updated.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/login">
                <Button className="w-full">Sign In with New Password</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Email sent confirmation
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">CRSC Filing Assistant</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>
              <Button
                variant="outline"
                onClick={() => setEmailSent(false)}
              >
                Send Again
              </Button>
            </CardContent>
            <CardFooter className="justify-center">
              <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  // Reset password with token (from email link)
  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">CRSC Filing Assistant</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={newPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    {...newPasswordForm.register('password')}
                    disabled={isSubmitting || loading}
                  />
                  {newPasswordForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {newPasswordForm.formState.errors.password.message}
                    </p>
                  )}
                  <div className="space-y-1 mt-2">
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        <CheckCircle className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    {...newPasswordForm.register('confirmPassword')}
                    disabled={isSubmitting || loading}
                  />
                  {newPasswordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {newPasswordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || loading}
                >
                  {(isSubmitting || loading) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Request password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
            <Shield className="h-8 w-8" />
            <span className="text-xl font-bold">CRSC Filing Assistant</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={requestForm.handleSubmit(onRequestReset)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...requestForm.register('email')}
                  disabled={isSubmitting || loading}
                />
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || loading}
              >
                {(isSubmitting || loading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
