/**
 * @file Interactive terminal component connecting to the PTY-backed WebSocket server.
 *
 * Handles the new streaming protocol: stream_chunk events accumulate in Redux
 * streamingText (shown live), response_complete finalizes them into history.
 * Permission prompts are shown as an inline card with Allow/Deny buttons instead
 * of blocking the server terminal.
 *
 * Design Context:
 * WS message types received: stream_chunk, tool_use, tool_result, permission_prompt,
 * response_complete, typing_start, typing_end, pong, ai_response (legacy fallback).
 * WS messages sent: command, permission_response {choice: y|n|a}, ping.
 */
import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { RootState } from '../../store/store'
import {
  addTerminalMessage,
  setAiTyping,
  appendStreamingText,
  clearStreamingText,
  finalizeStreaming,
  setPermissionPrompt,
  clearPermissionPrompt
} from '../../store/tutorialSlice'
import TerminalOutput from './TerminalOutput'
import TypingIndicator from './TypingIndicator'

// WebSocket connection to Claude Code
let ws: WebSocket | null = null

const InteractiveTerminal = () => {
  const dispatch = useDispatch()
  const { terminalHistory, isAiTyping, streamingText, permissionPrompt, isStreaming } =
    useSelector((state: RootState) => state.tutorial)
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connectToClaudeCode()
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
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalHistory, isAiTyping, streamingText, permissionPrompt])

  const connectToClaudeCode = () => {
    try {
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

        switch (data.type) {
          case 'stream_chunk':
            dispatch(appendStreamingText(data.content))
            break

          case 'tool_use':
            // Finalize any accumulated streaming text first
            dispatch(finalizeStreaming())
            dispatch(addTerminalMessage({ type: 'ai', content: data.content }))
            break

          case 'tool_result':
            dispatch(addTerminalMessage({ type: 'system', content: data.content }))
            break

          case 'permission_prompt':
            dispatch(setPermissionPrompt(data.content))
            dispatch(setAiTyping(false))
            break

          case 'response_complete':
            dispatch(finalizeStreaming())
            dispatch(setAiTyping(false))
            dispatch(clearPermissionPrompt())
            break

          case 'typing_start':
            dispatch(setAiTyping(true))
            dispatch(clearStreamingText())
            break

          case 'typing_end':
            dispatch(setAiTyping(false))
            break

          // Legacy fallback
          case 'ai_response':
            dispatch(setAiTyping(false))
            dispatch(finalizeStreaming())
            dispatch(addTerminalMessage({ type: 'ai', content: data.content }))
            break
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        dispatch(finalizeStreaming())
        dispatch(clearPermissionPrompt())
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

    dispatch(addTerminalMessage({
      type: 'user',
      content: input.trim()
    }))

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'command', content: input.trim() }))
      dispatch(setAiTyping(true))
    } else {
      handleDemoResponse(input.trim())
    }

    setInput('')
  }

  const handlePermissionResponse = (choice: 'y' | 'n' | 'a') => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'permission_response', choice }))
    }
    dispatch(clearPermissionPrompt())
    dispatch(setAiTyping(true))
    dispatch(clearStreamingText())
  }

  const handleDemoResponse = (command: string) => {
    setTimeout(() => dispatch(setAiTyping(true)), 500)
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

        {/* Live streaming text */}
        <AnimatePresence>
          {isStreaming && streamingText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-300 pl-4 py-1"
            >
              {streamingText.split('\n').map((line, i) => (
                <div key={i} className="leading-relaxed">{line}</div>
              ))}
              <span className="inline-block w-1.5 h-3.5 bg-gray-400 animate-pulse ml-0.5 align-middle" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Permission prompt */}
        <AnimatePresence>
          {permissionPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3 border border-yellow-500/40 bg-yellow-500/10 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3 mb-4">
                <span className="text-yellow-400 text-base mt-0.5">🔐</span>
                <div className="flex-1">
                  <p className="text-yellow-300 text-xs font-semibold mb-1">Permission Required</p>
                  <p className="text-gray-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {permissionPrompt}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePermissionResponse('y')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600/80 hover:bg-green-600 text-white transition-colors"
                >
                  Allow Once
                </button>
                <button
                  onClick={() => handlePermissionResponse('a')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600/80 hover:bg-blue-600 text-white transition-colors"
                >
                  Always Allow
                </button>
                <button
                  onClick={() => handlePermissionResponse('n')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  Deny
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAiTyping && !isStreaming && !permissionPrompt && <TypingIndicator />}
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