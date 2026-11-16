import { ApiError, request } from './webAuth'

export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'mr_pending' | 'mr_created'
export interface MotionCandidate {
  id: string
  candidateKey: string
  revision: number
  kind: 'threshold' | 'rowingModel'
  target: string
  targetLabel: string
  changes: Record<string, number | string>
  current: Record<string, number | string>
  status: CandidateStatus
  reason: string
  run: string
  judgeVersion: string
  summary: Record<string, unknown>
  rules: { key: string; ok: boolean; text: string; value: string }[]
  table: [string, string, string, string][]
  failures: Record<string, unknown>[]
  proposedAt: string
  updatedAt: string
  decidedAt: string | null
  decidedByName: string | null
  mr: { url: string; iid: number; branch: string; createdAt: string } | null
}
export interface CandidatePage { items: MotionCandidate[]; total: number; page: number; limit: number }
const base = '/api/v1/web/developer/motion-improve/candidates'
export const listCandidates = (status: CandidateStatus | '', page: number) => {
  const query = new URLSearchParams({ page: String(page) })
  if (status) query.set('status', status)
  return request(`${base}?${query}`).then(r => r.json() as Promise<CandidatePage>)
}
export const decideCandidate = (csrf: string, candidate: MotionCandidate, decision: 'approve' | 'reject', reason: string) =>
  request(`${base}/${encodeURIComponent(candidate.id)}/decision`, csrf, { decision, reason, expectedRevision: candidate.revision })
    .then(r => r.json() as Promise<MotionCandidate>)
export function candidateError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료됐습니다. 다시 로그인해 주세요.'
    if (error.status === 403) return '개발자 권한 또는 로그인 상태를 확인해 주세요.'
    if (error.status === 409) return '검토 중 후보 내용이나 상태가 바뀌었습니다. 새로 조회한 내용을 확인한 뒤 다시 결정해 주세요.'
    if (error.code === 'REJECTION_REASON_REQUIRED') return '거절 사유를 1~2,000자로 입력해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '후보 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
