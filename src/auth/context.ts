import { createContext, useContext } from 'react'
import type { Snapshot } from '../api/webAuth'

// ApiError code used when the session could not be recovered; the page asks the user to reload.
export const SESSION_STALE = 'SESSION_STALE'

export interface AuthState {
  // null until the first session request finishes.
  snapshot: Snapshot | null
  // Why the first session request failed, shown with a retry button.
  bootError?: string
  retryBootstrap: () => void
  login: (body: { email: string; password: string }) => Promise<void>
  register: (body: { email: string; password: string; displayName: string }) => Promise<void>
  logout: () => Promise<void>
  // The Google sign-in URL to open, or null when this browser is already signed in.
  startGoogle: () => Promise<string | null>
  // Finishes sign-up for a Google account seen for the first time (status REGISTRATION_REQUIRED).
  googleRegister: (body: { displayName: string }) => Promise<void>
  // Runs a request for a signed-in browser with its CSRF token. Throws AUTHENTICATION_REQUIRED once signed out.
  signedIn: <T>(call: (csrf: string) => Promise<T>) => Promise<T>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
