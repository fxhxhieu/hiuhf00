/* Chạy: node --test */
const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../js/srs.js');

const DAY = 86400000;
const MIN = 60000;
const T0 = new Date(2026, 0, 1, 9, 0).getTime();

/** Đưa một từ mới qua lật thẻ, Nghe & chọn, Nghe & viết → thẻ ôn với khoảng cách 1 ngày. */
function graduated(t = T0) {
  let c = SRS.introduce(t);
  c = SRS.schedule(c, 2, t + 2 * MIN);
  return SRS.schedule(c, 2, t + 13 * MIN);
}
/** Ôn đúng hạn n lần liên tiếp bằng cách gõ. */
function reviewed(c, n) {
  for (let i = 0; i < n; i++) c = SRS.schedule(c, 2, c.due);
  return c;
}

test('từ mới đi qua thang cấp 1 → 2, rồi chờ ôn lại ở cấp 2', () => {
  let c = SRS.introduce(T0);
  assert.equal(SRS.level(c), 1);
  c = SRS.schedule(c, 2, T0 + 2 * MIN);
  assert.equal(SRS.level(c), 2);
  c = SRS.schedule(c, 2, T0 + 13 * MIN);
  assert.equal(c.state, 'review');
  assert.equal(c.interval, 1);
  assert.equal(SRS.level(c), 2, 'chưa được ôn sau 1 ngày nên chưa thể là "Nhớ được"');
});

test('chỉ ôn đúng sau ít nhất 1 ngày mới lên cấp 3, rồi 4, rồi 5', () => {
  let c = graduated();
  const levels = [];
  for (let i = 0; i < 5; i++) { c = SRS.schedule(c, 2, c.due); levels.push(SRS.level(c)); }
  assert.deepEqual(levels, [3, 4, 4, 5, 5]);
  assert.equal(c.interval, 125);
});

test('thuộc lòng cần ôn đúng liên tiếp 2 lần, không chỉ khoảng cách dài', () => {
  const c = Object.assign(graduated(), { interval: 30, ok: 1 });
  assert.equal(SRS.level(c), 4);
  assert.equal(SRS.level(Object.assign({}, c, { ok: 2 })), 5);
});

test('quên một từ cấp cao: khoảng cách giảm mạnh và không về cấp 5 ngay trong phiên', () => {
  let c = reviewed(graduated(), 6);
  assert.equal(c.interval, 313);
  let t = c.due;
  c = SRS.schedule(c, 0, t);
  assert.equal(SRS.level(c), 1);
  assert.equal(c.interval, 14);
  assert.equal(c.lapses, 1);
  c = SRS.schedule(c, 2, t + 2 * MIN);
  c = SRS.schedule(c, 2, t + 13 * MIN);
  assert.equal(c.state, 'review');
  assert.equal(c.interval, 14);
  assert.equal(SRS.level(c), 2, 'phải ôn lại thành công thì mới lên cấp lại');
});

test('khoảng cách nhỏ sau khi quên vẫn tối thiểu 1 ngày', () => {
  let c = graduated();
  c = SRS.schedule(c, 0, c.due);
  assert.equal(c.interval, 1);
});

test('ôn sớm và trả lời đúng: không đổi lịch, không tăng cấp', () => {
  let c = reviewed(graduated(), 2); // khoảng cách 8 ngày
  const before = Object.assign({}, c);
  const early = SRS.schedule(c, 2, c.due - 5 * DAY);
  assert.equal(early.interval, before.interval);
  assert.equal(early.due, before.due);
  assert.equal(early.last, before.last, 'mốc lần ôn trước giữ nguyên để lần sau không bị tính là sớm');
  assert.equal(early.ok, before.ok);
  // đến đúng hạn vẫn được tính là đúng hạn
  const onTime = SRS.schedule(early, 2, before.due);
  assert.equal(onTime.interval, Math.round(before.interval * before.ease));
});

test('ôn sớm nhưng quên thì vẫn bị tính là quên', () => {
  const c = reviewed(graduated(), 3);
  const lapsed = SRS.schedule(c, 0, c.due - 10 * DAY);
  assert.equal(lapsed.state, 'learn');
  assert.equal(lapsed.lapses, 1);
});

test('ôn trễ được cộng một nửa số ngày trễ', () => {
  const c = reviewed(graduated(), 3); // khoảng cách 20 ngày
  const onTime = SRS.schedule(c, 2, c.due);
  const late = SRS.schedule(c, 2, c.due + 20 * DAY);
  assert.equal(onTime.interval, 50);
  assert.equal(late.interval, Math.round((20 + 10) * c.ease));
});

