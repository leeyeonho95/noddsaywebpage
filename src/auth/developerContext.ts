import { createContext, useContext } from 'react'
import type { DeveloperAccess } from '../api/developerAccess'
export interface DeveloperState {
  access: DeveloperAccess | null
  status: 'signed-out' | 'loading' | 'ready' | 'error'
  refresh: () => void
}
export const DeveloperContext = createContext<DeveloperState | null>(null)
export function useDeveloperAccess() {
  const value = useContext(DeveloperContext)
  if (!value) throw new Error('DeveloperAccessProvider is required')
  return value
}
