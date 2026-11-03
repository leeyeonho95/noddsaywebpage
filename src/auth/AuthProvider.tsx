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

const signedOut: Snapshot = { status: 'ANONYMOUS', user: null, csrfToken: '', expiresAt: '' }

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

  const submit = useCallback(
    async <B,>(call: (csrf: string, body: B) => Promise<Snapshot>, body: B) => {
      const csrf = current.current?.csrfToken
      if (csrf === undefined) throw staleError()
      try {
        apply(await call(csrf, body))
        return
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
        if (error.code === 'ALREADY_AUTHENTICATED') {
          await refresh()
          return
        }
        if (!isStale(error)) throw error
      }
      const fresh = await refresh()
      // Another tab (or an earlier click) already signed in.
      if (fresh.status === 'AUTHENTICATED') return
      try {
        // Pass the fresh token directly; React state may not have updated yet.
        apply(await call(fresh.csrfToken, body))
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
        if (error.code === 'ALREADY_AUTHENTICATED') {
          await refresh()
          return
        }
        throw isStale(error) ? staleError() : error
      }
    },
    [apply, refresh],
  )

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
    }),
    [snapshot, bootError, submit, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
