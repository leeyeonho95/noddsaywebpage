// 카메라 진단 로그(.csv / .csv.gz 푼 글) 읽기와 '인식 문제 장면' 고르기(S15P31A206-297).
// 판정 규칙은 다시 만들지 않는다. Unity가 로그에 적은 결과(F 줄 상태 · 켜진 동작, REQ · GES · CANCEL · TEAM · NEAR,
// S15P31A206-295부터 ITEM · PROT · PNEAR)와 관절 위치(J 줄)만 쓴다. 로그 형식은 게임 저장소 docs/api/camera-logs.md.

// J 줄 관절 15개 순서(CameraLogFormat.Points = 0, 2, 5, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26)
export const J = { nose: 0, leye: 1, reye: 2, lsh: 3, rsh: 4, lel: 5, rel: 6, lwr: 7, rwr: 8, lin: 9, rin: 10, lhip: 11, rhip: 12, lknee: 13, rknee: 14 } as const
const NPTS = 15

export const MOTION_KO: Record<string, string> = {
  Bow: '숙이기', CrocClap: '악어박수', Croc: '악어박수', EscapeX: '탈출 X', DodgeLeft: '왼쪽 피하기', DodgeRight: '오른쪽 피하기',
  CircleO: 'O', O: 'O', Eagle: '독수리', Peek: '눈 가리기', Hula: '울라울라', Surprise: '상상도 못한 정체',
  Patmat: '패트와매트', Fusion: '퓨전', Tada: '짜란',
}
export const ITEM_KO: Record<string, string> = { Wings: '날개', Siren: '세이렌', LightningArrow: '번개 화살' }
const PROT_WHY_KO: Record<string, string> = { turn: '숙이기 전환이 보여서', reject: '숙이기 전환 뒤 거절돼서', recheck: '거절 즉시 가림 재확인으로 숙인 주인을 찾아서' }
const PROT_END_KO: Record<string, string> = { release: '정상 해제(똑바로 선 주인 확인)', timeout: '6초 시간 끝', stand: '서서 통과', refind: '사람을 새로 찾음', fails: '연속 15장면 실패', open: '로그 끝까지 안 풀림' }
const PROT_MISS_KO: Record<string, string> = { owner: '주인 아님', presence: '사람 안 보임', share: '칸 밖', hold: '보류', unstable: '똑바로 안 섬', color: '옷 색 어긋남', far: '서 있던 자리에서 멂' }
// 요청 동작 → F 줄 moves 칸 이름(혼자 하는 동작). 두 사람 동작(Hula · Patmat · Fusion · Tada)은 F 줄에 없다.
const SOLO_MOVE: Record<string, string> = { EscapeX: 'EscapeX', CrocClap: 'Croc', DodgeLeft: 'DodgeLeft', DodgeRight: 'DodgeRight', Bow: 'Bow', CircleO: 'O', Eagle: 'Eagle', Peek: 'Peek', Surprise: 'Surprise' }

// 인식률 리포트 · Unity와 같은 값
const CANCEL_AS_TIMEOUT_MS = 250 // 창이 끝나기 이만큼 안에 거두면 시간 초과(CameraRaceStats)
const JOIN_S = 0.3               // 같은 덩어리로 잇는 끊김
const MATCH_AFTER_S = 4.0        // 혼자 한 덩어리가 끝난 뒤 이만큼 안에 팀 동작이 나가면 짝이 맞음
const AFTER_REQUEST_S = 1.0      // 요청이 끝난 뒤 이만큼은 요청 답으로 본다

