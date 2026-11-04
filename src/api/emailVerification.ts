import { ApiError, request } from './webAuth'

// E-mail verification for sign-up and password reset (Jira S15P31A206-198). The backend API does not exist yet:
// the paths, fields and error codes here are placeholders to agree on with the backend. Until API_READY is true,
// `npm run dev` answers with a mock so the screens can be tried, and a production build says it is not ready.
const API_READY = false

export type VerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'

export interface CodeSent {
  // How long the code works. Relative, so a wrong clock on the player's PC does not skew the timer.
  expiresInSeconds: number
}

export interface Verified {
  // Proof of the verified e-mail, sent with the sign-up or the new password.
  verificationToken: string
}

// The code the development mock accepts.
export const MOCK_CODE = '000000'
export const isMock = !API_READY && import.meta.env.DEV

const CODE_TTL_MS = 5 * 60_000
const BASE = '/api/v1/web/auth'

const unavailable = () => new ApiError(0, 'EMAIL_VERIFICATION_UNAVAILABLE', '')
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const json = async <T>(response: Response) => (await response.json()) as T

// Mock state: when the last code was sent in this tab.
let mockExpiresAt = 0

export async function sendCode(csrf: string, body: { email: string; purpose: VerificationPurpose }): Promise<CodeSent> {
  if (API_READY) return request(`${BASE}/email-verifications`, csrf, body).then(json<CodeSent>)
  if (!isMock) throw unavailable()
  await wait(500)
  mockExpiresAt = Date.now() + CODE_TTL_MS
  return { expiresInSeconds: CODE_TTL_MS / 1000 }
}

export async function confirmCode(
  csrf: string,
  body: { email: string; purpose: VerificationPurpose; code: string },
): Promise<Verified> {
  if (API_READY) return request(`${BASE}/email-verifications/confirm`, csrf, body).then(json<Verified>)
  if (!isMock) throw unavailable()
  await wait(400)
  if (Date.now() >= mockExpiresAt) throw new ApiError(400, 'EMAIL_CODE_EXPIRED', '')
  if (body.code !== MOCK_CODE) throw new ApiError(400, 'EMAIL_CODE_MISMATCH', '')
  return { verificationToken: 'dev-mock-token' }
}

export async function resetPassword(csrf: string, body: { verificationToken: string; newPassword: string }): Promise<void> {
  if (API_READY) return request(`${BASE}/password-reset`, csrf, body).then(() => undefined)
  if (!isMock) throw unavailable()
  await wait(500)
}
