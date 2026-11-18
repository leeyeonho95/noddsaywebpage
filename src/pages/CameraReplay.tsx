import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router'
import { cameraLogError, fetchCameraLog } from '../api/cameraLog'
import {
  activeRequests, body, findIssues, frameAt, ITEM_KO, KINDS, MOTION_KO, motionKo, parseCameraLog, protectingAt, readLogBytes, T, teamItemState,
  type CameraLog, type Frame, type Issue, type IssueKind, type ReqResult,
} from '../lib/cameraReplay'
import './camera-replay.css'

// 개발자 대시보드 '인식 문제 장면'(S15P31A206-297): 경기 카메라 로그를 열어 인식이 잘못된 것으로 보이는 장면을 관절 뼈대로 다시 본다.
// 고르는 기준과 로그 읽기는 lib/cameraReplay.ts(판정 규칙은 다시 만들지 않음). 영상은 없고 로그의 관절 좌표만 그린다.

const SEAT: Record<number, string> = { 1: '#3987e5', 2: '#d95926', 3: '#199e70', 4: '#c98500' }
const OFF = '#8f8e88'
const BONES = [[3, 4], [3, 5], [5, 7], [7, 9], [4, 6], [6, 8], [8, 10], [3, 11], [4, 12], [11, 12], [11, 13], [12, 14]]
const ROW_KO: Record<string, string> = { Forward: '앞으로 젓기', Backward: '뒤로 젓기', None: '안 저음' }
const VERDICT_KO: Record<string, string> = { Background: '뒷사람 처리', Empty: '빈 자리', TooClose: '너무 가까움', NotStanding: '안 서 있음' }
const W = 1280, H = 717
const FONT = '"Pretendard", "Malgun Gothic", sans-serif'

type Loaded = { log: CameraLog; issues: Issue[]; reqs: ReqResult[]; source: string }
const isPlayer = (f: Frame['f'][number] | undefined) => !!f && f.present && f.verdict === 'Player' && f.tracking === 'Tracked'
class LogFormatError extends Error {}

function open(text: string, source: string): Loaded {
  const log = parseCameraLog(text)
  if (!log.frames.length) throw new LogFormatError('관절 장면(P · J 줄)이 없습니다. 관절 좌표를 남기는 빌드(S15P31A206-258 이후)의 로그인지 확인해 주세요.')
  return { log, ...findIssues(log), source }
}

// 지금 보는 구간: 고른 장면(앞 3초~뒤 2초) 또는 경기 전체
function rangeOf(data: Loaded | null, current: Issue | null, whole: boolean): [number, number] {
  if (!data) return [0, 0]
  const frames = data.log.frames
  return whole || !current ? [frames[0].t, frames[frames.length - 1].t] : current.clip
}

function banner(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string) {
  ctx.font = `700 20px ${FONT}`; ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width + 24
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, 32)
  ctx.fillStyle = '#ffffff'; ctx.fillText(text, x + 12, y + 16)
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, tag: string, color: string) {
  if (tag) { // 화면 가장자리 자리(1P · 4P)의 긴 이름표가 잘리지 않게 안쪽으로
    ctx.font = `600 17px ${FONT}`
    const half = ctx.measureText(tag).width / 2 + 11
    x = Math.min(W - half, Math.max(half, x))
  }
  ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = color; ctx.fillText(name, x, y - (tag ? 14 : 0))
  if (tag) {
    ctx.font = `600 17px ${FONT}`
    const w = ctx.measureText(tag).width + 14
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y + 2, w, 26)
    ctx.fillStyle = '#f0efec'; ctx.fillText(tag, x, y + 15)
  }
  ctx.textAlign = 'left'
}

