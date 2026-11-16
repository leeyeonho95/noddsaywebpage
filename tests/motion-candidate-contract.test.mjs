import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCandidatePage } from '../src/api/motionCandidateContract.ts'

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/motion-candidate-web-page.json', import.meta.url), 'utf8'))

test('OpenAPI response maps to the existing review screen without losing identity or units', () => {
  const page = parseCandidatePage(fixture())
  const c = page.items[0]
  assert.equal(c.id, '28800000-0000-4000-8000-000000000001')
  assert.equal(c.candidateKey, 'CrocDx=0.6')
  assert.equal(c.revision, 1)
  assert.equal(c.status, 'pending')
  assert.equal(c.metrics[0].unit, '%')
  assert.equal(c.metrics[0].beforeText, '50% (25/50)')
  assert.equal(c.rules.length, 5)
  assert.match(c.missedRequests[0].description, /요청 41 · 자리 2/)
})

test('MR reservation, rejection reasons, missing rules, and page counts survive conversion', () => {
  const input = fixture()
  input.total = 21
  input.items[0].status = 'mr_pending'
  input.items[0].reason = '검증 부족'
  input.items[0].review.rules[0].passed = null
  const page = parseCandidatePage(input)
  assert.equal(page.total, 21)
  assert.equal(page.items[0].status, 'mr_pending')
  assert.equal(page.items[0].rejectionReason, '검증 부족')
  assert.equal(page.items[0].rules[0].passed, null)
  assert.equal(page.items[0].mrUrl, null)
})

test('old backend responses and missing revisions fail closed instead of submitting an unsafe review', () => {
  for (const field of ['review', 'revision']) {
    const input = fixture()
    delete input.items[0][field]
    assert.throws(() => parseCandidatePage(input))
  }
  const input = fixture()
  input.items[0].status = 'PENDING'
  assert.throws(() => parseCandidatePage(input))
})
