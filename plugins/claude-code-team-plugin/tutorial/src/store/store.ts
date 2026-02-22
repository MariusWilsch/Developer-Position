import { configureStore } from '@reduxjs/toolkit'
import tutorialReducer from './tutorialSlice'

export const store = configureStore({
  reducer: {
    tutorial: tutorialReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch