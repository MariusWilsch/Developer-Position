import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../../store/store'
import TerminalOutput from './TerminalOutput'
import TypingIndicator from './TypingIndicator'

const ClaudeTerminal = () => {
  const { terminalHistory, isAiTyping } = useSelector((state: RootState) => state.tutorial)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="terminal-shadow bg-black/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/5"
    >
      {/* Terminal Header */}
      <div className="flex items-center px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
        </div>
        <span className="ml-4 text-gray-300 text-sm font-mono font-medium">Claude Code Tutorial Session</span>
        <div className="ml-auto flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-sm" />
          <span className="text-green-400 text-xs font-medium">Connected</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-6 font-mono text-sm min-h-[300px] max-h-[500px] overflow-y-auto bg-gradient-to-b from-black/40 to-black/60">
        {terminalHistory.length === 0 ? (
          <div className="text-gray-400">
            <p className="mb-4 text-base">Terminal ready. Tutorial commands will appear here...</p>
            <div className="flex items-center space-x-1 text-sm">
              <span className="text-blue-400 font-semibold">claude</span> 
              <span className="text-gray-500">@</span>
              <span className="text-purple-400 font-semibold">tutorial</span>
              <span className="text-gray-300">:</span>
              <span className="text-green-400 font-semibold">~</span>
              <span className="text-gray-300">$ </span>
              <span className="animate-pulse bg-white/80 text-black px-1 rounded-sm">█</span>
            </div>
          </div>
        ) : (
          <>
            <TerminalOutput messages={terminalHistory} />
            {isAiTyping && <TypingIndicator />}
          </>
        )}
      </div>
    </motion.div>
  )
}

export default ClaudeTerminal