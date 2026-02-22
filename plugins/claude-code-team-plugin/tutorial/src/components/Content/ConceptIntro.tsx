import { motion } from 'framer-motion'
import { TutorialStep } from '../../store/tutorialSlice'

interface ConceptIntroProps {
  step: TutorialStep
}

const ConceptIntro = ({ step }: ConceptIntroProps) => {
  const renderWorkflowDiagram = () => (
    <div className="card">
      <h3 className="text-2xl font-bold mb-8 text-white">The Traceline Workflow</h3>
      <div className="font-mono text-base leading-relaxed text-blue-200 overflow-x-auto bg-gray-900/50 rounded-xl p-6 border border-blue-500/20">
        <pre className="whitespace-pre text-sm">{`┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Requirements  │ ✓  │ Implementation  │ ✓  │   Evaluation    │
│     Clarity     │───▶│     Clarity     │───▶│     Clarity     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   Confidence ✓            Confidence ✓            Confidence ✓
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                         ┌─────────────────┐
                         │     Execute     │
                         │   with Verified │
                         │  Understanding  │
                         └─────────────────┘`}</pre>
      </div>
      <div className="mt-6 flex items-center justify-center">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-6 py-3">
          <p className="text-blue-200 font-medium">Each ✓ checkpoint ensures shared understanding before proceeding.</p>
        </div>
      </div>
    </div>
  )

  const renderProblemSolution = () => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Without structure</h3>
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"></span>
            <span>AI makes assumptions</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"></span>
            <span>Skips verification steps</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"></span>
            <span>Inconsistent results</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"></span>
            <span>Hours debugging misunderstood requirements</span>
          </li>
        </ul>
      </div>

      <div className="card border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">With Traceline</h3>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
            <span>Clear requirements first</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
            <span>Confidence gating prevents errors</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
            <span>Predictable AI behavior</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
            <span>Fast disambiguation upfront</span>
          </li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            {step.title}
          </h1>
        </motion.div>
      </div>

      {/* Content based on step */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="space-y-8"
      >
        {step.id === 'welcome' && (
          <>
            {renderProblemSolution()}
            {renderWorkflowDiagram()}
          </>
        )}
      </motion.div>
    </div>
  )
}

export default ConceptIntro