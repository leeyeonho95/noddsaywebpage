import { useCallback, useEffect, useRef, useState } from 'react'
import { confirmCode, sendCode, type VerificationPurpose } from '../api/emailVerification'
import { useAuth } from '../auth/context'
import { toFormError } from './errors'
import { checkEmail } from './validation'

// Password reset does not say whether the e-mail has an account.
const SENT_NOTICE: Record<VerificationPurpose, string> = {
  SIGNUP: '인증번호를 보냈어요. 메일함을 확인해 주세요.',
  PASSWORD_RESET: '가입된 이메일이면 인증번호가 도착해요.',
}
export const EXPIRED_NOTICE = '인증 시간이 지났어요. 인증번호를 다시 받아 주세요.'

// E-mail + code verification shared by sign-up and password reset. Changing the e-mail starts over.
export function useEmailVerification(purpose: VerificationPurpose) {
  const { snapshot } = useAuth()
  const [email, setEmailValue] = useState('')
  const [code, setCodeValue] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [pending, setPending] = useState<'send' | 'confirm' | null>(null)
  const [emailError, setEmailError] = useState<string>()
  const [codeError, setCodeError] = useState<string>()
  const [now, setNow] = useState(() => Date.now())
  // Bumped when the e-mail changes or a new code is sent, so a late reply for the old one is dropped.
  const round = useRef(0)
  // What a screen reader should hear, set only when something happens. `count` lets the same text be read again.
  const [notice, setNotice] = useState({ text: '', count: 0 })
  const announce = useCallback((text: string) => setNotice((n) => ({ text, count: n.count + 1 })), [])

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

  // Read as is for now; retrying with a refreshed token comes with the real API.
  const csrf = snapshot?.csrfToken ?? ''

  function setEmail(value: string) {
    round.current++
    setEmailValue(value)
    setEmailError(undefined)
    setExpiresAt(null)
    setToken(null)
    setCodeValue('')
    setCodeError(undefined)
    setPending(null)
    // Clearing is silent; nothing stale stays in the live region.
    setNotice((n) => ({ text: '', count: n.count }))
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
    try {
      const sent = await sendCode(csrf, { email: trimmed, purpose })
      if (round.current !== mine) return
      setExpiresAt(Date.now() + sent.expiresInSeconds * 1000)
      setNow(Date.now())
      setCodeValue('')
      announce(SENT_NOTICE[purpose])
    } catch (error) {
      if (round.current === mine) emailFailed(toFormError(error).message)
    } finally {
      if (round.current === mine) setPending(null)
    }
  }

  async function confirm() {
    if (code.length !== 6) return codeFailed('인증번호 6자리를 입력해 주세요.')
    const mine = round.current
    setPending('confirm')
    setCodeError(undefined)
    try {
      const verified = await confirmCode(csrf, { email: email.trim(), purpose, code })
      if (round.current !== mine) return
      setToken(verified.verificationToken)
      announce('이메일 인증을 완료했어요.')
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
    sent: expiresAt !== null,
    sentNotice: SENT_NOTICE[purpose],
    remainingMs,
    expired,
    verified: token !== null,
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
