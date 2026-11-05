import { useEffect, type KeyboardEvent, type ReactNode } from 'react'
import { isMock, MOCK_CODE } from '../api/emailVerification'
import { EXPIRED_NOTICE, type EmailVerification } from '../lib/useEmailVerification'
import { TextField } from './TextField'

const formatRemaining = (ms: number) => {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function ActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-lg bg-secondary-fixed px-4 font-display text-label-md text-secondary hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

interface EmailVerificationFieldsProps {
  verification: EmailVerification
  // An e-mail error from the page itself, e.g. "인증을 완료해 주세요" or a sign-up conflict.
  error?: string
  // Called when the e-mail is edited or a code is requested, so the page can clear `error`.
  onEmailActivity?: () => void
}

// E-mail input with 인증번호 받기, then the code input with its timer until the e-mail is verified.
export function EmailVerificationFields({ verification: v, error, onEmailActivity }: EmailVerificationFieldsProps) {
  // Also busy until the session has loaded, like the page's submit button.
  const busy = v.pending !== null || !v.ready
  // After a send (60 seconds) or a 429 (Retry-After), another code cannot be requested yet.
  const waiting = v.resendWaitMs > 0

  function send() {
    v.send()
    onEmailActivity?.()
  }

  // Enter sends the code from the e-mail field and confirms it from the code field, instead of submitting the form.
  function onEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || v.verified) return
    event.preventDefault()
    if (!busy && !waiting) send()
  }

  function onCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!v.expired && !busy) v.confirm()
  }

  // The code field and its 확인 button disappear on success; keep focus in the form on the now-verified e-mail.
  useEffect(() => {
    if (v.verified) document.getElementById('email')?.focus()
  }, [v.verified])

  return (
    <>
      {/* Hints and errors are not live by themselves; this one region reads each step out. */}
      <p aria-live="polite" className="sr-only">
        {v.announcement}
      </p>
      <TextField
        id="email"
        label="이메일 주소"
        type="email"
        placeholder="adventurer@noddsay.com"
        autoComplete="email"
        value={v.email}
        readOnly={v.verified}
        onChange={(e) => {
          v.setEmail(e.target.value)
          onEmailActivity?.()
        }}
        onKeyDown={onEmailKeyDown}
        action={
          v.verified ? (
            <ActionButton
              onClick={() => {
                v.edit()
                onEmailActivity?.()
              }}
            >
              변경
            </ActionButton>
          ) : (
            <ActionButton onClick={send} disabled={busy || waiting}>
              {v.pending === 'send' ? '보내는 중…' : v.sent ? '다시 받기' : '인증번호 받기'}
              {/* Hidden from assistive tech, so the button's name does not change every second. */}
              {v.pending !== 'send' && waiting && <span aria-hidden="true"> {formatRemaining(v.resendWaitMs)}</span>}
            </ActionButton>
          )
        }
        hint={
          v.verified ? (
            <span className="font-display text-label-sm text-secondary">
              이메일 인증 완료
              {/* Sign-up only. Screen readers heard "5분 안에" when the e-mail was verified, so the clock is hidden. */}
              {v.tokenRemainingMs !== null && (
                <span aria-hidden="true"> · {formatRemaining(v.tokenRemainingMs)} 안에 가입해 주세요</span>
              )}
            </span>
          ) : v.sent ? (
            v.sentNotice
          ) : undefined
        }
        error={v.emailError ?? error}
      />
      {v.sent && !v.verified && (
        <TextField
          id="code"
          label="인증번호"
          labelAside={
            // Hidden from assistive tech: inside the label it would rename the input every second.
            <span aria-hidden="true" className={`font-display text-label-sm ${v.expired ? 'text-error' : 'text-secondary'}`}>
              {v.expired ? '시간 초과' : formatRemaining(v.remainingMs)}
            </span>
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6자리 숫자"
          maxLength={6}
          value={v.code}
          onChange={(e) => v.setCode(e.target.value)}
          onKeyDown={onCodeKeyDown}
          action={
            <ActionButton onClick={v.confirm} disabled={busy || v.expired}>
              확인
            </ActionButton>
          }
          hint={v.expired ? EXPIRED_NOTICE : isMock(v.purpose) ? `개발 모드: 인증번호 ${MOCK_CODE}` : undefined}
          error={v.codeError}
        />
      )}
    </>
  )
}
