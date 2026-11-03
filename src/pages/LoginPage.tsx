import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { FormAlert, SubmitButton } from '../components/FormParts'
import { GoogleButton } from '../components/GoogleButton'
import { TextField } from '../components/TextField'
import { toFormError } from '../lib/errors'
import { useGoogleSignIn } from '../lib/useGoogleSignIn'

type Field = 'email' | 'password'

export function LoginPage() {
  const { snapshot, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [resetNotice, setResetNotice] = useState('')
  const google = useGoogleSignIn(setFormError)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const next: Partial<Record<Field, string>> = {
      email: trimmedEmail ? undefined : '이메일을 입력해 주세요.',
      password: password ? undefined : '비밀번호를 입력해 주세요.',
    }
    setErrors(next)
    setFormError(undefined)
    if (Object.values(next).some(Boolean)) return

    setPending(true)
    try {
      // Success signs the user in; the route guard then moves to the home page.
      await login({ email: trimmedEmail, password })
    } catch (error) {
      const { field, message } = toFormError(error)
      if (field === 'email' || field === 'password') setErrors({ [field]: message })
      else setFormError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 md:px-8">
      <div className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-secondary-fixed opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-primary-fixed opacity-70 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-xl ring-8 ring-surface-container sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logo} alt="노디세이 NODDSAY" className="mb-4 h-20 w-auto md:h-24" />
            <p className="text-body-sm text-on-surface-variant">모험의 섬으로 돌아오신 것을 환영합니다!</p>
            <h1 className="mt-1 font-display text-headline-md tracking-tight">로그인을 진행해 주세요</h1>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <TextField
              id="email"
              label="이메일 주소"
              type="email"
              icon="mail"
              placeholder="example@noddsay.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((current) => ({ ...current, email: undefined }))
              }}
              error={errors.email}
            />
            <TextField
              id="password"
              label="비밀번호"
              type="password"
              icon="lock"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors((current) => ({ ...current, password: undefined }))
              }}
              error={errors.password}
            />
            <div className="-mt-2 flex flex-col items-end gap-1">
              {/* Placeholder until the password reset API exists (Jira S15P31A206-198): link this to that flow then. */}
              <button
                type="button"
                onClick={() => setResetNotice('비밀번호 찾기는 아직 준비 중이에요.')}
                className="text-body-sm font-semibold text-secondary hover:underline"
              >
                비밀번호 찾기
              </button>
              <p aria-live="polite" className="text-body-sm text-on-surface-variant">
                {resetNotice}
              </p>
            </div>

            <FormAlert message={formError} />
            <SubmitButton icon="sailing" pending={pending} disabled={snapshot === null || google.busy}>
              로그인하기
            </SubmitButton>
          </form>

          <div className="mt-4">
            <GoogleButton busy={google.busy} disabled={snapshot === null || pending} onClick={google.start} />
          </div>

          <p className="mt-6 rounded-2xl bg-surface-container-low px-4 py-4 text-center text-body-sm text-on-surface-variant">
            아직 노디세이 계정이 없으신가요?
            <Link to="/signup" className="ml-1 inline-flex items-center gap-0.5 font-display text-label-md text-primary hover:underline">
              회원가입하기
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
