import { ApiError } from '../api/webAuth'
import { SESSION_STALE } from '../auth/context'

// The backend's legacy register field maps to the nickname input.
const FIELD_ALIASES: Record<string, string> = { teamName: 'displayName' }
// Plain wording where the backend's reason is technical.
const FIELD_MESSAGES: Record<string, string> = {
  password: '비밀번호는 12~128자여야 해요.',
  displayName: '닉네임은 쓸 수 없는 문자 없이 2~40자로 입력해 주세요.',
}

// Turns an API failure into a message, attached to a form field when the backend names one.
export function toFormError(error: unknown): { field?: string; message: string } {
  if (!(error instanceof ApiError)) return { message: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' }
  switch (error.code) {
    case 'VALIDATION_FAILED': {
      const detail = error.details[0]
      if (detail) {
        const field = FIELD_ALIASES[detail.field] ?? detail.field
        return { field, message: FIELD_MESSAGES[field] ?? detail.reason }
      }
      return { message: error.message }
    }
    case 'EMAIL_ALREADY_EXISTS':
      return { field: 'email', message: '이미 가입된 이메일이에요.' }
    case 'INVALID_CREDENTIALS':
      return { message: '이메일 또는 비밀번호가 올바르지 않아요.' }
    case 'RATE_LIMITED':
      return { message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }
    case 'NETWORK_ERROR':
    // A non-API error body means a proxy or gateway answered instead of the backend.
    case 'HTTP_ERROR':
      return { message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }
    case SESSION_STALE:
      return { message: error.message }
    default: {
      const message = error.message || '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
      return { message: error.requestId ? `${message} (요청 번호 ${error.requestId})` : message }
    }
  }
}
