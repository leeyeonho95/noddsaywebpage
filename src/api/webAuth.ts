// Web session API (Backend docs/development/web-auth-guide.md). The site and the API share one origin,
// so requests carry the HttpOnly session cookie; the CSRF token is kept only in memory.

export type SessionStatus = 'ANONYMOUS' | 'AUTHENTICATED' | 'REGISTRATION_REQUIRED'

export interface WebUser {
  userId: string
  email: string
  createdAt: string
  displayName: string
}

export interface Snapshot {
  status: SessionStatus
  user: WebUser | null
  csrfToken: string
  expiresAt: string
  // The Google account's e-mail while status is REGISTRATION_REQUIRED.
  registrationEmail: string | null
}

export interface GoogleStart {
  authorizationUrl: string
  expiresAt: string
}

export interface FieldError {
  field: string
  reason: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly details: FieldError[]
  // Seconds from the Retry-After header (rate limits), when the server sent one.
  readonly retryAfter?: number

  constructor(status: number, code: string, message: string, requestId?: string, details: FieldError[] = [], retryAfter?: number) {
    super(message)
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
    this.retryAfter = retryAfter
  }
}

const BASE = '/api/v1/web/auth'

// Same-origin request with the session cookie: a POST carrying the CSRF token when one is given, otherwise a GET.
export async function request(url: string, csrf?: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {}
  if (csrf !== undefined) headers['X-CSRF-Token'] = csrf
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let response: Response
  try {
    response = await fetch(url, {
      method: csrf === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요.')
  }
  if (!response.ok) throw await toApiError(response)
  return response
}

async function toApiError(response: Response): Promise<ApiError> {
  const retry = Number(response.headers.get('Retry-After'))
  try {
    const body = (await response.json()) as Partial<{ code: string; message: string; requestId: string; details: FieldError[] }>
    if (typeof body.code === 'string') {
      return new ApiError(response.status, body.code, body.message ?? '', body.requestId, body.details ?? [], retry > 0 ? retry : undefined)
    }
  } catch {
    // Not an ApiError body (e.g. a proxy error page).
  }
  return new ApiError(response.status, 'HTTP_ERROR', '')
}

const send = (path: string, csrf?: string, body?: unknown) => request(BASE + path, csrf, body)

const snapshot = async (response: Response) => (await response.json()) as Snapshot

export const getSession = () => send('/session').then(snapshot)

// signupToken comes from verifying the e-mail (api/emailVerification.ts) and is used up by a successful sign-up.
export const register = (csrf: string, body: { email: string; password: string; displayName: string; signupToken: string }) =>
  send('/register', csrf, body).then(snapshot)

export const login = (csrf: string, body: { email: string; password: string }) =>
  send('/login', csrf, body).then(snapshot)

export const logout = (csrf: string) => send('/logout', csrf).then(() => undefined)

// Google returns to /api/v1/web/auth/google/callback, which redirects to /auth/google/complete on success.
export const startGoogle = (csrf: string) =>
  send('/google/start', csrf, { purpose: 'LOGIN' }).then(async (response) => (await response.json()) as GoogleStart)

export const googleRegister = (csrf: string, body: { displayName: string }) =>
  send('/google/register', csrf, body).then(snapshot)