test('đúng nhờ nhận ra (trắc nghiệm) tăng chậm hơn và không đổi ease', () => {
  const c = reviewed(graduated(), 2);
  const typed = SRS.schedule(c, 2, c.due);
  const recog = SRS.schedule(c, 2, c.due, { recog: true });
  assert.ok(recog.interval < typed.interval);
  assert.equal(recog.interval, Math.round(c.interval * SRS.CFG.recogFactor));
  assert.equal(recog.ease, c.ease);
});

test('ease hồi phục dần khi gõ đúng, nhưng không vượt mức ban đầu', () => {
  let c = reviewed(graduated(), 2);
  c = SRS.schedule(c, 0, c.due);            // ease 2.3
  c = SRS.schedule(SRS.schedule(c, 2, c.due), 2, c.due + 11 * MIN);
  const low = c.ease;
  assert.ok(low < SRS.CFG.startEase);
  for (let i = 0; i < 10; i++) c = SRS.schedule(c, 2, c.due);
  assert.ok(c.ease > low);
  assert.ok(c.ease <= SRS.CFG.startEase + 1e-9);
});

test('khoảng cách không vượt quá mức tối đa', () => {
  const c = reviewed(graduated(), 12);
  assert.equal(c.interval, SRS.CFG.maxInterval);
});

test('"Đã nhớ rõ từ" lên cấp 5, và vẫn giữ cấp 5 sau lần ôn đúng đầu tiên', () => {
  let c = SRS.master(SRS.introduce(T0), T0);
  assert.equal(SRS.level(c), 5);
  assert.ok(c.interval >= 30);
  c = SRS.schedule(c, 2, c.due);
  assert.equal(SRS.level(c), 5);
});

test('sai ở bài Nghe/Nói kéo lịch ôn lại gần, mỗi từ chỉ bị trừ một lần mỗi ngày', () => {
  const c = reviewed(graduated(), 4); // 50 ngày, cấp 5
  assert.equal(SRS.level(c), 5);
  const now = c.last + 3 * DAY;
  const p = SRS.penalize(c, now);
  assert.equal(p.interval, 30);
  assert.ok(p.due <= SRS.addDays(now, 1));
  assert.equal(SRS.level(p), 4);
  const again = SRS.penalize(p, now + 60 * MIN);
  assert.equal(again.interval, p.interval, 'cùng ngày không trừ lần hai');
  assert.equal(SRS.penalize(null, now), null);
});

test('sai ở bài Nghe/Nói không đụng tới thẻ đang học', () => {
  const c = SRS.introduce(T0);
  assert.equal(SRS.penalize(c, T0 + MIN), c);
});

test('thẻ lưu từ bản cũ (chưa có trường ok) không bị tụt cấp', () => {
  const legacy = { state: 'review', step: 0, interval: 40, ease: 2.5, reps: 6, lapses: 0, due: T0 + 40 * DAY, last: T0, known: false };
  assert.equal(SRS.level(legacy), 5);
  const early = SRS.schedule(legacy, 2, T0 + 5 * DAY);
  assert.equal(SRS.level(early), 5, 'ôn sớm không làm mất cấp');
  const mid = Object.assign({}, legacy, { interval: 10 });
  assert.equal(SRS.level(mid), 4);
});

test('nhãn "sau bao lâu" của thẻ ôn sớm là số ngày còn lại, không phải khoảng cách', () => {
  const c = reviewed(graduated(), 2);
  const now = c.due - 5 * DAY;
  const early = SRS.schedule(c, 2, now);
  assert.equal(SRS.label(early, now), '5 ngày');
});

/* ===== Chọn dạng bài: nghe-gõ chỉ chép chính tả, không được thay cho bài kiểm tra nghĩa ===== */

test('thẻ mới là lật thẻ; thẻ đang học đi Nghe & chọn rồi Nghe & viết', () => {
  assert.equal(SRS.pickKind(null), 'intro');
  let c = SRS.introduce(T0);
  assert.equal(SRS.pickKind(c), 'lchoose');
  c = SRS.schedule(c, 2, T0 + 2 * MIN, { kind: 'lchoose', recog: true });
  assert.equal(c.state, 'learn');
  assert.equal(SRS.pickKind(c), 'ltype');
});

test('nghe-gõ không bao giờ đứng hai lượt ôn liền nhau, nhưng vẫn có thể xuất hiện sau bài có nghĩa', () => {
  const rolls = [0, 0.2, 0.34, 0.5, 0.67, 0.8, 0.99];
  [reviewed(graduated(), 1), reviewed(graduated(), 3)].forEach((c) => { // cấp ≤ 3 và cấp ≥ 4
    assert.equal(c.state, 'review');
    rolls.forEach((r) => assert.notEqual(SRS.pickKind(Object.assign({}, c, { lk: 'ltype' }), () => r), 'ltype', 'cấp ' + SRS.level(c)));
    assert.ok(rolls.some((r) => SRS.pickKind(Object.assign({}, c, { lk: 'type' }), () => r) === 'ltype'), 'sau bài gõ từ vẫn có thể nghe-gõ, cấp ' + SRS.level(c));
  });
});

