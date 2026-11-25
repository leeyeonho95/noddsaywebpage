// 개발자 센터 경기 목록 · 경기 화면이 같이 쓰는 값과 계산(화면 조각은 components/developerGameParts.tsx)
import type { Game } from '../api/developer'

export const stateLabels: Record<string, string> = { PLAYING: '플레이 중', PAUSED: '일시정지', STALE: '연결 확인 필요', FINISHED: '종료', INTERRUPTED: '중단' }
export const modeLabels: Record<string, string> = { CAMERA: '카메라', KEYBOARD: '키보드', AUTOMATED_TEST: '자동 검증' }
export const rejectLabels: Record<string, string> = { STUNNED: '기절', COOLDOWN: '쿨다운', AIRBORNE: '공중', COURSE_BLOCKED: '코스 제한', ESCAPE_HELD: '탈출 대기' }
export const count = (v: number) => v.toLocaleString('ko-KR')
export const duration = (v: number | null | undefined) => v == null ? '미완주' : `${Math.floor(v / 60000)}:${(v % 60000 / 1000).toFixed(3).padStart(6, '0')}`
export const shortDuration = (v: number | null | undefined) => v == null ? '—' : `${Math.floor(v / 60000)}:${String(Math.round(v % 60000 / 1000)).padStart(2, '0')}`
export const date = (v: string) => new Date(v).toLocaleString('ko-KR', { hour12: false })
export const shortDate = (v: string) => new Date(v).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
export const sum = (rows: { recognized: number; timedOut: number; cancelled: number }[], key: 'recognized' | 'timedOut' | 'cancelled') => rows.reduce((n, r) => n + r[key], 0)
export const percent = (a: number, b: number) => b ? `${(100 * a / b).toFixed(1)}%` : '—'

/** 이 비율 이상 잡힌 자리만 플레이어로 센다(서버 cameraDigest.players와 같은 기준) */
export const PLAYER_PRESENT = 0.2
/** 초당 인식 장면이 이보다 적으면 느림(2026-11-23 배터리 모드 7~8장, 충전 중 12~17장). 노 젓기는 5장 안팎까지 판정한다 */
export const SLOW_FPS = 10, VERY_SLOW_FPS = 6
export function cameraSpeed(fps: number | null | undefined) {
  if (fps == null) return { cls: '', label: '측정 없음' }
  if (fps >= SLOW_FPS) return { cls: 'ok', label: '충분' }
  if (fps >= VERY_SLOW_FPS) return { cls: 'slow', label: '느림 · 충전기 확인' }
  return { cls: 'bad', label: '매우 느림 · 노 젓기 끊길 수 있음' }
}

export function teamLabel(game: Game, id: number) {
  const name = game.teamNames?.find(t => t.teamId === id)?.teamName
  return name ? `${name} (${id}팀)` : `${id}팀 · 이름 미수집`
}

// 경기 화면 주소(경기 목록 · 내 PC 로그 열기의 최근 경기 · 링크 공유)
export const gamePath = (g: { userId: string; eventId: string }) => `/dev-dashboard/games/${encodeURIComponent(g.userId)}/${encodeURIComponent(g.eventId)}`
