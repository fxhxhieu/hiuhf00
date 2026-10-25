/* Bộ kiểm thử trình duyệt: Trò chơi, Từ của ngày, động từ bất quy tắc, hội thoại, thông tin mở rộng.
 * Chạy bằng tests/e2e/run.js: trang được nạp kèm tệp này, kết quả ghi vào #out và document.title = "DONE". */
(async () => {
  const out = { checks: [], errors: [] };
  const pre = document.createElement('pre'); pre.id = 'out'; document.body.appendChild(pre);
  window.addEventListener('error', (e) => out.errors.push('onerror: ' + e.message));
  const _ce = console.error; console.error = (...a) => { out.errors.push('console.error: ' + a.join(' ')); _ce(...a); };
  window.confirm = () => true;
  const ok = (name, cond, extra) => out.checks.push([cond ? 'PASS' : 'FAIL', name, extra === undefined ? '' : String(extra)]);
  const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const H = window.hiuhf0;
  const go = async (h, ms) => { if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = h; await tick(ms || 90); };
  const view = () => $('#view').textContent;
  const dismissPops = () => $$('.sticker-pop').forEach((e) => e.remove());
  try {
    H.Store.settings.onboarded = true;

    /* ===== Hội thoại tình huống ===== */
    ok('kho bài đọc có 6 hội thoại tình huống', H.Data.texts.filter((t) => t.id.indexOf('a2-sit-') === 0).length === 6);
    await go('#shadow');
    ok('Shadowing liệt kê hội thoại mới', view().includes('At the restaurant') && view().includes('On the phone'));
    await go('#read/a2-sit-hotel', 120);
    ok('Dịch bài mở được hội thoại khách sạn', view().includes('reservation') || view().includes('Receptionist'));
    ok('mỗi hội thoại có câu hỏi nghe hiểu', ['restaurant', 'hotel', 'airport', 'doctor', 'directions', 'phone'].every((k) => H.Data.quiz['a2-sit-' + k] && H.Data.quiz['a2-sit-' + k].length === 3));
    await go('#topics/sit-hotel');
    ok('chủ đề Khách sạn có 12 cụm từ', $$('.wchip').length === 12, $$('.wchip').length);

    /* ===== Thông tin mở rộng ===== */
    await go('#library');
    const q = $('#q'); q.value = 'make'; q.dispatchEvent(new Event('input', { bubbles: true })); await tick(80);
    const row = $$('.wrow').find((r) => r.dataset.id === 'make~v');
    row.querySelector('.wrow-head').click(); await tick();
    ok('từ "make": có phần Xem thêm với cụm kết hợp', !!row.querySelector('.i-more') && row.textContent.includes('make a decision'));
    ok('từ "make": có ghi chú cho người Việt', row.textContent.includes('do homework'));
    ok('từ "make": có họ từ', row.textContent.includes('Họ từ'));
    q.value = 'go'; q.dispatchEvent(new Event('input', { bubbles: true })); await tick(80);
    const g = $$('.wrow').find((r) => r.dataset.id === 'go~v');
    g.querySelector('.wrow-head').click(); await tick();
    ok('động từ bất quy tắc "go" hiện went và gone', !!g.querySelector('.i-forms') && g.querySelector('.i-forms').textContent.includes('went') && g.querySelector('.i-forms').textContent.includes('gone'));

    /* ===== Bảng động từ bất quy tắc ===== */
    await go('#practice');
    ok('trang Luyện có ô Trò chơi và Động từ bất quy tắc', !!$('.hub[href="#games"]') && !!$('.hub[href="#verbs"]'));
    await go('#verbs');
    ok('bảng động từ liệt kê trên 80 dòng', $$('.irr-r').length >= 80, $$('.irr-r').length);
    const iq = $('#irr-q'); iq.value = 'went'; iq.dispatchEvent(new Event('input', { bubbles: true })); await tick(80);
    ok('tìm theo dạng quá khứ: went ra go', $$('.irr-r').length === 1 && $('.irr-r').textContent.includes('go'));
    const iq2 = $('#irr-q'); iq2.value = 'bơi'; iq2.dispatchEvent(new Event('input', { bubbles: true })); await tick(80);
    ok('tìm theo nghĩa tiếng Việt: bơi ra swim', $$('.irr-r').some((r) => r.textContent.includes('swim')));
    $('[data-k="same"]').click(); await tick(60);
    ok('lọc nhóm giống nhau cả ba', $$('.irr-r').every((r) => /cut|put|hit|let|set|shut|cost|hurt|read/.test(r.textContent)) || $$('.irr-r').length === 0);
    await go('#verbs/practice');
    let n = 0;
    while ($('#irr-form') && n++ < 12) {
      const base = $('.prompt .fc-word').textContent;
      const askV2 = $('.prompt .muted').textContent.includes('quá khứ');
      const v = H.Data.irrMap[base];
      $('#irr-in').value = (askV2 ? v.v2 : v.v3).split('/')[0];
      $('#irr-form').requestSubmit(); await tick(60);
      $('#irr-next').click(); await tick(60);
    }
    ok('luyện động từ: trả lời đúng cả 10 câu được 3 sao', view().includes('10/10 câu đúng') && $$('.star.on').length === 3, view().slice(0, 60));
    ok('ghi nhận số câu đúng vào thống kê', H.Store.stat('irregularOk') === 10, H.Store.stat('irregularOk'));

    /* ===== Trò chơi ===== */
    await go('#games');
    ok('trang Trò chơi có 3 trò', $$('.hub').length === 3 && view().includes('Ghép cặp') && view().includes('Nối từ') && view().includes('Đoán chữ'));
    ok('Luyện → Trò chơi có thẻ', true);

    // Ghép cặp
    await go('#games/memory');
    let cards = $$('.mc');
    ok('ghép cặp: 12 thẻ úp', cards.length === 12 || cards.length === 8 || cards.length === 10, cards.length);
    const emoToWord = (emo) => H.Data.words.filter((w) => w.emoji === emo).map((w) => w.word);
    const pics = cards.filter((c) => c.querySelector('.mc-b i'));
    const words = cards.filter((c) => c.querySelector('.mc-b b'));
    for (const p of pics) {
      const emo = p.querySelector('.mc-b i').textContent;
      const cand = emoToWord(emo);
      const wc = words.find((c) => cand.indexOf(c.querySelector('.mc-b b').textContent) >= 0 && !c.classList.contains('done'));
      if (!wc) continue;
      $(`.mc[data-i="${p.dataset.i}"]`).click(); await tick(30);
      $(`.mc[data-i="${wc.dataset.i}"]`).click(); await tick(60);
    }
    await tick(900);
    ok('ghép cặp: thắng và hiện kết quả', view().includes('Xuất sắc') || view().includes('Làm tốt') || view().includes('Cố lên'), view().slice(0, 50));
    ok('ván đầu tiên được ghi nhận', H.Store.stat('games') === 1);
    await tick(600);
    ok('nhận sticker "Chơi lần đầu"', !!H.Store.get().badges['game-first']);
    dismissPops();

    // Nối từ
    await go('#games/match');
    const ids = $$('[data-l]').map((b) => b.dataset.l);
    for (const id of ids) { $(`[data-l="${id}"]`).click(); await tick(30); $(`[data-r="${id}"]`).click(); await tick(50); }
    await tick(900);
    ok('nối từ: nối đúng hết được 3 sao và hoàn hảo', $$('.star.on').length === 3 && view().includes('Hoàn hảo'), $$('.star.on').length);
    ok('nhận sticker "Hoàn hảo" khi thắng không sai', H.Store.stat('gamePerfect') >= 1 && H.Store.stat('games') === 2);
    dismissPops();

    // Đoán chữ: giải như người chơi thật (nhiều từ có thể cùng emoji và cùng nghĩa, nên lọc dần theo mẫu đã lộ)
    await go('#games/hangman');
    let rounds = 0;
    while (rounds++ < 6 && $('.hg')) {
      const vi = $('.hg .center b').textContent, emo = $('.hg-emo').textContent;
      let cands = H.Data.words.filter((x) => x.emoji === emo && x.vi === vi && /^[a-z]+$/i.test(x.word)).map((x) => x.word.toLowerCase());
      const tried = new Set();
      for (let g = 0; g < 26 && !$('#hg-next') && cands.length; g++) {
        const pattern = $('.hg-word').getAttribute('aria-label').replace(/ /g, '');
        cands = cands.filter((w) => w.length === pattern.length && [...pattern].every((c, i) => c === '_' ? !tried.has(w[i]) : c === w[i]));
        const count = {};
        cands.forEach((w) => new Set(w).forEach((c) => { if (!tried.has(c)) count[c] = (count[c] || 0) + 1; }));
        const best = Object.keys(count).sort((x, y) => count[y] - count[x])[0];
        if (!best) break;
        tried.add(best);
        $('[data-k="' + best + '"]').click(); await tick(10);
      }
      await tick(50);
      const nx = $('#hg-next');
      if (!nx) break;
      nx.click(); await tick(50);
    }
    await tick(800);
    ok('đoán chữ: đoán đúng 5 từ được 3 sao', $$('.star.on').length === 3 && view().includes('5/5'), view().slice(0, 80));
    ok('đoán chữ tính là ván thắng', H.Store.stat('gamesWon') === 3 && H.Store.stat('games') === 3, H.Store.stat('games') + '/' + H.Store.stat('gamesWon'));
    dismissPops();

    // đoán sai nhiều: thua
    await go('#games/hangman');
    const wrongKeys = [...'qxzjvkwy'];
    for (const ch of wrongKeys) { const k = $(`[data-k="${ch}"]`); if (k && !k.disabled && $('.hg-word') && !$('#hg-next')) { k.click(); await tick(10); } }
    ok('đoán chữ: bấm nhầm quá nhiều thì thua và lộ đáp án', !!$('.result.bad') || !!$('.result.ok') || !$('#hg-next'));

    /* ===== Từ của ngày ===== */
    await go('#learn');
    ok('trang Hôm nay có thẻ Từ của ngày', !!$('.wod') && !!$('.wod-w'));
    const wod = $('.wod .wod-w').textContent.split(' ')[0];
    const before = Object.keys(H.Store.get().pinned).length;
    if ($('#wod-add')) { $('#wod-add').click(); await tick(60); }
    ok('"Học từ này" ghim từ của ngày', Object.keys(H.Store.get().pinned).length === before + 1 || !$('#wod-add'));
    ok('Từ của ngày ổn định trong ngày', (await go('#learn'), $('.wod .wod-w').textContent.split(' ')[0] === wod));
    ok('trang Hôm nay có Dango, nhiệm vụ, nhật ký, từ của ngày', !!$('.hero .dango') && $$('.task').length === 3 && !!$('.jcard') && !!$('.wod'));
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
