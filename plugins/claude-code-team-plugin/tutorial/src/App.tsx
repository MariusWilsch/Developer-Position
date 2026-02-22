import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { RootState } from './store/store'
import { setConnected } from './store/tutorialSlice'
import TutorialProgress from './components/Navigation/TutorialProgress'
import ClaudeTerminal from './components/Terminal/ClaudeTerminal'
import InteractiveTerminal from './components/Terminal/InteractiveTerminal'
import ConceptIntro from './components/Content/ConceptIntro'
import CommandDemo from './components/Content/CommandDemo'
import TutorialControls from './components/UI/TutorialControls'

function App() {
  const dispatch = useDispatch()
  const { currentStep, steps, isConnected, isDemoActive } = useSelector((state: RootState) => state.tutorial)
  
  const currentStepData = steps[currentStep]

  useEffect(() => {
    // Initialize WebSocket connection to Claude Code
    console.log('Tutorial app initialized')
    dispatch(setConnected(true))
  }, [dispatch])

  const renderStepContent = () => {
    switch (currentStepData.type) {
      case 'intro':
      case 'concept':
        return <ConceptIntro step={currentStepData} />
      case 'command':
      case 'demo':
        return <CommandDemo step={currentStepData} />
      default:
        return <ConceptIntro step={currentStepData} />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="glass border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Traceline Tutorial</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm transition-all ${
                isConnected 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/20' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Split between content and chat */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <TutorialProgress />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-4 space-y-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-8"
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>

                {/* Tutorial Controls */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <TutorialControls />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Terminal Window - Only show when demo is active */}
        {isDemoActive && (
          <div className="p-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.5, type: "spring", damping: 20 }}
              className="max-w-5xl mx-auto h-80 terminal-shadow bg-black/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10"
            >
              <InteractiveTerminal />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App