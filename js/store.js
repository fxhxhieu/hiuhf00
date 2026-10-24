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
    theme: 'auto'       // auto | light | dark
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const blank = () => ({ v: 1, cards: {}, pinned: {}, settings: clone(DEFAULTS), daily: { date: '', newDone: 0, reviewDone: 0 }, log: {}, texts: {}, listen: {}, path: {}, badges: {}, flagged: {}, speak: { n: 0, ok: 0 }, usage: { total: 0, days: {} }, custom: [] });

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

  function logReview(isNew, ok) {
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

  function streak() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const t = state.log[dayKey(d.getTime())];
    if (!(t && t.n + t.r + (t.l || 0) > 0)) d.setDate(d.getDate() - 1);
    let n = 0;
    for (;;) {
      const l = state.log[dayKey(d.getTime())];
      if (l && l.n + l.r + (l.l || 0) > 0) { n += 1; d.setDate(d.getDate() - 1); } else break;
    }
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
    save, flush, daily, dayKey, logReview, retention, logListen, flag, setPath, logSpeak, award, streak, textState, addUsage, usageStats,
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
