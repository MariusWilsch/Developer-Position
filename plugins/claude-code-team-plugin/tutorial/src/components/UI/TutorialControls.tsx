import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { RootState } from '../../store/store'
import { nextStep, previousStep } from '../../store/tutorialSlice'

const TutorialControls = () => {
  const dispatch = useDispatch()
  const { currentStep, steps } = useSelector((state: RootState) => state.tutorial)
  
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  
  const handleNext = () => {
    if (!isLastStep) {
      dispatch(nextStep())
    }
  }
  
  const handlePrevious = () => {
    if (!isFirstStep) {
      dispatch(previousStep())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card flex items-center justify-between"
    >
      <button
        onClick={handlePrevious}
        disabled={isFirstStep}
        className={`btn-secondary flex items-center space-x-2 ${
          isFirstStep
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:scale-105'
        }`}
      >
        <ChevronLeftIcon className="w-4 h-4" />
        <span>Previous</span>
      </button>

      <div className="flex items-center space-x-6">
        <span className="text-sm text-gray-400 font-medium">
          Step {currentStep + 1} of {steps.length}
        </span>
        
        {/* Step indicators */}
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: index === currentStep ? 1.2 : 1,
                backgroundColor: index === currentStep
                  ? '#3b82f6'
                  : index < currentStep
                    ? '#10b981'
                    : '#4b5563'
              }}
              transition={{ duration: 0.3 }}
              className="w-3 h-3 rounded-full shadow-sm"
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={isLastStep}
        className={`${isLastStep ? 'btn-secondary opacity-40 cursor-not-allowed' : 'btn-primary'} flex items-center space-x-2`}
      >
        <span>{isLastStep ? 'Complete' : 'Next'}</span>
        {!isLastStep && <ChevronRightIcon className="w-4 h-4" />}
      </button>
    </motion.div>
  )
}

export default TutorialControls