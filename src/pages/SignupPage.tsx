import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { EmailVerificationFields } from '../components/EmailVerificationFields'
import { FormAlert, SubmitButton } from '../components/FormParts'
import { GoogleButton } from '../components/GoogleButton'
import { MatchHint, PasswordLengthHint } from '../components/PasswordHints'
import { TermsFieldset } from '../components/TermsFieldset'
import { TextField } from '../components/TextField'
import { toFormError } from '../lib/errors'
import { NO_TERMS, termsAccepted } from '../lib/terms'
import { useEmailVerification } from '../lib/useEmailVerification'
import { useGoogleSignIn } from '../lib/useGoogleSignIn'
import { checkDisplayName, checkEmail, checkPassword, PASSWORD_MIN } from '../lib/validation'

const FIELDS = ['displayName', 'email', 'password', 'confirm', 'terms'] as const
type Field = (typeof FIELDS)[number]
const isField = (field: string): field is Field => (FIELDS as readonly string[]).includes(field)

export function SignupPage() {
  const { snapshot, register } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const verification = useEmailVerification('SIGNUP')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(NO_TERMS)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const google = useGoogleSignIn(setFormError)

  const clear = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = verification.email.trim()
    const next: Partial<Record<Field, string>> = {
      displayName: checkDisplayName(displayName),
      // Sign-up needs a verified e-mail (team decision 2026-11-04).
      email: verification.verified ? undefined : (checkEmail(trimmedEmail) ?? '이메일 인증을 완료해 주세요.'),
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
      // TODO: send verification.token once the backend's sign-up accepts it (verification API, S15P31A206-198).
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
    <section className="relative flex flex-1 items-center justify-center overflow-clip px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute -top-32 -left-20 size-96 rounded-full bg-secondary-fixed opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-32 size-96 rounded-full bg-primary-fixed opacity-70 blur-3xl" />

      <div className="relative z-10 flex w-full justify-center">
        <div className="flex w-full max-w-lg flex-col rounded-xl bg-surface-container-lowest p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logo} alt="노디세이 NODDSAY" className="mb-3 h-16 w-auto md:h-20" />
            <h1 className="font-display text-headline-md tracking-tight">새로운 모험가 등록</h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">노디세이에 합류해 함께 노를 저어요!</p>
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
            <EmailVerificationFields verification={verification} error={errors.email} onEmailActivity={() => clear('email')} />
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
              hint={<PasswordLengthHint password={password} />}
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
              // Live match state; hidden while the submit error says the same thing.
              hint={errors.confirm || confirm === '' ? undefined : <MatchHint same={confirm === password} />}
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
