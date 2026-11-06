import { ApiError } from '../api/webAuth'
import { SESSION_STALE } from '../auth/context'

// The backend's legacy register field maps to the nickname input.
const FIELD_ALIASES: Record<string, string> = { teamName: 'displayName' }
// Plain wording where the backend's reason is technical.
const FIELD_MESSAGES: Record<string, string> = {
  password: '비밀번호는 12~128자여야 해요.',
  displayName: '닉네임은 쓸 수 없는 문자 없이 2~40자로 입력해 주세요.',
}
// The verification token (sign-up or password reset) ran out 5 minutes after verifying or was refused, so the e-mail
// has to be verified again.
export const VERIFICATION_EXPIRED = '이메일 인증 시간이 지났어요. 다시 인증해 주세요.'

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
      return { field: 'email', message: "이미 가입된 이메일이에요. 로그인해 주세요. Google로 가입했다면 'Google로 계속하기'를 눌러 주세요." }
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
    // E-mail verification (api/emailVerification.ts).
    // Password reset for an address with no account, or for a Google-only account (Jira S15P31A206-198 follow-up).
    case 'PASSWORD_RESET_ACCOUNT_NOT_FOUND':
      return { field: 'email', message: '가입되지 않은 이메일이에요. 회원가입을 먼저 해 주세요.' }
    case 'PASSWORD_RESET_GOOGLE_ONLY':
      return { field: 'email', message: "Google로 가입한 계정이라 비밀번호가 없어요. 로그인 화면에서 'Google로 계속하기'를 눌러 주세요." }
    // A disabled account keeps its e-mail, so it must not be sent to sign-up (sign-up would say it already exists).
    case 'ACCOUNT_DISABLED':
      return { message: '사용할 수 없는 계정이에요.' }
    case 'EMAIL_VERIFICATION_INVALID':
      // Wrong, expired or used code, or 5 wrong tries; the server does not say which.
      return { field: 'code', message: '인증번호가 맞지 않거나 만료됐어요. 다시 확인하거나 새 인증번호를 받아 주세요.' }
    case 'EMAIL_RESEND_LIMITED': {
      // The button shows the exact wait (Retry-After) to sighted users; the hourly limit can mean most of an hour.
      const minutes = Math.ceil((error.retryAfter ?? 0) / 60)
      const when = minutes > 1 ? `약 ${minutes}분 뒤에` : '잠시 후'
      return { field: 'email', message: `인증번호를 여러 번 요청했어요. ${when} 다시 받아 주세요.` }
    }
    case 'EMAIL_DAILY_LIMIT_REACHED':
      // The whole service's daily mail budget (S15P31A206-213); it resets at midnight, Korean time.
      return { field: 'email', message: '오늘 보낼 수 있는 인증 메일을 모두 보냈어요. 내일 다시 시도해 주세요.' }
    case 'EMAIL_DELIVERY_UNAVAILABLE':
      return { field: 'email', message: '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' }
    case 'SIGNUP_VERIFICATION_REQUIRED':
    case 'PASSWORD_RESET_VERIFICATION_REQUIRED':
      return { field: 'email', message: VERIFICATION_EXPIRED }
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
