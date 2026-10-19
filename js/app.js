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
  const isHard = (w) => { const c = Store.card(w.id); return !!c && (c.lapses || 0) >= 1 && SRS.level(c) < 5; };

  function infoHTML(w, showWord = true) {
    return `<div class="info">
      ${showWord ? `<div class="i-word"><span>${esc(w.word)}</span><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm từ ${esc(w.word)}">🔊</button></div>` : ''}
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
  const routes = { learn: renderLearn, library: renderLibrary, sound: renderSound, shadow: renderShadow, read: renderRead, settings: renderSettings };
  let currentRoute = 'learn';
  let S = null; // phiên học

  function cleanup() {
    S = null;
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
    $$('.nav a').forEach((a) => { if (a.dataset.r === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
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
    const hardTop = hardList.slice().sort((a, b) => cards[b.id].lapses - cards[a.id].lapses).slice(0, 6)
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
      days.push({ n: l ? l.n + l.r : 0, w: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] });
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
      </section>`;

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
      const hard = Data.words.filter(isHard).sort((a, b) => (cards[b.id].lapses - cards[a.id].lapses) || (cards[a.id].due - cards[b.id].due));
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
    const frontHTML = `<div class="fc-word">${esc(w.word)}</div><div class="fc-pos">${esc(w.pos)}</div>${ipaHTML(w) ? `<div class="fc-ipa">${ipaHTML(w)}</div>` : ''}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button>`;
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
      q = `<div class="prompt"><div class="fc-word">${esc(w.word)}</div><div class="fc-pos">${esc(w.pos)}</div>${ipaHTML(w)}<button class="icon-btn" data-say="${esc(w.word)}" aria-label="Phát âm">🔊</button></div><p class="muted center">Chọn nghĩa đúng</p>`;
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
    if (btn && btn.id === 's-exit') { if (confirm('Thoát phiên học? Tiến độ của các thẻ đã làm vẫn được lưu.')) { S = null; renderLearn(); } return; }
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
    S = null;
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
          <button class="btn primary" id="back-home">Về trang học</button>
          <button class="btn" id="more-new" ${fresh ? '' : 'disabled'}>Học thêm 10 từ mới</button>
        </div>
      </section>`;
    view.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.id === 'back-home') renderLearn();
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
  const POS_NAMES = { n: 'Danh từ', v: 'Động từ', adj: 'Tính từ', adv: 'Trạng từ' };

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
        <div class="wrow-main"><b>${esc(w.word)}</b><span class="pos">${esc(w.pos)}</span>${ipaHTML(w)}<span class="vi">${esc(w.vi)}</span></div>
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
    const vocab = textVocab(t).filter((w) => w.level !== 'A1' || t.level === 'A1').slice(0, 30);
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
        <p class="muted">${Data.words.length} từ vựng (A1: ${Data.words.filter((w) => w.level === 'A1').length}, A2: ${Data.words.filter((w) => w.level === 'A2').length}, B1: ${Data.words.filter((w) => w.level === 'B1').length}). Cấp độ A1 đến B1 được phân loại theo khung CEFR một cách tương đối, dựa trên mức độ phổ biến và độ khó khi học.</p>
      </section>`;

    const num = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.max(lo, Math.min(hi, n)); };
    view.onchange = (e) => {
      const id = e.target.id;
      if (id === 's-new') s.newPerDay = num(e.target.value, 1, 100, 10);
      else if (id === 's-rev') s.reviewsPerDay = num(e.target.value, 10, 1000, 200);
      else if (id === 's-auto') s.autoSpeak = e.target.checked;
      else if (id === 's-ipa') s.showIpa = e.target.checked;
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
  window.hiuhf0 = { Data, Store, SRS, session: () => S };
  route();
})();
