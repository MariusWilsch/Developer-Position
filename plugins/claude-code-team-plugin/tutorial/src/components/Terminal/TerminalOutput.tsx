import { motion } from 'framer-motion'

interface TerminalMessage {
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: number
}

interface TerminalOutputProps {
  messages: TerminalMessage[]
}

const TerminalOutput = ({ messages }: TerminalOutputProps) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  return (
    <div className="space-y-2">
      {messages.map((message, index) => (
        <motion.div
          key={`${message.timestamp}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group"
        >
          {message.type === 'user' && (
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">claude</span>
              <span className="text-gray-600">@tutorial</span>
              <span className="text-white">:</span>
              <span className="text-green-400">~</span>
              <span className="text-white">$ {message.content}</span>
              <span className="text-gray-500 text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          )}
          
          {message.type === 'ai' && (
            <div className="text-gray-300 pl-4 py-1">
              {message.content.split('\n').map((line, lineIndex) => (
                <div key={lineIndex} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          )}
          
          {message.type === 'system' && (
            <div className="text-yellow-400 text-xs pl-2 italic">
              {message.content}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

export default TerminalOutput