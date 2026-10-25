/* hiuhf0 — journal.js
 * Nhật ký tiếng Anh mỗi ngày: chủ đề và gợi ý, trợ giúp viết (câu mở đầu, mẫu điền chỗ trống, tra từ theo nghĩa tiếng Việt,
 * từ theo chủ đề, kiểm tra lỗi cơ bản, dịch nhanh từ tiếng Việt), lịch tâm trạng, thử thách 7 ngày, thư gửi tương lai,
 * viết nhanh 3 phút, khóa bằng PIN, xuất file. Mọi thứ lưu trong localStorage (Store.journal, Store.letters).
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const { $, $$, esc, view, toast } = A;
  const TOPICS = window.JOURNAL_TOPICS || [];
  const MOODS = window.JOURNAL_MOODS || [];
  const CHALLENGE = window.JOURNAL_CHALLENGE || [];
  const topicBy = (k) => TOPICS.find((t) => t.key === k);
  const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const DAY = 86400000;
  const GOAL_WORDS = 30;      // mục tiêu mỗi bài
  const CHALLENGE_MIN = 15;   // số từ tối thiểu để tính một ngày của thử thách

  /* ===== Tiện ích ngày tháng ===== */
  const parseKey = (k) => new Date(k + 'T12:00:00');
  const keyOf = (d) => Store.dayKey(d.getTime());
  const shiftKey = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const fmt = (k) => { const d = parseKey(k); return `${WD[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
  const today = () => Store.dayKey();
  const isKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const download = (name, text) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  /* ===== Khóa PIN (chỉ che nội dung trên giao diện, dữ liệu vẫn nằm trong localStorage và file sao lưu) ===== */
  let unlockedUntil = 0;
  const hasPin = () => !!Store.settings.journalPin;
  const isLocked = () => hasPin() && Date.now() > unlockedUntil;
  async function hashPin(pin) {
    const s = 'hiuhf0-journal:' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; // dự phòng khi trình duyệt không có crypto.subtle (mở bằng file://)
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'x' + (h >>> 0).toString(16);
  }
  function renderLock(next) {
    view.innerHTML = `
      <section class="card center-card lockcard">
        <div class="dango-wrap">${A.stickers.dango('sleepy', 96)}</div>
        <h1>Nhật ký đang khóa</h1>
        <p class="muted">Nhập mã PIN 4 số để mở.</p>
        <form id="pin-form" autocomplete="off"><input id="pin-in" class="input lg pin-in" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••" aria-label="Mã PIN"><div class="row wrap center-row"><button class="btn primary lg" type="submit">Mở khóa</button></div></form>
        <p class="hint">PIN chỉ che nội dung khi người khác mượn máy bạn. Nó không mã hóa dữ liệu.</p>
      </section>`;
    $('#pin-in').focus();
    view.onsubmit = async (e) => {
      e.preventDefault();
      const h = await hashPin($('#pin-in').value);
      if (h === Store.settings.journalPin) { unlockedUntil = Date.now() + 5 * 60000; FX.sound('correct'); next(); } else { toast('Sai mã PIN, thử lại nhé.'); FX.anim($('.lockcard'), 'shake'); $('#pin-in').value = ''; }
    };
  }
  const guard = (fn) => (a, b) => (isLocked() ? renderLock(() => fn(a, b)) : fn(a, b));
  window.addEventListener('hashchange', () => { if (!/^#journal/.test(location.hash)) stopSprint(); });

  /* ===== Từ đã học dùng trong bài ===== */
  function usedIds(text) {
    const ids = new Set();
    Writing.tokens(text).forEach((t) => { const w = Data.lookup(t); if (w && Store.card(w.id)) ids.add(w.id); });
    return Array.from(ids).slice(0, 200);
  }
  /** Từ học trong ngày hôm nay (đã có thẻ, lần học gần nhất là hôm nay). */
  function learnedToday() {
    const t0 = SRS.startOfDay(Date.now()), cards = Store.get().cards;
    return Data.words.filter((w) => cards[w.id] && cards[w.id].last >= t0 && !w.custom);
  }
  function suggestTopic(key) {
    if (learnedToday().length >= 3 && key === today()) return 'learned';
    const pool = TOPICS.filter((t) => t.key !== 'learned' && t.key !== 'free');
    const d = parseKey(key), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / DAY);
    return pool[doy % pool.length].key;
  }

  /* ===== Tra từ và dịch nhanh (tiếng Việt sang tiếng Anh) ===== */
  let viIndex = null;
  function buildViIndex() {
    viIndex = new Map();
    Data.words.forEach((w) => {
      String(w.vi).split(/[,;]/).forEach((part) => {
        const p = part.replace(/\(.*?\)/g, '').trim();
        if (!p) return;
        const k = fold(p), arr = viIndex.get(k) || [];
        arr.push(w);
        viIndex.set(k, arr);
      });
    });
  }
  const lvIdx = (w) => { const i = Data.LEVELS.findIndex((l) => l.key === w.level); return i < 0 ? 9 : i; };
  const learned = (w) => !!Store.card(w.id);
  const rankWords = (list) => list.slice().sort((a, b) => (learned(b) - learned(a)) || (lvIdx(a) - lvIdx(b)));

  /** Tìm từ theo chữ tiếng Anh hoặc nghĩa tiếng Việt, ưu tiên từ đã học. */
  function lookup(q, limit) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const qf = fold(q), scored = [];
    Data.words.forEach((w) => {
      const wl = w.word.toLowerCase();
      let s = 0;
      if (wl === q) s = 100; else if (wl.indexOf(q) === 0) s = 70; else if (q.length >= 3 && wl.indexOf(q) >= 0) s = 35;
      if (!s) {
        const parts = String(w.vi).split(/[,;]/).map((p) => fold(p.replace(/\(.*?\)/g, '').trim()));
        if (parts.some((p) => p === qf)) s = 90; else if (parts.some((p) => p.indexOf(qf) === 0)) s = 60; else if (qf.length >= 3 && parts.some((p) => p.indexOf(qf) >= 0)) s = 30;
      }
      if (s) scored.push([s + (learned(w) ? 8 : 0) - lvIdx(w), w]);
    });
    return scored.sort((a, b) => b[0] - a[0]).slice(0, limit || 10).map((x) => x[1]);
  }
  function viCandidates(phrase) {
    if (!viIndex) buildViIndex();
    const k = fold(phrase);
    let c = viIndex.get(k) || [];
    if (!c.length && k.length >= 3) { viIndex.forEach((arr, key) => { if (c.length < 8 && (key.indexOf(k) === 0 || (k.length >= 4 && key.indexOf(k) >= 0))) c = c.concat(arr); }); }
    return rankWords(Array.from(new Set(c))).slice(0, 6);
  }

  /* ===== Thống kê, thử thách ===== */
  function challengeDone() {
    const done = {};
    const j = Store.get().journal;
    Object.keys(j).forEach((k) => { const e = j[k]; if (e.challenge >= 1 && e.challenge <= 7 && e.words >= CHALLENGE_MIN) done[e.challenge] = k; });
    return done;
  }
  const nextChallenge = () => { const d = challengeDone(); for (let i = 1; i <= 7; i++) if (!d[i]) return i; return 0; };

  function statsAll() {
    const j = Store.get().journal, keys = Store.journalDates();
    let words = 0;
    const moods = {}, topics = {}, usedCount = {};
    keys.forEach((k) => {
      const e = j[k];
      words += e.words || 0;
      if (e.mood) moods[e.mood] = (moods[e.mood] || 0) + 1;
      if (e.topic) topics[e.topic] = (topics[e.topic] || 0) + 1;
      (e.used || []).forEach((id) => { usedCount[id] = (usedCount[id] || 0) + 1; });
    });
    const top = (o, n) => Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, n);
    return { days: keys.length, words, avg: keys.length ? Math.round(words / keys.length) : 0, topMood: top(moods, 1)[0], topTopics: top(topics, 3), topUsed: top(usedCount, 8) };
  }

  const excerpt = (t, n) => { const s = String(t).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

  /* ===== Trang chính của nhật ký ===== */
  const cal = { y: new Date().getFullYear(), m: new Date().getMonth() };
  const lst = { q: '', limit: 8, allTopics: false };

  function calendarHTML() {
    const first = new Date(cal.y, cal.m, 1), days = new Date(cal.y, cal.m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const t = today();
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="cal-d off"></span>';
    for (let d = 1; d <= days; d++) {
      const k = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const e = Store.journalGet(k), has = e && e.text.trim(), future = k > t;
      cells += `<button class="cal-d ${has ? 'has' : ''} ${k === t ? 'today' : ''}" data-day="${k}" ${future ? 'disabled' : ''} aria-label="${esc(fmt(k))}${has ? ', đã viết' : ''}"><i>${d}</i>${has ? `<span>${esc(e.mood || '✏️')}</span>` : ''}</button>`;
    }
    return `<div class="cal-h"><button class="icon-btn" data-cal="-1" aria-label="Tháng trước">‹</button><b>Tháng ${cal.m + 1}/${cal.y}</b><button class="icon-btn" data-cal="1" aria-label="Tháng sau">›</button></div>
      <div class="cal"><span class="cal-w">T2</span><span class="cal-w">T3</span><span class="cal-w">T4</span><span class="cal-w">T5</span><span class="cal-w">T6</span><span class="cal-w">T7</span><span class="cal-w">CN</span>${cells}</div>`;
  }

  function entryRow(k) {
    const e = Store.journalGet(k), tp = topicBy(e.topic);
    return `<a class="jrow" href="#journal/${k}"><span class="jrow-m" aria-hidden="true">${esc(e.mood || '📔')}</span><span class="jrow-b"><b>${esc(fmt(k))}</b><small class="muted">${tp ? esc(tp.icon + ' ' + tp.vi) + ' · ' : ''}${e.words} từ</small><span class="jrow-t">${esc(excerpt(e.text, 110))}</span></span></a>`;
  }

  function lookBackHTML() {
    const t = today();
    const items = [[7, 'Một tuần trước'], [30, 'Một tháng trước'], [365, 'Một năm trước']].map(([n, label]) => {
      const k = shiftKey(t, -n), e = Store.journalGet(k);
      return e && e.text.trim() ? `<a class="lookback" href="#journal/${k}"><b>${label}</b><span>${esc(e.mood || '')} ${esc(excerpt(e.text, 90))}</span></a>` : '';
    }).join('');
    return items ? `<section class="card"><div class="card-h"><h2>Nhìn lại</h2><span class="muted">bạn đã viết gì</span></div>${items}</section>` : '';
  }

  function renderHome() {
    A.checkBadges();
    const t = today(), e = Store.journalGet(t), wrote = !!(e && e.text.trim());
    const st = statsAll(), streak = Store.journalStreak();
    const sug = topicBy(suggestTopic(t)) || TOPICS[0];
    const pr = sug.prompts[0];
    const cd = challengeDone(), nc = nextChallenge();
    const q = lst.q.trim().toLowerCase();
    const keys = Store.journalDates().filter((k) => !q || Store.journalGet(k).text.toLowerCase().indexOf(q) >= 0);
    const dueLetters = Store.get().letters.filter((l) => !l.opened && l.openOn <= Date.now()).length;
    view.innerHTML = `
      <a class="back" href="#more">‹ Thêm</a>
      <section class="page-h row"><div class="dango-wrap sm">${A.stickers.dango(wrote ? 'cheer' : 'happy', 72)}</div>
        <div><h1>Nhật ký tiếng Anh</h1><p class="muted">Mỗi ngày vài câu, tiếng Anh của bạn sẽ khác hẳn. ${streak ? `Bạn đã viết <b>${streak}</b> ngày liên tiếp ✍️` : 'Hôm nay viết trang đầu tiên nhé!'}</p></div></section>

      <section class="card jtoday">
        <div class="card-h"><h2>Hôm nay · ${esc(fmt(t))}</h2>${wrote ? `<span class="muted">${esc(e.mood || '')} ${e.words} từ</span>` : ''}</div>
        ${wrote ? `<p class="jex">${esc(excerpt(e.text, 160))}</p><div class="row wrap"><a class="btn primary" href="#journal/${t}">Viết tiếp</a></div>`
          : `<div class="prompt-box"><b>${esc(sug.icon + ' ' + sug.vi)}</b><p>${esc(pr[0])}</p><small class="muted">${esc(pr[1])}</small></div>
             <div class="row wrap"><a class="btn primary lg" href="#journal/${t}/${sug.key}">✍️ Viết nhật ký hôm nay</a><a class="btn" href="#journal/${t}/free">Viết tự do</a></div>`}
      </section>

      <section class="card">
        <div class="card-h"><h2>Thử thách 7 ngày</h2><span class="muted">${Object.keys(cd).length}/7 ngày</span></div>
        <p class="hint">Mỗi ngày một đề, từ giới thiệu bản thân đến ước mơ. Viết ít nhất ${CHALLENGE_MIN} từ mỗi ngày. Xong cả 7 ngày nhận sticker.</p>
        <div class="chal">${CHALLENGE.map((c) => `<a class="chal-d ${cd[c.day] ? 'done' : ''} ${c.day === nc ? 'next' : ''}" href="#journal/${cd[c.day] || t}/${cd[c.day] ? '' : 'c' + c.day}" title="${esc(c.vi)}"><i>${cd[c.day] ? '✅' : c.icon}</i><small>Ngày ${c.day}</small></a>`).join('')}</div>
        ${nc ? `<p class="muted">Tiếp theo: <b>${esc(CHALLENGE[nc - 1].icon + ' ' + CHALLENGE[nc - 1].vi)}</b></p><a class="btn primary" href="#journal/${t}/c${nc}">Làm ngày ${nc}</a>` : '<p class="notice">🏁 Bạn đã hoàn thành thử thách 7 ngày. Tuyệt vời!</p>'}
      </section>

      <section class="card">
        <div class="card-h"><h2>Chọn chủ đề để viết</h2></div>
        <div class="jtopics">${TOPICS.slice(0, lst.allTopics ? TOPICS.length : 6).map((tp) => `<a class="jtopic" href="#journal/${t}/${tp.key}"><i aria-hidden="true">${tp.icon}</i><b>${esc(tp.vi)}</b><small class="muted">${tp.level}</small></a>`).join('')}</div>
        <div class="center"><button class="btn sm ghost" id="j-alltopics">${lst.allTopics ? 'Thu gọn' : `Xem cả ${TOPICS.length} chủ đề`}</button></div>
      </section>

      ${lookBackHTML()}

      <section class="card"><div class="card-h"><h2>Lịch nhật ký</h2><span class="muted">${st.days} ngày đã viết</span></div>${calendarHTML()}</section>

      <section class="card">
        <div class="card-h"><h2>Các bài đã viết</h2></div>
        <input id="j-q" class="input" type="search" placeholder="Tìm trong nhật ký…" value="${esc(lst.q)}" aria-label="Tìm trong nhật ký">
        <div class="jlist">${keys.slice(0, lst.limit).map(entryRow).join('') || '<p class="muted">Chưa có bài nào khớp. Viết bài đầu tiên nhé!</p>'}</div>
        ${keys.length > lst.limit ? '<div class="center"><button class="btn" id="j-more">Xem thêm</button></div>' : ''}
      </section>

      ${st.days ? `<section class="card"><div class="card-h"><h2>Thống kê của bạn</h2></div>
        <div class="stats"><div class="stat"><b>${st.days}</b><span>ngày đã viết</span></div><div class="stat"><b>${st.words}</b><span>từ đã viết</span></div><div class="stat"><b>${st.avg}</b><span>từ mỗi bài</span></div><div class="stat"><b>${esc(st.topMood || '–')}</b><span>tâm trạng hay gặp</span></div></div>
        ${st.topUsed.length ? `<p class="hint">Từ đã học bạn dùng nhiều nhất:</p><div class="hardlist">${st.topUsed.map((id) => { const w = Data.byId.get(id); return w ? `<span class="hardw">${esc(w.word)}</span>` : ''; }).join('')}</div>` : ''}
      </section>` : ''}

      <section class="card">
        <div class="card-h"><h2>Công cụ</h2></div>
        <div class="row wrap">
          <a class="btn" href="#journal/letters">💌 Thư gửi tương lai${dueLetters ? ` <span class="badge-n">${dueLetters}</span>` : ''}</a>
          <button class="btn" id="j-export" ${st.days ? '' : 'disabled'}>⬇️ Tải toàn bộ nhật ký (.txt)</button>
          <button class="btn" id="j-pin">${hasPin() ? '🔓 Đổi/bỏ mã PIN' : '🔒 Đặt mã PIN'}</button>
        </div>
        <p class="hint">Nhật ký nằm trong trình duyệt này và nằm trong file sao lưu (Cài đặt). Đổi máy nhớ sao lưu nhé.</p>
      </section>`;
    view.oninput = (ev) => { if (ev.target.id === 'j-q') { lst.q = ev.target.value; lst.limit = 8; const pos = ev.target.selectionStart; renderHome(); const el = $('#j-q'); el.focus(); el.setSelectionRange(pos, pos); } };
    view.onclick = (ev) => {
      const c = ev.target.closest('[data-cal]');
      if (c) { cal.m += +c.dataset.cal; if (cal.m < 0) { cal.m = 11; cal.y -= 1; } if (cal.m > 11) { cal.m = 0; cal.y += 1; } return renderHome(); }
      const d = ev.target.closest('[data-day]');
      if (d && !d.disabled) { location.hash = '#journal/' + d.dataset.day; return; }
      if (ev.target.closest('#j-more')) { lst.limit += 10; return renderHome(); }
      if (ev.target.closest('#j-alltopics')) { lst.allTopics = !lst.allTopics; return renderHome(); }
      if (ev.target.closest('#j-export')) return exportAll();
      if (ev.target.closest('#j-pin')) return pinDialog();
    };
  }

  function exportAll() {
    const j = Store.get().journal;
    const text = Store.journalDates().slice().reverse().map((k) => `=== ${fmt(k)} ${j[k].mood || ''} ${topicBy(j[k].topic) ? '· ' + topicBy(j[k].topic).vi : ''} ===\n${j[k].text.trim()}\n`).join('\n');
    download('hiuhf0-nhat-ky-' + today() + '.txt', text || 'Chưa có bài nào.');
    toast('Đã tải file nhật ký.');
  }

  async function pinDialog() {
    if (hasPin()) {
      const cur = prompt('Nhập mã PIN hiện tại. Để trống nếu muốn bỏ qua.');
      if (cur == null) return;
      if ((await hashPin(cur)) !== Store.settings.journalPin) return toast('Sai mã PIN.');
      const nxt = prompt('Nhập mã PIN mới (4 số). Để trống để BỎ mã PIN.');
      if (nxt == null) return;
      if (!nxt) { Store.settings.journalPin = ''; Store.save(); toast('Đã bỏ mã PIN.'); return renderHome(); }
      if (!/^\d{4}$/.test(nxt)) return toast('PIN phải gồm đúng 4 chữ số.');
      Store.settings.journalPin = await hashPin(nxt); Store.save(); toast('Đã đổi mã PIN.');
    } else {
      const p = prompt('Đặt mã PIN gồm 4 chữ số để che nhật ký khi người khác mượn máy.');
      if (p == null) return;
      if (!/^\d{4}$/.test(p)) return toast('PIN phải gồm đúng 4 chữ số.');
      Store.settings.journalPin = await hashPin(p); Store.save(); unlockedUntil = Date.now() + 5 * 60000; toast('Đã đặt mã PIN.');
    }
    renderHome();
  }

  /* ===== Trình soạn thảo ===== */
  let ed = null;
  let saveTimer = 0, sprintTimer = 0;
  function stopSprint() { clearInterval(sprintTimer); sprintTimer = 0; if (ed) ed.sprint = null; }

  function pickWordChallenge(tp) {
    const cards = Store.get().cards;
    let pool = Data.words.filter((w) => cards[w.id] && SRS.level(cards[w.id]) <= 4 && !w.custom && w.pos !== 'phr' && w.pos !== 'det' && w.pos !== 'prep');
    if (pool.length < 3 && tp) pool = Data.words.filter((w) => !w.custom && w.pos !== 'phr' && (tp.vocab || []).some((k) => Data.inTopic(w, k)) && lvIdx(w) <= 1);
    if (pool.length < 3) pool = Data.words.filter((w) => w.level === 'A1' && w.pos === 'n');
    return A.shuffle(pool.slice()).slice(0, 3).map((w) => w.id);
  }

  function promptOf() {
    if (ed.challenge) return CHALLENGE[ed.challenge - 1].prompt;
    const tp = topicBy(ed.topic) || TOPICS[0];
    return tp.prompts[ed.promptIdx % tp.prompts.length];
  }
  const templateOf = () => (ed.challenge ? CHALLENGE[ed.challenge - 1].template : (topicBy(ed.topic) || TOPICS[0]).template);

  function renderEditor(date, arg2) {
    if (!isKey(date) || date > today()) { location.hash = '#journal'; return; }
    const prev = Store.journalGet(date);
    let topic = (prev && prev.topic) || suggestTopic(date), challenge = (prev && prev.challenge) || 0;
    if (arg2) {
      const m = /^c([1-7])$/.exec(arg2);
      if (m) { challenge = +m[1]; topic = CHALLENGE[challenge - 1].topic; } else if (topicBy(arg2)) { topic = arg2; challenge = 0; }
    }
    const tp = topicBy(topic) || TOPICS[0];
    ed = { date, topic, challenge, mood: (prev && prev.mood) || '', promptIdx: 0, tab: 'starters', tr: false, wc: pickWordChallenge(tp), sprint: null, startWords: 0, saved: !!prev, finished: false };
    drawEditor(prev ? prev.text : '');
  }

  function drawEditor(initial) {
    const tp = topicBy(ed.topic) || TOPICS[0];
    const pr = promptOf();
    const moodHTML = MOODS.map(([e, l]) => `<button class="mood ${ed.mood === e ? 'on' : ''}" data-mood="${e}" title="${esc(l)}" aria-label="${esc(l)}" aria-pressed="${ed.mood === e}">${e}</button>`).join('');
    const topicHTML = TOPICS.map((t) => `<button class="chip ${ed.topic === t.key ? 'on' : ''}" data-topic="${t.key}" aria-pressed="${ed.topic === t.key && !ed.challenge}">${t.icon} ${esc(t.vi)}</button>`).join('');
    view.innerHTML = `
      <a class="back" href="#journal">‹ Nhật ký</a>
      <section class="card jed">
        <div class="jed-h">
          <button class="icon-btn" data-nav="-1" aria-label="Ngày trước">‹</button>
          <div><h1>${esc(fmt(ed.date))}</h1>${ed.challenge ? `<span class="rarity-tag r-epic">Thử thách ngày ${ed.challenge}/7</span>` : ''}</div>
          <button class="icon-btn" data-nav="1" aria-label="Ngày sau" ${shiftKey(ed.date, 1) > today() ? 'disabled' : ''}>›</button>
        </div>
        <div class="moods" role="group" aria-label="Tâm trạng">${moodHTML}</div>
        <details class="jtopic-pick"><summary>Chủ đề: <b>${esc(tp.icon + ' ' + tp.vi)}</b> <span class="muted">(bấm để đổi)</span></summary><div class="chips">${topicHTML}</div></details>
        <div class="prompt-box"><b>Gợi ý</b><p>${esc(pr[0])}</p>${ed.tr ? `<small class="muted">${esc(pr[1])}</small>` : ''}
          <div class="row wrap"><button class="btn sm ghost" id="je-tr">${ed.tr ? 'Ẩn tiếng Việt' : 'Xem tiếng Việt'}</button>${ed.challenge ? '' : '<button class="btn sm ghost" id="je-newprompt">Gợi ý khác</button>'}</div></div>
        <div class="wchal" id="je-wc"></div>
        <textarea id="je-text" class="input jtext" rows="9" placeholder="Viết vài câu tiếng Anh ở đây. Chưa biết viết gì? Chọn một câu mở đầu ở bên dưới." aria-label="Nội dung nhật ký" spellcheck="true" autocapitalize="sentences">${esc(initial)}</textarea>
        <div class="jmeter"><div class="progress sm"><i id="je-bar" style="width:0%"></i></div><small class="muted" id="je-stat"></small></div>
        <div class="jbar">
          <small class="muted" id="je-saved">${ed.saved ? 'Đã có bản lưu' : 'Chưa lưu'}</small>
          <span id="je-timer" class="jtimer" hidden></span>
          <div class="row wrap">
            <button class="btn sm" id="je-sprint" title="Viết trong 3 phút">⏳ Viết nhanh 3 phút</button>
            <button class="btn sm" id="je-read">🔊 Nghe lại</button>
          </div>
        </div>
      </section>

      <section class="card jassist">
        <div class="tabs" role="tablist">${[['starters', '💬 Câu mở đầu'], ['template', '🧩 Mẫu điền'], ['lookup', '🔎 Tra từ'], ['topicwords', '📚 Từ chủ đề'], ['check', '✅ Kiểm tra']].map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${ed.tab === k}">${l}</button>`).join('')}</div>
        <div id="je-panel"></div>
      </section>

      <div class="row wrap jfoot">
        <button class="btn primary lg" id="je-done">✔️ Hoàn thành hôm nay</button>
        <button class="btn" id="je-share">📸 Chia sẻ ảnh</button>
        <button class="btn" id="je-dl">⬇️ Tải bài này</button>
        <button class="btn danger" id="je-del" ${ed.saved ? '' : 'disabled'}>Xóa bài</button>
      </div>`;
    wireEditor();
    refreshMeter();
    drawPanel();
    drawWordChallenge();
  }

  const ta = () => $('#je-text');

  function insertText(txt) {
    const t = ta(), s = t.selectionStart, e = t.selectionEnd, before = t.value.slice(0, s), after = t.value.slice(e);
    const sep = before && !/[\s(“"]$/.test(before) ? ' ' : '';
    t.value = before + sep + txt + after;
    const pos = (before + sep + txt).length;
    t.setSelectionRange(pos, pos);
    t.focus();
    onInput();
  }

  function refreshMeter() {
    const text = ta().value, st = Writing.stats(text), used = usedIds(text);
    $('#je-bar').style.width = Math.min(100, Math.round((st.words / GOAL_WORDS) * 100)) + '%';
    $('#je-stat').textContent = `${st.words} từ · ${st.sentences} câu · dùng ${used.length} từ đã học${st.words >= GOAL_WORDS ? ' · 🎉 đạt mục tiêu' : ` · mục tiêu ${GOAL_WORDS} từ`}`;
    return { st, used };
  }

  function drawWordChallenge() {
    const el = $('#je-wc');
    if (!el) return;
    const text = ta().value.toLowerCase();
    const found = (w) => Writing.tokens(text).some((t) => { const x = Data.lookup(t); return x && x.id === w.id; });
    const ws = ed.wc.map((id) => Data.byId.get(id)).filter(Boolean);
    el.innerHTML = ws.length ? `<b>🎯 Thử thách từ:</b> dùng 3 từ này trong bài ${ws.map((w) => `<span class="wc ${found(w) ? 'ok' : ''}" title="${esc(w.vi)}">${found(w) ? '✅' : (w.emoji || '•')} ${esc(w.word)}</span>`).join('')}` : '';
  }

  function onInput() {
    const { st } = refreshMeter();
    drawWordChallenge();
    if (ed.tab === 'check') { clearTimeout(ed.ct); ed.ct = setTimeout(drawPanel, 500); }
    clearTimeout(saveTimer);
    $('#je-saved').textContent = 'Đang viết…';
    saveTimer = setTimeout(() => save(false), 700);
    if (st.words >= GOAL_WORDS && !ed.goalShown) { ed.goalShown = true; FX.chip('🎉 Đủ ' + GOAL_WORDS + ' từ rồi!'); FX.sound('correct'); }
  }

  function save() {
    if (!ed) return null;
    const text = ta() ? ta().value : '';
    const prev = Store.journalGet(ed.date);
    if (!text.trim() && !prev) return null;
    const st = Writing.stats(text);
    const pr = promptOf();
    const entry = { text, mood: ed.mood, topic: ed.topic, prompt: pr[0], created: prev ? prev.created : Date.now(), updated: Date.now(), words: st.words, used: usedIds(text), challenge: ed.challenge || 0 };
    Store.journalSet(ed.date, entry);
    ed.saved = true;
    const el = $('#je-saved');
    if (el) el.textContent = 'Đã lưu ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const del = $('#je-del');
    if (del) del.disabled = false;
    checkChallenge();
    return entry;
  }

  function checkChallenge() {
    const d = challengeDone();
    if (Object.keys(d).length === 7 && !Store.stat('challengeDone')) {
      Store.setStat('challengeDone', 1);
      FX.confetti();
      FX.chip('🏁 Xong thử thách 7 ngày!');
    }
  }

  function wireEditor() {
    const t = ta();
    t.addEventListener('input', onInput);
    view.onclick = async (ev) => {
      const b = ev.target.closest('button');
      const mood = ev.target.closest('[data-mood]');
      if (mood) { ed.mood = ed.mood === mood.dataset.mood ? '' : mood.dataset.mood; $$('.mood').forEach((x) => { x.classList.toggle('on', x.dataset.mood === ed.mood); x.setAttribute('aria-pressed', x.dataset.mood === ed.mood); }); FX.sound('tap'); save(); return; }
      const nav = ev.target.closest('[data-nav]');
      if (nav && !nav.disabled) { save(); location.hash = '#journal/' + shiftKey(ed.date, +nav.dataset.nav); return; }
      const top = ev.target.closest('[data-topic]');
      if (top) { save(); const keepText = ta().value; ed.topic = top.dataset.topic; ed.challenge = 0; ed.promptIdx = 0; ed.wc = pickWordChallenge(topicBy(ed.topic)); drawEditor(keepText); return; }
      const tab = ev.target.closest('[data-tab]');
      if (tab) { ed.tab = tab.dataset.tab; $$('.jassist .tab').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === ed.tab)); drawPanel(); return; }
      if (!b) return;
      if (b.id === 'je-tr') { ed.tr = !ed.tr; const keep = ta().value; save(); return drawEditor(keep); }
      if (b.id === 'je-newprompt') { ed.promptIdx += 1; const keep = ta().value; return drawEditor(keep); }
      if (b.id === 'je-read') { const x = ta().value.trim(); if (!x) return toast('Hãy viết vài câu trước đã.'); if (!TTS.ok) return toast('Trình duyệt này không hỗ trợ đọc to.'); TTS.speak(x.slice(0, 1500), { rate: 0.85 }); return; }
      if (b.id === 'je-sprint') return toggleSprint();
      if (b.id === 'je-done') return finish();
      if (b.id === 'je-dl') { const e = save() || Store.journalGet(ed.date); if (!e) return toast('Chưa có gì để tải.'); download(`hiuhf0-nhat-ky-${ed.date}.txt`, `${fmt(ed.date)} ${e.mood}\n\n${e.text}\n`); return; }
      if (b.id === 'je-share') {
        const e = save();
        if (!e) return toast('Hãy viết vài câu trước đã.');
        const r = await Share.share({ title: 'Nhật ký ' + fmt(ed.date), subtitle: excerpt(e.text, 110), emoji: e.mood || '📔', tag: 'Nhật ký tiếng Anh · ' + e.words + ' từ', from: '#fff6ec', to: '#e4f7ec' });
        if (r !== 'cancel') { Store.bump('shared'); A.checkBadges(); toast(r === 'saved' ? 'Đã tải ảnh về máy.' : 'Đã chia sẻ!'); }
        return;
      }
      if (b.id === 'je-del') { if (!confirm('Xóa bài nhật ký ngày này? Không thể hoàn tác.')) return; Store.journalDel(ed.date); toast('Đã xóa bài.'); location.hash = '#journal'; return; }
      handlePanelClick(b);
    };
    view.onchange = null;
    view.oninput = (ev) => {
      if (ev.target.id === 'lk-q') drawLookupResults(ev.target.value);
    };
  }

  /* ===== Các thẻ trợ giúp ===== */
  function drawPanel() {
    const el = $('#je-panel');
    if (!el) return;
    const tp = topicBy(ed.topic) || TOPICS[0];
    if (ed.tab === 'starters') {
      const list = ed.challenge ? [] : tp.starters;
      const gen = [['I like ...', 'Mình thích ...'], ['I do not like ...', 'Mình không thích ...'], ['Yesterday, I ...', 'Hôm qua mình ...'], ['Tomorrow, I will ...', 'Ngày mai mình sẽ ...'], ['Because ...', 'Bởi vì ...'], ['I think that ...', 'Mình nghĩ rằng ...']];
      el.innerHTML = `<p class="hint">Bấm một câu để chèn vào bài, rồi viết tiếp phần còn lại.</p>
        <div class="starters">${(list.length ? list : tp.starters).concat(gen).map((s) => `<button class="starter" data-ins="${esc(s[0].replace(/ \.\.\.$/, ' '))}"><b>${esc(s[0])}</b><small class="muted">${esc(s[1])}</small></button>`).join('')}</div>`;
    } else if (ed.tab === 'template') {
      const tpl = templateOf();
      el.innerHTML = `<p class="hint">Mẫu có chỗ trống ___ để bạn điền. Bấm “Dùng mẫu”, rồi bấm “Tới chỗ trống tiếp theo” để điền lần lượt.</p>
        <div class="tplbox"><p>${esc(tpl[0])}</p><small class="muted">${esc(tpl[1])}</small></div>
        <div class="row wrap"><button class="btn primary" id="tp-use">Dùng mẫu</button><button class="btn" id="tp-next">Tới chỗ trống tiếp theo</button></div>`;
    } else if (ed.tab === 'lookup') {
      el.innerHTML = `<p class="hint">Gõ nghĩa tiếng Việt (ví dụ “mệt”) hoặc chữ tiếng Anh để tìm từ. Từ bạn đã học được xếp trước.</p>
        <input id="lk-q" class="input" type="search" placeholder="Tìm từ: mệt, đói, family, hospital…" autocomplete="off" aria-label="Tra từ">
        <div id="lk-res" class="lk-res"><p class="muted">Gõ để tìm…</p></div>`;
    } else if (ed.tab === 'topicwords') {
      const keys = tp.vocab || [];
      let ws = ed.topic === 'learned' ? learnedToday() : Data.words.filter((w) => !w.custom && keys.some((k) => Data.inTopic(w, k)));
      ws = rankWords(ws).slice(0, 60);
      el.innerHTML = ws.length ? `<p class="hint">${ed.topic === 'learned' ? 'Những từ bạn vừa học hôm nay.' : 'Từ liên quan đến chủ đề này; từ đã học được xếp trước.'} Bấm để chèn.</p>
        <div class="wchips">${ws.map((w) => `<button class="wchip ${learned(w) ? 'mv-3' : ''}" data-ins="${esc(w.word)}" title="${esc(w.vi)}">${A.emojiHTML(w)}${esc(w.word)}</button>`).join('')}</div>`
        : '<p class="muted">Chủ đề này chưa gắn với nhóm từ nào. Hãy dùng thẻ “Tra từ”.</p>';
    } else if (ed.tab === 'check') {
      const text = ta().value;
      const tips = Writing.check(text);
      const errs = tips.filter((t) => t.kind === 'error').length;
      ed.checkLive = true;
      const rows = tips.filter((t) => t.kind !== 'vi').map((t, i) => `<li class="tip tip-${t.kind}" data-i="${i}"><span class="tip-k">${t.kind === 'error' ? '❌' : '💡'}</span><span class="tip-b"><span class="tip-fix"><b>${esc(t.found || '…' + text.slice(Math.max(0, t.from - 18), t.from))}</b>${t.fix != null ? ` → <b class="ok">${esc(t.fix) || '(xóa)'}</b>` : ''}</span><small class="muted">${esc(t.msg)}</small></span>${t.fix != null ? `<button class="btn sm" data-fix="${i}">Sửa</button>` : ''}</li>`).join('');
      const vi = tips.filter((t) => t.kind === 'vi');
      const viHTML = vi.map((t) => {
        const c = viCandidates(t.found);
        return `<li class="tip tip-vi"><span class="tip-k">🌐</span><span class="tip-b"><b>${esc(t.found)}</b><small class="muted">Tiếng Việt trong bài. Chọn từ tiếng Anh thay thế:</small><span class="vi-c">${c.length ? c.map((w) => `<button class="wchip" data-sub="${esc(t.found)}" data-to="${esc(w.word)}" title="${esc(w.vi)}">${A.emojiHTML(w)}${esc(w.word)}</button>`).join('') : '<small class="muted">Chưa tìm thấy. Thử thẻ “Tra từ”.</small>'}</span></span></li>`;
      }).join('');
      el.innerHTML = !text.trim() ? '<p class="muted">Hãy viết vài câu rồi quay lại đây để kiểm tra.</p>'
        : `<p class="${errs ? 'notice' : 'result ok'}">${errs ? `Có ${errs} chỗ nên xem lại.` : (tips.length ? 'Không có lỗi rõ ràng, chỉ có vài gợi ý nhỏ.' : 'Không thấy lỗi cơ bản nào. Giỏi quá! 🎉')}</p>
          <ul class="tips">${rows}${viHTML}</ul>
          <p class="hint">Đây là kiểm tra nhanh các lỗi phổ biến, không phải chấm điểm. Máy có thể báo thừa hoặc bỏ sót, hãy dựa vào cảm nhận của bạn.</p>`;
    }
  }

  function drawLookupResults(q) {
    const el = $('#lk-res');
    if (!el) return;
    const rs = lookup(q, 10);
    el.innerHTML = rs.length ? rs.map((w) => `<div class="lk"><span class="lk-w">${A.emojiHTML(w)}<b>${esc(w.word)}</b> <span class="pos">${esc(w.pos)}</span> ${A.ipaHTML(w)}</span><span class="lk-vi">${esc(w.vi)}</span><span class="lk-act"><button class="icon-btn sm" data-say="${esc(w.word)}" aria-label="Nghe">🔊</button><button class="btn sm primary" data-ins="${esc(w.word)}">Chèn</button></span><small class="muted lk-ex">${esc(w.ex || '')}</small></div>`).join('')
      : (q.trim() ? `<p class="muted">Không tìm thấy “${esc(q)}”. Bạn có thể <button class="btn sm" id="lk-add" data-w="${esc(q.trim())}">thêm vào Từ của tôi</button>.</p>` : '<p class="muted">Gõ để tìm…</p>');
  }

  function handlePanelClick(b) {
    if (b.dataset.ins != null) { insertText(b.dataset.ins); FX.sound('tap'); return; }
    if (b.dataset.fix != null) {
      const tips = Writing.check(ta().value).filter((t) => t.kind !== 'vi');
      const tip = tips[+b.dataset.fix];
      if (tip) { ta().value = Writing.apply(ta().value, tip); FX.sound('correct'); onInput(); drawPanel(); }
      return;
    }
    if (b.dataset.sub) {
      const t = ta(), i = t.value.indexOf(b.dataset.sub);
      if (i >= 0) { t.value = t.value.slice(0, i) + b.dataset.to + t.value.slice(i + b.dataset.sub.length); FX.sound('correct'); onInput(); drawPanel(); }
      return;
    }
    if (b.id === 'tp-use') {
      const tpl = templateOf()[0], t = ta();
      if (t.value.trim() && !confirm('Thêm mẫu vào cuối bài hiện tại?')) return;
      t.value = (t.value.trim() ? t.value.replace(/\s+$/, '') + '\n\n' : '') + tpl;
      onInput();
      return gotoBlank();
    }
    if (b.id === 'tp-next') return gotoBlank();
    if (b.id === 'lk-add') {
      const q = b.dataset.w;
      A.openSheet(q);
    }
  }
  function gotoBlank() {
    const t = ta(), from = t.selectionEnd || 0;
    let i = t.value.indexOf('___', from);
    if (i < 0) i = t.value.indexOf('___');
    if (i < 0) return toast('Không còn chỗ trống nào. Giỏi quá!');
    t.focus();
    t.setSelectionRange(i, i + 3);
  }

  /* ===== Viết nhanh 3 phút ===== */
  function toggleSprint() {
    if (ed.sprint) { stopSprint(); $('#je-timer').hidden = true; $('#je-sprint').textContent = '⏳ Viết nhanh 3 phút'; return; }
    ed.sprint = { end: Date.now() + 180000, start: Writing.countWords(ta().value) };
    $('#je-timer').hidden = false;
    $('#je-sprint').textContent = '⏹ Dừng';
    ta().focus();
    const tick = () => {
      if (!ed || !ed.sprint) return;
      const left = Math.max(0, Math.round((ed.sprint.end - Date.now()) / 1000));
      $('#je-timer').textContent = `⏳ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (left <= 0) {
        const wrote = Writing.countWords(ta().value) - ed.sprint.start;
        stopSprint();
        $('#je-timer').hidden = true;
        $('#je-sprint').textContent = '⏳ Viết nhanh 3 phút';
        FX.sound('complete');
        toast(`Hết giờ! Bạn viết được ${Math.max(0, wrote)} từ trong 3 phút.`);
        if (wrote >= 20) { Store.bump('sprint'); FX.confetti({ count: 40 }); save(); }
      }
    };
    tick();
    sprintTimer = setInterval(tick, 500);
  }

  /* ===== Hoàn thành: Dango nhận xét ===== */
  function finish() {
    const text = ta().value;
    if (!text.trim()) return toast('Hãy viết vài câu trước khi hoàn thành nhé.');
    stopSprint();
    const first = !Store.journalGet(ed.date) || !Store.journalGet(ed.date).text.trim();
    const e = save();
    const used = (e.used || []).map((id) => Data.byId.get(id)).filter(Boolean);
    const errs = Writing.check(text).filter((t) => t.kind === 'error').length;
    const wcDone = ed.wc.length && ed.wc.every((id) => { const w = Data.byId.get(id); return w && Writing.tokens(text).some((t) => { const x = Data.lookup(t); return x && x.id === w.id; }); });
    if (wcDone) Store.bump('wordChallenge');
    const expr = e.words >= GOAL_WORDS ? 'cheer' : e.words >= 10 ? 'happy' : 'think';
    const lines = e.words >= GOAL_WORDS ? ['Bài viết dài và rất tốt!', 'Dango đọc mà thấy giỏi quá!', 'Bạn viết nhiều hơn hôm qua rồi đó!'] : e.words >= 10 ? ['Viết đều mỗi ngày là bí quyết đó!', 'Hay lắm, mai mình viết thêm nhé!'] : ['Ngắn thôi cũng được, quan trọng là bạn đã viết!', 'Mai mình thử viết thêm một câu nhé.'];
    FX.confetti({ count: e.words >= GOAL_WORDS ? 90 : 30 });
    FX.sound('complete');
    setTimeout(() => A.checkBadges(), 400);
    const stats = statsAll();
    view.innerHTML = `
      <section class="card summary jdone">
        <div class="dango-wrap">${A.stickers.dango(expr, 96)}</div>
        <h1>Đã lưu trang nhật ký!</h1>
        <p class="muted">${esc(lines[Math.floor(Math.random() * lines.length)])}</p>
        <div class="stats"><div class="stat"><b>${e.words}</b><span>từ hôm nay</span></div><div class="stat"><b>${used.length}</b><span>từ đã học bạn dùng</span></div><div class="stat"><b>${Store.journalStreak()}</b><span>ngày viết liên tiếp</span></div><div class="stat"><b>${stats.words}</b><span>từ tổng cộng</span></div></div>
        ${used.length ? `<p class="hint">Từ đã học bạn đã dùng hôm nay:</p><div class="hardlist">${used.slice(0, 14).map((w) => `<span class="hardw">${esc(w.word)}</span>`).join('')}</div>` : ''}
        ${wcDone ? '<p class="notice">🎯 Bạn đã dùng đủ 3 từ trong thử thách từ!</p>' : ''}
        ${ed.challenge ? `<p class="notice">${challengeDone()[ed.challenge] ? '✅ Đã tính ngày ' + ed.challenge + ' của thử thách 7 ngày.' : `Viết thêm ít nhất ${CHALLENGE_MIN} từ để tính ngày ${ed.challenge} của thử thách.`}</p>` : ''}
        ${errs ? `<p class="hint">Còn ${errs} chỗ có thể sửa. Bạn có thể quay lại bài để xem gợi ý.</p>` : ''}
        <div class="row wrap"><a class="btn primary" href="#journal">Về nhật ký</a><a class="btn" href="#journal/${ed.date}">${errs ? 'Xem gợi ý sửa' : 'Xem lại bài'}</a><a class="btn" href="#learn">Về trang Hôm nay</a></div>
      </section>`;
    view.onclick = null;
    ed.finished = true;
    if (first) FX.sparkle($('.jdone .dango-wrap'), { count: 8 });
  }

  /* ===== Thư gửi tương lai ===== */
  function renderLetters() {
    const ls = Store.get().letters.slice().sort((a, b) => b.created - a.created);
    const now = Date.now();
    const card = (l) => {
      const due = l.openOn <= now, left = Math.max(0, Math.ceil((l.openOn - now) / DAY));
      return `<a class="letter ${l.opened ? 'opened' : due ? 'due' : 'sealed'}" href="#journal/letter/${esc(l.id)}"><span class="letter-i" aria-hidden="true">${l.opened ? '📭' : due ? '📬' : '💌'}</span>
        <span class="letter-b"><b>${esc(l.title || 'Thư không đề')}</b><small class="muted">Viết ngày ${new Date(l.created).toLocaleDateString('vi-VN')} · ${l.opened ? 'đã mở' : due ? 'đã đến lúc mở!' : `mở được sau ${left} ngày`}</small></span></a>`;
    };
    view.innerHTML = `
      <a class="back" href="#journal">‹ Nhật ký</a>
      <section class="page-h row"><div class="dango-wrap sm">${A.stickers.dango('love', 72)}</div><div><h1>Thư gửi tương lai</h1><p class="muted">Viết một lá thư cho chính mình, niêm phong lại, và chỉ mở được khi đến ngày bạn chọn.</p></div></section>
      <div class="row wrap"><a class="btn primary lg" href="#journal/letter/new">✉️ Viết thư mới</a></div>
      <section class="card"><h2>Hộp thư của bạn</h2><div class="letters">${ls.map(card).join('') || '<p class="muted">Chưa có lá thư nào. Hãy viết lá thư đầu tiên cho chính mình nhé!</p>'}</div></section>`;
    view.onclick = null;
  }

  function renderLetter(id) {
    if (id === 'new') return renderNewLetter();
    const l = Store.get().letters.find((x) => x.id === id);
    if (!l) { location.hash = '#journal/letters'; return; }
    const now = Date.now(), due = l.openOn <= now, left = Math.max(0, Math.ceil((l.openOn - now) / DAY));
    if (!due) {
      view.innerHTML = `<a class="back" href="#journal/letters">‹ Hộp thư</a>
        <section class="card center-card"><div class="dango-wrap">${A.stickers.dango('sleepy', 96)}</div><h1>${esc(l.title || 'Thư không đề')}</h1><p class="big-emoji" aria-hidden="true">💌</p>
        <p class="muted">Lá thư này đang được niêm phong. Còn <b>${left}</b> ngày nữa (đến ${new Date(l.openOn).toLocaleDateString('vi-VN')}) bạn mới mở được.</p><p class="hint">Kiên nhẫn một chút, điều bất ngờ đáng để chờ!</p></section>`;
      view.onclick = null;
      return;
    }
    const first = !l.opened;
    if (first) { l.opened = now; Store.save(); }
    view.innerHTML = `<a class="back" href="#journal/letters">‹ Hộp thư</a>
      <section class="card letter-open"><div class="dango-wrap">${A.stickers.dango('love', 96)}</div><h1>${esc(l.title || 'Thư không đề')}</h1>
        <p class="muted">Bạn viết ngày ${new Date(l.created).toLocaleDateString('vi-VN')}</p>
        <div class="letter-text">${esc(l.text).replace(/\n/g, '<br>')}</div>
        <div class="row wrap"><button class="btn" id="lt-read">🔊 Nghe lại</button><a class="btn primary" href="#journal/letter/new">✉️ Viết thư trả lời</a><button class="btn danger" id="lt-del">Xóa thư</button></div></section>`;
    view.onclick = (e) => {
      if (e.target.closest('#lt-read') && TTS.ok) TTS.speak(l.text.slice(0, 1500), { rate: 0.85 });
      if (e.target.closest('#lt-del') && confirm('Xóa lá thư này?')) { Store.get().letters = Store.get().letters.filter((x) => x.id !== l.id); Store.save(); location.hash = '#journal/letters'; }
    };
    if (first) { FX.confetti(); FX.sound('complete'); A.checkBadges(); }
  }

  function renderNewLetter() {
    const OPTS = [[7, '1 tuần'], [30, '1 tháng'], [90, '3 tháng'], [180, '6 tháng'], [365, '1 năm']];
    let days = 30;
    const draw = () => {
      view.innerHTML = `<a class="back" href="#journal/letters">‹ Hộp thư</a>
        <section class="card"><h1>Viết thư cho tương lai</h1>
          <label class="field"><span>Tiêu đề</span><input id="lt-title" class="input" maxlength="80" placeholder="Gửi bản thân sau 3 tháng"></label>
          <label class="field"><span>Nội dung (viết tiếng Anh hoặc tiếng Việt đều được)</span><textarea id="lt-text" class="input jtext" rows="9" placeholder="Dear future me, ..."></textarea></label>
          <p class="hint">Gợi ý: Hôm nay mình đang ... Mình mong rằng khi đọc thư này, bạn đã ... Điều mình muốn nhắn nhủ là ...</p>
          <p class="field-l">Mở thư sau:</p>
          <div class="chips">${OPTS.map(([d, l]) => `<button class="chip" data-d="${d}" aria-pressed="${days === d}">${l}</button>`).join('')}</div>
          <p class="muted" id="lt-when"></p>
          <div class="row wrap"><button class="btn primary lg" id="lt-seal">💌 Niêm phong và gửi vào tương lai</button></div></section>`;
      $('#lt-when').textContent = 'Bạn sẽ mở được vào ngày ' + new Date(Date.now() + days * DAY).toLocaleDateString('vi-VN') + '.';
      view.onclick = (e) => {
        const c = e.target.closest('[data-d]');
        if (c) { const t = $('#lt-title').value, x = $('#lt-text').value; days = +c.dataset.d; draw(); $('#lt-title').value = t; $('#lt-text').value = x; return; }
        if (e.target.closest('#lt-seal')) {
          const text = $('#lt-text').value.trim();
          if (text.length < 10) return toast('Hãy viết ít nhất vài chữ cho chính mình nhé.');
          if (!confirm('Niêm phong lá thư? Bạn sẽ không đọc lại được cho đến ngày mở.')) return;
          Store.get().letters.push({ id: String(Date.now()), title: $('#lt-title').value.trim(), text, created: Date.now(), openOn: Date.now() + days * DAY, opened: 0 });
          Store.save();
          FX.sound('sticker'); FX.confetti({ count: 40 });
          toast('Đã niêm phong. Hẹn gặp lại bạn ở tương lai! 💌');
          A.checkBadges();
          location.hash = '#journal/letters';
        }
      };
    };
    draw();
  }

  /* ===== Định tuyến ===== */
  function route(arg, arg2) {
    if (arg === 'letters') return renderLetters();
    if (arg === 'letter') return renderLetter(arg2);
    if (isKey(arg)) return renderEditor(arg, arg2);
    return renderHome();
  }
  A.routes.journal = guard(route);
  A.NAV_OF.journal = 'more';

  /* ===== Gắn vào các trang khác ===== */
  A.hubs.more.unshift(() => A.hubTile('#journal', '📔', 'Nhật ký', 'Viết tiếng Anh mỗi ngày, có gợi ý và sửa lỗi', 'lilac'));
  A.slots.today.push(() => {
    const t = today(), e = Store.journalGet(t), wrote = !!(e && e.text.trim());
    const sug = topicBy(suggestTopic(t)) || TOPICS[0];
    const due = Store.get().letters.filter((l) => !l.opened && l.openOn <= Date.now()).length;
    return `<section class="card jcard"><div class="card-h"><h2>📔 Nhật ký hôm nay</h2><span class="muted">${wrote ? '✅ ' + e.words + ' từ' : Store.journalStreak() ? '🔥 ' + Store.journalStreak() + ' ngày' : ''}</span></div>
      ${wrote ? '<p class="muted">Bạn đã viết hôm nay rồi. Viết thêm cũng được nhé!</p>' : `<p>${esc(sug.icon + ' ' + sug.prompts[0][0])}</p><small class="muted">${esc(sug.prompts[0][1])}</small>`}
      ${due ? `<p class="notice">💌 Có ${due} lá thư từ quá khứ đã đến lúc mở!</p>` : ''}
      <div class="row wrap"><a class="btn ${wrote ? '' : 'primary'}" href="#journal/${t}${wrote ? '' : '/' + sug.key}">${wrote ? 'Viết tiếp' : '✍️ Viết nhật ký'}</a>${due ? '<a class="btn" href="#journal/letters">Mở thư</a>' : ''}</div></section>`;
  });

  A.journal = { lookup, viCandidates, statsAll, suggestTopic, usedIds };
});
