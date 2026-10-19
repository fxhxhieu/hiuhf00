/* hiuhf0 — srs.js
 * Thuật toán lặp lại ngắt quãng (spaced repetition) kiểu SM-2 rút gọn,
 * có "bước học" ngắn (1 phút, 10 phút) trước khi thẻ được tính theo ngày.
 *
 * Mức đánh giá: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ
 *
 * Trạng thái thẻ:
 *   new    : chưa học bao giờ (không có bản ghi)
 *   learn  : đang ở bước học ngắn (tính bằng phút)
 *   review : đã "tốt nghiệp", khoảng cách tính bằng ngày
 */
const SRS = (() => {
  const MIN = 60000;
  const DAY = 86400000;
  const CFG = {
    steps: [1, 10],      // phút
    easyDays: 4,         // khoảng cách khi bấm "Dễ" ở thẻ mới
    startEase: 2.5,
    minEase: 1.3,
    maxEase: 3.0,
    maxInterval: 365,
    hardFactor: 1.2,
    easyBonus: 1.3,
    lapseFactor: 0.5,    // quên → giữ lại 50% khoảng cách cũ
    matureDays: 21       // ≥ 21 ngày được tính là "đã thuộc"
  };

  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(startOfDay(t)); d.setDate(d.getDate() + n); return d.getTime(); };

  function fresh() {
    return { state: 'new', step: 0, interval: 0, ease: CFG.startEase, reps: 0, lapses: 0, due: 0, last: 0 };
  }

  function graduate(c, days, now) {
    c.state = 'review';
    c.step = 0;
    c.interval = Math.min(CFG.maxInterval, days);
    c.due = addDays(now, c.interval);
  }

  /** Trả về bản ghi thẻ MỚI sau khi chấm điểm (không sửa thẻ cũ). */
  function schedule(card, grade, now = Date.now()) {
    const c = Object.assign(fresh(), card || {});
    c.reps += 1;
    c.last = now;
    c.known = false; // cấp sẽ được tính lại theo kết quả thật

    if (c.state === 'new' || c.state === 'learn') {
      c.state = 'learn';
      const steps = CFG.steps;
      if (grade === 0) {
        c.step = 0;
        c.due = now + steps[0] * MIN;
      } else if (grade === 1) {
        const m = c.step === 0 && steps.length > 1 ? Math.round((steps[0] + steps[1]) / 2) : steps[Math.min(c.step, steps.length - 1)];
        c.due = now + m * MIN;
      } else if (grade === 2) {
        c.step += 1;
        if (c.step >= steps.length) graduate(c, Math.max(1, c.interval), now);
        else c.due = now + steps[c.step] * MIN;
      } else {
        graduate(c, Math.max(CFG.easyDays, c.interval), now);
        c.ease = Math.min(CFG.maxEase, c.ease + 0.15);
      }
      return c;
    }

    // state === 'review'
    if (grade === 0) {
      c.lapses += 1;
      c.ease = Math.max(CFG.minEase, c.ease - 0.2);
      c.interval = Math.max(1, Math.round(c.interval * CFG.lapseFactor));
      c.state = 'learn';
      c.step = 0;
      c.due = now + steps0() * MIN;
      return c;
    }
    const iv = c.interval;
    let next;
    if (grade === 1) {
      next = Math.max(iv + 1, Math.round(iv * CFG.hardFactor));
      c.ease = Math.max(CFG.minEase, c.ease - 0.15);
    } else if (grade === 2) {
      next = Math.max(iv + 1, Math.round(iv * c.ease));
    } else {
      next = Math.max(iv + 2, Math.round(iv * c.ease * CFG.easyBonus));
      c.ease = Math.min(CFG.maxEase, c.ease + 0.15);
    }
    c.interval = Math.min(CFG.maxInterval, next);
    c.due = addDays(now, c.interval);
    return c;
  }
  function steps0() { return CFG.steps[0]; }

  function fmtMs(ms) {
    const m = Math.max(1, Math.round(ms / MIN));
    if (m < 60) return m + ' phút';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' giờ';
    return fmtDays(Math.round(ms / DAY));
  }
  function fmtDays(d) {
    if (d < 30) return d + ' ngày';
    if (d < 365) return Math.round(d / 30) + ' tháng';
    return '1 năm';
  }

  /** Nhãn "sau bao lâu" của một thẻ đã được lên lịch. */
  function label(card, now = Date.now()) {
    return card.state === 'review' ? fmtDays(card.interval) : fmtMs(card.due - now);
  }
  function preview(card, grade, now = Date.now()) { return label(schedule(card, grade, now), now); }

  /* ----- Cấp thuộc (0–5): hệ thống tự xếp từng từ, không cần người học chọn -----
   * 0 Mới       chưa học
   * 1 Mới gặp   đã lật thẻ, chờ bài Nghe & chọn
   * 2 Nhận ra   đã qua Nghe & chọn, chờ bài Nghe & viết
   * 3 Nhớ được  đã qua Nghe & viết, khoảng cách dưới 7 ngày
   * 4 Vững      khoảng cách từ 7 ngày
   * 5 Thuộc lòng khoảng cách từ 21 ngày, hoặc người học bấm "Đã nhớ rõ từ"
   */
  const LEVEL_NAMES = ['Mới', 'Mới gặp', 'Nhận ra', 'Nhớ được', 'Vững', 'Thuộc lòng'];
  function level(card) {
    if (!card) return 0;
    if (card.known) return 5;
    if (card.state === 'learn') return Math.min(2, Math.max(1, (card.step || 0) + 1));
    if (card.state === 'review') return card.interval >= CFG.matureDays ? 5 : card.interval >= 7 ? 4 : 3;
    return 1;
  }
  function status(card) {
    const l = level(card);
    return l === 0 ? 'new' : l === 5 ? 'mastered' : 'learning';
  }

  /** Sau khi lật thẻ từ mới và bấm "Tiếp tục": thẻ vào bước học đầu (cấp 1). */
  function introduce(now = Date.now()) {
    const c = fresh();
    c.state = 'learn'; c.step = 0; c.reps = 1; c.last = now;
    c.due = now + CFG.steps[0] * MIN;
    return c;
  }

  /** "Đã nhớ rõ từ": nhảy thẳng lên cấp 5, khoảng cách tối thiểu 30 ngày. */
  function master(card, now = Date.now()) {
    const c = Object.assign(fresh(), card || {});
    c.state = 'review'; c.step = 0; c.known = true; c.last = now;
    c.reps = Math.max(3, c.reps || 0);
    c.interval = Math.min(CFG.maxInterval, Math.max(30, Math.round((c.interval || 0) * 2)));
    c.due = addDays(now, c.interval);
    return c;
  }
  const markKnown = (now) => master(null, now);

  const api = { CFG, LEVEL_NAMES, schedule, preview, label, level, status, fresh, introduce, master, markKnown, startOfDay, addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
