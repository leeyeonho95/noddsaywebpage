import { developerGet } from './developer'
import { request } from './webAuth'

export interface MotionCandidate {
  id: string
  title: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MR_CREATED'
  metrics: { label: string; before: number | null; after: number | null; unit?: string }[]
  rules: { label: string; passed: boolean }[]
  missedRequests: { id: string; description: string }[]
  rejectionReason?: string | null
  mrUrl?: string | null
}

type Review = { action: 'approve' } | { action: 'reject'; reason: string }

// The integration shape is provisional until the backend handoff is available.
const base = '/api/v1/web/developer/motion-improvement-candidates'

export async function listMotionCandidates(signal: AbortSignal): Promise<MotionCandidate[]> {
  const response = await developerGet(base, signal)
  const { items } = await response.json() as { items: MotionCandidate[] }
  if (!Array.isArray(items) || items.some(candidate =>
    !candidate || !Array.isArray(candidate.metrics) || !Array.isArray(candidate.rules) ||
    !Array.isArray(candidate.missedRequests),
  )) throw new Error('Invalid motion candidate list')
  return items
}

export async function reviewMotionCandidate(csrf: string, id: string, review: Review) {
  await request(`${base}/${encodeURIComponent(id)}/${review.action}`, csrf,
    review.action === 'reject' ? { reason: review.reason } : undefined)
}
