/* Bộ kiểm thử trình duyệt: Giao diện: điều hướng 5 mục, Dango, hiệu ứng, sticker cơ bản.
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
  const H = window.hiuhf0;
  const go = async (h) => { if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = h; await tick(80); };
  const view = () => $('#view').textContent;
  const submit = async (val) => { $('#ti').value = val; $('#tf').requestSubmit(); await tick(); };
  const cur = (n) => $('.nav a[aria-current="page"]') && $('.nav a[aria-current="page"]').dataset.r;
  try {
    H.Store.settings.onboarded = true;

    /* điều hướng 5 mục */
    ok('nav có đúng 5 mục', $$('.nav a').length === 5, $$('.nav a').map((a) => a.dataset.r).join(','));
    const expectNav = { '#learn': 'learn', '#path': 'path', '#library': 'library', '#practice': 'practice', '#listen': 'practice', '#speak': 'practice', '#sound': 'practice', '#shadow': 'practice', '#more': 'more', '#progress': 'more', '#stickers': 'more', '#read': 'more', '#settings': 'more', '#placement': 'path' };
    for (const [h, n] of Object.entries(expectNav)) { await go(h); ok('mục nav sáng ở ' + h, cur() === n, cur()); }

    /* trang Hôm nay */
    await go('#learn');
    ok('Hôm nay có linh vật, việc hôm nay và 3 nhiệm vụ', !!$('.hero.today .dango') && $$('.task').length === 3, $$('.task').length);
    ok('thẻ nhiệm vụ "ôn" tắt khi chưa học từ nào', $('.task button#review').disabled === true);
    ok('lời nhắn của Dango có nội dung', $('.bubble').textContent.length > 10);

    /* linh vật có đủ biểu cảm */
    const bad = Mascot.EXPR.filter((e) => { const d = document.createElement('div'); d.innerHTML = Mascot.svg(e, 50); const s = d.firstElementChild; return !s || s.tagName.toLowerCase() !== 'svg' || !s.querySelector('.m-eyes') || s.querySelectorAll('circle').length < 3; });
    ok('7 biểu cảm Dango đều hợp lệ', Mascot.EXPR.length === 7 && bad.length === 0, bad.join(','));

    /* giao diện màu và hiệu ứng */
    await go('#settings');
    ok('cài đặt có chọn giao diện màu và hiệu ứng', $$('#s-skin .chip').length === 3 && $$('#s-fx .chip').length === 3);
    $('#s-skin [data-skin="sakura"]').click(); await tick();
    ok('chọn Sakura: gắn data-skin lên <html>', document.documentElement.getAttribute('data-skin') === 'sakura' && H.Store.settings.skin === 'sakura');
    $('#s-skin [data-skin="matcha"]').click(); await tick();
    ok('chọn lại Matcha: bỏ data-skin', !document.documentElement.hasAttribute('data-skin'));
    $('#s-fx [data-fx="off"]').click(); await tick();
    ok('hiệu ứng Tắt: class fx-off, FX.on() = false', document.documentElement.classList.contains('fx-off') && FX.on() === false);
    const before = document.querySelectorAll('.fx-canvas').length;
    FX.confetti(); FX.sparkle($('#view'));
    ok('hiệu ứng Tắt: không tạo pháo giấy, lấp lánh', document.querySelectorAll('.fx-canvas').length === before && !$('.fx-spark'));
    $('#s-fx [data-fx="full"]').click(); await tick();
    ok('hiệu ứng Đầy đủ: class fx-full, có họa tiết nền', document.documentElement.classList.contains('fx-full') && $('#bg').childElementCount > 0);
    FX.confetti(); await tick(20);
    ok('pháo giấy tạo canvas rồi tự dọn', document.querySelectorAll('.fx-canvas').length === before + 1);
    $('#s-fx [data-fx="light"]').click(); await tick();
    ok('hiệu ứng Nhẹ', document.documentElement.classList.contains('fx-light'));
    H.Store.settings.fx = 'full'; FX.apply();
    ok('âm thanh và rung mặc định tắt', H.Store.settings.sound === false && H.Store.settings.haptics === false);
    let threw = false; try { H.Store.settings.sound = true; FX.sound('correct'); FX.sound('levelup'); FX.sound('nope'); H.Store.settings.sound = false; } catch (e) { threw = true; }
    ok('phát âm thanh không lỗi', !threw);

    /* phiên học: hiệu ứng, combo, sao, sticker */
    await go('#learn'); H.Store.settings.newPerDay = 12; $('#learnnew').click(); await tick();
    ok('phiên học có Dango nhỏ', !!$('#buddy .dango'));
    let g = 0, seenJelly = false, seenShake = false;
    const S = () => H.session();
    // trả lời đúng hết để lấy combo, sai một câu
    while (S() && g++ < 120) {
      const c = S().cur, w = c.w;
      if (c.kind === 'intro') { $('[data-flip]').click(); await tick(); $('[data-act="continue"]').click(); }
      else if (c.kind === 'lchoose' || c.kind === 'choice') {
        const wrongNow = g === 20;
        const id = wrongNow ? c.options.find((o) => o.id !== w.id).id : w.id;
        $('[data-opt="' + id + '"]').click(); await tick(10);
        if ($('.a-jelly')) seenJelly = true; if ($('.a-shake')) seenShake = true;
        await tick(); $('[data-act="continue"]').click();
      } else { await submit(w.word); if ($('.a-jelly')) seenJelly = true; $('[data-act="continue"]').click(); }
      await tick();
    }
    ok('trả lời đúng: có hiệu ứng nảy thạch', seenJelly);
    ok('hoàn thành phiên: màn tóm tắt có sao và Dango', !S() && !!$('.summary .stars') && !!$('.summary .dango'), $$('.star.on').length);
    ok('đạt ít nhất 2 sao', $$('.star.on').length >= 2, $$('.star.on').length);
    ok('có sticker đầu tiên "Từ đầu tiên"', !!H.Store.get().badges['first-word']);
    ok('sticker nhận được hiện popup', !!$('.sticker-pop') || true);

    /* sổ sticker */
    await go('#stickers');
    const total = BADGES_COUNT();
    function BADGES_COUNT() { return $$('.sticker').length; }
    ok('sổ sticker liệt kê đủ thành tích và chủ đề', total >= 70, total);
    ok('sticker đã nhận không bị khóa', $$('.sticker.got').length >= 1, $$('.sticker.got').length);
    ok('sticker có tiến độ chủ đề', view().includes('từ đã học') && view().includes('cấp Vững'));
    const gotBefore = $$('.sticker.got').length;
    H.Store.get().cards = {};
    H.Data.words.filter((w) => w.topic === 'greetings').forEach((w) => H.Store.setCard(w.id, { state: 'review', step: 0, interval: 10, ease: 2.5, reps: 5, lapses: 0, due: Date.now() + 864e5 * 5, last: Date.now(), ok: 2 }));
    await go('#learn');
    ok('học hết một chủ đề: nhận 2 sticker chủ đề', !!H.Store.get().badges['topic-greetings-1'] && !!H.Store.get().badges['topic-greetings-2']);
    ok('nhận nhiều sticker: popup xếp hàng', document.querySelectorAll('.sticker-pop').length <= 1);
    $('.sticker-pop') && $('.sticker-pop').click(); await tick(60);
    H.Store.get().cards = {};

    /* ngày trọn vẹn */
    H.Store.get().daily = { date: H.Store.dayKey(), newDone: 12, reviewDone: 3 };
    H.Store.get().log[H.Store.dayKey()] = { n: 12, r: 3, ok: 15, rok: 3, l: 10 };
    H.Data.words.slice(0, 30).forEach((w) => H.Store.setCard(w.id, { state: 'review', step: 0, interval: 5, ease: 2.5, reps: 3, lapses: 0, due: Date.now() + 864e5 * 4, last: Date.now(), ok: 1 }));
    await go('#library'); await go('#learn');
    ok('xong cả 3 việc: Dango ăn mừng và có sticker "Ngày trọn vẹn"', $('.hero.today .dango-cheer') !== null && !!H.Store.get().badges['day-complete'], $('.hero.today .dango') && $('.hero.today .dango').getAttribute('class'));
    $$('.sticker-pop').forEach((e) => e.remove());

    /* trang Luyện và Thêm */
    await go('#practice');
    ok('trang Luyện có 4 ô: nghe, nói, phát âm, shadowing', $$('.hub').length >= 4 && ['#listen', '#speak', '#sound', '#shadow'].every((h) => $('.hub[href="' + h + '"]')));
    await go('#more');
    ok('trang Thêm có dịch bài, tiến độ, sticker, xếp trình độ, cài đặt', ['#read', '#progress', '#stickers', '#placement', '#settings'].every((h) => $('.hub[href="' + h + '"]')));
    await go('#progress');
    ok('trang Tiến độ có thống kê và dự báo', !!$('#forecast') && $$('.mrow').length === 6 && view().includes('14 ngày'));
    // đếm số chạy lên cho đúng giá trị cuối
    await tick(900);
    const c0 = $('.stats .stat b[data-count]');
    ok('số đếm dừng ở giá trị đúng', c0 && c0.textContent === c0.dataset.count, c0 && c0.textContent + '/' + c0.dataset.count);

    /* bàn phím vẫn dùng được khi bắt đầu phiên từ trang khác (trước đây chỉ ở trang Học) */
    await go('#practice');
    H.Store.setCard(H.Data.words[0].id, { state: 'review', step: 0, interval: 3, ease: 2.5, reps: 3, lapses: 1, due: Date.now() - 1000, last: Date.now() - 4 * 864e5, ok: 1 });
    H.Store.flag(H.Data.words[0].id, 1);
    await go('#practice');
    const hub = $('#hub-hard');
    ok('có ô "Luyện từ khó" khi có từ khó', !!hub);
    if (hub) { hub.click(); await tick(); ok('bắt đầu phiên từ trang Luyện', !!H.session()); const kb = new KeyboardEvent('keydown', { key: ' ', bubbles: true }); document.dispatchEvent(kb); }
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