// 이 화면에서 정한 값(문제 장면 후보 고르기용, 판정 아님)
export const T = {
  collapseHeight: 0.15, // 코 · 어깨 · 엉덩이 · 무릎의 세로 범위가 화면 높이의 이만큼 미만이면 '뭉침'
  collapseMinS: 2.5,    // 뭉침이 이만큼 이어지면 문제 장면(진짜 숙이기는 대개 1~3초)
  excludedMinS: 1.5,    // 판정 제외(뒷사람 처리 · 놓침)가 이만큼 이어지면 문제 장면
  armsUpY: 0.5,         // 두 손목이 어깨선 아래 어깨너비 이만큼보다 위면 '팔 듦'(서서 쉬면 손목은 1.5 아래)
  armsUpMinS: 0.6,      // 팔 듦이 이만큼 이어지면 '인식 안 된 동작 의심'
  eagleLikeSpread: 1.2, // 두 손목 가로 거리(어깨너비)가 이만큼 넘으면 '독수리 비슷'
  xLikeGap: 0.6,        // 두 손목 가로 거리가 이만큼 안이면 'X 비슷'
  clipBeforeS: 3, clipAfterS: 2,
}

export type FRow = { t: number; slot: number; present: boolean; verdict: string; tracking: string; row: string; moves: string[]; pFwd: number | null; pBack: number | null; pNone: number | null }
export type Frame = { t: number; ar: number; seats: Record<number, Float32Array>; f: Record<number, FRow> }
export type Req = { id: string; t: number; slot: number; team: string; code: string; windowMs: number }
export type Near = { slot: number; code: string; share: number | null; slack: number | null; cond: string | null; value: number | null; op: string; thr: number | null }
export type PairNear = { code: string; share: number | null; parts: { slot: number; part: number | null }[] }
export type ItemLine = { t: number; team: number; action: string; item: string; held: string[] }
export type Protect = { slot: number; t0: number; t1: number; why: string; how: string; ms: number | null; checks: number; miss: Record<string, number> }
export type CameraLog = {
  meta: Record<string, unknown> | null; frames: Frame[]; reqs: Req[]; ges: Record<string, number>; cancels: Record<string, { t: number; ms: number }>
  near: Record<string, Near[]>; pnear: Record<string, PairNear[]>; teamFires: { t: number; team: number; code: string }[]
  items: ItemLine[]; prot: Protect[]; races: { start: number; end: number; reason: string }[]; start: number; end: number
}
export type Outcome = 'recognized' | 'timedOut' | 'cancelled'
export type ReqResult = Req & { outcome: Outcome; endT: number; seats: number[]; teamNo: number; near: Near[] }
export type IssueKind = 'request' | 'alone' | 'missed' | 'excluded' | 'protect' | 'collapse'
export type Issue = { id: number; kind: IssueKind; kindLabel: string; t0: number; t1: number; seats: number[]; title: string; detail: string; clip: [number, number]; like?: 'Eagle' | 'EscapeX' | null }
export type Body = { sw: number; lw: { x: number; y: number }; rw: { x: number; y: number }; spread: number; gap: number; height: number; wristsUp: boolean }

export const KINDS: Record<IssueKind, string> = {
  request: '요청 실패',
  alone: '팀 동작 혼자 끝남',
  missed: '인식 안 된 동작 의심',
  excluded: '판정에서 빠짐',
  protect: '숙이기 보호 안 풀림',
  collapse: '뼈대 뭉침',
}

function num(s: string | undefined): number | null { const v = parseFloat(s ?? ''); return Number.isFinite(v) ? v : null }
export const teamOfSlot = (slot: number) => slot <= 2 ? 1 : 2
const teamOfReq = (r: Req) => r.slot > 0 ? teamOfSlot(r.slot) : (['A', '0', 'Team1', '1'].includes(r.team) ? 1 : 2)
const targets = (r: Req) => r.slot > 0 ? [r.slot] : (teamOfReq(r) === 1 ? [1, 2] : [3, 4])
export const motionKo = (code: string) => code.split('|').map(c => MOTION_KO[c] ?? c).join(' · ')

// ---------------------------------------------------------------- 읽기

