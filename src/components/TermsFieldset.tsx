import { termsAccepted, type Terms } from '../lib/terms'

const ITEMS = [
  ['service', '서비스 이용약관 동의'],
  ['privacy', '개인정보 수집 및 이용 동의'],
] as const

// The two required consents shared by e-mail and Google sign-up. Consent is checked here only; the server does not record it.
export function TermsFieldset({ value, onChange, error }: { value: Terms; onChange: (next: Terms) => void; error?: string }) {
  return (
    <>
      <fieldset
        aria-describedby={error ? 'terms-error' : undefined}
        className="mt-2 flex flex-col gap-2.5 rounded-lg bg-surface-container-low px-5 py-4"
      >
        <legend className="sr-only">약관 동의</legend>
        <label className="flex cursor-pointer items-center gap-3 font-display text-label-md">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={termsAccepted(value)}
            onChange={(e) => onChange({ service: e.target.checked, privacy: e.target.checked })}
          />
          필수 약관에 모두 동의합니다
        </label>
        <div className="h-px bg-surface-container-highest" />
        {ITEMS.map(([key, text]) => (
          <label key={key} className="flex cursor-pointer items-center gap-3 text-body-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            />
            <span>
              <span className="font-bold text-tertiary">[필수]</span> {text}
            </span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p id="terms-error" className="-mt-2 text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </>
  )
}
