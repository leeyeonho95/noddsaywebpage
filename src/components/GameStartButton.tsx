import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { approveLaunch, cancelLaunch, createLaunch, getLaunch, type LaunchCreated, type LaunchStatus } from '../api/gameLaunch'
import { ApiError } from '../api/webAuth'
import { useAuth } from '../auth/context'
import { toFormError } from '../lib/errors'

export const START_LOGIN_NOTICE = '게임 시작은 로그인 후 이용 가능합니다'

// The backend asks for at least 3 seconds between status checks.
const POLL_MS = 3000
// After a network error, or a rate limit without Retry-After, wait longer before checking again.
const RETRY_MS = 10_000
// The browser cannot tell whether the app is installed; no answer from it by then means it probably is not.
const NOT_INSTALLED_MS = 10_000

const TRANSIENT = new Set(['NETWORK_ERROR', 'HTTP_ERROR', 'RATE_LIMITED'])
const isDone = (status: LaunchStatus) => status.status === 'CONSUMED' || status.status === 'EXPIRED'
// Before approval the request is withdrawn on close; once approved, the app may still be finishing its sign-in.
const isCancellable = (status: LaunchStatus) => status.status === 'AWAITING_APP' || status.status === 'AWAITING_APPROVAL'

const primary =
  'flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'
const secondary =
  'flex w-full items-center justify-center rounded-full px-6 py-3 font-display text-label-lg text-on-surface-variant hover:bg-surface-container'

