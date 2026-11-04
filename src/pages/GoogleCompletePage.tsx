import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../api/webAuth'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { FormAlert, SubmitButton } from '../components/FormParts'
import { TermsFieldset } from '../components/TermsFieldset'
import { TextField } from '../components/TextField'
import { toFormError } from '../lib/errors'
import { NO_TERMS, termsAccepted } from '../lib/terms'
import { checkDisplayName } from '../lib/validation'

// Errors the backend may pass as ?error=CODE once its callback redirects failures here. Only these codes get their
// own wording (from lib/errors); anything else gets the generic text, so the query value is never shown.
const CALLBACK_ERRORS = new Set(['GOOGLE_LOGIN_CANCELLED', 'GOOGLE_FLOW_EXPIRED', 'GOOGLE_WEB_NOT_CONFIGURED', 'GOOGLE_ACCOUNT_LINK_REQUIRED'])

const callbackMessage = (code: string) =>
  CALLBACK_ERRORS.has(code)
    ? toFormError(new ApiError(0, code, '')).message
    : 'Google 로그인을 마치지 못했어요. 다시 시도해 주세요.'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 md:px-8">
      <div className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-secondary-fixed opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-primary-fixed opacity-70 blur-3xl" />
      <div className="relative z-10 flex w-full max-w-md flex-col rounded-xl bg-surface-container-lowest p-6 shadow-xl ring-8 ring-surface-container sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="노디세이 NODDSAY" className="mb-4 h-16 w-auto" />
          <h1 className="font-display text-headline-md tracking-tight">{title}</h1>
        </div>
        {children}
      </div>
    </section>
  )
}

function BackToLogin({ message }: { message: string }) {
  return (
    <Card title="Google 로그인">
      <p className="text-center text-body-md text-on-surface-variant">{message}</p>
      <Link
        to="/login"
        className="mt-6 rounded-lg bg-primary-container px-6 py-3 text-center font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105"
      >
        로그인으로 돌아가기
      </Link>
    </Card>
  )
}

// Where the backend sends the browser after Google sign-in (WebAuthPolicy.completion). A signed-in visitor is sent home by GuestOnly.
export function GoogleCompletePage() {
  const { snapshot, googleRegister } = useAuth()
  const [params] = useSearchParams()
  const [displayName, setDisplayName] = useState('')
  const [terms, setTerms] = useState(NO_TERMS)
  const [errors, setErrors] = useState<{ displayName?: string; terms?: string }>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  // Once sign-up was pending, a later anonymous session means it ran out of time (or was retried on a new session).
  const [seenPending, setSeenPending] = useState(false)
  const registrationPending = snapshot?.status === 'REGISTRATION_REQUIRED'
  // Remembered during render (React's "storing information from previous renders"), not in an effect.
  if (registrationPending && !seenPending) setSeenPending(true)

  const errorCode = params.get('error')
  if (errorCode) return <BackToLogin message={callbackMessage(errorCode)} />
  if (snapshot === null) {
    return (
      <Card title="Google 로그인">
        <p role="status" className="text-center text-body-md text-on-surface-variant">
          확인하는 중…
        </p>
      </Card>
    )
  }
  if (!registrationPending) {
    return (
      <BackToLogin
        message={seenPending ? 'Google 인증 시간이 지났어요. 다시 시도해 주세요.' : 'Google 로그인 정보를 찾지 못했어요. 다시 시도해 주세요.'}
      />
    )
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = {
      displayName: checkDisplayName(displayName),
      terms: termsAccepted(terms) ? undefined : '필수 약관에 모두 동의해 주세요.',
    }
    setErrors(next)
    setFormError(undefined)
    if (next.displayName || next.terms) return

    setPending(true)
    try {
      // Success signs the user in; the route guard then moves to the home page.
      await googleRegister({ displayName })
    } catch (error) {
      const { field, message } = toFormError(error)
      if (field === 'displayName') setErrors({ displayName: message })
      else setFormError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card title="Google 계정으로 가입">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm">
          <span className="text-on-surface-variant">Google 계정</span>
          <p className="mt-0.5 font-semibold">{snapshot.registrationEmail}</p>
        </div>
        <TextField
          id="displayName"
          label="모험가 닉네임"
          placeholder="카누마스터"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            setErrors((current) => ({ ...current, displayName: undefined }))
          }}
          hint="2~40자. 다른 모험가와 같아도 괜찮아요."
          error={errors.displayName}
        />
        <TermsFieldset
          value={terms}
          onChange={(next) => {
            setTerms(next)
            setErrors((current) => ({ ...current, terms: undefined }))
          }}
          error={errors.terms}
        />
        <FormAlert message={formError} />
        <SubmitButton icon="sailing" pending={pending} disabled={false}>
          가입 완료하기
        </SubmitButton>
      </form>
      <Link to="/login" className="mt-6 text-center text-body-sm text-secondary hover:underline">
        로그인 화면으로
      </Link>
    </Card>
  )
}
