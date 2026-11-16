import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { useDeveloperAccess } from '../auth/developerContext'
import { DeveloperNavigation } from '../components/DeveloperNavigation'
import { ApiError } from '../api/webAuth'
import { candidateError, decideCandidate, listCandidates, type CandidatePage, type CandidateStatus, type MotionCandidate } from '../api/motionImprove'
import './developer-dashboard.css'
import './motion-improve.css'

const labels: Record<CandidateStatus, string> = { pending: '검토 대기', approved: '승인됨', rejected: '거절됨', mr_pending: 'MR 생성 중', mr_created: 'MR 생성됨' }
const time = (value: string) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
const text = (value: unknown): string => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)
function dates(summary: Record<string, unknown>, name: string) {
  const value = summary[name]
  if (value && typeof value === 'object' && 'dates' in value && Array.isArray(value.dates)) return value.dates.map(text).join(', ')
  return '제공되지 않음'
}
function CandidateEvidence({ candidate: c }: { candidate: MotionCandidate }) {
  return <>
    <div className="motion-changes">{Object.entries(c.changes).map(([key, value]) => <p key={key}><b>{key}</b><span>{text(c.current[key] ?? (c.kind === 'rowingModel' ? c.current.rowingModelSha : null))}</span><span aria-label="변경 후">→</span><strong>{text(value)}</strong></p>)}</div>
    <div className="dev-scroll" tabIndex={0} aria-label="전후 수치 비교"><table><thead><tr><th>비교 항목</th><th>현재</th><th>후보</th><th>차이</th></tr></thead><tbody>{c.table.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>
    {!c.table.length && <p className="dev-muted">제공된 비교표가 없습니다.</p>}
    <ul className="motion-rules" aria-label="채택 규칙">{c.rules.map((rule, i) => <li key={`${rule.key}-${i}`} className={rule.ok ? 'passed' : 'failed'}><span>{rule.ok ? '✓ 통과' : '✕ 미달'}</span><div><b>{rule.text}</b><p>{rule.value}</p></div></li>)}</ul>
    <dl className="motion-meta"><div><dt>탐색 날짜</dt><dd>{dates(c.summary, 'search')}</dd></div><div><dt>검증 날짜</dt><dd>{dates(c.summary, 'holdout')}</dd></div><div><dt>판정기 버전</dt><dd>{c.judgeVersion}</dd></div><div><dt>실행</dt><dd>{c.run}</dd></div></dl>
    <details className="motion-failures"><summary>놓친 요청 {c.failures.length}개</summary>{c.failures.length ? <div className="dev-scroll" tabIndex={0}><table><thead><tr>{['경기', '날짜', '요청', '자리', '조건', '값', '기준'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{c.failures.map((failure, i) => <tr key={i}>{['game', 'date', 'request', 'slot', 'cond', 'value', 'threshold'].map(key => <td key={key}>{text(failure[key])}</td>)}</tr>)}</tbody></table></div> : <p className="dev-muted">제공된 실패 사례가 없습니다.</p>}</details>
  </>
}
export function MotionImprovePage() {
  const { snapshot, signedIn, logout } = useAuth()
  const { refresh: refreshAccess } = useDeveloperAccess()
  const [status, setStatus] = useState<CandidateStatus | ''>('pending')
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [listing, setListing] = useState<CandidatePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState<{ candidate: MotionCandidate; decision: 'approve' | 'reject' } | null>(null)
  const [reason, setReason] = useState('')
  const submitting = useRef(false)
  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    listCandidates(status, page).then(result => { if (active) setListing(result) }).catch((e: unknown) => {
      if (!active) return
      setListing(null); setError(candidateError(e))
      if (e instanceof ApiError && [401, 403].includes(e.status)) refreshAccess()
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, page, reload, refreshAccess])
  function review(candidate: MotionCandidate, decision: 'approve' | 'reject') { setConfirmation({ candidate, decision }); setReason(''); setError(''); setNotice('') }
  async function apply() {
    if (!confirmation || submitting.current || (confirmation.decision === 'reject' && !reason.trim())) return
    submitting.current = true; setPending(true); setError(''); setNotice('')
    try {
      const c = await signedIn(csrf => decideCandidate(csrf, confirmation.candidate, confirmation.decision, reason.trim()))
      setNotice(`${c.targetLabel} 후보를 ${c.status === 'approved' ? '승인' : '거절'}했습니다.`)
    } catch (e) {
      setError(candidateError(e))
      if (e instanceof ApiError && [401, 403].includes(e.status)) refreshAccess()
    } finally { setConfirmation(null); setReload(n => n + 1); submitting.current = false; setPending(false) }
  }
  return <div className="dev-dashboard"><header className="dev-top"><Link to="/">NODDSAY <span>개발자 센터</span></Link><span>{snapshot?.user?.displayName} <button onClick={() => void logout().catch(e => setError(candidateError(e)))}>로그아웃</button></span></header>
    <div className="dev-content motion-content"><DeveloperNavigation /><div className="dev-title"><div><p className="dev-eyebrow">MOTION REVIEW</p><h1>인식 개선 후보를 검토하세요.</h1><p>운영 경기 관절 로그를 현재 기준과 후보 기준으로 다시 채점한 결과입니다.</p></div></div>
      <p className="motion-explainer">성공률은 게임 요청 성공률이며 영상 정답 대비 정확도와는 다릅니다. 승인하면 PC의 다음 작업이 MR을 생성합니다. 배포는 별도 검토 후 진행됩니다.</p>
      <div className="dev-panel motion-toolbar"><label>후보 상태<select aria-label="후보 상태" value={status} disabled={pending} onChange={e => { setStatus(e.target.value as CandidateStatus | ''); setPage(0); setConfirmation(null); setError('') }}><option value="">전체</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><span className="dev-muted">{listing ? `${listing.total}개 후보` : ''}</span><button className="dev-button" disabled={pending || loading} onClick={() => { setConfirmation(null); setError(''); setReload(n => n + 1) }}>새로고침</button></div>
      {error && <p className="dev-alert" role="alert">{error}</p>}{notice && <p className="dev-success" role="status">{notice}</p>}
      {loading ? <p className="dev-empty" role="status">후보를 불러오는 중…</p> : listing && <>
        {!listing.items.length && <div className="dev-panel dev-empty">{status === 'pending' ? '검토를 기다리는 후보가 없습니다.' : '이 상태의 후보가 없습니다.'}</div>}
        {listing.items.map(c => <article className="dev-panel motion-card" key={c.id}><div className="dev-panel-heading"><div><p className="dev-eyebrow">{c.kind === 'rowingModel' ? '노 젓기 모델' : '동작 기준값'}</p><h2>{c.targetLabel}</h2><p className="dev-muted">제안 {time(c.proposedAt)} · 한국시간</p></div><span className={`dev-badge motion-${c.status}`}>{labels[c.status]}</span></div><div className="motion-card-body"><CandidateEvidence candidate={c} />
          {c.decidedAt && <p className="motion-decision">{c.decidedByName ?? '삭제된 계정'} · {time(c.decidedAt)}에 결정</p>}
          {c.reason && <p className="motion-reason"><b>거절 사유</b> {c.reason}</p>}
          {c.status === 'mr_pending' && <p className="dev-muted">PC가 MR을 준비 중입니다. 작업이 중단되면 PC에서 같은 생성 요청을 재개할 수 있습니다.</p>}
          {c.mr && /^https:\/\/lab\.ssafy\.com\/s15-final\/S15P31A206\/-\/merge_requests\/\d+$/.test(c.mr.url) && <a className="dev-button primary motion-mr" href={c.mr.url} target="_blank" rel="noopener noreferrer">MR !{c.mr.iid} 보기 ↗</a>}
          {confirmation?.candidate.id === c.id ? <form className="motion-confirm" onSubmit={e => { e.preventDefault(); void apply() }}><h3>{confirmation.decision === 'approve' ? '이 후보를 승인할까요?' : '이 후보를 거절할까요?'}</h3><p>{confirmation.decision === 'approve' ? '위 수치와 판정기 버전을 기준으로 승인합니다.' : '거절된 후보는 같은 키로 다시 덮어쓸 수 없습니다.'}</p>{confirmation.decision === 'reject' && <label>거절 사유<textarea aria-label="거절 사유" required maxLength={2000} value={reason} disabled={pending} onChange={e => setReason(e.target.value)} /></label>}<div className="dev-action-row"><button className="dev-button primary" disabled={pending || (confirmation.decision === 'reject' && !reason.trim())}>{pending ? '처리 중…' : confirmation.decision === 'approve' ? '승인 확인' : '거절 확인'}</button><button className="dev-button" type="button" disabled={pending} onClick={() => setConfirmation(null)}>취소</button></div></form> : ['pending', 'approved'].includes(c.status) && <div className="dev-action-row motion-actions">{c.status === 'pending' && <button className="dev-button primary" disabled={pending} onClick={() => review(c, 'approve')}>승인</button>}<button className="dev-button" disabled={pending} onClick={() => review(c, 'reject')}>{c.status === 'approved' ? 'MR 생성 전 승인 취소·거절' : '거절'}</button></div>}
        </div></article>)}
        <div className="dev-pages"><button className="dev-button" disabled={pending || page === 0} onClick={() => { setPage(n => n - 1); setConfirmation(null) }}>이전</button><span>{page + 1} / {Math.max(1, Math.ceil(listing.total / listing.limit))}</span><button className="dev-button" disabled={pending || (page + 1) * listing.limit >= listing.total} onClick={() => { setPage(n => n + 1); setConfirmation(null) }}>다음</button></div>
      </>}
    </div>
  </div>
}
