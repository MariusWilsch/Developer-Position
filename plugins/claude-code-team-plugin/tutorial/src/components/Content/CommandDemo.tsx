import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid'
import { TutorialStep } from '../../store/tutorialSlice'
import { RootState } from '../../store/store'
import { addTerminalMessage, setAiTyping, setConfidence, clearTerminal, setDemoActive } from '../../store/tutorialSlice'

interface CommandDemoProps {
  step: TutorialStep
}

const CommandDemo = ({ step }: CommandDemoProps) => {
  const dispatch = useDispatch()
  const { confidence } = useSelector((state: RootState) => state.tutorial)
  const [isPlaying, setIsPlaying] = useState(false)
  const [demoCompleted, setDemoCompleted] = useState(false)

  const startDemo = async () => {
    // Activate demo mode - this will show the terminal
    dispatch(setDemoActive(true))
    dispatch(clearTerminal())
    dispatch(setConfidence('unclear'))
    
    // Add initial instruction message
    dispatch(addTerminalMessage({
      type: 'system',
      content: `🚀 Demo Mode Activated! 

Try running: ${step.command} I want to add user notifications

This will connect to real Claude Code via WebSocket.`
    }))
    
    setDemoCompleted(true)
  }

  const ConfidenceIndicator = ({ confidence }: { confidence: 'unclear' | 'clear' }) => (
    <motion.div
      animate={{
        backgroundColor: confidence === 'clear' ? '#10b981' : '#ef4444',
        scale: confidence === 'clear' ? 1.05 : 1
      }}
      transition={{ duration: 0.3 }}
      className="rounded-full px-4 py-2 text-white text-center text-sm font-medium shadow-lg"
    >
      {confidence === 'clear' ? '✓ Ready to proceed' : '✗ Still have ambiguities'}
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Step Header */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">{step.title}</h1>
      </div>

      {/* Interactive Demo */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Interactive Demo</h3>
          <div className="flex items-center space-x-4">
            <ConfidenceIndicator confidence={confidence} />
            <button
              onClick={startDemo}
              disabled={isPlaying}
              className={`btn-primary flex items-center space-x-2 ${
                isPlaying
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
              }`}
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-4 h-4" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>{demoCompleted ? 'Run Again' : 'Start Demo'}</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-blue-400 font-bold">1</span>
            </div>
            <div>
              <p className="text-white font-semibold">Click "Start Demo" to open the terminal</p>
              <p className="text-gray-400 text-sm">This will connect to real Claude Code</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-purple-400 font-bold">2</span>
            </div>
            <div>
              <p className="text-white font-semibold">Type the command in the terminal below</p>
              <p className="text-gray-400 text-sm">Run: <code className="text-blue-400">{step.command} I want to add user notifications</code></p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-green-400 font-bold">3</span>
            </div>
            <div>
              <p className="text-white font-semibold">Follow Claude's guidance</p>
              <p className="text-gray-400 text-sm">Watch the real Traceline workflow in action</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expected Behavior Callout */}
      {step.expectedBehavior && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="card bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20"
        >
          <h4 className="font-semibold text-purple-300 mb-3 text-lg">Expected Behavior</h4>
          <p className="text-gray-300 leading-relaxed">{step.expectedBehavior}</p>
        </motion.div>
      )}

      {/* Guidance */}
      {step.guidance && (
        <div className="card bg-blue-500/10 border-blue-500/20">
          <p className="text-blue-200">
            <span className="text-blue-300 font-semibold">💡 Watch for:</span> {step.guidance}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default CommandDemo