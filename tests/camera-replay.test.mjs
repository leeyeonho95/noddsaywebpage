// node --test tests/ — 카메라 로그 재생(인식 문제 장면) 고르기 규칙. 합성 로그로 확인한다(S15P31A206-297).
import test from 'node:test'
import assert from 'node:assert/strict'
import * as R from '../src/lib/cameraReplay.ts'

const C = { ...R, parse: R.parseCameraLog }

// 관절 15개(x, y, 보임)를 J 줄 숫자로. pose: { nose:[x,y], lsh:[x,y], ... } 없는 점은 어깨 가운데
function jLine(t, slot, pose) {
  const keys = ['nose', 'leye', 'reye', 'lsh', 'rsh', 'lel', 'rel', 'lwr', 'rwr', 'lin', 'rin', 'lhip', 'rhip', 'lknee', 'rknee'];
  const nums = [];
  for (const k of keys) {
    const [x, y] = pose[k] || pose.lsh;
    nums.push(Math.round(x * 10000), Math.round(y * 10000), 1000);
  }
  for (let i = 0; i < 30; i++) nums.push(0);
  return `${t.toFixed(3)},J,${slot},${nums.join(',')}`;
}
// 서 있는 사람(화면 x 가운데 cx). arms: 'down' | 'eagle' | 'x'
function stand(cx, arms = 'down') {
  const p = {
    nose: [cx, 0.40], leye: [cx + 0.01, 0.39], reye: [cx - 0.01, 0.39],
    lsh: [cx + 0.035, 0.47], rsh: [cx - 0.035, 0.47], lhip: [cx + 0.025, 0.66], rhip: [cx - 0.025, 0.66], lknee: [cx + 0.025, 0.80], rknee: [cx - 0.025, 0.80],
  };
  if (arms === 'down') Object.assign(p, { lel: [cx + 0.045, 0.56], rel: [cx - 0.045, 0.56], lwr: [cx + 0.045, 0.65], rwr: [cx - 0.045, 0.65] });
  if (arms === 'eagle') Object.assign(p, { lel: [cx + 0.08, 0.47], rel: [cx - 0.08, 0.47], lwr: [cx + 0.12, 0.46], rwr: [cx - 0.12, 0.46] });
  if (arms === 'x') Object.assign(p, { lel: [cx + 0.04, 0.50], rel: [cx - 0.04, 0.50], lwr: [cx - 0.02, 0.44], rwr: [cx + 0.02, 0.44] });
  p.lin = p.lwr; p.rin = p.rwr;
  return p;
}
const collapsed = cx => ({ nose: [cx, 0.85], lsh: [cx + 0.005, 0.85], rsh: [cx - 0.005, 0.85], lhip: [cx, 0.88], rhip: [cx, 0.88], lknee: [cx, 0.89], rknee: [cx, 0.89], lwr: [cx, 0.9], rwr: [cx, 0.9], lel: [cx, 0.88], rel: [cx, 0.88] });

// 10fps로 장면을 만든다. seat(t, slot) → { pose, verdict, tracking, row, moves }
function makeLog(seconds, seat, extra = []) {
  const out = ['#meta {"schema":1,"eventId":"00000000-0000-4000-8000-000000000000"}', 't,kind,slot,present,verdict,tracking,row,bowHit,nose,torso,scale,upright,moves,pFwd,pBack,pNone,sdy,sdz,smile', '0.000,RACE,begin,x,upload'];
  for (let i = 0; i < seconds * 10; i++) {
    const t = i / 10;
    out.push(`${t.toFixed(3)},P,0.56,30`);
    const fs = [];
    for (const slot of [1, 2, 3, 4]) {
      const s = seat(t, slot);
      out.push(jLine(t, slot, s.pose));
      fs.push(`${(t + 0.01).toFixed(3)},F,${slot},1,${s.verdict || 'Player'},${s.tracking || 'Tracked'},${s.row || 'None'},0,-0.5,1.5,0.2,1,${(s.moves || []).join('|') || '-'},0.1,0.1,0.8,0,0,`);
    }
    out.push(...fs);
  }
  out.push(...extra, `${seconds.toFixed(3)},RACE,end,completed`);
  return out.sort((a, b) => (a.startsWith('#') || a.startsWith('t,') ? -1 : b.startsWith('#') || b.startsWith('t,') ? 1 : parseFloat(a) - parseFloat(b))).join('\n');
}
const xs = { 1: 0.85, 2: 0.62, 3: 0.38, 4: 0.15 };

