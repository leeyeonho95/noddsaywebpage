import { developerGet } from './developer'
import { request } from './webAuth'
import { parseCandidatePage, type CandidateStatus, type MotionCandidate } from './motionCandidateContract'
export type { CandidatePage, CandidateStatus, MotionCandidate, Rule } from './motionCandidateContract'

type Review = { action: 'approve' } | { action: 'reject'; reason: string }

const base = '/api/v1/web/developer/motion-improve/candidates'

export async function listMotionCandidates(signal: AbortSignal, page = 0, status?: CandidateStatus) {
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  const response = await developerGet(`${base}?${params}`, signal)
  return parseCandidatePage(await response.json())
}

export async function reviewMotionCandidate(csrf: string, candidate: Pick<MotionCandidate, 'id' | 'revision'>, review: Review) {
  await request(`${base}/${encodeURIComponent(candidate.id)}/decision`, csrf, {
    decision: review.action,
    expectedRevision: candidate.revision,
    ...(review.action === 'reject' ? { reason: review.reason } : {}),
  })
}
