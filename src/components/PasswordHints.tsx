import { codePoints, PASSWORD_MIN } from '../lib/validation'

// Length bar under a new password, shared by sign-up and password reset.
export function PasswordLengthHint({ password }: { password: string }) {
  const length = codePoints(password)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-all ${length >= PASSWORD_MIN ? 'bg-secondary' : 'bg-primary-container'}`}
          style={{ width: `${(Math.min(length, PASSWORD_MIN) / PASSWORD_MIN) * 100}%` }}
        />
      </div>
      <span className="min-w-14 text-right font-display text-label-sm">
        {length >= PASSWORD_MIN ? '사용 가능' : `${length}/${PASSWORD_MIN}자`}
      </span>
    </div>
  )
}

// Live 일치/불일치 under the confirmation input. Pages leave it out until something is typed.
export function MatchHint({ same }: { same: boolean }) {
  return <span className={`font-display text-label-sm ${same ? 'text-secondary' : 'text-error'}`}>{same ? '일치' : '불일치'}</span>
}