export function parseCameraLog(text: string): CameraLog {
  const log: CameraLog = { meta: null, frames: [], reqs: [], ges: {}, cancels: {}, near: {}, pnear: {}, teamFires: [], items: [], prot: [], races: [], start: NaN, end: NaN }
  let cur: Frame | null = null, ar = 0.56, raceStart: number | null = null
  const protOpen: Record<number, (Omit<Protect, 't1' | 'how'> & { t1: number | null; how: string | null }) | null> = {}
  const prot: (Omit<Protect, 't1' | 'how'> & { t1: number | null; how: string | null })[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    if (line.startsWith('#meta ')) { try { log.meta = JSON.parse(line.slice(6)) } catch { /* 메타가 깨져도 나머지는 읽는다 */ } continue }
    if (line.startsWith('#') || line.startsWith('t,')) continue
    const c = line.split(',')
    const t = num(c[0])
    if (t === null) continue
    if (Number.isNaN(log.start)) log.start = t
    log.end = t
    switch (c[1]) {
      case 'P':
        ar = num(c[2]) || ar
        cur = { t, ar, seats: {}, f: {} }
        log.frames.push(cur)
        break
      case 'J': {
        if (!cur) break
        const v = new Float32Array(NPTS * 3)
        for (let i = 0; i < NPTS * 3; i++) { const x = num(c[3 + i]); v[i] = x === null ? 0 : (i % 3 === 2 ? x / 1000 : x / 10000) }
        cur.seats[parseInt(c[2], 10)] = v
        break
      }
      case 'F': {
        const slot = parseInt(c[2], 10)
        if (cur) cur.f[slot] = {
          t, slot, present: c[3] === '1', verdict: c[4], tracking: c[5], row: c[6],
          moves: !c[12] || c[12] === '-' ? [] : c[12].split('|'), pFwd: num(c[13]), pBack: num(c[14]), pNone: num(c[15]),
        }
        break
      }
      case 'REQ': if (c.length >= 7) log.reqs.push({ id: c[2], t, slot: parseInt(c[3], 10), team: c[4], code: c[5], windowMs: num(c[6]) || 0 }); break
      case 'GES': if (!(c[2] in log.ges)) log.ges[c[2]] = t; break
      case 'CANCEL': if (!(c[2] in log.cancels)) log.cancels[c[2]] = { t, ms: num(c[3]) || 0 }; break
      case 'NEAR':
        if (c.length >= 11) (log.near[c[2]] ??= []).push({ slot: parseInt(c[3], 10), code: c[4], share: num(c[5]), slack: num(c[6]), cond: c[7] || null, value: num(c[8]), op: c[9], thr: num(c[10]) })
        break
      case 'TEAMX': log.teamFires.push({ t, team: parseInt(c[2], 10), code: 'EscapeX' }); break
      case 'TEAM': log.teamFires.push({ t, team: parseInt(c[2], 10), code: c[3] }); break
      // 팀 아이템 보유가 바뀜: ITEM,팀(1 · 2),start|roll|got|used|set,아이템,보유(| 구분, 없으면 -)
      case 'ITEM':
        if (c.length >= 6) log.items.push({ t, team: parseInt(c[2], 10), action: c[3], item: c[4] === '-' ? '' : c[4], held: !c[5] || c[5] === '-' ? [] : c[5].split('|') })
        break
      // 숙이기 보호: PROT,자리,start,까닭 · PROT,자리,끝난 방식,ms,해제 검사 수,못 푼 까닭=수|…
      case 'PROT': {
        const slot = parseInt(c[2], 10)
        if (c[3] === 'start') {
          const open = protOpen[slot]
          if (open) { open.t1 = t; open.how = 'open' }
          const p = { slot, t0: t, t1: null, why: c[4] || '', how: null, ms: null, checks: 0, miss: {} }
          protOpen[slot] = p
          prot.push(p)
        } else {
          let p = protOpen[slot]
          if (!p) { p = { slot, t0: t - (num(c[4]) || 0) / 1000, t1: null, why: '', how: null, ms: null, checks: 0, miss: {} }; prot.push(p) }
          p.t1 = t; p.how = c[3]; p.ms = num(c[4]); p.checks = parseInt(c[5], 10) || 0
          for (const kv of (c[6] || '').split('|')) { const [k, n] = kv.split('='); if (k) p.miss[k] = parseInt(n, 10) || 0 }
          protOpen[slot] = null
        }
        break
      }
      // 두 사람 동작 요청 근접 점수: PNEAR,요청,동작,팀 비율 최댓값,자리,자기 몫 비율,자리,자기 몫 비율
      case 'PNEAR':
        if (c.length >= 9) (log.pnear[c[2]] ??= []).push({ code: c[3], share: num(c[4]), parts: [{ slot: parseInt(c[5], 10), part: num(c[6]) }, { slot: parseInt(c[7], 10), part: num(c[8]) }] })
        break
      case 'RACE':
        if (c[2] === 'begin') raceStart = t
        else if (c[2] === 'end') { log.races.push({ start: raceStart ?? log.start, end: t, reason: c[3] || '' }); raceStart = null }
        break
      default: break
    }
  }
  if (raceStart !== null) log.races.push({ start: raceStart, end: log.end, reason: '끝 줄 없음' })
  log.prot = prot.map(p => p.t1 === null || p.how === null ? { ...p, t1: log.end, how: 'open', ms: (log.end - p.t0) * 1000 } : { ...p, t1: p.t1, how: p.how })
  return log
}

