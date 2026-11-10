import type { CameraMetrics, CameraSummary } from '../api/camera'
import { isListeningWindow, motionName } from '../api/camera'

const number = (v: number | null | undefined, digits = 1) => v == null ? '미수집' : v.toLocaleString('ko-KR', { maximumFractionDigits: digits })
const percent = (v: number | null | undefined) => v == null ? '미수집' : `${number(v * 100)}%`
const milliseconds = (v: number | null | undefined) => v == null ? '미수집' : `${number(v / 1000, 3)}초`
const targetName = (target: string) => target === 'team' ? '팀' : '자리'

export function CameraDiagnostics({ data, total }: { data: CameraMetrics | undefined; total: number }) {
  return <section className="dev-panel camera-diagnostics" aria-label="카메라 인식 통계">
    <div className="dev-panel-heading"><div><p className="dev-eyebrow">CAMERA DIAGNOSTICS</p><h2>카메라 인식</h2><p className="dev-muted">현재 조회 조건 · 카메라 요약 {data?.games ?? 0} / {total}경기</p></div><span className="camera-timing">경기 종료 후 갱신</span></div>
    <p className="dev-note">영상 대신 경기별 진단 요약을 표시합니다. 요청 성공률은 정답 영상 대비 정확도가 아닙니다. 현재 플레이 중인 경기의 요약은 종료 후 수신됩니다.</p>
    {!data?.games ? <p className="dev-empty">조회 조건에 맞는 카메라 요약이 없습니다. 종료 후 수집 대기 중이거나, 카메라 입력이 아니거나, 과거 경기와 연결되지 않은 기록일 수 있습니다.</p> : <>
      <h3>동작별 요청 성공률</h3><p className="dev-muted">독수리 팀 대기 창 {number(data.listeningWindows.asked, 0)}건 제외 · 성공 {number(data.listeningWindows.recognized, 0)} / 시간 초과 {number(data.listeningWindows.timedOut, 0)} / 취소 {number(data.listeningWindows.cancelled, 0)}. 취소는 성공률 분모에서 제외합니다.</p>
      <div className="dev-scroll"><table><thead><tr><th>동작 · 대상</th><th>경기 / 요청</th><th>성공률</th><th>시간 초과</th><th>그중 추적 소실</th><th>취소</th><th>버전별 성공률</th></tr></thead><tbody>{data.motions.map(m => <tr key={`${m.motion}-${m.target}`}><td>{motionName(m.motion)} · {targetName(m.target)}</td><td>{m.games} / {m.asked}</td><td><span className="camera-rate">{percent(m.successRate)}{m.successRate != null && <progress max={1} value={m.successRate} aria-label={`${motionName(m.motion)} ${targetName(m.target)} 성공률`} />}</span><small>{m.recognized} / {m.recognized + m.timedOut}</small></td><td>{m.timedOut}</td><td>{m.trackingLostTimeouts}</td><td>{m.cancelled}</td><td>{m.byVersion.map(v => <small key={v.clientVersion}>{v.clientVersion}: {percent(v.successRate)} ({v.recognized}/{v.recognized + v.timedOut})</small>)}</td></tr>)}</tbody></table>{!data.motions.length && <p className="dev-empty">집계할 동작 요청이 없습니다.</p>}</div>
      <p className="dev-note">전체 반응 시간 중앙값·p90: 미수집. 경기별 중앙값을 평균하지 않습니다. 개별 경기에서 측정한 반응 시간은 상세 보기에서 확인할 수 있습니다.</p>
      <h3>버전별 카메라 상태</h3><div className="dev-scroll"><table><thead><tr><th>빌드 버전</th><th>경기 / 분</th><th>카메라 FPS</th><th>추론 ms</th><th>게임 FPS</th><th>경기당 끊김 초</th></tr></thead><tbody>{data.byVersion.map(v => <tr key={v.clientVersion}><td>{v.clientVersion}</td><td>{v.games} / {number(v.minutes)}</td><td>{number(v.cameraFps)}</td><td>{number(v.inferMs)}</td><td>{number(v.gameFps)}</td><td>{number(v.cameraDownSecPerGame, 3)}</td></tr>)}</tbody></table></div>
      <p className="dev-note">FPS·추론 시간은 경기 길이로 가중 평균합니다. 비교할 때 맵과 빌드 필터도 함께 확인하세요.</p>
      <h3>자리별 잡힘 · 노 젓기</h3><div className="dev-scroll"><table><thead><tr><th>자리</th><th>잡힌 비율</th><th>분당 놓침</th><th>전진</th><th>후진</th><th>안 저음</th><th>분당 뒤집힘</th><th>분당 지속 후진</th></tr></thead><tbody>{data.seats.map(s => <tr key={s.slot}><td>{Math.ceil(s.slot / 2)}팀 · 자리 {s.slot}</td><td>{percent(s.presentRatio)}</td><td>{number(s.lostPerMin, 2)}</td><td>{percent(s.forwardShare)}</td><td>{percent(s.backwardShare)}</td><td>{percent(s.noneShare)}</td><td>{number(s.flipsPerMin, 2)}</td><td>{number(s.sustainedBackwardPerMin, 2)}</td></tr>)}</tbody></table></div>
      <p className="dev-note">젓기 비율은 상태별 판정 시간 ÷ 경기 시간입니다. 관측하지 못한 구간 때문에 합계가 100%보다 작을 수 있습니다. ‘적용된 젓기’ 횟수와는 다른 지표이며, 뒤집힘은 오판 의심 신호입니다.</p>
    </>}
  </section>
}

