import { base, developerGet, errorMessage } from './developer'
import { ApiError } from './webAuth'

// 경기 카메라 로그 원본(gzip) — 백엔드 개발자 전용 API(요청 중, S15P31A206-297 범위 밖). 없으면 404, 보관 기간(90일)이 지나 지웠으면 410.
export const cameraLogPath = (userId: string, eventId: string) => `${base}/${encodeURIComponent(userId)}/${encodeURIComponent(eventId)}/camera-log`

export async function fetchCameraLog(userId: string, eventId: string, signal?: AbortSignal): Promise<Blob> {
  return (await developerGet(cameraLogPath(userId, eventId), signal)).blob()
}

export function cameraLogError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return '서버에서 이 경기의 원본 로그를 찾지 못했습니다. 원본 로그 API가 아직 배포되지 않았거나 원본이 없는 경기입니다. 로그 파일을 직접 열어 주세요.'
    if (error.status === 410) return '보관 기간(90일)이 지나 원본 로그가 삭제되었습니다.'
  }
  return errorMessage(error)
}
