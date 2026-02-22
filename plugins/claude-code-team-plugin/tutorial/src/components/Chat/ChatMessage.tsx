import { motion } from 'framer-motion'

export interface ChatMessageType {
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatMessageProps {
  message: ChatMessageType
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
            : 'bg-gradient-to-r from-orange-400 to-pink-500'
        }`}>
          <span className="text-white font-bold text-sm">
            {isUser ? 'U' : 'C'}
          </span>
        </div>

        {/* Message */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
            : 'bg-gray-800/50 border border-gray-700/50 text-gray-100'
        }`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
          <div className={`text-xs mt-2 ${
            isUser ? 'text-blue-100' : 'text-gray-400'
          }`}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ChatMessage