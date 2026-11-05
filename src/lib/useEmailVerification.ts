import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CODE_TTL_MS,
  confirmCode,
  RESEND_AFTER_MS,
  sendCode,
  VERIFICATION_TOKEN_TTL_MS,
  type VerificationPurpose,
} from '../api/emailVerification'
import { ApiError } from '../api/webAuth'
import { useAuth } from '../auth/context'
import { toFormError, VERIFICATION_EXPIRED } from './errors'
import { checkEmail } from './validation'

// Password reset does not say whether the e-mail has an account.
const SENT_NOTICE: Record<VerificationPurpose, string> = {
  SIGNUP: '인증번호를 보냈어요. 메일함을 확인해 주세요.',
  PASSWORD_RESET: '가입된 이메일이면 인증번호가 도착해요.',
}
const VERIFIED_NOTICE: Record<VerificationPurpose, string> = {
  SIGNUP: '이메일 인증을 완료했어요. 5분 안에 가입을 마쳐 주세요.',
  PASSWORD_RESET: '이메일 인증을 완료했어요. 5분 안에 새 비밀번호를 정해 주세요.',
}
export const EXPIRED_NOTICE = '인증 시간이 지났어요. 인증번호를 다시 받아 주세요.'

// E-mail + code verification shared by sign-up and password reset. Changing the e-mail starts over.
export function useEmailVerification(purpose: VerificationPurpose) {
  const { snapshot, anonymous } = useAuth()
  const [email, setEmailValue] = useState('')
  const [code, setCodeValue] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  // When 인증번호 받기 works again: 60 seconds after a send, or the server's Retry-After after a 429. `global` marks a
  // limit that does not depend on the e-mail (RATE_LIMITED for this IP, EMAIL_DAILY_LIMIT_REACHED for the whole
  // service), so it and its `notice` survive an e-mail change; the other waits are per e-mail.
  const [resendAt, setResendAt] = useState<{ at: number; global: boolean; notice?: string } | null>(null)
  const [token, setToken] = useState<string | null>(null)
  // Both proofs expire after 5 minutes; the e-mail then has to be verified again.
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
  const [pending, setPending] = useState<'send' | 'confirm' | null>(null)
  const [emailError, setEmailError] = useState<string>()
  const [codeError, setCodeError] = useState<string>()
  const [now, setNow] = useState(() => Date.now())
  // Bumped when the e-mail changes, a new code is sent or verification starts over, so a late reply is dropped.
  const round = useRef(0)
  // What a screen reader should hear, set only when something happens. `count` lets the same text be read again.
  const [notice, setNotice] = useState({ text: '', count: 0 })
  const announce = useCallback((text: string) => setNotice((n) => ({ text, count: n.count + 1 })), [])

  // Back to an unverified e-mail, keeping its text. `error` says why, e.g. the verification token ran out.
  const restart = useCallback(
    (error?: string) => {
      round.current++
      setExpiresAt(null)
      setResendAt((wait) => (wait?.global ? wait : null))
      setToken(null)
      setTokenExpiresAt(null)
      setCodeValue('')
      setCodeError(undefined)
      setPending(null)
      setEmailError(error)
      if (error) announce(error)
      // Clearing is silent; nothing stale stays in the live region.
      else setNotice((n) => ({ text: '', count: n.count }))
    },
    [announce],
  )

  // Tick once a second while a sent code is waiting to be entered; announce and stop when it runs out.
  useEffect(() => {
    if (expiresAt === null || token !== null) return
    const timer = window.setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick < expiresAt) return
      window.clearInterval(timer)
      announce(EXPIRED_NOTICE)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, token, announce])

  // Count down the wait before another code can be sent.
  useEffect(() => {
    if (resendAt === null) return
    const timer = window.setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick < resendAt.at) return
      window.clearInterval(timer)
      setResendAt(null)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])

  // Count down the proof; when it runs out, verify the address again.
  useEffect(() => {
    if (tokenExpiresAt === null) return
    const timer = window.setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick < tokenExpiresAt) return
      window.clearInterval(timer)
      restart(VERIFICATION_EXPIRED)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [tokenExpiresAt, restart])

  function setEmail(value: string) {
    setEmailValue(value)
    restart()
  }

  function setCode(value: string) {
    setCodeValue(value.replace(/\D/g, '').slice(0, 6))
    setCodeError(undefined)
  }

  function emailFailed(message: string) {
    setEmailError(message)
    announce(message)
  }

  function codeFailed(message: string) {
    setCodeError(message)
    announce(message)
  }

  async function send() {
    const trimmed = email.trim()
    const invalid = checkEmail(trimmed)
    if (invalid) return emailFailed(invalid)
    const mine = ++round.current
    setPending('send')
    setEmailError(undefined)
    setCodeError(undefined)
    // The server starts the code's 5 minutes and the 60-second wait when the request arrives, before the mail goes out.
    const startedAt = Date.now()
    try {
      // null: this browser turned out to be signed in, and the route guard is leaving the page.
      if ((await anonymous((csrf) => sendCode(csrf, { email: trimmed, purpose }))) === null) return
      if (round.current !== mine) return
      setExpiresAt(startedAt + CODE_TTL_MS)
      setResendAt({ at: startedAt + RESEND_AFTER_MS, global: false })
      setNow(Date.now())
      setCodeValue('')
      announce(SENT_NOTICE[purpose])
    } catch (error) {
      if (round.current !== mine) return
      const { message } = toFormError(error)
      if (error instanceof ApiError && error.retryAfter) {
        // 429 (too many codes for this e-mail, this IP or the whole service today): wait as long as the server says.
        const isGlobal = error.code === 'RATE_LIMITED' || error.code === 'EMAIL_DAILY_LIMIT_REACHED'
        setResendAt({ at: Date.now() + error.retryAfter * 1000, global: isGlobal, notice: isGlobal ? message : undefined })
      } else if (error instanceof ApiError && error.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
        // Sign-up: the mail failed, so the server has dropped the previous code and still counts the try; no retry for
        // a minute. (A password-reset 503 only means mail is not configured; its mail goes out later, off the request.)
        setExpiresAt(null)
        setCodeValue('')
        setResendAt({ at: startedAt + RESEND_AFTER_MS, global: false })
      }
      setNow(Date.now())
      emailFailed(message)
    } finally {
      if (round.current === mine) setPending(null)
    }
  }

  async function confirm() {
    if (code.length !== 6) return codeFailed('인증번호 6자리를 입력해 주세요.')
    const mine = round.current
    setPending('confirm')
    setCodeError(undefined)
    // As with the code, the token's 5 minutes start on the server before the reply arrives.
    const startedAt = Date.now()
    try {
      const verified = await anonymous((csrf) => confirmCode(csrf, { email: email.trim(), purpose, code }))
      if (verified === null || round.current !== mine) return
      setToken(verified.verificationToken)
      setTokenExpiresAt(startedAt + VERIFICATION_TOKEN_TTL_MS)
      setNow(Date.now())
      announce(VERIFIED_NOTICE[purpose])
    } catch (error) {
      if (round.current === mine) codeFailed(toFormError(error).message)
    } finally {
      if (round.current === mine) setPending(null)
    }
  }

  const remainingMs = expiresAt === null ? 0 : Math.max(0, expiresAt - now)
  const expired = expiresAt !== null && remainingMs === 0

  return {
    purpose,
    email,
    setEmail,
    code,
    setCode,
    send,
    confirm,
    // Unlocks a verified e-mail so it can be changed (and verified again).
    edit: () => setEmail(email),
    // Starts over with an error on the e-mail, e.g. when the server refused the verification token.
    restart,
    sent: expiresAt !== null,
    sentNotice: SENT_NOTICE[purpose],
    remainingMs,
    expired,
    // How long until another code can be sent; 0 when it can be sent now.
    resendWaitMs: resendAt === null ? 0 : Math.max(0, resendAt.at - now),
    // Why a wait that outlived an e-mail change is still on (the error itself was cleared with the old e-mail).
    waitNotice: resendAt?.global && resendAt.at > now ? resendAt.notice : undefined,
    // The session has loaded, so requests carry a CSRF token.
    ready: snapshot !== null,
    verified: token !== null,
    // How long the verified proof still works.
    tokenRemainingMs: tokenExpiresAt === null ? null : Math.max(0, tokenExpiresAt - now),
    // For one polite live region. A no-break space on every other event makes a repeated text count as a change.
    announcement: notice.text && notice.text + (notice.count % 2 ? ' ' : ''),
    // Proof of the verified e-mail for the sign-up or password-reset request.
    token,
    pending,
    emailError,
    codeError,
  }
}

export type EmailVerification = ReturnType<typeof useEmailVerification>
