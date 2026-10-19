/* hiuhf0 — app.js
 * Giao diện: Học (flashcard + SRS), Từ vựng, Shadowing, Dịch bài, Cài đặt.
 * Không dùng framework; mọi thứ chạy trên trình duyệt.
 */
(() => {
  'use strict';

  /* ================= Tiện ích ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const view = $('#view');
  const GRADE_NAMES = ['Quên', 'Khó', 'Nhớ', 'Dễ'];
  const STATUS = { new: 'Mới', learning: 'Đang học', mastered: 'Đã thuộc' };
  const topicOf = (k) => Data.topicMap[k] || { vi: k, icon: '•' };
  const lvBadge = (l) => `<span class="lv lv-${esc(l)}">${esc(l)}</span>`;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function wordRegexes(word) {
    const base = reEsc(word);
    const trimmed = word.length > 3 ? reEsc(word.slice(0, -1)) : base;
    return [new RegExp('\\b' + base + '\\w*', 'i'), new RegExp('\\b' + trimmed + '\\w*', 'i')];
  }
  function markWord(text, word, fn) {
    for (const re of wordRegexes(word)) if (re.test(text)) return text.replace(re, fn);
    return text;
  }
  const highlight = (ex, word) => esc(markWord(ex, word, (m) => '\u0001' + m + '\u0002')).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
  const cloze = (ex, word) => esc(markWord(ex, word, () => '_____'));

  const ipaHTML = (w) => (w && w.ipa && Store.settings.showIpa !== false ? `<span class="ipa" title="Phiên âm IPA (Anh–Mỹ)">/${esc(w.ipa)}/</span>` : '');
  const isHard = (w) => { if (Store.get().flagged[w.id]) return true; const c = Store.card(w.id); return !!c && (c.lapses || 0) >= 1 && SRS.level(c) < 5; };
  const hardScore = (w) => { const c = Store.card(w.id); return ((c && c.lapses) || 0) + (Store.get().flagged[w.id] || 0) * 2; };
  const emojiHTML = (w) => (w && w.emoji && Store.settings.showEmoji !== false ? `<span class="emo" aria-hidden="true">${w.emoji}</span>` : '');

  function infoHTML(w, showWord = true) {
    return `<div class="info">
      ${showWord ? `<div class="i-word">${emojiHTML(w)}<span>${esc(w.word)}</span><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm từ ${esc(w.word)}">🔊</button></div>` : ''}
      <div class="i-vi">${esc(w.vi)}</div>
      <div class="i-def"><span class="tag">Anh–Anh</span>${esc(w.def)}</div>
      <div class="i-ex"><span class="tag">Ví dụ</span><span>${highlight(w.ex, w.word)}</span><button class="icon-btn sm" data-say="${esc(w.ex)}" aria-label="Nghe câu ví dụ">🔊</button></div>
    </div>`;
  }

  // Phát âm: mọi nút có data-say
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-say]');
    if (!b) return;
    e.stopPropagation();
    if (!TTS.ok) { toast('Trình duyệt này không hỗ trợ đọc to. Hãy thử Chrome, Edge hoặc Safari.'); return; }
    TTS.speak(b.dataset.say, { rate: b.dataset.rate ? parseFloat(b.dataset.rate) : undefined });
  }, true);

  function applyTheme() {
    const t = Store.settings.theme;
    const r = document.documentElement;
    if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  }

  /* ================= Bộ thẻ & trạng thái ================= */
  function deckPool() { return Data.words; }
  const statusOf = (w) => SRS.status(Store.card(w.id));

  function levelStats() {
    const cards = Store.get().cards;
    return Data.LEVELS.map((l) => {
      const ws = Data.words.filter((w) => w.level === l.key);
      let m = 0, lr = 0;
      ws.forEach((w) => { const s = SRS.status(cards[w.id] || null); if (s === 'mastered') m++; else if (s === 'learning') lr++; });
      return { key: l.key, name: l.name, total: ws.length, m, lr };
    });
  }

  /* ================= Định tuyến ================= */
  const routes = { learn: renderLearn, library: renderLibrary, path: renderPath, listen: renderListen, speak: renderSpeak, sound: renderSound, shadow: renderShadow, read: renderRead, settings: renderSettings };
  let currentRoute = 'learn';
  let S = null; // phiên học

  function cleanup() {
    S = null;
    L = null;
    stopSpeak();
    stopShadow();
    closeSheet();
    TTS.cancel();
    view.onclick = null; view.oninput = null; view.onchange = null; view.onsubmit = null; view.onkeydown = null;
  }

  function route() {
    cleanup();
    const parts = (location.hash.replace(/^#\/?/, '') || 'learn').split('/');
    const name = routes[parts[0]] ? parts[0] : 'learn';
    currentRoute = name;
    $$('.nav a').forEach((a) => { if (a.dataset.r === (name === 'sound' || name === 'speak' ? 'listen' : name)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    routes[name](parts[1]);
    window.scrollTo(0, 0);
  }

  /* ================= HỌC: trang chính ================= */
  const LEVEL_NAMES = SRS.LEVEL_NAMES;
  const LEVEL_HINTS = [
    'chưa học',
    'đã lật thẻ, chờ bài Nghe & chọn',
    'đã qua Nghe & chọn, chờ bài Nghe & viết',
    'đã qua Nghe & viết, ôn lại trong vài ngày',
    'nhớ được từ 7 ngày trở lên',
    'nhớ từ 21 ngày trở lên, hoặc bạn đã bấm “Đã nhớ rõ từ”'
  ];
  const mvBadge = (lv) => `<span class="mv mv-${lv}">Cấp ${lv} · ${esc(LEVEL_NAMES[lv])}</span>`;
  const KIND_LABEL = { intro: 'Từ mới', lchoose: 'Nghe & chọn', ltype: 'Nghe & viết', choice: 'Chọn nghĩa', type: 'Gõ từ' };

  function greeting() {
    const h = new Date().getHours();
    return h < 11 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  }

  function masteryCounts() {
    const cards = Store.get().cards;
    const n = [0, 0, 0, 0, 0, 0];
    Data.words.forEach((w) => { n[SRS.level(cards[w.id] || null)] += 1; });
    return n;
  }

  function renderLearn() {
    checkBadges();
    const set = Store.settings;
    const daily = Store.daily();
    const cards = Store.get().cards;
    const now = Date.now();
    let due = 0, fresh = 0;
    Data.words.forEach((w) => { const c = cards[w.id]; if (!c) fresh++; else if (c.due <= now) due++; });
    const hasLearned = fresh < Data.words.length;
    const newLeft = Math.min(fresh, Math.max(0, set.newPerDay - daily.newDone));
    const counts = masteryCounts();
    const total = Data.words.length;
    const streak = Store.streak();
    const lstats = levelStats();
    const hardList = Data.words.filter(isHard);
    const goal = Math.max(1, set.newPerDay);
    const goalPct = Math.min(100, Math.round((daily.newDone / goal) * 100));
    const hardTop = hardList.slice().sort((a, b) => hardScore(b) - hardScore(a)).slice(0, 6)
      .map((w) => `<span class="hardw">${esc(w.word)}${w.ipa ? ` <small>/${esc(w.ipa)}/</small>` : ''}</span>`).join('');

    const title = due ? `${due} thẻ cần ôn ngay` : newLeft ? 'Chưa có thẻ cần ôn, học từ mới nhé' : 'Hôm nay bạn đã học xong';
    const mrows = counts.map((n, lv) => `<div class="mrow">
        <div class="mrow-h">${mvBadge(lv)}<span class="muted">${esc(LEVEL_HINTS[lv])}</span><b>${n}</b></div>
        <div class="progress sm mp-${lv}"><i style="width:${(n / total) * 100}%"></i></div></div>`).join('');

    const lvBars = lstats.map((l) => {
      const pm = (l.m / l.total) * 100, pl = (l.lr / l.total) * 100;
      return `<div class="lvbar"><div class="lvbar-h">${lvBadge(l.key)}<span>${esc(l.name.split(' · ')[1])}</span><span class="muted">${l.m} thuộc lòng · ${l.lr} đang học · ${l.total} từ</span></div>
        <div class="progress stacked lv-${l.key}"><i class="m" style="width:${pm}%"></i><i class="l" style="width:${pl}%"></i></div></div>`;
    }).join('');

    const days = [];
    const log = Store.get().log;
    const d0 = new Date(); d0.setHours(12, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(d0); d.setDate(d.getDate() - i);
      const l = log[Store.dayKey(d.getTime())];
      days.push({ n: l ? l.n + l.r + (l.l || 0) : 0, w: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] });
    }
    const max = Math.max(10, ...days.map((x) => x.n));
    const chart = days.map((x) => `<div class="bar" title="${x.n} lượt"><i style="height:${Math.max(3, (x.n / max) * 100)}%"></i><span>${x.w}</span></div>`).join('');

    view.innerHTML = `
      <section class="hero card">
        <div class="hero-main">
          <p class="muted">${greeting()}!</p>
          <h1>${title}</h1>
          <p class="muted">${newLeft} từ mới còn lại hôm nay (giới hạn ${set.newPerDay} từ mỗi ngày). Hệ thống tự xếp từng từ vào cấp 0 đến 5 theo kết quả bài tập của bạn.</p>
          <div class="row wrap">
            <button class="btn primary lg" id="review" ${hasLearned ? '' : 'disabled'}>Ôn tập ngay${due ? ` · ${due} thẻ` : ''}</button>
            <button class="btn lg" id="learnnew" ${newLeft ? '' : 'disabled'}>Học từ mới · ${newLeft} từ</button>
            <button class="btn ghost" id="more" ${fresh - newLeft > 0 ? '' : 'disabled'}>Học thêm 10 từ mới</button>
          </div>
        </div>
        <div class="goal" aria-label="Mục tiêu hôm nay"><div class="goal-h"><span>Mục tiêu hôm nay</span><b>${Math.min(daily.newDone, goal)}/${goal} từ mới</b></div><div class="progress sm"><i style="width:${goalPct}%"></i></div><small class="muted">${daily.reviewDone} lượt ôn hôm nay${goalPct >= 100 ? '. Bạn đã đạt mục tiêu!' : ''}</small></div>
        <div class="streak" aria-label="Chuỗi ngày học liên tiếp"><b>${streak}</b><span>ngày liên tiếp</span></div>
      </section>

      ${pathCardHTML()}

      <section class="stats">
        <div class="stat"><b>${counts[5]}</b><span>thuộc lòng (cấp 5)</span></div>
        <div class="stat"><b>${counts[1] + counts[2] + counts[3] + counts[4]}</b><span>đang học (cấp 1 đến 4)</span></div>
        <div class="stat"><b>${counts[0]}</b><span>chưa học</span></div>
        <div class="stat"><b>${total}</b><span>từ trong kho</span></div>
      </section>

      <section class="card">
        <div class="card-h"><h2>Từ khó</h2><span class="muted">${hardList.length} từ hay sai</span></div>
        ${hardList.length ? `<p class="hint">Những từ bạn từng quên hoặc làm sai và chưa lên cấp 5. Luyện riêng để khắc phục.</p><div class="hardlist">${hardTop}</div><div class="row wrap"><button class="btn primary" id="hard">Luyện từ khó · ${Math.min(20, hardList.length)} từ</button></div>` : '<p class="muted">Chưa có từ khó nào. Những từ bạn làm sai sẽ được gom lại ở đây.</p>'}
      </section>

      <section class="card">
        <div class="card-h"><h2>Cấp thuộc của từng từ</h2><span class="muted">tự động cập nhật</span></div>
        <p class="hint">Mỗi từ đi qua ba bài: lật thẻ, nghe và chọn, nghe và viết. Làm đúng thì từ lên cấp, làm sai thì xuống cấp và quay lại sớm hơn. Từ nào bạn đã rõ, bấm “Đã nhớ rõ từ” để nhảy thẳng lên cấp 5.</p>
        ${mrows}
      </section>

      <section class="card">
        <div class="card-h"><h2>Theo trình độ CEFR</h2></div>
        ${lvBars}
      </section>

      <section class="card">
        <div class="card-h"><h2>14 ngày gần đây</h2><span class="muted">số lượt học mỗi ngày</span></div>
        <div class="chart">${chart}</div>
      </section>

      ${badgesHTML()}`;

    view.onclick = (e) => {
      const t = e.target.closest('button');
      if (!t || t.disabled) return;
      if (t.id === 'review') return startSession('review', 0);
      if (t.id === 'learnnew') return startSession('new', 0);
      if (t.id === 'more') return startSession('new', 10);
      if (t.id === 'hard') return startSession('hard', 0);
    };
  }

  /* ================= HỌC: phiên học ================= */
  function buildQueue(kind, extraNew) {
    const set = Store.settings;
    const daily = Store.daily();
    const now = Date.now();
    const cards = Store.get().cards;
    const pins = Store.get().pinned;
    const dueReview = [], learning = [], fresh = [], upcoming = [];
    Data.words.forEach((w) => {
      const c = cards[w.id];
      if (!c) { fresh.push(w); return; }
      if (c.due <= now) (c.state === 'review' ? dueReview : learning).push(w);
      else {
        upcoming.push(w);
        if (c.state === 'learn' && c.due - now < 20 * 60000) learning.push(w);
      }
    });
    dueReview.sort((a, b) => cards[a.id].due - cards[b.id].due);

    if (kind === 'hard') {
      const hard = Data.words.filter(isHard).sort((a, b) => hardScore(b) - hardScore(a));
      return { ids: hard.slice(0, 20).map((w) => w.id), early: false };
    }

    if (kind === 'review') {
      const reviews = dueReview.slice(0, Math.max(0, set.reviewsPerDay - daily.reviewDone));
      let list = [...learning, ...reviews];
      let early = false;
      if (!list.length && upcoming.length) {
        upcoming.sort((a, b) => cards[a.id].due - cards[b.id].due);
        list = upcoming.slice(0, 20);
        early = true;
      }
      return { ids: list.map((w) => w.id), early };
    }

    const newCount = Math.max(0, set.newPerDay - daily.newDone) + (extraNew || 0);
    const ordered = [...fresh.filter((w) => pins[w.id]), ...fresh.filter((w) => !pins[w.id])];
    return { ids: [...learning, ...ordered.slice(0, newCount)].map((w) => w.id), early: false };
  }

  function startSession(kind, extraNew) {
    const r = buildQueue(kind, extraNew || 0);
    if (!r.ids.length) { toast('Chưa có thẻ nào để học lúc này.'); return; }
    S = { queue: r.ids, total: r.ids.length, answered: 0, correct: 0, cur: null, kind };
    if (r.early) toast('Chưa có thẻ đến hạn, mình cho bạn ôn trước 20 thẻ gần đến hạn nhất.');
    nextCard();
  }

  /* Thang bài tập theo cấp: lật thẻ → nghe & chọn → nghe & viết → các bài ôn xen kẽ */
  function pickKind(c) {
    if (!c) return 'intro';
    const lv = SRS.level(c);
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    let k;
    if (lv <= 1) k = 'lchoose';
    else if (lv === 2) k = 'ltype';
    else if (lv === 3) k = r(['choice', 'type', 'ltype']);
    else if (lv === 4) k = r(['type', 'ltype', 'lchoose']);
    else k = r(['type', 'ltype']);
    if (!TTS.ok) { if (k === 'lchoose') k = 'choice'; if (k === 'ltype') k = 'type'; }
    return k;
  }

  function nextCard() {
    if (!S) return;
    if (!S.queue.length) return renderSummary();
    const id = S.queue.shift();
    const w = Data.byId.get(id);
    if (!w) return nextCard();
    const c = Store.card(id);
    S.cur = { w, c, kind: pickKind(c), flipped: false, answered: false, correct: null, options: null, dir: null, typed: '', picked: null };
    renderCard();
  }

  function sessionCounts() {
    let n = 0, l = 0, r = 0;
    [S.cur && S.cur.w.id, ...S.queue].filter(Boolean).forEach((id) => {
      const c = Store.card(id);
      if (!c) n++; else if (c.state === 'learn') l++; else r++;
    });
    return { n, l, r };
  }

  /* Hai nút duy nhất sau mỗi thẻ: Tiếp tục và Đã nhớ rõ từ */
  function actionButtons(correct) {
    const cur = S.cur;
    const c = cur.c;
    const now = Date.now();
    const lvNow = SRS.level(c);
    let next, sub;
    if (cur.kind === 'intro') { next = SRS.introduce(now); sub = 'làm bài Nghe & chọn'; }
    else { next = SRS.schedule(c, correct ? 2 : 0, now); sub = (correct ? 'ôn lại sau ' : 'học lại sau ') + SRS.label(next, now); }
    const lvNext = SRS.level(next);
    const known = SRS.master(c, now);
    return `<div class="lvchg">${mvBadge(lvNow)}<span aria-hidden="true">›</span>${mvBadge(lvNext)}</div>
      <div class="act2">
        <button class="btn primary lg" data-act="continue"><span>Tiếp tục</span><small>${esc(sub)}</small><kbd>1</kbd></button>
        ${correct ? `<button class="btn lg known" data-act="known"><span>Đã nhớ rõ từ</span><small>ôn lại sau ${esc(SRS.label(known, now))}</small><kbd>2</kbd></button>` : ''}
      </div>`;
  }

  function renderCard() {
    const cur = S.cur;
    const cnt = sessionCounts();
    const remaining = S.queue.length + 1;
    const done = S.total - Math.min(S.total, remaining);
    const pct = Math.round((done / S.total) * 100);
    view.innerHTML = `
      <section class="session">
        <div class="s-top">
          <button class="icon-btn" id="s-exit" aria-label="Thoát phiên học">✕</button>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <span class="s-count">${done}/${S.total}</span>
        </div>
        <div class="s-counts"><span class="k-new">Mới ${cnt.n}</span><span class="k-learn">Đang học ${cnt.l}</span><span class="k-rev">Ôn ${cnt.r}</span><span class="s-meta">${esc(KIND_LABEL[cur.kind])}</span></div>
        <div id="stage"></div>
        <div id="actions"></div>
      </section>`;
    view.onclick = onSessionClick;
    view.onsubmit = onSessionSubmit;
    if (cur.kind === 'intro') stageFlip();
    else if (cur.kind === 'lchoose' || cur.kind === 'choice') stageChoice();
    else stageType(cur.kind === 'ltype');
    autoSpeak();
  }

  function autoSpeak() {
    const c = S.cur;
    if (c.answered) return;
    const listen = c.kind === 'lchoose' || c.kind === 'ltype';
    if (listen || (Store.settings.autoSpeak && (c.kind === 'intro' || (c.kind === 'choice' && c.dir === 'en2vi')))) TTS.speak(c.w.word);
  }

  function stageFlip() {
    const { w, flipped } = S.cur;
    const frontHTML = `${emojiHTML(w) ? `<div class="fc-emo">${emojiHTML(w)}</div>` : ''}<div class="fc-word">${esc(w.word)}</div><div class="fc-pos">${esc(w.pos)}</div>${ipaHTML(w) ? `<div class="fc-ipa">${ipaHTML(w)}</div>` : ''}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button>`;
    const backHTML = `<div class="fc-vi">${esc(w.vi)}</div>
      <div class="fc-more"><div class="i-def"><span class="tag">Anh–Anh</span>${esc(w.def)}</div><div class="i-ex"><span class="tag">Ví dụ</span><span>${highlight(w.ex, w.word)}</span><button class="icon-btn sm" data-say="${esc(w.ex)}" aria-label="Nghe câu ví dụ">🔊</button></div></div>`;
    $('#stage').innerHTML = `<div class="fc ${flipped ? 'flipped' : ''}" id="fc" role="button" tabindex="0" aria-label="Lật thẻ">
      <div class="fc-inner">
        <div class="fc-face fc-front">${frontHTML}<span class="fc-hint">Chạm để lật</span></div>
        <div class="fc-face fc-back">${backHTML}</div>
      </div></div>`;
    $('#actions').innerHTML = flipped ? actionButtons(true) : `<button class="btn primary lg block" data-flip="1">Lật thẻ <kbd>Space</kbd></button>`;
  }

  function makeOptions(w) {
    const pool = Data.words.filter((x) => x.id !== w.id && x.vi !== w.vi && x.word.toLowerCase() !== w.word.toLowerCase());
    const same = shuffle(pool.filter((x) => x.pos === w.pos && x.level === w.level));
    const samePos = shuffle(pool.filter((x) => x.pos === w.pos));
    const any = shuffle(pool.slice());
    const picks = [];
    for (const x of [...same, ...samePos, ...any]) {
      if (picks.length >= 3) break;
      if (!picks.some((p) => p.vi === x.vi || p.word === x.word)) picks.push(x);
    }
    return shuffle([w, ...picks]);
  }

  function stageChoice() {
    const cur = S.cur;
    const w = cur.w;
    if (!cur.options) {
      cur.dir = cur.kind === 'lchoose' ? 'listen' : (Math.random() < 0.6 ? 'en2vi' : 'vi2en');
      cur.options = makeOptions(w);
    }
    let q;
    if (cur.dir === 'listen') {
      q = `<div class="prompt"><button class="btn lg" data-say="${esc(w.word)}">🔊 Nghe từ</button><button class="btn" data-say="${esc(w.word)}" data-rate="0.55">🐢 Nghe chậm</button></div><p class="muted center">Nghe và chọn nghĩa đúng</p>`;
    } else if (cur.dir === 'en2vi') {
      q = `<div class="prompt">${emojiHTML(w) ? `<div class="fc-emo">${emojiHTML(w)}</div>` : ''}<div class="fc-word">${esc(w.word)}</div><div class="fc-pos">${esc(w.pos)}</div>${ipaHTML(w)}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button></div><p class="muted center">Chọn nghĩa đúng</p>`;
    } else {
      q = `<div class="prompt"><div class="fc-vi">${esc(w.vi)}</div><div class="fc-pos">${esc(w.pos)}</div></div><p class="muted center">Chọn từ tiếng Anh đúng</p>`;
    }
    const opts = cur.options.map((o, i) => {
      let cls = 'opt';
      if (cur.answered) cls += o.id === w.id ? ' correct' : (cur.picked === o.id ? ' wrong' : ' dim');
      return `<button class="${cls}" data-opt="${esc(o.id)}" ${cur.answered ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${esc(cur.dir === 'vi2en' ? o.word : o.vi)}</span></button>`;
    }).join('');
    $('#stage').innerHTML = `${q}<div class="options">${opts}</div>${cur.answered ? `<div class="card reveal">${infoHTML(w)}</div>` : ''}`;
    $('#actions').innerHTML = cur.answered ? actionButtons(cur.correct) : '';
  }

  function stageType(listen) {
    const cur = S.cur;
    const w = cur.w;
    const hint = `${w.word.length} chữ cái, bắt đầu bằng “${esc(w.word.charAt(0))}”`;
    let body = listen
      ? `<div class="prompt"><button class="btn lg" data-say="${esc(w.word)}">🔊 Nghe từ</button><button class="btn" data-say="${esc(w.word)}" data-rate="0.55">🐢 Nghe chậm</button></div><p class="muted center">Nghe và viết lại từ bạn nghe được</p>`
      : `<div class="prompt"><div class="fc-vi">${esc(w.vi)}</div><div class="fc-pos">${esc(w.pos)}</div></div>
         <p class="cloze">${cloze(w.ex, w.word)}</p><p class="muted center">Gõ từ tiếng Anh, ${hint}</p>`;
    if (!cur.answered) {
      body += `<form class="typebox" id="tf" autocomplete="off"><input id="ti" class="input lg" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…" aria-label="Câu trả lời"><button class="btn primary" type="submit">Kiểm tra</button></form><button class="btn ghost sm center-btn" data-giveup="1">Mình không nhớ</button>`;
    } else {
      body += `<div class="result ${cur.correct ? 'ok' : 'bad'}">${cur.correct ? 'Chính xác' : `Chưa đúng. Đáp án: <b>${esc(w.word)}</b>`}${cur.typed && !cur.correct ? `<small>Bạn gõ: ${esc(cur.typed)}</small>` : ''}</div><div class="card reveal">${infoHTML(w)}</div>`;
    }
    $('#stage').innerHTML = body;
    $('#actions').innerHTML = cur.answered ? actionButtons(cur.correct) : '';
    if (!cur.answered) { const ti = $('#ti'); if (ti) ti.focus({ preventScroll: true }); }
  }

  const norm = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

  function onSessionSubmit(e) {
    e.preventDefault();
    if (!S || !S.cur || S.cur.answered) return;
    const val = ($('#ti') || {}).value || '';
    if (!val.trim()) return;
    S.cur.typed = val.trim();
    S.cur.correct = norm(val) === norm(S.cur.w.word);
    S.cur.answered = true;
    stageType(S.cur.kind === 'ltype');
    if (Store.settings.autoSpeak) TTS.speak(S.cur.w.word);
  }

  function onSessionClick(e) {
    if (!S || !S.cur) return;
    if (e.target.closest('[data-say]')) return;
    const cur = S.cur;
    const btn = e.target.closest('button');
    if (btn && btn.id === 's-exit') { if (confirm('Thoát phiên học? Tiến độ của các thẻ đã làm vẫn được lưu.')) { const back = S.back; S = null; goBack(back); } return; }
    if (btn && btn.dataset.act) return applyAction(btn.dataset.act);
    if ((btn && btn.dataset.flip) || (!btn && e.target.closest('#fc'))) {
      if (cur.kind !== 'intro') return;
      cur.flipped = btn ? true : !cur.flipped;
      stageFlip();
      return;
    }
    if (btn && btn.dataset.opt) {
      if (cur.answered) return;
      cur.picked = btn.dataset.opt;
      cur.correct = cur.picked === cur.w.id;
      cur.answered = true;
      stageChoice();
      if (Store.settings.autoSpeak && cur.dir !== 'listen') TTS.speak(cur.w.word);
      return;
    }
    if (btn && btn.dataset.giveup) { cur.correct = false; cur.typed = ''; cur.answered = true; stageType(cur.kind === 'ltype'); return; }
  }

  function applyAction(act) {
    const cur = S.cur;
    const { w, c } = cur;
    if (act === 'known' && !(cur.kind === 'intro' ? cur.flipped : cur.correct)) return;
    if (act === 'continue' && cur.kind === 'intro' && !cur.flipped) return;
    const now = Date.now();
    let nc;
    let ok = true;
    if (act === 'known') {
      nc = SRS.master(c, now);
      Store.logReview(!c, true);
    } else if (cur.kind === 'intro') {
      nc = SRS.introduce(now);
      Store.logReview(true, true);
    } else {
      ok = !!cur.correct;
      nc = SRS.schedule(c, ok ? 2 : 0, now);
      Store.logReview(false, ok);
    }
    Store.setCard(w.id, nc);
    if (ok && Store.get().flagged[w.id]) Store.flag(w.id, -1);
    if (cur.kind !== 'intro') { S.answered += 1; if (ok) S.correct += 1; }
    if (nc.state === 'learn') {
      const pos = cur.kind === 'intro' || nc.step === 0 ? Math.min(S.queue.length, 3) : S.queue.length;
      S.queue.splice(pos, 0, w.id);
    }
    nextCard();
  }

  function renderSummary() {
    const answered = S.answered;
    const acc = answered ? Math.round((S.correct / answered) * 100) : 0;
    const back = S.back || '';
    S = null;
    checkBadges();
    const cards = Store.get().cards;
    const fresh = Data.words.filter((w) => !cards[w.id]).length;
    const counts = masteryCounts();
    view.innerHTML = `
      <section class="card summary">
        <h1>Xong phiên học</h1>
        <div class="stats">
          <div class="stat"><b>${answered}</b><span>bài đã làm</span></div>
          <div class="stat"><b>${answered ? acc + '%' : '–'}</b><span>làm đúng</span></div>
          <div class="stat"><b>${counts[5]}</b><span>từ thuộc lòng</span></div>
        </div>
        <p class="muted">Các thẻ sẽ quay lại đúng lúc bạn sắp quên. Từ làm sai sẽ quay lại sau vài phút.</p>
        <div class="row wrap">
          <button class="btn primary" id="back-home">${back ? 'Quay lại bài' : 'Về trang học'}</button>
          ${back ? '' : `<button class="btn" id="more-new" ${fresh ? '' : 'disabled'}>Học thêm 10 từ mới</button>`}
        </div>
      </section>`;
    view.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.id === 'back-home') goBack(back);
      if (b.id === 'more-new') startSession('new', 10);
    };
  }

  document.addEventListener('keydown', (e) => {
    if (!S || !S.cur || currentRoute !== 'learn') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = e.key;
    const cur = S.cur;
    if (k >= '1' && k <= '4' && (cur.kind === 'lchoose' || cur.kind === 'choice') && !cur.answered) {
      const o = cur.options && cur.options[+k - 1];
      if (o) { e.preventDefault(); const b = $(`[data-opt="${(window.CSS && CSS.escape) ? CSS.escape(o.id) : o.id}"]`); if (b) b.click(); }
      return;
    }
    if (k === '1' || k === '2') {
      const b = $(k === '1' ? '[data-act="continue"]' : '[data-act="known"]');
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if ((k === ' ' || k === 'Enter') && tag !== 'button') {
      const b = $('[data-flip],[data-act="continue"]');
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (k === 'p' || k === 'P') TTS.speak(cur.w.word);
  });

  /* ================= TỪ VỰNG (thư viện) ================= */
  const lib = { level: 'all', topic: 'all', mv: 'all', pos: 'all', q: '', limit: 120 };
  const POS_NAMES = { n: 'Danh từ', v: 'Động từ', adj: 'Tính từ', adv: 'Trạng từ', pron: 'Đại từ', det: 'Từ hạn định', prep: 'Giới từ', conj: 'Liên từ', num: 'Số từ', int: 'Thán từ', phr: 'Cụm từ' };

  function libFiltered() {
    const raw = lib.q.trim().toLowerCase();
    const q = fold(raw);
    const accented = q !== raw; // người dùng gõ có dấu → so khớp có dấu để bớt nhiễu
    return Data.words.filter((w) => {
      if (lib.level !== 'all' && w.level !== lib.level) return false;
      if (lib.topic !== 'all' && w.topic !== lib.topic) return false;
      if (lib.pos !== 'all' && w.pos !== lib.pos) return false;
      if (lib.mv === 'hard') { if (!isHard(w)) return false; } else if (lib.mv !== 'all' && String(SRS.level(Store.get().cards[w.id] || null)) !== lib.mv) return false;
      if (q) {
        if (accented) return w.vi.toLowerCase().indexOf(raw) >= 0;
        if (!w._k) w._k = fold(w.word + ' ' + w.vi);
        if (w._k.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function rowHTML(w, open) {
        const pinned = !!Store.get().pinned[w.id];
    const t = topicOf(w.topic);
    return `<article class="wrow ${open ? 'open' : ''}" data-id="${esc(w.id)}">
      <div class="wrow-head" role="button" tabindex="0" aria-expanded="${!!open}">
        <div class="wrow-main">${emojiHTML(w)}<b>${esc(w.word)}</b><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<span class="vi">${esc(w.vi)}</span></div>
        <div class="wrow-meta">${lvBadge(w.level)}${mvBadge(SRS.level(Store.get().cards[w.id] || null))}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button></div>
      </div>
      <div class="wrow-body">
        ${infoHTML(w, false)}
        <div class="row wrap">
          <span class="muted">${t.icon} ${esc(t.vi)}</span>
          <button class="btn sm" data-act="pin">${pinned ? 'Bỏ ưu tiên' : 'Ưu tiên học từ này'}</button>
          <button class="btn sm" data-act="known">Đã nhớ rõ từ này</button>
          <button class="btn sm ghost" data-act="reset">Đặt lại tiến độ</button>
        </div>
      </div>
    </article>`;
  }

  function updateLib() {
    const list = libFiltered();
    const shown = list.slice(0, lib.limit);
    $('#lib-count').textContent = `Hiển thị ${shown.length} trên ${list.length} từ`;
    $('#lib-list').innerHTML = shown.length ? shown.map((w) => rowHTML(w)).join('') : '<div class="empty card">Không tìm thấy từ nào. Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</div>';
    $('#lib-more').hidden = list.length <= shown.length;
  }

  function renderLibrary() {
    const lvOpts = [`<button class="chip" data-lv="all" aria-pressed="${lib.level === 'all'}">Tất cả</button>`]
      .concat(Data.LEVELS.map((l) => `<button class="chip" data-lv="${l.key}" aria-pressed="${lib.level === l.key}">${esc(l.name)}</button>`)).join('');
    const tpOpts = ['<option value="all">Mọi chủ đề</option>'].concat(Data.TOPICS.map((t) => `<option value="${t.key}" ${lib.topic === t.key ? 'selected' : ''}>${t.icon} ${esc(t.vi)}</option>`)).join('');
    const stOpts = [['all', 'Mọi cấp thuộc'], ['hard', 'Từ khó (hay sai)']].concat(SRS.LEVEL_NAMES.map((n, i) => [String(i), 'Cấp ' + i + ' · ' + n])).map(([k, v]) => `<option value="${k}" ${lib.mv === k ? 'selected' : ''}>${v}</option>`).join('');
    const posKeys = Array.from(new Set(Data.words.map((w) => w.pos))).sort();
    const posOpts = ['<option value="all">Mọi loại từ</option>'].concat(posKeys.map((p) => `<option value="${esc(p)}" ${lib.pos === p ? 'selected' : ''}>${esc(POS_NAMES[p] || p)} (${esc(p)})</option>`)).join('');
    view.innerHTML = `
      <section class="page-h"><h1>Từ vựng</h1><p class="muted">${Data.words.length} từ, mỗi từ có nghĩa tiếng Việt, định nghĩa Anh–Anh và câu ví dụ.</p></section>
      <section class="card filters">
        <input id="q" class="input" type="search" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…" value="${esc(lib.q)}" aria-label="Tìm từ">
        <div class="chips" id="f-level">${lvOpts}</div>
        <div class="row wrap"><select id="f-topic" class="input" aria-label="Chủ đề">${tpOpts}</select><select id="f-status" class="input" aria-label="Trạng thái">${stOpts}</select><select id="f-pos" class="input" aria-label="Loại từ">${posOpts}</select></div>
      </section>
      <p class="muted" id="lib-count"></p>
      <div id="lib-list" class="wlist"></div>
      <div class="center"><button class="btn" id="lib-more" hidden>Xem thêm</button></div>`;
    updateLib();

    view.oninput = (e) => { if (e.target.id === 'q') { lib.q = e.target.value; lib.limit = 120; updateLib(); } };
    view.onchange = (e) => {
      if (e.target.id === 'f-topic') { lib.topic = e.target.value; lib.limit = 120; updateLib(); }
      if (e.target.id === 'f-pos') { lib.pos = e.target.value; lib.limit = 120; updateLib(); }
      if (e.target.id === 'f-status') { lib.mv = e.target.value; lib.limit = 120; updateLib(); }
    };
    view.onclick = (e) => {
      const chip = e.target.closest('[data-lv]');
      if (chip) { lib.level = chip.dataset.lv; lib.limit = 120; $$('#f-level .chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.lv === lib.level)); updateLib(); return; }
      if (e.target.closest('#lib-more')) { lib.limit += 120; updateLib(); return; }
      if (e.target.closest('[data-say]')) return;
      const row = e.target.closest('.wrow');
      if (!row) return;
      const act = e.target.closest('[data-act]');
      const w = Data.byId.get(row.dataset.id);
      if (act && w) {
        const a = act.dataset.act;
        if (a === 'pin') { const p = Store.get().pinned; if (p[w.id]) delete p[w.id]; else p[w.id] = 1; Store.save(); toast(p[w.id] ? 'Từ này sẽ được học sớm.' : 'Đã bỏ ưu tiên.'); }
        if (a === 'known') { Store.setCard(w.id, SRS.markKnown()); toast('Đã đưa từ lên cấp 5.'); }
        if (a === 'reset') { Store.delCard(w.id); toast('Đã đặt lại tiến độ của từ này.'); }
        row.outerHTML = rowHTML(w, true);
        if (lib.mv !== 'all') updateLib();
        return;
      }
      if (e.target.closest('.wrow-head')) {
        row.classList.toggle('open');
        row.querySelector('.wrow-head').setAttribute('aria-expanded', row.classList.contains('open'));
      }
    };
    view.onkeydown = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('wrow-head')) { e.preventDefault(); e.target.click(); }
    };
  }

  /* ================= LỘ TRÌNH ================= */
  const PASS_PCT = 70;
  const unitState = (u) => Store.get().path[u.id] || {};
  const unitDone = (u) => (unitState(u).test || 0) >= PASS_PCT;
  const unitLearned = (u) => { const cards = Store.get().cards; return u.ids.filter((id) => cards[id]).length; };
  const unitWords = (u) => u.ids.map((id) => Data.byId.get(id)).filter(Boolean);
  function unitUnlocked(u) {
    if (Store.settings.unlockAll) return true;
    const i = Data.units.indexOf(u);
    if (i <= 0) return true;
    return unitDone(Data.units[i - 1]) || unitLearned(u) > 0 || unitDone(u);
  }
  const nextUnit = () => Data.units.find((u) => !unitDone(u)) || null;
  const goBack = (hash) => { if (!hash) return renderLearn(); if (location.hash === hash) route(); else location.hash = hash; };

  function renderPath(arg) {
    const u = arg && Data.unitById.get(arg);
    if (u) return renderUnit(u);
    const total = Data.units.length;
    const done = Data.units.filter(unitDone).length;
    const nu = nextUnit();
    const levels = Data.LEVELS.map((l) => {
      const us = Data.units.filter((x) => x.level === l.key);
      const d = us.filter(unitDone).length;
      const open = nu ? nu.level === l.key : l.key === 'B1';
      const cards = us.map((x) => {
        const ok = unitDone(x);
        const un = unitUnlocked(x);
        const cur = nu && nu.id === x.id;
        const learned = unitLearned(x);
        const st = ok ? '✓' : (un ? (cur ? '▶' : '') : '🔒');
        return `<a class="ucard ${ok ? 'done' : ''} ${cur ? 'cur' : ''} ${un ? '' : 'locked'}" href="#path/${x.id}" data-unit="${x.id}" ${un ? '' : 'data-locked="1"'}>
          <span class="ucard-n">${x.n}</span><span class="ucard-i" aria-hidden="true">${x.icon}</span>
          <span class="ucard-b"><b>${esc(x.title)}</b><small class="muted">${learned}/${x.ids.length} từ đã học${unitState(x).test ? ' · kiểm tra ' + unitState(x).test + '%' : ''}</small></span>
          <span class="ucard-s" aria-hidden="true">${st}</span></a>`;
      }).join('');
      return `<details class="card lvsec" ${open ? 'open' : ''}><summary><span>${lvBadge(l.key)} <b>${esc(l.name.split(' · ')[1])}</b></span><span class="muted">${d}/${us.length} bài</span></summary><div class="ugrid">${cards}</div></details>`;
    }).join('');
    view.innerHTML = `
      <section class="page-h"><h1>Lộ trình</h1><p class="muted">Học từng bài nhỏ khoảng 10 từ: học từ, luyện nghe, luyện nói, rồi làm bài kiểm tra cuối (từ ${PASS_PCT}% trở lên là qua bài và mở bài tiếp theo).</p></section>
      <section class="card pathcard">
        <div><p class="muted">${done}/${total} bài đã hoàn thành</p>
          ${nu ? `<h2>Bài ${nu.n}: ${nu.icon} ${esc(nu.title)}</h2>` : '<h2>Bạn đã hoàn thành toàn bộ lộ trình!</h2>'}
          <div class="progress sm"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>
        ${nu ? `<a class="btn primary lg" href="#path/${nu.id}">Vào học bài này</a>` : ''}
      </section>
      ${levels}`;
    view.onclick = (e) => {
      const a = e.target.closest('[data-locked]');
      if (a) { e.preventDefault(); toast('Hãy hoàn thành bài kiểm tra của bài trước để mở bài này. Hoặc bật “Mở khóa toàn bộ lộ trình” trong Cài đặt.'); }
    };
  }

  function renderUnit(u) {
    const ws = unitWords(u);
    const st = unitState(u);
    const learned = unitLearned(u);
    const back = '#path/' + u.id;
    const done = unitDone(u);
    const canTest = learned >= Math.ceil(u.ids.length / 2) || done;
    const next = Data.units[Data.units.indexOf(u) + 1];
    const stepHTML = (n, title, desc, status, btn) => `<li class="step"><span class="step-n">${n}</span><div class="step-b"><b>${title}</b><span class="muted">${desc}</span><small class="muted">${status}</small></div>${btn}</li>`;
    const rows = ws.map((w) => `<div class="vrow">${emojiHTML(w)}<b>${esc(w.word)}</b><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<span class="vi">${esc(w.vi)}</span><button class="icon-btn sm" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button></div>`).join('');
    view.innerHTML = `
      <a class="back" href="#path">‹ Lộ trình</a>
      <section class="card">
        <div>${lvBadge(u.level)} <span class="muted">Bài ${u.n}/${Data.units.length}</span> ${done ? '<span class="st st-mastered">Đã hoàn thành</span>' : ''}</div>
        <h1>${u.icon} ${esc(u.title)}</h1>
        <ol class="steps">
          ${stepHTML(1, 'Học từ mới', 'Lật thẻ, nghe và viết từng từ.', `${learned}/${u.ids.length} từ đã học`, '<button class="btn primary" data-p="learn">Học từ</button>')}
          ${stepHTML(2, 'Luyện nghe', 'Nghe từng từ và chọn nghĩa đúng.', st.listen != null ? `Điểm tốt nhất: ${st.listen}%` : 'Chưa làm', `<button class="btn" data-p="listen" ${TTS.ok ? '' : 'disabled'}>Luyện nghe</button>`)}
          ${stepHTML(3, 'Luyện nói', 'Đọc to từng từ, xem gợi ý cách phát âm.', st.speak != null ? `Đọc đúng tốt nhất: ${st.speak}%` : 'Chưa làm', '<button class="btn" data-p="speak">Luyện nói</button>')}
          ${stepHTML(4, 'Kiểm tra cuối', `Cần đạt ${PASS_PCT}% để qua bài.`, st.test != null ? `Điểm tốt nhất: ${st.test}%` : (canTest ? 'Chưa làm' : 'Hãy học ít nhất một nửa số từ trước'), `<button class="btn ${done ? '' : 'primary'}" data-p="test" ${canTest && TTS.ok ? '' : 'disabled'}>${done ? 'Làm lại' : 'Kiểm tra'}</button>`)}
        </ol>
        <div class="row wrap">
          ${next ? `<a class="btn ${done ? 'primary' : ''}" href="#path/${next.id}">Bài tiếp theo ›</a>` : ''}
          ${done ? '' : '<button class="btn ghost sm" data-p="skip">Mình đã biết hết, bỏ qua bài này</button>'}
        </div>
      </section>
      <section class="card"><div class="card-h"><h2>Từ trong bài</h2><span class="muted">${ws.length} từ</span></div><div class="vlist">${rows}</div></section>`;
    view.onclick = (e) => {
      const b = e.target.closest('[data-p]');
      if (!b || b.disabled) return;
      const p = b.dataset.p;
      if (p === 'learn') return startUnitSession(u, back);
      if (p === 'listen') return startListen('word', { words: ws, unit: u, back });
      if (p === 'test') return startListen('test', { words: ws, unit: u, back });
      if (p === 'speak') return startSpeak(ws, 'Bài ' + u.n + ': ' + u.title, back, u);
      if (p === 'skip') {
        if (!confirm('Đánh dấu bài này là đã hoàn thành mà không kiểm tra?')) return;
        Store.setPath(u.id, { test: 100, skipped: true });
        checkBadges();
        toast('Đã bỏ qua bài này.');
        renderUnit(u);
      }
    };
  }

  function pathCardHTML() {
    const nu = nextUnit();
    if (!nu) return '';
    const done = Data.units.filter(unitDone).length;
    return `<section class="card pathcard"><div><p class="muted">Lộ trình · ${done}/${Data.units.length} bài đã xong</p><h2>Bài ${nu.n}: ${nu.icon} ${esc(nu.title)}</h2></div><a class="btn primary" href="#path/${nu.id}">Học bài này</a></section>`;
  }

  function startUnitSession(u, back) {
    const cards = Store.get().cards;
    const ids = u.ids.filter((id) => { const c = cards[id]; return !c || SRS.level(c) < 5; });
    if (!ids.length) { toast('Bạn đã thuộc hết từ của bài này. Hãy làm bài kiểm tra cuối nhé.'); return; }
    S = { queue: ids, total: ids.length, answered: 0, correct: 0, cur: null, kind: 'unit', back, unitId: u.id };
    nextCard();
  }

  /* ================= HUY HIỆU ================= */
  const BADGES = [
    { id: 'first-word', icon: '🌱', name: 'Từ đầu tiên', desc: 'Học từ vựng đầu tiên', ok: (c) => c.cards >= 1 },
    { id: 'words-100', icon: '📘', name: '100 từ đầu tiên', desc: 'Đã gặp 100 từ', ok: (c) => c.cards >= 100 },
    { id: 'words-500', icon: '📚', name: '500 từ', desc: 'Đã gặp 500 từ', ok: (c) => c.cards >= 500 },
    { id: 'words-1000', icon: '🏆', name: '1.000 từ', desc: 'Đã gặp 1.000 từ', ok: (c) => c.cards >= 1000 },
    { id: 'master-50', icon: '⭐', name: '50 từ thuộc lòng', desc: '50 từ ở cấp 5', ok: (c) => c.mastered >= 50 },
    { id: 'master-200', icon: '🌟', name: '200 từ thuộc lòng', desc: '200 từ ở cấp 5', ok: (c) => c.mastered >= 200 },
    { id: 'streak-3', icon: '🔥', name: '3 ngày liên tiếp', desc: 'Học 3 ngày liên tiếp', ok: (c) => c.streak >= 3 },
    { id: 'streak-7', icon: '🚀', name: '7 ngày liên tiếp', desc: 'Học 7 ngày liên tiếp', ok: (c) => c.streak >= 7 },
    { id: 'streak-30', icon: '💎', name: '30 ngày liên tiếp', desc: 'Học 30 ngày liên tiếp', ok: (c) => c.streak >= 30 },
    { id: 'listen-50', icon: '👂', name: '50 câu nghe', desc: 'Làm 50 câu luyện nghe', ok: (c) => c.listenN >= 50 },
    { id: 'listen-300', icon: '🎧', name: '300 câu nghe', desc: 'Làm 300 câu luyện nghe', ok: (c) => c.listenN >= 300 },
    { id: 'listen-perfect', icon: '🎯', name: 'Nghe chuẩn', desc: 'Một lượt nghe đúng cả 10 câu', ok: () => false },
    { id: 'unit-1', icon: '🚪', name: 'Bài đầu tiên', desc: 'Hoàn thành một bài lộ trình', ok: (c) => c.units >= 1 },
    { id: 'unit-10', icon: '🗺️', name: '10 bài lộ trình', desc: 'Hoàn thành 10 bài', ok: (c) => c.units >= 10 },
    { id: 'a0-done', icon: '🎓', name: 'Xong cấp A0', desc: 'Hoàn thành mọi bài nhập môn', ok: (c) => c.a0Done },
    { id: 'test-100', icon: '🥇', name: 'Điểm tuyệt đối', desc: 'Đạt 100% ở một bài kiểm tra', ok: () => false },
    { id: 'speak-1', icon: '🎤', name: 'Lần đầu luyện nói', desc: 'Hoàn thành một lượt luyện nói', ok: (c) => c.speakN >= 1 },
    { id: 'speak-30', icon: '🗣️', name: '30 từ đọc chuẩn', desc: 'Đọc đúng 30 từ', ok: (c) => c.speakOk >= 30 }
  ];

  function badgeCtx() {
    const st = Store.get();
    let mastered = 0;
    Data.words.forEach((w) => { if (SRS.level(st.cards[w.id] || null) === 5) mastered++; });
    const a0 = Data.units.filter((u) => u.level === 'A0');
    return {
      cards: Object.keys(st.cards).length,
      mastered,
      streak: Store.streak(),
      listenN: Object.keys(st.listen).reduce((a, k) => a + (st.listen[k].n || 0), 0),
      units: Data.units.filter(unitDone).length,
      a0Done: a0.length > 0 && a0.every(unitDone),
      speakN: st.speak.n,
      speakOk: st.speak.ok
    };
  }

  function checkBadges(extraIds) {
    const c = badgeCtx();
    const got = [];
    BADGES.forEach((b) => {
      const earned = (extraIds && extraIds.indexOf(b.id) >= 0) || b.ok(c);
      if (earned && Store.award(b.id)) got.push(b.icon + ' ' + b.name);
    });
    if (got.length) toast('Huy hiệu mới: ' + got.join(', '));
  }

  function badgesHTML() {
    const have = Store.get().badges;
    const n = BADGES.filter((b) => have[b.id]).length;
    return `<section class="card"><div class="card-h"><h2>Thành tích</h2><span class="muted">${n}/${BADGES.length} huy hiệu</span></div>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${have[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span class="badge-i" aria-hidden="true">${have[b.id] ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small class="muted">${esc(b.desc)}</small></div>`).join('')}</div></section>`;
  }

  /* ================= LUYỆN NÓI: đọc từ, chấm và gợi ý theo từng âm ================= */
  let SP = null;

  const SOUND_TIPS = [
    { re: /θ/, name: 'Âm /θ/ (th trong think)', tip: 'Đặt đầu lưỡi giữa hai hàm răng rồi thổi hơi ra nhẹ, không rung cổ họng. Đừng đọc thành “t” hay “s”.' },
    { re: /ð/, name: 'Âm /ð/ (th trong this)', tip: 'Đặt lưỡi giữa hai hàm răng như /θ/ nhưng có rung cổ họng. Đừng đọc thành “d” hay “z”.' },
    { re: /^[ˈˌ]?r|[aeiouæɛɪʊəɔɑ]r/, name: 'Âm /r/', tip: 'Cuộn đầu lưỡi lên nhưng không chạm vòm miệng, môi hơi tròn. Khác với “r” trong tiếng Việt.' },
    { re: /l/, name: 'Âm /l/', tip: 'Đầu lưỡi chạm vào lợi trên. Ở cuối từ vẫn giữ lưỡi chạm lợi, đừng bỏ âm.' },
    { re: /tʃ/, name: 'Âm /tʃ/ (ch)', tip: 'Chu môi, bật hơi mạnh hơn “ch” trong tiếng Việt.' },
    { re: /dʒ/, name: 'Âm /dʒ/ (j, g)', tip: 'Giống /tʃ/ nhưng có rung cổ họng, môi hơi chu.' },
    { re: /ʃ/, name: 'Âm /ʃ/ (sh)', tip: 'Chu môi, đưa lưỡi lùi lại và thổi hơi liên tục như khi bảo “suỵt”.' },
    { re: /ʒ/, name: 'Âm /ʒ/ (s trong vision)', tip: 'Giống /ʃ/ nhưng có rung cổ họng.' },
    { re: /ŋ/, name: 'Âm /ŋ/ (ng cuối từ)', tip: 'Phần cuối lưỡi chạm vòm mềm, hơi thoát ra mũi. Đừng bật thành “g” rõ ràng.' },
    { re: /v/, name: 'Âm /v/', tip: 'Răng trên chạm nhẹ môi dưới và có rung. Khác với /b/ là hai môi mím lại.' },
    { re: /z/, name: 'Âm /z/', tip: 'Giống /s/ nhưng có rung cổ họng. Đặt tay lên cổ để kiểm tra.' },
    { re: /æ/, name: 'Âm /æ/', tip: 'Há miệng rộng, âm nằm giữa “a” và “e”, như trong cat.' },
    { re: /ɪ/, name: 'Âm /ɪ/ (i ngắn)', tip: 'Ngắn, môi thả lỏng, nằm giữa “i” và “ê”. Khác với /i/ dài như trong see.' },
    { re: /i(?!ə)/, name: 'Âm /i/ (i dài)', tip: 'Kéo dài hơn, môi kéo sang hai bên như đang cười.' },
    { re: /ʊ/, name: 'Âm /ʊ/ (u ngắn)', tip: 'Ngắn, môi hơi tròn và thả lỏng, như trong book.' },
    { re: /ɛ/, name: 'Âm /ɛ/ (e)', tip: 'Miệng mở vừa, giống “e” tiếng Việt nhưng ngắn hơn.' },
    { re: /^[ˈˌ]?s[ptk]/, name: 'Cụm đầu s + phụ âm', tip: 'Đọc liền /s/ với phụ âm sau, đừng thêm âm “ơ” vào giữa (ví dụ star, không phải “sơ-ta”).' }
  ];
  const FINAL_TIPS = { p: 'p', t: 't', k: 'k', b: 'b', d: 'd', g: 'g', s: 's', z: 'z', f: 'f', v: 'v', n: 'n', m: 'm', l: 'l' };

  function soundTips(item) {
    const ipa = String(item.ipa || '');
    const out = [];
    SOUND_TIPS.forEach((t) => { if (out.length < 3 && t.re.test(ipa)) out.push({ name: t.name, tip: t.tip }); });
    const last = ipa.replace(/[ˈˌ]/g, '').slice(-1);
    if (FINAL_TIPS[last] && out.length < 4) out.push({ name: 'Âm cuối /' + last + '/', tip: 'Người Việt hay bỏ âm cuối. Hãy đọc rõ cả âm cuối /' + last + '/ ở cuối từ.' });
    return out;
  }

  function speakFeatures() {
    const single = (w) => w.word.indexOf(' ') < 0 && w.pos !== 'phr' && w.ipa;
    const base = Data.words.filter((w) => single(w) && (w.level === 'A0' || w.level === 'A1' || w.level === 'A2'));
    const test = (re) => base.filter((w) => re.test(w.ipa));
    return [
      { key: 'th', icon: '👅', name: 'Âm th: /θ/ và /ð/', desc: 'think, this, mother, three…', pool: () => test(/[θð]/) },
      { key: 'r', icon: '🌀', name: 'Âm r và l', desc: 'red, right, light, world…', pool: () => test(/^[ˈˌ]?[rl]/) },
      { key: 'sh', icon: '🤫', name: 'Âm sh, ch, j', desc: 'ship, cheap, job, watch…', pool: () => test(/[ʃʒ]|tʃ|dʒ/) },
      { key: 'ng', icon: '🔔', name: 'Âm ng cuối từ', desc: 'sing, long, morning…', pool: () => test(/ŋ/) },
      { key: 'final', icon: '🔚', name: 'Âm cuối: p, t, k, s, z', desc: 'cap, cat, back, book, bags…', pool: () => base.filter((w) => /[ptksz]$/.test(w.ipa)) },
      { key: 'vowel', icon: '🅰️', name: 'Nguyên âm dài và ngắn', desc: 'sit, seat, full, fool, bad, bed…', pool: () => test(/[ɪʊæɛ]|i(?!ə)/) },
      { key: 'hard', icon: '🧗', name: 'Từ khó của bạn', desc: 'Những từ bạn từng sai.', pool: () => Data.words.filter((w) => single(w) && isHard(w)) },
      { key: 'basic', icon: '🌱', name: 'Từ cơ bản A0, A1', desc: 'Mười từ ngẫu nhiên.', pool: () => base.filter((w) => w.level !== 'A2') }
    ];
  }

  function renderSpeak() {
    stopSpeak();
    const feats = speakFeatures();
    const cards = feats.map((f) => {
      const n = f.pool().length;
      return `<button class="lmode" data-feat="${f.key}" ${n ? '' : 'disabled'}><span class="lmode-i" aria-hidden="true">${f.icon}</span><span class="lmode-b"><b>${esc(f.name)}</b><span class="muted">${esc(f.desc)}</span><small class="muted">${n} từ</small></span></button>`;
    }).join('');
    view.innerHTML = `
      <a class="back" href="#listen">‹ Trang Nghe</a>
      <section class="page-h"><h1>Luyện nói</h1><p class="muted">Đọc to từng từ, máy sẽ nghe và cho biết bạn đọc đúng chưa, kèm gợi ý cách đặt lưỡi, môi cho các âm người Việt hay nhầm.</p></section>
      ${Recog.C ? '' : '<p class="notice">Trình duyệt này không tự chấm được giọng nói. Bạn vẫn ghi âm, nghe lại và tự đánh giá được. Dùng Chrome hoặc Edge để được chấm tự động.</p>'}
      <div class="lmodes">${cards}</div>
      <section class="card"><h2>Lưu ý</h2><p class="muted">Chấm điểm dựa vào nhận dạng giọng nói của trình duyệt nên chỉ mang tính tham khảo. Cần mở trang bằng https hoặc localhost và cho phép micro.</p></section>`;
    view.onclick = (e) => {
      const b = e.target.closest('[data-feat]');
      if (!b || b.disabled) return;
      const f = feats.find((x) => x.key === b.dataset.feat);
      const pool = f.pool();
      startSpeak(sampleN(pool, 10), f.name, '#speak', null);
    };
  }

  function stopSpeak() {
    if (!SP) return;
    SP.token++;
    clearTimeout(SP.timer);
    if (SP.rec) { Rec.stop(); Recog.stop(); }
    if (SP.url) URL.revokeObjectURL(SP.url);
    TTS.cancel();
    SP = null;
  }

  function startSpeak(words, title, back, unit) {
    stopSpeak();
    const items = words.filter((w) => w && w.word);
    if (!items.length) { toast('Chưa có từ nào để luyện.'); return; }
    SP = { items, title, back: back || '#speak', unit, i: 0, results: [], rec: false, url: null, said: null, verdict: null, token: 0, timer: null };
    drawSpeak();
  }

  function drawSpeak() {
    const it = SP.items[SP.i];
    const pct = Math.round((SP.i / SP.items.length) * 100);
    const tips = soundTips(it);
    const v = SP.verdict;
    let result = '';
    if (SP.rec) result = '<p class="muted center">Đang nghe… hãy đọc to từ trên, rồi bấm “Dừng”.</p>';
    else if (v === 'ok') result = Recog.C ? `<div class="result ok">Đọc đúng! Máy nghe được: “${esc(SP.said)}”</div>` : '<div class="result ok">Tốt lắm! Cứ tiếp tục luyện nhé.</div>';
    else if (v === 'bad') result = `<div class="result bad">${SP.said ? `Máy nghe được: “${esc(SP.said)}”. Chưa giống từ <b>${esc(it.word)}</b>.` : 'Máy chưa nghe rõ. Hãy nói to hơn và thử lại.'}</div>`;
    else if (v === 'self') result = '<div class="result">Máy không chấm được ở trình duyệt này. Hãy nghe lại bản ghi và so sánh với mẫu.</div>';
    const needSelf = v === 'self' && SP.results[SP.i] == null;
    view.innerHTML = `
      <section class="session">
        <div class="s-top"><button class="icon-btn" id="sp-exit" aria-label="Thoát">✕</button><div class="progress"><i style="width:${pct}%"></i></div><span class="s-count">${SP.i}/${SP.items.length}</span></div>
        <div class="s-counts"><span class="k-learn">Đúng ${SP.results.filter((r) => r).length}</span><span class="s-meta">${esc(SP.title)}</span></div>
        <div id="stage">
          <div class="prompt"><div class="fc-word">${it.emoji && Store.settings.showEmoji !== false ? it.emoji + ' ' : ''}${esc(it.word)}</div>${it.ipa ? `<span class="ipa">/${esc(it.ipa)}/</span>` : ''}<button class="icon-btn" data-say="${esc(it.word)}" aria-label="Nghe mẫu">🔊</button></div>
          ${it.vi ? `<p class="muted center">${esc(it.vi)}</p>` : ''}
          <div class="prompt"><button class="btn" data-say="${esc(it.word)}" data-rate="0.55">🐢 Nghe chậm</button></div>
          ${tips.length ? `<div class="card tipbox"><b>Gợi ý phát âm</b>${tips.map((t) => `<p><b>${esc(t.name)}.</b> ${esc(t.tip)}</p>`).join('')}</div>` : ''}
          <div class="prompt"><button class="btn primary lg ${SP.rec ? 'rec' : ''}" data-sp="rec" ${Rec.supported ? '' : 'disabled'}>${SP.rec ? '⏹ Dừng' : '🎤 Bấm và đọc'}</button>${SP.url ? '<button class="btn" data-sp="mine">▶ Nghe bản ghi của bạn</button>' : ''}</div>
          ${Rec.supported ? '' : '<p class="notice">Trình duyệt không cho dùng micro. Mở trang bằng https hoặc localhost trên Chrome, Edge hoặc Safari.</p>'}
          ${result}
          ${needSelf ? '<div class="row wrap center-row"><button class="btn" data-sp="selfok">Mình đọc giống mẫu</button><button class="btn" data-sp="selfbad">Mình cần luyện thêm</button></div>' : ''}
        </div>
        <div id="actions"><div class="act2"><button class="btn primary lg" data-sp="next" ${v ? '' : 'disabled'}><span>${SP.i + 1 >= SP.items.length ? 'Xem kết quả' : 'Từ tiếp theo'}</span></button><button class="btn lg" data-sp="skip"><span>Bỏ qua từ này</span></button></div></div>
      </section>`;
    view.onclick = onSpeakClick;
  }

  async function spToggleRec() {
    if (SP.rec) return spFinish();
    TTS.cancel();
    try { await Rec.start(); } catch (err) { toast('Không mở được micro. Hãy cho phép trình duyệt dùng micro (cần https hoặc localhost).'); return; }
    if (!SP) { Rec.stop(); return; }
    SP.rec = true; SP.verdict = null; SP.said = null;
    if (Recog.C) Recog.start();
    const my = ++SP.token;
    SP.timer = setTimeout(() => { if (SP && SP.token === my && SP.rec) spFinish(); }, 6000);
    drawSpeak();
  }

  async function spFinish() {
    if (!SP || !SP.rec) return;
    clearTimeout(SP.timer);
    SP.rec = false;
    const [blob, said] = await Promise.all([Rec.stop(), Recog.C ? Recog.stop() : Promise.resolve('')]);
    if (!SP) return;
    if (blob && blob.size) { if (SP.url) URL.revokeObjectURL(SP.url); SP.url = URL.createObjectURL(blob); }
    const it = SP.items[SP.i];
    if (!Recog.C) { SP.verdict = 'self'; SP.said = ''; return drawSpeak(); }
    SP.said = said;
    const ok = !!said && scoreSpeech(it.word, said).pct === 100;
    SP.verdict = ok ? 'ok' : 'bad';
    spRecord(it, ok);
    drawSpeak();
  }

  function spRecord(it, ok) {
    SP.results[SP.i] = ok;
    Store.logSpeak(ok);
    if (it.id) Store.flag(it.id, ok ? -1 : 1);
  }

  function onSpeakClick(e) {
    if (!SP) return;
    if (e.target.closest('[data-say]')) return;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'sp-exit') { if (confirm('Thoát luyện nói?')) { const back = SP.back; stopSpeak(); goBack(back); } return; }
    const a = b.dataset.sp;
    if (a === 'rec') return spToggleRec();
    if (a === 'mine') { const au = new Audio(SP.url); au.play().catch(() => {}); return; }
    if (a === 'selfok' || a === 'selfbad') { spRecord(SP.items[SP.i], a === 'selfok'); SP.verdict = a === 'selfok' ? 'ok' : 'bad'; SP.said = a === 'selfok' ? SP.items[SP.i].word : ''; return drawSpeak(); }
    if (a === 'skip' || a === 'next') {
      if (a === 'skip' && SP.results[SP.i] == null) SP.results[SP.i] = false;
      if (SP.url) { URL.revokeObjectURL(SP.url); SP.url = null; }
      SP.i += 1; SP.verdict = null; SP.said = null;
      if (SP.i >= SP.items.length) return renderSpeakSummary();
      drawSpeak();
    }
  }

  function renderSpeakSummary() {
    const total = SP.items.length;
    const ok = SP.results.filter((r) => r).length;
    const pct = Math.round((ok / total) * 100);
    const missed = SP.items.filter((it, i) => !SP.results[i]);
    const { title, back, unit } = SP;
    const items = SP.items;
    if (unit) { const prev = unitState(unit).speak || 0; Store.setPath(unit.id, { speak: Math.max(prev, pct) }); }
    checkBadges();
    SP.rec = false;
    const missHTML = missed.map((it) => {
      const tips = soundTips(it).slice(0, 2);
      return `<li><b>${esc(it.word)}</b> ${it.ipa ? `<span class="ipa">/${esc(it.ipa)}/</span>` : ''} <button class="icon-btn sm" data-say="${esc(it.word)}" aria-label="Nghe">🔊</button>${tips.map((t) => `<br><small class="muted">${esc(t.name)}: ${esc(t.tip)}</small>`).join('')}</li>`;
    }).join('');
    stopSpeakKeep();
    view.innerHTML = `
      <section class="card summary">
        <h1>Xong luyện nói</h1>
        <div class="stats"><div class="stat"><b>${ok}/${total}</b><span>từ đọc đúng</span></div><div class="stat"><b>${pct}%</b><span>chính xác</span></div></div>
        <p class="muted">${pct >= 80 ? 'Phát âm rất tốt!' : 'Hãy nghe lại mẫu, làm theo gợi ý và thử thêm lần nữa.'} Những từ đọc sai đã được thêm vào Từ khó.</p>
        ${missHTML ? `<h2>Những từ cần luyện thêm</h2><ul class="misslist">${missHTML}</ul>` : ''}
        <div class="row wrap"><button class="btn primary" id="sp-again">Luyện lại</button><button class="btn" id="sp-back">${back === '#speak' ? 'Chọn bài khác' : 'Quay lại bài'}</button></div>
      </section>`;
    view.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'sp-again') startSpeak(items, title, back, unit);
      if (b.id === 'sp-back') goBack(back);
    };
  }
  function stopSpeakKeep() { if (SP && SP.url) URL.revokeObjectURL(SP.url); SP = null; }

  /* ================= NGHE ================= */
  const LISTEN_MODES = [
    { key: 'word', icon: '👂', name: 'Nghe & chọn nghĩa', desc: 'Nghe một từ, chọn nghĩa tiếng Việt đúng.' },
    { key: 'pic', icon: '🖼️', name: 'Nghe & chọn hình', desc: 'Nghe một từ, chọn hình (emoji) đúng.' },
    { key: 'spell', icon: '✍️', name: 'Nghe & viết từ', desc: 'Nghe một từ rồi gõ lại đúng chính tả.' },
    { key: 'number', icon: '🔢', name: 'Nghe số & giá tiền', desc: 'Phân biệt 13 và 30, nghe giá tiền và số điện thoại.' },
    { key: 'clock', icon: '🕒', name: 'Nghe giờ', desc: 'Nghe giờ rồi chọn đồng hồ đúng.' },
    { key: 'order', icon: '🧩', name: 'Nghe & sắp xếp câu', desc: 'Nghe cả câu rồi chạm các từ theo đúng thứ tự.' },
    { key: 'sentence', icon: '📝', name: 'Nghe & chép câu', desc: 'Nghe cả câu, gõ lại. Hệ thống chấm từng từ.' },
    { key: 'dialog', icon: '💬', name: 'Nghe hiểu hội thoại', desc: 'Nghe một bài, trả lời 3 câu hỏi.' }
  ];
  const LISTEN_LEVELS = ['A0', 'A1', 'A2', 'B1', 'all'];
  const LISTEN_RATES = [['0.65', 'Chậm'], ['0.85', 'Vừa'], ['1', 'Nhanh']];
  const QUESTIONS_PER_ROUND = 10;
  let L = null;

  const lsetting = () => ({ level: Store.settings.listenLevel || 'A0', rate: Store.settings.listenRate || 0.85 });
  const stripSpeaker = (s) => String(s).replace(/^[A-Z][A-Za-z]*:\s*/, '');
  const sampleN = (arr, n) => shuffle(arr.slice()).slice(0, n);
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function numWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numWords(n % 100) : '');
    return numWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? (n % 1000 < 100 ? ' and ' : ' ') + numWords(n % 1000) : '');
  }

  function listenPoolWords(lv) { return Data.words.filter((w) => lv === 'all' || w.level === lv); }
  function listenSentences(lv, minW, maxW) {
    const out = [];
    const seen = new Set();
    const add = (en, vi) => {
      const t = en.trim();
      const n = t.split(/\s+/).length;
      if (n < minW || n > maxW || seen.has(t.toLowerCase())) return;
      seen.add(t.toLowerCase());
      out.push({ en: t, vi: vi || '' });
    };
    Data.texts.filter((t) => lv === 'all' || t.level === lv).forEach((t) => t.sentences.forEach((s) => add(stripSpeaker(s[0]), stripSpeaker(s[1]))));
    listenPoolWords(lv).forEach((w) => add(w.ex, ''));
    return out;
  }

  /* ----- Tạo câu hỏi ----- */
  function distractors(w, pool) {
    const base = pool.filter((x) => x.id !== w.id && x.vi !== w.vi && x.word.toLowerCase() !== w.word.toLowerCase());
    const src = base.length >= 3 ? base : Data.words.filter((x) => x.id !== w.id && x.vi !== w.vi);
    const samePos = shuffle(src.filter((x) => x.pos === w.pos));
    const rest = shuffle(src.slice());
    const picks = [];
    for (const x of [...samePos, ...rest]) {
      if (picks.length >= 3) break;
      if (!picks.some((p) => p.vi === x.vi)) picks.push(x);
    }
    return picks;
  }

  function makePicQs(lv) {
    let pool = Data.words.filter((w) => w.emoji && w.pos === 'n' && (lv === 'all' || w.level === lv));
    if (pool.length < 8) pool = Data.words.filter((w) => w.emoji && w.pos === 'n' && (w.level === 'A0' || w.level === 'A1'));
    return sampleN(pool, QUESTIONS_PER_ROUND).map((w) => {
      const seen = new Set([w.emoji]);
      const others = [];
      shuffle(pool.slice()).forEach((x) => { if (others.length < 3 && !seen.has(x.emoji)) { seen.add(x.emoji); others.push(x); } });
      const opts = shuffle([w, ...others]);
      return { type: 'pic', w, say: w.word, opts: opts.map((o) => o.emoji), a: opts.indexOf(w) };
    });
  }

  function makeTestQs(lv, opts) {
    const pool = opts.words;
    return sampleN(pool, Math.min(QUESTIONS_PER_ROUND, pool.length)).map((w, i) => {
      const canSpell = w.pos !== 'phr' && w.word.indexOf(' ') < 0 && w.word.length <= 14;
      if (i % 2 === 1 && canSpell) return { type: 'spell', w, say: w.word };
      const o = shuffle([w, ...distractors(w, pool)]);
      return { type: 'word', w, say: w.word, opts: o.map((x) => x.vi), a: o.indexOf(w) };
    });
  }

  function makeWordQs(lv, opts) {
    const unitPool = opts && opts.words;
    const pool = unitPool || listenPoolWords(lv);
    return sampleN(pool, unitPool ? Math.min(QUESTIONS_PER_ROUND, pool.length) : QUESTIONS_PER_ROUND).map((w) => {
      const opts = shuffle([w, ...distractors(w, pool)]);
      return { type: 'word', w, say: w.word, opts: opts.map((o) => o.vi), a: opts.indexOf(w) };
    });
  }
  function makeSpellQs(lv) {
    const pool = listenPoolWords(lv).filter((w) => w.pos !== 'phr');
    return sampleN(pool, QUESTIONS_PER_ROUND).map((w) => ({ type: 'spell', w, say: w.word }));
  }
  function makeSentenceQs(lv, kind) {
    const lo = lv === 'A0' ? 2 : 3;
    const hi = kind === 'order' ? (lv === 'A0' || lv === 'A1' ? 7 : 9) : (lv === 'A0' ? 8 : lv === 'A1' ? 10 : 15);
    return sampleN(listenSentences(lv, lo, hi), QUESTIONS_PER_ROUND).map((s) => ({ type: kind, s, say: s.en }));
  }

  function makeNumberQs(lv) {
    const qs = [];
    const confus = [[13, 30], [14, 40], [15, 50], [16, 60], [17, 70], [18, 80], [19, 90]];
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const roll = Math.random();
      let q;
      if (lv === 'A0' || roll < 0.45) {
        let n;
        if (roll < 0.3 || lv === 'A0') n = Math.random() < 0.45 ? confus[rnd(0, 6)][rnd(0, 1)] : rnd(0, 100);
        else n = lv === 'A1' ? rnd(100, 999) : rnd(1000, 99999);
        q = { type: 'number', kind: 'num', say: numWords(n), answer: String(n), prompt: 'Gõ con số bạn nghe được (chỉ gõ chữ số).' };
      } else if (roll < 0.75) {
        const d = lv === 'A1' ? rnd(1, 99) : rnd(1, 450);
        const c = [0, 25, 50, 75, 99][rnd(0, 4)];
        const say = numWords(d) + ' dollar' + (d === 1 ? '' : 's') + (c ? ' and ' + numWords(c) + ' cents' : '');
        q = { type: 'number', kind: 'price', say, answer: c ? d + '.' + String(c).padStart(2, '0') : String(d), prompt: 'Gõ giá tiền bằng đô la, ví dụ 12.50 hoặc 7.' };
      } else {
        const len = lv === 'A1' ? 5 : 7;
        let digits = '';
        for (let k = 0; k < len; k++) digits += String(rnd(0, 9));
        q = { type: 'number', kind: 'phone', say: digits.split('').map((x) => ONES[+x]).join(', '), answer: digits, prompt: 'Máy đọc từng chữ số. Gõ lại dãy số bạn nghe được.' };
      }
      qs.push(q);
    }
    return qs;
  }

  function timeSay(h, m) {
    const hh = (x) => numWords(((x - 1 + 12) % 12) + 1);
    if (m === 0) return `It is ${hh(h)} o'clock.`;
    if (m === 15) return `It is a quarter past ${hh(h)}.`;
    if (m === 30) return `It is half past ${hh(h)}.`;
    if (m === 45) return `It is a quarter to ${hh(h + 1)}.`;
    if (m < 30) return `It is ${numWords(m)} past ${hh(h)}.`;
    return `It is ${numWords(60 - m)} to ${hh(h + 1)}.`;
  }
  const timeStr = (h, m) => (((h - 1 + 12) % 12) + 1) + ':' + String(m).padStart(2, '0');
  function clockSVG(h, m) {
    const hand = (deg, len, w) => {
      const r = (deg - 90) * Math.PI / 180;
      return `<line x1="50" y1="50" x2="${(50 + len * Math.cos(r)).toFixed(1)}" y2="${(50 + len * Math.sin(r)).toFixed(1)}" stroke-width="${w}" stroke-linecap="round"/>`;
    };
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const r = i * 30 * Math.PI / 180;
      ticks += `<line x1="${(50 + 40 * Math.sin(r)).toFixed(1)}" y1="${(50 - 40 * Math.cos(r)).toFixed(1)}" x2="${(50 + 44 * Math.sin(r)).toFixed(1)}" y2="${(50 - 44 * Math.cos(r)).toFixed(1)}" stroke-width="2"/>`;
    }
    return `<svg viewBox="0 0 100 100" class="clock" aria-hidden="true"><g stroke="currentColor" fill="none"><circle cx="50" cy="50" r="46" stroke-width="3"/>${ticks}${hand((h % 12) * 30 + m * 0.5, 24, 5)}${hand(m * 6, 36, 3)}</g></svg>`;
  }
  function makeClockQs(lv) {
    const mins = lv === 'A0' ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const qs = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const h = 1 + Math.floor(Math.random() * 12);
      const m = mins[Math.floor(Math.random() * mins.length)];
      const set = new Map([[timeStr(h, m), [h, m]]]);
      const tries = [[h, mins[(mins.indexOf(m) + 1) % mins.length]], [h % 12 + 1, m], [(h + 10) % 12 + 1, m], [h, (60 - m) % 60], [h % 12 + 1, (60 - m) % 60], [h, mins[Math.floor(Math.random() * mins.length)]]];
      for (const t of shuffle(tries)) { if (set.size >= 4) break; if (!set.has(timeStr(t[0], t[1]))) set.set(timeStr(t[0], t[1]), t); }
      while (set.size < 4) { const hh = 1 + Math.floor(Math.random() * 12); const mm = mins[Math.floor(Math.random() * mins.length)]; set.set(timeStr(hh, mm), [hh, mm]); }
      const list = shuffle(Array.from(set.values()));
      const idx = list.findIndex((t) => t[0] === h && t[1] === m);
      qs.push({ type: 'clock', say: timeSay(h, m), times: list, a: idx, answerText: timeStr(h, m) });
    }
    return qs;
  }

  function makeDialogQs(lv) {
    const texts = Data.texts.filter((t) => Data.quiz[t.id] && (lv === 'all' || t.level === lv));
    if (!texts.length) return null;
    const t = texts[Math.floor(Math.random() * texts.length)];
    const qs = Data.quiz[t.id].map((it) => {
      const order = shuffle(it.o.map((x, i) => i));
      return { type: 'dialog', text: t, q: it.q, v: it.v, opts: order.map((i) => it.o[i]), a: order.indexOf(it.a) };
    });
    return qs;
  }

  /* ----- Điều khiển phiên ----- */
  const wordsOf = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const modeOf = (k) => LISTEN_MODES.find((m) => m.key === k) || { name: 'Kiểm tra cuối bài' };

  function startListen(mode, opts) {
    opts = opts || {};
    const { level, rate } = lsetting();
    const builders = { word: makeWordQs, pic: makePicQs, test: makeTestQs, spell: makeSpellQs, number: makeNumberQs, clock: makeClockQs, order: (lv) => makeSentenceQs(lv, 'order'), sentence: (lv) => makeSentenceQs(lv, 'sentence'), dialog: makeDialogQs };
    const qs = builders[mode](level, opts);
    if (!qs || !qs.length) { toast('Chưa có đủ dữ liệu ở cấp này. Hãy chọn cấp khác.'); return; }
    L = { mode, level, rate, qs, i: 0, score: 0, missed: [], cur: null, answered: false, token: 0, phase: mode === 'dialog' ? 'intro' : 'q', built: [], picked: null, voices: null, showText: false, opts, back: opts.back || '', flagged: new Set() };
    if (mode === 'dialog') return renderDialogIntro();
    nextListenQ();
  }

  function listenFrame(inner, footer) {
    const pct = Math.round((L.i / L.qs.length) * 100);
    view.innerHTML = `
      <section class="session">
        <div class="s-top">
          <button class="icon-btn" id="l-exit" aria-label="Thoát bài nghe">✕</button>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <span class="s-count">${L.i}/${L.qs.length}</span>
        </div>
        <div class="s-counts"><span class="k-learn">Đúng ${L.score}</span><span class="s-meta">${esc(modeOf(L.mode).name)} · ${L.opts && L.opts.unit ? 'Bài ' + L.opts.unit.n : (L.level === 'all' ? 'mọi cấp' : esc(L.level))}</span></div>
        <div id="stage">${inner}</div>
        <div id="actions">${footer || ''}</div>
      </section>`;
    view.onclick = onListenClick;
    view.onsubmit = onListenSubmit;
  }

  const listenAudio = (say, extra = '') => `<div class="prompt"><button class="btn lg" data-say="${esc(say)}" data-rate="${L.rate}">🔊 Nghe <kbd>P</kbd></button><button class="btn" data-say="${esc(say)}" data-rate="0.55">🐢 Nghe chậm <kbd>S</kbd></button>${extra}</div>`;

  function nextListenQ() {
    if (!L) return;
    if (L.i >= L.qs.length) return renderListenSummary();
    L.cur = L.qs[L.i];
    L.answered = false;
    L.picked = null;
    L.built = [];
    L.hint = false;
    L.typed = '';
    drawListenQ();
    if (L.cur.type !== 'dialog') TTS.speak(L.cur.say, { rate: L.rate });
  }

  function optionsHTML(labels, q, extraFn) {
    return `<div class="options">${labels.map((lab, i) => {
      let cls = 'opt';
      if (L.answered) cls += i === q.a ? ' correct' : (L.picked === i ? ' wrong' : ' dim');
      return `<button class="${cls}" data-opt="${i}" ${L.answered ? 'disabled' : ''}><kbd>${i + 1}</kbd>${extraFn ? extraFn(i) : ''}<span>${lab}</span></button>`;
    }).join('')}</div>`;
  }

  function continueBtn() {
    return `<button class="btn primary lg block" data-l="next">${L.i + 1 >= L.qs.length ? 'Xem kết quả' : 'Tiếp tục'} <kbd>Enter</kbd></button>`;
  }

  function typeFormHTML(placeholder, hintBtn) {
    return `<form class="typebox" id="lf" autocomplete="off"><input id="li" class="input lg" type="text" inputmode="${L.cur.type === 'number' ? 'decimal' : 'text'}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(placeholder)}" aria-label="Câu trả lời"><button class="btn primary" type="submit">Kiểm tra</button></form>
      <div class="row wrap center-row">${hintBtn || ''}<button class="btn ghost sm" data-l="giveup">Mình không nghe ra</button></div>`;
  }

  function drawListenQ() {
    const q = L.cur;
    const done = L.answered;
    let stage = '';
    let foot = '';
    if (q.type === 'word') {
      stage = `${listenAudio(q.say)}<p class="muted center">Nghe và chọn nghĩa đúng</p>${optionsHTML(q.opts.map(esc), q)}${done ? `<div class="card reveal">${infoHTML(q.w)}</div>` : ''}`;
    } else if (q.type === 'pic') {
      const items = q.opts.map((em, i) => {
        let cls = 'opt opt-pic';
        if (L.answered) cls += i === q.a ? ' correct' : (L.picked === i ? ' wrong' : ' dim');
        return `<button class="${cls}" data-opt="${i}" ${L.answered ? 'disabled' : ''}><kbd>${i + 1}</kbd><span class="pic">${em}</span></button>`;
      }).join('');
      stage = `${listenAudio(q.say)}<p class="muted center">Nghe và chọn hình đúng</p><div class="options pics">${items}</div>${done ? `<div class="card reveal">${infoHTML(q.w)}</div>` : ''}`;
    } else if (q.type === 'spell') {
      const hint = L.hint ? `<p class="muted center">Gợi ý: ${q.w.word.length} chữ cái, bắt đầu bằng “${esc(q.w.word.charAt(0))}”</p>` : '';
      stage = `${listenAudio(q.say)}<p class="muted center">Nghe và viết lại từ bạn nghe được</p>${hint}`;
      if (!done) stage += typeFormHTML('Gõ từ tiếng Anh…', '<button class="btn ghost sm" data-l="hint">Gợi ý</button>');
      else stage += `<div class="result ${q.ok ? 'ok' : 'bad'}">${q.ok ? 'Chính xác' : `Chưa đúng. Đáp án: <b>${esc(q.w.word)}</b>`}${L.typed && !q.ok ? `<small>Bạn gõ: ${esc(L.typed)}</small>` : ''}</div><div class="card reveal">${infoHTML(q.w)}</div>`;
    } else if (q.type === 'sentence') {
      stage = `${listenAudio(q.say)}<p class="muted center">Nghe cả câu và gõ lại. Không cần viết hoa hay dấu câu.</p>`;
      if (!done) stage += typeFormHTML('Gõ lại câu bạn nghe được…');
      else stage += sentenceResultHTML(q);
    } else if (q.type === 'order') {
      const chips = (q.chips || (q.chips = shuffle(q.s.en.split(/\s+/).map((t, i) => ({ t, i }))))).map((c) => {
        const used = L.built.indexOf(c.i) >= 0;
        return `<button class="chip-w ${used ? 'used' : ''}" data-chip="${c.i}" ${used || done ? 'disabled' : ''}>${esc(c.t)}</button>`;
      }).join('');
      const built = L.built.map((i) => `<button class="chip-w on" data-unchip="${i}" ${done ? 'disabled' : ''}>${esc(q.s.en.split(/\s+/)[i])}</button>`).join('');
      stage = `${listenAudio(q.say)}<p class="muted center">Chạm các từ theo đúng thứ tự bạn nghe được</p>
        <div class="buildbox ${done ? (q.ok ? 'ok' : 'bad') : ''}" aria-label="Câu của bạn">${built || '<span class="muted">Câu của bạn sẽ hiện ở đây…</span>'}</div>
        <div class="chipbank">${chips}</div>
        ${done ? `<div class="result ${q.ok ? 'ok' : 'bad'}">${q.ok ? 'Chính xác' : `Chưa đúng. Câu đúng: <b>${esc(q.s.en)}</b>`}${q.s.vi ? `<small>${esc(q.s.vi)}</small>` : ''}</div>` : `<div class="row wrap center-row"><button class="btn primary" data-l="check" ${L.built.length === q.s.en.split(/\s+/).length ? '' : 'disabled'}>Kiểm tra</button><button class="btn ghost sm" data-l="clear">Xóa làm lại</button></div>`}`;
    } else if (q.type === 'number') {
      stage = `${listenAudio(q.say)}<p class="muted center">${esc(q.prompt)}</p>`;
      if (!done) stage += typeFormHTML('Gõ số…');
      else stage += `<div class="result ${q.ok ? 'ok' : 'bad'}">${q.ok ? 'Chính xác' : `Chưa đúng. Đáp án: <b>${esc(q.kind === 'price' ? '$' + q.answer : q.answer)}</b>`}${L.typed && !q.ok ? `<small>Bạn gõ: ${esc(L.typed)}</small>` : ''}<small>Máy đọc: “${esc(q.say)}”</small></div>`;
    } else if (q.type === 'clock') {
      stage = `${listenAudio(q.say)}<p class="muted center">Nghe và chọn đồng hồ đúng</p>
        ${optionsHTML(q.times.map((t) => esc(timeStr(t[0], t[1]))), q, (i) => clockSVG(q.times[i][0], q.times[i][1]))}
        ${done ? `<div class="result ${q.ok ? 'ok' : 'bad'}">“${esc(q.say)}” = <b>${esc(q.answerText)}</b></div>` : ''}`;
    } else if (q.type === 'dialog') {
      stage = `<div class="prompt"><button class="btn" data-l="playall">🔊 Nghe lại cả bài</button><button class="btn" data-l="playslow">🐢 Nghe chậm</button></div>
        <h2 class="center qtext">${esc(q.q)}</h2><p class="muted center">${esc(q.v)}</p>${optionsHTML(q.opts.map(esc), q)}`;
    }
    if (done) foot = continueBtn();
    else if (q.type === 'word' || q.type === 'pic' || q.type === 'clock' || q.type === 'dialog') foot = '';
    listenFrame(stage, foot);
    if (!done && (q.type === 'spell' || q.type === 'sentence' || q.type === 'number')) { const li = $('#li'); if (li) { li.value = L.typed || ''; li.focus({ preventScroll: true }); } }
  }

  function sentenceResultHTML(q) {
    const r = scoreSpeech(q.s.en, L.typed);
    const words = r.T.map((w, k) => `<span class="${r.matched[k] ? 'okw' : 'missw'}">${esc(w)}</span>`).join(' ');
    return `<div class="result ${q.ok ? 'ok' : 'bad'}">${q.ok ? 'Chính xác' : `Đúng ${r.pct}% số từ`}<div class="sc-words">${words}</div><small>Câu đầy đủ: ${esc(q.s.en)}</small>${q.s.vi ? `<small>${esc(q.s.vi)}</small>` : ''}${!q.ok && L.typed ? `<small>Bạn gõ: ${esc(L.typed)}</small>` : ''}</div>`;
  }

  function finishAnswer(ok) {
    const q = L.cur;
    q.ok = ok;
    L.answered = true;
    if (ok) L.score += 1;
    else L.missed.push(q);
    Store.logListen(L.mode, ok);
    if (q.w) { Store.flag(q.w.id, ok ? -1 : 1); if (!ok) L.flagged.add(q.w.id); }
    drawListenQ();
  }

  function checkTyped(val) {
    const q = L.cur;
    L.typed = val.trim();
    if (!L.typed) return;
    let ok = false;
    if (q.type === 'spell') ok = norm(L.typed) === norm(q.w.word);
    else if (q.type === 'sentence') { const a = wordsOf(q.s.en), b = wordsOf(L.typed); ok = a.length === b.length && a.every((x, i) => x === b[i]); }
    else if (q.type === 'number') {
      const clean = L.typed.replace(/[\s,\-$]/g, '');
      ok = q.kind === 'phone' ? clean === q.answer : (!isNaN(parseFloat(clean)) && Math.abs(parseFloat(clean) - parseFloat(q.answer)) < 0.001);
    }
    finishAnswer(ok);
  }

  function onListenSubmit(e) {
    e.preventDefault();
    if (!L || !L.cur || L.answered) return;
    checkTyped(($('#li') || {}).value || '');
  }

  function onListenClick(e) {
    if (!L) return;
    if (e.target.closest('[data-say]')) return;
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'l-exit') { if (confirm('Thoát bài nghe? Kết quả các câu đã làm vẫn được lưu.')) { const b = L.back; L = null; TTS.cancel(); if (b) goBack(b); else renderListen(); } return; }
    if (btn.id === 'l-start') { L.phase = 'q'; nextListenQ(); return; }
    if (btn.id === 'l-again') return startListen(L.mode, L.opts);
    if (btn.id === 'l-hub') { const b = L.back; L = null; return b ? goBack(b) : renderListen(); }
    if (btn.id === 'l-next-unit') { const id = btn.dataset.id; L = null; location.hash = '#path/' + id; return; }
    if (btn.id === 'l-toggle') { L.showText = !L.showText; return renderDialogIntro(); }
    if (btn.dataset.l === 'playall' || btn.dataset.l === 'playslow') { return listenPlayAll(btn.dataset.l === 'playslow' ? 0.55 : L.rate); }
    const q = L.cur;
    if (!q) return;
    if (btn.dataset.l === 'next') { L.i += 1; return nextListenQ(); }
    if (L.answered) return;
    if (btn.dataset.opt != null) { L.picked = +btn.dataset.opt; return finishAnswer(L.picked === q.a); }
    if (btn.dataset.l === 'hint') { L.hint = true; L.typed = ($('#li') || {}).value || ''; return drawListenQ(); }
    if (btn.dataset.l === 'giveup') { L.typed = ''; return finishAnswer(false); }
    if (btn.dataset.chip != null) { L.built.push(+btn.dataset.chip); return drawListenQ(); }
    if (btn.dataset.unchip != null) { L.built.splice(L.built.indexOf(+btn.dataset.unchip), 1); return drawListenQ(); }
    if (btn.dataset.l === 'clear') { L.built = []; return drawListenQ(); }
    if (btn.dataset.l === 'check') {
      const toks = q.s.en.split(/\s+/);
      L.typed = L.built.map((i) => toks[i]).join(' ');
      const a = wordsOf(q.s.en), b = wordsOf(L.typed);
      return finishAnswer(a.length === b.length && a.every((x, i) => x === b[i]));
    }
  }

  document.addEventListener('keydown', (e) => {
    if (currentRoute !== 'listen' || !L || (!L.cur && L.phase !== 'intro')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = e.key;
    if (L.phase === 'intro') { if (k === 'Enter') { const b = $('#l-start'); if (b) { e.preventDefault(); b.click(); } } return; }
    if (!L.cur) return;
    if (k === 'p' || k === 'P') { if (L.cur.type === 'dialog') listenPlayAll(L.rate); else TTS.speak(L.cur.say, { rate: L.rate }); return; }
    if (k === 's' || k === 'S') { if (L.cur.type === 'dialog') listenPlayAll(0.55); else TTS.speak(L.cur.say, { rate: 0.55 }); return; }
    if (k >= '1' && k <= '4' && !L.answered) { const b = $(`[data-opt="${+k - 1}"]`); if (b) { e.preventDefault(); b.click(); } return; }
    if ((k === 'Enter' || (k === ' ' && tag !== 'button')) && L.answered) { const b = $('[data-l="next"]'); if (b) { e.preventDefault(); b.click(); } }
  });

  /* ----- Hội thoại nhiều giọng ----- */
  function dialogVoices() {
    const vs = TTS.voices();
    const us = vs.filter((v) => /en[-_]US/i.test(v.lang));
    const pool = us.length >= 2 ? us : vs;
    return pool.length >= 2 ? [pool[0], pool[1]] : null;
  }
  async function listenPlayAll(rate) {
    if (!L) return;
    const text = L.qs[0].text;
    const my = ++L.token;
    if (!L.voices) L.voices = dialogVoices() || [];
    const speakers = [];
    TTS.cancel();
    for (const s of text.sentences) {
      if (!L || L.token !== my) return;
      const m = /^([A-Z][A-Za-z]*):/.exec(s[0]);
      let voice = null;
      if (m && L.voices.length) { if (speakers.indexOf(m[1]) < 0) speakers.push(m[1]); voice = L.voices[speakers.indexOf(m[1]) % 2]; }
      await TTS.speak(stripSpeaker(s[0]), { rate, voice });
      await sleep(280);
    }
  }

  function renderDialogIntro() {
    const t = L.qs[0].text;
    const lines = L.showText ? `<div class="transcript">${t.sentences.map((s) => `<p>${esc(s[0])}<br><small class="muted">${esc(s[1])}</small></p>`).join('')}</div>` : '<p class="hint">Lời thoại đang được ẩn để bạn luyện nghe. Nghe xong thì bấm “Bắt đầu trả lời”. Cần thì bấm “Xem lời thoại”.</p>';
    listenFrame(`<div class="card center-card"><div>${lvBadge(t.level)} <span class="muted">${esc(t.kind)}</span></div><h2>${esc(t.title)}</h2><p class="muted">${esc(t.titleVi)}</p>
      <div class="prompt"><button class="btn lg" data-l="playall">▶ Nghe cả bài</button><button class="btn" data-l="playslow">🐢 Nghe chậm</button></div></div>
      ${lines}`,
      `<div class="act2"><button class="btn primary lg" id="l-start"><span>Bắt đầu trả lời</span><kbd>Enter</kbd></button><button class="btn lg" id="l-toggle"><span>${L.showText ? 'Ẩn lời thoại' : 'Xem lời thoại'}</span></button></div>`);
    $('.s-count').textContent = '0/' + L.qs.length;
  }

  function renderListenSummary() {
    const total = L.qs.length;
    const pct = Math.round((L.score / total) * 100);
    const mode = L.mode;
    const msg = pct >= 90 ? 'Tuyệt vời! Bạn nghe rất tốt.' : pct >= 70 ? 'Khá tốt. Luyện thêm một lượt nữa nhé.' : pct >= 40 ? 'Cần luyện thêm. Hãy nghe chậm rồi nghe lại.' : 'Đừng nản. Hãy thử cấp thấp hơn hoặc giảm tốc độ nghe.';
    const unit = L.opts && L.opts.unit;
    let unitMsg = '';
    let nextId = '';
    if (unit) {
      if (mode === 'test') {
        const prev = unitState(unit).test || 0;
        Store.setPath(unit.id, { test: Math.max(prev, pct) });
        const passed = pct >= PASS_PCT;
        const nx = Data.units[Data.units.indexOf(unit) + 1];
        unitMsg = passed ? `<div class="result ok">Bạn đã qua bài ${unit.n}!${nx ? ' Bài tiếp theo đã được mở.' : ''}</div>` : `<div class="result bad">Cần đạt ${PASS_PCT}% để qua bài. Hãy ôn lại các từ sai rồi thử lại.</div>`;
        if (passed && nx) nextId = nx.id;
      } else {
        const prev = unitState(unit).listen || 0;
        Store.setPath(unit.id, { listen: Math.max(prev, pct) });
      }
    }
    const extra = [];
    if (L.score === total && total >= 7 && mode !== 'test') extra.push('listen-perfect');
    if (mode === 'test' && pct === 100) extra.push('test-100');
    checkBadges(extra);
    const flagNote = L.flagged.size ? `<p class="muted">${L.flagged.size} từ đã được thêm vào danh sách Từ khó để ôn lại.</p>` : '';
    const missed = L.missed.map((q) => {
      let line;
      if (q.type === 'word' || q.type === 'pic' || q.type === 'spell') line = `<b>${esc(q.w.word)}</b>${q.w.ipa ? ` <span class="ipa">/${esc(q.w.ipa)}/</span>` : ''} · ${esc(q.w.vi)}`;
      else if (q.type === 'sentence' || q.type === 'order') line = esc(q.s.en);
      else if (q.type === 'number') line = `${esc(q.say)} = <b>${esc(q.answer)}</b>`;
      else if (q.type === 'clock') line = `${esc(q.say)} = <b>${esc(q.answerText)}</b>`;
      else line = `${esc(q.q)} · <b>${esc(q.opts[q.a])}</b>`;
      return `<li>${line}${q.say ? ` <button class="icon-btn sm" data-say="${esc(q.say)}" aria-label="Nghe lại">🔊</button>` : ''}</li>`;
    }).join('');
    const transcript = mode === 'dialog' ? `<div class="transcript">${L.qs[0].text.sentences.map((s) => `<p>${esc(s[0])}<br><small class="muted">${esc(s[1])}</small></p>`).join('')}</div>` : '';
    view.innerHTML = `
      <section class="card summary">
        <h1>Xong bài nghe</h1>
        <div class="stats">
          <div class="stat"><b>${L.score}/${total}</b><span>câu đúng</span></div>
          <div class="stat"><b>${pct}%</b><span>chính xác</span></div>
        </div>
        <p class="muted">${msg}</p>
        ${unitMsg}${flagNote}
        ${missed ? `<h2>Những câu cần nghe lại</h2><ul class="misslist">${missed}</ul>` : ''}
        ${transcript}
        <div class="row wrap">${nextId ? `<button class="btn primary" id="l-next-unit" data-id="${nextId}">Bài tiếp theo ›</button>` : ''}<button class="btn ${nextId ? '' : 'primary'}" id="l-again">${mode === 'test' ? 'Làm lại' : 'Làm lượt khác'}</button><button class="btn" id="l-hub">${L.back ? 'Quay lại bài' : 'Chọn bài nghe khác'}</button></div>
      </section>`;
    view.onclick = onListenClick;
    L.cur = null;
  }

  function renderListen() {
    L = null;
    const { level, rate } = lsetting();
    const st = Store.get().listen || {};
    const lvChips = LISTEN_LEVELS.map((k) => `<button class="chip" data-llv="${k}" aria-pressed="${level === k}">${k === 'all' ? 'Tất cả cấp' : (Data.LEVELS.find((l) => l.key === k) || {}).name}</button>`).join('');
    const rateChips = LISTEN_RATES.map(([v, n]) => `<button class="chip" data-lrate="${v}" aria-pressed="${String(rate) === v}">${n}</button>`).join('');
    const cards = LISTEN_MODES.map((m, i) => {
      const s = st[m.key];
      return `<button class="lmode" data-lmode="${m.key}" ${TTS.ok ? '' : 'disabled'}>
        <span class="lmode-i" aria-hidden="true">${m.icon}</span>
        <span class="lmode-b"><b>${i + 1}. ${esc(m.name)}</b><span class="muted">${esc(m.desc)}</span>
        <small class="muted">${s && s.n ? `Đã làm ${s.n} câu, đúng ${Math.round((s.ok / s.n) * 100)}%` : 'Chưa làm lần nào'}</small></span></button>`;
    }).join('');
    view.innerHTML = `
      <section class="page-h"><h1>Nghe</h1><p class="muted">Luyện nghe từ dễ đến khó. Mỗi lượt 10 câu, nghe lại không giới hạn.</p></section>
      ${TTS.ok ? '' : '<p class="notice">Trình duyệt này không hỗ trợ đọc to nên không luyện nghe được. Hãy dùng Chrome, Edge hoặc Safari.</p>'}
      <section class="card">
        <h2>Cấp độ</h2><div class="chips" id="l-levels">${lvChips}</div>
        <h2>Tốc độ nghe</h2><div class="chips" id="l-rates">${rateChips}</div>
        <p class="hint">Mới bắt đầu? Chọn <b>A0</b> và đi theo thứ tự 1 đến 7. Nghe chưa rõ thì dùng nút “Nghe chậm”, phím tắt: P nghe, S nghe chậm, 1 đến 4 chọn đáp án, Enter tiếp tục.</p>
      </section>
      <div class="lmodes">${cards}</div>
      <section class="card">
        <h2>Luyện nói</h2>
        <p class="muted">Đọc to từng từ, máy chấm và gợi ý cách phát âm các âm khó (th, r, sh, âm cuối…).</p>
        <a class="btn" href="#speak">Mở luyện nói</a>
      </section>
      <section class="card">
        <h2>Phát âm: cặp âm dễ nhầm</h2>
        <p class="muted">Luyện phân biệt ship và sheep, light và right, think và sink…</p>
        <a class="btn" href="#sound">Mở luyện phát âm</a>
      </section>`;
    view.onclick = (e) => {
      const lv = e.target.closest('[data-llv]');
      if (lv) { Store.settings.listenLevel = lv.dataset.llv; Store.save(); return renderListen(); }
      const rt = e.target.closest('[data-lrate]');
      if (rt) { Store.settings.listenRate = parseFloat(rt.dataset.lrate); Store.save(); return renderListen(); }
      const md = e.target.closest('[data-lmode]');
      if (md && !md.disabled) startListen(md.dataset.lmode);
    };
  }

  /* ================= PHÁT ÂM: cặp âm dễ nhầm ================= */
  let sq = { group: 'all', cur: null, picked: null, score: 0, total: 0, streak: 0 };

  function sqNext() {
    const groups = sq.group === 'all' ? Data.pairs : [Data.pairs[+sq.group]].filter(Boolean);
    const all = [];
    groups.forEach((g) => g.pairs.forEach((p) => all.push({ g, p })));
    if (!all.length) { sq.cur = null; return; }
    const pick = all[Math.floor(Math.random() * all.length)];
    sq.cur = { sound: pick.g.sound, p: pick.p, target: Math.random() < 0.5 ? 0 : 1 };
    sq.picked = null;
  }

  function drawQuiz() {
    const box = $('#pquiz');
    if (!box) return;
    const c = sq.cur;
    if (!c) {
      box.innerHTML = `<p class="muted">Máy sẽ đọc ngẫu nhiên một trong hai từ của một cặp âm. Bạn nghe và chọn đúng từ đó.</p>
        <button class="btn primary lg" data-q="start">Bắt đầu luyện tai</button>${sq.total ? `<p class="muted">Lần trước: ${sq.score}/${sq.total} câu đúng</p>` : ''}`;
      return;
    }
    const word = c.p[c.target * 2];
    const opts = [0, 1].map((i) => {
      let cls = 'opt';
      if (sq.picked != null) cls += i === c.target ? ' correct' : (sq.picked === i ? ' wrong' : ' dim');
      return `<button class="${cls}" data-q="pick" data-i="${i}" ${sq.picked != null ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${esc(c.p[i * 2])}${sq.picked != null ? ` <span class="ipa">/${esc(c.p[i * 2 + 1])}/</span>` : ''}</span></button>`;
    }).join('');
    const done = sq.picked != null;
    box.innerHTML = `<div class="row between wrap"><span class="muted">Cặp âm: <b>${esc(c.sound)}</b></span><span class="muted">Điểm ${sq.score}/${sq.total} · chuỗi đúng ${sq.streak}</span></div>
      <div class="prompt"><button class="btn lg" data-say="${esc(word)}">🔊 Nghe từ</button><button class="btn" data-say="${esc(word)}" data-rate="0.55">🐢 Nghe chậm</button></div>
      <p class="muted center">Bạn nghe thấy từ nào?</p>
      <div class="options">${opts}</div>
      ${done ? `<div class="result ${sq.picked === c.target ? 'ok' : 'bad'}">${sq.picked === c.target ? 'Chính xác' : 'Chưa đúng'}: <b>${esc(word)}</b> <span class="ipa">/${esc(c.p[c.target * 2 + 1])}/</span></div><button class="btn primary lg block" data-q="next">Câu tiếp theo <kbd>Space</kbd></button>` : ''}`;
  }

  function renderSound() {
    sq.cur = null; sq.picked = null;
    const gOpts = ['<option value="all">Tất cả cặp âm</option>'].concat(Data.pairs.map((g, i) => `<option value="${i}" ${String(sq.group) === String(i) ? 'selected' : ''}>${esc(g.sound)}</option>`)).join('');
    const groups = Data.pairs.map((g) => `<section class="card">
        <div class="card-h"><h2>${esc(g.sound)}</h2></div>
        <p class="hint">${esc(g.tip)}</p>
        <div class="pairs">${g.pairs.map((p) => `<div class="pair">
          <div class="pair-w"><b>${esc(p[0])}</b><span class="ipa">/${esc(p[1])}/</span><button class="icon-btn sm" data-say="${esc(p[0])}" aria-label="Nghe ${esc(p[0])}">🔊</button></div>
          <span class="muted">vs</span>
          <div class="pair-w"><b>${esc(p[2])}</b><span class="ipa">/${esc(p[3])}/</span><button class="icon-btn sm" data-say="${esc(p[2])}" aria-label="Nghe ${esc(p[2])}">🔊</button></div>
        </div>`).join('')}</div></section>`).join('');
    view.innerHTML = `
      <a class="back" href="#listen">‹ Trang Nghe</a>
      <section class="page-h"><h1>Phát âm</h1><p class="muted">Luyện phân biệt các cặp âm dễ nhầm với người Việt. Phiên âm theo IPA Anh–Mỹ. Giọng đọc do trình duyệt tạo ra, nên hãy nghe thêm nguồn khác nếu thấy khó phân biệt.</p></section>
      <section class="card">
        <div class="card-h"><h2>Luyện tai</h2><select id="pq-group" class="input" aria-label="Chọn cặp âm">${gOpts}</select></div>
        <div id="pquiz"></div>
      </section>
      ${groups || '<div class="empty card">Chưa có dữ liệu cặp âm.</div>'}`;
    drawQuiz();
    view.onchange = (e) => { if (e.target.id === 'pq-group') { sq.group = e.target.value; sq.cur = null; sq.picked = null; drawQuiz(); } };
    view.onclick = (e) => {
      const b = e.target.closest('button[data-q]');
      if (!b || b.disabled) return;
      const q = b.dataset.q;
      if (q === 'start' || q === 'next') { sqNext(); drawQuiz(); if (sq.cur) TTS.speak(sq.cur.p[sq.cur.target * 2]); return; }
      if (q === 'pick' && sq.cur && sq.picked == null) {
        sq.picked = +b.dataset.i;
        sq.total += 1;
        if (sq.picked === sq.cur.target) { sq.score += 1; sq.streak += 1; } else sq.streak = 0;
        drawQuiz();
      }
    };
  }

  document.addEventListener('keydown', (e) => {
    if (currentRoute !== 'sound' || !sq.cur) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    let b = null;
    if ((e.key === '1' || e.key === '2') && sq.picked == null) b = $(`#pquiz [data-q="pick"][data-i="${+e.key - 1}"]`);
    else if ((e.key === ' ' || e.key === 'Enter') && sq.picked != null && tag !== 'button') b = $('#pquiz [data-q="next"]');
    else if (e.key === 'p' || e.key === 'P') { TTS.speak(sq.cur.p[sq.cur.target * 2]); return; }
    if (b) { e.preventDefault(); b.click(); }
  });

  /* ================= Danh sách bài (Shadowing / Dịch bài) ================= */
  let textLevel = 'all';

  function renderTextList(mode) {
    const isShadow = mode === 'shadow';
    const list = Data.texts.filter((t) => textLevel === 'all' || t.level === textLevel);
    const chips = ['all'].concat(Data.LEVELS.map((l) => l.key)).map((k) => `<button class="chip" data-flv="${k}" aria-pressed="${textLevel === k}">${k === 'all' ? 'Tất cả' : Data.LEVELS.find((l) => l.key === k).name}</button>`).join('');
    const cards = list.map((t) => {
      const ts = Store.get().texts[t.id];
      const done = ts ? (isShadow ? ts.shadow.length : ts.done.length) : 0;
      return `<a class="tcard" href="#${mode}/${t.id}">
        <div class="tcard-h">${lvBadge(t.level)}<span class="muted">${esc(t.kind)}</span></div>
        <h3>${esc(t.title)}</h3><p class="muted">${esc(t.titleVi)}</p>
        <div class="progress sm"><i style="width:${(done / t.sentences.length) * 100}%"></i></div>
        <small class="muted">${done}/${t.sentences.length} câu ${isShadow ? 'đã luyện' : 'đã dịch'}</small>
      </a>`;
    }).join('');
    view.innerHTML = `
      <section class="page-h"><h1>${isShadow ? 'Shadowing' : 'Dịch bài'}</h1>
        <p class="muted">${isShadow ? 'Nghe câu mẫu, nhại lại thật giống nhịp điệu và ngữ điệu, rồi nghe lại bản ghi của bạn để so sánh.' : 'Đọc bài theo cấp độ, bấm vào từ để tra nghĩa, rồi tự dịch từng câu và đối chiếu.'}</p></section>
      <div class="chips">${chips}</div>
      <div class="textgrid">${cards || '<div class="empty card">Chưa có bài ở cấp độ này.</div>'}</div>`;
    view.onclick = (e) => {
      const c = e.target.closest('[data-flv]');
      if (c) { textLevel = c.dataset.flv; renderTextList(mode); }
    };
  }

  /* ================= SHADOWING ================= */
  let sh = null;
  const Rec = {
    supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    stream: null, mr: null, chunks: [],
    async start() {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mr = new MediaRecorder(this.stream);
      this.chunks = [];
      this.mr.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      this.mr.start();
    },
    stop() {
      return new Promise((resolve) => {
        if (!this.mr || this.mr.state === 'inactive') { this.release(); return resolve(null); }
        this.mr.onstop = () => {
          const blob = new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' });
          this.release();
          resolve(blob);
        };
        this.mr.stop();
      });
    },
    release() { if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
  };
  const Recog = {
    C: window.SpeechRecognition || window.webkitSpeechRecognition,
    r: null, text: '',
    start() {
      if (!this.C) return;
      try {
        const r = new this.C();
        r.lang = 'en-US'; r.interimResults = true; r.continuous = true;
        this.text = '';
        r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; this.text = t.trim(); };
        r.onerror = () => {};
        r.start();
        this.r = r;
      } catch (err) { this.r = null; }
    },
    stop() {
      return new Promise((resolve) => {
        const r = this.r;
        if (!r) return resolve('');
        this.r = null;
        let done = false;
        const fin = () => { if (done) return; done = true; resolve(this.text); };
        r.onend = fin;
        try { r.stop(); } catch (e) { fin(); }
        setTimeout(fin, 1500);
      });
    }
  };

  function scoreSpeech(target, said) {
    const nz = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
    const T = nz(target), U = nz(said);
    const dp = Array.from({ length: T.length + 1 }, () => new Array(U.length + 1).fill(0));
    for (let i = 1; i <= T.length; i++) for (let j = 1; j <= U.length; j++) dp[i][j] = T[i - 1] === U[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const matched = new Array(T.length).fill(false);
    let i = T.length, j = U.length;
    while (i > 0 && j > 0) {
      if (T[i - 1] === U[j - 1]) { matched[i - 1] = true; i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
    }
    const hit = matched.filter(Boolean).length;
    return { T, matched, pct: T.length ? Math.round((hit / T.length) * 100) : 0 };
  }

  function stopAudio() { if (sh && sh.audio) { try { sh.audio.pause(); } catch (e) { /* bỏ qua */ } sh.audio = null; } }

  function stopShadow() {
    if (!sh) return;
    sh.token++;
    stopAudio();
    TTS.cancel();
    if (sh.recIdx != null) { Rec.stop(); Recog.stop(); }
    Object.values(sh.urls).forEach((u) => URL.revokeObjectURL(u));
    sh = null;
  }

  function renderShadow(arg) {
    const t = arg && Data.texts.find((x) => x.id === arg);
    if (t) return renderShadowDetail(t);
    renderTextList('shadow');
  }

  function renderShadowDetail(t) {
    sh = { text: t, rate: Math.min(1.2, Store.settings.rate || 0.9), showVi: false, score: !!Recog.C, recIdx: null, token: 0, urls: {}, audio: null, active: -1 };
    const rows = t.sentences.map((s, i) => {
      const toks = s[0].split(/(\s+)/).map((p) => (/\S/.test(p) ? `<span class="tw">${esc(p)}</span>` : p)).join('');
      return `<li class="sent" data-i="${i}">
        <div class="sent-n">${i + 1}</div>
        <div class="sent-body">
          <p class="sent-en">${toks}</p>
          <p class="sent-vi" hidden>${esc(s[1])}</p>
          <div class="sent-score" hidden></div>
          <div class="sent-ctl">
            <button class="btn sm" data-a="play">🔊 Nghe</button>
            <button class="btn sm" data-a="rec" ${Rec.supported ? '' : 'disabled'}>⏺ Ghi âm</button>
            <button class="btn sm" data-a="mine" disabled>▶ Bản ghi của bạn</button>
            <button class="btn sm" data-a="auto" ${Rec.supported ? '' : 'disabled'}>⚡ Nghe rồi nhại</button>
          </div>
        </div></li>`;
    }).join('');
    view.innerHTML = `
      <a class="back" href="#shadow">‹ Danh sách bài</a>
      <section class="card">
        <div class="card-h"><div>${lvBadge(t.level)} <span class="muted">${esc(t.kind)}</span><h1>${esc(t.title)}</h1><p class="muted">${esc(t.titleVi)}</p></div></div>
        ${TTS.ok ? '' : '<p class="notice">Trình duyệt này không hỗ trợ đọc to, nên không phát được câu mẫu. Hãy dùng Chrome, Edge hoặc Safari.</p>'}
        ${Rec.supported ? '' : '<p class="notice">Trình duyệt này không cho ghi âm. Mở trang bằng https hoặc localhost trên Chrome, Edge hoặc Safari để dùng micro.</p>'}
        <div class="toolbar">
          <button class="btn primary" id="sh-all">▶ Nghe cả bài</button>
          <button class="btn" id="sh-stop">■ Dừng</button>
          <label class="rate">Tốc độ <input type="range" id="sh-rate" min="0.5" max="1.2" step="0.05" value="${sh.rate}"><output id="sh-rate-o">${sh.rate.toFixed(2)}×</output></label>
          <label class="switch"><input type="checkbox" id="sh-vi"><span>Hiện bản dịch</span></label>
          <label class="switch" ${Recog.C ? '' : 'title="Cần Chrome hoặc Edge"'}><input type="checkbox" id="sh-score" ${sh.score ? 'checked' : ''} ${Recog.C ? '' : 'disabled'}><span>Chấm điểm phát âm</span></label>
        </div>
        <p class="hint">Cách luyện: nghe câu mẫu, bấm “Ghi âm” và đọc lại thật giống, rồi bấm “Bản ghi của bạn” để nghe so sánh. “Nghe rồi nhại” làm cả ba bước tự động. Điểm phát âm chỉ mang tính tham khảo vì phụ thuộc vào nhận dạng giọng nói của trình duyệt.</p>
        <ol class="sents">${rows}</ol>
      </section>`;

    view.oninput = (e) => {
      if (e.target.id === 'sh-rate') { sh.rate = parseFloat(e.target.value); $('#sh-rate-o').textContent = sh.rate.toFixed(2) + '×'; }
    };
    view.onchange = (e) => {
      if (e.target.id === 'sh-vi') { sh.showVi = e.target.checked; $$('.sent-vi').forEach((p) => { p.hidden = !sh.showVi; }); }
      if (e.target.id === 'sh-score') sh.score = e.target.checked;
    };
    view.onclick = async (e) => {
      const b = e.target.closest('button');
      if (!b || !sh) return;
      if (b.id === 'sh-all') return playAll();
      if (b.id === 'sh-stop') return haltAll();
      const row = b.closest('.sent');
      if (!row) return;
      const i = parseInt(row.dataset.i, 10);
      const a = b.dataset.a;
      if (a === 'play') { haltAll(); await playSentence(i); }
      if (a === 'rec') await toggleRec(i);
      if (a === 'mine') { haltAll(); await playMine(i); }
      if (a === 'auto') autoShadow(i);
    };
  }

  function setActive(i) {
    $$('.sent').forEach((r) => r.classList.toggle('active', +r.dataset.i === i));
    sh.active = i;
    const row = $(`.sent[data-i="${i}"]`);
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function playSentence(i) {
    if (!sh) return;
    const text = sh.text.sentences[i][0];
    const row = $(`.sent[data-i="${i}"]`);
    setActive(i);
    const spans = $$('.tw', row);
    const offs = [];
    let pos = 0, k = 0;
    text.split(/(\s+)/).forEach((p) => {
      if (/\S/.test(p)) { offs.push({ s: pos, e: pos + p.length, el: spans[k++] }); }
      pos += p.length;
    });
    const clear = () => spans.forEach((s) => s.classList.remove('on'));
    await TTS.speak(text, {
      rate: sh.rate,
      onboundary: (ev) => {
        if (ev.name && ev.name !== 'word') return;
        const o = offs.find((x) => ev.charIndex >= x.s && ev.charIndex < x.e);
        if (o) { clear(); o.el.classList.add('on'); }
      }
    });
    clear();
  }

  async function playAll() {
    if (!sh) return;
    haltAll();
    const my = ++sh.token;
    for (let i = 0; i < sh.text.sentences.length; i++) {
      if (!sh || sh.token !== my) return;
      await playSentence(i);
      await sleep(350);
    }
  }

  function haltAll() {
    if (!sh) return;
    sh.token++;
    TTS.cancel();
    stopAudio();
    if (sh.recIdx != null) finishRec(sh.recIdx);
  }

  function playMine(i) {
    if (!sh || !sh.urls[i]) return Promise.resolve();
    stopAudio();
    return new Promise((resolve) => {
      const a = new Audio(sh.urls[i]);
      sh.audio = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }

  function setRecUI(i, on) {
    const row = $(`.sent[data-i="${i}"]`);
    if (!row) return;
    const b = $('[data-a="rec"]', row);
    b.textContent = on ? '⏹ Dừng ghi' : '⏺ Ghi âm';
    b.classList.toggle('rec', on);
  }

  async function beginRec(i) {
    try { await Rec.start(); } catch (err) {
      toast('Không mở được micro. Hãy cho phép trình duyệt dùng micro (cần https hoặc localhost).');
      return false;
    }
    sh.recIdx = i;
    if (sh.score) Recog.start();
    setRecUI(i, true);
    return true;
  }

  async function finishRec(i) {
    if (!sh || sh.recIdx !== i) return;
    sh.recIdx = null;
    setRecUI(i, false);
    const [blob, said] = await Promise.all([Rec.stop(), sh.score ? Recog.stop() : Promise.resolve('')]);
    if (!sh) return;
    if (blob && blob.size) {
      if (sh.urls[i]) URL.revokeObjectURL(sh.urls[i]);
      sh.urls[i] = URL.createObjectURL(blob);
      const row = $(`.sent[data-i="${i}"]`);
      if (row) $('[data-a="mine"]', row).disabled = false;
      const ts = Store.textState(sh.text.id);
      if (ts.shadow.indexOf(i) < 0) { ts.shadow.push(i); Store.save(); }
    }
    if (sh.score) showScore(i, said);
  }

  function showScore(i, said) {
    const row = $(`.sent[data-i="${i}"]`);
    if (!row) return;
    const box = $('.sent-score', row);
    box.hidden = false;
    if (!said) { box.innerHTML = '<span class="muted">Không nhận dạng được giọng nói. Hãy thử nói to và rõ hơn, hoặc tắt chấm điểm và tự so sánh bằng tai.</span>'; return; }
    const r = scoreSpeech(sh.text.sentences[i][0], said);
    const words = r.T.map((w, k) => `<span class="${r.matched[k] ? 'okw' : 'missw'}">${esc(w)}</span>`).join(' ');
    const msg = r.pct >= 85 ? 'Rất tốt' : r.pct >= 60 ? 'Khá tốt, thử lại những từ màu đỏ' : 'Hãy nghe lại câu mẫu và thử thêm lần nữa';
    box.innerHTML = `<b>${r.pct}%</b> <span>${msg}</span><div class="sc-words">${words}</div><small class="muted">Máy nghe được: “${esc(said)}”</small>`;
  }

  async function toggleRec(i) {
    if (sh.recIdx === i) return finishRec(i);
    haltAll();
    await beginRec(i);
  }

  async function autoShadow(i) {
    if (!sh) return;
    haltAll();
    const my = ++sh.token;
    await playSentence(i);
    if (!sh || sh.token !== my) return;
    const ok = await beginRec(i);
    if (!ok) return;
    const words = sh.text.sentences[i][0].split(/\s+/).length;
    await sleep(Math.max(2500, (words * 60000) / 140 / sh.rate + 1200));
    if (!sh || sh.token !== my) return;
    if (sh.recIdx === i) await finishRec(i);
    if (!sh || sh.token !== my) return;
    await playMine(i);
  }

  /* ================= DỊCH BÀI ================= */
  let rd = null;

  function renderRead(arg) {
    const t = arg && Data.texts.find((x) => x.id === arg);
    if (t) return renderReadDetail(t);
    renderTextList('read');
  }

  function wordify(text) {
    return text.split(/([A-Za-z]+(?:['’][A-Za-z]+)?)/).map((p, i) => (i % 2 ? `<button class="rw" data-w="${esc(p)}">${esc(p)}</button>` : esc(p))).join('');
  }

  function textVocab(t) {
    const seen = new Map();
    t.sentences.forEach((s) => {
      (s[0].match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || []).forEach((tok) => {
        const w = Data.lookup(tok);
        if (w && !seen.has(w.id)) seen.set(w.id, w);
      });
    });
    const lv = (k) => Data.LEVELS.findIndex((l) => l.key === k);
    return Array.from(seen.values()).sort((a, b) => lv(b.level) - lv(a.level) || a.word.localeCompare(b.word));
  }

  function renderReadDetail(t) {
    rd = { text: t, mode: 'read', showAll: false };
    const ts = Store.textState(t.id);
    const vocab = textVocab(t).filter((w) => (w.level !== 'A1' && w.level !== 'A0') || t.level === 'A1' || t.level === 'A0').slice(0, 30);
    const vocabHTML = vocab.map((w) => `<div class="vrow"><b>${esc(w.word)}</b><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<span class="vi">${esc(w.vi)}</span>${lvBadge(w.level)}<button class="icon-btn sm" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button></div>`).join('');
    view.innerHTML = `
      <a class="back" href="#read">‹ Danh sách bài</a>
      <section class="card">
        <div class="card-h"><div>${lvBadge(t.level)} <span class="muted">${esc(t.kind)}</span><h1>${esc(t.title)}</h1><p class="muted">${esc(t.titleVi)}</p></div></div>
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-m="read" aria-selected="true">Đọc và tra từ</button>
          <button class="tab" role="tab" data-m="trans" aria-selected="false">Tự dịch</button>
        </div>
        <div id="read-body"></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>Từ vựng trong bài</h2><span class="muted">${vocab.length} từ có trong kho</span></div>
        <div class="vlist">${vocabHTML || '<p class="muted">Chưa tìm thấy từ nào trong kho.</p>'}</div>
      </section>`;
    drawRead(ts);

    view.onclick = (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        rd.mode = tab.dataset.m;
        $$('.tab').forEach((x) => x.setAttribute('aria-selected', x === tab));
        drawRead(Store.textState(t.id));
        return;
      }
      const w = e.target.closest('.rw');
      if (w) return openSheet(w.dataset.w);
      if (e.target.closest('[data-say]')) return;
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'rd-toggle') { rd.showAll = !rd.showAll; drawRead(Store.textState(t.id)); return; }
      const box = b.closest('.rsent');
      if (!box) return;
      const i = parseInt(box.dataset.i, 10);
      if (b.dataset.a === 'vi') { const p = $('.rsent-vi', box); p.hidden = !p.hidden; b.textContent = p.hidden ? 'Hiện bản dịch' : 'Ẩn bản dịch'; }
      if (b.dataset.a === 'say') { TTS.speak(t.sentences[i][0]); }
      if (b.dataset.a === 'check') {
        $('.rsent-vi', box).hidden = false;
        b.hidden = true;
        $('[data-a="done"]', box).hidden = false;
      }
      if (b.dataset.a === 'done') {
        const st = Store.textState(t.id);
        if (st.done.indexOf(i) < 0) st.done.push(i);
        Store.save();
        b.textContent = 'Đã hoàn thành';
        b.disabled = true;
        $('#rd-progress').textContent = st.done.length + '/' + t.sentences.length + ' câu đã dịch';
      }
    };
    view.oninput = (e) => {
      if (e.target.classList.contains('draft')) {
        const i = e.target.closest('.rsent').dataset.i;
        const st = Store.textState(t.id);
        st.drafts[i] = e.target.value;
        Store.save();
      }
    };
  }

  function drawRead(ts) {
    const t = rd.text;
    const body = $('#read-body');
    if (rd.mode === 'read') {
      body.innerHTML = `<div class="row between wrap"><p class="hint">Bấm vào một từ để xem nghĩa. Nghĩ trước bản dịch của câu, rồi mới bấm “Hiện bản dịch”.</p><button class="btn sm" id="rd-toggle">${rd.showAll ? 'Ẩn mọi bản dịch' : 'Hiện mọi bản dịch'}</button></div>
        ${t.sentences.map((s, i) => `<div class="rsent" data-i="${i}">
          <p class="rsent-en">${wordify(s[0])}</p>
          <p class="rsent-vi" ${rd.showAll ? '' : 'hidden'}>${esc(s[1])}</p>
          <div class="row wrap"><button class="btn sm ghost" data-a="vi">${rd.showAll ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</button><button class="btn sm ghost" data-a="say">🔊 Nghe câu</button></div>
        </div>`).join('')}`;
    } else {
      body.innerHTML = `<div class="row between wrap"><p class="hint">Tự dịch từng câu sang tiếng Việt, bấm “Đối chiếu” để xem bản dịch tham khảo, rồi tự đánh giá. Bản nháp của bạn được lưu trong trình duyệt.</p><span class="muted" id="rd-progress">${ts.done.length}/${t.sentences.length} câu đã dịch</span></div>
        ${t.sentences.map((s, i) => `<div class="rsent" data-i="${i}">
          <p class="rsent-en">${wordify(s[0])}</p>
          <textarea class="input draft" rows="2" placeholder="Bản dịch của bạn…" aria-label="Bản dịch câu ${i + 1}">${esc((ts.drafts && ts.drafts[i]) || '')}</textarea>
          <p class="rsent-vi" hidden><span class="tag">Tham khảo</span>${esc(s[1])}</p>
          <div class="row wrap"><button class="btn sm" data-a="check">Đối chiếu</button><button class="btn sm primary" data-a="done" hidden ${ts.done.indexOf(i) >= 0 ? 'disabled' : ''}>${ts.done.indexOf(i) >= 0 ? 'Đã hoàn thành' : 'Tự đánh giá: đã hiểu ý'}</button><button class="btn sm ghost" data-a="say">🔊 Nghe câu</button></div>
        </div>`).join('')}`;
    }
  }

  /* Bảng tra từ */
  let sheetEl = null;
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
  function openSheet(token) {
    closeSheet();
    const w = Data.lookup(token);
    const pinned = w && Store.get().pinned[w.id];
    const inner = w
      ? `<div class="sheet-h">${lvBadge(w.level)}<span class="muted">${esc(topicOf(w.topic).icon)} ${esc(topicOf(w.topic).vi)}</span></div>${infoHTML(w)}
         <div class="row wrap"><button class="btn sm" id="sheet-pin">${pinned ? 'Bỏ ghim khỏi bộ thẻ' : 'Ghim vào bộ thẻ học'}</button></div>`
      : `<div class="i-word"><span>${esc(token)}</span><button class="icon-btn" data-say="${esc(token)}" aria-label="Phát âm">🔊</button></div>
         <p class="muted">Từ này chưa có trong kho của hiuhf0.</p>
         <a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(token.toLowerCase())}">Tra trên Cambridge</a>`;
    sheetEl = document.createElement('div');
    sheetEl.className = 'sheet-backdrop';
    sheetEl.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Tra từ"><button class="icon-btn sheet-x" id="sheet-x" aria-label="Đóng">✕</button>${inner}</div>`;
    document.body.appendChild(sheetEl);
    sheetEl.addEventListener('click', (e) => {
      if (e.target === sheetEl || e.target.id === 'sheet-x') return closeSheet();
      if (e.target.id === 'sheet-pin' && w) {
        const p = Store.get().pinned;
        if (p[w.id]) delete p[w.id]; else p[w.id] = 1;
        Store.save();
        toast(p[w.id] ? 'Từ này sẽ được học sớm.' : 'Đã bỏ ưu tiên.');
        closeSheet();
      }
    });
    if (w && Store.settings.autoSpeak) TTS.speak(w.word);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* ================= CÀI ĐẶT ================= */
  function renderSettings() {
    const s = Store.settings;
    const sel = (cur, arr) => arr.map(([v, l]) => `<option value="${v}" ${String(cur) === v ? 'selected' : ''}>${l}</option>`).join('');
    const voices = TTS.voices();
    const voiceOpts = ['<option value="">Tự chọn giọng tốt nhất</option>'].concat(voices.map((v) => `<option value="${esc(v.name)}" ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`)).join('');
    view.innerHTML = `
      <section class="page-h"><h1>Cài đặt</h1><p class="muted">Mọi thiết lập và tiến độ học được lưu ngay trong trình duyệt này.</p></section>
      <section class="card form">
        <h2>Học tập</h2>
        <label class="field"><span>Số từ mới mỗi ngày</span><input class="input" type="number" min="1" max="100" id="s-new" value="${s.newPerDay}"></label>
        <label class="field"><span>Số thẻ ôn tối đa mỗi ngày</span><input class="input" type="number" min="10" max="1000" id="s-rev" value="${s.reviewsPerDay}"></label>
        <label class="field row"><input type="checkbox" id="s-ipa" ${s.showIpa !== false ? 'checked' : ''}><span>Hiện phiên âm IPA (Anh–Mỹ) trên thẻ và trong thư viện</span></label>
        <label class="field row"><input type="checkbox" id="s-emoji" ${s.showEmoji !== false ? 'checked' : ''}><span>Hiện emoji minh họa cho từ cụ thể</span></label>
        <label class="field row"><input type="checkbox" id="s-unlock" ${s.unlockAll ? 'checked' : ''}><span>Mở khóa toàn bộ lộ trình (không cần qua bài kiểm tra)</span></label>
        <label class="field row"><input type="checkbox" id="s-auto" ${s.autoSpeak ? 'checked' : ''}><span>Tự động đọc từ khi hiện thẻ</span></label>
      </section>
      <section class="card form">
        <h2>Giọng đọc</h2>
        <label class="field"><span>Giọng</span><select class="input" id="s-voice">${voiceOpts}</select></label>
        <label class="field"><span>Tốc độ đọc mặc định: <output id="s-rate-o">${Number(s.rate).toFixed(2)}×</output></span><input type="range" id="s-rate" min="0.5" max="1.2" step="0.05" value="${s.rate}"></label>
        <button class="btn sm" id="s-test" ${TTS.ok ? '' : 'disabled'}>🔊 Thử giọng</button>
        ${TTS.ok ? '' : '<p class="notice">Trình duyệt này không hỗ trợ đọc to.</p>'}
      </section>
      <section class="card form">
        <h2>Giao diện</h2>
        <label class="field"><span>Chế độ màu</span><select class="input" id="s-theme">${sel(s.theme, [['auto', 'Theo hệ thống'], ['light', 'Sáng'], ['dark', 'Tối']])}</select></label>
      </section>
      <section class="card form">
        <h2>Dữ liệu</h2>
        <p class="hint">Tiến độ nằm trong localStorage của trình duyệt, nên đổi máy hoặc xóa dữ liệu trình duyệt sẽ mất. Hãy xuất file sao lưu định kỳ.</p>
        <div class="row wrap">
          <button class="btn" id="s-export">Xuất file sao lưu</button>
          <label class="btn" for="s-import">Nhập file sao lưu</label>
          <input type="file" id="s-import" accept="application/json,.json" hidden>
          <button class="btn danger" id="s-reset">Xóa toàn bộ tiến độ</button>
        </div>
      </section>
      <section class="card">
        <h2>Về hiuhf0</h2>
        <p class="muted">${Data.words.length} từ vựng (A0: ${Data.words.filter((w) => w.level === 'A0').length}, A1: ${Data.words.filter((w) => w.level === 'A1').length}, A2: ${Data.words.filter((w) => w.level === 'A2').length}, B1: ${Data.words.filter((w) => w.level === 'B1').length}). Cấp độ A0 đến B1 được phân loại theo khung CEFR một cách tương đối, dựa trên mức độ phổ biến và độ khó khi học.</p>
      </section>`;

    const num = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.max(lo, Math.min(hi, n)); };
    view.onchange = (e) => {
      const id = e.target.id;
      if (id === 's-new') s.newPerDay = num(e.target.value, 1, 100, 10);
      else if (id === 's-rev') s.reviewsPerDay = num(e.target.value, 10, 1000, 200);
      else if (id === 's-auto') s.autoSpeak = e.target.checked;
      else if (id === 's-ipa') s.showIpa = e.target.checked;
      else if (id === 's-emoji') s.showEmoji = e.target.checked;
      else if (id === 's-unlock') s.unlockAll = e.target.checked;
      else if (id === 's-voice') s.voice = e.target.value;
      else if (id === 's-theme') { s.theme = e.target.value; applyTheme(); }
      else if (id === 's-import') {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
          try {
            if (!confirm('Nhập file này sẽ thay thế toàn bộ tiến độ hiện tại. Tiếp tục?')) return;
            Store.importJSON(String(fr.result));
            applyTheme();
            toast('Đã nhập dữ liệu.');
            renderSettings();
          } catch (err) { toast('Không nhập được: ' + err.message); }
        };
        fr.readAsText(f);
        return;
      }
      Store.save();
    };
    view.oninput = (e) => {
      if (e.target.id === 's-rate') { s.rate = parseFloat(e.target.value); $('#s-rate-o').textContent = s.rate.toFixed(2) + '×'; Store.save(); }
    };
    view.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 's-test') TTS.speak('Hello! Welcome to hiuhf0. Let us learn some new words today.');
      if (b.id === 's-export') {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'hiuhf0-backup-' + Store.dayKey() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      if (b.id === 's-reset' && confirm('Xóa toàn bộ tiến độ và cài đặt? Không thể hoàn tác.')) {
        Store.reset(); applyTheme(); toast('Đã xóa dữ liệu.'); renderSettings();
      }
    };
  }

  TTS.onChange(() => { if (currentRoute === 'settings') renderSettings(); });

  /* ================= Khởi động ================= */
  if (Data.warnings.length) console.warn('[hiuhf0] Cảnh báo dữ liệu:', Data.warnings);
  applyTheme();
  window.addEventListener('hashchange', route);
  window.hiuhf0 = { Data, Store, SRS, session: () => S, listen: () => L, speak: () => SP };
  route();
})();