function drawView(ctx: CanvasRenderingContext2D, data: Loaded, t: number, focus: number[] | null, mirror: boolean, caption: string) {
  const { log, reqs } = data
  const fr = log.frames[frameAt(log.frames, t)]
  const X = (x: number) => (mirror ? 1 - x : x) * W, Y = (y: number) => y * H
  ctx.fillStyle = '#161615'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#2b2a27'; ctx.lineWidth = 1; ctx.setLineDash([4, 6])
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(W * k / 4, 0); ctx.lineTo(W * k / 4, H); ctx.stroke() }
  ctx.setLineDash([])

  for (const slot of [1, 2, 3, 4]) {
    const v = fr.seats[slot], f = fr.f[slot]
    if (!v) continue
    const ok = isPlayer(f), color = ok ? SEAT[slot] : OFF
    ctx.globalAlpha = focus && !focus.includes(slot) ? 0.3 : 1
    ctx.strokeStyle = color; ctx.lineWidth = focus?.includes(slot) ? 6 : 4; ctx.lineCap = 'round'
    ctx.setLineDash(ok ? [] : [8, 8]) // 점선 = 판정에서 빠진 자리
    const P = (k: number): [number, number] => [X(v[k * 3]), Y(v[k * 3 + 1])]
    for (const [a, b] of BONES) { const p = P(a), q = P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke() }
    ctx.setLineDash([])
    const n = P(0)
    ctx.beginPath(); ctx.arc(n[0], n[1], 14, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = color
    for (const k of [7, 8]) { const p = P(k); ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill() }
    const tags: string[] = []
    if (f) {
      if (!ok) tags.push(f.tracking !== 'Tracked' ? '놓침' : (VERDICT_KO[f.verdict] ?? f.verdict))
      if (f.moves.length) tags.push(f.moves.map(m => MOTION_KO[m] ?? m).join('·'))
      else if (ok && f.row && f.row !== 'None') tags.push(ROW_KO[f.row] ?? f.row)
    }
    const bd = body(v, fr.ar)
    if (bd && bd.height < T.collapseHeight) tags.push('뭉침')
    if (protectingAt(log, slot, fr.t)) tags.push('보호 중(위 가림)')
    const top = Math.min(...[0, 3, 4, 7, 8].map(k => P(k)[1]))
    label(ctx, n[0], Math.max(top - 34, 40), `${slot}P`, tags.join(' · '), color)
    ctx.globalAlpha = 1
  }

  // 위: 걸려 있는 요청 · 방금 나간 팀 동작, 오른쪽 위: 팀 아이템
  let y = 16
  for (const r of activeRequests(reqs, t)) {
    const who = r.slot > 0 ? `${r.slot}P` : `${r.teamNo}팀`
    const left = Math.max(0, r.t + r.windowMs / 1000 - t)
    const state = r.outcome === 'recognized' && t >= r.endT ? '✓ 성공' : r.outcome === 'timedOut' && t >= r.endT - 0.05 ? '✗ 시간 초과' : `남은 ${left.toFixed(1)}초`
    banner(ctx, 16, y, `${who} ${motionKo(r.code)} 요청 · ${state}`, r.outcome === 'timedOut' ? '#c0392b' : '#3a3936'); y += 40
  }
  for (const x of log.teamFires) if (x.t <= t && t - x.t < 1.2) { banner(ctx, 16, y, `✓ ${x.team}팀 ${MOTION_KO[x.code] ?? x.code} 나감`, '#1f6f4a'); y += 40 }
  let ry = 16
  for (const team of [1, 2]) {
    const st = teamItemState(log, team, t)
    if (!st) break
    const text = `${team}팀 아이템 ${st.held.map(x => ITEM_KO[x] ?? x).join(' · ') || '없음'}${st.rolling ? ' (룰렛)' : ''}`
    ctx.font = `700 20px ${FONT}`
    banner(ctx, W - 40 - ctx.measureText(text).width, ry, text, st.held.length ? '#2a5a8a' : '#3a3936'); ry += 40
  }
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H - 40, W, 40)
  ctx.fillStyle = '#f0efec'; ctx.font = `600 20px ${FONT}`; ctx.textBaseline = 'middle'
  ctx.fillText(`${t.toFixed(2)}초${caption ? `  ·  ${caption}` : ''}`, 16, H - 20)
}

function drawTimeline(ctx: CanvasRenderingContext2D, w: number, h: number, data: Loaded, t: number, [a, b]: [number, number], current: Issue | null, whole: boolean) {
  const sx = (v: number) => (v - a) / (b - a || 1) * w
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#e3e9f0'; ctx.fillRect(0, 14, w, 16)
  if (current && !whole) { ctx.fillStyle = 'rgba(217,89,38,.25)'; ctx.fillRect(sx(current.t0), 10, Math.max(2, sx(current.t1) - sx(current.t0)), 24) }
  if (whole) for (const x of data.issues) { ctx.fillStyle = 'rgba(217,89,38,.4)'; ctx.fillRect(sx(x.t0), 30, Math.max(2, sx(x.t1) - sx(x.t0)), 6) }
  for (const r of data.reqs) {
    if (r.endT < a || r.t > b) continue
    ctx.fillStyle = r.outcome === 'timedOut' ? '#c0392b' : r.outcome === 'recognized' ? '#2f7d4f' : '#8a8983'
    ctx.fillRect(sx(r.t), 16, Math.max(2, sx(r.endT) - sx(r.t)), 4)
  }
  for (const x of data.log.teamFires) if (x.t >= a && x.t <= b) { ctx.fillStyle = '#2a78d6'; ctx.fillRect(sx(x.t) - 1, 4, 3, 36) }
  for (const p of data.log.prot) { // 숙이기 보호: 정상 해제는 회색, 시간 끝 · 연속 실패 · 안 풀림은 보라
    if (p.t1 < a || p.t0 > b) continue
    ctx.fillStyle = ['release', 'stand', 'refind'].includes(p.how) ? '#8a8983' : '#8e5bd6'
    ctx.fillRect(sx(p.t0), 24, Math.max(2, sx(p.t1) - sx(p.t0)), 4)
  }
  ctx.fillStyle = '#1b2b43'; ctx.fillRect(sx(t) - 1, 0, 3, h)
}

