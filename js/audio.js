/* hiuhf0 — audio.js
 * Xử lý âm thanh thu từ micro, chạy hoàn toàn trên máy, không cần mạng:
 *   quality     kiểm tra bản thu (quá nhỏ, vỡ tiếng, ồn, quá ngắn) trước khi chấm
 *   pitch       cao độ F0 theo thuật toán YIN
 *   syllables   tách âm tiết từ đường năng lượng
 *   prominence  âm tiết nào nổi nhất (to, dài, cao) để so với trọng âm mong đợi
 *   intonation  hướng lên / xuống ở cuối câu
 *   wav16k      đổi sang WAV 16 kHz (định dạng dịch vụ chấm phát âm cần)
 * Là hàm thuần trên mảng số (Float32Array), nên kiểm thử được bằng Node với tín hiệu tổng hợp (tests/audio.test.js).
 * Đây là các phép đo gần đúng: cần giọng thu gần, phòng yên tĩnh, và chỉ nên dùng làm dấu hiệu tham khảo, không phải điểm số.
 */
const Dsp = (() => {
  const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
  const pct = (arr, p) => {
    if (!arr.length) return -120;
    const a = Array.from(arr).sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
  };
  const median = (arr) => pct(arr, 0.5);

  /** Đổi tần số lấy mẫu. Hạ tần số thì lấy trung bình trong cửa sổ trước (lọc thô, đủ cho giọng nói). */
  function resample(x, from, to) {
    if (from === to) return x;
    const r = from / to, n = Math.floor(x.length / r), out = new Float32Array(n);
    const k = Math.max(1, Math.round(r));
    for (let i = 0; i < n; i++) {
      const c = i * r;
      if (r > 1.5) {
        const a = Math.max(0, Math.floor(c - k / 2)), b = Math.min(x.length, a + k);
        let s = 0;
        for (let j = a; j < b; j++) s += x[j];
        out[i] = s / Math.max(1, b - a);
      } else {
        const j = Math.floor(c), f = c - j;
        out[i] = x[j] * (1 - f) + (j + 1 < x.length ? x[j + 1] : x[j]) * f;
      }
    }
    return out;
  }

  /** Năng lượng theo khung, đơn vị dBFS. */
  function energy(x, sr, win = 0.03, hop = 0.01) {
    const W = Math.max(1, Math.round(win * sr)), H = Math.max(1, Math.round(hop * sr)), out = [];
    for (let i = 0; i + W <= x.length; i += H) {
      let s = 0;
      for (let j = i; j < i + W; j++) s += x[j] * x[j];
      out.push(db(Math.sqrt(s / W)));
    }
    return { db: out, hop: H / sr };
  }

  /** Kiểm tra chất lượng bản thu. issues: short, silent, quiet, clip, noisy. */
  function quality(x, sr) {
    const dur = x.length / sr;
    let peak = 0, clip = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a >= 0.99) clip++; }
    const e = energy(x, sr).db;
    const noise = pct(e, 0.1), speech = pct(e, 0.9);
    const issues = [];
    if (dur < 0.25) issues.push('short');
    if (peak < 0.01) issues.push('silent');
    else if (speech < -36) issues.push('quiet'); // tiếng nói thường nằm quanh -30 đến -20 dBFS
    if (x.length && clip / x.length > 0.005) issues.push('clip');
    if (!issues.includes('silent') && e.length >= 30 && speech - noise < 10) issues.push('noisy');
    return { dur, peak, speechDb: speech, noiseDb: noise, snr: speech - noise, clipFrac: x.length ? clip / x.length : 0, issues, ok: issues.length === 0 };
  }

  /** Đoạn có tiếng nói (giây), hoặc null nếu không thấy. */
  function speechSpan(x, sr) {
    const e = energy(x, sr);
    if (!e.db.length) return null;
    const thr = Math.max(pct(e.db, 0.1) + 10, pct(e.db, 0.95) - 30);
    let a = -1, b = -1;
    e.db.forEach((v, i) => { if (v > thr) { if (a < 0) a = i; b = i; } });
    if (a < 0) return null;
    return { t0: Math.max(0, a * e.hop - 0.05), t1: Math.min(x.length / sr, (b + 1) * e.hop + 0.05) };
  }

  /* ----- Cao độ F0 (YIN) ----- */
  function pitch(x, sr, o = {}) {
    const fmin = o.fmin || 70, fmax = o.fmax || 400, thr = o.thr || 0.2, fs = 16000;
    const s = resample(x, sr, fs);
    const hop = Math.round(0.01 * fs), W = Math.round(0.04 * fs), tmax = Math.floor(fs / fmin), tmin = Math.max(2, Math.floor(fs / fmax));
    // ngưỡng im lặng theo mức to nhất của chính bản thu
    let maxRms = 0;
    for (let i = 0; i + W <= s.length; i += hop) { let e = 0; for (let j = 0; j < W; j++) e += s[i + j] * s[i + j]; maxRms = Math.max(maxRms, Math.sqrt(e / W)); }
    const gate = Math.max(0.002, maxRms * 0.08);
    const d = new Float32Array(tmax + 2), cm = new Float32Array(tmax + 2);
    const out = [];
    for (let i = 0; i + W + tmax + 1 <= s.length; i += hop) {
      let e = 0;
      for (let j = 0; j < W; j++) e += s[i + j] * s[i + j];
      if (Math.sqrt(e / W) < gate) { out.push(0); continue; }
      for (let t = 1; t <= tmax; t++) {
        let sum = 0;
        for (let j = 0; j < W; j++) { const df = s[i + j] - s[i + j + t]; sum += df * df; }
        d[t] = sum;
      }
      let run = 0;
      cm[0] = 1;
      for (let t = 1; t <= tmax; t++) { run += d[t]; cm[t] = run === 0 ? 1 : d[t] * t / run; }
      let tau = -1;
      for (let t = tmin; t <= tmax; t++) {
        if (cm[t] < thr) { while (t + 1 <= tmax && cm[t + 1] < cm[t]) t++; tau = t; break; }
      }
      if (tau < 0) { out.push(0); continue; }
      const a = cm[tau - 1], b = cm[tau], c = cm[tau + 1], den = a - 2 * b + c;
      out.push(fs / (tau + (den !== 0 ? 0.5 * (a - c) / den : 0)));
    }
    // lọc trung vị 5 khung, và coi bước nhảy quãng tám là lỗi
    const sm = out.map((v, i) => {
      if (!v) return 0;
      const w = [];
      for (let k = i - 2; k <= i + 2; k++) if (out[k]) w.push(out[k]);
      return w.length >= 3 ? median(w) : 0;
    });
    for (let i = 1; i < sm.length; i++) { if (sm[i] && sm[i - 1] && (sm[i] / sm[i - 1] > 1.8 || sm[i] / sm[i - 1] < 0.55)) sm[i] = 0; }
    return { f0: sm, hop: 0.01 };
  }

  const semis = (f, ref) => 12 * Math.log2(f / ref);

  /* ----- Âm tiết từ đường năng lượng ----- */
  function smooth(a, r) {
    return a.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - r); k <= Math.min(a.length - 1, i + r); k++) { s += a[k]; n++; } return s / n; });
  }

  /** Lọc thông thấp bậc một (giữ phần nguyên âm và âm vang, bớt tiếng xát và tiếng bật của phụ âm). */
  function lowpass(x, sr, fc) {
    const a = 1 - Math.exp((-2 * Math.PI * fc) / sr), y = new Float32Array(x.length);
    let p = 0;
    for (let i = 0; i < x.length; i++) { p += a * (x[i] - p); y[i] = p; }
    return y;
  }

  /** Các âm tiết: [{ t, db, dur, i0, i1 }] (t là giây của đỉnh, i0..i1 là khung năng lượng, mỗi khung 10 ms).
   *  Đỉnh năng lượng của tín hiệu đã lọc thấp, chỉ tính ở khung có thanh (nguyên âm, âm vang) để tiếng xát, tiếng bật không bị tính nhầm
   *  thành âm tiết. o.pitch: kết quả của pitch() nếu đã có. */
  function syllables(x, sr, o = {}) {
    const lp = lowpass(x, sr, 1500), hp = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) hp[i] = x[i] - lp[i];
    const e = energy(lp, sr, 0.03, 0.01), eh = energy(hp, sr, 0.03, 0.01), n = e.db.length;
    if (n < 8) return [];
    // khung "giống nguyên âm": năng lượng thấp tần trội hơn cao tần (tiếng xát và tiếng bật thì ngược lại)
    const voicedAt = (i) => { for (let k = i - 1; k <= i + 1; k++) if (e.db[k] > eh.db[k] + 2) return true; return false; };
    const sm = smooth(e.db, 1);
    const maxDb = Math.max.apply(null, sm), floor = pct(sm, 0.1);
    const minDb = Math.max(floor + 10, maxDb - 25);
    const prom = o.prom || 2.5, minGap = o.minGap || 0.08; // chọn theo thử trên 18 từ giọng tổng hợp: đúng 15/18, chưa thử trên giọng người thật
    let peaks = [];
    for (let i = 2; i < n - 2; i++) if (sm[i] >= sm[i - 1] && sm[i] > sm[i + 1] && sm[i] >= sm[i - 2] && sm[i] >= sm[i + 2] && sm[i] > minDb && voicedAt(i)) peaks.push(i);
    const valleyOf = (a, b) => { let v = a; for (let i = a; i <= b; i++) if (sm[i] < sm[v]) v = i; return v; };
    for (let changed = true; changed && peaks.length > 1;) {
      changed = false;
      for (let k = 0; k < peaks.length - 1; k++) {
        const a = peaks[k], b = peaks[k + 1], v = valleyOf(a, b);
        if (Math.min(sm[a], sm[b]) - sm[v] < prom || (b - a) * e.hop < minGap) { peaks.splice(sm[a] < sm[b] ? k : k + 1, 1); changed = true; break; }
      }
    }
    const bounds = [0];
    for (let k = 0; k < peaks.length - 1; k++) bounds.push(valleyOf(peaks[k], peaks[k + 1]));
    bounds.push(n - 1);
    return peaks.map((p, k) => {
      let count = 0;
      for (let i = bounds[k]; i <= bounds[k + 1]; i++) if (sm[i] >= sm[p] - 10) count++;
      return { t: p * e.hop, db: sm[p], dur: count * e.hop, i0: bounds[k], i1: bounds[k + 1] };
    });
  }

  const zs = (v) => {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) || 1;
    return v.map((a) => (a - m) / sd);
  };

  /** Âm tiết nào nổi nhất: kết hợp độ to, độ dài và cao độ. Trả về { idx, scores, margin } hoặc null nếu dưới 2 âm tiết. */
  function prominence(syl, pitchTrack) {
    if (!syl || syl.length < 2) return null;
    const f0 = pitchTrack ? pitchTrack.f0 : [];
    const voiced = f0.filter((v) => v > 0);
    const ref = voiced.length ? median(voiced) : 0;
    const fs = syl.map((s) => {
      const v = [];
      for (let i = s.i0; i <= s.i1 && i < f0.length; i++) if (f0[i] > 0) v.push(semis(f0[i], ref));
      return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const useF = fs.every((v) => v !== null);
    const zd = zs(syl.map((s) => s.db)), zl = zs(syl.map((s) => s.dur)), zf = useF ? zs(fs) : null;
    const scores = syl.map((_, i) => (useF ? 0.4 * zd[i] + 0.3 * zl[i] + 0.3 * zf[i] : 0.55 * zd[i] + 0.45 * zl[i]));
    const order = scores.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    return { idx: order[0][1], scores, margin: order[0][0] - order[1][0], usedPitch: useF };
  }

  /** Hướng lên/xuống ở cuối: { dir: 'rise' | 'fall' | 'flat', slope (bán cung/giây), range (bán cung), contour } hoặc null nếu quá ít đoạn có thanh. */
  function intonation(pitchTrack) {
    const f0 = pitchTrack.f0, hop = pitchTrack.hop;
    const idx = [];
    f0.forEach((v, i) => { if (v > 0) idx.push(i); });
    if (idx.length < 15) return null;
    const ref = median(idx.map((i) => f0[i]));
    const st = idx.map((i) => semis(f0[i], ref));
    const tail = idx.slice(-Math.max(15, Math.round(idx.length * 0.4)));
    const ts = tail.map((i) => i * hop), ys = tail.map((i) => semis(f0[i], ref));
    const mt = ts.reduce((a, b) => a + b, 0) / ts.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    for (let i = 0; i < ts.length; i++) { num += (ts[i] - mt) * (ys[i] - my); den += (ts[i] - mt) * (ts[i] - mt); }
    const slope = den ? num / den : 0;
    return { dir: slope >= 6 ? 'rise' : slope <= -6 ? 'fall' : 'flat', slope, range: pct(st, 0.95) - pct(st, 0.05), contour: f0.map((v) => (v > 0 ? semis(v, ref) : null)) };
  }

  /** WAV 16 kHz, 16 bit, đơn kênh (Uint8Array). */
  function wav16k(x, sr) {
    const s = resample(x, sr, 16000), n = s.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s[i])) * 32767, true);
    return new Uint8Array(buf);
  }

  /** Phân tích đủ bộ cho một bản thu: chất lượng, đoạn có tiếng, cao độ, âm tiết, âm tiết nổi nhất, ngữ điệu. */
  function analyze(x, sr) {
    const q = quality(x, sr);
    const span = speechSpan(x, sr);
    if (!span || q.issues.indexOf('silent') >= 0 || q.issues.indexOf('short') >= 0) return { q, span, pitch: null, syl: [], prom: null, shape: null };
    const a = Math.floor(span.t0 * sr), b = Math.ceil(span.t1 * sr);
    const seg = x.subarray ? x.subarray(a, b) : x.slice(a, b);
    const p = pitch(seg, sr);
    const syl = syllables(seg, sr, { pitch: p });
    return { q, span, pitch: p, syl, prom: prominence(syl, p), shape: intonation(p) };
  }

  /** Giải mã Blob từ MediaRecorder thành mảng số đơn kênh (chỉ chạy trong trình duyệt). */
  async function decodeBlob(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    try {
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const n = buf.length, ch = buf.numberOfChannels, mono = new Float32Array(n);
      for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
      return { x: mono, sr: buf.sampleRate };
    } finally { try { ctx.close(); } catch (e) { /* bỏ qua */ } }
  }

  const api = { db, resample, energy, quality, speechSpan, pitch, syllables, prominence, intonation, wav16k, analyze, decodeBlob, semis };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
