import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { useDeveloperAccess } from '../auth/developerContext'
import { DeveloperNavigation } from '../components/DeveloperNavigation'
import { accessError, changeDeveloper, listAccessEvents, listMembers, type AccessEvent, type AccessPage, type DeveloperMember } from '../api/developerAccess'
import { ApiError } from '../api/webAuth'
import './developer-dashboard.css'
import './developer-access.css'

const actions: Record<string, string> = { DEVELOPER_GRANTED: '개발자 권한 부여', DEVELOPER_REVOKED: '개발자 권한 회수', MANAGER_BOOTSTRAPPED: '관리자 최초 등록' }
const time = (value: string) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
function Pages({ page, total, pending, change }: { page: number; total: number; pending: boolean; change: (page: number) => void }) {
  return <div className="dev-pages"><button className="dev-button" disabled={pending || page === 0} onClick={() => change(page - 1)}>이전</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button className="dev-button" disabled={pending || (page + 1) * 20 >= total} onClick={() => change(page + 1)}>다음</button></div>
}
export function DeveloperAccessPage() {
  const { snapshot, signedIn, logout } = useAuth()
  const { refresh } = useDeveloperAccess()
  const [email, setEmail] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [eventPage, setEventPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [members, setMembers] = useState<AccessPage<DeveloperMember> | null>(null)
  const [events, setEvents] = useState<AccessPage<AccessEvent> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<DeveloperMember | null>(null)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)
  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true); setError(''); setMembers(null); setEvents(null)
    Promise.all([listMembers(query, page * 20), listAccessEvents(eventPage * 20)]).then(([m, e]) => {
      if (active) { setMembers(m); setEvents(e) }
    }).catch((e: unknown) => {
      if (!active) return
      setError(accessError(e))
      if (e instanceof ApiError && [401, 403].includes(e.status)) refresh()
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, page, eventPage, revision, refresh])
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setQuery(email.trim()); setPage(0); setConfirm(null); setNotice(''); setRevision(n => n + 1)
  }
  async function apply() {
    if (!confirm || submitting.current) return
    submitting.current = true; setPending(true); setError(''); setNotice('')
    try {
      const result = await signedIn(csrf => changeDeveloper(csrf, confirm, !confirm.developer))
      setNotice(result.changed ? `${result.member.email} 계정의 개발자 권한을 ${result.member.developer ? '부여' : '회수'}했습니다.` : '이미 적용된 권한입니다.')
      setConfirm(null); setEventPage(0); setRevision(n => n + 1); refresh()
    } catch (e) {
      setError(accessError(e)); setConfirm(null)
      if (e instanceof ApiError && [401, 403].includes(e.status)) refresh()
    } finally { submitting.current = false; setPending(false) }
  }
  return <div className="dev-dashboard"><header className="dev-top"><Link to="/">NODDSAY <span>개발자 센터</span></Link><span>{snapshot?.user?.displayName} <button onClick={() => void logout().catch(e => setError(accessError(e)))}>로그아웃</button></span></header>
    <div className="dev-content"><DeveloperNavigation /><div className="dev-title"><div><p className="dev-eyebrow">TEAM ACCESS</p><h1>함께 볼 팀원을 관리하세요.</h1><p>개발자는 모든 경기 기록과 통계를 조회하고 CSV를 내려받을 수 있습니다.</p></div><span className="dev-role manager">권한 관리자</span></div>
      <section className="dev-panel"><div className="dev-panel-heading"><div><h2>팀원 찾기</h2><p className="dev-muted">웹사이트에 가입한 팀원의 이메일을 정확히 입력해 주세요.</p></div></div>
        <form className="dev-member-search" onSubmit={search}><label htmlFor="member-email">팀원 이메일<input id="member-email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" disabled={pending} /></label><button className="dev-button primary" disabled={pending}>계정 찾기</button><button type="button" className="dev-button" disabled={pending} onClick={() => { setEmail(''); setQuery(''); setPage(0); setConfirm(null); setRevision(n => n + 1) }}>권한 보유자 보기</button></form>
      </section>
      {notice && <p className="dev-success" role="status">{notice}</p>}
      {error && <div className="dev-alert" role="alert">{error} <button className="dev-button" onClick={() => setRevision(n => n + 1)}>다시 조회</button></div>}
      {confirm && <section className="dev-panel dev-confirm" aria-labelledby="change-title"><h2 id="change-title">개발자 권한 {confirm.developer ? '회수' : '부여'}</h2><p><b>{confirm.displayName}</b> · {confirm.email}</p><p>{confirm.developer ? '로그인 중인 계정도 다음 요청부터 대시보드와 CSV에 접근할 수 없습니다. 경기 기록은 보존됩니다.' : '이 계정이 전체 경기 기록·통계를 조회하고 CSV를 다운로드할 수 있게 됩니다.'}</p><div className="dev-action-row"><button className="dev-button primary" disabled={pending} onClick={() => void apply()}>{pending ? '적용 중…' : confirm.developer ? '회수 확인' : '부여 확인'}</button><button className="dev-button" disabled={pending} onClick={() => setConfirm(null)}>취소</button></div></section>}
      <section className="dev-panel"><div className="dev-panel-heading"><h2>{query ? '계정 검색 결과' : '권한을 가진 팀원'}</h2><span className="dev-muted">{members ? `${members.total}명` : ''}</span></div>
        {loading ? <p role="status">팀원 정보를 불러오는 중…</p> : members && <><div className="dev-member-list">{members.items.map(member => <article className="dev-member" key={member.userId}><div><h3>{member.displayName}</h3><p>{member.email}</p>{!member.enabled && <span className="dev-muted">사용 중지된 계정</span>}</div><span className={`dev-role ${member.manager ? 'manager' : ''}`}>{member.manager ? '관리자' : member.developer ? '개발자' : '일반 사용자'}</span>{member.manager ? <span className="dev-muted">관리자 권한 유지</span> : <button className="dev-button" disabled={pending || (!member.enabled && !member.developer)} onClick={() => { setConfirm(member); setError(''); setNotice('') }}>{member.developer ? '권한 회수' : '개발자로 등록'}</button>}</article>)}</div>{members.items.length === 0 && <p className="dev-empty">{query ? '일치하는 계정이 없습니다. 가입한 이메일을 확인해 주세요.' : '표시할 팀원이 없습니다.'}</p>}<Pages page={page} total={members.total} pending={pending} change={setPage} /></>}
      </section>
      <section className="dev-panel"><div className="dev-panel-heading"><h2>권한 변경 이력</h2><span className="dev-muted">한국시간 · KST</span></div>
        {loading ? <p role="status">이력을 불러오는 중…</p> : events && <><div className="dev-scroll"><table><thead><tr><th>변경 시각</th><th>대상 계정</th><th>변경 내용</th><th>처리한 관리자</th></tr></thead><tbody>{events.items.map(event => <tr key={event.id}><td>{time(event.createdAt)}</td><td>{event.targetEmail ?? '삭제된 계정'}</td><td>{actions[event.action] ?? event.action}</td><td>{event.actorEmail ?? '삭제된 계정'}</td></tr>)}</tbody></table></div>{events.items.length === 0 && <p className="dev-empty">아직 권한 변경 이력이 없습니다.</p>}<Pages page={eventPage} total={events.total} pending={pending} change={setEventPage} /></>}
      </section><p className="dev-note">관리자 지정은 서버 운영자가 진행합니다. 이 화면에서는 개발자 조회 권한만 관리합니다.</p>
    </div>
  </div>
}
