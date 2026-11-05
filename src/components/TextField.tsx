import { useState, type InputHTMLAttributes, type ReactNode } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string
  label: string
  labelAside?: ReactNode
  icon?: string
  hint?: ReactNode
  error?: string
  // A button beside the input, e.g. 인증번호 받기.
  action?: ReactNode
}

export function TextField({ id, label, labelAside, icon, hint, error, action, type = 'text', ...input }: TextFieldProps) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  const field = (
    <div className={`relative ${action ? 'min-w-0 flex-1' : ''}`}>
      {icon && (
        <span
          aria-hidden="true"
          className="material-symbols-outlined pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-outline"
        >
          {icon}
        </span>
      )}
      <input
        id={id}
        type={password && visible ? 'text' : type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-lg bg-surface-container-low py-3 text-on-surface outline-none transition placeholder:text-outline read-only:text-on-surface-variant focus:bg-surface-container-lowest focus:shadow-md focus:ring-2 focus:ring-secondary/40 ${icon ? 'pl-12' : 'pl-4'} ${password ? 'pr-12' : 'pr-4'} ${error ? 'ring-2 ring-error/60' : ''}`}
        {...input}
      />
      {password && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="material-symbols-outlined absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-xl text-outline hover:text-on-surface"
        >
          {visible ? 'visibility_off' : 'visibility'}
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center justify-between font-display text-label-md text-on-surface">
        <span>{label}</span>
        {labelAside}
      </label>
      {action ? (
        <div className="text-field-action flex gap-2">
          {field}
          {action}
        </div>
      ) : (
        field
      )}
      {hint && (
        <div id={`${id}-hint`} className="text-xs text-on-surface-variant">
          {hint}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
