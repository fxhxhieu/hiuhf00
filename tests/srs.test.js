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