export function CameraDetail({ camera, state, inputMode, teamLabel }: { camera: CameraSummary | null | undefined; state: string; inputMode: string; teamLabel: (id: number) => string }) {
  const requests = camera?.requests.filter(r => !isListeningWindow(r)) ?? []
  const windows = camera?.requests.filter(isListeningWindow).reduce((n, r) => n + r.asked, 0) ?? 0
  return <section className="camera-detail" aria-label="카메라 진단 상세"><h3>카메라 진단</h3>{!camera ? <p className="dev-muted">{inputMode !== 'CAMERA' ? '카메라 입력이 아닌 경기입니다. 카메라 지표는 미수집입니다.' : ['PLAYING', 'PAUSED', 'STALE'].includes(state) ? '경기 종료 후 카메라 요약 수집을 기다립니다.' : '카메라 요약 미수집 또는 수신 대기 중입니다.'}</p> : <>
    <div className="camera-health"><span>카메라 <b>{number(camera.camera.fps)} FPS</b></span><span>추론 <b>{number(camera.perf.inferMsAvg)} ms</b></span><span>게임 <b>{number(camera.perf.gameFpsAvg)} FPS</b></span><span>끊김 <b>{milliseconds(camera.camera.cameraDownMs)}</b></span></div>
    <div className="dev-seat-grid">{camera.seats.map(s => <article className="dev-seat" key={s.slot}><h4>{teamLabel(Math.ceil(s.slot / 2))} · 자리 {s.slot}</h4><p>잡힌 비율 <b>{percent(s.presentRatio)}</b> · 놓침 {s.lostCount}회</p><p>전진 {number(s.rowSeconds.forward)}초 · 후진 {number(s.rowSeconds.backward)}초</p><p>안 저음 {number(s.rowSeconds.none)}초 · 뒤집힘 {s.forwardToBackwardFlips}회</p></article>)}</div>
    <div className="dev-scroll"><table><thead><tr><th>동작 · 대상</th><th>요청 / 성공</th><th>시간 초과 / 추적 소실</th><th>취소</th><th>반응 중앙값</th><th>반응 p90</th></tr></thead><tbody>{requests.map(r => <tr key={`${r.motion}-${r.target}-${r.targetId}`}><td>{motionName(r.motion)} · {r.target === 'team' ? teamLabel(r.targetId) : `자리 ${r.targetId}`}</td><td>{r.asked} / {r.recognized}</td><td>{r.timedOut} / {r.trackingLostTimeouts}</td><td>{r.cancelled}</td><td>{milliseconds(r.medianMs)}</td><td>{milliseconds(r.p90Ms)}</td></tr>)}</tbody></table>{!requests.length && <p className="dev-empty">이 경기에는 집계할 카메라 동작 요청이 없습니다.</p>}</div><p className="dev-note">반응 시간은 성공한 요청만 계산합니다. 독수리 팀 대기 창 {windows}건은 위 표에서 제외했으며 CSV에서 원본 횟수를 확인할 수 있습니다.</p>
  </>}</section>
}