// gzip이면 풀고(첫 두 바이트 1f 8b), 아니면 그대로 글로 읽는다. 서버가 Content-Encoding으로 이미 풀어 보낸 경우도 같은 길로.
export async function readLogBytes(blob: Blob): Promise<string> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  if (head[0] === 0x1f && head[1] === 0x8b) return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
  return blob.text()
}

// ---------------------------------------------------------------- 관절에서 읽는 값(판정이 아니라 보여 주기 · 후보 고르기용)

// 몸 기준 좌표: 원점 = 두 어깨 가운데, 단위 = 어깨너비, y는 아래가 +(MoveRules.Body와 같은 좌표계)
export function body(v: Float32Array | undefined, ar: number): Body | null {
  if (!v) return null
  const X = (k: number) => v[k * 3], Y = (k: number) => v[k * 3 + 1]
  const cx = (X(J.lsh) + X(J.rsh)) / 2, cy = (Y(J.lsh) + Y(J.rsh)) / 2
  const sw = Math.abs(X(J.lsh) - X(J.rsh)) || 1e-3
  const B = (k: number) => ({ x: (X(k) - cx) / sw, y: (Y(k) - cy) * ar / sw })
  const lw = B(J.lwr), rw = B(J.rwr)
  const ys = [J.nose, J.lsh, J.rsh, J.lhip, J.rhip, J.lknee, J.rknee].map(Y)
  return { sw, lw, rw, spread: lw.x - rw.x, gap: Math.abs(lw.x - rw.x), height: Math.max(...ys) - Math.min(...ys), wristsUp: Y(J.lwr) < Y(J.lel) && Y(J.rwr) < Y(J.rel) }
}

// ---------------------------------------------------------------- 요청 결과(인식률 리포트와 같은 규칙)

export function requestOutcomes(log: CameraLog): ReqResult[] {
  return log.reqs.map(r => {
    const win = r.windowMs / 1000, g = log.ges[r.id], c = log.cancels[r.id]
    let outcome: Outcome, endT: number
    if (g !== undefined && (!c || g <= c.t)) { outcome = 'recognized'; endT = g }
    else if (c) { outcome = c.ms >= r.windowMs - CANCEL_AS_TIMEOUT_MS ? 'timedOut' : 'cancelled'; endT = c.t }
    else { outcome = log.end - r.t >= win ? 'timedOut' : 'cancelled'; endT = Math.min(log.end, r.t + win) }
    return { ...r, outcome, endT, seats: targets(r), teamNo: teamOfReq(r), near: log.near[r.id] ?? [] }
  })
}

// 조건을 만족하는 장면을 덩어리로 잇는다(끊김 join 안이면 잇는다)
function runs(frames: Frame[], pred: (fr: Frame) => boolean, join = JOIN_S): [number, number][] {
  const out: [number, number][] = []
  let start: number | null = null, last = 0
  for (const fr of frames) {
    if (!pred(fr)) continue
    if (start === null || fr.t - last > join) { if (start !== null) out.push([start, last]); start = fr.t }
    last = fr.t
  }
  if (start !== null) out.push([start, last])
  return out
}

