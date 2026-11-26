// 개발자 센터 경기 화면(/dev-dashboard/games/:userId/:eventId): 경기 요약 · 다시 보기 · 자리별 · 동작 요청을 한 화면에.
// 예전에는 경기 목록 아래에 상세가 열리고 다시 보기는 다른 탭이었다(2026-11-24 개편). 주소를 그대로 공유할 수 있다.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/context'
import { ApiError } from '../api/webAuth'
import { base, developerGet, errorMessage, type Game } from '../api/developer'
import { isListeningWindow, type CameraSummary } from '../api/camera'
import { cameraLogError, fetchCameraLog } from '../api/cameraLog'
import { cameraLogState } from '../lib/cameraLogStatus'
import { CameraDetail } from '../components/CameraDiagnostics'
import { Badge, MotionTable } from '../components/developerGameParts'
import { PLAYER_PRESENT, cameraSpeed, count, date, duration, modeLabels, percent, rejectLabels, stateLabels, sum, teamLabel } from '../lib/developerGame'
import { CameraReplay } from './CameraReplay'
import { DeveloperShell } from './DeveloperDashboard'
import './developer-dashboard.css'

const LIVE = ['PLAYING', 'PAUSED', 'STALE']

export function DeveloperGamePage() {
  const { userId = '', eventId = '' } = useParams()
  const { snapshot } = useAuth()
  const account = snapshot?.status === 'AUTHENTICATED' ? snapshot.user?.userId : null
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(false)

  // 진행 중 경기는 3초마다, 끝난 경기는 30초마다 다시 받는다(카메라 요약이 경기 뒤에 올라오므로)
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect
    setGame(null); setError(''); setMissing(false)
    if (!account) return () => controller.abort()
    async function poll() {
      let delay = 30000
      try {
        const g = await developerGet(`${base}/${encodeURIComponent(userId)}/${encodeURIComponent(eventId)}`, controller.signal).then(r => r.json()) as Game
        if (stopped) return
        setGame(g); setError('')
        if (LIVE.includes(g.state)) delay = 3000
      } catch (e) {
        if (stopped) return
        if (e instanceof ApiError && e.status === 404) { setMissing(true); return }
        setError(errorMessage(e)); delay = 15000
        if (e instanceof ApiError && [401, 403].includes(e.status)) return
      }
      if (!stopped) timer = setTimeout(poll, delay)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [account, userId, eventId])

  return <DeveloperShell>
    <Link className="dev-back" to="/dev-dashboard">← 경기 목록</Link>
    {error && <p className="dev-alert" role="alert">{error}</p>}
    {missing ? <p className="dev-empty dev-panel">이 경기를 찾지 못했습니다. 주소를 확인해 주세요.</p>
      : game ? <GameView game={game} /> : !error && <p className="dev-empty">경기 불러오는 중…</p>}
  </DeveloperShell>
}

function CopyLink() {
  const [done, setDone] = useState('')
  return <button type="button" className="dev-button" onClick={() => {
    navigator.clipboard.writeText(window.location.href).then(() => setDone('복사했어요'), () => setDone('복사 못 함'))
    setTimeout(() => setDone(''), 2000)
  }}>{done || '🔗 이 경기 링크 복사'}</button>
}

function DownloadRaw({ game }: { game: Game }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function download() {
    setBusy(true); setError('')
    try {
      const url = URL.createObjectURL(await fetchCameraLog(game.userId, game.eventId))
      const link = document.createElement('a'); link.href = url; link.download = `camera-${game.eventId.slice(0, 8)}.csv.gz`
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(cameraLogError(e)) } finally { setBusy(false) }
  }
  return <>{error && <span className="dev-muted" role="alert">{error}</span>}<button type="button" className="dev-button" disabled={busy} onClick={() => void download()}>{busy ? '받는 중…' : '원본 로그 받기'}</button></>
}

function players(camera: CameraSummary | null | undefined) {
  return camera?.seats.filter(s => (s.presentRatio ?? 0) >= PLAYER_PRESENT) ?? null
}

