import { useEffect, useState, type FormEvent } from 'react'
import { listMotionCandidates, reviewMotionCandidate, type MotionCandidate } from '../api/motionCandidates'
import { ApiError } from '../api/webAuth'
import { useAuth } from '../auth/context'
import './motion-candidates.css'

const statusLabels = {
  PENDING: '검토 대기',
  APPROVED: '승인',
  REJECTED: '거절',
  MR_CREATED: 'MR 생성',
}

function message(error: unknown, reviewing: boolean) {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
    if (error.status === 403) return '개발자 권한을 확인해 주세요.'
    if (error.status === 409) return '후보 상태가 바뀌었습니다. 목록을 새로고침해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  return reviewing ? '검토 결과를 저장하지 못했습니다. 다시 시도해 주세요.' : '후보 목록을 불러오지 못했습니다.'
}

function number(value: number | null, unit = '') {
  return value === null ? '—' : `${value.toLocaleString('ko-KR')}${unit}`
}

function mrLink(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function CandidateCard({ candidate, busy, csrf, onReviewed }: {
  candidate: MotionCandidate
  busy: boolean
  csrf?: string
  onReviewed: () => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const link = mrLink(candidate.mrUrl)
  const canReview = candidate.status === 'PENDING' && !candidate.mrUrl && !locked
  const disabled = busy || saving || !csrf

  async function review(action: 'approve' | 'reject', event?: FormEvent) {
    event?.preventDefault()
    const trimmed = reason.trim()
    if (!csrf || !canReview || disabled || (action === 'reject' && !trimmed)) return
    setSaving(true)
    setError('')
    try {
      await reviewMotionCandidate(csrf, candidate.id, action === 'approve' ? { action } : { action, reason: trimmed })
      setLocked(true)
      setRejecting(false)
      onReviewed()
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 409].includes(error.status)) onReviewed()
      setError(message(error, true))
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="dev-panel motion-candidate">
      <div className="dev-panel-heading">
        <h2>{candidate.title}</h2>
        <span className="dev-badge">{candidate.mrUrl ? 'MR 생성' : statusLabels[candidate.status]}</span>
      </div>
      <div className="motion-candidate-body">
        <div>
          <h3>전후 수치</h3>
          {candidate.metrics.length ? (
            <div className="dev-scroll">
              <table aria-label="인식 개선 전후 수치">
                <thead><tr><th scope="col">지표</th><th scope="col">개선 전</th><th scope="col">개선 후</th></tr></thead>
                <tbody>{candidate.metrics.map(metric => (
                  <tr key={metric.label}><th scope="row">{metric.label}</th><td>{number(metric.before, metric.unit)}</td><td>{number(metric.after, metric.unit)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="dev-muted">수치 기록이 없습니다.</p>}
        </div>
        <div>
          <h3>채택 규칙</h3>
          <ul>{candidate.rules.map(rule => (
            <li key={rule.label}><span aria-label={rule.passed ? '통과' : '실패'}>{rule.passed ? '✅' : '❌'}</span> {rule.label}</li>
          ))}</ul>
        </div>
        <div>
          <h3>놓친 요청 ({candidate.missedRequests.length}건)</h3>
          {candidate.missedRequests.length ? <ul>{candidate.missedRequests.map(request => (
            <li key={request.id}>{request.description}</li>
          ))}</ul> : <p className="dev-muted">놓친 요청이 없습니다.</p>}
        </div>
        {candidate.rejectionReason && <p>거절 사유 · {candidate.rejectionReason}</p>}
        {link && <a className="motion-candidate-link" href={link} target="_blank" rel="noreferrer">MR 열기 ↗</a>}
        {canReview && (rejecting ? (
          <form className="motion-candidate-form" onSubmit={event => void review('reject', event)}>
            <label>거절 사유 (필수)<textarea required autoFocus value={reason} onChange={event => setReason(event.target.value)} disabled={saving} rows={3} /></label>
            <div className="dev-action-row">
              <button className="dev-button primary" disabled={disabled || !reason.trim()}>{saving ? '저장 중…' : '거절 확정'}</button>
              <button className="dev-button" type="button" disabled={saving} onClick={() => setRejecting(false)}>취소</button>
            </div>
          </form>
        ) : (
          <div className="dev-action-row">
            <button type="button" className="dev-button primary" disabled={disabled} onClick={() => void review('approve')}>{saving ? '저장 중…' : '승인'}</button>
            <button type="button" className="dev-button" disabled={disabled} onClick={() => setRejecting(true)}>거절</button>
          </div>
        ))}
        {error && <p className="dev-alert" role="alert">{error}</p>}
      </div>
    </article>
  )
}

export function MotionCandidates() {
  const { snapshot } = useAuth()
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ revision: number; items: MotionCandidate[]; error?: string }>()
  const loading = result?.revision !== revision
  const refresh = () => setRevision(value => value + 1)

  useEffect(() => {
    const controller = new AbortController()
    void listMotionCandidates(controller.signal).then(items => {
      if (!controller.signal.aborted) setResult({ revision, items })
    }, error => {
      if (!controller.signal.aborted) setResult({ revision, items: [], error: message(error, false) })
    })
    return () => controller.abort()
  }, [revision])

  return (
    <section aria-labelledby="motion-candidates-title">
      <div className="dev-title motion-candidates-title">
        <h1 id="motion-candidates-title">인식 개선 후보</h1>
        <button type="button" className="dev-button" onClick={refresh} disabled={loading}>새로고침</button>
      </div>
      {loading && <p className="dev-empty" role="status">후보를 불러오는 중입니다…</p>}
      {!loading && result.error && <p className="dev-alert" role="alert">{result.error}</p>}
      {!loading && !result.error && !result.items.length && <p className="dev-empty">등록된 인식 개선 후보가 없습니다.</p>}
      {result?.items.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} busy={loading} csrf={snapshot?.csrfToken} onReviewed={refresh} />)}
    </section>
  )
}
