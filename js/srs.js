/* hiuhf0 — srs.js
 * Thuật toán lặp lại ngắt quãng (spaced repetition) kiểu SM-2 rút gọn,
 * có "bước học" ngắn (1 phút, 10 phút) trước khi thẻ được tính theo ngày.
 *
 * Mức đánh giá: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ. Giao diện chỉ dùng 0 và 2;
 * opts.recog = true nghĩa là câu trả lời đúng chỉ nhờ nhận ra (trắc nghiệm, gõ gần đúng)
 * nên khoảng cách tăng chậm hơn và độ dễ (ease) không đổi.
 *
 * Trạng thái thẻ:
 *   new    : chưa học bao giờ (không có bản ghi)
 *   learn  : đang ở bước học ngắn (tính bằng phút)
 *   review : đã "tốt nghiệp", khoảng cách tính bằng ngày
 *
 * Khoảng cách mới tính theo số ngày THỰC TẾ đã trôi qua kể từ lần ôn trước:
 *   ôn sớm  → trả lời đúng không đổi lịch (chỉ luyện thêm)
 *   ôn trễ  → được cộng một nửa số ngày trễ
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
    recogFactor: 1.3,    // trả lời đúng nhờ nhận ra: khoảng cách chỉ nhân 1,3
    easeRecover: 0.05,   // gõ đúng thì ease hồi dần về mức ban đầu
    lapseFactor: 0.25,   // quên → giữ lại 25% khoảng cách cũ…
    lapseMax: 14,        // …và không quá 14 ngày
    lateCredit: 0.5,     // ôn trễ được tính thêm 50% số ngày trễ
    penaltyFactor: 0.6,  // sai ở bài Nghe/Nói/Kiểm tra: còn 60% khoảng cách
    matureDays: 21,      // ≥ 21 ngày được tính là "đã thuộc"
    matureOk: 2          // và phải ôn đúng liên tiếp ít nhất 2 lần
  };

  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(startOfDay(t)); d.setDate(d.getDate() + n); return d.getTime(); };
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

  function fresh() {
    return { state: 'new', step: 0, interval: 0, ease: CFG.startEase, reps: 0, lapses: 0, due: 0, last: 0, ok: 0 };
  }

  /** Số lần ôn đúng liên tiếp kể từ lần học lại gần nhất (thẻ cũ chưa có trường này thì ước lượng theo khoảng cách). */
  function okOf(c) {
    if (c.ok != null) return c.ok;
    return c.interval >= CFG.matureDays ? CFG.matureOk + 1 : c.interval >= 2 ? 1 : 0;
  }

  function graduate(c, days, now) {
    c.state = 'review';
    c.step = 0;
    c.interval = Math.min(CFG.maxInterval, days);
    c.due = addDays(now, c.interval);
  }

  /** Trả về bản ghi thẻ MỚI sau khi chấm điểm (không sửa thẻ cũ). */
  function schedule(card, grade, now = Date.now(), opts = {}) {
    const c = Object.assign(fresh(), card || {});
    const prevLast = c.last;
    if (card && card.state === 'review' && card.ok == null) c.ok = okOf(card); // thẻ lưu từ bản cũ chưa có trường ok
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
      c.ok = 0;
      c.ease = Math.max(CFG.minEase, c.ease - 0.2);
      c.interval = Math.min(CFG.lapseMax, Math.max(1, Math.round(c.interval * CFG.lapseFactor)));
      c.state = 'learn';
      c.step = 0;
      c.due = now + steps0() * MIN;
      return c;
    }
    const iv = c.interval;
    const elapsed = prevLast ? daysBetween(prevLast, now) : iv;
    if (elapsed < iv) {
      // Ôn sớm: chỉ luyện thêm, giữ nguyên lịch cũ (và mốc "lần ôn trước" để lần sau không bị tính nhầm là sớm).
      c.last = prevLast;
      c.due = card && card.due ? card.due : addDays(prevLast, iv);
      return c;
    }
    const base = iv + Math.round((elapsed - iv) * CFG.lateCredit);
    let next;
    if (grade === 1) {
      next = Math.max(iv + 1, Math.round(base * CFG.hardFactor));
      c.ease = Math.max(CFG.minEase, c.ease - 0.15);
    } else if (grade === 2 && opts.recog) {
      next = Math.max(iv + 1, Math.round(base * CFG.recogFactor));
    } else if (grade === 2) {
      next = Math.max(iv + 1, Math.round(base * c.ease));
      if (c.ease < CFG.startEase) c.ease = Math.min(CFG.startEase, c.ease + CFG.easeRecover);
    } else {
      next = Math.max(iv + 2, Math.round(base * c.ease * CFG.easyBonus));
      c.ease = Math.min(CFG.maxEase, c.ease + 0.15);
    }
    c.ok = okOf(card || c) + 1;
    c.interval = Math.min(CFG.maxInterval, next);
    c.due = addDays(now, c.interval);
    return c;
  }
  function steps0() { return CFG.steps[0]; }

  /** Sai ở bài Nghe / Nói / Kiểm tra cuối bài: kéo lịch ôn của từ đã tốt nghiệp lại gần hơn.
   *  Mỗi từ chỉ bị trừ một lần mỗi ngày, thẻ đang học hoặc chưa học thì giữ nguyên. */
  function penalize(card, now = Date.now()) {
    if (!card || card.state !== 'review') return card;
    const today = startOfDay(now);
    if (card.pen === today) return card;
    const c = Object.assign({}, card);
    c.pen = today;
    c.known = false;
    c.ok = Math.min(okOf(card), 1);
    c.interval = Math.max(1, Math.round(c.interval * CFG.penaltyFactor));
    c.due = Math.min(c.due, addDays(now, 1));
    return c;
  }

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
    return card.state === 'review' ? fmtDays(Math.max(1, daysBetween(now, card.due))) : fmtMs(card.due - now);
  }
  function preview(card, grade, now = Date.now(), opts) { return label(schedule(card, grade, now, opts), now); }

  /* ----- Cấp thuộc (0–5): hệ thống tự xếp từng từ, không cần người học chọn -----
   * 0 Mới        chưa học
   * 1 Mới gặp    đã lật thẻ, chờ bài Nghe & chọn
   * 2 Nhận ra    đã qua Nghe & chọn / Nghe & viết, chưa được ôn lại sau ít nhất 1 ngày
   * 3 Nhớ được   đã nhớ đúng khi ôn lại, khoảng cách dưới 7 ngày
   * 4 Vững       khoảng cách từ 7 ngày
   * 5 Thuộc lòng khoảng cách từ 21 ngày và ôn đúng liên tiếp ít nhất 2 lần,
   *              hoặc người học bấm "Đã nhớ rõ từ" (sau bài kiểm tra nhanh)
   */
  const LEVEL_NAMES = ['Mới', 'Mới gặp', 'Nhận ra', 'Nhớ được', 'Vững', 'Thuộc lòng'];
  function level(card) {
    if (!card) return 0;
    if (card.known) return 5;
    if (card.state === 'learn') return Math.min(2, Math.max(1, (card.step || 0) + 1));
    if (card.state === 'review') {
      const ok = okOf(card);
      if (!ok) return 2;
      return card.interval >= CFG.matureDays && ok >= CFG.matureOk ? 5 : card.interval >= 7 ? 4 : 3;
    }
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
    c.ok = Math.max(CFG.matureOk, okOf(c));
    c.interval = Math.min(CFG.maxInterval, Math.max(30, Math.round((c.interval || 0) * 2)));
    c.due = addDays(now, c.interval);
    return c;
  }
  const markKnown = (now) => master(null, now);

  const api = { CFG, LEVEL_NAMES, schedule, penalize, preview, label, level, status, fresh, introduce, master, markKnown, startOfDay, addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
