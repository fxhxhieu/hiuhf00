/* hiuhf0 — store.js
 * Lưu toàn bộ tiến độ trong localStorage của trình duyệt (không cần server).
 * Có xuất / nhập file JSON để sao lưu hoặc chuyển sang máy khác.
 */
const Store = (() => {
  const KEY = 'hiuhf0.v1';
  const DEFAULTS = {
    newPerDay: 10,
    reviewsPerDay: 200,
    autoSpeak: true,
    goal: 'general',    // general | ielts | toeic: mục tiêu quyết định từ mới nào được học trước
    onboarded: false,   // đã qua màn chào mừng đầu tiên chưa
    voice: '',
    rate: 0.9,
    listenMix: false,   // luyện nghe: mỗi câu một giọng vùng khác nhau (Mỹ, Anh, Úc… nếu máy có)
    theme: 'auto',      // auto | light | dark
    skin: 'matcha',     // matcha | sakura | sky: giao diện màu
    fx: (navigator.hardwareConcurrency || 4) <= 2 ? 'light' : 'full', // full | light | off: mức hiệu ứng
    sound: false,       // âm thanh tự tạo, mặc định tắt
    haptics: false,     // rung nhẹ trên điện thoại, mặc định tắt
    dangoAcc: '',       // phụ kiện Dango đang đeo (mở khóa bằng sticker)
    pinStickers: [],    // tối đa 3 sticker ghim lên trang Hôm nay
    journalPin: ''      // mã băm của mã PIN nhật ký (chỉ che nội dung trên giao diện, không mã hóa)
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const blank = () => ({ v: 1, cards: {}, pinned: {}, settings: clone(DEFAULTS), daily: { date: '', newDone: 0, reviewDone: 0 }, log: {}, texts: {}, listen: {}, path: {}, badges: {}, flagged: {}, speak: { n: 0, ok: 0 }, usage: { total: 0, days: {} }, custom: [], stats: {}, journal: {}, letters: [], pron: sanitizePron(null) });

  /* Tiến độ luyện phát âm (js/pron.js): mỗi nhóm âm có tối đa 80 lần luyện gần nhất. Chỉ giữ dữ liệu đúng hình dạng khi nhập file sao lưu. */
  function sanitizePron(o) {
    const b = { v: 1, t: {}, diag: null, plan: null, rec: [] };
    if (!o || typeof o !== 'object') return b;
    const str = (v, n) => String(v == null ? '' : v).slice(0, n);
    if (o.t && typeof o.t === 'object') {
      Object.keys(o.t).slice(0, 80).forEach((k) => {
        const e = o.t[k];
        if (!e || !Array.isArray(e.ev)) return;
        b.t[str(k, 40)] = {
          ev: e.ev.slice(-80).filter((x) => Array.isArray(x) && x.length >= 4).map((x) => [Number(x[0]) || 0, str(x[1], 10), x[2] ? 1 : 0, Math.max(0, Math.min(400, Number(x[3]) || 0))]),
          last: Number(e.last) || 0
        };
      });
    }
    if (o.diag && typeof o.diag === 'object') {
      b.diag = { ts: Number(o.diag.ts) || 0, n: Number(o.diag.n) || 0, hist: [] };
      // ảnh chụp hồ sơ sau mỗi lần đo (mức vững theo nhóm lớn, 0 đến 1) để so tiến bộ giữa các lần
      if (Array.isArray(o.diag.hist)) {
        b.diag.hist = o.diag.hist.slice(-12).filter((h) => h && h.s && typeof h.s === 'object').map((h) => {
          const s = {};
          Object.keys(h.s).slice(0, 12).forEach((k) => { const v = h.s[k] == null || h.s[k] === '' ? NaN : Number(h.s[k]); if (isFinite(v)) s[str(k, 20)] = Math.max(0, Math.min(1, v)); });
          return { ts: Number(h.ts) || 0, s };
        });
      }
    }
    if (o.plan && typeof o.plan === 'object') {
      b.plan = { day: str(o.plan.day, 10), ids: Array.isArray(o.plan.ids) ? o.plan.ids.slice(0, 5).map((s) => str(s, 40)) : [], done: Array.isArray(o.plan.done) ? o.plan.done.slice(0, 10).map((s) => str(s, 20)) : [] };
    }
    if (Array.isArray(o.rec)) b.rec = o.rec.slice(-60).filter((r) => r && r.id).map((r) => ({ id: str(r.id, 40), ts: Number(r.ts) || 0, text: str(r.text, 120), target: str(r.target, 40) }));
    return b;
  }

  function normalize(o) {
    const b = blank();
    if (!o || typeof o !== 'object') return b;
    if (o.cards && typeof o.cards === 'object') b.cards = o.cards;
    if (o.pinned && typeof o.pinned === 'object') b.pinned = o.pinned;
    if (o.log && typeof o.log === 'object') b.log = o.log;
    if (o.texts && typeof o.texts === 'object') b.texts = o.texts;
    if (o.listen && typeof o.listen === 'object') b.listen = o.listen;
    if (o.path && typeof o.path === 'object') b.path = o.path;
    if (o.badges && typeof o.badges === 'object') b.badges = o.badges;
    if (o.flagged && typeof o.flagged === 'object') b.flagged = o.flagged;
    if (o.speak && typeof o.speak === 'object') Object.assign(b.speak, o.speak);
    if (o.daily && typeof o.daily === 'object') Object.assign(b.daily, o.daily);
    if (Array.isArray(o.custom)) {
      const s = (v, n) => String(v == null ? '' : v).slice(0, n);
      b.custom = o.custom.filter((c) => c && c.word && c.vi && c.pos).map((c) => ({ word: s(c.word, 40), pos: s(c.pos, 8), vi: s(c.vi, 200), def: s(c.def, 300), ex: s(c.ex, 300) }));
    }
    if (o.stats && typeof o.stats === 'object') b.stats = o.stats;
    if (o.journal && typeof o.journal === 'object') {
      const str = (v, n) => String(v == null ? '' : v).slice(0, n);
      Object.keys(o.journal).forEach((k) => {
        const e = o.journal[k];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !e || typeof e !== 'object') return;
        b.journal[k] = {
          text: str(e.text, 20000), mood: str(e.mood, 8), topic: str(e.topic, 40), prompt: str(e.prompt, 300),
          created: Number(e.created) || 0, updated: Number(e.updated) || 0, words: Number(e.words) || 0,
          used: Array.isArray(e.used) ? e.used.slice(0, 200).map((x) => str(x, 60)) : [],
          challenge: Number(e.challenge) || 0
        };
      });
    }
    b.pron = sanitizePron(o.pron);
    if (Array.isArray(o.letters)) {
      const str = (v, n) => String(v == null ? '' : v).slice(0, n);
      b.letters = o.letters.filter((l) => l && l.text).slice(0, 200).map((l) => ({ id: str(l.id, 40) || String(Number(l.created) || Date.now()), title: str(l.title, 100), text: str(l.text, 20000), created: Number(l.created) || 0, openOn: Number(l.openOn) || 0, opened: Number(l.opened) || 0 }));
    }
    if (o.usage && typeof o.usage === 'object') {
      b.usage.total = Number(o.usage.total) || 0;
      if (o.usage.days && typeof o.usage.days === 'object') b.usage.days = o.usage.days;
    }
    if (o.settings && typeof o.settings === 'object') {
      Object.assign(b.settings, o.settings);
      ['deck', 'mode', 'front', 'newOrder'].forEach((k) => { delete b.settings[k]; }); // thiết lập cũ không còn dùng
    }
    return b;
  }

  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : blank();
    } catch (e) { return blank(); }
  }

  let timer = null;
  function flush() {
    clearTimeout(timer);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* chế độ riêng tư / hết dung lượng */ }
  }
  function save() { clearTimeout(timer); timer = setTimeout(flush, 200); }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  const dayKey = (t = Date.now()) => {
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  function daily() {
    const k = dayKey();
    if (state.daily.date !== k) state.daily = { date: k, newDone: 0, reviewDone: 0 };
    return state.daily;
  }

  /* Ghi nhận khung giờ học để mở sticker Cú đêm, Chim sớm */
  function touchTime() {
    const t = new Date(), h = t.getHours();
    if (h >= 23 || h < 4) bump('night'); else if (h >= 4 && h < 7) bump('early');
    if (h === 0 && t.getMinutes() < 10) bump('midnight');
  }

  function bump(key, n = 1) { state.stats[key] = (state.stats[key] || 0) + n; save(); }
  function setStat(key, v) { state.stats[key] = v; save(); }
  const stat = (key) => state.stats[key] || 0;

  function logReview(isNew, ok) {
    touchTime();
    const d = daily();
    if (isNew) d.newDone += 1; else d.reviewDone += 1;
    const k = dayKey();
    const l = state.log[k] || (state.log[k] = { n: 0, r: 0, ok: 0 });
    if (isNew) l.n += 1;
    else { l.r += 1; l.rok = (l.rok || 0) + (ok ? 1 : 0); } // rok: số lượt ôn đúng (không tính lúc học từ mới)
    if (ok) l.ok += 1;
    save();
  }

  /** Tỉ lệ nhớ đúng khi ôn lại trong `days` ngày gần nhất (chỉ tính các ngày đã ghi trường rok). */
  function retention(days = 14) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    let r = 0, ok = 0;
    for (let i = 0; i < days; i++) {
      const l = state.log[dayKey(d.getTime())];
      if (l && l.rok != null) { r += l.r; ok += l.rok; }
      d.setDate(d.getDate() - 1);
    }
    return { reviews: r, correct: ok, pct: r ? Math.round((ok / r) * 100) : null };
  }

  /** Ghi kết quả một câu luyện nghe (tính vào chuỗi ngày học). */
  function logListen(mode, ok) {
    touchTime();
    if (ok) bump('listenRun'); else setStat('listenRun', 0);
    const m = state.listen[mode] || (state.listen[mode] = { n: 0, ok: 0 });
    m.n += 1;
    if (ok) m.ok += 1;
    const k = dayKey();
    const l = state.log[k] || (state.log[k] = { n: 0, r: 0, ok: 0 });
    l.l = (l.l || 0) + 1;
    save();
  }

  /** Đánh dấu / bỏ đánh dấu từ hay sai (từ bị sai ở bài nghe, bài nói). delta > 0: sai, delta < 0: đúng. */
  function flag(id, delta) {
    const n = Math.max(0, (state.flagged[id] || 0) + delta);
    if (n) state.flagged[id] = Math.min(n, 5); else delete state.flagged[id];
    save();
  }
  function setPath(id, patch) { state.path[id] = Object.assign(state.path[id] || {}, patch); save(); }
  function logSpeak(ok) { state.speak.n += 1; if (ok) state.speak.ok += 1; save(); }
  function award(id) {
    if (state.badges[id]) return false;
    state.badges[id] = Date.now();
    save();
    return true;
  }

  /** Cộng thời gian sử dụng (giây) vào hôm nay và tổng. */
  function addUsage(sec) {
    const k = dayKey();
    state.usage.days[k] = (state.usage.days[k] || 0) + sec;
    state.usage.total += sec;
    save();
  }
  /** Tổng thời gian sử dụng (giây): hôm nay, 7 ngày gần nhất, toàn bộ. */
  function usageStats() {
    const u = state.usage, d = new Date();
    d.setHours(12, 0, 0, 0);
    let week = 0;
    for (let i = 0; i < 7; i++) { week += u.days[dayKey(d.getTime())] || 0; d.setDate(d.getDate() - 1); }
    return { today: u.days[dayKey()] || 0, week, total: u.total };
  }

  /* Chuỗi ngày học. Mỗi cửa sổ 7 ngày được "giữ chuỗi" một ngày lỡ (Dango giữ chuỗi): ngày lỡ đó không cộng thêm
   * nhưng cũng không làm đứt chuỗi, miễn là hôm trước nữa có học. */
  function streakInfo() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const active = (dt) => { const l = state.log[dayKey(dt.getTime())]; return !!(l && l.n + l.r + (l.l || 0) > 0); };
    if (!active(d)) d.setDate(d.getDate() - 1); // hôm nay chưa học thì tính từ hôm qua
    let n = 0, lastFrozen = null;
    const frozen = [];
    for (;;) {
      if (active(d)) { n += 1; d.setDate(d.getDate() - 1); continue; }
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      if (!active(prev) || (lastFrozen !== null && lastFrozen - d.getTime() < 7 * 86400000)) break;
      frozen.push(dayKey(d.getTime()));
      lastFrozen = d.getTime();
      d.setDate(d.getDate() - 1);
    }
    return { n, frozen };
  }
  const streak = () => streakInfo().n;

  /* ----- Nhật ký ----- */
  const journalDates = () => Object.keys(state.journal).filter((k) => state.journal[k].text.trim()).sort().reverse();
  const journalGet = (k) => state.journal[k] || null;
  function journalSet(k, e) { state.journal[k] = e; save(); }
  function journalDel(k) { delete state.journal[k]; save(); }
  /** Số ngày liên tiếp có viết nhật ký (tính từ hôm nay, hoặc hôm qua nếu hôm nay chưa viết). */
  function journalStreak() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const has = (dt) => { const e = state.journal[dayKey(dt.getTime())]; return !!(e && e.text.trim()); };
    if (!has(d)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (has(d)) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }

  function textState(id) {
    return state.texts[id] || (state.texts[id] = { shadow: [], done: [], drafts: {} });
  }

  return {
    get: () => state,
    get settings() { return state.settings; },
    card: (id) => state.cards[id] || null,
    setCard(id, c) { state.cards[id] = c; save(); },
    delCard(id) { delete state.cards[id]; save(); },
    save, flush, daily, dayKey, logReview, retention, logListen, streakInfo, bump, setStat, stat, journalDates, journalGet, journalSet, journalDel, journalStreak, flag, setPath, logSpeak, award, streak, textState, addUsage, usageStats,
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const o = JSON.parse(text);
      if (!o || typeof o !== 'object' || typeof o.cards !== 'object') throw new Error('File không đúng định dạng hiuhf0');
      state = normalize(o);
      flush();
    },
    reset() { state = blank(); flush(); }
  };
})();