const isPlayer = (f: FRow | undefined) => !!f && f.present && f.verdict === 'Player' && f.tracking === 'Tracked'

// 자리가 [a, b] 동안 어땠나: 판정 제외 · 뭉침 · 그 동작이 켜졌나
function seatState(log: CameraLog, slot: number, a: number, b: number, move?: string) {
  let n = 0, excluded = 0, collapsed = 0, on = 0, bg = 0, lost = 0
  for (const fr of log.frames) {
    if (fr.t < a || fr.t > b) continue
    n++
    const f = fr.f[slot]
    if (!isPlayer(f)) { excluded++; if (f && f.tracking !== 'Tracked') lost++; else bg++ }
    const bd = body(fr.seats[slot], fr.ar)
    if (bd && bd.height < T.collapseHeight) collapsed++
    if (f && move && f.moves.includes(move)) on++
  }
  return { n, excluded, collapsed, on, bg, lost }
}

// ITEM 줄이 있으면 그 시각에 팀이 가진 아이템과 룰렛이 도는 중인지(없으면 null = 모름). 줄마다 그때 보유가 다 적혀 있어 마지막 줄만 본다.
export function teamItemState(log: CameraLog, team: number, t: number): { held: string[]; rolling: boolean } | null {
  if (!log.items.length) return null
  let last: ItemLine | null = null
  for (const it of log.items) { if (it.t > t) break; if (it.team === team) last = it }
  return { held: last ? last.held : [], rolling: !!last && last.action === 'roll' }
}
function itemsKo(state: { held: string[]; rolling: boolean } | null) {
  if (state === null) return '아이템 보유: 로그에 없음(S15P31A206-295 이전 빌드)'
  return `아이템 보유: ${state.held.map(x => ITEM_KO[x] ?? x).join(', ') || '없음'}${state.rolling ? ' · 룰렛 도는 중(게임이 독수리를 무시)' : ''}`
}

