import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../../store/store'
import { addTerminalMessage, setAiTyping } from '../../store/tutorialSlice'
import TerminalOutput from './TerminalOutput'
import TypingIndicator from './TypingIndicator'

// WebSocket connection to Claude Code
let ws: WebSocket | null = null

const InteractiveTerminal = () => {
  const dispatch = useDispatch()
  const { terminalHistory, isAiTyping } = useSelector((state: RootState) => state.tutorial)
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connectToClaudeCode()
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus()
    }

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalHistory, isAiTyping])

  const connectToClaudeCode = () => {
    try {
      // Connect to the WebSocket server that forwards to Claude Code
      ws = new WebSocket('ws://localhost:8080')

      ws.onopen = () => {
        setIsConnected(true)
        dispatch(addTerminalMessage({
          type: 'system',
          content: '🔗 Connected to Claude Code! Type your command below.'
        }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'ai_response') {
          dispatch(setAiTyping(false))
          dispatch(addTerminalMessage({
            type: 'ai',
            content: data.content
          }))
        } else if (data.type === 'typing_start') {
          dispatch(setAiTyping(true))
        } else if (data.type === 'typing_end') {
          dispatch(setAiTyping(false))
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        dispatch(addTerminalMessage({
          type: 'system',
          content: '❌ Connection to Claude Code lost. Please restart the tutorial.'
        }))
      }

      ws.onerror = () => {
        setIsConnected(false)
        dispatch(addTerminalMessage({
          type: 'system',
          content: '⚠️ Failed to connect to Claude Code. Make sure the tutorial server is running.'
        }))
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      dispatch(addTerminalMessage({
        type: 'system',
        content: '⚠️ WebSocket connection failed. Using demo mode instead.'
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message to terminal
    dispatch(addTerminalMessage({
      type: 'user',
      content: input.trim()
    }))

    // Send command to Claude Code via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        content: input.trim()
      }))
      dispatch(setAiTyping(true))
    } else {
      // Fallback to demo responses if WebSocket isn't available
      handleDemoResponse(input.trim())
    }

    setInput('')
  }

  const handleDemoResponse = (command: string) => {
    setTimeout(() => {
      dispatch(setAiTyping(true))
    }, 500)

    setTimeout(() => {
      dispatch(setAiTyping(false))
      
      if (command.includes('/rubber-duck') || command.includes('notification')) {
        dispatch(addTerminalMessage({
          type: 'ai',
          content: `I'd like to understand your feature idea better. Let me ask some clarifying questions:

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
        }))
      } else {
        dispatch(addTerminalMessage({
          type: 'ai',
          content: `I understand you want to run: ${command}

This is demo mode since WebSocket connection failed. In real usage, this would connect to Claude Code and run the actual Traceline workflow.`
        }))
      }
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      // Could implement command history here
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
        </div>
        <span className="ml-4 text-gray-300 text-sm font-mono font-medium">Claude Code Tutorial Session</span>
        <div className="ml-auto flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'} shadow-sm`} />
          <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-gradient-to-b from-black/40 to-black/60"
      >
        <TerminalOutput messages={terminalHistory} />
        {isAiTyping && <TypingIndicator />}
      </div>

      {/* Command Input */}
      <div className="p-6 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm font-mono">
            <span className="text-blue-400 font-semibold">claude</span> 
            <span className="text-gray-500">@</span>
            <span className="text-purple-400 font-semibold">tutorial</span>
            <span className="text-gray-300">:</span>
            <span className="text-green-400 font-semibold">~</span>
            <span className="text-gray-300">$</span>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your command here..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 font-mono text-sm"
            autoComplete="off"
          />
          
          <div className="animate-pulse bg-white/80 text-black px-1 rounded-sm font-mono text-sm">
            █
          </div>
        </form>
      </div>
    </div>
  )
}

export default InteractiveTerminal