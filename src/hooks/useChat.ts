import { useState, useCallback, useRef, useEffect } from 'react'
import { sendChatMessageStream, getChatHistory, clearChatHistory } from '@/lib/api'

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
  historyLoaded: boolean
  streamingMessageId: string | null // Track the currently streaming message
}

export function useChat(userId: string | undefined) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    currentStep: 'eligibility',
    isLoading: false,
    error: null,
    historyLoaded: false,
    streamingMessageId: null,
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
      if (result.data && result.data.length > 0) {
        const messages: Message[] = result.data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.message,
          timestamp: new Date(m.created_at),
        }))
        setState((prev) => ({ ...prev, messages, historyLoaded: true }))
      } else {
        // No history found, but still mark as loaded
        setState((prev) => ({ ...prev, historyLoaded: true }))
      }
    }

    loadHistory()
  }, [userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  const sendMessage = useCallback(
    async (content: string, options?: { hidden?: boolean; displayContent?: string }) => {
      if (!userId || !content.trim()) return

      const isHidden = options?.hidden ?? false
      const displayContent = options?.displayContent

      console.log('[useChat] Sending message:', isHidden ? '[HIDDEN]' : content)
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      // Add user message to state (unless hidden)
      if (!isHidden) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: displayContent || content,
          timestamp: new Date(),
        }

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage],
        }))
      }

      // Prepare conversation history for API
      const conversationHistory = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      conversationHistory.push({ role: 'user', content })

      // Create a placeholder message for streaming
      const streamingMessageId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      // Add the empty assistant message that will be filled with streamed content
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        streamingMessageId,
      }))

      // Send to AI with streaming
      console.log('[useChat] Calling sendChatMessageStream API...')

      await sendChatMessageStream(
        userId,
        content,
        conversationHistory,
        // onChunk - called for each text chunk
        (text: string) => {
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: msg.content + text }
                : msg
            ),
          }))
        },
        // onComplete - called when streaming is done
        () => {
          console.log('[useChat] Streaming complete')
          setState((prev) => ({
            ...prev,
            isLoading: false,
            streamingMessageId: null,
          }))
        },
        // onError - called on error
        (error: string) => {
          console.error('[useChat] Streaming error:', error)
          setState((prev) => ({
            ...prev,
            isLoading: false,
            streamingMessageId: null,
            error: error,
            // Update the message to show an error if it was empty
            messages: prev.messages.map((msg) =>
              msg.id === streamingMessageId && !msg.content
                ? { ...msg, content: 'I apologize, but I encountered an issue. Please try again.' }
                : msg
            ),
          }))
        }
      )
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
