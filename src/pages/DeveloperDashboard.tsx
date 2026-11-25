import { CameraDiagnostics } from '../components/CameraDiagnostics'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context'
import { ApiError } from '../api/webAuth'
import { base, developerGet, errorMessage, type Game, type Listing } from '../api/developer'
import './developer-dashboard.css'
import { cameraReplayTab, DeveloperNavigation, motionCandidatesTab } from '../components/DeveloperNavigation'
import { Badge, RequestBar, Speed } from '../components/developerGameParts'
import { count, date, duration, gamePath, modeLabels, percent, shortDate, shortDuration, stateLabels, teamLabel } from '../lib/developerGame'
import { MotionCandidates } from './MotionCandidates'
import { CameraReplay } from './CameraReplay'

// 개발자 센터 틀(위 막대 · 메뉴). 경기 목록과 경기 화면(DeveloperGame)이 같이 쓴다.
export function DeveloperShell({ children }: { children: ReactNode }) {
  const { snapshot, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const account = snapshot?.user?.userId
  return (
    <div className="dev-dashboard">
      <header className="dev-top">
        <Link to="/">NODDSAY <span>개발자 센터</span></Link>
        <span>{snapshot?.user?.displayName} {account && <button type="button" onClick={() => {
          setLogoutError('')
          void logout().catch(error => setLogoutError(errorMessage(error)))
        }}>로그아웃</button>}</span>
      </header>
      <div className="dev-content">
        <DeveloperNavigation />
        {logoutError && <p className="dev-alert" role="alert">{logoutError}</p>}
        {children}
      </div>
    </div>
  )
}

export function DeveloperDashboard() {
  const { snapshot } = useAuth()
  const [params] = useSearchParams()
  const account = snapshot?.user?.userId
  const tab = params.get('tab'), userId = params.get('userId'), eventId = params.get('eventId')
  // 예전 '인식 문제 장면 보기' 주소(?tab=camera-replay&userId&eventId)는 그 경기 화면으로
  if (tab === cameraReplayTab && userId && eventId) return <Navigate replace to={gamePath({ userId, eventId })} />
  return <DeveloperShell>
    {tab === motionCandidatesTab ? <MotionCandidates key={account} /> : tab === cameraReplayTab ? <CameraReplay key={account} /> : <PlayDashboard />}
  </DeveloperShell>
}

function PlayDashboard() {
  const { snapshot } = useAuth()
  const navigate = useNavigate()
  const account = snapshot?.status === 'AUTHENTICATED' ? snapshot.user?.userId : null
  const [query, setQuery] = useState('mode=CAMERA')
  const [page, setPage] = useState(0)
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController()
    // Reset when synchronizing a new account/query, before its first response.
    // oxlint-disable-next-line react/set-state-in-effect
    setListing(null); setError(''); setDenied(false)
    if (!account) return () => controller.abort()
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 3000); return }
      let delay = 3000
      try {
        const data = await developerGet(`${base}?${query}&offset=${page * 50}`, controller.signal).then(r => r.json()) as Listing
        if (!stopped) { setListing(data); setError(''); setDenied(false) }
      } catch (e) {
        if (stopped) return
        setError(errorMessage(e)); delay = 15000
        if (e instanceof ApiError && [401, 403].includes(e.status)) { setListing(null); setDenied(true); return }
      }
      if (!stopped) timer = setTimeout(poll, delay)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [account, query, page, refresh])
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const params = new URLSearchParams()
    for (const [key, value] of form.entries()) if (typeof value === 'string' && value) params.set(key, ['since', 'until'].includes(key) ? new Date(value).toISOString() : value.trim())
    setQuery(params.toString()); setPage(0); setRefresh(n => n + 1)
  }
  async function download() {
    setExporting(true); setExportError('')
    try { const blob = await developerGet(`${base}.csv.zip?${query}`).then(r => r.blob()); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'gameplay-export.zip'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch (e) { setExportError(errorMessage(e)) } finally { setExporting(false) }
  }
  const open = (g: Game) => navigate(gamePath(g))
  const stats = listing?.stats ?? []
  const successes = stats.reduce((n, s) => n + s.recognized, 0), timeouts = stats.reduce((n, s) => n + s.timedOut, 0)
  const cancelled = listing?.camera ? listing.camera.motions.reduce((n, m) => n + m.cancelled, 0) : null
  const slow = listing?.camera?.slowGames
  return <>
      <div className="dev-title"><div><p className="dev-eyebrow">PLAY INSIGHTS</p><h1>경기</h1><p>경기를 누르면 요약과 다시 보기가 한 화면에 열립니다.</p></div><div className="dev-update"><i className={error ? 'offline' : ''} />3초마다 갱신<br /><small>{listing ? `마지막 갱신 ${date(listing.serverTime)}` : '서버 연결 대기'}</small></div></div>
      {!snapshot ? <p className="dev-empty">로그인 상태 확인 중…</p> : !account ? <div className="dev-panel dev-empty"><p>개발자 계정으로 로그인해 주세요.</p><Link className="dev-button primary" to="/login">로그인</Link></div> : <>
        <form className="dev-filters dev-panel" onSubmit={filter}><label>시작 시각<input type="datetime-local" name="since" /></label><label>종료 시각<input type="datetime-local" name="until" /></label><label>맵<select name="mapId"><option value="">모든 맵</option><option value="tropical-river">포세이돈의 물장난</option><option value="desert-oasis">사막</option><option value="christmas-sled">산타의 눈 내린 밤</option></select></label><label>빌드 버전<input name="version" placeholder="모든 버전" maxLength={128} /></label><label>입력<select name="mode" defaultValue="CAMERA"><option value="CAMERA">카메라</option><option value="">모든 입력</option><option value="KEYBOARD">키보드</option><option value="AUTOMATED_TEST">자동 검증</option></select></label><label>경기 상태<select name="state"><option value="">모든 상태</option>{Object.entries(stateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><button className="dev-button primary" type="submit">조건 적용</button></form>
        <p className="dev-muted dev-filter-note">기간을 지정하지 않으면 최근 7일을 조회합니다. 기본 통계는 카메라 플레이입니다.</p>
        {error && <div className="dev-alert" role="alert">{error} <button className="dev-button" onClick={() => setRefresh(n => n + 1)}>다시 확인</button></div>}
        {listing && !denied && <><div className="dev-metrics">
            <article><span>조회된 경기</span><strong>{count(listing.total)}<small>판</small></strong><p>진행 중 {count(listing.activeCount)}판 · 종료·연결 지연 포함</p></article>
            <article><span>동작 요청 성공률</span><strong>{successes + timeouts ? (100 * successes / (successes + timeouts)).toFixed(1) : '—'}<small>{successes + timeouts ? '%' : ''}</small></strong><p>성공 {successes} · 시간 초과 {timeouts} · 독수리 팀 대기 창 제외</p></article>
            <article><span>게임이 먼저 거둔 요청</span><strong>{cancelled == null ? '—' : count(cancelled)}<small>{cancelled == null ? '' : '건'}</small></strong><p>장애물이 지나가 인식 전에 끝난 요청(카메라 요약 기준)</p></article>
            <article><span>인식이 느렸던 경기</span><strong>{slow == null ? '—' : count(slow)}<small>{slow == null ? '' : '판'}</small></strong><p>초당 10장 미만 · 대개 노트북 충전기 빠짐</p></article>
          </div>
          <section className="dev-panel"><div className="dev-panel-heading"><div><h2>경기 목록</h2><p className="dev-muted">줄을 누르면 경기 화면이 열립니다. 15초 이상 소식이 없으면 연결 확인이 필요합니다.</p></div>
            <div className="dev-game-actions"><Link className="dev-button" to={`/dev-dashboard?tab=${cameraReplayTab}`}>내 PC 로그 열기</Link><button className="dev-button primary" onClick={() => void download()} disabled={exporting}>{exporting ? '내보내는 중…' : '조회 조건으로 CSV 내보내기'}</button></div></div>
            {exportError && <p role="alert" className="dev-alert">{exportError}</p>}
            <div className="dev-scroll"><table className="dev-games"><thead><tr><th>상태</th><th>시작</th><th>맵 · 인원 · 빌드</th><th>경기 시간</th><th>인식 속도</th><th>동작 요청</th><th /></tr></thead><tbody>{listing.games.map(g => {
              const d = g.cameraDigest
              return <tr key={`${g.userId}-${g.eventId}`} className="dev-game-row" onClick={() => open(g)}>
                <td><Badge state={g.state} /></td>
                <td>{shortDate(g.startedAt)}</td>
                <td><b>{g.mapName}</b><small>{teamLabel(g, 1)} / {teamLabel(g, 2)}</small><small>{d ? `${d.players}명 · ` : ''}v{g.clientVersion} · {g.eventId.slice(0, 8)}{g.inputMode !== 'CAMERA' ? ` · ${modeLabels[g.inputMode] ?? g.inputMode}` : ''}</small></td>
                <td>{g.state === 'FINISHED' || g.state === 'INTERRUPTED' ? shortDuration(g.elapsedMs) : duration(g.elapsedMs)}</td>
                <td>{d ? <Speed fps={d.fps} /> : <span className="dev-muted">{g.cameraCollected ? '—' : '카메라 요약 없음'}</span>}</td>
                <td>{d ? <RequestBar recognized={d.recognized} timedOut={d.timedOut} cancelled={d.cancelled} /> : <span className="dev-muted">—</span>}</td>
                <td><Link className={`dev-button${g.cameraCollected ? ' primary' : ''}`} to={gamePath(g)} onClick={e => e.stopPropagation()}>{g.cameraCollected ? '▶ 다시 보기' : '열기'}</Link></td>
              </tr>
            })}</tbody></table></div>{listing.total === 0 && <p className="dev-empty">조건에 맞는 경기가 없습니다.</p>}<div className="dev-pages"><button className="dev-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.max(1, Math.ceil(listing.total / 50))}</span><button className="dev-button" disabled={(page + 1) * 50 >= listing.total} onClick={() => setPage(p => p + 1)}>다음</button></div></section>
          <details className="dev-panel dev-fold"><summary>맵 · 버전별 비교</summary><p className="dev-muted">완주율은 종료 경기의 팀 기준입니다. 미완주는 평균 완주 시간에서 제외합니다.</p><div className="dev-scroll"><table><thead><tr><th>맵</th><th>맵 / 빌드 버전</th><th>경기</th><th>팀 완주율</th><th>평균 완주 시간</th><th>전진 / 후진</th><th>동작 성공 / 시간 초과</th></tr></thead><tbody>{stats.map((s, i) => <tr key={i}><td>{s.mapName}</td><td>{s.mapVersion} / {s.clientVersion}</td><td>{s.games}</td><td>{s.totalTeams ? `${percent(s.finishedTeams, s.totalTeams)} (${s.finishedTeams}/${s.totalTeams})` : '—'}</td><td>{s.averageFinishMs == null ? '—' : duration(s.averageFinishMs)}</td><td>{s.telemetryGames ? `${count(s.forward)} / ${count(s.backward)}` : '미수집'}</td><td>{s.motionGames ? `${s.recognized} / ${s.timedOut}` : '미수집'}</td></tr>)}</tbody></table></div></details>
          <details className="dev-panel dev-fold"><summary>카메라 진단 모음</summary><CameraDiagnostics data={listing.camera} total={listing.total} /></details>
          <p className="dev-note">CSV ZIP에는 경기·팀 결과·자리별 젓기·동작 요청·아이템·충돌·규칙·카메라·카메라 요청 9종과 조회 조건이 포함됩니다. 팀명은 경기 시작 당시 이름이며 과거 미수집 이름은 빈 값입니다. 이전 경기의 미수집 수치는 0으로 채우지 않습니다.</p>
        </>}{!listing && !error && <p className="dev-empty">경기 데이터를 불러오는 중…</p>}
      </>}
  </>
}