// "게임 시작": signed-out visitors go to the login page; signed-in ones open the installed app, which is then signed in
// with this account once it answers.
export function GameStartButton({ className }: { className: string }) {
  const { snapshot, signedIn } = useAuth()
  const navigate = useNavigate()
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  // Bumped on every start and close, so replies to an earlier click are ignored.
  const attempt = useRef(0)
  // For the unmount cleanup, which only sees the first render's state.
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

  // Ends the current attempt: replies to it are ignored and a request not yet approved is withdrawn.
  // Safe to run twice (a button close, then the dialog's own close event).
  const finish = useCallback(() => {
    attempt.current++
    const { launch: open, status: state } = latest.current
    if (open && state && isCancellable(state)) withdraw(open.launchId)
    latest.current = { launch: null, status: null }
    setLaunch(null)
    setStatus(null)
    setNotInstalled(false)
    setError(undefined)
    setPending(false)
  }, [withdraw])

  // Cleans up right away instead of waiting for the close event, which is queued and may come late or not at all
  // (seen in a background tab), leaving a request alive.
  const closeDialog = useCallback(() => {
    finish()
    dialog.current?.close()
  }, [finish])

  const toLogin = useCallback(() => {
    closeDialog()
    navigate('/login', { state: { notice: START_LOGIN_NOTICE } })
  }, [closeDialog, navigate])

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
    if (!dialog.current?.open) dialog.current?.showModal()
    const mine = ++attempt.current
    setLaunch(null)
    setStatus(null)
    setNotInstalled(false)
    setError(undefined)
    setPending(true)
    try {
      const created = await signedIn(createLaunch)
      // Closed while the request was being made: withdraw it instead of opening the app.
      if (attempt.current !== mine) return withdraw(created.launchId)
      setLaunch(created)
      setStatus({ launchId: created.launchId, status: 'AWAITING_APP', confirmationCode: null, expiresAt: created.expiresAt })
      window.location.href = created.launchUri
    } catch (cause) {
      if (attempt.current === mine) fail(cause)
    } finally {
      if (attempt.current === mine) setPending(false)
    }
  }

  function reopen() {
    if (launch) window.location.href = launch.launchUri
  }

  function goDownload() {
    closeDialog()
    navigate({ pathname: '/', hash: '#download' })
  }

  // A layout effect, so a close right after a status change already sees that status.
  useLayoutEffect(() => {
    latest.current = { launch, status }
  })

  // Leaving the page with the dialog open (e.g. the browser's back button) does not fire close. Bumping the attempt
  // also stops a pending start from opening the app afterwards.
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
        // The backend handoff guide advises against this, since a code check is what catches a different app
        // binding first; the README records the trade-off.
        if (alive && next.status === 'AWAITING_APPROVAL' && code) {
          try {
            next = await signedIn((csrf) => approveLaunch(csrf, launch.launchId, code))
          } catch (cause) {
            if (!alive) return
            // Still show that the app is connected (no "not installed" note); the next check approves again.
            setStatus(next)
            retry(cause)
            return
          }
        }
        if (!alive) return
        setStatus(next)
        // A fresh status supersedes an earlier error message.
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

  // When the step changes, move focus to the dialog itself, so it never stays on a button that just went away.
  const phase = error ? 'error' : (status?.status ?? 'starting')
  useEffect(() => {
    if (dialog.current?.open) dialog.current.focus()
  }, [phase])

  // Keys keep each action its own DOM node, so a focused button never turns into a different action.
  const close = (
    <button key="close" type="button" onClick={closeDialog} className={secondary}>
      닫기
    </button>
  )
  const restart = (
    <button key="restart" type="button" onClick={start} disabled={pending} className={primary}>
      다시 시작
    </button>
  )

  let body: ReactNode
  let actions: ReactNode
  if (error) {
    body = <p className="font-semibold text-error">{error}</p>
    actions = (
      <>
        {restart}
        {close}
      </>
    )
  } else if (!status) {
    body = <p>게임 실행을 준비하고 있어요…</p>
    actions = close
  } else if (status.status === 'AWAITING_APP') {
    body = (
      <>
        <p>노디세이 게임을 여는 중이에요</p>
        <p>브라우저가 앱을 열지 물어보면 &lsquo;열기&rsquo;를 눌러 주세요</p>
        {notInstalled && (
          <div className="mt-4 rounded-lg bg-surface-container-low p-4">
            <p className="font-semibold text-on-surface">게임이 열리지 않나요?</p>
            <p>아직 설치하지 않았다면 먼저 게임을 내려받아 주세요</p>
          </div>
        )}
      </>
    )
    actions = notInstalled ? (
      <>
        <button key="download" type="button" onClick={goDownload} className={primary}>
          <span aria-hidden="true" className="material-symbols-outlined text-2xl">
            download
          </span>
          게임 다운로드
        </button>
        <button key="reopen" type="button" onClick={reopen} className={secondary}>
          게임 다시 열기
        </button>
        {close}
      </>
    ) : (
      close
    )
  } else if (status.status === 'AWAITING_APPROVAL' || status.status === 'APPROVED') {
    // AWAITING_APPROVAL only shows when the automatic approval failed; the next check tries again.
    body = (
      <>
        <p>게임이 열렸어요</p>
        <p>이 계정으로 게임에 로그인하는 중이에요…</p>
      </>
    )
    actions = close
  } else if (status.status === 'CONSUMED') {
    body = (
      <>
        <p className="font-semibold text-on-surface">게임에 로그인했어요</p>
        <p>게임 화면에서 계속해 주세요</p>
      </>
    )
    actions = close
  } else {
    // EXPIRED, or LAUNCH_INVALID: timed out, replaced by a newer 게임 시작 in another tab, or cancelled.
    body = (
      <>
        <p>게임 실행 요청이 끝났어요</p>
        <p>시간이 지났거나, 다른 창에서 게임 시작을 다시 눌렀을 수 있어요</p>
        <p>다시 시작해 주세요</p>
      </>
    )
    actions = (
      <>
        {restart}
        {close}
      </>
    )
  }

  return (
    <>
      <button type="button" onClick={start} disabled={snapshot === null} className={`game-start-button ${className}`}>
        <span className="game-start-content">
          <span aria-hidden="true" className="material-symbols-outlined text-[1.4em] leading-none">
            play_arrow
          </span>
          <span className="game-start-label">게임 시작</span>
        </span>
      </button>
      {/* Tailwind's reset removes the dialog's default centering, hence m-auto. The text resets undo what the
          header and hero around the button set (nowrap, display font, white text). */}
      <dialog
        ref={dialog}
        // Esc closes the dialog without our buttons.
        onClose={finish}
        aria-labelledby={titleId}
        tabIndex={-1}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface-container-lowest p-6 text-left font-sans text-body-md tracking-normal whitespace-normal text-on-surface shadow-xl outline-none backdrop:bg-[#1F1A14]/60 sm:p-8"
      >
        <h2 id={titleId} className="font-display text-headline-md">
          게임 시작
        </h2>
        <div aria-live="polite" className="mt-4 whitespace-pre-line text-body-md text-on-surface-variant">
          {body}
        </div>
        <div className="mt-6 flex flex-col gap-2">{actions}</div>
      </dialog>
    </>
  )
}
