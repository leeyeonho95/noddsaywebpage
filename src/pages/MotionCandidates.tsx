import { useEffect, useState, type FormEvent } from 'react'
import { listMotionCandidates, reviewMotionCandidate, type MotionCandidate, type CandidatePage, type CandidateStatus, type Rule } from '../api/motionCandidates'
import { ApiError } from '../api/webAuth'
import { useAuth } from '../auth/context'
import './motion-candidates.css'

const statusLabels = {
  pending: '검토 대기',
  approved: '승인',
  rejected: '거절',
  mr_pending: 'MR 생성 중',
  mr_created: 'MR 생성',
}

function message(error: unknown, reviewing: boolean) {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
    if (error.status === 403) return '개발자 권한을 확인해 주세요.'
    if (error.status === 409) return '다른 검토자 또는 PC가 후보를 변경했습니다. 최신 내용을 확인한 뒤 다시 결정해 주세요.'
    if (error.code === 'REJECTION_REASON_REQUIRED') return '거절 사유를 1~2,000자로 입력해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  return reviewing ? '검토 결과를 저장하지 못했습니다. 다시 시도해 주세요.' : '후보 목록을 불러오지 못했습니다.'
}

function RuleList({ rules }: { rules: Rule[] }) {
  return <ul>{rules.map((rule, index) => <li key={`${rule.key}:${index}`}>
    <span aria-label={rule.passed === null ? '미수집' : rule.passed ? '통과' : '실패'}>{rule.passed === null ? '—' : rule.passed ? '✅' : '❌'}</span> {rule.label}
    <small className="motion-rule-value">{rule.value}</small>
  </li>)}</ul>
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
  onReviewed: (notice?: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const link = mrLink(candidate.mrUrl)
  const canReview = ['pending', 'approved'].includes(candidate.status) && !candidate.mrUrl && !locked
  const canApprove = candidate.status === 'pending'
  const disabled = busy || saving || !csrf

  async function review(action: 'approve' | 'reject', event?: FormEvent) {
    event?.preventDefault()
    const trimmed = reason.trim()
    if (!csrf || !canReview || disabled || (action === 'approve' && !canApprove) || (action === 'reject' && (!trimmed || trimmed.length > 2000))) return
    setSaving(true)
    setError('')
    try {
      await reviewMotionCandidate(csrf, candidate, action === 'approve' ? { action } : { action, reason: trimmed })
      setLocked(true)
      setRejecting(false)
      onReviewed(action === 'approve' ? '후보를 승인했습니다. 다음 PC 작업에서 MR을 생성할 수 있습니다.' : '거절 사유와 검토 결과를 저장했습니다.')
    } catch (error) {
      const detail = message(error, true)
      if (error instanceof ApiError && [401, 403, 409].includes(error.status)) {
        setLocked(true)
        setRejecting(false)
        onReviewed(detail)
      } else setError(detail)
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
        <p className="dev-muted">실행 {candidate.run} · 판정기 {candidate.judgeVersion}</p>
        <div>
          <h3>전후 수치</h3>
          {candidate.metrics.length ? (
            <div className="dev-scroll">
              <table aria-label="인식 개선 전후 수치">
                <thead><tr><th scope="col">지표 / 단위</th><th scope="col">개선 전</th><th scope="col">개선 후</th><th scope="col">차이</th></tr></thead>
                <tbody>{candidate.metrics.map((metric, index) => (
                  <tr key={`${metric.label}:${index}`}><th scope="row">{metric.label}{metric.unit && <small>{metric.unit}</small>}</th><td>{metric.beforeText || '—'}</td><td>{metric.afterText || '—'}</td><td>{metric.differenceText || '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="dev-muted">수치 기록이 없습니다.</p>}
        </div>
        <div>
          <h3>채택 규칙 5개</h3>
          <RuleList rules={candidate.rules} />
          {candidate.rules.some(rule => rule.passed === null) && <p className="dev-muted">일부 규칙 결과가 없거나 중복되어 있습니다. 미수집은 통과를 뜻하지 않습니다.</p>}
          {candidate.additionalRules.length > 0 && <details><summary>추가·이전 형식 규칙</summary><RuleList rules={candidate.additionalRules} /></details>}
        </div>
        <div>
          <h3>놓친 요청 ({candidate.missedRequests.length}건)</h3>
          {candidate.missedRequests.length ? <ul>{candidate.missedRequests.map(request => (
            <li key={request.id}>{request.description}</li>
          ))}</ul> : <p className="dev-muted">놓친 요청이 없습니다.</p>}
        </div>
        {candidate.rejectionReason && <p>거절 사유 · {candidate.rejectionReason}</p>}
        {candidate.decidedAt && <p className="dev-muted">검토자 {candidate.decidedByName ?? '탈퇴한 계정'} · {new Date(candidate.decidedAt).toLocaleString('ko-KR')}</p>}
        {candidate.status === 'approved' && <p className="dev-muted">MR 생성 예약 전까지 승인을 취소하고 거절할 수 있습니다.</p>}
        {candidate.status === 'mr_pending' && <p className="dev-muted">PC가 MR 생성을 예약했습니다. 링크가 기록되면 여기 표시됩니다.</p>}
        {link && <a className="motion-candidate-link" href={link} target="_blank" rel="noreferrer">MR 열기 ↗</a>}
        {canReview && (rejecting ? (
          <form className="motion-candidate-form" onSubmit={event => void review('reject', event)}>
            <label>거절 사유 (필수)<textarea required maxLength={2000} autoFocus value={reason} onChange={event => setReason(event.target.value)} disabled={saving} rows={3} /></label>
            <div className="dev-action-row">
              <button className="dev-button primary" disabled={disabled || !reason.trim()}>{saving ? '저장 중…' : '거절 확정'}</button>
              <button className="dev-button" type="button" disabled={saving} onClick={() => setRejecting(false)}>취소</button>
            </div>
          </form>
        ) : (
          <div className="dev-action-row">
            {canApprove && <button type="button" className="dev-button primary" disabled={disabled} onClick={() => void review('approve')}>{saving ? '저장 중…' : '승인'}</button>}
            <button type="button" className="dev-button" disabled={disabled} onClick={() => setRejecting(true)}>{canApprove ? '거절' : '승인 취소·거절'}</button>
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
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<CandidateStatus | ''>('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<{ revision: number; status: string; data: CandidatePage; error?: string }>()
  const loading = result?.revision !== revision || result?.data.page !== page || result?.status !== status
  const refresh = (detail = '') => { setNotice(detail); setRevision(value => value + 1) }

  useEffect(() => {
    const controller = new AbortController()
    void listMotionCandidates(controller.signal, page, status || undefined).then(data => {
      if (!controller.signal.aborted) {
        if (page > 0 && data.items.length === 0) { setPage(Math.max(0, Math.ceil(data.total / data.limit) - 1)); return }
        setResult({ revision, status, data })
      }
    }, error => {
      if (!controller.signal.aborted) setResult({ revision, status, data: { items: [], total: 0, page, limit: 20 }, error: message(error, false) })
    })
    return () => controller.abort()
  }, [revision, page, status])

  return (
    <section aria-labelledby="motion-candidates-title">
      <div className="dev-title motion-candidates-title">
        <h1 id="motion-candidates-title">인식 개선 후보</h1>
        <button type="button" className="dev-button" onClick={() => refresh()} disabled={loading}>새로고침</button>
      </div>
      <p className="dev-muted motion-candidate-intro">게임 요청 성공률을 비교한 후보입니다. 영상 정답 대비 정확도와는 다릅니다. 승인하면 PC 작업이 MR을 만들며 자동 배포되지는 않습니다.</p>
      <label className="motion-status-filter">상태 <select aria-label="후보 상태" value={status} onChange={event => { setStatus(event.target.value as CandidateStatus | ''); setPage(0); setNotice('') }}>
        <option value="">전체</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {notice && <p role="status" className="dev-alert">{notice}</p>}
      {loading && <p className="dev-empty" role="status">후보를 불러오는 중입니다…</p>}
      {!loading && result.error && <p className="dev-alert" role="alert">{result.error}</p>}
      {!loading && !result.error && !result.data.items.length && <p className="dev-empty">조건에 맞는 인식 개선 후보가 없습니다.</p>}
      {result?.data.items.map(candidate => <CandidateCard key={`${candidate.id}:${candidate.revision}`} candidate={candidate} busy={loading} csrf={snapshot?.csrfToken} onReviewed={refresh} />)}
      {result && !result.error && <div className="dev-pages">
        <button type="button" className="dev-button" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>이전</button>
        <span>{page + 1} / {Math.max(1, Math.ceil(result.data.total / result.data.limit))} · {result.data.total}개</span>
        <button type="button" className="dev-button" disabled={loading || (page + 1) * result.data.limit >= result.data.total} onClick={() => setPage(p => p + 1)}>다음</button>
      </div>}
    </section>
  )
}