test('요청 결과: 성공 · 시간 초과 · 취소(창 끝 0.25초 안이면 시간 초과)', () => {
  const log = C.parse(makeLog(10, (t, s) => ({ pose: stand(xs[s]) }), [
    '1.000,REQ,1,1,A,Bow,4000', '2.000,GES,1,1,Bow', '2.000,CANCEL,1,1000',
    '1.000,REQ,2,2,A,Bow,4000', '4.800,CANCEL,2,3800',
    '1.000,REQ,3,3,B,Bow,4000', '2.000,CANCEL,3,1000',
  ]));
  const r = C.requestOutcomes(log);
  assert.deepEqual(r.map(x => x.outcome), ['recognized', 'timedOut', 'cancelled']);
  const { issues } = C.findIssues(log);
  assert.deepEqual(issues.filter(x => x.kind === 'request').map(x => x.title), ['2P 숙이기 요청 실패']);
});

test('독수리 혼자 끝남: 짝이 판정에서 빠져 있었으면 그 까닭을 적는다', () => {
  const log = C.parse(makeLog(8, (t, s) => {
    if (s === 3 && t >= 2 && t < 4) return { pose: stand(xs[3], 'eagle'), moves: ['Eagle'] };
    if (s === 4 && t >= 1 && t < 5) return { pose: collapsed(xs[4]), verdict: 'Background', tracking: 'Lost' };
    return { pose: stand(xs[s]) };
  }));
  const alone = C.findIssues(log).issues.filter(x => x.kind === 'alone');
  assert.equal(alone.length, 1);
  assert.match(alone[0].title, /3P 독수리 혼자 끝남/);
  assert.match(alone[0].detail, /짝 4P가 판정에서 빠져/);
  assert.match(alone[0].detail, /아이템 보유: 로그에 없음/);
});

test('팀 동작이 나갔으면 혼자 끝남이 아니다', () => {
  const log = C.parse(makeLog(8, (t, s) => (s >= 3 && t >= 2 && t < 4 ? { pose: stand(xs[s], 'eagle'), moves: ['Eagle'] } : { pose: stand(xs[s]) }), ['3.000,TEAM,2,Eagle']));
  assert.equal(C.findIssues(log).issues.filter(x => x.kind === 'alone').length, 0);
});

test('인식 안 된 동작 의심: 팔을 든 채 동작이 안 켜지면 모양으로 나눈다', () => {
  const log = C.parse(makeLog(10, (t, s) => {
    if (s === 4 && t >= 2 && t < 4) return { pose: stand(xs[4], 'x'), row: 'Forward' }; // 젓기 판정이 깜빡여도 뽑는다
    if (s === 1 && t >= 5 && t < 6.5) return { pose: stand(xs[1], 'eagle') };
    return { pose: stand(xs[s]) };
  }));
  const missed = C.findIssues(log).issues.filter(x => x.kind === 'missed');
  assert.deepEqual(missed.map(x => [x.seats[0], x.like]), [[4, 'EscapeX'], [1, 'Eagle']]);
  assert.match(missed[0].detail, /노 젓기 판정이 \d+장면 켜짐/);
});

test('아이템 줄이 있으면 아이템 없는 팀의 독수리 비슷은 뺀다', () => {
  const pose = (t, s) => (s === 1 && t >= 5 && t < 6.5 ? { pose: stand(xs[1], 'eagle') } : { pose: stand(xs[s]) });
  const start = ['0.000,ITEM,1,start,-,-', '0.000,ITEM,2,start,-,-'];
  const none = C.parse(makeLog(10, pose, [...start, '0.500,ITEM,2,got,Wings,Wings']));
  assert.equal(C.findIssues(none).issues.filter(x => x.kind === 'missed').length, 0);
  const has = C.parse(makeLog(10, pose, [...start, '0.300,ITEM,1,roll,-,-', '0.500,ITEM,1,got,Wings,Wings']));
  const m = C.findIssues(has).issues.filter(x => x.kind === 'missed');
  assert.equal(m.length, 1);
  assert.match(m[0].detail, /아이템 보유: 날개/);
  // 써 버린 뒤에는 다시 없음
  const used = C.parse(makeLog(10, pose, [...start, '0.500,ITEM,1,got,Wings,Wings', '4.000,ITEM,1,used,Wings,-']));
  assert.equal(C.findIssues(used).issues.filter(x => x.kind === 'missed').length, 0);
  assert.deepEqual(C.teamItemState(has, 1, 0.4), { held: [], rolling: true });
});

