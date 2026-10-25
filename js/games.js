/* hiuhf0 — games.js
 * Ba trò chơi nhỏ để đổi nhịp sau mỗi phiên ôn: Ghép cặp (hình và từ), Nối từ (từ và nghĩa), Đoán chữ (kiểu treo cổ có Dango).
 * Kèm thẻ "Từ của ngày" trên trang Hôm nay. Chơi xong được sao và sticker; không ảnh hưởng lịch ôn (SRS).
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const { $, $$, esc, view, toast } = A;
  const lvIdx = (w) => { const i = Data.LEVELS.findIndex((l) => l.key === w.level); return i < 0 ? 9 : i; };
  const learned = (w) => !!Store.card(w.id);
  const dango = (e, s) => (A.stickers ? A.stickers.dango(e, s) : Mascot.svg(e, s));

  /** Chọn n từ để chơi: ưu tiên từ đã học, bổ sung bằng từ cấp thấp. need: điều kiện thêm (ví dụ có emoji). */
  function pool(n, need) {
    const ok = (w) => !w.custom && w.pos !== 'phr' && w.word.indexOf(' ') < 0 && w.word.length <= 10 && (!need || need(w));
    const mine = A.shuffle(Data.words.filter((w) => ok(w) && learned(w)));
    const more = A.shuffle(Data.words.filter((w) => ok(w) && !learned(w) && lvIdx(w) <= 1));
    const seen = new Set(), out = [];
    mine.concat(more).forEach((w) => { if (out.length < n && !seen.has(w.word.toLowerCase())) { seen.add(w.word.toLowerCase()); out.push(w); } });
    return out;
  }
  const hasEmoji = (w) => !!w.emoji;
  const starsHTML = (n) => `<div class="stars" role="img" aria-label="${n} trên 3 sao">${[1, 2, 3].map((i) => `<span class="star ${i <= n ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>`;

  /* ===== Trang chọn trò chơi ===== */
  const GAMES = [
    ['memory', '🃏', 'Ghép cặp', 'Lật thẻ để ghép hình với từ tiếng Anh', 'pink'],
    ['match', '🔗', 'Nối từ', 'Nối từ tiếng Anh với nghĩa tiếng Việt', 'sky'],
    ['hangman', '🔤', 'Đoán chữ', 'Đoán từ qua hình và gợi ý, đừng để Dango buồn', 'mint']
  ];
  function renderGames() {
    const st = Store.get().stats;
    view.innerHTML = `
      <a class="back" href="#practice">‹ Luyện</a>
      <section class="page-h row"><div class="dango-wrap sm">${dango('cheer', 72)}</div><div><h1>Trò chơi</h1><p class="muted">Chơi vài phút cho vui, từ vựng tự nhớ lâu hơn. Đã chơi <b>${st.games || 0}</b> lần, thắng <b>${st.gamesWon || 0}</b> lần.</p></div></section>
      <div class="hubgrid">${GAMES.map(([k, i, t, d, c]) => A.hubTile('#games/' + k, i, t, d, c)).join('')}</div>`;
  }

  /* ===== Kết thúc một ván ===== */
  function finishGame(kind, stars, perfect, extra) {
    Store.bump('games');
    if (stars >= 2) Store.bump('gamesWon');
    if (perfect) Store.bump('gamePerfect');
    const expr = stars === 3 ? 'cheer' : stars === 2 ? 'happy' : 'think';
    if (stars >= 2) { FX.confetti({ count: stars === 3 ? 80 : 40 }); FX.sound('complete'); FX.haptic([15, 30, 15]); } else FX.sound('wrong');
    view.innerHTML = `
      <section class="card summary">
        <div class="dango-wrap">${dango(expr, 96)}</div>
        ${starsHTML(stars)}
        <h1>${stars === 3 ? 'Xuất sắc!' : stars === 2 ? 'Làm tốt lắm!' : 'Cố lên nào!'}</h1>
        <p class="muted">${extra || ''}${perfect ? ' Hoàn hảo, không sai lần nào! 💯' : ''}</p>
        <div class="row wrap"><a class="btn primary" href="#games/${kind}" id="again">Chơi lại</a><a class="btn" href="#games">Trò khác</a><a class="btn ghost" href="#learn">Về Hôm nay</a></div>
      </section>`;
    view.onclick = (e) => { if (e.target.closest('#again')) { e.preventDefault(); play(kind); } };
    view.onkeydown = null;
    setTimeout(() => A.checkBadges(), 500);
  }

  /* ===== Ghép cặp ===== */
  function memory() {
    const ws = pool(6, hasEmoji);
    if (ws.length < 4) { toast('Chưa đủ từ có hình để chơi. Hãy học thêm vài từ nhé.'); return renderGames(); }
    const cards = A.shuffle(ws.flatMap((w) => [{ id: w.id, type: 'pic', w }, { id: w.id, type: 'word', w }])).map((c, i) => Object.assign(c, { i, open: false, done: false }));
    let first = null, lock = false, moves = 0, mistakes = 0, matched = 0;
    const t0 = Date.now();
    const draw = () => {
      view.innerHTML = `
        <a class="back" href="#games">‹ Trò chơi</a>
        <section class="card"><div class="card-h"><h1>Ghép cặp</h1><span class="muted">${moves} lượt · ${matched}/${ws.length} cặp</span></div>
        <p class="hint">Lật hai thẻ: một thẻ hình và một thẻ từ tiếng Anh có nghĩa giống nhau.</p>
        <div class="mem">${cards.map((c) => `<button class="mc ${c.open || c.done ? 'open' : ''} ${c.done ? 'done' : ''}" data-i="${c.i}" aria-label="${c.open || c.done ? esc(c.type === 'pic' ? c.w.vi : c.w.word) : 'Thẻ úp'}" ${c.done ? 'disabled' : ''}>
          <span class="mc-in"><span class="mc-f">❓</span><span class="mc-b">${c.type === 'pic' ? `<i>${c.w.emoji}</i>` : `<b>${esc(c.w.word)}</b>`}</span></span></button>`).join('')}</div></section>`;
      view.onclick = (e) => {
        const b = e.target.closest('.mc');
        if (!b || lock) return;
        const c = cards[+b.dataset.i];
        if (c.open || c.done) return;
        c.open = true;
        FX.sound('flip');
        if (c.type === 'word' && TTS.ok && Store.settings.autoSpeak) TTS.speak(c.w.word);
        if (!first) { first = c; return draw(); }
        moves += 1;
        const a = first; first = null;
        if (a.id === c.id && a.type !== c.type) {
          a.done = c.done = true; matched += 1;
          FX.sound('correct'); draw();
          FX.sparkle($(`.mc[data-i="${c.i}"]`), { count: 5 });
          if (matched === ws.length) setTimeout(() => finishGame('memory', mistakes <= 2 ? 3 : mistakes <= 5 ? 2 : 1, mistakes === 0, `${moves} lượt, ${Math.round((Date.now() - t0) / 1000)} giây, sai ${mistakes} lần.`), 700);
        } else {
          mistakes += 1; lock = true; FX.sound('wrong'); draw();
          setTimeout(() => { a.open = c.open = false; lock = false; draw(); }, 900);
        }
      };
    };
    draw();
  }

  /* ===== Nối từ ===== */
  function match() {
    const ws = pool(6, (w) => w.vi.length <= 28);
    if (ws.length < 4) { toast('Chưa đủ từ để chơi.'); return renderGames(); }
    const left = A.shuffle(ws.slice()), right = A.shuffle(ws.slice());
    const done = new Set();
    let pickL = null, mistakes = 0;
    const draw = () => {
      view.innerHTML = `
        <a class="back" href="#games">‹ Trò chơi</a>
        <section class="card"><div class="card-h"><h1>Nối từ</h1><span class="muted">${done.size}/${ws.length} cặp · sai ${mistakes}</span></div>
        <p class="hint">Chạm một từ tiếng Anh, rồi chạm nghĩa tiếng Việt của nó.</p>
        <div class="mt"><div class="mt-c">${left.map((w) => `<button class="mt-i ${done.has(w.id) ? 'ok' : ''} ${pickL === w.id ? 'pick' : ''}" data-l="${esc(w.id)}" ${done.has(w.id) ? 'disabled' : ''}>${A.emojiHTML(w)}${esc(w.word)}</button>`).join('')}</div>
        <div class="mt-c">${right.map((w) => `<button class="mt-i ${done.has(w.id) ? 'ok' : ''}" data-r="${esc(w.id)}" ${done.has(w.id) ? 'disabled' : ''}>${esc(w.vi)}</button>`).join('')}</div></div></section>`;
      view.onclick = (e) => {
        const l = e.target.closest('[data-l]'), r = e.target.closest('[data-r]');
        if (l) { pickL = l.dataset.l; FX.sound('tap'); const w = Data.byId.get(pickL); if (w && TTS.ok && Store.settings.autoSpeak) TTS.speak(w.word); return draw(); }
        if (r && pickL) {
          if (r.dataset.r === pickL) {
            done.add(pickL); pickL = null; FX.sound('correct'); draw();
            FX.sparkle($(`[data-r="${r.dataset.r}"]`), { count: 4 });
            if (done.size === ws.length) setTimeout(() => finishGame('match', mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1, mistakes === 0, `Bạn nối sai ${mistakes} lần.`), 600);
          } else { mistakes += 1; FX.sound('wrong'); FX.anim(r, 'shake'); pickL = null; setTimeout(draw, 350); }
        } else if (r) toast('Chạm một từ tiếng Anh trước nhé.');
      };
    };
    draw();
  }

  /* ===== Đoán chữ ===== */
  function hangman() {
    const ws = pool(5, (w) => hasEmoji(w) && /^[a-z]+$/i.test(w.word) && w.word.length >= 3);
    if (ws.length < 3) { toast('Chưa đủ từ có hình để chơi.'); return renderGames(); }
    let idx = 0, solved = 0, wrongTotal = 0, tried = new Set(), wrong = 0, hint = false;
    const MAX = 6;
    const word = () => ws[idx].word.toLowerCase();
    const draw = () => {
      const w = ws[idx], ans = word();
      const shown = ans.split('').map((c) => (tried.has(c) ? c : '_')).join(' ');
      const won = ans.split('').every((c) => tried.has(c)), lost = wrong >= MAX;
      const expr = lost ? 'sad' : wrong >= 4 ? 'think' : won ? 'cheer' : wrong >= 2 ? 'wow' : 'happy';
      view.innerHTML = `
        <a class="back" href="#games">‹ Trò chơi</a>
        <section class="card hg"><div class="card-h"><h1>Đoán chữ</h1><span class="muted">Từ ${idx + 1}/${ws.length} · đoán đúng ${solved}</span></div>
          <div class="hg-top"><div class="dango-wrap">${dango(expr, 88)}</div><div><div class="hg-emo" aria-hidden="true">${w.emoji}</div><div class="hearts" aria-label="Còn ${MAX - wrong} lượt">${Array.from({ length: MAX }, (_, i) => `<span class="${i < MAX - wrong ? 'on' : ''}">❤</span>`).join('')}</div></div></div>
          <p class="center muted">Nghĩa: <b>${esc(w.vi)}</b> · ${w.word.length} chữ cái${hint ? ` · bắt đầu bằng “${esc(w.word[0])}”` : ''}</p>
          <div class="hg-word" aria-label="${won || lost ? esc(w.word) : shown}">${won || lost ? ans.split('').join(' ') : shown}</div>
          ${won ? `<div class="result ok">Đúng rồi! <b>${esc(w.word)}</b> ${A.ipaHTML(w)}</div>` : lost ? `<div class="result bad">Chưa đúng. Đáp án: <b>${esc(w.word)}</b> ${A.ipaHTML(w)}</div>` : ''}
          ${won || lost ? `<div class="row wrap center-row"><button class="btn" data-say="${esc(w.word)}">🔊 Nghe</button><button class="btn primary" id="hg-next">${idx + 1 >= ws.length ? 'Xem kết quả' : 'Từ tiếp theo'}</button></div>`
          : `<div class="kb">${'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `<button class="key ${tried.has(c) ? (ans.indexOf(c) >= 0 ? 'ok' : 'no') : ''}" data-k="${c}" ${tried.has(c) ? 'disabled' : ''}>${c}</button>`).join('')}</div>
             <div class="row wrap center-row"><button class="btn ghost sm" id="hg-hint" ${hint ? 'disabled' : ''}>💡 Gợi ý chữ đầu</button></div>`}
        </section>`;
      if (won || lost) { if (won) { FX.sound('correct'); FX.sparkle($('.hg-word'), { count: 6 }); } else FX.sound('wrong'); }
      view.onclick = (e) => {
        const k = e.target.closest('[data-k]');
        if (k) return guess(k.dataset.k);
        if (e.target.closest('#hg-hint')) { hint = true; tried.add(ans[0]); return draw(); }
        if (e.target.closest('#hg-next')) {
          if (won) solved += 1;
          wrongTotal += wrong;
          idx += 1; tried = new Set(); wrong = 0; hint = false;
          if (idx >= ws.length) return finishGame('hangman', solved >= 5 ? 3 : solved >= 4 ? 2 : 1, solved === ws.length && wrongTotal <= 2, `Bạn đoán đúng ${solved}/${ws.length} từ.`);
          draw();
        }
      };
      view.onkeydown = null;
    };
    function guess(c) {
      const ans = word();
      if (tried.has(c) || wrong >= MAX || ans.split('').every((x) => tried.has(x))) return;
      tried.add(c);
      if (ans.indexOf(c) < 0) { wrong += 1; FX.haptic(15); FX.sound('wrong'); }
      draw();
    }
    hgGuess = guess;
    draw();
  }
  // gõ phím trực tiếp khi đang chơi đoán chữ
  let hgGuess = null;
  document.addEventListener('keydown', (e) => {
    if (!/^#games\/hangman/.test(location.hash) || !hgGuess || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key) && !/input|textarea|select/i.test((e.target.tagName || ''))) hgGuess(e.key.toLowerCase());
  });

  const KINDS = { memory, match, hangman };
  function play(kind) { (KINDS[kind] || renderGames)(); }
  A.routes.games = (arg) => (KINDS[arg] ? play(arg) : renderGames());
  A.NAV_OF.games = 'practice';
  A.hubs.practice.unshift(() => A.hubTile('#games', '🎮', 'Trò chơi', 'Ghép cặp, nối từ, đoán chữ: chơi vài phút cho vui', 'sun'));

  /* ===== Từ của ngày ===== */
  function wordOfDay() {
    const cards = Store.get().cards;
    let top = 0;
    Data.LEVELS.forEach((l, i) => { if (Data.words.filter((w) => w.level === l.key && cards[w.id]).length >= 15) top = i; });
    let ws = Data.words.filter((w) => !w.custom && w.emoji && w.pos !== 'phr' && lvIdx(w) >= top && lvIdx(w) <= top + 1 && !cards[w.id]);
    if (ws.length < 5) ws = Data.words.filter((w) => !w.custom && w.emoji && w.pos !== 'phr');
    const k = Store.dayKey();
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 100003;
    return ws[h % ws.length];
  }
  A.slots.today.push(() => {
    const w = wordOfDay();
    if (!w) return '';
    const c = Store.card(w.id), pinned = !!Store.get().pinned[w.id];
    return `<section class="card wod"><div class="card-h"><h2>🌟 Từ của ngày</h2><span class="muted">${esc(w.level)}</span></div>
      <div class="wod-b"><div class="wod-e" aria-hidden="true">${w.emoji}</div><div class="wod-t"><div class="wod-w">${esc(w.word)} ${A.ipaHTML(w)}</div><div><span class="pos">${esc(w.pos)}</span> <b>${esc(w.vi)}</b></div><small class="muted">${esc(w.ex)}</small></div></div>
      <div class="row wrap"><button class="btn sm" data-say="${esc(w.word)}">🔊 Nghe</button>${c ? `<span class="muted">Bạn đã học từ này</span>` : `<button class="btn sm primary" id="wod-add">${pinned ? '✓ Sẽ học sớm' : '＋ Học từ này'}</button>`}</div></section>`;
  });
  A.clicks.push((e) => {
    if (!e.target.closest('#wod-add')) return false;
    const w = wordOfDay();
    Store.get().pinned[w.id] = 1;
    Store.save();
    FX.sound('correct');
    toast('Từ “' + w.word + '” sẽ được học sớm nhất.');
    e.target.closest('#wod-add').textContent = '✓ Sẽ học sớm';
    return true;
  });

  A.games = { pool, wordOfDay };
});
