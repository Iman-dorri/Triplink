'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface ChatbotProps {
  webhookUrl?: string
}

// Get webhook URL - use Next.js API route to avoid CORS issues
const getDefaultWebhookUrl = () => {
  if (typeof window !== 'undefined') {
    // Always use the Next.js API route which proxies to n8n
    return '/api/chatbot'
  }
  return '/api/chatbot'
}

// Get chatbot password from environment variable (default for development)
const getChatbotPassword = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_CHATBOT_PASSWORD || 'synvoy2024_developer'
  }
  return process.env.NEXT_PUBLIC_CHATBOT_PASSWORD || 'synvoy2024_developer'
}

export default function Chatbot({ webhookUrl }: ChatbotProps) {
  const defaultWebhookUrl = getDefaultWebhookUrl()
  const finalWebhookUrl = webhookUrl || defaultWebhookUrl
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)
  
  // Check if user is already authenticated (stored in localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('chatbot_authenticated')
      if (authStatus === 'true') {
        setIsAuthenticated(true)
      }
    }
  }, [])
  
  // Generate or retrieve session ID from localStorage
  const getSessionId = () => {
    if (typeof window !== 'undefined') {
      let sessionId = localStorage.getItem('chatbot_session_id')
      if (!sessionId) {
        // Generate a unique session ID
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('chatbot_session_id', sessionId)
      }
      return sessionId
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  const [sessionId] = useState(() => getSessionId())
  
  // Handle password verification
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const correctPassword = getChatbotPassword()
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true)
      setShowPasswordModal(false)
      setPasswordInput('')
      setPasswordError('')
      // Store authentication in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chatbot_authenticated', 'true')
      }
      // Open chat window after successful authentication
      setIsOpen(true)
    } else {
      setPasswordError('Incorrect password. Please try again.')
      setPasswordInput('')
      passwordRef.current?.focus()
    }
  }
  
  // Handle opening chat - show password modal if not authenticated
  const handleOpenChat = () => {
    if (isAuthenticated) {
      setIsOpen(true)
    } else {
      setShowPasswordModal(true)
    }
  }
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m here to help you with any questions about Synvoy. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !isAuthenticated) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(finalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: userMessage.text, // n8n Chat Trigger node outputs this field
          sessionId: sessionId, // Required by n8n Chat Trigger node
          // You can add more context here if needed
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          // If response is not JSON, try to get text
          const errorText = await response.text().catch(() => '')
          errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.error || errorData.message || 'Failed to get response from chatbot')
      }

      const data = await response.json()
      
      // Handle different response formats from n8n
      // n8n Chat Trigger can return the response in various formats
      // Check for common response fields
      const responseText = data.output || 
                          data.message || 
                          data.text || 
                          data.response || 
                          data.chatOutput ||
                          (typeof data === 'string' ? data : null) ||
                          'I apologize, but I couldn\'t process that request.'
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botResponse])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  const chatbotContent = (
    <div 
      style={{ 
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: 'fit-content',
        height: 'fit-content',
        pointerEvents: 'auto',
        zIndex: 99999
      }}
    >
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99998] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Chatbot Access</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordInput('')
                  setPasswordError('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              This chatbot is currently in development. Please enter the password to access it.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  id="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setPasswordError('')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter password"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordInput('')
                    setPasswordError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors font-medium"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Button - Sticky at bottom right viewport */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center group relative"
          aria-label="Open chatbot"
        >
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window - Sticky at bottom right viewport */}
      {isOpen && isAuthenticated && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[500px] sm:h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-slide-up"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Synvoy Assistant</h3>
                <p className="text-blue-100 text-xs">We're here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Close chatbot"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                      : 'bg-white text-gray-800 shadow-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-2 shadow-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(chatbotContent, document.body) : null
}

