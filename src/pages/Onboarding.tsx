import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Shield,
  CheckCircle,
  FileText,
  MessageSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

const onboardingSteps = [
  {
    title: 'Welcome to CRSC Filing Assistant',
    description: 'We\'ll help you file for Combat-Related Special Compensation',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          This application will guide you through the process of filing for CRSC benefits.
          Our AI-powered assistant will help you:
        </p>
        <ul className="space-y-3">
          {[
            'Verify your eligibility for CRSC',
            'Collect all required information',
            'Properly describe your combat-related disabilities',
            'Generate a complete filing package',
          ].map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
    icon: Shield,
  },
  {
    title: 'What You\'ll Need',
    description: 'Gather these documents before starting',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          To complete your CRSC application, you'll need the following documents:
        </p>
        <div className="grid gap-4">
          {[
            { name: 'DD214/DD215', desc: 'Your military discharge document', required: true },
            { name: 'Retirement Orders', desc: 'Official retirement documentation', required: true },
            { name: 'VA Rating Decision', desc: 'Most recent VA disability decision letter', required: true },
            { name: 'VA Code Sheet', desc: 'Summary of your disability ratings', required: true },
            { name: 'Medical Records', desc: 'Records from time of injury (if available)', required: false },
            { name: 'Awards/Citations', desc: 'Purple Heart or other combat awards', required: false },
          ].map((doc, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <FileText className={`h-5 w-5 flex-shrink-0 mt-0.5 ${doc.required ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium">
                  {doc.name}
                  {doc.required && <span className="text-destructive ml-1">*</span>}
                </p>
                <p className="text-sm text-muted-foreground">{doc.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive">*</span> Required documents. You can upload documents
          later if you don't have them right now.
        </p>
      </div>
    ),
    icon: FileText,
  },
  {
    title: 'How the Process Works',
    description: 'A step-by-step guided experience',
    content: (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[
            {
              step: '1',
              title: 'Chat-Guided Interview',
              desc: 'Our AI assistant will ask you questions to gather your information in a conversational format.',
              icon: MessageSquare,
            },
            {
              step: '2',
              title: 'Document Upload',
              desc: 'Upload your supporting documents securely. All files are encrypted and HIPAA-compliant.',
              icon: FileText,
            },
            {
              step: '3',
              title: 'Review & Edit',
              desc: 'Review all collected information and make any necessary changes before finalizing.',
              icon: CheckCircle,
            },
            {
              step: '4',
              title: 'Download Package',
              desc: 'After payment, download your complete CRSC filing package ready for submission.',
              icon: Shield,
            },
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    icon: MessageSquare,
  },
  {
    title: 'Important Information',
    description: 'Key things to remember',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">6-Year Back Pay Limit</p>
              <p className="text-sm text-amber-700 mt-1">
                CRSC back pay is limited to 6 years from your application date. The sooner you file,
                the more potential back pay you may receive.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Processing Time</p>
              <p className="text-sm text-blue-700 mt-1">
                CRSC applications typically take 6-12 months to process. You'll receive a decision
                letter once your claim is reviewed.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Never Send Originals</p>
              <p className="text-sm text-red-700 mt-1">
                Always send COPIES of your documents, never originals. Documents submitted may not
                be returned.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Your Data is Secure</p>
              <p className="text-sm text-green-700 mt-1">
                All your information is encrypted and handled according to HIPAA compliance
                requirements. We never share your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    icon: AlertTriangle,
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/chat')
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const step = onboardingSteps[currentStep]
  const Icon = step.icon

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">CRSC Filing Assistant</span>
          </Link>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Skip to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-12 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{step.title}</CardTitle>
            <CardDescription className="text-base">{step.description}</CardDescription>
          </CardHeader>
          <CardContent>{step.content}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {currentStep === onboardingSteps.length - 1 ? (
              <>
                Get Started <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Step Counter */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Step {currentStep + 1} of {onboardingSteps.length}
        </p>
      </main>
    </div>
  )
}
