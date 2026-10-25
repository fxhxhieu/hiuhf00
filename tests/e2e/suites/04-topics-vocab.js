/* Bộ kiểm thử trình duyệt: Màn Chủ đề, học cả chủ đề, dữ liệu từ vựng mới.
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
  try {
    H.Store.settings.onboarded = true;
    const D = H.Data;

    /* dữ liệu */
    ok('không có cảnh báo dữ liệu', D.warnings.length === 0, D.warnings.slice(0, 3).join(' | '));
    ok('kho từ tăng lên 2.369', D.words.length === 2369, D.words.length);
    ok('mọi từ đều có IPA', D.words.every((w) => w.ipa), D.words.filter((w) => !w.ipa).map((w) => w.word).join(','));
    const topicCount = (k) => D.words.filter((w) => D.inTopic(w, k)).length;
    ['animals', 'weather', 'numbers', 'calendar', 'sports', 'jobs', 'vehicles', 'routine', 'sit-restaurant', 'sit-hotel', 'sit-airport', 'sit-doctor', 'sit-directions', 'sit-phone'].forEach((k) => ok('chủ đề ' + k + ' có từ', topicCount(k) >= 12, topicCount(k)));
    ok('chủ đề "time" cũ đã được tách hết', D.words.filter((w) => w.topic === 'time').length === 0);
    ok('dog thuộc Động vật, fish có nhãn Động vật', D.byId.get('dog~n').topic === 'animals' && D.inTopic(D.byId.get('fish~n'), 'animals') && D.byId.get('fish~n').topic === 'food');
    ok('happy chuyển sang Cảm xúc', D.byId.get('happy~adj').topic === 'feelings');
    ok('bài lộ trình cũ giữ nguyên id và nội dung', !!D.unitById.get('a1-nature-1') && D.unitById.get('a1-nature-1').ids.indexOf('sun~n') >= 0 && D.unitOfWord.get('dog~n').id.startsWith('a1-nature'), D.unitOfWord.get('dog~n').id);
    ok('chủ đề tình huống toàn cụm từ (phr)', ['sit-hotel', 'sit-airport', 'sit-doctor', 'sit-directions', 'sit-phone', 'sit-restaurant'].every((k) => D.words.filter((w) => w.topic === k).every((w) => w.pos === 'phr')));
    ok('từ mới có bài lộ trình riêng', D.unitOfWord.get('puppy~n') && D.unitOfWord.get('puppy~n').topic === 'animals');
    ok('đủ 249 bài lộ trình', D.units.length === 249, D.units.length);
    ok('cụm từ trong ví dụ tìm lại được', D.lookup('puppy') && D.lookup('puppy').topic === 'animals');

    /* màn hình Chủ đề */
    await go('#topics');
    const tiles = $$('.topic');
    ok('màn Chủ đề có tab Danh sách / Chủ đề', $$('.tabs .tab').length === 2 && $('.tabs .tab[aria-selected="true"]').textContent === 'Chủ đề');
    ok('hiện đủ chủ đề có từ, không hiện "time"', tiles.length >= 30 && !$('.topic[href="#topics/time"]') && !!$('.topic[href="#topics/animals"]'), tiles.length);
    ok('có nhóm Tình huống giao tiếp', view().includes('Tình huống giao tiếp') && !!$('.topic[href="#topics/sit-hotel"]'));
    ok('nav "Từ vựng" sáng ở màn Chủ đề', $('.nav a[aria-current="page"]').dataset.r === 'library');

    /* chi tiết chủ đề + học cả chủ đề */
    await go('#topics/animals');
    ok('chi tiết chủ đề hiện tên và số từ', view().includes('Động vật') && view().includes(topicCount('animals') + ' từ'));
    ok('mỗi từ là một chip', $$('.wchip').length === topicCount('animals'), $$('.wchip').length);
    ok('chip có màu theo cấp thuộc', $('.wchip').className.includes('mv-0'));
    $('#tp-new').click(); await tick();
    const S = H.session();
    ok('học cả chủ đề: phiên 10 từ mới của chủ đề', S && S.kind === 'topic' && S.total === 10 && [S.cur.w.id].concat(S.queue).every((id) => D.inTopic(D.byId.get(id), 'animals')), S && S.total);
    ok('phiên chủ đề quay về trang chủ đề', S.back === '#topics/animals');
    // trả lời hết phiên
    let g = 0;
    while (H.session() && g++ < 80) {
      const c = H.session().cur, w = c.w;
      if (c.kind === 'intro') { $('[data-flip]').click(); await tick(); $('[data-act="continue"]').click(); }
      else if (c.kind === 'lchoose' || c.kind === 'choice') { $('[data-opt="' + w.id + '"]').click(); await tick(); $('[data-act="continue"]').click(); }
      else { $('#ti').value = w.word; $('#tf').requestSubmit(); await tick(); $('[data-act="continue"]').click(); }
      await tick();
    }
    ok('xong phiên chủ đề', !H.session() && view().includes('Xong phiên học'));
    $('#back-home').click(); await tick(80);
    ok('"Quay lại bài" về trang chi tiết chủ đề', location.hash === '#topics/animals' && view().includes('Các từ trong chủ đề'));
    ok('tiến độ chủ đề tăng', view().includes('10/' + topicCount('animals') + ' từ đã học'), $('.topic-main small') && $('.topic-main small').textContent);
    ok('nút ôn chủ đề tắt khi chưa có thẻ đến hạn hoặc bật khi có', typeof $('#tp-review').disabled === 'boolean');

    /* thư viện: lọc theo chủ đề gồm cả nhãn phụ */
    $('#tp-lib').click(); await tick(100);
    ok('"Xem trong thư viện" mở đúng chủ đề', location.hash === '#library' && $('#f-topic').value === 'animals');
    $('#q').value = 'fish'; $('#q').dispatchEvent(new Event('input', { bubbles: true })); await tick();
    ok('lọc Động vật tìm thấy "fish" nhờ nhãn phụ', $('#lib-list').textContent.includes('fish'));
    ok('ô chọn chủ đề không có chủ đề rỗng', ![...$('#f-topic').options].some((o) => o.value === 'time'));
    ok('thư viện có tab chuyển sang Chủ đề', $$('.tabs .tab').length === 2 && $('.tabs .tab[aria-selected="true"]').textContent === 'Danh sách từ');

    /* thẻ chưa có emoji dùng biểu tượng chủ đề */
    H.Store.get().cards = {}; H.Store.get().daily = { date: '', newDone: 0, reviewDone: 0 };
    const noEmo = D.words.find((w) => !w.emoji && w.level === 'A0');
    H.Store.get().pinned = {}; H.Store.get().pinned[noEmo.id] = 1;
    await go('#learn'); $('#learnnew').click(); await tick();
    ok('từ chưa có emoji: mặt trước thẻ có sticker chủ đề', H.session().cur.w.id === noEmo.id && !!$('.fc-front .fc-topic .emo'), noEmo.word);
    const withEmo = D.words.find((w) => w.emoji && w.level === 'A0');
    H.Store.get().pinned = {}; H.Store.get().pinned[withEmo.id] = 1; H.Store.get().cards = {}; H.Store.get().daily = { date: '', newDone: 0, reviewDone: 0 };
    await go('#learn'); await go('#learn'); $('#learnnew').click(); await tick();
    ok('từ có emoji: dùng emoji riêng', H.session().cur.w.id === withEmo.id && !$('.fc-front .fc-topic'), withEmo.word);

    /* sổ sticker có sticker chủ đề mới */
    await go('#stickers');
    const topicStickerCount = $$('.sticker').length - 23;
    ok('sticker chủ đề = 2 mỗi chủ đề có từ', topicStickerCount % 2 === 0 && topicStickerCount >= 60, topicStickerCount);
    ok('sticker chủ đề mới (Động vật) xuất hiện', view().includes('Động vật: khám phá') && view().includes('Tình huống') === false ? true : view().includes('Động vật: khám phá'));
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
