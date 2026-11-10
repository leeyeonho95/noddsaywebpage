export type CameraCounts = { games: number; asked: number; recognized: number; timedOut: number; cancelled: number; trackingLostTimeouts: number; successRate: number | null }
export type CameraMotion = CameraCounts & { motion: string; target: string; medianMs: number | null; p90Ms: number | null; latencySamples: number; byVersion: (CameraCounts & { clientVersion: string })[] }
export type CameraHealth = { clientVersion: string; games: number; minutes: number; cameraFps: number | null; inferMs: number | null; gameFps: number | null; cameraDownSecPerGame: number | null }
export type CameraSeat = { slot: number; games: number; minutes: number; presentRatio: number | null; presentMinutes: number; lostPerMin: number | null; forwardShare: number | null; backwardShare: number | null; noneShare: number | null; flipsPerMin: number | null; sustainedBackwardPerMin: number | null }
export type CameraMetrics = { games: number; motions: CameraMotion[]; byVersion: CameraHealth[]; seats: CameraSeat[]; listeningWindows: CameraCounts }
export type CameraRequest = { motion: string; target: string; targetId: number; asked: number; recognized: number; timedOut: number; cancelled: number; trackingLostTimeouts: number; medianMs: number | null; p90Ms: number | null }
export type CameraSummary = {
  durationMs: number; clientVersion: string;
  camera: { fps: number; cameraDownMs: number }; perf: { inferMsAvg: number; gameFpsAvg: number };
  seats: { slot: number; presentRatio: number | null; lostCount: number; rowSeconds: { forward: number; backward: number; none: number }; forwardToBackwardFlips: number; sustainedBackwardCount: number }[];
  requests: CameraRequest[];
}
const motions: Record<string, string> = { escapex: '탈출 X', crocclap: '악어박수', dodgeleft: '왼쪽 피하기', dodgeright: '오른쪽 피하기', bow: '숙이기', circleo: 'O', eagle: '독수리', peek: '눈 가리기', hula: '울라울라', surprise: '상상도 못한 정체', patmat: '패트와매트', fusion: '퓨전', tada: '짜란' }
export const motionName = (value: string) => value.split('|').map(v => motions[v.toLowerCase()] ?? v).join(' / ') + (value.includes('|') ? ' (퀴즈)' : '')
export const isListeningWindow = (r: { motion: string; target: string }) => r.motion.toLowerCase() === 'eagle' && r.target === 'team'
