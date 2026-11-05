import { ApiError, request } from './webAuth'

// E-mail verification. Sign-up uses the backend API (MR !91, Jira S15P31A206-209; Backend
// docs/development/signup-email-verification.md). Password reset (Jira S15P31A206-198) has no API yet: `npm run dev`
// answers with a mock so the screen can be tried, and a production build says it is not ready.

export type VerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'

export interface Verified {
  // Proof of the verified e-mail, sent with the sign-up (the backend's signupToken) or the new password.
  verificationToken: string
}

// Fixed by the backend: a code works for 5 minutes and can be sent again after 60 seconds, and the sign-up token
// from a verified code works for 5 minutes. Timers count from when the request was sent, on this PC's clock only, so
// they end a little before the server's and a wrong clock does not skew them; the server's errors cover the rest.
export const CODE_TTL_MS = 5 * 60_000
export const RESEND_AFTER_MS = 60_000
export const SIGNUP_TOKEN_TTL_MS = 5 * 60_000

// The code the password-reset mock accepts.
export const MOCK_CODE = '000000'
export const isMock = (purpose: VerificationPurpose) => purpose === 'PASSWORD_RESET' && import.meta.env.DEV

const BASE = '/api/v1/web/auth'

const unavailable = () => new ApiError(0, 'EMAIL_VERIFICATION_UNAVAILABLE', '')
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock state: when the last password-reset code was sent in this tab.
let mockExpiresAt = 0

// The backend answers 204 with no body; sending again replaces the previous code.
export async function sendCode(csrf: string, body: { email: string; purpose: VerificationPurpose }): Promise<void> {
  if (body.purpose === 'SIGNUP') {
    await request(`${BASE}/email-verifications`, csrf, { email: body.email })
    return
  }
  if (!isMock(body.purpose)) throw unavailable()
  await wait(500)
  mockExpiresAt = Date.now() + CODE_TTL_MS
}

export async function confirmCode(
  csrf: string,
  body: { email: string; purpose: VerificationPurpose; code: string },
): Promise<Verified> {
  if (body.purpose === 'SIGNUP') {
    const response = await request(`${BASE}/email-verifications/verify`, csrf, { email: body.email, code: body.code })
    const proof = (await response.json()) as { signupToken: string; expiresAt: string }
    return { verificationToken: proof.signupToken }
  }
  if (!isMock(body.purpose)) throw unavailable()
  await wait(400)
  if (Date.now() >= mockExpiresAt || body.code !== MOCK_CODE) throw new ApiError(422, 'EMAIL_VERIFICATION_INVALID', '')
  return { verificationToken: 'dev-mock-token' }
}

// Mock only until the password-reset API exists.
export async function resetPassword(_csrf: string, _body: { verificationToken: string; newPassword: string }): Promise<void> {
  if (!isMock('PASSWORD_RESET')) throw unavailable()
  await wait(500)
}
