// 경기 상세 '인식 문제 장면 보기' 버튼 상태. 백엔드 S15P31A206-296부터 상세에 cameraLogAvailable(원본을 받을 수 있는지,
// DB 기준 힌트) · rawExpiresAt(원본 보관 기한)이 온다. 두 필드가 없는 이전 서버는 카메라 요약만 보고 버튼을 보인다.
export type CameraLogState = 'none' | 'available' | 'unknown' | 'expired' | 'summaryOnly'

export type CameraLogFields = { cameraCollected?: boolean; cameraLogAvailable?: boolean | null; rawExpiresAt?: string | null }

export function cameraLogState(game: CameraLogFields, now: number): CameraLogState {
  if (!game.cameraCollected) return 'none'
  if (game.cameraLogAvailable === true) return 'available'
  if (game.cameraLogAvailable == null) return 'unknown'
  // false: 보관 기한이 지났거나, 기한 안인데 원본 없이 요약만 올라온 경기
  const end = game.rawExpiresAt ? Date.parse(game.rawExpiresAt) : Number.NaN
  return Number.isFinite(end) && end <= now ? 'expired' : 'summaryOnly'
}

// 원본 로그 받기 실패 안내(백엔드 계약: 404 요약 · 파일 없음, 410 원본 없음 · 보관 기간 지남, 503 저장소 읽기 실패)
export function cameraLogStatusMessage(status: number): string | null {
  if (status === 404) return '서버에 이 경기의 원본 로그가 없습니다(카메라 요약이나 파일이 없음). 서버가 원본 로그 API 이전 버전이어도 이렇게 나옵니다. 로그 파일을 직접 열어 주세요.'
  if (status === 410) return '이 경기는 원본 로그가 올라오지 않았거나 보관 기간(90일)이 지나 삭제되었습니다. 로그 파일이 있으면 직접 열어 주세요.'
  if (status === 503) return '서버 저장소에서 원본 로그를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.'
  return null
}
