// node --test tests/ — 개발자 센터 경기 목록 · 경기 화면의 계산(인식 속도 구분 · 팀 이름 · 주소)
import test from 'node:test'
import assert from 'node:assert/strict'
import * as D from '../src/lib/developerGame.ts'

test('인식 속도: 10장 이상 충분, 6~10장 느림(충전기), 6장 미만 매우 느림, 값 없으면 측정 없음', () => {
  assert.equal(D.cameraSpeed(12.1).cls, 'ok')
  assert.equal(D.cameraSpeed(10).cls, 'ok')
  assert.equal(D.cameraSpeed(7.2).cls, 'slow') // 2026-11-23 배터리 모드
  assert.match(D.cameraSpeed(7.2).label, /충전기/)
  assert.equal(D.cameraSpeed(4.5).cls, 'bad')
  assert.equal(D.cameraSpeed(null).label, '측정 없음')
})

test('팀 이름이 없으면 미수집으로, 성공률은 시간 초과까지만 나눔', () => {
  const game = { teamNames: [{ teamId: 1, teamName: '노젓기' }, { teamId: 2, teamName: null }] }
  assert.equal(D.teamLabel(game, 1), '노젓기 (1팀)')
  assert.equal(D.teamLabel(game, 2), '2팀 · 이름 미수집')
  assert.equal(D.percent(7, 10), '70.0%')
  assert.equal(D.percent(0, 0), '—')
  assert.equal(D.sum([{ recognized: 2, timedOut: 1, cancelled: 3 }, { recognized: 1, timedOut: 0, cancelled: 1 }], 'cancelled'), 4)
})

test('경기 화면 주소는 계정 · 경기 ID를 그대로 담는다', () => {
  assert.equal(D.gamePath({ userId: 'u-1', eventId: 'e 2' }), '/dev-dashboard/games/u-1/e%202')
})
