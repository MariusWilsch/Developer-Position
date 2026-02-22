import { useSelector, useDispatch } from 'react-redux'
import { CheckIcon } from '@heroicons/react/20/solid'
import { motion } from 'framer-motion'
import { RootState } from '../../store/store'
import { jumpToStep } from '../../store/tutorialSlice'

const TutorialProgress = () => {
  const dispatch = useDispatch()
  const { currentStep, steps, completedSteps } = useSelector((state: RootState) => state.tutorial)

  const handleStepClick = (stepIndex: number) => {
    // Allow jumping back to completed steps
    if (stepIndex <= currentStep) {
      dispatch(jumpToStep(stepIndex))
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">Tutorial Progress</h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = index === currentStep
          const isAccessible = index <= currentStep
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                isAccessible ? 'hover:bg-white/10 border border-transparent hover:border-white/20' : 'cursor-not-allowed'
              }`}
              onClick={() => handleStepClick(index)}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isCompleted 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg' 
                  : isCurrent 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse shadow-lg' 
                    : isAccessible
                      ? 'border-2 border-gray-400/50 bg-gray-700/50'
                      : 'border-2 border-gray-600/30 bg-gray-800/50 opacity-40'
              }`}>
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4 text-white" />
                ) : (
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-white' : isAccessible ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                )}
              </div>
              
              <div className={`flex-1 ${isAccessible ? 'opacity-100' : 'opacity-40'}`}>
                <p className={`text-sm font-medium ${
                  isCurrent ? 'text-blue-400' : 'text-white'
                }`}>
                  {step.title}
                </p>
                {step.type && (
                  <p className="text-xs text-gray-400 capitalize">{step.type}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>Progress</span>
          <span className="text-white font-medium">{Math.round((currentStep / (steps.length - 1)) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full shadow-sm"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  )
}

export default TutorialProgress