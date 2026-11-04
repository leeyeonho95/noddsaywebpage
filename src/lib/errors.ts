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
      // Google-only accounts have no password and only sign in with Google (team decision), so point there.
      return { field: 'email', message: "이미 가입된 이메일이에요. Google로 가입했다면 'Google로 계속하기'를 눌러 주세요." }
    case 'INVALID_CREDENTIALS':
      return { message: '이메일 또는 비밀번호가 올바르지 않아요.' }
    case 'GOOGLE_WEB_NOT_CONFIGURED':
      return { message: 'Google 로그인은 아직 준비 중이에요.' }
    case 'GOOGLE_LOGIN_CANCELLED':
      return { message: 'Google 로그인을 취소했어요.' }
    case 'GOOGLE_FLOW_EXPIRED':
      return { message: 'Google 인증 시간이 지났어요. 다시 시도해 주세요.' }
    case 'GOOGLE_ACCOUNT_LINK_REQUIRED':
      return { message: '같은 이메일로 가입된 계정이 있어요. 이메일과 비밀번호로 로그인해 주세요.' }
    case 'GOOGLE_IDENTITY_ALREADY_LINKED':
      return { message: '이미 가입된 Google 계정이에요. Google로 다시 로그인해 주세요.' }
    // E-mail verification codes are placeholders until the backend API exists (api/emailVerification.ts).
    case 'EMAIL_VERIFICATION_UNAVAILABLE':
      return { message: '이메일 인증은 아직 준비 중이에요.' }
    case 'EMAIL_CODE_MISMATCH':
      return { field: 'code', message: '인증번호가 맞지 않아요.' }
    case 'EMAIL_CODE_EXPIRED':
      return { field: 'code', message: '인증 시간이 지났어요. 인증번호를 다시 받아 주세요.' }
    case 'LAUNCH_CONFIRMATION_MISMATCH':
      return { message: '게임 실행 요청을 확인하지 못했어요. 다시 시작해 주세요.' }
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
