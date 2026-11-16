export const candidateStatuses = ['pending', 'approved', 'rejected', 'mr_pending', 'mr_created'] as const
export type CandidateStatus = typeof candidateStatuses[number]
export type Metric = { label: string; before: number | null; after: number | null; unit: string | null; beforeText: string; afterText: string; differenceText: string }
export type Rule = { key: string; label: string; passed: boolean | null; value: string }
export type MissedRequest = { id: string; description: string; details: Record<string, unknown> }
export interface MotionCandidate {
  id: string
  candidateKey: string
  revision: number
  title: string
  status: CandidateStatus
  metrics: Metric[]
  rules: Rule[]
  additionalRules: Rule[]
  missedRequests: MissedRequest[]
  rejectionReason: string
  mrUrl: string | null
  run: string
  judgeVersion: string
  decidedByName: string | null
  decidedAt: string | null
}
export type CandidatePage = { items: MotionCandidate[]; total: number; page: number; limit: number }

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string'
const nullableText = (v: unknown) => v === null || text(v)
const nullableNumber = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const metric = (v: unknown): v is Metric => object(v) && ['label', 'beforeText', 'afterText', 'differenceText'].every(k => text(v[k])) && nullableNumber(v.before) && nullableNumber(v.after) && nullableText(v.unit)
const rule = (v: unknown): v is Rule => object(v) && ['key', 'label', 'value'].every(k => text(v[k])) && (v.passed === null || typeof v.passed === 'boolean')
const missed = (v: unknown): v is MissedRequest => object(v) && text(v.id) && text(v.description) && object(v.details)

export function parseCandidatePage(value: unknown): CandidatePage {
  if (!object(value) || !Array.isArray(value.items) || !count(value.total) || !count(value.page) || !count(value.limit) || value.limit < 1) throw new Error('Invalid motion candidate page')
  const items = value.items.map(raw => {
    if (!object(raw) || !text(raw.id) || !text(raw.candidateKey) || !count(raw.revision) || raw.revision < 1 ||
        !candidateStatuses.includes(raw.status as CandidateStatus) || !text(raw.reason) || !text(raw.run) || !text(raw.judgeVersion) ||
        !nullableText(raw.decidedByName) || !nullableText(raw.decidedAt) || !(raw.mr === null || (object(raw.mr) && text(raw.mr.url)))) throw new Error('Invalid motion candidate')
    const review = raw.review
    if (!object(review) || !text(review.title) || !Array.isArray(review.metrics) || !review.metrics.every(metric) ||
        !Array.isArray(review.rules) || review.rules.length !== 5 || !review.rules.every(rule) ||
        !Array.isArray(review.additionalRules) || !review.additionalRules.every(rule) ||
        !Array.isArray(review.missedRequests) || !review.missedRequests.every(missed)) throw new Error('Motion candidate review contract is unavailable')
    return {
      id: raw.id, candidateKey: raw.candidateKey, revision: raw.revision, status: raw.status as CandidateStatus,
      title: review.title, metrics: review.metrics, rules: review.rules, additionalRules: review.additionalRules,
      missedRequests: review.missedRequests, rejectionReason: raw.reason, mrUrl: raw.mr === null ? null : raw.mr.url as string,
      run: raw.run, judgeVersion: raw.judgeVersion, decidedByName: raw.decidedByName as string | null, decidedAt: raw.decidedAt as string | null,
    }
  })
  return { items, total: value.total, page: value.page, limit: value.limit }
}
