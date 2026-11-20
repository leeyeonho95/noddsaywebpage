// 경기 상세 '인식 문제 장면 보기' 버튼 상태와 원본 로그 받기 실패 안내(백엔드 S15P31A206-296 계약).
import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraLogState, cameraLogStatusMessage } from '../src/lib/cameraLogStatus.ts'

const now = Date.parse('2026-11-19T03:00:00Z')

test('카메라 요약이 없으면 버튼 없음', () => {
  assert.equal(cameraLogState({ cameraCollected: false, cameraLogAvailable: false, rawExpiresAt: null }, now), 'none')
  assert.equal(cameraLogState({}, now), 'none')
})

test('원본을 받을 수 있으면 버튼', () => {
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: true, rawExpiresAt: '2027-02-16T05:00:00Z' }, now), 'available')
})

test('두 필드가 없는 이전 서버는 요약만 보고 버튼(받을 때 404 · 410 안내)', () => {
  assert.equal(cameraLogState({ cameraCollected: true }, now), 'unknown')
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: null }, now), 'unknown')
})

test('보관 기한이 지났으면 만료, 기한 안인데 받을 수 없으면 요약만', () => {
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: false, rawExpiresAt: '2026-11-01T00:00:00Z' }, now), 'expired')
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: false, rawExpiresAt: '2026-11-19T03:00:00Z' }, now), 'expired') // 기한과 같으면 만료(서버와 같음)
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: false, rawExpiresAt: '2027-02-16T05:00:00Z' }, now), 'summaryOnly')
  assert.equal(cameraLogState({ cameraCollected: true, cameraLogAvailable: false, rawExpiresAt: null }, now), 'summaryOnly')
})

test('받기 실패 안내: 404 · 410 · 503만 따로, 나머지는 공용 처리', () => {
  assert.match(cameraLogStatusMessage(404), /원본 로그가 없습니다/)
  assert.match(cameraLogStatusMessage(410), /올라오지 않았거나 보관 기간/)
  assert.match(cameraLogStatusMessage(503), /저장소/)
  assert.equal(cameraLogStatusMessage(401), null)
  assert.equal(cameraLogStatusMessage(500), null)
})
