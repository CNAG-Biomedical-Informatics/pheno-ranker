import {createContext, useContext} from 'react'
import defaults from '../engine/limits.json'

export const defaultLimits = defaults
export type AnalysisLimits = typeof defaults
export const LimitsContext = createContext<AnalysisLimits>(defaultLimits)
export const useLimits = () => useContext(LimitsContext)
