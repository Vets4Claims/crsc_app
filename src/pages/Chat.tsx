import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { useChat, type Message } from '@/hooks/useChat'
import { useFormData } from '@/hooks/useFormData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Send,
  Loader2,
  User,
  Bot,
  Menu,
  FileText,
  Upload,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { APPLICATION_STEPS } from '@/lib/constants'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary text-white' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-prose prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function QuickResponses({ onSelect }: { onSelect: (response: string) => void }) {
  const quickResponses = [
    'Yes',
    'No',
    "I'm not sure",
    'Can you explain?',
    'Skip this question',
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {quickResponses.map((response) => (
        <Button
          key={response}
          variant="outline"
          size="sm"
          onClick={() => onSelect(response)}
        >
          {response}
        </Button>
      ))}
    </div>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
    messagesEndRef,
    historyLoaded,
  } = useChat(user?.id)
  const { calculateProgress, packetStatus, resetProgress } = useFormData(user?.id)

  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const initialMessageSent = useRef(false)

  const progress = calculateProgress()

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Send initial greeting only after history has been loaded and if no messages exist
    // This ensures we don't send "Hello" when user already has conversation history
    if (historyLoaded && messages.length === 0 && user?.id && !initialMessageSent.current) {
      initialMessageSent.current = true
      sendMessage('Hello, I need help filing for CRSC benefits.')
    }
  }, [historyLoaded, user?.id, messages.length, sendMessage])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue('')
    await sendMessage(message)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStepStatus = (stepId: string) => {
    const status = packetStatus.find((s) => s.step_name === stepId)
    return status?.step_status || 'not_started'
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-primary hidden sm:inline">CRSC Assistant</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <Progress value={progress.percentage} className="w-24 h-2" />
              <span className="text-sm font-medium">{progress.percentage}%</span>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Application Progress</SheetTitle>
                  <SheetDescription>
                    Track your progress through the CRSC filing process
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span className="font-medium">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} />
                  </div>

                  <div className="space-y-2 mt-6">
                    {APPLICATION_STEPS.slice(0, -1).map((step) => {
                      const status = getStepStatus(step.id)
                      const isComplete = status === 'completed'
                      const isInProgress = status === 'in_progress'

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            isComplete
                              ? 'bg-green-50'
                              : isInProgress
                              ? 'bg-primary/5'
                              : ''
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isComplete
                                ? 'bg-green-500 text-white'
                                : isInProgress
                                ? 'bg-primary text-white'
                                : 'bg-muted'
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">
                                {APPLICATION_STEPS.findIndex((s) => s.id === step.id) + 1}
                              </span>
                            )}
                          </div>
                          <span className="text-sm">{step.name}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/review')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Review Application
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Restart Conversation
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Restart Conversation?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-left space-y-2">
                            <p>
                              Are you sure you want to restart the conversation? This will:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Delete your entire chat history with the AI assistant</li>
                              <li>Reset your application progress to 0%</li>
                              <li>Start a new conversation from the beginning</li>
                              <li>Require you to re-verify eligibility and re-answer questions</li>
                            </ul>
                            <p className="font-medium text-foreground pt-2">
                              Note: Your saved form data (personal info, military service, VA disability info, etc.) will NOT be deleted - only your progress tracking and chat history will be reset.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              initialMessageSent.current = false
                              await clearMessages()
                              await resetProgress()
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            Yes, Restart
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col container mx-auto max-w-4xl">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-red-700 text-sm">{error}</p>
                  <Button variant="ghost" size="sm" onClick={clearError} className="text-red-700">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Responses */}
        {!isLoading && messages.length > 0 && (
          <div className="px-4 pb-2">
            <QuickResponses onSelect={sendMessage} />
          </div>
        )}

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/review">
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Your conversation is encrypted and secure. Never share sensitive information like full SSN in chat.
          </p>
        </div>
      </div>
    </div>
  )
}
