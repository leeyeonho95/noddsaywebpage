import { base, developerGet, errorMessage } from './developer'
import { ApiError } from './webAuth'
import { cameraLogStatusMessage } from '../lib/cameraLogStatus'

// 경기 카메라 로그 원본(gzip 그대로, Content-Encoding 없음) — 백엔드 개발자 전용 API(S15P31A206-296).
export const cameraLogPath = (userId: string, eventId: string) => `${base}/${encodeURIComponent(userId)}/${encodeURIComponent(eventId)}/camera-log`

export async function fetchCameraLog(userId: string, eventId: string, signal?: AbortSignal): Promise<Blob> {
  return (await developerGet(cameraLogPath(userId, eventId), signal)).blob()
}

export function cameraLogError(error: unknown) {
  if (error instanceof ApiError) {
    const message = cameraLogStatusMessage(error.status)
    if (message) return message
    if (error.status === 401 || error.status === 403 || error.status === 429) return errorMessage(error)
  }
  return '서버에서 원본 로그를 받지 못했습니다. 잠시 후 다시 시도하거나 로그 파일을 직접 열어 주세요.'
}
