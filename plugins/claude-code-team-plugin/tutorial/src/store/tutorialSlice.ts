import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface TutorialStep {
  id: string
  type: 'intro' | 'concept' | 'command' | 'demo' | 'completion'
  title: string
  content: string
  command?: string
  expectedBehavior?: string
  guidance?: string
  duration?: number
}

interface TutorialState {
  currentStep: number
  steps: TutorialStep[]
  isConnected: boolean
  isDemoActive: boolean
  terminalHistory: Array<{
    type: 'user' | 'ai' | 'system'
    content: string
    timestamp: number
  }>
  chatMessages: Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  confidence: 'unclear' | 'clear'
  isAiTyping: boolean
  isChatTyping: boolean
  completedSteps: string[]
}

const initialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    type: 'intro',
    title: 'Welcome to Traceline',
    content: 'AI doesn\'t need more tech people. It needs organizational people.',
    duration: 30
  },
  {
    id: 'rubber-duck',
    type: 'command',
    title: 'Get Started',
    content: 'Let\'s see how rubber ducking creates confidence before implementation.',
    command: '/rubber-duck',
  }
]

const initialState: TutorialState = {
  currentStep: 0,
  steps: initialSteps,
  isConnected: false,
  isDemoActive: false,
  terminalHistory: [],
  chatMessages: [],
  confidence: 'unclear',
  isAiTyping: false,
  isChatTyping: false,
  completedSteps: []
}

export const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    nextStep: (state) => {
      if (state.currentStep < state.steps.length - 1) {
        state.completedSteps.push(state.steps[state.currentStep].id)
        state.currentStep += 1
      }
    },
    previousStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1
      }
    },
    jumpToStep: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < state.steps.length) {
        state.currentStep = action.payload
      }
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload
    },
    addTerminalMessage: (state, action: PayloadAction<{
      type: 'user' | 'ai' | 'system'
      content: string
    }>) => {
      state.terminalHistory.push({
        ...action.payload,
        timestamp: Date.now()
      })
    },
    setConfidence: (state, action: PayloadAction<'unclear' | 'clear'>) => {
      state.confidence = action.payload
    },
    setAiTyping: (state, action: PayloadAction<boolean>) => {
      state.isAiTyping = action.payload
    },
    clearTerminal: (state) => {
      state.terminalHistory = []
    },
    addChatMessage: (state, action: PayloadAction<{
      type: 'user' | 'assistant'
      content: string
      timestamp: string
    }>) => {
      state.chatMessages.push(action.payload)
    },
    setChatTyping: (state, action: PayloadAction<boolean>) => {
      state.isChatTyping = action.payload
    },
    clearChat: (state) => {
      state.chatMessages = []
    },
    setDemoActive: (state, action: PayloadAction<boolean>) => {
      state.isDemoActive = action.payload
    }
  },
})

export const {
  nextStep,
  previousStep,
  jumpToStep,
  setConnected,
  addTerminalMessage,
  setConfidence,
  setAiTyping,
  clearTerminal,
  addChatMessage,
  setChatTyping,
  clearChat,
  setDemoActive
} = tutorialSlice.actions

export default tutorialSlice.reducer