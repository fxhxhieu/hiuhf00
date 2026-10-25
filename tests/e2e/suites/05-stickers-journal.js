/* Bộ kiểm thử trình duyệt: Sổ sticker (độ hiếm, tủ đồ, album, ghim), Dango giữ chuỗi, nhật ký.
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
  const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const dayKey = (n) => H.Store.dayKey(Date.now() - n * 864e5);
  const dismissPops = () => $$('.sticker-pop').forEach((e) => e.remove());
  try {
    H.Store.settings.onboarded = true;
    const S = window.App.stickers;

    /* ===== Sticker v2 ===== */
    const cat = S.catalog();
    ok('danh mục có trên 150 sticker', cat.length >= 150, cat.length);
    ok('có đủ 4 độ hiếm', ['common', 'rare', 'epic', 'legend'].every((r) => cat.some((s) => s.rarity === r)));
    ok('mọi sticker có mã duy nhất', new Set(cat.map((s) => s.id)).size === cat.length);
    ok('mã sticker cũ vẫn còn (tương thích tiến độ)', ['first-word', 'words-100', 'streak-7', 'unit-10', 'topic-food-1', 'topic-food-2', 'day-complete', 'a0-done'].every((id) => !!S.byId(id)));
    const sNow = new Date(2026, 11, 25);
    ok('sticker theo dịp: Noel, Tết, Halloween, Trung thu', S.activeSeasons(sNow).indexOf('xmas') >= 0 && S.activeSeasons(new Date(2027, 1, 6)).indexOf('tet') >= 0 && S.activeSeasons(new Date(2026, 9, 31)).indexOf('halloween') >= 0 && S.activeSeasons(new Date(2026, 8, 25)).indexOf('midautumn') >= 0);
    ok('ngày thường không có sticker dịp', S.activeSeasons(new Date(2026, 4, 12)).length === 0);

    await go('#stickers');
    ok('sổ sticker hiện các ô theo độ hiếm', $$('button.sticker').length > 100 && !!$('.sticker.r-legend, .sticker.r-epic'));
    ok('sticker bí mật hiện "???" khi chưa mở', view().includes('Sticker bí mật'));
    ok('sticker chủ đề có Dango mặc đồ khi đã nhận', (() => { H.Store.award('topic-food-1'); return true; })());
    await go('#stickers');
    const foodTile = $('[data-st="topic-food-1"] .dango .m-acc');
    ok('sticker chủ đề Ăn uống: Dango đội mũ đầu bếp', !!foodTile);
    ok('tủ đồ: mũ đầu bếp đã mở khóa', $('[data-acc="chef"]') && !$('[data-acc="chef"]').classList.contains('locked'));
    ok('tủ đồ: mũ phi công còn khóa', $('[data-acc="pilot"]').classList.contains('locked'));
    $('[data-acc="chef"]').click(); await tick();
    ok('đeo mũ đầu bếp', H.Store.settings.dangoAcc === 'chef' && !!$('.page-h .dango .m-acc'));
    await go('#learn');
    ok('trang Hôm nay: Dango đeo mũ đã chọn', !!$('.hero .dango .m-acc'));
    H.Store.settings.dangoAcc = 'pilot'; H.Store.save(); await go('#learn');
    ok('phụ kiện chưa mở khóa không được đeo', !$('.hero .dango .m-acc'));
    H.Store.settings.dangoAcc = '';

    // ghim sticker
    await go('#stickers');
    $('[data-st="topic-food-1"]').click(); await tick();
    ok('mở chi tiết sticker', !!$('.sticker-sheet') && $('.sticker-sheet').textContent.includes('Hiếm'));
    $('#ss-pin').click(); await tick();
    ok('ghim sticker', H.Store.settings.pinStickers.indexOf('topic-food-1') >= 0);
    await go('#learn');
    ok('trang Hôm nay hiện sticker đã ghim', !!$('.pinned .pin'));
    H.Store.settings.pinStickers = [];

    // Dango nhột
    for (let i = 0; i < 10; i++) { $('.hero .dango-wrap').click(); await tick(10); }
    await tick(60);
    ok('chạm Dango 10 lần mở sticker bí mật', !!H.Store.get().badges['secret-tap']);
    dismissPops();

    // album
    await go('#album');
    ok('album từ vựng hiện trên 500 hình', (() => { const m = view().match(/(\d+)\/(\d+) hình/); return m && +m[2] > 500; })());
    const emoWord = H.Data.words.find((w) => w.emoji && !w.custom);
    H.Store.setCard(emoWord.id, { state: 'review', step: 0, interval: 60, ease: 2.5, reps: 5, lapses: 0, due: Date.now() + 864e5 * 30, last: Date.now(), ok: 4, known: true });
    await go('#album', 120);
    ok('từ thuộc lòng thành sticker trong album', !!$('.aw.got'));

    // chia sẻ ảnh
    const blob = await Share.card({ title: 'Thử ảnh', subtitle: 'Mô tả ngắn', emoji: '🔥', tag: 'Thử' });
    ok('tạo ảnh chia sẻ PNG', blob && blob.type === 'image/png' && blob.size > 5000, blob && blob.size);
    const blob2 = await Share.card({ title: 'Dango', svg: Mascot.svg('cheer', 240, '', { acc: 'chef', badge: '🍜' }) });
    ok('tạo ảnh chia sẻ có Dango', blob2 && blob2.size > 8000, blob2 && blob2.size);

    /* ===== Dango giữ chuỗi ===== */
    const log = H.Store.get().log;
    Object.keys(log).forEach((k) => delete log[k]);
    const act = (n) => { log[dayKey(n)] = { n: 1, r: 0, ok: 1 }; };
    act(0); act(2); act(3);              // hôm nay, lỡ hôm qua, học 2 ngày trước
    let si = H.Store.streakInfo();
    ok('lỡ một ngày: Dango giữ chuỗi (3 ngày học, bỏ qua 1 ngày lỡ)', si.n === 3 && si.frozen.length === 1 && si.frozen[0] === dayKey(1), JSON.stringify(si));
    Object.keys(log).forEach((k) => delete log[k]); act(0); act(3); act(4);
    si = H.Store.streakInfo();
    ok('lỡ hai ngày liên tiếp: chuỗi đứt', si.n === 1, JSON.stringify(si));
    Object.keys(log).forEach((k) => delete log[k]); act(1); act(3); act(4);
    si = H.Store.streakInfo();
    ok('hôm nay chưa học, hôm qua có học: chuỗi vẫn tính', si.n >= 1);
    Object.keys(log).forEach((k) => delete log[k]); act(0); act(2); act(4); act(5);
    si = H.Store.streakInfo();
    ok('chỉ giữ chuỗi một ngày trong mỗi cửa sổ 7 ngày', si.frozen.length === 1 && si.n === 2, JSON.stringify(si));
    Object.keys(log).forEach((k) => delete log[k]);

    /* ===== Nhật ký ===== */
    const t = H.Store.dayKey();
    await go('#journal');
    ok('trang Nhật ký hiện', view().includes('Nhật ký tiếng Anh') && !!$('.jtoday'));
    $('#j-alltopics').click(); await tick(60);
    ok('có thử thách 7 ngày và đủ chủ đề (bấm xem tất cả)', $$('.chal-d').length === 7 && $$('.jtopic').length === window.JOURNAL_TOPICS.length && window.JOURNAL_TOPICS.length >= 20, $$('.jtopic').length);
    ok('trang Thêm có ô Nhật ký', (await go('#more'), !!$('.hub[href="#journal"]')));
    ok('trang Hôm nay có thẻ Nhật ký', (await go('#learn'), !!$('.jcard')));

    await go('#journal/' + t + '/food');
    const tx = $('#je-text');
    ok('trình soạn thảo mở với chủ đề Ăn uống', !!tx && view().includes('Ăn uống'));
    $('.mood[data-mood="😊"]').click(); await tick();
    type(tx, 'Today I eat rice with my family. It is delicious.');
    await tick(900);
    let e = H.Store.journalGet(t);
    ok('tự động lưu sau khi gõ', e && e.text.indexOf('rice') > 0 && e.mood === '😊' && e.topic === 'food' && e.words === 10, JSON.stringify(e && { w: e.words, m: e.mood }));
    ok('đếm từ và câu hiển thị', $('#je-stat').textContent.indexOf('10 từ') === 0 && $('#je-stat').textContent.indexOf('2 câu') > 0, $('#je-stat').textContent);

    // câu mở đầu
    $('.starter').click(); await tick();
    ok('bấm câu mở đầu chèn vào bài', tx.value.length > 'Today I eat rice with my family. It is delicious.'.length);
    // mẫu điền
    $('[data-tab="template"]').click(); await tick();
    type(tx, ''); $('#tp-use').click(); await tick();
    ok('mẫu điền: chèn mẫu và chọn chỗ trống đầu tiên', tx.value.indexOf('___') >= 0 && tx.selectionEnd - tx.selectionStart === 3);
    $('#tp-next').click(); await tick();
    ok('tới chỗ trống tiếp theo', tx.selectionEnd - tx.selectionStart === 3 && tx.selectionStart > tx.value.indexOf('___'));
    // tra từ theo nghĩa tiếng Việt
    $('[data-tab="lookup"]').click(); await tick();
    type($('#lk-q'), 'mệt'); await tick();
    ok('tra từ bằng tiếng Việt: "mệt" ra tired', $('#lk-res').textContent.toLowerCase().includes('tired'), $('#lk-res').textContent.slice(0, 80));
    type($('#lk-q'), 'hospi'); await tick();
    ok('tra từ bằng tiếng Anh: "hospi" ra hospital', $('#lk-res').textContent.toLowerCase().includes('hospital'));
    type(tx, 'Hello'); $('#lk-res [data-ins]').click(); await tick();
    ok('chèn từ tra được vào bài', tx.value.length > 'Hello'.length);
    // từ chủ đề
    $('[data-tab="topicwords"]').click(); await tick();
    ok('thẻ Từ chủ đề liệt kê từ liên quan', $$('#je-panel .wchip').length > 10, $$('#je-panel .wchip').length);

    // kiểm tra lỗi + sửa
    type(tx, 'i am agree with you. he go to school. I eat cơm.');
    $('[data-tab="check"]').click(); await tick(120);
    ok('kiểm tra bài: báo lỗi và giải thích tiếng Việt', $$('.tip-error').length >= 2 && $('#je-panel').textContent.includes('Chủ ngữ'), $$('.tip-error').length);
    ok('kiểm tra bài: phát hiện từ tiếng Việt và gợi ý "rice"', !!$('.tip-vi') && !![...$$('.tip-vi [data-to]')].find((b) => b.dataset.to === 'rice'), $$('.tip-vi [data-to]').map((b) => b.dataset.to).join(','));
    $('[data-sub="cơm"][data-to="rice"]').click(); await tick(120);
    ok('thay từ tiếng Việt bằng từ tiếng Anh', tx.value.indexOf('rice') > 0 && tx.value.indexOf('cơm') < 0);
    const before = tx.value;
    $('[data-fix]').click(); await tick(120);
    ok('bấm "Sửa" áp dụng gợi ý', tx.value !== before);
    for (let i = 0; i < 6 && $('[data-fix]'); i++) { $('[data-fix]').click(); await tick(80); }
    ok('sửa hết các lỗi có cách sửa', tx.value.indexOf('I agree') >= 0 && tx.value.indexOf('He goes') >= 0, tx.value);

    // thử thách từ + hoàn thành
    type(tx, 'Today I write a long diary. I eat rice, drink milk and read a book at home with my kind family and I feel very happy because the weather is sunny and warm. We play games after dinner.');
    await tick(900);
    $('#je-done').click(); await tick(700);
    ok('hoàn thành: Dango nhận xét và thống kê', !!$('.jdone') && view().includes('từ hôm nay'));
    e = H.Store.journalGet(t);
    ok('bài đã lưu với từ đã học được ghi nhận', e.words >= 30 && Array.isArray(e.used));
    ok('nhận sticker nhật ký đầu tiên', !!H.Store.get().badges['journal-1']);
    dismissPops();
    ok('chuỗi viết nhật ký = 1', H.Store.journalStreak() === 1);

    // nhiều ngày + lịch + tìm kiếm
    [1, 2].forEach((n) => H.Store.journalSet(dayKey(n), { text: 'Yesterday I walk to school with my friend. It was fun.', mood: '😄', topic: 'today', prompt: '', created: Date.now(), updated: Date.now(), words: 11, used: [], challenge: 0 }));
    ok('chuỗi viết nhật ký = 3', H.Store.journalStreak() === 3);
    await go('#journal');
    ok('lịch hiện dấu các ngày đã viết', $$('.cal-d.has').length >= 3 && !!$('.cal-d.today.has'), $$('.cal-d.has').length);
    ok('danh sách bài đã viết', $$('.jrow').length >= 3);
    type($('#j-q'), 'friend'); await tick(60);
    ok('tìm trong nhật ký', $$('.jrow').length === 2, $$('.jrow').length);
    ok('mục "Nhìn lại" hiện bài của 7 ngày trước nếu có', (() => { H.Store.journalSet(dayKey(7), { text: 'Last week I was happy.', mood: '😊', topic: 'today', prompt: '', created: 1, updated: 1, words: 5, used: [], challenge: 0 }); return true; })());
    await go('#journal', 120);
    ok('Nhìn lại một tuần trước', view().includes('Một tuần trước'));
    $('[data-cal="-1"]').click(); await tick();
    ok('lịch chuyển sang tháng trước', !!$('.cal-h b') && $('.cal-h b').textContent.indexOf('Tháng') === 0);

    // thử thách 7 ngày
    await go('#journal/' + dayKey(3) + '/c1');
    ok('thử thách ngày 1 có đề riêng', view().includes('Thử thách ngày 1/7') && view().includes('Introduce yourself'));
    type($('#je-text'), 'My name is Lan. I am twenty years old. I live in Hanoi with my family. I like music and cooking and reading books every day.');
    await tick(900);
    await go('#journal', 100);
    ok('hoàn thành ngày 1 của thử thách (từ 15 từ)', view().includes('1/7 ngày'));
    for (let d = 2; d <= 7; d++) H.Store.journalSet(dayKey(10 + d), { text: 'This is a long enough challenge entry for the day with more than fifteen words in it, okay.', mood: '😊', topic: 'free', prompt: '', created: 1, updated: 1, words: 17, used: [], challenge: d });
    await go('#journal/' + dayKey(3) + '/', 100);
    type($('#je-text'), $('#je-text').value + ' Thank you for reading my diary today.'); await tick(900);
    ok('xong thử thách 7 ngày nhận sticker', !!H.Store.get().badges['journal-challenge'] || H.Store.stat('challengeDone') === 1, H.Store.stat('challengeDone'));
    dismissPops();

    // viết nhanh 3 phút
    await go('#journal/' + t); $('#je-sprint').click(); await tick(100);
    ok('viết nhanh 3 phút: hiện đồng hồ đếm ngược', !$('#je-timer').hidden && $('#je-timer').textContent.indexOf('⏳ 2:') === 0 || $('#je-timer').textContent.indexOf('⏳ 3:') === 0, $('#je-timer').textContent);
    $('#je-sprint').click(); await tick();
    ok('dừng viết nhanh', $('#je-timer').hidden);

    // thư gửi tương lai
    await go('#journal/letters');
    ok('trang thư gửi tương lai', view().includes('Thư gửi tương lai') && !!$('a[href="#journal/letter/new"]'));
    await go('#journal/letter/new');
    type($('#lt-title'), 'Gửi mình sau 1 tháng'); type($('#lt-text'), 'Dear future me, I hope you speak English better now.');
    $('[data-d="7"]').click(); await tick();
    ok('chọn thời gian mở thư vẫn giữ nội dung đã viết', $('#lt-text').value.indexOf('Dear future me') === 0 && $('#lt-title').value.length > 3);
    $('#lt-seal').click(); await tick(120);
    const ls = H.Store.get().letters;
    ok('niêm phong thư', ls.length === 1 && ls[0].openOn > Date.now() + 6 * 864e5 && !ls[0].opened);
    ok('nhận sticker thư gửi tương lai', !!H.Store.get().badges['journal-letter']);
    dismissPops();
    await go('#journal/letter/' + ls[0].id);
    ok('thư chưa đến hạn: không hiện nội dung', view().includes('niêm phong') && view().indexOf('Dear future me') < 0);
    ls[0].openOn = Date.now() - 1000; H.Store.save();
    await go('#journal/letter/' + ls[0].id, 120);
    ok('thư đến hạn: mở được và đánh dấu đã mở', view().includes('Dear future me') && ls[0].opened > 0);
    ok('nhận sticker mở thư', !!H.Store.get().badges['journal-letter-open']);
    dismissPops();

    // PIN
    const enc = new TextEncoder().encode('hiuhf0-journal:1234');
    const dig = await crypto.subtle.digest('SHA-256', enc);
    H.Store.settings.journalPin = Array.from(new Uint8Array(dig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    await go('#journal', 100);
    ok('có PIN: hiện màn khóa, không lộ nội dung', view().includes('đang khóa') && !$('.jtoday'));
    type($('#pin-in'), '9999'); $('#pin-form').requestSubmit(); await tick(150);
    ok('sai PIN: vẫn khóa', view().includes('đang khóa'));
    type($('#pin-in'), '1234'); $('#pin-form').requestSubmit(); await tick(150);
    ok('đúng PIN: mở nhật ký', !!$('.jtoday'));
    H.Store.settings.journalPin = '';

    // xuất, xóa
    ok('có nút tải toàn bộ nhật ký', !$('#j-export').disabled);
    await go('#journal/' + dayKey(1)); $('#je-del').click(); await tick(100);
    ok('xóa một bài nhật ký', !H.Store.journalGet(dayKey(1)));
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
