import { request } from './webAuth'

// Web → Unity launch handoff (Backend docs/development/web-unity-handoff.md). The site creates the request, opens
// launchUri and approves it once the app has bound; the app binds and exchanges with its own PKCE proof.
// The site approves without asking the user to compare codes (team decision 2026-11-04), which the backend guide
// advises against; see the README.

export type LaunchState = 'AWAITING_APP' | 'AWAITING_APPROVAL' | 'APPROVED' | 'CONSUMED' | 'EXPIRED'

export interface LaunchCreated {
  launchId: string
  // noddsay://launch?requestId=…, registered by the Windows installer.
  launchUri: string
  expiresAt: string
}

export interface LaunchStatus {
  launchId: string
  status: LaunchState
  // Set once the app has bound to the request (AWAITING_APPROVAL and later).
  confirmationCode: string | null
  expiresAt: string
}

const BASE = '/api/v1/web/game-launches'
const path = (id: string, action = '') => `${BASE}/${encodeURIComponent(id)}${action}`

export const createLaunch = (csrf: string) => request(BASE, csrf).then(async (r) => (await r.json()) as LaunchCreated)

export const getLaunch = (id: string) => request(path(id)).then(async (r) => (await r.json()) as LaunchStatus)

export const approveLaunch = (csrf: string, id: string, confirmationCode: string) =>
  request(path(id, '/approve'), csrf, { confirmationCode }).then(async (r) => (await r.json()) as LaunchStatus)

export const cancelLaunch = (csrf: string, id: string) => request(path(id, '/cancel'), csrf).then(() => undefined)
