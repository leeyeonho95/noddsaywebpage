// 개발자 센터 경기 목록 · 경기 화면이 같이 쓰는 화면 조각(상태 배지 · 동작 요청 표 · 인식 속도 · 요청 막대). 값 · 계산은 lib/developerGame.ts
import { motionName, type CameraRequest } from '../api/camera'
import type { MotionCount } from '../api/developer'
import { cameraSpeed, percent, stateLabels } from '../lib/developerGame'

export function Badge({ state }: { state: string }) { return <span className={`dev-badge state-${state}`}>{stateLabels[state] ?? state}</span> }

export function Speed({ fps }: { fps: number | null | undefined }) {
  const s = cameraSpeed(fps)
  return <><span className={`dev-speed ${s.cls}`}><i aria-hidden />{fps == null ? '—' : `${fps.toFixed(1)}장/초`}</span><small>{s.label}</small></>
}

// 성공 · 시간 초과 · 게임이 먼저 거둠을 막대 하나로
export function RequestBar({ recognized, timedOut, cancelled }: { recognized: number; timedOut: number; cancelled: number }) {
  const all = recognized + timedOut + cancelled
  if (!all) return <span className="dev-muted">요청 없음</span>
  return <div className="dev-reqbar">
    <div className="dev-bar" aria-hidden><i className="ok" style={{ width: `${100 * recognized / all}%` }} /><i className="to" style={{ width: `${100 * timedOut / all}%` }} /><i className="ca" style={{ width: `${100 * cancelled / all}%` }} /></div>
    <small>성공 {recognized} · 시간 초과 {timedOut} · 먼저 거둠 {cancelled}</small>
  </div>
}

const sameRequest = (a: { motion: string; target: string; targetId: number }, b: { motion: string; target: string; targetId: number }) =>
  a.motion.toLowerCase() === b.motion.toLowerCase() && a.target === b.target && a.targetId === b.targetId

// 동작 요청 표: 게임 계측(live) 줄에 카메라 요약의 반응 시간(중앙값)을 붙인다
export function MotionTable({ rows, camera }: { rows: MotionCount[]; camera?: CameraRequest[] }) {
  return <div className="dev-scroll"><table><thead><tr><th>대상</th><th>요청 동작</th><th>요청</th><th>성공</th><th>시간 초과</th><th>먼저 거둠</th><th>대기</th><th>반응(중앙값)</th><th>성공률</th></tr></thead><tbody>
    {rows.map(r => {
      const ms = camera?.find(c => sameRequest(c, r))?.medianMs
      return <tr key={`${r.target}-${r.targetId}-${r.motion}`}><td>{r.target === 'slot' ? '자리' : '팀'} {r.targetId}</td><td>{motionName(r.motion)}</td><td>{r.asked}</td><td>{r.recognized}</td><td>{r.timedOut}</td><td>{r.cancelled}</td><td>{r.pending}</td>
        <td>{ms == null ? '—' : `${(ms / 1000).toFixed(1)}초`}</td><td>{percent(r.recognized, r.recognized + r.timedOut)}</td></tr>
    })}
  </tbody></table>{rows.length === 0 && <p className="dev-empty">이 경기에는 집계된 동작 요청이 없습니다.</p>}</div>
}