function GameView({ game }: { game: Game }) {
  const [now] = useState(() => Date.now())
  const cam = game.camera
  const live = game.live?.requests?.filter(r => !isListeningWindow(r)) ?? null
  const camRequests = cam?.requests.filter(r => !isListeningWindow(r))
  const rows = live ?? camRequests ?? []
  const rec = sum(rows, 'recognized'), to = sum(rows, 'timedOut'), ca = sum(rows, 'cancelled')
  const logState = cameraLogState(game, now)
  const seen = players(cam)
  const speed = cameraSpeed(cam?.camera.fps)
  const until = game.rawExpiresAt ? date(game.rawExpiresAt) : null

  return <>
    <section className="dev-panel dev-game-head">
      <div><p className="dev-eyebrow">MATCH</p><h1>{game.mapName} <Badge state={game.state} /></h1>
        <p className="dev-muted">{date(game.startedAt)} · {modeLabels[game.inputMode] ?? game.inputMode} · 빌드 {game.clientVersion}{seen && ` · 카메라 ${seen.length}명`}</p>
        <p className="dev-id">경기 {game.eventId} · 계정 {game.userId}</p></div>
      <div className="dev-game-actions"><CopyLink />{(logState === 'available' || logState === 'unknown') && <DownloadRaw game={game} />}</div>
    </section>

    <div className="dev-metrics">
      <article><span>경기 시간</span><strong>{duration(game.elapsedMs)}</strong><p>{stateLabels[game.state] ?? game.state}{game.result && ` · ${game.result.endReason}`}</p></article>
      <article><span>인식 속도</span><strong className={`dev-speed-num ${speed.cls}`}>{cam ? cam.camera.fps.toFixed(1) : '—'}<small>{cam ? '장/초' : ''}</small></strong>
        <p>{cam ? `${speed.label} · 지연 ${Math.round(cam.perf.inferMsAvg)}ms · 게임 ${cam.perf.gameFpsAvg.toFixed(0)} fps` : '카메라 요약 없음'}</p></article>
      <article><span>동작 요청 성공</span><strong>{rows.length ? rec : '—'}<small>{rows.length ? `/ ${rec + to}` : ''}</small></strong><p>성공률 {percent(rec, rec + to)} · 게임이 먼저 거둔 요청 {ca}건</p></article>
      <article><span>사람 인식</span><strong>{seen ? seen.length : '—'}<small>{seen ? '명' : ''}</small></strong>
        <p>{cam ? cam.seats.filter(s => s.presentRatio != null && s.presentRatio > 0).map(s => `${s.slot}P ${Math.round((s.presentRatio ?? 0) * 100)}%`).join(' · ') || '잡힌 사람 없음' : '카메라 요약 없음'}</p></article>
    </div>

    <section className="dev-panel dev-game-replay" aria-label="다시 보기">
      <div className="dev-panel-heading"><div><h2>다시 보기</h2>
        <p className="dev-muted">관절 뼈대 재생입니다(영상 없음). 시간 막대를 누르거나 끌면 경기 아무 순간으로 갑니다.{logState === 'available' && until && ` 원본 보관 ${until}까지.`}</p></div></div>
      {logState === 'available' || logState === 'unknown' ? <CameraReplay key={`${game.userId}-${game.eventId}`} userId={game.userId} eventId={game.eventId} embedded />
        : <p className="dev-empty">{logState === 'none' ? '이 경기는 카메라 로그가 없습니다(키보드 · 자동 검증 경기이거나 카메라 기록이 아직 안 올라옴).'
          : logState === 'expired' ? `카메라 원본 로그의 보관 기간${until ? `(${until}까지)` : ''}이 지나 다시 볼 수 없습니다. 요약만 남아 있습니다.`
            : '이 경기는 카메라 요약만 올라왔고 원본 로그가 없어 다시 볼 수 없습니다.'}</p>}
    </section>

    <Seats game={game} />

    <section className="dev-panel"><div className="dev-panel-heading"><div><h2>동작 요청 결과</h2>
      <p className="dev-muted">성공률 = 성공 ÷ (성공 + 시간 초과). '먼저 거둠'은 장애물이 지나가거나 요청이 바뀌어 인식 전에 끝난 요청입니다. 팀 동작은 두 자리에 중복 집계하지 않고, 독수리 팀 대기 창은 뺍니다.</p></div></div>
      {live ? <MotionTable rows={live} camera={camRequests} /> : <p className="dev-empty">동작 입력 소스가 없거나, 해당 기록이 없는 경기입니다.</p>}
    </section>

    <details className="dev-panel dev-fold"><summary>팀 진행 · 최종 결과</summary>
      {game.live ? <div className="dev-team-grid">{game.live.teams.map(t => <div className="dev-team" key={t.teamId}><div><b>{teamLabel(game, t.teamId)}</b><span>{(t.progress * 100).toFixed(1)}%</span></div><progress max={1} value={t.progress} aria-label={`${t.teamId}팀 진행률`} /><p>아이템 사용 {t.itemsUsed} · 장애물 충돌 {t.obstacleCollisions} · 지형 충돌 {t.terrainCollisions}</p></div>)}</div>
        : <p className="dev-muted">실시간 계측이 추가되기 전의 경기입니다.</p>}
      {game.result ? <div className="dev-team-grid">{game.result.teams.map(t => <div className="dev-team" key={t.teamId}><b>{teamLabel(game, t.teamId)} · {t.result}</b><p>팀 완주 기록: {duration(t.finishTimeMs)}</p><small>{game.result?.endReason}</small></div>)}</div>
        : <p className="dev-muted">종료 결과 수신 대기 중입니다. 연결 지연은 경기 종료를 의미하지 않습니다.</p>}
    </details>
    {game.result && <details className="dev-panel dev-fold"><summary>아이템 사건 {game.result.itemEvents?.length ?? 0}건</summary><div className="dev-scroll"><table><thead><tr><th>시점</th><th>팀</th><th>아이템</th><th>결과</th></tr></thead><tbody>{game.result.itemEvents?.map(e => <tr key={e.id}><td>{duration(e.elapsedMs)}</td><td>{teamLabel(game, e.actorTeam)}</td><td>{e.itemName}</td><td>{e.eventType}</td></tr>)}</tbody></table></div></details>}
    {game.result && <details className="dev-panel dev-fold"><summary>충돌 사건 {game.result.collisionEvents?.length ?? 0}건</summary><div className="dev-scroll"><table><thead><tr><th>시점</th><th>팀</th><th>종류</th><th>대상</th></tr></thead><tbody>{game.result.collisionEvents?.map(e => <tr key={e.id}><td>{duration(e.elapsedMs)}</td><td>{teamLabel(game, e.teamId)}</td><td>{e.category === 'OBSTACLE' ? '장애물' : '지형'}</td><td>{e.targetName}</td></tr>)}</tbody></table></div></details>}
    <details className="dev-panel dev-fold"><summary>카메라 진단</summary><CameraDetail camera={cam} state={game.state} inputMode={game.inputMode} teamLabel={id => teamLabel(game, id)} /></details>
    <p className="dev-note">젓기 수치는 게임이 받아들인 입력 횟수입니다. 실제 팔 왕복 횟수와 다르며, 기절·쿨다운에 따른 입력 거부는 인식 실패와 구분합니다.</p>
  </>
}

