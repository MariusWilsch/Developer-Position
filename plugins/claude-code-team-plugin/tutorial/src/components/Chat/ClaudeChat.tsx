import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperAirplaneIcon } from '@heroicons/react/20/solid'
import { RootState } from '../../store/store'
import { addChatMessage, setChatTyping } from '../../store/tutorialSlice'
import ChatMessage from './ChatMessage'

const ClaudeChat = () => {
  const dispatch = useDispatch()
  const { chatMessages, isChatTyping } = useSelector((state: RootState) => state.tutorial)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isChatTyping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isChatTyping) return

    // Add user message
    dispatch(addChatMessage({
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }))

    const userInput = inputValue.trim()
    setInputValue('')

    // Simulate Claude's response based on input
    setTimeout(() => {
      dispatch(setChatTyping(true))
    }, 500)

    setTimeout(() => {
      dispatch(setChatTyping(false))
      
      let response = ''
      if (userInput.startsWith('/')) {
        // Handle commands
        if (userInput.includes('rubber-duck') || userInput.includes('notification')) {
          response = `I'd like to understand your feature idea better. Let me ask some clarifying questions:

1. What specific type of user notification system are you thinking about?
   - Real-time push notifications?
   - Email notifications? 
   - In-app notification center?

2. Who should receive these notifications?
   - All users?
   - Specific user roles?
   - Based on preferences?

3. What events should trigger notifications?

Let's think through these ambiguities together.`
        } else {
          response = `I understand you want to use the ${userInput} command. Could you provide more context about what you're trying to achieve?`
        }
      } else {
        // Handle regular responses
        if (userInput.toLowerCase().includes('notification') && userInput.toLowerCase().includes('order')) {
          response = `Perfect! Now I understand:
- In-app notification system
- For order status updates
- Targeted to customers with active orders  
- Displayed within the application interface

This gives us clear requirements for implementation. Let's proceed to the implementation phase.`
        } else {
          response = `Thanks for that input. Could you be more specific about your requirements? This will help me provide better assistance.`
        }
      }

      dispatch(addChatMessage({
        type: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }))
    }, 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">Claude Code</h3>
            <p className="text-xs text-gray-400">Tutorial Session</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-medium">Connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <AnimatePresence>
          {chatMessages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </AnimatePresence>
        
        {isChatTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-gray-900/30">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Try: /rubber-duck I want to add user notifications"
            disabled={isChatTyping}
            className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isChatTyping}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Try commands like <code className="text-blue-400">/rubber-duck</code> or describe your feature ideas
        </p>
      </div>
    </div>
  )
}

export default ClaudeChat