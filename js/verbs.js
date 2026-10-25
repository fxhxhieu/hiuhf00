/* hiuhf0 — verbs.js
 * Bảng động từ bất quy tắc (tra cứu, lọc theo kiểu biến đổi) và luyện tập gõ dạng quá khứ, phân từ hai.
 * Dữ liệu ở js/data/irregular.js. Kết quả đúng được cộng vào thống kê để mở sticker.
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const { $, $$, esc, view, toast } = A;
  const list = Data.irregular;
  const kind = (v) => (v.base === v.v2 && v.v2 === v.v3 ? 'same' : v.v2 === v.v3 ? 'two' : 'diff');
  const KINDS = [['all', 'Tất cả'], ['same', 'Giống nhau cả ba (cut, cut, cut)'], ['two', 'Quá khứ = phân từ (bought, bought)'], ['diff', 'Khác nhau cả ba (go, went, gone)']];
  const f = { k: 'all', q: '', known: 'all' };
  const known = (v) => !!Store.card(v.base + '~v');
  const dango = (e, s) => (A.stickers ? A.stickers.dango(e, s) : Mascot.svg(e, s));

  function renderTable() {
    const q = f.q.trim().toLowerCase();
    const rows = list.filter((v) => (f.k === 'all' || kind(v) === f.k) && (f.known === 'all' || (f.known === 'yes') === known(v)) && (!q || v.base.indexOf(q) >= 0 || v.v2.indexOf(q) >= 0 || v.v3.indexOf(q) >= 0 || v.vi.toLowerCase().indexOf(q) >= 0));
    view.innerHTML = `
      <a class="back" href="#practice">‹ Luyện</a>
      <section class="page-h row"><div class="dango-wrap sm">${dango('think', 72)}</div><div><h1>Động từ bất quy tắc</h1><p class="muted">${list.length} động từ hay gặp. Bảng gồm nguyên mẫu, quá khứ, phân từ hai.</p></div></section>
      <div class="row wrap"><a class="btn primary lg" href="#verbs/practice">✍️ Luyện tập</a></div>
      <section class="card filters">
        <input id="irr-q" class="input" type="search" placeholder="Tìm: go, went, ăn, bơi…" value="${esc(f.q)}" aria-label="Tìm động từ">
        <div class="chips">${KINDS.map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="${f.k === k}">${l}</button>`).join('')}</div>
        <div class="chips">${[['all', 'Mọi động từ'], ['yes', 'Đã học'], ['no', 'Chưa học']].map(([k, l]) => `<button class="chip" data-kn="${k}" aria-pressed="${f.known === k}">${l}</button>`).join('')}</div>
      </section>
      <p class="muted">${rows.length} động từ</p>
      <div class="irr-table" role="table">
        <div class="irr-h" role="row"><span>Nguyên mẫu</span><span>Quá khứ</span><span>Phân từ hai</span><span>Nghĩa</span></div>
        ${rows.map((v) => `<div class="irr-r ${known(v) ? 'known' : ''}" role="row"><span><button class="icon-btn sm" data-say="${esc(v.base)}" aria-label="Nghe ${esc(v.base)}">🔊</button><b>${esc(v.base)}</b></span><span data-say="${esc(v.v2.split('/')[0])}" class="irr-say">${esc(v.v2)}</span><span data-say="${esc(v.v3.split('/')[0])}" class="irr-say">${esc(v.v3)}</span><span class="muted">${esc(v.vi)}</span></div>`).join('') || '<div class="empty card">Không có động từ nào khớp.</div>'}
      </div>`;
    view.oninput = (e) => { if (e.target.id === 'irr-q') { f.q = e.target.value; const pos = e.target.selectionStart; renderTable(); const el = $('#irr-q'); el.focus(); el.setSelectionRange(pos, pos); } };
    view.onclick = (e) => {
      const k = e.target.closest('[data-k]');
      if (k) { f.k = k.dataset.k; return renderTable(); }
      const kn = e.target.closest('[data-kn]');
      if (kn) { f.known = kn.dataset.kn; renderTable(); }
    };
  }

  /* ===== Luyện tập: gõ quá khứ hoặc phân từ hai ===== */
  const norm = (s) => String(s).toLowerCase().trim().replace(/\s+/g, ' ');
  const accepts = (ans, typed) => ans.split('/').some((a) => norm(a) === norm(typed));

  function practice() {
    const qs = A.shuffle(list.slice()).slice(0, 10).map((v) => ({ v, ask: Math.random() < 0.5 ? 'v2' : 'v3' }));
    let i = 0, right = 0, answered = false;
    const draw = () => {
      const q = qs[i], v = q.v;
      view.innerHTML = `
        <a class="back" href="#verbs">‹ Bảng động từ</a>
        <section class="session"><div class="s-top"><div class="progress"><i style="width:${Math.round((i / qs.length) * 100)}%"></i></div><span class="s-count">${i}/${qs.length}</span></div>
        <div class="s-counts"><span class="k-learn">Đúng ${right}</span></div>
        <div class="prompt"><div class="fc-word">${esc(v.base)}</div><div class="fc-pos">${esc(v.vi)}</div>
          <p class="muted center">Gõ ${q.ask === 'v2' ? '<b>quá khứ</b> (V2)' : '<b>phân từ hai</b> (V3)'} của động từ này</p></div>
        ${answered ? `<div class="result ${answered.ok ? 'ok' : 'bad'}">${answered.ok ? 'Chính xác!' : 'Chưa đúng'}<small>${esc(v.base)} → <b>${esc(v.v2)}</b> → <b>${esc(v.v3)}</b></small>${answered.ok ? '' : `<small>Bạn gõ: ${esc(answered.typed)}</small>`}</div>
          <div class="row wrap center-row"><button class="btn" data-say="${esc(v[q.ask].split('/')[0])}">🔊 Nghe</button><button class="btn primary" id="irr-next">${i + 1 >= qs.length ? 'Xem kết quả' : 'Câu tiếp theo'}</button></div>`
          : `<form class="typebox" id="irr-form" autocomplete="off"><input id="irr-in" class="input lg" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ ${q.ask === 'v2' ? 'quá khứ' : 'phân từ hai'}…" aria-label="Câu trả lời"><button class="btn primary" type="submit">Kiểm tra</button></form>
             <button class="btn ghost sm center-btn" id="irr-skip">Mình không nhớ</button>`}
        </section>`;
      if (!answered) $('#irr-in').focus();
      view.onsubmit = (e) => {
        e.preventDefault();
        if (answered) return;
        const typed = $('#irr-in').value;
        if (!typed.trim()) return;
        answered = { ok: accepts(v[q.ask], typed), typed };
        if (answered.ok) { right += 1; Store.bump('irregularOk'); }
        FX.sound(answered.ok ? 'correct' : 'wrong');
        draw();
        FX.anim($('.result'), answered.ok ? 'jelly' : 'shake');
      };
      view.onclick = (e) => {
        if (e.target.closest('#irr-skip')) { answered = { ok: false, typed: '(bỏ qua)' }; FX.sound('wrong'); return draw(); }
        if (!e.target.closest('#irr-next')) return;
        answered = false;
        i += 1;
        if (i >= qs.length) return summary();
        draw();
      };
    };
    const summary = () => {
      const stars = right >= 9 ? 3 : right >= 7 ? 2 : 1;
      if (stars >= 2) { FX.confetti(); FX.sound('complete'); }
      view.innerHTML = `<section class="card summary"><div class="dango-wrap">${dango(stars === 3 ? 'cheer' : stars === 2 ? 'happy' : 'think', 96)}</div>
        <div class="stars" role="img" aria-label="${stars} trên 3 sao">${[1, 2, 3].map((n) => `<span class="star ${n <= stars ? 'on' : ''}" style="--i:${n}">★</span>`).join('')}</div>
        <h1>${right}/${qs.length} câu đúng</h1><p class="muted">${stars === 3 ? 'Giỏi quá, bạn thuộc bảng rồi!' : 'Xem lại bảng rồi thử lần nữa nhé.'}</p>
        <div class="row wrap"><a class="btn primary" href="#verbs/practice" id="irr-again">Luyện lại</a><a class="btn" href="#verbs">Xem bảng</a></div></section>`;
      view.onclick = (e) => { if (e.target.closest('#irr-again')) { e.preventDefault(); practice(); } };
      view.onsubmit = null;
      setTimeout(() => A.checkBadges(), 400);
    };
    draw();
  }

  A.routes.verbs = (arg) => (arg === 'practice' ? practice() : renderTable());
  A.NAV_OF.verbs = 'practice';
  A.hubs.practice.push(() => A.hubTile('#verbs', '🔁', 'Động từ bất quy tắc', `${list.length} động từ: bảng tra và luyện gõ quá khứ, phân từ hai`, 'lilac'));
});