// PROT 보호 구간 하나를 한 줄 설명으로
export function protKo(p: Protect) {
  const miss = Object.entries(p.miss).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${PROT_MISS_KO[k] ?? k} ${n}`).join(' · ')
  return `숙이기 보호 ${((p.ms ?? (p.t1 - p.t0) * 1000) / 1000).toFixed(1)}초(${PROT_WHY_KO[p.why] ?? (p.why || '?')} 시작) → ${PROT_END_KO[p.how] ?? p.how}`
    + (p.how === 'release' ? '' : ` · 해제 검사 ${p.checks}번${miss ? ` 중 못 넘긴 까닭: ${miss}` : ''}`)
}
const protOverlap = (log: CameraLog, slot: number, a: number, b: number) => log.prot.filter(p => p.slot === slot && p.t0 <= b && a <= p.t1)
export const protectingAt = (log: CameraLog, slot: number, t: number) => log.prot.find(p => p.slot === slot && p.t0 <= t && t <= p.t1) ?? null

// ---------------------------------------------------------------- 문제 장면 고르기

export function findIssues(log: CameraLog): { issues: Issue[]; reqs: ReqResult[] } {
  const issues: Omit<Issue, 'id'>[] = []
  const reqs = requestOutcomes(log)
  const busy: Record<number, [number, number][]> = { 1: [], 2: [], 3: [], 4: [] }
  for (const r of reqs) for (const s of r.seats) busy[s]?.push([r.t, r.endT + AFTER_REQUEST_S])
  const inBusy = (slot: number, t: number) => busy[slot].some(([a, b]) => a <= t && t <= b)
  const add = (kind: IssueKind, t0: number, t1: number, seats: number[], title: string, detail: string, extra: Pick<Issue, 'like'> = {}) => issues.push({
    kind, kindLabel: KINDS[kind], t0, t1, seats, title, detail, clip: [Math.max(log.start, t0 - T.clipBeforeS), Math.min(log.end, t1 + T.clipAfterS)], ...extra,
  })

  // 1) 요청 실패(시간 초과)
  for (const r of reqs) {
    if (r.outcome !== 'timedOut') continue
    const solo = r.code.split('|').map(c => SOLO_MOVE[c]).filter(Boolean)
    const parts: string[] = []
    for (const s of r.seats) {
      const ps = seatState(log, s, r.t, r.t + r.windowMs / 1000, solo[0])
      const bits: string[] = []
      if (ps.n && ps.excluded / ps.n > 0.5) bits.push('창의 절반 넘게 판정에서 빠짐')
      if (ps.n && ps.collapsed / ps.n > 0.3) bits.push('뼈대 뭉침')
      if (solo.length) bits.push(ps.on ? '그 동작이 켜진 적 있음' : '그 동작이 한 번도 안 켜짐')
      const nr = r.near.find(x => x.slot === s)
      if (nr?.cond) bits.push(`가장 가까웠던 조건 ${nr.cond} ${nr.value} ${nr.op} ${nr.thr}(동작 장면 ${Math.round((nr.share ?? 0) * 100)}%, 기준 30%)`)
      for (const p of protOverlap(log, s, r.t, r.t + r.windowMs / 1000)) if (p.how !== 'release') bits.push(protKo(p))
      parts.push(`${s}P: ${bits.join(' · ') || '정보 없음'}`)
    }
    const pn = log.pnear[r.id] ?? []
    for (const x of pn) {
      const pct = (v: number | null) => v === null ? '못 잡음' : `${Math.round(v * 100)}%`
      const unseen = x.parts.filter(q => q.part === null).map(q => `${q.slot}P`)
      const low = x.parts.filter(q => q.part !== null && q.part < 0.3).map(q => `${q.slot}P`)
      const why: string[] = []
      if (unseen.length) why.push(`${unseen.join(' · ')}가 요청 동안 안 잡힘`)
      if (low.length) why.push(`${low.join(' · ')}가 자기 몫을 거의 못 함`)
      if (!why.length) why.push('둘 다 했지만 같은 때 맞지 않음')
      parts.push(`${motionKo(x.code)}: 두 사람이 같이 맞은 비율 최대 ${Math.round((x.share ?? 0) * 100)}%(기준 ${x.code === 'Hula' ? 80 : 30}%) · 자기 몫 ${x.parts.map(q => `${q.slot}P ${pct(q.part)}`).join(' · ')} → ${why.join(', ')}`)
    }
    if (!solo.length && !pn.length) parts.push('두 사람 동작 근접 점수(PNEAR 줄)가 없는 로그예요(S15P31A206-295 이전 빌드)')
    add('request', r.t, r.t + r.windowMs / 1000, r.seats, `${r.slot > 0 ? `${r.slot}P` : `${r.teamNo}팀`} ${motionKo(r.code)} 요청 실패`, parts.join('\n'))
  }

  // 2) 독수리 · X 혼자 끝남(요청 없는 팀 동작)
  for (const [move, label] of [['Eagle', '독수리'], ['EscapeX', '탈출 X']] as const) {
    for (const slot of [1, 2, 3, 4]) {
      const team = teamOfSlot(slot), mate = slot % 2 ? slot + 1 : slot - 1
      const eps = runs(log.frames, fr => { const f = fr.f[slot]; return !!f && f.tracking === 'Tracked' && f.moves.includes(move) && !inBusy(slot, fr.t) })
      for (const [a, b] of eps) {
        if (log.teamFires.some(x => x.team === team && x.code === move && a - 0.5 <= x.t && x.t <= b + MATCH_AFTER_S)) continue
        const ps = seatState(log, mate, a - 0.5, b + 2, move)
        const why: string[] = []
        if (ps.n && ps.excluded / ps.n > 0.3) why.push(`짝 ${mate}P가 판정에서 빠져 있었어요(뒷사람 처리 ${ps.bg}장면 · 놓침 ${ps.lost}장면 / ${ps.n})`)
        if (ps.n && ps.collapsed / ps.n > 0.3) why.push(`짝 ${mate}P 뼈대가 뭉쳐 있었어요(${ps.collapsed}/${ps.n}장면)`)
        if (!why.length) why.push(ps.on ? `짝 ${mate}P도 켜졌지만 시간이 안 맞았어요` : `짝 ${mate}P는 잡혔는데 ${label}가 안 켜졌어요`)
        for (const p of protOverlap(log, mate, a - 0.5, b + 2)) if (p.how !== 'release') why.push(`짝 ${mate}P ${protKo(p)}`)
        if (move === 'Eagle') why.push(itemsKo(teamItemState(log, team, a)))
        add('alone', a, b, [slot, mate], `${slot}P ${label} 혼자 끝남`, why.join('\n'))
      }
    }
  }

  // 3) 인식 안 된 동작 의심: 플레이어로 잡혔고, 켜진 동작이 없고, 요청 답도 아닌데 팔을 든 채(노도 안 젓고 쉬지도 않는 자세)
  for (const slot of [1, 2, 3, 4]) {
    const team = teamOfSlot(slot)
    const eps = runs(log.frames, fr => {
      const f = fr.f[slot]
      // 노 젓기 판정(Forward · Backward)은 막지 않는다: 팔을 든 채 멈춘 자세에도 젓기 판정이 깜빡여서(11-18 4P X 시도 중 Forward)
      if (!isPlayer(f) || f!.moves.length || inBusy(slot, fr.t)) return false
      const bd = body(fr.seats[slot], fr.ar)
      return !!bd && bd.height >= T.collapseHeight && bd.lw.y < T.armsUpY && bd.rw.y < T.armsUpY
    })
    for (const [a, b] of eps) {
      if (b - a < T.armsUpMinS) continue
      let spread = 0, gap = 0, up = 0, rowed = 0, n = 0
      for (const fr of log.frames) {
        if (fr.t < a || fr.t > b) continue
        const bd = body(fr.seats[slot], fr.ar), f = fr.f[slot]
        if (!bd) continue
        spread += bd.spread; gap += bd.gap; up += bd.wristsUp ? 1 : 0; n++
        if (f && (f.row === 'Forward' || f.row === 'Backward')) rowed++
      }
      spread /= n || 1; gap /= n || 1
      const upShare = up / (n || 1)
      // 두 손 벌림 → 독수리 비슷, 두 손목이 엇갈렸거나(왼손이 오른쪽) 가운데 모였고 팔꿈치 위 → X 비슷
      const like: Issue['like'] = spread > T.eagleLikeSpread ? 'Eagle' : ((spread < -0.2 || gap < T.xLikeGap) && upShare > 0.5 ? 'EscapeX' : null)
      const likeKo = like === 'Eagle' ? '독수리 비슷(두 손 벌림)' : like === 'EscapeX' ? 'X 비슷(두 손 엇갈림 · 팔꿈치 위)' : '팔 듦'
      const lines = [`${(b - a).toFixed(1)}초 동안 팔을 든 채, 켜진 동작 없음 · 모양: ${likeKo}`, `평균 두 손 가로 거리 ${spread.toFixed(2)} 어깨너비(독수리 기준 1.7, 음수 = 엇갈림)`]
      if (rowed) lines.push(`그동안 노 젓기 판정이 ${rowed}장면 켜짐(팔 든 자세를 젓기로 봄)`)
      // 바로 뒤에 그 동작이 켜졌으면 '못 잡음'이 아니라 '늦게 잡음'
      const late = !!like && log.frames.some(fr => fr.t > b && fr.t <= b + 0.7 && (fr.f[slot]?.moves ?? []).includes(like))
      if (late) lines.push('바로 뒤에 켜짐(늦게 인식)')
      if (like === 'Eagle') {
        const st = teamItemState(log, team, a)
        if (st !== null && !st.held.length) continue // 아이템이 없으면 독수리를 쓸 수 없으니 뺀다
        lines.push(itemsKo(st))
      }
      add('missed', a, b, [slot], `${slot}P ${likeKo}${late ? ' (늦게 켜짐)' : ''}`, lines.join('\n'), { like })
    }
  }

  // 4) 판정에서 빠짐(뒷사람 처리 · 놓침)이 길게
  for (const slot of [1, 2, 3, 4]) {
    for (const [a, b] of runs(log.frames, fr => { const f = fr.f[slot]; return !!f && f.present && !isPlayer(f) }, 0.5)) {
      if (b - a < T.excludedMinS) continue
      const ps = seatState(log, slot, a, b)
      const lines = [`뒷사람 처리 ${ps.bg}장면 · 놓침 ${ps.lost}장면 · 그중 뼈대 뭉침 ${ps.collapsed}장면(전체 ${ps.n})`]
      for (const p of protOverlap(log, slot, a - 1, b)) if (p.how !== 'release') lines.push(protKo(p))
      add('excluded', a, b, [slot], `${slot}P 판정에서 빠짐 ${(b - a).toFixed(1)}초`, lines.join('\n'))
    }
  }

  // 5) 숙이기 보호가 정상 해제되지 않음(PROT 줄) · 6) 뼈대 뭉침. 보호 구간과 겹치는 뭉침은 보호 장면 하나로 합친다.
  const collapses: { slot: number; a: number; b: number; used: boolean }[] = []
  for (const slot of [1, 2, 3, 4])
    for (const [a, b] of runs(log.frames, fr => { const bd = body(fr.seats[slot], fr.ar); return !!bd && bd.height < T.collapseHeight }, 0.5))
      if (b - a >= T.collapseMinS) collapses.push({ slot, a, b, used: false })
  for (const p of log.prot) {
    if (p.how === 'release' || p.how === 'stand') continue
    const col = collapses.filter(x => x.slot === p.slot && x.a <= p.t1 + 2 && p.t0 - 1 <= x.b)
    col.forEach(x => { x.used = true })
    if (p.how === 'refind' && !col.length) continue // 다시 찾아서 끝난 짧은 보호는 문제 장면이 아니다
    const lines = [protKo(p)]
    if (col.length) lines.push(`그동안 뼈대 뭉침 ${col.map(x => (x.b - x.a).toFixed(1)).join(' · ')}초`)
    add('protect', Math.min(p.t0, ...col.map(x => x.a)), Math.max(p.t1, ...col.map(x => x.b)), [p.slot], `${p.slot}P 숙이기 보호 안 풀림 · ${PROT_END_KO[p.how] ?? p.how}`, lines.join('\n'))
  }
  for (const { slot, a, b, used } of collapses) {
    if (used) continue
    const bow = reqs.find(r => r.code.includes('Bow') && r.seats.includes(slot) && r.t <= a + 1 && a <= r.endT + 1)
    add('collapse', a, b, [slot], `${slot}P 뼈대 뭉침 ${(b - a).toFixed(1)}초`,
      `몸 세로 길이(코~무릎)가 화면 높이의 ${T.collapseHeight} 미만${bow ? ` · 숙이기 요청 직후 시작${log.prot.length ? '' : '(숙이기 보호가 안 풀린 것으로 보임)'}` : ''}`)
  }

  issues.sort((x, y) => x.t0 - y.t0)
  return { issues: issues.map((x, i) => ({ ...x, id: i + 1 })), reqs }
}

// 그 시각에 걸려 있는 요청들(배너용)
export const activeRequests = (reqs: ReqResult[], t: number) => reqs.filter(r => r.t <= t && t <= r.endT)

// t에 가장 가까운 장면 번호(장면은 시간순)
export function frameAt(frames: Frame[], t: number) {
  let lo = 0, hi = frames.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (frames[mid].t < t) lo = mid + 1; else hi = mid }
  if (lo > 0 && Math.abs(frames[lo - 1].t - t) < Math.abs(frames[lo].t - t)) lo--
  return lo
}