// 자리별: 카메라(사람 인식 · 노 젓기 시간)와 게임 계측(적용된 젓기 · 입력 거부 · 동작 요청)을 한 카드에
function Seats({ game }: { game: Game }) {
  const cam = game.camera, live = game.live
  const slots = [...new Set([...(cam?.seats.filter(s => (s.presentRatio ?? 0) > 0).map(s => s.slot) ?? []), ...(live?.seats.filter(s => s.present !== false).map(s => s.slot) ?? [])])].sort((a, b) => a - b)
  if (!slots.length) return null
  const requests = live?.requests?.filter(r => !isListeningWindow(r))
  return <section className="dev-panel"><div className="dev-panel-heading"><h2>자리별</h2></div>
    <div className="dev-seat-grid dev-game-seats">{slots.map(slot => {
      const c = cam?.seats.find(s => s.slot === slot), l = live?.seats.find(s => s.slot === slot)
      const r = c?.rowSeconds, all = r ? r.forward + r.backward + r.none : 0
      const mine = requests?.filter(q => q.target === 'slot' && q.targetId === slot)
      return <article className="dev-seat" key={slot}>
        <div className="dev-seat-title"><h3>{teamLabel(game, Math.ceil(slot / 2))} · 자리 {slot}</h3>
          <span>{c ? `사람 인식 ${Math.round((c.presentRatio ?? 0) * 100)}% · 놓침 ${c.lostCount}회` : l?.present == null ? '인식 미수집' : l.present ? '인식됨' : '인식 안 됨'}</span></div>
        {r && all > 0 && <><p className="dev-small">노 젓기(카메라 판정 시간)</p>
          <div className="dev-bar row" aria-hidden><i className="ok" style={{ width: `${100 * r.forward / all}%` }} /><i className="back" style={{ width: `${100 * r.backward / all}%` }} /><i className="ca" style={{ width: `${100 * r.none / all}%` }} /></div>
          <p className="dev-small">앞 {r.forward.toFixed(0)}초 · 뒤 {r.backward.toFixed(0)}초 · 안 함 {r.none.toFixed(0)}초</p></>}
        {l && <><div className="dev-strokes"><strong>{count(l.forward + l.backward)}</strong><span>적용된 젓기(전진 {count(l.forward)} · 후진 {count(l.backward)})</span></div>
          <p className="dev-muted">입력 거부 {count(Object.values(l.rejected).reduce((a, b) => a + b, 0))}회</p>
          <div className="dev-reasons">{Object.entries(rejectLabels).map(([k, label]) => <span key={k}>{label} {l.rejected[k] ?? 0}</span>)}</div></>}
        <div className="dev-seat-results">{mine ? <>동작 성공 <b>{sum(mine, 'recognized')}</b> / 시간 초과 <b>{sum(mine, 'timedOut')}</b><br /><small>먼저 거둠 {sum(mine, 'cancelled')} · 대기 {mine.reduce((n, q) => n + q.pending, 0)}</small></> : '동작 통계 미수집'}</div>
      </article>
    })}</div>
  </section>
}
