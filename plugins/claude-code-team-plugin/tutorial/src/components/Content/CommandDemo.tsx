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
                  <span>{demoCompleted ? 'Run Again' : 'Get Started'}</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-300 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-white font-semibold">Click "Get Started" to open the terminal</p>
              <p className="text-gray-400 text-sm">This will connect to real Claude Code</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-300 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-white font-semibold">Type the command in the terminal below</p>
              <p className="text-gray-400 text-sm">Run: <code className="text-gray-300">{step.command} I want to add user notifications</code></p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-300 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-white font-semibold">Follow Claude's guidance</p>
              <p className="text-gray-400 text-sm">Watch the real Traceline workflow in action</p>
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  )
}

export default CommandDemo