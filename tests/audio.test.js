/* Chạy: node --test
 * Kiểm tra js/audio.js bằng tín hiệu tổng hợp có đáp án biết trước (cao độ, âm tiết, hướng lên/xuống, chất lượng bản thu). */
const test = require('node:test');
const assert = require('node:assert/strict');
const Dsp = require('../js/audio.js');

const SR = 16000;
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 - 0.5; };
const silence = (sec) => new Float32Array(Math.round(sec * SR));
const hann = (t, d) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / d);

/** Thêm một "âm tiết" (có hài âm) vào mảng x: bắt đầu start giây, dài dur giây, cao độ trượt từ f1 tới f2. */
function addSyl(x, start, dur, amp, f1, f2 = f1) {
  let phase = 0;
  const a = Math.round(start * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const f = f1 + (f2 - f1) * (i / n);
    phase += (2 * Math.PI * f) / SR;
    const env = hann(i / SR, dur);
    x[a + i] += env * amp * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
  }
}
const withNoise = (x, amp) => { for (let i = 0; i < x.length; i++) x[i] += rnd() * 2 * amp; return x; };
const voiced = (f0) => f0.filter((v) => v > 0);
const med = (a) => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];

test('cao độ: giọng ổn định 150 Hz và 220 Hz được đo đúng trong 3%', () => {
  [150, 220].forEach((f) => {
    const x = silence(0.8);
    addSyl(x, 0.1, 0.6, 0.4, f);
    const p = Dsp.pitch(x, SR);
    const v = voiced(p.f0);
    assert.ok(v.length / p.f0.length > 0.4, 'quá ít khung có thanh: ' + v.length + '/' + p.f0.length);
    assert.ok(Math.abs(med(v) - f) / f < 0.03, f + ' Hz đo được ' + med(v));
  });
});

test('cao độ: bản thu 48 kHz cũng được đo đúng (hạ tần số lấy mẫu)', () => {
  const sr = 48000, n = Math.round(0.8 * sr), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = 0.4 * (Math.sin((2 * Math.PI * 180 * i) / sr) + 0.5 * Math.sin((2 * Math.PI * 360 * i) / sr));
  const v = voiced(Dsp.pitch(x, sr).f0);
  assert.ok(v.length > 40);
  assert.ok(Math.abs(med(v) - 180) / 180 < 0.03, 'đo được ' + med(v));
});

test('ngữ điệu: nhận ra giọng lên, xuống và đều ở cuối câu', () => {
  const mk = (f1, f2) => { const x = silence(0.9); addSyl(x, 0.1, 0.7, 0.4, f1, f2); return Dsp.intonation(Dsp.pitch(x, SR)); };
  const up = mk(120, 190), down = mk(190, 120), flat = mk(150, 150);
  assert.equal(up.dir, 'rise'); assert.ok(up.slope > 6, 'slope ' + up.slope);
  assert.equal(down.dir, 'fall'); assert.ok(down.slope < -6, 'slope ' + down.slope);
  assert.equal(flat.dir, 'flat');
  assert.ok(up.range > 4 && flat.range < 2, up.range + ' / ' + flat.range);
  assert.equal(Dsp.intonation({ f0: [0, 0, 150, 150], hop: 0.01 }), null, 'quá ít đoạn có thanh');
});

test('âm tiết: đếm đúng 3 âm tiết và chỉ ra âm tiết to nhất', () => {
  const x = silence(1.3);
  addSyl(x, 0.2, 0.18, 0.2, 140);
  addSyl(x, 0.5, 0.2, 0.55, 170);
  addSyl(x, 0.82, 0.18, 0.3, 130);
  withNoise(x, 0.002);
  const syl = Dsp.syllables(x, SR);
  assert.equal(syl.length, 3, 'tách được ' + syl.length);
  assert.ok(syl[0].t < syl[1].t && syl[1].t < syl[2].t);
  const pr = Dsp.prominence(syl, Dsp.pitch(x, SR));
  assert.equal(pr.idx, 1);
  assert.ok(pr.margin > 0.3, 'margin ' + pr.margin);
});

test('âm tiết: nhấn bằng độ dài và cao độ khi độ to bằng nhau, và hai âm tiết sát nhau vẫn tách được', () => {
  const x = silence(1.1);
  addSyl(x, 0.15, 0.14, 0.35, 120);
  addSyl(x, 0.42, 0.3, 0.35, 190);
  withNoise(x, 0.002);
  const syl = Dsp.syllables(x, SR);
  assert.equal(syl.length, 2);
  assert.equal(Dsp.prominence(syl, Dsp.pitch(x, SR)).idx, 1, 'âm tiết dài và cao hơn phải nổi nhất');
});