test('숙이기 보호가 시간 끝으로 풀리면 해제 검사에서 걸린 까닭과 함께 문제 장면', () => {
  const log = C.parse(makeLog(12, (t, s) => (s === 4 && t >= 2 && t < 8.5 ? { pose: collapsed(xs[4]) } : { pose: stand(xs[s]) }), [
    '1.800,REQ,1,4,B,Bow,6000', '2.100,GES,1,4,Bow', '2.100,CANCEL,1,300',
    '2.000,PROT,4,start,turn', '8.000,PROT,4,timeout,6000,9,owner=6|color=3',
    '3.000,PROT,1,start,turn', '3.900,PROT,1,release,900,2,unstable=1',
  ]));
  const { issues } = C.findIssues(log);
  const prot = issues.filter(x => x.kind === 'protect');
  assert.equal(prot.length, 1, '정상 해제된 1P 보호는 문제 장면이 아니다');
  assert.match(prot[0].title, /4P 숙이기 보호 안 풀림 · 6초 시간 끝/);
  assert.match(prot[0].detail, /해제 검사 9번 중 못 넘긴 까닭: 주인 아님 6 · 옷 색 어긋남 3/);
  assert.match(prot[0].detail, /뼈대 뭉침/);
  assert.equal(issues.filter(x => x.kind === 'collapse').length, 0, '보호와 겹친 뭉침은 보호 장면으로 합친다');
  assert.ok(C.protectingAt(log, 4, 5) && !C.protectingAt(log, 4, 9));
});

test('두 사람 동작 요청 실패에는 PNEAR 줄로 누가 자기 몫을 못 했는지 적는다', () => {
  const log = C.parse(makeLog(8, (t, s) => ({ pose: stand(xs[s]) }), [
    '1.000,REQ,7,0,B,Fusion,4000', '5.000,CANCEL,7,4000', '5.000,PNEAR,7,Fusion,0.00,3,0.05,4,0.92',
  ]));
  const req = C.findIssues(log).issues.find(x => x.kind === 'request');
  assert.match(req.title, /2팀 퓨전 요청 실패/);
  assert.match(req.detail, /자기 몫 3P 5% · 4P 92% → 3P가 자기 몫을 거의 못 함/);
});

test('뼈대 뭉침과 판정 제외가 길면 문제 장면', () => {
  const log = C.parse(makeLog(10, (t, s) => (s === 4 && t >= 2 && t < 6 ? { pose: collapsed(xs[4]), verdict: 'Background' } : { pose: stand(xs[s]) }), ['1.800,REQ,1,4,B,Bow,6000', '2.100,GES,1,4,Bow', '2.100,CANCEL,1,300']));
  const kinds = C.findIssues(log).issues.map(x => x.kind).sort();
  assert.deepEqual(kinds, ['collapse', 'excluded']);
  const col = C.findIssues(log).issues.find(x => x.kind === 'collapse');
  assert.match(col.detail, /숙이기 요청 직후/);
});

test('모든 요청 · 팀 동작: 문제 장면이 아닌 것도 시간순으로 골라 볼 수 있다', () => {
  const log = C.parse(makeLog(10, (t, s) => ({ pose: stand(xs[s]) }), [
    '1.000,REQ,1,1,A,Bow,4000', '2.000,GES,1,1,Bow', '2.000,CANCEL,1,1000',
    '3.000,TEAM,2,Eagle',
    '4.000,REQ,2,2,A,Bow,4000', '8.000,CANCEL,2,4000',
  ]));
  const events = C.timelineEvents(log, C.requestOutcomes(log));
  assert.deepEqual(events.map(x => `${x.t} ${x.who} ${x.title}`), ['1 1P 숙이기 요청 · 성공', '3 2팀 독수리 나감', '4 2P 숙이기 요청 · 시간 초과']);
});

test('시간 막대 눈금: 글자가 겹치지 않게 경기 길이에 맞춰 간격을 넓힌다', () => {
  assert.equal(C.tickStep(80, 1200), 10);
  assert.equal(C.tickStep(204, 1200), 15);
  assert.equal(C.tickStep(600, 1200), 60);
  assert.equal(C.tickStep(10, 1200), 1);
});
