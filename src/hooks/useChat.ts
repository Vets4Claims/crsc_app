import { useState, useCallback, useRef, useEffect } from 'react'
import { sendChatMessage, getChatHistory, clearChatHistory } from '@/lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    step?: string
    action?: string
    requires_input?: boolean
  }
}

interface ChatState {
  messages: Message[]
  currentStep: string
  isLoading: boolean
  error: string | null
}

export function useChat(userId: string | undefined) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    currentStep: 'eligibility',
    isLoading: false,
    error: null,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    if (!userId) return

    const loadHistory = async () => {
      console.log('[useChat] Loading chat history for user:', userId)
      const result = await getChatHistory(userId)
      console.log('[useChat] Chat history result:', result)
      if (result.error) {
        console.error('[useChat] Error loading chat history:', result.error)
      }
      if (result.data) {
        const messages: Message[] = result.data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.message,
          timestamp: new Date(m.created_at),
        }))
        setState((prev) => ({ ...prev, messages }))
      }
    }

    loadHistory()
  }, [userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !content.trim()) return

      console.log('[useChat] Sending message:', content)
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      // Add user message to state
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }))

      // Prepare conversation history for API
      const conversationHistory = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      conversationHistory.push({ role: 'user', content })

      // Send to AI
      console.log('[useChat] Calling sendChatMessage API...')
      const result = await sendChatMessage(userId, content, conversationHistory)
      console.log('[useChat] API result:', result)

      if (result.error) {
        console.error('[useChat] Error from API:', result.error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }))
        return
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.data?.reply || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date(),
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }))
    },
    [userId, state.messages]
  )

  const addSystemMessage = useCallback((content: string, metadata?: Message['metadata']) => {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date(),
      metadata,
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
    }))
  }, [])

  const setCurrentStep = useCallback((step: string) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const clearMessages = useCallback(async () => {
    if (!userId) return

    await clearChatHistory(userId)
    setState((prev) => ({ ...prev, messages: [] }))
  }, [userId])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    sendMessage,
    addSystemMessage,
    setCurrentStep,
    clearMessages,
    clearError,
    messagesEndRef,
  }
}