test('âm tiết: một âm tiết thì không có "nổi nhất"; im lặng thì không có âm tiết', () => {
  const x = silence(0.8);
  addSyl(x, 0.2, 0.3, 0.4, 150);
  const syl = Dsp.syllables(x, SR);
  assert.equal(syl.length, 1);
  assert.equal(Dsp.prominence(syl, null), null);
  assert.deepEqual(Dsp.syllables(silence(0.5), SR), []);
});

test('chất lượng bản thu: nhận ra im lặng, quá nhỏ, vỡ tiếng, ồn, quá ngắn và bản tốt', () => {
  const good = silence(1.2); addSyl(good, 0.3, 0.5, 0.35, 150); withNoise(good, 0.002);
  assert.deepEqual(Dsp.quality(good, SR).issues, []);
  assert.ok(Dsp.quality(good, SR).ok);
  assert.ok(Dsp.quality(silence(1), SR).issues.includes('silent'));
  const quiet = silence(1.2); addSyl(quiet, 0.3, 0.5, 0.02, 150); withNoise(quiet, 0.0002);
  assert.ok(Dsp.quality(quiet, SR).issues.includes('quiet'), JSON.stringify(Dsp.quality(quiet, SR)));
  const nearSilent = silence(1.2); addSyl(nearSilent, 0.3, 0.5, 0.004, 150);
  assert.ok(Dsp.quality(nearSilent, SR).issues.includes('silent'), 'đỉnh dưới -40 dBFS coi như không thu được tiếng');
  const clip = silence(1.2); addSyl(clip, 0.3, 0.5, 3, 150);
  for (let i = 0; i < clip.length; i++) clip[i] = Math.max(-1, Math.min(1, clip[i]));
  assert.ok(Dsp.quality(clip, SR).issues.includes('clip'));
  const noisy = silence(1.5); addSyl(noisy, 0.2, 1.1, 0.1, 150); withNoise(noisy, 0.08);
  assert.ok(Dsp.quality(noisy, SR).issues.includes('noisy'), JSON.stringify(Dsp.quality(noisy, SR)));
  assert.ok(Dsp.quality(silence(0.1).map(() => 0.3), SR).issues.includes('short'));
});

test('đoạn có tiếng nói: tìm đúng chỗ bắt đầu và kết thúc', () => {
  const x = silence(1.5); addSyl(x, 0.5, 0.4, 0.4, 150); withNoise(x, 0.002);
  const s = Dsp.speechSpan(x, SR);
  assert.ok(s.t0 > 0.35 && s.t0 < 0.55, 't0 ' + s.t0);
  assert.ok(s.t1 > 0.85 && s.t1 < 1.1, 't1 ' + s.t1);
  assert.equal(Dsp.speechSpan(silence(1), SR), null);
});

test('WAV 16 kHz: tiêu đề hợp lệ, độ dài đúng và dữ liệu giữ nguyên khi đổi từ 48 kHz', () => {
  const sr = 48000, n = sr, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  const w = Dsp.wav16k(x, sr), v = new DataView(w.buffer);
  const tag = (o) => String.fromCharCode(w[o], w[o + 1], w[o + 2], w[o + 3]);
  assert.equal(tag(0), 'RIFF'); assert.equal(tag(8), 'WAVE'); assert.equal(tag(36), 'data');
  assert.equal(v.getUint32(24, true), 16000);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(w.length, 44 + 16000 * 2);
  assert.equal(v.getUint32(40, true), 16000 * 2);
  let peak = 0;
  for (let i = 0; i < 16000; i++) peak = Math.max(peak, Math.abs(v.getInt16(44 + i * 2, true)));
  assert.ok(peak > 0.4 * 32767 && peak < 0.6 * 32767, 'đỉnh ' + peak);
});

test('phân tích đủ bộ trên một bản thu ba âm tiết; bản thu hỏng thì dừng sớm', () => {
  const x = silence(1.3);
  addSyl(x, 0.2, 0.18, 0.2, 140); addSyl(x, 0.5, 0.2, 0.55, 175); addSyl(x, 0.82, 0.18, 0.3, 125);
  withNoise(x, 0.002);
  const r = Dsp.analyze(x, SR);
  assert.ok(r.q.ok);
  assert.equal(r.syl.length, 3);
  assert.equal(r.prom.idx, 1);
  assert.ok(r.pitch && r.shape);
  const bad = Dsp.analyze(silence(1), SR);
  assert.ok(bad.q.issues.includes('silent'));
  assert.deepEqual(bad.syl, []);
  assert.equal(bad.prom, null);
});
