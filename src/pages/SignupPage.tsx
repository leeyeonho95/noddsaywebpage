import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { FormAlert, SubmitButton } from '../components/FormParts'
import { GoogleButton } from '../components/GoogleButton'
import { TermsFieldset } from '../components/TermsFieldset'
import { TextField } from '../components/TextField'
import { toFormError } from '../lib/errors'
import { NO_TERMS, termsAccepted } from '../lib/terms'
import { useGoogleSignIn } from '../lib/useGoogleSignIn'
import { checkDisplayName, checkEmail, checkPassword, codePoints, PASSWORD_MIN } from '../lib/validation'

const FIELDS = ['displayName', 'email', 'password', 'confirm', 'terms'] as const
type Field = (typeof FIELDS)[number]
const isField = (field: string): field is Field => (FIELDS as readonly string[]).includes(field)

export function SignupPage() {
  const { snapshot, register } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(NO_TERMS)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const google = useGoogleSignIn(setFormError)

  const clear = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }))
  const passwordLength = codePoints(password)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const next: Partial<Record<Field, string>> = {
      displayName: checkDisplayName(displayName),
      email: checkEmail(trimmedEmail),
      password: checkPassword(password),
      confirm: confirm === password ? undefined : '비밀번호가 일치하지 않아요.',
      terms: termsAccepted(terms) ? undefined : '필수 약관에 모두 동의해 주세요.',
    }
    setErrors(next)
    setFormError(undefined)
    if (Object.values(next).some(Boolean)) return

    setPending(true)
    try {
      // Success signs the user in; the route guard then moves to the home page.
      await register({ email: trimmedEmail, password, displayName })
    } catch (error) {
      const { field, message } = toFormError(error)
      if (field && isField(field)) setErrors({ [field]: message })
      else setFormError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute -top-32 -left-20 size-96 rounded-full bg-secondary-fixed opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-32 size-96 rounded-full bg-primary-fixed opacity-70 blur-3xl" />

      <div className="relative z-10 flex w-full justify-center">
        <div className="flex w-full max-w-lg flex-col rounded-xl bg-surface-container-lowest p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logo} alt="노디세이 NODDSAY" className="mb-3 h-16 w-auto md:h-20" />
            <h1 className="font-display text-headline-md tracking-tight">새로운 모험가 등록</h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">노디세이에 합류해 거친 급류를 정복하세요!</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <TextField
              id="displayName"
              label="모험가 닉네임"
              labelAside={<span className="text-label-sm text-tertiary">필수 정보</span>}
              placeholder="카누마스터"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                clear('displayName')
              }}
              hint="2~40자. 다른 모험가와 같아도 괜찮아요."
              error={errors.displayName}
            />
            <TextField
              id="email"
              label="이메일 주소"
              type="email"
              placeholder="adventurer@noddsay.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clear('email')
              }}
              error={errors.email}
            />
            <TextField
              id="password"
              label="비밀번호"
              type="password"
              placeholder={`${PASSWORD_MIN}자 이상`}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clear('password')
              }}
              hint={
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-all ${passwordLength >= PASSWORD_MIN ? 'bg-secondary' : 'bg-primary-container'}`}
                      style={{ width: `${(Math.min(passwordLength, PASSWORD_MIN) / PASSWORD_MIN) * 100}%` }}
                    />
                  </div>
                  <span className="min-w-14 text-right font-display text-label-sm">
                    {passwordLength >= PASSWORD_MIN ? '사용 가능' : `${passwordLength}/${PASSWORD_MIN}자`}
                  </span>
                </div>
              }
              error={errors.password}
            />
            <TextField
              id="confirm"
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 한 번 더 입력하세요"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                clear('confirm')
              }}
              error={errors.confirm}
            />

            <TermsFieldset
              value={terms}
              onChange={(next) => {
                setTerms(next)
                clear('terms')
              }}
              error={errors.terms}
            />

            <FormAlert message={formError} />
            <SubmitButton icon="sailing" pending={pending} disabled={snapshot === null || google.busy}>
              모험가 등록 완료하기
            </SubmitButton>
          </form>

          <div className="mt-4">
            <GoogleButton busy={google.busy} disabled={snapshot === null || pending} onClick={google.start} />
          </div>

          <p className="mt-6 text-center text-body-sm text-on-surface-variant">
            이미 계정이 있으신가요?
            <Link to="/login" className="ml-1 inline-flex items-center gap-0.5 font-display text-label-md text-secondary hover:underline">
              로그인하기
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
