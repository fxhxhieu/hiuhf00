/* hiuhf0 — store.js
 * Lưu toàn bộ tiến độ trong localStorage của trình duyệt (không cần server).
 * Có xuất / nhập file JSON để sao lưu hoặc chuyển sang máy khác.
 */
const Store = (() => {
  const KEY = 'hiuhf0.v1';
  const DEFAULTS = {
    newPerDay: 10,
    reviewsPerDay: 200,
    mode: 'mix',        // mix | flip | choice | type | listen
    front: 'en',        // en | vi | mix  (mặt trước của flashcard)
    autoSpeak: true,
    newOrder: 'order',  // order | random
    voice: '',
    rate: 0.9,
    theme: 'auto',      // auto | light | dark
    deck: { levels: ['A1'], topics: [] }
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const blank = () => ({ v: 1, cards: {}, pinned: {}, settings: clone(DEFAULTS), daily: { date: '', newDone: 0, reviewDone: 0 }, log: {}, texts: {}, listen: {}, path: {}, badges: {}, flagged: {}, speak: { n: 0, ok: 0 } });

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
    if (o.settings && typeof o.settings === 'object') {
      Object.assign(b.settings, o.settings);
      b.settings.deck = Object.assign({ levels: ['A1'], topics: [] }, o.settings.deck || {});
      if (!Array.isArray(b.settings.deck.levels) || !b.settings.deck.levels.length) b.settings.deck.levels = ['A1'];
      if (!Array.isArray(b.settings.deck.topics)) b.settings.deck.topics = [];
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
    if (isNew) l.n += 1; else l.r += 1;
    if (ok) l.ok += 1;
    save();
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
    save, flush, daily, dayKey, logReview, logListen, flag, setPath, logSpeak, award, streak, textState,
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
