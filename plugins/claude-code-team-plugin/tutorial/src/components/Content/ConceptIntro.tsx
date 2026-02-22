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
    <div className="grid md:grid-cols-2 gap-8">
      {/* Problem */}
      <div className="card bg-red-500/5 border-red-500/20">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-red-300">Without Structure</h3>
        </div>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
            <span>AI makes assumptions</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
            <span>Skips verification steps</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
            <span>Inconsistent results</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
            <span>Hours debugging misunderstood requirements</span>
          </li>
        </ul>
      </div>

      {/* Solution */}
      <div className="card bg-green-500/5 border-green-500/20">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <h3 className="text-xl font-bold text-green-300">With Traceline</h3>
        </div>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
            <span>Clear requirements first</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
            <span>Confidence gating prevents errors</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
            <span>Predictable AI behavior</span>
          </li>
          <li className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
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
      >
        {step.id === 'welcome' && renderWorkflowDiagram()}
        {step.id === 'concept' && renderProblemSolution()}
      </motion.div>

      {/* Key insight callout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="relative"
      >
        <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Key Insight</h3>
            <p className="text-xl text-gray-300 font-light leading-relaxed">
              Resolving ambiguity at <span className="text-red-400 font-semibold">✗</span> takes seconds to minutes.<br />
              Debugging misunderstood implementation takes <span className="text-red-400 font-semibold">hours</span>.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ConceptIntro