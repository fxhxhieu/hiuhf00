/* Bộ kiểm thử trình duyệt: chấm bài nghe-gõ và "Đã nhớ rõ", từ đồng nghĩa ở bài gõ, thứ tự ôn theo mức sắp quên, lượt ôn ngắn,
 * bài Trọng âm / Đuôi -s -ed / Ghép cụm, đọc to câu, nói tự do, chọn giọng khi luyện nghe.
 * Chạy bằng tests/e2e/run.js: trang được nạp kèm tệp này, kết quả ghi vào #out và document.title = "DONE". */
(async () => {
  const out = { checks: [], errors: [] };
  const pre = document.createElement('pre'); pre.id = 'out'; document.body.appendChild(pre);
  window.addEventListener('error', (e) => out.errors.push('onerror: ' + e.message));
  const _ce = console.error; console.error = (...a) => { out.errors.push('console.error: ' + a.join(' ')); _ce(...a); };
  window.confirm = () => true;
  const ok = (name, cond, extra) => out.checks.push([cond ? 'PASS' : 'FAIL', name, extra === undefined ? '' : String(extra)]);
  const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const click = (s) => { const el = typeof s === 'string' ? $(s) : s; if (!el) throw new Error('không thấy ' + s); el.click(); };
  const H = window.hiuhf0;
  const go = async (h, ms) => { if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = h; await tick(ms || 80); };
  const view = () => $('#view').textContent;
  const submit = async (val) => { $('#ti').value = val; $('#tf').requestSubmit(); await tick(); };
  const dismissPops = () => $$('.sticker-pop').forEach((e) => e.remove());
  const DAY = 86400000;
  const realRandom = Math.random;
  const reviewCard = (interval, overdueDays, now = Date.now()) => ({ state: 'review', step: 0, interval, ease: 2.5, reps: 4, lapses: 0, due: now - overdueDays * DAY, last: now - (overdueDays + interval) * DAY, ok: 2, known: false });
  const fresh = () => { H.Store.get().cards = {}; H.Store.get().daily = { date: '', newDone: 0, reviewDone: 0 }; };
  const clozeable = (w) => /^[a-z]{5,8}$/.test(w.word) && w.ex && new RegExp('\\b' + w.word + '\\b', 'i').test(w.ex);

  async function answer(correct) {
    const c = H.session().cur, w = c.w;
    if (c.kind === 'intro') { click('[data-flip]'); await tick(); click('[data-act="continue"]'); }
    else if (c.kind === 'lchoose' || c.kind === 'choice') {
      const id = correct ? w.id : c.options.find((o) => o.id !== w.id).id;
      click('[data-opt="' + id + '"]'); await tick(); click('[data-act="continue"]');
    } else { await submit(correct ? w.word : 'qqqqqq'); click('[data-act="continue"]'); }
    await tick();
  }
  /** Khởi động một phiên ôn với Math.random cố định để ép dạng bài: 0.99 → nghe-gõ, 0.4 → gõ từ nghĩa (thẻ cấp 3). */
  async function reviewWith(rand) {
    Math.random = () => rand;
    await go('#learn'); dismissPops(); click('#review'); await tick();
    Math.random = realRandom;
    return H.session();
  }

  try {
    H.Store.settings.onboarded = true;

    /* ===== A1: "Đã nhớ rõ" sau bài nghe-gõ phải có bài kiểm nghĩa ===== */
    fresh();
    const w1 = H.Data.words.find((w) => w.level === 'A1' && clozeable(w));
    const w2 = H.Data.words.find((w) => w.level === 'A1' && clozeable(w) && w.id !== w1.id);
    H.Store.setCard(w1.id, reviewCard(1, 2));
    let S = await reviewWith(0.99);
    ok('A1 ép được bài nghe-gõ cho thẻ ôn', S.cur.w.id === w1.id && S.cur.kind === (TTS.ok ? 'ltype' : 'type'), S.cur.kind);
    if (TTS.ok) {
      await submit(w1.word);
      const kb = $('[data-act="known"]');
      ok('A1 nghe-gõ đúng: nút "Đã nhớ rõ" nói rõ sẽ kiểm tra nghĩa sau', !!kb && kb.textContent.includes('kiểm tra nghĩa'), kb && kb.textContent);
      click('[data-act="known"]'); await tick();
      const c1 = H.Store.card(w1.id);
      ok('A1 kết quả nghe-gõ vẫn được tính (ôn đúng, ghi lk = ltype), chưa lên cấp 5', c1.reps === 5 && c1.lk === 'ltype' && c1.state === 'review' && !c1.known, JSON.stringify(c1));
      S = H.session();
      ok('A1 bài kiểm nghĩa được hẹn: gõ từ từ nghĩa, không còn nút "Đã nhớ rõ"', !!S && S.cur.w.id === w1.id && S.cur.checkKnown === true && S.cur.kind === 'type' && !$('[data-act="known"]'), S && S.cur.kind);
      await submit(w1.word); click('[data-act="continue"]'); await tick();
      const c2 = H.Store.card(w1.id);
      ok('A1 qua bài kiểm nghĩa: lên cấp 5, khoảng cách >= 30 ngày, lk = type', H.SRS.level(c2) === 5 && c2.known === true && c2.interval >= 30 && c2.lk === 'type', JSON.stringify(c2));

      // trượt bài kiểm nghĩa của thẻ đã có lịch sử: tính là một lần quên, không xóa lịch sử như thẻ mới
      H.Store.setCard(w2.id, reviewCard(1, 2));
      S = await reviewWith(0.99);
      await submit(w2.word); click('[data-act="known"]'); await tick();
      await submit('qqqqqq'); click('[data-act="continue"]'); await tick();
      const c3 = H.Store.card(w2.id);
      ok('A1 trượt bài kiểm nghĩa: học lại nhưng giữ lịch sử (lapses = 1, reps không về 0)', c3.state === 'learn' && c3.lapses === 1 && c3.reps >= 6, JSON.stringify(c3));
    }

    /* ===== A2: gõ từ đồng nghĩa không bị tính là quên ===== */
    const pair = H.Data.words.find((w) => w.level !== 'A0' && /^[a-z]{4,}$/.test(w.word) && w.ex && new RegExp('\\b' + w.word + '\\b', 'i').test(w.ex) && H.Data.sameMeaning(w).some((x) => /^[a-z]{4,}$/.test(x.word)));
    const syn = H.Data.sameMeaning(pair).find((x) => /^[a-z]{4,}$/.test(x.word));
    fresh();
    H.Store.setCard(pair.id, reviewCard(1, 2));
    S = await reviewWith(0.4);
    ok('A2 thẻ thử là bài gõ từ nghĩa', S.cur.w.id === pair.id && S.cur.kind === 'type', S.cur.kind + ' ' + pair.word);
    await submit(syn.word);
    ok('A2 gõ từ đồng nghĩa (' + syn.word + '): chưa chấm, báo đúng nghĩa', !S.cur.answered && S.cur.near === true && S.cur.synonym === true && view().includes('Đúng nghĩa'));
    ok('A2 không lộ đáp án và ô nhập được làm trống', !$('.notice').textContent.includes(pair.word) && $('#ti').value === '', $('.notice').textContent);
    await submit(pair.word);
    ok('A2 gõ đúng từ đang học: tính đúng nhưng đánh dấu yếu', S.cur.answered && S.cur.correct === true && S.cur.weak === true);
    click('[data-act="continue"]'); await tick();
    H.Store.setCard(pair.id, reviewCard(1, 2));
    S = await reviewWith(0.4);
    await submit(syn.word); await submit('qqqqqq');
    ok('A2 sau khi gõ đồng nghĩa mà gõ tiếp sai thì tính là sai', S.cur.answered && S.cur.correct === false);
    H.Store.setCard(pair.id, reviewCard(1, 2));
    S = await reviewWith(0.4);
    await submit('qqqqqq');
    ok('A2 gõ một từ lạ thì sai ngay, không được gõ lại miễn phí', S.cur.answered && S.cur.correct === false && !S.cur.near);
    await go('#learn');

    /* ===== A3: ôn thẻ sắp quên nhất trước, lượt ôn ngắn ===== */
    fresh();
    H.Store.settings.reviewsPerDay = 200;
    const pool = H.Data.words.filter((w) => w.level === 'A1').slice(0, 40);
    const [short, long] = pool;
    H.Store.setCard(short.id, reviewCard(1, 3));
    H.Store.setCard(long.id, reviewCard(60, 10));
    let q = H.queue('review', 0);
    ok('A3 khoảng cách 1 ngày quá hạn 3 ngày xếp trước khoảng cách 60 ngày quá hạn 10 ngày', q.ids[0] === short.id && q.ids[1] === long.id, q.ids.join(','));
    pool.slice(2, 32).forEach((w, i) => H.Store.setCard(w.id, reviewCard(2 + i, 1 + (i % 5))));
    const nowT = Date.now();
    const urg = (id) => H.SRS.urgency(H.Store.card(id), nowT);
    q = H.queue('review', 0, { limit: 15 });
    const inQ = new Set(q.ids), others = Object.keys(H.Store.get().cards).filter((id) => !inQ.has(id));
    ok('A3 lượt ôn ngắn lấy đúng 15 thẻ', q.ids.length === 15, q.ids.length);
    ok('A3 15 thẻ đó là những thẻ sắp quên nhất', Math.min(...q.ids.map(urg)) >= Math.max(...others.map(urg)) - 1e-6, Math.min(...q.ids.map(urg)) + ' vs ' + Math.max(...others.map(urg)));
    H.Store.settings.reviewsPerDay = 10;
    ok('A3 lượt ôn ngắn không vượt trần ôn mỗi ngày', H.queue('review', 0, { limit: 15 }).ids.length === 10);
    await go('#learn');
    ok('A3 trang Hôm nay báo tồn nhiều hơn mức mỗi ngày', view().includes('Tồn nhiều hơn mức 10 thẻ mỗi ngày') && view().includes('cần ít nhất 4 ngày'), view().slice(0, 300));
    H.Store.settings.reviewsPerDay = 200;
    await go('#learn'); dismissPops();
    ok('A3 trang Hôm nay có nút ôn nhanh 15 thẻ', !!$('#review-bite') && $('#review-bite').textContent.includes('Ôn nhanh 15 thẻ'), $('#review-bite') && $('#review-bite').textContent);
    click('#review-bite'); await tick();
    S = H.session();
    ok('A3 bấm nút: phiên 15 thẻ', S && S.total === 15 && S.limit === 15 && S.kind === 'review', S && S.total);
    let g = 0;
    while (H.session() && g++ < 120) await answer(true);
    ok('A3 xong phiên có nút ôn tiếp (còn thẻ đến hạn)', !!$('#more-review') && $('#more-review').textContent.includes('Ôn tiếp 15 thẻ'), $('#more-review') && $('#more-review').textContent);
    click('#more-review'); await tick();
    ok('A3 "Ôn tiếp" mở phiên ngắn tiếp theo', H.session() && H.session().limit === 15 && H.session().total === 15);
    await go('#learn');

    /* ===== B4–B6: Trọng âm, Đuôi -s/-ed, Ghép cụm ===== */
    fresh();
    await go('#practice');
    ok('B Luyện có ô Trọng âm, đuôi từ, cụm từ', !!$('.hub[href="#drills"]'));
    await go('#drills');
    ok('B trang bài tập có 3 bài và 3 lựa chọn nguồn từ', $$('.hub').length === 3 && $$('#dr-src .chip').length === 3 && view().includes('Nhớ nhanh'), $$('.hub').length);

    // Trọng âm
    await go('#drills/stress', 120);
    let n = 0;
    while ($('[data-pick]') && n++ < 12) {
      const word = $('.prompt .fc-word').textContent;
      const entry = H.Data.words.find((w) => w.word === word && w.ipa && Drills.analyze(w.ipa).n >= 2);
      const k = Drills.analyze(entry.ipa).k;
      const opt = $$('.opt').find((b) => b.querySelector('.dots').getAttribute('aria-label').indexOf('thứ ' + (k + 1) + ' trong') >= 0);
      opt.click(); await tick();
      click('[data-dr="next"]'); await tick();
    }
    ok('B trọng âm: trả lời đúng cả 10 câu được 3 sao', view().includes('10/10 câu đúng') && $$('.star.on').length === 3, view().slice(0, 60));
    ok('B trọng âm: ghi nhận vào thống kê luyện nghe', H.Store.get().listen.stress && H.Store.get().listen.stress.n === 10 && H.Store.get().listen.stress.ok === 10);
    await go('#drills/stress', 120);
    const word0 = $('.prompt .fc-word').textContent, e0 = H.Data.words.find((w) => w.word === word0 && w.ipa && Drills.analyze(w.ipa).n >= 2);
    const wrong = $$('.opt').find((b) => b.querySelector('.dots').getAttribute('aria-label').indexOf('thứ ' + (Drills.analyze(e0.ipa).k + 1) + ' trong') < 0);
    wrong.click(); await tick();
    ok('B trọng âm: chọn sai thì báo sai, tô đáp án đúng và giải thích bằng IPA', !!$('.opt.wrong') && !!$('.opt.correct') && !!$('.result.bad') && $('.reveal').textContent.includes('nhấn ở âm tiết thứ') && $('.reveal .ipa').textContent.includes('ˈ'));
    click('#dr-exit'); await tick(80);
    ok('B thoát giữa chừng về trang bài tập', location.hash === '#drills' && !!$('#dr-src'));

    // Đuôi -s / -ed
    await go('#drills/ending', 120);
    n = 0;
    while ($('[data-pick]') && n++ < 12) {
      const kind = $('.prompt .fc-pos').textContent.indexOf('quá khứ') >= 0 ? 'ed' : 's';
      const ipa = /\/([^/]+)\//.exec($('.prompt .ipa').textContent)[1];
      const ls = Drills.lastSound(ipa), ans = kind === 'ed' ? Drills.edClass(ls) : Drills.sClass(ls);
      $$('.opt').find((b) => b.querySelector('span').textContent === '/' + ans + '/').click(); await tick();
      click('[data-dr="next"]'); await tick();
    }
    ok('B đuôi -s/-ed: trả lời đúng cả 10 câu', view().includes('10/10 câu đúng'), view().slice(0, 60));

    // Ghép cụm, kèm phím tắt
    await go('#drills/collo', 120);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); await tick();
    ok('B ghép cụm: phím 1 chọn phương án đầu tiên', $$('.opt:disabled').length === $$('.opt').length && !!$('.result'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await tick();
    ok('B ghép cụm: Enter sang câu tiếp theo', $('.s-count').textContent === '1/10', $('.s-count') && $('.s-count').textContent);
    await go('#drills/collo', 120);
    n = 0;
    while ($('[data-pick]') && n++ < 12) {
      const rest = $('.prompt .fc-word').textContent.replace(/^___ /, '');
      const verb = Drills.COLLOCATION_SETS.flatMap((s) => s.items).find((it) => it[1] === rest)[0];
      $$('.opt').find((b) => b.querySelector('span').textContent === verb).click(); await tick();
      click('[data-dr="next"]'); await tick();
    }
    ok('B ghép cụm: trả lời đúng cả 10 câu', view().includes('10/10 câu đúng'), view().slice(0, 60));

    /* ===== B7: Đọc to câu ví dụ, Nói tự do ===== */
    await go('#speak');
    ok('B7 Luyện nói có chế độ đọc câu và nói tự do', !!$('[data-feat="sent"]') && !!$('[data-feat="free"]'));
    ok('B7 nêu rõ âm thanh được gửi cho dịch vụ nhận dạng của trình duyệt', view().includes('Google') && view().includes('không lưu bản ghi'));
    click('[data-feat="sent"]'); await tick(80);
    const SP = H.speak();
    ok('B7 đọc câu: 10 câu, mỗi câu 4–10 từ, ngưỡng đạt 75%', SP && SP.items.length === 10 && SP.items.every((it) => it.sent && it.pass === 75 && it.word.split(/\s+/).length >= 4 && it.word.split(/\s+/).length <= 10), SP && SP.items.length);
    ok('B7 câu hiện cỡ chữ vừa, có nút nghe mẫu, không gắn id từ (không đụng Từ khó)', !!$('.fc-word.long') && !!$('[data-say]') && SP.items.every((it) => !it.id));
    // Giả lập kết quả nhận dạng: chấm theo tỉ lệ từ khớp, tô màu từng từ
    const sent0 = SP.items[0].word, nWords = sent0.split(/\s+/).length;
    SP.verdict = 'bad'; SP.said = sent0.split(/\s+/).slice(0, 2).join(' '); H.drawSpeak();
    ok('B7 đọc câu: nói thiếu thì báo % số từ khớp, ngưỡng đạt và tô từ sai', view().includes('Khớp') && view().includes('cần từ 75%') && $$('.sc-words .okw').length === 2 && $$('.sc-words .missw').length === nWords - 2, view().slice(0, 160));
    SP.verdict = 'ok'; SP.said = sent0; H.drawSpeak();
    ok('B7 đọc câu: nói đủ thì báo đạt 100% số từ', view().includes('Đọc tốt! Khớp 100% số từ') && $$('.sc-words .missw').length === 0);
    for (let i = 0; i < 10; i++) { click('[data-sp="skip"]'); await tick(15); }
    ok('B7 đọc câu: tổng kết nói "câu", không nhắc Từ khó', view().includes('câu đọc tốt') && view().indexOf('thêm vào Từ khó') < 0, view().slice(0, 160));
    await go('#speak/free');
    ok('B7 nói tự do hiện câu hỏi tiếng Anh, tiếng Việt và lưu ý riêng tư', !!$('.center-card h2') && $('.center-card h2').textContent.length > 5 && view().includes('Chrome gửi âm thanh'));
    const p1 = $('.center-card h2').textContent;
    let changed = false;
    for (let i = 0; i < 15 && !changed; i++) { click('[data-fs="other"]'); await tick(20); changed = $('.center-card h2').textContent !== p1; }
    ok('B7 "Câu hỏi khác" đổi câu hỏi', changed);
    H.free().said = 'i go to school yesterday and he go to the market and i have a apple';
    H.drawFree();
    ok('B7 nói tự do: hiện bản chép, số từ và lỗi cơ bản', view().includes('Bạn đã nói') && view().includes('Lỗi cơ bản có thể có') && view().includes('goes'), view().slice(0, 300));
    ok('B7 nói tự do không báo lỗi viết hoa / dấu câu vì bản chép không có', view().indexOf('viết hoa') < 0 && view().indexOf('dấu chấm') < 0);
    H.free().said = '';
    H.drawFree();
    ok('B7 nói tự do: không nghe rõ thì báo và không có báo cáo lỗi', view().includes('chưa nghe rõ') && view().indexOf('Lỗi cơ bản') < 0);
    await go('#learn');
    ok('B7 rời trang nói tự do thì dừng sạch', H.free() === null);

    /* ===== B8: chọn giọng khi luyện nghe ===== */
    await go('#settings');
    const lm = $('#s-lmix');
    ok('B8 Cài đặt có mục "Giọng khi luyện nghe", mặc định một giọng', !!lm && lm.value === 'one' && H.Store.settings.listenMix === false);
    lm.value = 'mix'; lm.dispatchEvent(new Event('change', { bubbles: true })); await tick();
    ok('B8 bật nhiều giọng được lưu', H.Store.settings.listenMix === true);
    if (TTS.ok) {
      await go('#listen');
      click('[data-lmode="word"]'); await tick(80);
      ok('B8 nút nghe ở bài Nghe có data-mix để đổi giọng theo câu', $$('[data-say][data-mix]').length >= 2, $$('[data-say][data-mix]').length);
    }
    H.Store.settings.listenMix = false;
    await go('#learn');
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  Math.random = realRandom;
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
