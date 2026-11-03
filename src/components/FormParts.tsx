import type { ReactNode } from 'react'

export function FormAlert({ message }: { message?: string }) {
  return (
    <div aria-live="polite">
      {message && (
        <p className="rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">{message}</p>
      )}
    </div>
  )
}

interface SubmitButtonProps {
  icon: string
  pending: boolean
  // True while the session is still loading.
  disabled: boolean
  children: ReactNode
}

export function SubmitButton({ icon, pending, disabled, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3.5 font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_#d97706] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-2xl">
        {icon}
      </span>
      {pending ? '잠시만 기다려 주세요…' : children}
    </button>
  )
}