test('mô phỏng 400 lượt có quên: không có hai bài nghe-gõ liền nhau, kể cả khi học lại sau khi quên', () => {
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let c = SRS.introduce(T0), t = T0, prev = null, lapses = 0, listenReviews = 0, meaningReviews = 0;
  for (let i = 0; i < 400; i++) {
    const kind = SRS.pickKind(c, rand);
    assert.ok(!(prev === 'ltype' && kind === 'ltype'), 'hai lượt nghe-gõ liền nhau ở bước ' + i);
    if (c.state === 'review') { if (kind === 'ltype') listenReviews++; else meaningReviews++; }
    prev = kind;
    const good = rand() > 0.15;
    if (!good) lapses++;
    t = c.state === 'learn' ? t + 11 * MIN : Math.max(t, c.due);
    c = SRS.schedule(c, good ? 2 : 0, t, { kind, recog: kind === 'choice' || kind === 'lchoose' });
  }
  assert.ok(lapses > 10 && listenReviews > 10 && meaningReviews > listenReviews, [lapses, listenReviews, meaningReviews].join('/'));
});

test('máy không đọc được tiếng thì bài nghe được thay bằng bài đọc', () => {
  const step0 = SRS.introduce(T0);
  assert.equal(SRS.pickKind(step0, Math.random, false), 'choice');
  const step1 = SRS.schedule(step0, 2, T0 + 2 * MIN);
  assert.equal(SRS.pickKind(step1, Math.random, false), 'type');
  [0, 0.5, 0.99].forEach((r) => assert.notEqual(SRS.pickKind(reviewed(graduated(), 1), () => r, false), 'ltype'));
});

test('"Đã nhớ rõ" cần bài kiểm nghĩa: lật thẻ và nghe-gõ chưa đủ, các bài còn lại thì đủ', () => {
  ['intro', 'ltype'].forEach((k) => assert.ok(SRS.needsMeaningCheck(k), k));
  ['lchoose', 'choice', 'type'].forEach((k) => assert.ok(!SRS.needsMeaningCheck(k), k));
});

test('schedule và master ghi lại dạng bài vừa làm (lk), kể cả khi ôn sớm; không truyền kind thì giữ nguyên', () => {
  const c = reviewed(graduated(), 2);
  assert.equal(SRS.schedule(c, 2, c.due, { kind: 'type' }).lk, 'type');
  assert.equal(SRS.schedule(c, 2, c.due - 5 * DAY, { kind: 'ltype' }).lk, 'ltype', 'ôn sớm vẫn ghi');
  assert.equal(SRS.schedule(c, 0, c.due, { kind: 'choice' }).lk, 'choice', 'quên vẫn ghi');
  assert.equal(SRS.master(c, c.due, { kind: 'type' }).lk, 'type');
  assert.equal(SRS.schedule(Object.assign({}, c, { lk: 'type' }), 2, c.due).lk, 'type');
});

/* ===== Thứ tự ôn: thẻ sắp quên nhất trước ===== */

test('mức sắp quên tính theo số lần khoảng cách bị vượt quá, không theo số ngày quá hạn', () => {
  const now = T0 + 100 * DAY;
  const short = { state: 'review', interval: 1, due: now - 3 * DAY };
  const long = { state: 'review', interval: 60, due: now - 10 * DAY };
  assert.equal(SRS.urgency(short, now), 3);
  assert.ok(Math.abs(SRS.urgency(long, now) - 10 / 60) < 1e-9);
  assert.ok(SRS.urgency(short, now) > SRS.urgency(long, now), 'khoảng cách 1 ngày quá hạn 3 ngày gấp hơn khoảng cách 60 ngày quá hạn 10 ngày');
  const order = [long, short].sort((a, b) => SRS.urgency(b, now) - SRS.urgency(a, now));
  assert.equal(order[0], short);
});

test('mức sắp quên bằng 0 với thẻ chưa quá hạn, thẻ đang học và thẻ không tồn tại', () => {
  const now = T0 + 100 * DAY;
  assert.equal(SRS.urgency({ state: 'review', interval: 5, due: now + DAY }, now), 0);
  assert.equal(SRS.urgency({ state: 'learn', step: 0, interval: 0, due: now - DAY }, now), 0);
  assert.equal(SRS.urgency(null, now), 0);
});
