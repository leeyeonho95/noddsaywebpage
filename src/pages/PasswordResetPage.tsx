import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { resetPassword } from '../api/emailVerification'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { EmailVerificationFields } from '../components/EmailVerificationFields'
import { FormAlert, SubmitButton } from '../components/FormParts'
import { MatchHint, PasswordLengthHint } from '../components/PasswordHints'
import { TextField } from '../components/TextField'
import { toFormError } from '../lib/errors'
import { useEmailVerification } from '../lib/useEmailVerification'
import { checkPassword, PASSWORD_MIN } from '../lib/validation'

type Field = 'password' | 'confirm'

// 비밀번호 찾기: verify the account's e-mail, then set a new password. Screens only until the API exists
// (api/emailVerification.ts).
export function PasswordResetPage() {
  const { snapshot } = useAuth()
  const verification = useEmailVerification('PASSWORD_RESET')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const toLogin = useRef<HTMLAnchorElement>(null)

  // The form, with the focused submit button, is replaced by the done message: move focus to its link.
  useEffect(() => {
    if (done) toLogin.current?.focus()
  }, [done])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!verification.token) return
    const next: Partial<Record<Field, string>> = {
      password: checkPassword(password),
      confirm: confirm === password ? undefined : '비밀번호가 일치하지 않아요.',
    }
    setErrors(next)
    setFormError(undefined)
    if (Object.values(next).some(Boolean)) return

    setPending(true)
    try {
      await resetPassword(snapshot?.csrfToken ?? '', { verificationToken: verification.token, newPassword: password })
      setDone(true)
    } catch (error) {
      setFormError(toFormError(error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="relative flex flex-1 items-center justify-center overflow-clip px-4 py-12 md:px-8">
      <div className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-secondary-fixed opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-primary-fixed opacity-70 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-xl ring-8 ring-surface-container sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logo} alt="노디세이 NODDSAY" className="mb-4 h-20 w-auto md:h-24" />
            <h1 className="font-display text-headline-md tracking-tight">비밀번호 찾기</h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">가입한 이메일로 인증하고 새 비밀번호를 정해요.</p>
          </div>

          {/* Present from the start, so screen readers notice when it fills in. */}
          <p aria-live="polite" className="sr-only">
            {done ? '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.' : ''}
          </p>
          {done ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="text-body-md text-on-surface-variant">
                <p className="font-semibold text-on-surface">비밀번호를 바꿨어요.</p>
                <p>새 비밀번호로 로그인해 주세요.</p>
              </div>
              <Link
                ref={toLogin}
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3.5 font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105"
              >
                로그인하러 가기
              </Link>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              <EmailVerificationFields verification={verification} />
              {verification.verified && (
                <>
                  <TextField
                    id="password"
                    label="새 비밀번호"
                    type="password"
                    placeholder={`${PASSWORD_MIN}자 이상`}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((current) => ({ ...current, password: undefined }))
                    }}
                    hint={<PasswordLengthHint password={password} />}
                    error={errors.password}
                  />
                  <TextField
                    id="confirm"
                    label="새 비밀번호 확인"
                    type="password"
                    placeholder="새 비밀번호를 한 번 더 입력하세요"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value)
                      setErrors((current) => ({ ...current, confirm: undefined }))
                    }}
                    hint={errors.confirm || confirm === '' ? undefined : <MatchHint same={confirm === password} />}
                    error={errors.confirm}
                  />
                  <FormAlert message={formError} />
                  <SubmitButton icon="lock" pending={pending} disabled={snapshot === null}>
                    비밀번호 변경하기
                  </SubmitButton>
                </>
              )}
            </form>
          )}

          {/* Google-only accounts have no password and sign in with Google only (team decision 2026-11-04). */}
          <p className="mt-6 rounded-2xl bg-surface-container-low px-4 py-4 text-center text-body-sm text-on-surface-variant">
            <span className="block">Google로 가입한 계정은 비밀번호가 없어요.</span>
            <span className="block">로그인 화면에서 &lsquo;Google로 계속하기&rsquo;를 눌러 주세요.</span>
          </p>
          <Link to="/login" className="mt-4 self-center font-display text-label-md text-secondary hover:underline">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  )
}