export function CameraReplay() {
  const [params] = useSearchParams()
  const userId = params.get('userId'), eventId = params.get('eventId')
  const [data, setData] = useState<Loaded | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<IssueKind | null>(null)
  const [current, setCurrent] = useState<Issue | null>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.5)
  const [whole, setWhole] = useState(false)
  const [mirror, setMirror] = useState(true)
  const [recording, setRecording] = useState(false)
  const [over, setOver] = useState(false)
  const view = useRef<HTMLCanvasElement>(null)
  const timeline = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const tRef = useRef(0) // 재생 루프가 읽는 지금 시각(상태 갱신은 다음 렌더에야 반영돼서 따로 둔다)
  const setTime = (v: number) => { tRef.current = v; setT(v) }
  const range = rangeOf(data, current, whole)

  function show(loaded: Loaded) {
    setData(loaded); setFilter(null); setError(''); setStatus('')
    const first = loaded.issues[0] ?? null
    setCurrent(first); setWhole(!first); setTime(first ? first.clip[0] : loaded.log.frames[0].t); setPlaying(!!first)
  }

  // 경기 상세에서 왔으면(userId · eventId) 서버 원본을 받아 본다
  useEffect(() => {
    if (!userId || !eventId) return
    const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect
    setStatus('서버에서 원본 로그를 받는 중…'); setError('')
    fetchCameraLog(userId, eventId, controller.signal)
      .then(readLogBytes)
      .then(text => { if (!controller.signal.aborted) show(open(text, `경기 ${eventId.slice(0, 8)} 서버 원본`)) })
      .catch(e => { if (!controller.signal.aborted) { setStatus(''); setError(e instanceof LogFormatError ? e.message : cameraLogError(e)) } })
    return () => controller.abort()
  }, [userId, eventId])

  async function openFile(file: File) {
    setStatus(`${file.name} 읽는 중…`); setError('')
    try { show(open(await readLogBytes(file), file.name)) }
    catch (e) { setStatus(''); setError(`열지 못했습니다: ${e instanceof Error ? e.message : String(e)}`) }
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setOver(false)
    const file = event.dataTransfer.files[0]
    if (file) void openFile(file)
  }

  // 재생: 장면 시각 t를 배속만큼 앞으로. 클립 끝이면 처음으로(저장 중이면 멈추고 파일로)
  useEffect(() => {
    if (!playing || !data) return
    let last = 0, raf = 0
    const [a, b] = rangeOf(data, current, whole)
    const step = (ts: number) => {
      if (last) {
        const next = tRef.current + (ts - last) / 1000 * speed
        if (next < b) setTime(next)
        else if (recorder.current) { setTime(b); recorder.current.stop(); setPlaying(false); return }
        else setTime(a)
      }
      last = ts
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, data, current, whole])

  // 그리기
  useEffect(() => {
    if (!data) return
    const ctx = view.current?.getContext('2d'), tctx = timeline.current?.getContext('2d')
    const focus = current && !whole ? current.seats : null
    if (ctx) drawView(ctx, data, t, focus, mirror, current && !whole ? current.title : '')
    if (tctx && timeline.current) drawTimeline(tctx, timeline.current.width, timeline.current.height, data, t, range, current, whole)
  }) // 매 렌더(재생 중 t가 바뀔 때마다)

  // 단축키: 스페이스 재생/멈춤, ← → 한 장면
  useEffect(() => {
    if (!data) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
      if (e.key === 'ArrowLeft') stepFrame(-1)
      if (e.key === 'ArrowRight') stepFrame(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function stepFrame(d: number) {
    if (!data) return
    setPlaying(false)
    const frames = data.log.frames
    setTime(frames[Math.min(frames.length - 1, Math.max(0, frameAt(frames, tRef.current) + d))].t)
  }
  function select(issue: Issue) { setCurrent(issue); setWhole(false); setTime(issue.clip[0]); setPlaying(true) }
  function seek(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect(), [a, b] = range
    setTime(a + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (b - a))
  }
  function record() {
    if (recorder.current) { recorder.current.stop(); return }
    if (!data || !view.current) return
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x))
    const chunks: Blob[] = []
    const rec = new MediaRecorder(view.current.captureStream(30), type ? { mimeType: type } : undefined)
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
      const link = document.createElement('a')
      const id = String(data.log.meta?.eventId ?? 'log').slice(0, 8)
      link.href = url; link.download = `${id}-${current && !whole ? `${current.t0.toFixed(1)}s-${current.kind}` : 'race'}.webm`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      recorder.current = null; setRecording(false)
    }
    recorder.current = rec
    setTime(range[0]); rec.start(); setRecording(true); setPlaying(true)
  }

  const counts: Partial<Record<IssueKind, number>> = {}
  for (const x of data?.issues ?? []) counts[x.kind] = (counts[x.kind] ?? 0) + 1
  const shown = data?.issues.filter(x => !filter || x.kind === filter) ?? []
  const fr = data ? data.log.frames[frameAt(data.log.frames, t)] : null
  const meta = data?.log.meta as Record<string, string> | null | undefined
  const newLines = data ? data.log.items.length + data.log.prot.length + Object.keys(data.log.pnear).length : 0

  return <section className="dev-panel camera-replay" aria-label="인식 문제 장면">
    <div className="dev-panel-heading"><div><p className="dev-eyebrow">CAMERA REPLAY</p><h2>인식 문제 장면</h2>
      <p className="dev-muted">경기 카메라 로그를 열면 인식이 잘못된 것으로 보이는 장면을 골라 관절 뼈대로 다시 보여 줍니다. 영상은 없고, 로그에 남은 관절 좌표와 Unity 판정만 사용합니다.</p></div></div>
    <div className={`replay-drop${over ? ' over' : ''}`} role="button" tabIndex={0}
      onClick={() => fileInput.current?.click()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      {status || (data ? `${data.source} — 다른 로그를 열려면 끌어다 놓거나 누르세요` : '카메라 로그(.csv.gz · .csv)를 끌어다 놓거나 눌러서 고르세요')}
      <input ref={fileInput} type="file" accept=".gz,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = '' }} />
    </div>
    {error && <p className="dev-alert" role="alert">{error}</p>}
    {data && <p className="replay-meta">{[meta?.startedAt && String(meta.startedAt).replace('T', ' ').slice(0, 19), meta?.mapId, meta?.clientVersion && `v${meta.clientVersion}`,
      `${(data.log.end - data.log.start).toFixed(0)}초`, `장면 ${data.log.frames.length}`, meta?.eventId && `경기 ${String(meta.eventId).slice(0, 8)}`,
      newLines ? `아이템 줄 ${data.log.items.length} · 보호 줄 ${data.log.prot.length} · 두 사람 근접 ${Object.keys(data.log.pnear).length}` : 'S15P31A206-295 이전 빌드 로그(아이템 · 숙이기 보호 · 두 사람 근접 줄 없음)'].filter(Boolean).join(' · ')}</p>}

    {data && fr && <div className="replay-layout">
      <div className="replay-list">
        <div className="replay-chips">
          <button type="button" className={filter === null ? 'on' : ''} onClick={() => setFilter(null)}>전체 {data.issues.length}</button>
          {(Object.keys(KINDS) as IssueKind[]).filter(k => counts[k]).map(k => <button type="button" key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{KINDS[k]} {counts[k]}</button>)}
        </div>
        <div className="replay-items">
          {shown.map(x => <button type="button" key={x.id} className={`replay-item${current === x ? ' selected' : ''}`} onClick={() => select(x)}>
            <small>{x.t0.toFixed(1)}~{x.t1.toFixed(1)}초 · {x.kindLabel}</small><b>{x.title}</b><span>{x.detail.split('\n')[0]}</span>
          </button>)}
          {!shown.length && <p className="dev-empty">고른 문제 장면이 없습니다.</p>}
        </div>
      </div>
      <div className="replay-player">
        <canvas ref={view} className="replay-view" width={W} height={H} aria-label="관절 뼈대 재생" />
        <div className="replay-controls">
          <button type="button" className="dev-button" onClick={() => setPlaying(p => !p)}>{playing ? '❚❚ 멈춤' : '▶ 재생'}</button>
          <button type="button" className="dev-button" onClick={() => setTime(range[0])}>⟲ 처음</button>
          <button type="button" className="dev-button" title="한 장면 뒤로" aria-label="한 장면 뒤로" onClick={() => stepFrame(-1)}>◀</button>
          <button type="button" className="dev-button" title="한 장면 앞으로" aria-label="한 장면 앞으로" onClick={() => stepFrame(1)}>▶</button>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="재생 배속">{[0.25, 0.5, 1].map(s => <option key={s} value={s}>{s}배</option>)}</select>
          <label><input type="checkbox" checked={whole} onChange={e => { setWhole(e.target.checked); if (!e.target.checked && current) setTime(current.clip[0]) }} /> 경기 전체</label>
          <label><input type="checkbox" checked={mirror} onChange={e => setMirror(e.target.checked)} /> 화면처럼 좌우 뒤집기</label>
          <button type="button" className="dev-button" onClick={record}>{recording ? '■ 저장 멈춤' : '● 영상 저장'}</button>
          <span className="replay-time">{t.toFixed(2)}초 ({range[0].toFixed(1)}~{range[1].toFixed(1)})</span>
        </div>
        <canvas ref={timeline} className="replay-timeline" width={1200} height={44} aria-label="시간 막대"
          onPointerDown={e => { setPlaying(false); e.currentTarget.setPointerCapture(e.pointerId); seek(e) }} onPointerMove={e => { if (e.buttons) seek(e) }} />
        {current && !whole && <p className="replay-detail"><b>{current.title}</b>{'\n'}{current.detail}</p>}
        <div className="dev-scroll"><table><thead><tr><th>자리</th><th>판정</th><th>노 젓기(앞/뒤/안 함)</th><th>켜진 동작</th><th>어깨너비</th><th>두 손 가로</th><th>왼손 높이</th><th>오른손 높이</th><th>몸 세로</th></tr></thead><tbody>
          {(current && !whole ? current.seats : [1, 2, 3, 4]).map(s => {
            const f = fr.f[s], bd = body(fr.seats[s], fr.ar)
            return <tr key={s}><td>{s}P</td>
              <td>{f ? (isPlayer(f) ? '플레이어' : `${VERDICT_KO[f.verdict] ?? f.verdict} · ${f.tracking === 'Tracked' ? '잡힘' : '놓침'}`) : '—'}</td>
              <td>{f && f.pFwd !== null && f.pFwd >= 0 ? `${ROW_KO[f.row] ?? f.row} (${f.pFwd.toFixed(2)}/${(f.pBack ?? 0).toFixed(2)}/${(f.pNone ?? 0).toFixed(2)})` : '—'}</td>
              <td>{f?.moves.length ? f.moves.map(m => MOTION_KO[m] ?? m).join(', ') : '—'}</td>
              <td>{bd ? bd.sw.toFixed(3) : '—'}</td><td>{bd ? bd.spread.toFixed(2) : '—'}</td><td>{bd ? bd.lw.y.toFixed(2) : '—'}</td><td>{bd ? bd.rw.y.toFixed(2) : '—'}</td><td>{bd ? bd.height.toFixed(2) : '—'}</td></tr>
          })}
        </tbody></table></div>
      </div>
    </div>}
    <p className="dev-note">자리 색: 1P 파랑 · 2P 주황 · 3P 초록 · 4P 노랑. 점선 회색 뼈대 = 판정에서 빠진 자리(뒷사람 처리 · 놓침). 시간 막대: 요청(초록 성공 · 빨강 시간 초과 · 회색 취소), 팀 동작(파란 세로선), 숙이기 보호(보라 = 안 풀림). 수치는 어깨 가운데가 0, 단위는 어깨너비, 아래가 +입니다. 단축키: 스페이스 재생/멈춤, ← → 한 장면.</p>
    <p className="dev-note">경기 상세의 '인식 문제 장면 보기'는 서버 원본 로그 API가 배포된 뒤부터 바로 열립니다. 그 전에는 로그 파일을 직접 엽니다(운영 경기: 게임 저장소 <code>scripts/camera-recognition-report.py</code>가 받은 <code>Logs/camera-report/prod/경기ID.csv.gz</code>, 개발 PC: <code>Logs/camera/camera-*.csv</code>).</p>
  </section>
}
