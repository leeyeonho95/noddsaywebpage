import { request } from './webAuth'

// Backend stories S15P31A206-209 (sign-up) and S15P31A206-198 (password reset).
export type VerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'
export interface Verified { verificationToken: string }

export const CODE_TTL_MS = 5 * 60_000
export const RESEND_AFTER_MS = 60_000
export const VERIFICATION_TOKEN_TTL_MS = 5 * 60_000
const BASE = '/api/v1/web/auth'
const path = (purpose: VerificationPurpose) =>
  `${BASE}/${purpose === 'SIGNUP' ? 'email-verifications' : 'password-resets'}`

// A reset 202 means the address is an active e-mail account with a password; its mail goes out shortly after.
export async function sendCode(csrf: string, body: { email: string; purpose: VerificationPurpose }): Promise<void> {
  await request(path(body.purpose), csrf, { email: body.email })
}

export async function confirmCode(
  csrf: string,
  body: { email: string; purpose: VerificationPurpose; code: string },
): Promise<Verified> {
  const response = await request(`${path(body.purpose)}/verify`, csrf, { email: body.email, code: body.code })
  if (body.purpose === 'SIGNUP') {
    const proof = (await response.json()) as { signupToken: string; expiresAt: string }
    return { verificationToken: proof.signupToken }
  }
  return (await response.json()) as { verificationToken: string; expiresAt: string }
}

export async function resetPassword(csrf: string, body: { verificationToken: string; newPassword: string }): Promise<void> {
  await request(`${BASE}/password-resets/complete`, csrf, body)
}
