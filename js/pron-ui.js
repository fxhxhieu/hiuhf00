/* hiuhf0 — pron-ui.js
 * Giao diện luyện phát âm (trang #pron): hồ sơ và kế hoạch hằng ngày, bài đo, thẻ hướng dẫn tạo âm, bài nhịp câu và trình chạy chuỗi bài.
 * Phần thu âm và phản hồi giọng nói (bài đọc, bản ghi mốc, phòng thử nghiệm, cài đặt chấm âm vị) nằm ở js/pron-rec.js,
 * dùng chung trình chạy ở đây qua window.PronUI. Logic tính toán nằm ở js/pron.js (hàm thuần, có test).
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const { $, $$, esc, view, toast } = A;
  const PR = window.PRON;
  const TG = Pron.targets(Data.pairs, PR.extra);
  const dango = (e, s) => (A.stickers ? A.stickers.dango(e, s) : Mascot.svg(e, s));
  const st = () => Pron.ensure(Store.get());
  const tg = (id) => TG.find((t) => t.id === id) || { id, vi: id, cat: 'cons', imp: 1 };
  const catOf = (k) => PR.cats.find((c) => c.key === k) || { key: k, vi: k, icon: '•' };
  const guideById = (id) => PR.guides.find((g) => g.id === id);
  const guideOfTarget = (id) => { const t = tg(id); return (t.guide && guideById(t.guide)) || PR.guides.find((g) => g.targets.indexOf(id) >= 0) || null; };
  const guideLink = (id, label) => { const g = guideOfTarget(id); return g ? `<a class="btn sm ghost" href="#pron/guide/${g.id}">${label || '📖 Cách tạo âm'}</a>` : ''; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = A.shuffle;
  const LEVEL_TXT = { none: 'chưa đo', low: 'ít dữ liệu', mid: 'tạm tin được', high: 'khá tin cậy' };
  const group = (id) => Data.pairs.find((g) => g.id === id);
  const irregular = () => new Set(Data.irregular.map((v) => v.base));
  const learned = () => Data.words.filter((w) => !w.custom && Store.card(w.id));
  /** Nguồn từ cho các bài trọng âm và đuôi từ: từ đã học nếu đủ nhiều, không thì cấp A1, A2. */
  const wordPool = () => { const l = learned(); return l.length >= 60 ? l : Data.words.filter((w) => w.level === 'A1' || w.level === 'A2'); };
  const todayKey = () => Store.dayKey();

  /* ================= Trình chạy chuỗi bài ================= */
  let seq = null;
  const aborters = []; // hàm dọn của tác vụ đang chạy (đang thu âm, bộ đếm…)
  function abortAll() { while (aborters.length) { try { aborters.pop()(); } catch (e) { /* bỏ qua */ } } }
  window.addEventListener('hashchange', () => { abortAll(); seq = null; });
  /** Chuyển trang; đang ở đúng địa chỉ đó thì vẽ lại, vì đặt lại cùng một hash không phát ra hashchange. */
  const go = (h) => { if (location.hash === h) A.rerender(); else location.hash = h; };

  const nextBtn = (S) => `<button class="btn primary lg block" data-pr="next">${S.i + 1 >= S.tasks.length ? 'Xong' : 'Tiếp tục'} <kbd>Enter</kbd></button>`;
  function frame(S, stage, actions) {
    const pct = Math.round((S.i / S.tasks.length) * 100);
    view.innerHTML = `
      <section class="session">
        <div class="s-top"><button class="icon-btn" id="pr-exit" aria-label="Thoát bài">✕</button><div class="progress"><i style="width:${pct}%"></i></div><span class="s-count">${S.i}/${S.tasks.length}</span></div>
        <div class="s-counts"><span class="k-learn">Đúng ${S.right}</span><span class="s-meta">${esc(S.title)}</span></div>
        <div id="stage">${stage}</div>
        <div id="actions">${actions || ''}</div>
      </section>`;
    view.onclick = onSeqClick;
  }
  function onSeqClick(e) {
    const S = seq;
    if (!S || e.target.closest('[data-say]')) return;
    const b = e.target.closest('button');
    if (b && b.id === 'pr-exit') { if (confirm('Thoát bài này? Các câu đã làm vẫn được ghi nhận.')) { abortAll(); const back = S.back; seq = null; go(back); } return; }
    if (b && b.dataset.pr === 'next') return advance();
    if (S.handle) S.handle(e);
  }
  function drawTask() {
    const S = seq;
    if (!S) return;
    abortAll();
    S.handle = null;
    const t = S.tasks[S.i];
    PronUI.R[t.type](S, t);
  }
  function advance() {
    const S = seq;
    if (!S) return;
    S.i += 1;
    if (S.i >= S.tasks.length) { const f = S.onFinish; abortAll(); if (f) f(S); return; }
    drawTask();
  }
  /** o: { title, tasks, back, onFinish(S) }. Mỗi tác vụ có type ('perc', 'stress', 'ending', 'rhythm', 'prod') và tự vẽ bằng PronUI.R[type]. */
  function runSeq(o) {
    abortAll();
    seq = { title: o.title, tasks: o.tasks, back: o.back || '#pron', i: 0, right: 0, answered: 0, onFinish: o.onFinish, handle: null, log: [] };
    drawTask();
  }
  /** Ghi kết quả một tác vụ nghe/chọn: bằng chứng cho nhóm âm và số liệu của chuỗi. */
  function finishTask(S, t, ok, kind, mode) {
    Pron.record(st(), t.target, kind || 'perc', ok);
    if (mode) Store.logListen(mode, ok);
    S.answered += 1;
    if (ok) S.right += 1;
    S.log.push({ target: t.target, ok });
    Store.save();
  }

  document.addEventListener('keydown', (e) => {
    if (!seq || A.currentRoute() !== 'pron' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const next = $('[data-pr="next"]');
    if ((e.key === 'Enter' || (e.key === ' ' && tag !== 'button')) && next) { e.preventDefault(); next.click(); return; }
    if (e.key >= '1' && e.key <= '4') { const b = $(`[data-pick="${+e.key - 1}"]`); if (b && !b.disabled) { e.preventDefault(); b.click(); } return; }
    if (e.key === 'p' || e.key === 'P') { const b = $('#stage [data-say]'); if (b) b.click(); }
  });

  /* ================= Tác vụ nghe và chọn ================= */
  const slowBtn = (word, attrs) => `<button class="btn" data-say="${esc(word)}" data-rate="0.55" ${attrs || ''}>🐢 Nghe chậm</button>`;
  const dots = (n, k) => `<span class="dots" role="img" aria-label="Nhấn âm tiết thứ ${k + 1} trong ${n} âm tiết">${Array.from({ length: n }, (_, i) => `<i class="${i === k ? 'on' : ''}" aria-hidden="true">${i === k ? '●' : '○'}</i>`).join('')}</span>`;
  const optBtn = (cls, i, inner, off) => `<button class="${cls}" data-pick="${i}" ${off ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${inner}</span></button>`;
  const optCls = (picked, i, right) => 'opt' + (picked != null ? (i === right ? ' correct' : picked === i ? ' wrong' : ' dim') : '');

  const R = {
    /* Nghe một từ của cặp âm, chọn từ đã nghe. Mỗi lần một giọng vùng khác nhau nếu máy có. */
    perc(S, t) {
      const word = t.p[t.side * 2], say = (extra) => `data-say="${esc(word)}" data-mix="always" data-seed="${t.seed}" ${extra || ''}`;
      let picked = null;
      const draw = () => {
        const opts = [0, 1].map((i) => optBtn(optCls(picked, i, t.side), i, `${esc(t.p[i * 2])}${picked != null ? ` <span class="ipa">/${esc(t.p[i * 2 + 1])}/</span>` : ''}`, picked != null)).join('');
        const done = picked != null, ok = picked === t.side;
        frame(S, `<div class="prompt"><button class="btn lg" ${say()}>🔊 Nghe <kbd>P</kbd></button><button class="btn" ${say('data-rate="0.55"')}>🐢 Nghe chậm</button></div>
          <p class="muted center">Bạn nghe thấy từ nào?</p><div class="options">${opts}</div>
          ${done ? `<div class="result ${ok ? 'ok' : 'bad'}">${ok ? 'Chính xác' : 'Chưa đúng'}: <b>${esc(word)}</b><small>Nhóm: ${esc(tg(t.target).vi)}</small></div>
            <div class="row wrap center-row"><button class="btn sm" data-say="${esc(t.p[0])}" data-mix="always" data-seed="${t.seed + 1}">🔊 ${esc(t.p[0])}</button><button class="btn sm" data-say="${esc(t.p[2])}" data-mix="always" data-seed="${t.seed + 2}">🔊 ${esc(t.p[2])}</button>${ok ? '' : guideLink(t.target)}</div>` : ''}`, done ? nextBtn(S) : '');
      };
      S.handle = (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b || picked != null) return;
        picked = +b.dataset.pick;
        finishTask(S, t, picked === t.side, 'perc', 'pair');
        draw();
        A.answerFx(picked === t.side, $('#stage .result'));
      };
      draw();
      if (TTS.ok) TTS.speak(word, { mix: 'always', seed: t.seed });
    },

    /* Trọng âm: nghe một từ, chọn âm tiết được nhấn (suy ra từ IPA) */
    stress(S, t) {
      const q = t.q;
      let picked = null;
      const draw = () => {
        const done = picked != null, ok = picked === q.a;
        const opts = q.opts.map((o, i) => optBtn(optCls(picked, i, q.a), i, dots(q.n, o), done)).join('');
        frame(S, `<div class="prompt"><div class="fc-word">${esc(q.w.word)}</div><div class="fc-pos">${esc(q.w.pos)} · ${esc(q.w.vi)}</div>
          <div class="row wrap center-row"><button class="btn" data-say="${esc(q.w.word)}">🔊 Nghe <kbd>P</kbd></button>${slowBtn(q.w.word)}</div></div>
          <p class="muted center">Âm tiết nào được nhấn mạnh nhất?</p><div class="options dotopts">${opts}</div>
          ${done ? `<div class="result ${ok ? 'ok' : 'bad'}">${ok ? 'Chính xác' : 'Chưa đúng'}<small><span class="ipa">/${esc(q.w.ipa)}/</span> · nhấn ở âm tiết thứ ${q.k + 1} trong ${q.n}</small></div>${ok ? '' : `<div class="row wrap center-row">${guideLink('stress')}</div>`}` : ''}`, done ? nextBtn(S) : '');
      };
      S.handle = (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b || picked != null) return;
        picked = +b.dataset.pick;
        finishTask(S, t, picked === q.a, 'perc', 'stress');
        draw();
        A.answerFx(picked === q.a, $('#stage .result'));
      };
      draw();
      if (TTS.ok) TTS.speak(q.w.word);
    },

    /* Đuôi -s và -ed đọc là gì (suy ra từ âm cuối của từ gốc) */
    ending(S, t) {
      const q = t.q;
      let picked = null;
      const draw = () => {
        const done = picked != null, ok = picked === q.a;
        const opts = q.opts.map((o, i) => optBtn(optCls(picked, i, q.a), i, '/' + esc(o) + '/', done)).join('');
        const suffix = q.kind === 'ed' ? 'ed' : (/es$/.test(q.form) && !/[^aeiou]ies$/.test(q.form) ? 'es' : 's');
        frame(S, `<div class="prompt"><div class="fc-pos">${q.kind === 'ed' ? 'Dạng quá khứ có quy tắc' : 'Động từ ngôi thứ ba số ít'}</div><div class="fc-word">${esc(q.form)}</div><span class="ipa">${esc(q.w.word)} /${esc(q.w.ipa)}/ · ${esc(q.w.vi)}</span></div>
          <p class="muted center">Đuôi <b>-${suffix}</b> trong “${esc(q.form)}” đọc là gì?</p><div class="options">${opts}</div>
          ${done ? `<div class="result ${ok ? 'ok' : 'bad'}">${ok ? 'Chính xác' : 'Chưa đúng'}<small>${esc(Drills.endingRule(q))}</small></div><div class="row wrap center-row"><button class="btn sm" data-say="${esc(q.form)}">🔊 Nghe “${esc(q.form)}”</button>${ok ? '' : guideLink('ending')}</div>` : ''}`, done ? nextBtn(S) : '');
      };
      S.handle = (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b || picked != null) return;
        picked = +b.dataset.pick;
        finishTask(S, t, picked === q.a, 'perc', 'ending');
        draw();
        A.answerFx(picked === q.a, $('#stage .result'));
      };
      draw();
    },

    /* Nhịp câu: chạm vào những từ được nhấn, từ chức năng đọc nhẹ */
    rhythm(S, t) {
      const toks = t.toks, mark = new Set();
      let checked = false, score = 0;
      const draw = () => {
        const chips = toks.map((k, i) => {
          let cls = 'chip-w' + (mark.has(i) ? ' on' : '');
          if (checked) cls += (mark.has(i) === k.stressed ? ' good' : ' bad');
          return `<button class="${cls}" data-tok="${i}" ${checked ? 'disabled' : ''}>${esc(k.w)}</button>`;
        }).join('');
        const weakList = toks.filter((k) => k.weak).map((k) => `<li><b>${esc(k.w)}</b> đọc nhẹ thành <span class="ipa">/${esc(k.weak)}/</span></li>`).join('');
        frame(S, `<div class="prompt"><p class="muted center">Chạm vào những từ được <b>NHẤN</b> (từ mang nghĩa chính). Từ chức năng như a, the, to, of, can đọc nhẹ và nhanh.</p>
          <div class="chipbank">${chips}</div>
          <div class="row wrap center-row"><button class="btn" data-say="${esc(t.text)}">🔊 Nghe cả câu</button>${slowBtn(t.text)}${checked ? '' : '<button class="btn primary" data-act="check">Kiểm tra</button>'}</div></div>
          ${checked ? `<div class="result ${score >= 0.8 ? 'ok' : 'bad'}">${score >= 0.8 ? 'Tốt' : 'Chưa đúng hết'}: ${Math.round(score * 100)}% số từ<small class="rline">${toks.map((k) => (k.stressed ? esc(k.w).toUpperCase() : esc(k.w).toLowerCase())).join(' ')}</small></div>
            ${weakList ? `<div class="card reveal"><p class="muted">Dạng đọc nhẹ của từ chức năng:</p><ul class="misslist">${weakList}</ul></div>` : ''}
            <div class="row wrap center-row">${guideLink('rhythm', '📖 Về nhịp câu')}</div>` : ''}`, checked ? nextBtn(S) : '');
      };
      S.handle = (e) => {
        const c = e.target.closest('[data-tok]');
        if (c && !checked) { const i = +c.dataset.tok; if (mark.has(i)) mark.delete(i); else mark.add(i); draw(); return; }
        if (e.target.closest('[data-act="check"]') && !checked) {
          checked = true;
          score = toks.filter((k, i) => mark.has(i) === k.stressed).length / toks.length;
          finishTask(S, t, score >= 0.8, 'perc', 'rhythm');
          draw();
          A.answerFx(score >= 0.8, $('#stage .result'));
        }
      };
      draw();
    }
  };

  /* ================= Dựng các tác vụ ================= */
  const percTasks = (id, n) => { const g = group(id), used = new Set(); return Array.from({ length: n }, () => Object.assign(Pron.percItem(g, Math.random, used), { type: 'perc', seed: Math.floor(Math.random() * 1e6) })); };
  const stressTasks = (n) => Drills.stressQuestions(wordPool(), n).map((q) => ({ type: 'stress', target: 'stress', q }));
  const endingTasks = (n) => {
    const irr = irregular(), pool = wordPool();
    return shuffle(Drills.endingQuestions(pool, 'ed', Math.ceil(n / 2), Math.random, irr).concat(Drills.endingQuestions(pool, 's', Math.floor(n / 2), Math.random, irr))).map((q) => ({ type: 'ending', target: 'ending', q }));
  };
  /** Loại từ của một từ để tìm từ nhấn / từ nhẹ: từ nào trong kho chỉ có loại từ chức năng thì mới coi là chức năng ("like" vừa là động từ vừa là giới từ nên coi là từ nội dung). */
  const FN = ['det', 'pron', 'prep', 'conj'];
  function posOf(w) {
    const es = Data.words.filter((x) => x.word.toLowerCase() === w);
    if (!es.length) { const x = Data.lookup(w); return x ? x.pos : null; }
    const content = es.find((x) => FN.indexOf(x.pos) < 0);
    return content ? content.pos : es[0].pos;
  }
  function sentencePool() {
    const ok = (w) => { const n = String(w.ex || '').trim().split(/\s+/).length; return n >= 4 && n <= 9; };
    let pool = learned().filter(ok);
    if (pool.length < 12) pool = pool.concat(Data.words.filter((w) => !w.custom && ok(w) && (w.level === 'A1' || w.level === 'A2')));
    return Array.from(new Set(pool.map((w) => w.ex)));
  }
  const rhythmTasks = (n) => shuffle(sentencePool()).slice(0, n).map((s) => ({ type: 'rhythm', target: 'rhythm', text: s, toks: Pron.rhythm(s, posOf, PR.weak) }));
  const prodOfGroup = (id) => {
    const g = group(id), p = pick(g.pairs), side = Math.random() < 0.5 ? 0 : 1;
    return { type: 'prod', target: id, kind: 'word', text: p[side * 2], ipa: p[side * 2 + 1], other: p[(1 - side) * 2], otherIpa: p[(1 - side) * 2 + 1] };
  };
  const prodStress = () => {
    const q = Drills.stressQuestions(wordPool(), 1)[0];
    return q ? { type: 'prod', target: 'stress', kind: 'word', text: q.w.word, ipa: q.w.ipa, vi: q.w.vi, stress: { n: q.n, k: q.k } } : null;
  };
  const prodEnding = () => {
    const q = endingTasks(1)[0];
    if (!q) return null;
    const base = String(q.q.w.ipa).replace(/[ˈˌ]/g, '');
    return { type: 'prod', target: 'ending', kind: 'word', text: q.q.form, ipa: base + q.q.answer, vi: q.q.w.vi, note: 'Đọc rõ đuôi -' + (q.q.kind === 'ed' ? 'ed' : 's') + ' (/' + q.q.answer + '/).' };
  };
  const INTO = { fall: ['I live in Hanoi.', 'She likes coffee.', 'We are at home.', 'My name is Linh.', 'Where do you live?', 'What is your name?'], rise: ['Do you like coffee?', 'Is this your book?', 'Are you ready?', 'Can you help me?', 'Is she at home?'] };
  const prodInto = (dir) => ({ type: 'prod', target: 'intonation', kind: 'sentence', text: pick(INTO[dir]), expect: dir, note: dir === 'rise' ? 'Câu hỏi Yes/No: lên giọng ở cuối.' : 'Xuống giọng ở cuối câu.' });
  const prodRhythm = () => { const s = pick(sentencePool().length ? sentencePool() : ['I want to go home.']); return { type: 'prod', target: 'rhythm', kind: 'sentence', text: s, note: 'Nhấn các từ chính, đọc nhẹ và nhanh các từ chức năng.' }; };

  function planTasks(items) {
    const head = [], tail = [];
    items.forEach((it) => {
      if (group(it.id)) { head.push(...percTasks(it.id, 3)); tail.push(prodOfGroup(it.id)); }
      else if (it.id === 'stress') { head.push(...stressTasks(3)); tail.push(prodStress()); }
      else if (it.id === 'ending') { head.push(...endingTasks(3)); tail.push(prodEnding()); }
      else if (it.id === 'rhythm') { head.push(...rhythmTasks(2)); tail.push(prodRhythm()); }
      else if (it.id === 'intonation') { tail.push(prodInto('fall'), prodInto('rise')); }
    });
    return head.concat(tail).filter(Boolean);
  }
  function diagTasks() {
    const cfg = PR.diag, perc = Pron.buildPerc(Data.pairs, { groups: Array.from(cfg.groups), perGroup: cfg.perGroup });
    const t = perc.map((x, i) => Object.assign(x, { type: 'perc', seed: i * 7 + 3 }));
    return t.concat(stressTasks(cfg.stress), endingTasks(cfg.ending), Array.from(cfg.produce).map(prodOfGroup));
  }

  /* ================= Trang chính ================= */
  function bar(p) { return `<div class="progress sm"><i style="width:${p == null ? 0 : Math.round(p * 100)}%"></i></div>`; }
  /** Ảnh chụp hồ sơ ở lần đo gần nhất ({ ts, s: { mã nhóm lớn: mức vững } }), hoặc null nếu chưa có. */
  const lastSnap = () => { const h = st().diag && st().diag.hist; return h && h.length ? h[h.length - 1] : null; };
  /** base: ảnh chụp của lần đo để so sánh; có thì mỗi nhóm hiện thêm mức tăng giảm so với lúc đó (chỉ khi lệch từ 3 điểm). */
  function profileHTML(base) {
    const rows = Pron.profile(st(), TG, PR.cats);
    const html = rows.map((r) => {
      const was = base && base.s ? base.s[r.cat] : null, d = r.p != null && was != null ? r.p - was : 0;
      const delta = Math.abs(d) >= 0.03 ? `<small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ −'}${Math.round(Math.abs(d) * 100)}</small>` : '';
      return `<div class="mrow"><div class="mrow-h"><span>${r.icon} ${esc(r.vi)}</span><span class="muted">${esc(LEVEL_TXT[r.level])}</span><b>${r.p == null ? '–' : Math.round(r.p * 100) + '%'}${delta}</b></div>${bar(r.p)}
      ${r.weakest.length && r.p != null && r.p < 0.8 ? `<small class="muted">Cần chú ý: ${r.weakest.map((id) => esc(tg(id).vi)).join('; ')}</small>` : ''}</div>`;
    }).join('');
    return html + (base ? `<p class="hint">▲ ▼ là thay đổi so với lần đo ngày ${new Date(base.ts).toLocaleDateString('vi-VN')}, chỉ hiện khi lệch từ 3 điểm trở lên.</p>` : '');
  }
  /** Lưu ảnh chụp hồ sơ của lần đo vừa xong (giữ 12 lần gần nhất). Trả về ảnh của lần đo trước đó để so sánh. */
  function snapshotDiag() {
    const p = st(), s = {};
    Pron.profile(p, TG, PR.cats).forEach((r) => { if (r.p != null) s[r.cat] = Math.round(r.p * 1000) / 1000; });
    if (!p.diag) p.diag = { ts: Date.now(), n: 0, hist: [] };
    const hist = p.diag.hist || (p.diag.hist = []);
    let prev = hist.length ? hist[hist.length - 1] : null;
    if (prev && prev.ts === p.diag.ts) { prev = hist.length > 1 ? hist[hist.length - 2] : null; hist[hist.length - 1] = { ts: p.diag.ts, s }; } else hist.push({ ts: p.diag.ts, s });
    while (hist.length > 12) hist.shift();
    Store.save();
    return prev;
  }
  function planHTML(items) {
    return items.length ? `<ul class="tasks">${items.map((it) => `<li class="task"><span class="task-i" aria-hidden="true">${catOf(it.cat).icon}</span><span class="task-b"><b>${esc(it.vi)}</b><small class="muted">${esc(it.reason)}${it.level === 'low' ? ' · cần thêm dữ liệu' : ''}</small></span>${guideLink(it.id, '📖')}</li>`).join('')}</ul>` : '<p class="muted">Các nhóm âm đều đang vững. Cứ luyện đều để giữ phong độ nhé.</p>';
  }

  function renderHub() {
    const p = st(), now = Date.now();
    const has = Object.keys(p.t).length > 0;
    const items = Pron.plan(p, TG, now, 3);
    const doneToday = p.plan && p.plan.day === todayKey() && p.plan.done.indexOf('all') >= 0;
    view.innerHTML = `
      <a class="back" href="#practice">‹ Luyện</a>
      <section class="page-h row"><div class="dango-wrap sm">${dango('wow', 72)}</div><div><h1>Luyện phát âm</h1><p class="muted">Đo xem bạn yếu âm nào, luyện 5 phút mỗi ngày đúng chỗ đó, và xem tiến bộ theo thời gian.</p></div></section>
      <section class="card">
        <div class="card-h"><h2>Hồ sơ phát âm</h2>${p.diag ? `<span class="muted">đo lần cuối ${new Date(p.diag.ts).toLocaleDateString('vi-VN')}</span>` : ''}</div>
        ${has ? profileHTML(lastSnap()) : '<p class="muted">Chưa có dữ liệu. Bài đo mất khoảng 10 phút: nghe phân biệt các cặp âm, trọng âm, đuôi từ và đọc thử vài từ.</p>'}
        <div class="row wrap"><button class="btn ${has ? '' : 'primary lg'}" data-act="diag">${p.diag ? 'Đo lại' : 'Làm bài đo'}</button></div>
        <p class="hint">Con số là ước lượng từ các lần luyện của bạn (cũ nhạt dần), dùng để chọn việc cần luyện, không phải thang đánh giá trình độ. Nhóm nào “ít dữ liệu” thì chưa nên tin.</p>
      </section>
      <section class="card">
        <div class="card-h"><h2>Hôm nay</h2><span class="muted">${doneToday ? 'đã xong ✅' : 'khoảng 5 phút'}</span></div>
        ${planHTML(items)}
        <div class="row wrap"><button class="btn primary lg" data-act="plan">${doneToday ? 'Luyện thêm một lượt' : 'Bắt đầu luyện'}</button></div>
      </section>
      <div class="hubgrid">
        ${A.hubTile('#pron/guide', '📖', 'Cách tạo âm', 'Sơ đồ lưỡi và môi, so với tiếng Việt, cách tự kiểm tra', 'mint')}
        ${A.hubTile('#sound', '👂', 'Luyện tai', 'Nghe phân biệt cặp âm với nhiều giọng', 'sky')}
        ${A.hubTile('#speak', '🎤', 'Luyện nói', 'Đọc từ, đọc câu, nói tự do', 'pink')}
        ${A.hubTile('#drills', '🥁', 'Trọng âm, đuôi từ, cụm từ', 'Ba bài 10 câu', 'sun')}
        ${A.hubTile('#pron/rhythm', '🎼', 'Nhịp câu', 'Từ nào nhấn, từ nào đọc nhẹ', 'lilac')}
        ${A.hubTile('#pron/rec', '🗂️', 'Bản ghi của tôi', 'Nghe lại giọng mình, so tháng trước với tháng này', 'mint')}
        ${A.hubTile('#pron/score', '🔬', 'Chấm âm vị (tùy chọn)', 'Azure hoặc mô hình chạy trên máy', 'pink')}
        ${A.hubTile('#pron/lab', '🧪', 'Phòng thử nghiệm', 'Kiểm tra bộ chấm có đáng tin với giọng bạn không', 'sky')}
      </div>`;
    view.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'diag') startDiag();
      if (b.dataset.act === 'plan') startPlan();
    };
  }

  /* ================= Bài đo ================= */
  function startDiag() {
    if (!TTS.ok) { toast('Trình duyệt này không đọc to được nên không làm bài đo nghe được.'); return; }
    runSeq({ title: 'Bài đo phát âm', tasks: diagTasks(), back: '#pron', onFinish: diagSelfCheck });
  }
  function diagSelfCheck() {
    const p = st();
    p.diag = { ts: Date.now(), n: seq ? seq.tasks.length : 0, hist: (p.diag && p.diag.hist) || [] };
    Store.save();
    view.innerHTML = `
      <section class="page-h"><h1>Gần xong rồi</h1><p class="muted">Bạn tự thấy phần nào khó nhất? Câu trả lời này chỉ có trọng số rất nhẹ, kết quả đo mới là chính.</p></section>
      <section class="card form">${PR.cats.map((c) => `<label class="field row"><input type="checkbox" value="${c.key}"><span>${c.icon} ${esc(c.vi)}</span></label>`).join('')}
        <div class="row wrap"><button class="btn primary lg" id="pr-self">Xem kết quả</button></div></section>`;
    view.onclick = (e) => {
      if (!e.target.closest('#pr-self')) return;
      const sel = $$('input[type=checkbox]:checked').map((x) => x.value), now = Date.now();
      TG.filter((t) => sel.indexOf(t.cat) >= 0).forEach((t) => Pron.record(p, t.id, 'self', false, now));
      Store.save();
      renderDiagResult();
    };
  }
  function renderDiagResult() {
    const prev = snapshotDiag(), p = st(), items = Pron.plan(p, TG, Date.now(), 3);
    view.innerHTML = `
      <section class="card summary"><div class="dango-wrap">${dango('cheer', 88)}</div><h1>Hồ sơ phát âm của bạn</h1>
        ${profileHTML(prev)}
        <h2>3 việc nên luyện trước</h2>${planHTML(items)}
        <p class="hint">Mỗi nhóm mới được đo vài lần nên còn “ít dữ liệu”. Luyện mỗi ngày thì hồ sơ sẽ chính xác dần.</p>
        <div class="row wrap"><button class="btn primary lg" id="pr-go-plan">Bắt đầu luyện hôm nay</button><a class="btn" href="#pron">Về trang chính</a></div></section>`;
    view.onclick = (e) => { if (e.target.closest('#pr-go-plan')) startPlan(); };
  }

  /* ================= Kế hoạch hằng ngày ================= */
  function startPlan() {
    const p = st(), items = Pron.plan(p, TG, Date.now(), 3);
    if (!items.length) { toast('Các nhóm âm đều đang vững. Hãy luyện thêm bài nói hoặc nhịp câu nhé.'); return; }
    if (!TTS.ok) { toast('Trình duyệt này không đọc to được nên không làm bài nghe được.'); return; }
    p.plan = { day: todayKey(), ids: items.map((i) => i.id), done: [] };
    Store.save();
    runSeq({ title: 'Luyện phát âm hôm nay', tasks: planTasks(items), back: '#pron', onFinish: planFinish });
  }
  function planFinish(S) {
    const p = st();
    if (p.plan) { p.plan.done = ['all']; }
    Store.bump('pronDays');
    Store.save();
    A.checkBadges();
    const by = {};
    S.log.forEach((l) => { const x = by[l.target] || (by[l.target] = { n: 0, ok: 0 }); x.n += 1; if (l.ok) x.ok += 1; });
    const stars = !S.answered ? 1 : S.right / S.answered >= 0.9 ? 3 : S.right / S.answered >= 0.7 ? 2 : 1;
    if (stars >= 2) { FX.confetti(); FX.sound('complete'); }
    view.innerHTML = `
      <section class="card summary"><div class="dango-wrap">${dango(stars === 3 ? 'cheer' : stars === 2 ? 'happy' : 'think', 96)}</div>
        <h1>Xong lượt luyện hôm nay</h1>
        <div class="stats"><div class="stat"><b>${S.right}/${S.answered}</b><span>câu nghe đúng</span></div><div class="stat"><b>${S.read || 0}/${S.tasks.filter((t) => t.type === 'prod').length}</b><span>lượt đọc</span></div></div>
        ${Object.keys(by).length ? `<ul class="misslist">${Object.keys(by).map((id) => `<li><b>${esc(tg(id).vi)}</b>: đúng ${by[id].ok}/${by[id].n}${by[id].ok < by[id].n ? ' ' + guideLink(id) : ''}</li>`).join('')}</ul>` : ''}
        <p class="hint">Ngày mai ứng dụng sẽ chọn lại những nhóm cần luyện nhất dựa trên kết quả hôm nay.</p>
        <div class="row wrap"><a class="btn primary" href="#pron">Về trang chính</a><button class="btn" id="pr-more">Luyện thêm</button></div></section>`;
    view.onclick = (e) => { if (e.target.closest('#pr-more')) startPlan(); };
  }

  /* ================= Nhịp câu ================= */
  function renderRhythm() {
    view.innerHTML = `
      <a class="back" href="#pron">‹ Luyện phát âm</a>
      <section class="page-h"><h1>Nhịp câu</h1><p class="muted">Tiếng Anh nhấn các từ mang nghĩa chính và đọc lướt các từ chức năng. Tiếng Việt đọc đều từng âm tiết nên đây là chỗ hay làm câu nghe “đều đều”.</p></section>
      <section class="card"><h2>${esc(guideById('weak').name)}</h2><ol>${guideById('weak').how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol><p class="hint">${esc(guideById('weak').vs)}</p>
        <div class="row wrap"><button class="btn primary lg" id="pr-rh">Luyện 5 câu</button></div></section>`;
    view.onclick = (e) => {
      if (!e.target.closest('#pr-rh')) return;
      const tasks = rhythmTasks(5);
      if (!tasks.length) { toast('Chưa đủ câu để luyện.'); return; }
      runSeq({ title: 'Nhịp câu', tasks, back: '#pron/rhythm', onFinish: (S) => {
        view.innerHTML = `<section class="card summary"><div class="dango-wrap">${dango(S.right >= 4 ? 'cheer' : 'happy', 88)}</div><h1>${S.right}/${S.answered} câu đúng</h1><p class="muted">Nghe lại các câu mẫu và thử đọc theo nhịp: gõ nhẹ tay vào từng từ được nhấn.</p><div class="row wrap"><a class="btn primary" href="#pron">Về trang chính</a><a class="btn" href="#pron/rhythm">Luyện tiếp</a></div></section>`;
        view.onclick = null;
      } });
    };
  }

  /* ================= Thẻ hướng dẫn tạo âm ================= */
  const LEGEND = '<p class="legend"><span><i class="lg-tongue"></i> lưỡi</span><span><i class="lg-hot"></i> chỗ chạm</span><span><i class="lg-air"></i> luồng hơi</span><span><i class="lg-voice"></i> dây thanh rung</span></p>';
  function renderGuideList() {
    view.innerHTML = `
      <a class="back" href="#pron">‹ Luyện phát âm</a>
      <section class="page-h"><h1>Cách tạo âm</h1><p class="muted">Mỗi thẻ có các bước đặt lưỡi và môi, so với tiếng Việt, cách tự kiểm tra bằng gương, bàn tay hoặc tờ giấy, và cách sửa khi nghe sai.</p></section>
      ${PR.cats.map((c) => { const gs = PR.guides.filter((g) => g.cat === c.key); return gs.length ? `<section class="card"><h2>${c.icon} ${esc(c.vi)}</h2><div class="chips">${gs.map((g) => `<a class="chip" href="#pron/guide/${g.id}">${g.ipa ? '/' + esc(g.ipa) + '/ ' : ''}${esc(g.name.replace(/^Âm /, '').replace(/ \(.*\)$/, '').replace(/^\/.*?\/ ?/, '') || g.name)}</a>`).join('')}</div></section>` : ''; }).join('')}
      <p class="hint">Sơ đồ chỉ để minh họa vị trí tương đối, không chính xác về giải phẫu. Nội dung dựa trên các mô tả ngữ âm thông dụng và nên được giáo viên ngữ âm xem lại.</p>`;
    view.onclick = null;
  }
  function renderGuide(id) {
    const g = guideById(id);
    if (!g) return renderGuideList();
    const tryItems = g.words.slice(0, 4).map((w) => {
      const sent = /\s/.test(w);
      if (sent) return { type: 'prod', target: g.targets[0], kind: 'sentence', text: w, expect: /\?$/.test(w) ? 'rise' : null };
      const ipa = Data.ipaOf(w);
      return { type: 'prod', target: g.targets[0] || 'th-s', kind: 'word', text: w, ipa: ipa || '' };
    });
    view.innerHTML = `
      <a class="back" href="#pron/guide">‹ Cách tạo âm</a>
      <section class="card">
        <div class="card-h"><h1>${esc(g.name)}</h1></div>
        ${g.pic ? `<div class="mouthbox">${Pron.mouthSVG(g.pic)}${LEGEND}</div>` : ''}
        <h2>Cách đọc</h2><ol>${g.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
        <h2>So với tiếng Việt</h2><p>${esc(g.vs)}</p>
        <h2>Tự kiểm tra</h2><ul>${g.check.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <h2>Khi nghe chưa đúng</h2><p>${esc(g.fix)}</p>
        <h2>Nghe và đọc thử</h2>
        <div class="row wrap">${g.words.map((w) => `<button class="btn sm" data-say="${esc(w)}" data-mix="always" data-seed="${esc(w.length)}">🔊 ${esc(w)}</button>`).join('')}</div>
        <div class="row wrap"><button class="btn primary" id="pr-try">🎤 Đọc thử ${tryItems.length} mục</button>${g.targets.filter((t) => group(t)).slice(0, 1).map((t) => `<button class="btn" data-ear="${t}">👂 Luyện tai nhóm này</button>`).join('')}</div>
      </section>`;
    view.onclick = (e) => {
      if (e.target.closest('[data-say]')) return;
      if (e.target.closest('#pr-try')) { runSeq({ title: g.name, tasks: tryItems, back: '#pron/guide/' + g.id, onFinish: () => go('#pron/guide/' + g.id) }); return; }
      const ear = e.target.closest('[data-ear]');
      if (ear) runSeq({ title: 'Luyện tai: ' + tg(ear.dataset.ear).vi, tasks: percTasks(ear.dataset.ear, 6), back: '#pron/guide/' + g.id, onFinish: (S) => { toast('Đúng ' + S.right + '/' + S.answered + ' câu.'); go('#pron/guide/' + g.id); } });
    };
  }

  const PronUI = window.PronUI = { A, R, st, tg, group, catOf, guideById, guideOfTarget, guideLink, frame, nextBtn, advance, runSeq, finishTask, abortAll, aborters, go, getSeq: () => seq, prodOfGroup, percTasks, planTasks, diagTasks, shuffle, pick, LEGEND };

  A.routes.pron = (a, b) => {
    if (a === 'diag') return startDiag();
    if (a === 'plan') return startPlan();
    if (a === 'guide') return b ? renderGuide(b) : renderGuideList();
    if (a === 'rhythm') return renderRhythm();
    if (PronUI.routes && PronUI.routes[a]) return PronUI.routes[a](b);
    return renderHub();
  };
  A.NAV_OF.pron = 'practice';
  A.hubs.practice.push(() => A.hubTile('#pron', '🗣️', 'Luyện phát âm', 'Chẩn đoán điểm yếu, kế hoạch 5 phút mỗi ngày, hướng dẫn tạo âm', 'pink'));
});
