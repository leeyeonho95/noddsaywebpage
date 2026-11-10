import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { approveLaunch, cancelLaunch, createLaunch, getLaunch, type LaunchCreated, type LaunchStatus } from '../api/gameLaunch'
import { ApiError } from '../api/webAuth'
import { useAuth } from '../auth/context'
import { toFormError } from '../lib/errors'

export const START_LOGIN_NOTICE = '게임 시작은 로그인 후 이용 가능합니다'

// The backend asks for at least 3 seconds between status checks.
const POLL_MS = 3000
const RETRY_MS = 10_000
const NOT_INSTALLED_MS = 10_000
const TRANSIENT = new Set(['NETWORK_ERROR', 'HTTP_ERROR', 'RATE_LIMITED'])
const isDone = (status: LaunchStatus) => status.status === 'CONSUMED' || status.status === 'EXPIRED'
const isCancellable = (status: LaunchStatus) => status.status === 'AWAITING_APP' || status.status === 'AWAITING_APPROVAL'

// The browser's protocol confirmation is the only prompt during a normal launch.
export function GameStartButton({ className }: { className: string }) {
  const { snapshot, signedIn } = useAuth()
  const navigate = useNavigate()
  const attempt = useRef(0)
  const latest = useRef<{ launch: LaunchCreated | null; status: LaunchStatus | null }>({ launch: null, status: null })
  const [launch, setLaunch] = useState<LaunchCreated | null>(null)
  const [status, setStatus] = useState<LaunchStatus | null>(null)
  const [notInstalled, setNotInstalled] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const withdraw = useCallback(
    (id: string) => {
      signedIn((csrf) => cancelLaunch(csrf, id)).catch(() => undefined)
    },
    [signedIn],
  )

  const toLogin = useCallback(() => {
    navigate('/login', { state: { notice: START_LOGIN_NOTICE } })
  }, [navigate])

  const fail = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.code === 'AUTHENTICATION_REQUIRED') toLogin()
      else if (cause instanceof ApiError && cause.code === 'LAUNCH_INVALID') setStatus((s) => s && { ...s, status: 'EXPIRED' })
      else setError(toFormError(cause).message)
    },
    [toLogin],
  )

  async function start() {
    if (snapshot?.status !== 'AUTHENTICATED') return toLogin()
    if (pending) return
    const mine = ++attempt.current
    const previous = latest.current
    if (previous.launch && previous.status && isCancellable(previous.status)) withdraw(previous.launch.launchId)
    latest.current = { launch: null, status: null }
    setLaunch(null)
    setStatus(null)
    setNotInstalled(false)
    setError(undefined)
    setPending(true)
    try {
      const created = await signedIn(createLaunch)
      if (attempt.current !== mine) return withdraw(created.launchId)
      const awaiting: LaunchStatus = { launchId: created.launchId, status: 'AWAITING_APP', confirmationCode: null, expiresAt: created.expiresAt }
      latest.current = { launch: created, status: awaiting }
      setLaunch(created)
      setStatus(awaiting)
      window.location.href = created.launchUri
    } catch (cause) {
      if (attempt.current === mine) fail(cause)
    } finally {
      if (attempt.current === mine) setPending(false)
    }
  }

  useLayoutEffect(() => {
    latest.current = { launch, status }
  })

  useEffect(
    () => () => {
      attempt.current++
      const { launch: open, status: state } = latest.current
      if (open && state && isCancellable(state)) withdraw(open.launchId)
    },
    [withdraw],
  )

  useEffect(() => {
    if (!launch) return
    let alive = true
    let timer = 0
    const poll = (delay: number) => {
      timer = window.setTimeout(async () => {
        const retry = (cause: unknown) => {
          if (cause instanceof ApiError && TRANSIENT.has(cause.code)) poll(cause.retryAfter ? Math.max(POLL_MS, cause.retryAfter * 1000) : RETRY_MS)
          else fail(cause)
        }
        let next: LaunchStatus
        try {
          next = await signedIn(() => getLaunch(launch.launchId))
        } catch (cause) {
          if (alive) retry(cause)
          return
        }
        const code = next.confirmationCode
        // Team decision (2026-11-04): approve as soon as the app binds instead of asking the user to compare codes.
        if (alive && next.status === 'AWAITING_APPROVAL' && code) {
          try {
            next = await signedIn((csrf) => approveLaunch(csrf, launch.launchId, code))
          } catch (cause) {
            if (!alive) return
            setStatus(next)
            retry(cause)
            return
          }
        }
        if (!alive) return
        setStatus(next)
        setError(undefined)
        if (!isDone(next)) poll(POLL_MS)
      }, delay)
    }
    poll(POLL_MS)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [launch, signedIn, fail])

  useEffect(() => {
    if (!launch) return
    const timer = window.setTimeout(() => setNotInstalled(true), NOT_INSTALLED_MS)
    return () => window.clearTimeout(timer)
  }, [launch])

  function dismiss() {
    const { launch: open, status: state } = latest.current
    if (open && state && isCancellable(state)) withdraw(open.launchId)
    latest.current = { launch: null, status: null }
    setLaunch(null)
    setStatus(null)
    setNotInstalled(false)
    setError(undefined)
  }

  function goDownload() {
    dismiss()
    navigate({ pathname: '/', hash: '#download' })
  }

  return (
    <>
      <button type="button" onClick={start} disabled={snapshot === null || pending} className={`game-start-button ${className}`}>
        <span className="game-start-content">
          <span aria-hidden="true" className="material-symbols-outlined text-[1.4em] leading-none">
            play_arrow
          </span>
          <span className="game-start-label">{error || status?.status === 'EXPIRED' ? '다시 시작' : '게임 시작'}</span>
        </span>
      </button>
      {error && (
        <div role="alert" className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-error-container px-4 py-3 text-body-sm text-on-error-container shadow-lg">
          <span>{error} 게임 시작 버튼을 눌러 다시 시도해 주세요.</span>
          <button type="button" onClick={dismiss} className="underline">닫기</button>
        </div>
      )}
      {!error && notInstalled && status?.status === 'AWAITING_APP' && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface shadow-lg">
          {/* While the game updates itself the launch stays AWAITING_APP. 게임 다운로드 and 닫기 cancel it, and 다시 열기
              runs the exe the installer is replacing, so players are asked to wait (S15P31A206-264). */}
          <span className="text-center">
            게임이 열리지 않나요? 설치 여부를 확인해 주세요.
            <span className="block">게임이 업데이트 중이면 끝날 때까지 버튼을 누르지 말고 기다려 주세요.</span>
          </span>
          <button type="button" onClick={goDownload} className="underline">게임 다운로드</button>
          <button type="button" onClick={() => { if (launch) window.location.href = launch.launchUri }} className="underline">다시 열기</button>
          <button type="button" onClick={dismiss} className="underline">닫기</button>
        </div>
      )}
    </>
  )
}
