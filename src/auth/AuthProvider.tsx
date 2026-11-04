import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as api from '../api/webAuth'
import { ApiError, type Snapshot } from '../api/webAuth'
import { toFormError } from '../lib/errors'
import { AuthContext, SESSION_STALE, type AuthState } from './context'

// The in-flight session request, shared by StrictMode's second effect run.
let bootstrap: Promise<Snapshot> | null = null

const staleError = () => new ApiError(0, SESSION_STALE, '연결이 만료됐어요. 새로고침 후 다시 시도해 주세요.')

// The backend rejects these before handling the request, so retrying with a fresh session is safe.
const isStale = (error: ApiError) =>
  (error.status === 403 && error.code === 'WEB_REQUEST_FORBIDDEN') ||
  (error.status === 401 && error.code === 'AUTHENTICATION_REQUIRED')

const signedOut: Snapshot = { status: 'ANONYMOUS', user: null, csrfToken: '', expiresAt: '', registrationEmail: null }

// Google sign-in can take a few minutes, and the anonymous session it belongs to ends 10 minutes after it was created.
const GOOGLE_MIN_SESSION_MS = 6 * 60_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [bootError, setBootError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  // Async flows read the latest snapshot here instead of a stale render closure.
  const current = useRef<Snapshot | null>(null)

  const apply = useCallback((next: Snapshot) => {
    current.current = next
    setSnapshot(next)
  }, [])

  useEffect(() => {
    let active = true
    bootstrap ??= api.getSession().finally(() => {
      bootstrap = null
    })
    bootstrap.then(
      (next) => {
        if (active) apply(next)
      },
      (error: unknown) => {
        if (active) setBootError(toFormError(error).message)
      },
    )
    return () => {
      active = false
    }
  }, [apply, attempt])

  const refresh = useCallback(async () => {
    let next: Snapshot
    try {
      next = await api.getSession()
    } catch {
      throw staleError()
    }
    apply(next)
    return next
  }, [apply])

  // Runs a CSRF-protected POST. Returns null when the browser turned out to be signed in already.
  const withSession = useCallback(
    async <T,>(call: (csrf: string) => Promise<T>): Promise<T | null> => {
      const csrf = current.current?.csrfToken
      if (csrf === undefined) throw staleError()
      try {
        return await call(csrf)
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
        if (error.code === 'ALREADY_AUTHENTICATED') {
          await refresh()
          return null
        }
        if (!isStale(error)) throw error
      }
      const fresh = await refresh()
      // Another tab (or an earlier click) already signed in.
      if (fresh.status === 'AUTHENTICATED') return null
      try {
        // Pass the fresh token directly; React state may not have updated yet.
        return await call(fresh.csrfToken)
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
        if (error.code === 'ALREADY_AUTHENTICATED') {
          await refresh()
          return null
        }
        throw isStale(error) ? staleError() : error
      }
    },
    [refresh],
  )

  // Runs a request that needs this browser to stay signed in. A stale CSRF token is refreshed and retried once;
  // if the session has ended, the snapshot is updated and AUTHENTICATION_REQUIRED is thrown.
  const signedIn = useCallback(
    async <T,>(call: (csrf: string) => Promise<T>): Promise<T> => {
      const csrf = current.current?.csrfToken
      if (csrf === undefined) throw staleError()
      try {
        return await call(csrf)
      } catch (error) {
        if (!(error instanceof ApiError) || !isStale(error)) throw error
      }
      const fresh = await refresh()
      if (fresh.status !== 'AUTHENTICATED') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '')
      return call(fresh.csrfToken)
    },
    [refresh],
  )

  const submit = useCallback(
    async <B,>(call: (csrf: string, body: B) => Promise<Snapshot>, body: B) => {
      const next = await withSession((csrf) => call(csrf, body))
      if (next) apply(next)
    },
    [apply, withSession],
  )

  const startGoogle = useCallback(async () => {
    const now = current.current
    // Start from a fresh anonymous session when little time is left, so the callback still finds this browser.
    if (now && now.status !== 'AUTHENTICATED' && Date.parse(now.expiresAt) - Date.now() < GOOGLE_MIN_SESSION_MS) {
      await api.logout(now.csrfToken).catch(() => undefined)
      await refresh()
    }
    const started = await withSession(api.startGoogle)
    return started ? started.authorizationUrl : null
  }, [refresh, withSession])

  const logout = useCallback(async () => {
    const csrf = current.current?.csrfToken
    if (csrf === undefined) return
    try {
      await api.logout(csrf)
      apply(signedOut)
    } catch (error) {
      if (!(error instanceof ApiError) || !isStale(error)) throw error
    }
    await refresh()
  }, [apply, refresh])

  const value = useMemo<AuthState>(
    () => ({
      snapshot,
      bootError,
      retryBootstrap: () => {
        setBootError(undefined)
        setAttempt((n) => n + 1)
      },
      login: (body) => submit(api.login, body),
      register: (body) => submit(api.register, body),
      logout,
      startGoogle,
      googleRegister: (body) => submit(api.googleRegister, body),
      signedIn,
    }),
    [snapshot, bootError, submit, logout, startGoogle, signedIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
