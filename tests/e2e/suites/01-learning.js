/* Bộ kiểm thử trình duyệt: Học, ôn, xếp trình độ, từ riêng, sao lưu (luồng học chính).
 * Chạy bằng tests/e2e/run.js: trang được nạp kèm tệp này, kết quả ghi vào #out và document.title = "DONE". */
(async () => {
  const out = { checks: [], errors: [] };
  const pre = document.createElement('pre'); pre.id = 'out'; document.body.appendChild(pre);
  window.addEventListener('error', (e) => out.errors.push('onerror: ' + e.message));
  const _ce = console.error; console.error = (...a) => { out.errors.push('console.error: ' + a.join(' ')); _ce(...a); };
  window.confirm = () => true;
  const ok = (name, cond, extra) => out.checks.push([cond ? 'PASS' : 'FAIL', name, extra === undefined ? '' : String(extra)]);
  const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const click = (s) => { const el = typeof s === 'string' ? $(s) : s; if (!el) throw new Error('không thấy ' + s); el.click(); };
  const H = window.hiuhf0;
  const go = async (h) => { if (location.hash === h) { window.dispatchEvent(new HashChangeEvent('hashchange')); } else location.hash = h; await tick(60); };
  const view = () => $('#view').textContent;
  const submit = async (val) => { $('#ti').value = val; $('#tf').requestSubmit(); await tick(); };
  const finish = () => { pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE'; };

  async function answer(correct) {
    const c = H.session().cur, w = c.w;
    if (c.kind === 'intro') { click('[data-flip]'); await tick(); click('[data-act="continue"]'); }
    else if (c.kind === 'lchoose' || c.kind === 'choice') {
      const id = correct ? w.id : c.options.find((o) => o.id !== w.id).id;
      click('[data-opt="' + id + '"]'); await tick(); click('[data-act="continue"]');
    } else { await submit(correct ? w.word : 'qqqqqq'); click('[data-act="continue"]'); }
    await tick();
  }

  try {
    /* 1. Màn chào mừng cho người dùng mới */
    ok('1 hiện màn chào mừng khi chưa có tiến độ', view().includes('Chào mừng đến với hiuhf0'));
    click('[data-goal="toeic"]'); click('[data-per="5"]');
    ok('1 chọn mục tiêu TOEIC, 5 từ/ngày', H.Store.settings.goal === 'toeic' && H.Store.settings.newPerDay === 5);
    click('[data-w="start"]'); await tick(80);
    ok('1 vào trang học, đã onboarded', H.Store.settings.onboarded === true && view().includes('Việc hôm nay'));

    /* 2. Từ mới đi theo lộ trình: mục tiêu TOEIC vẫn học nền A0 trước */
    click('#learnnew'); await tick();
    let S = H.session();
    const first = [S.cur.w].concat(S.queue.map((id) => H.Data.byId.get(id)));
    ok('2 5 từ đầu thuộc A0 dù mục tiêu TOEIC', first.length === 5 && first.every((w) => w.level === 'A0'), first.map((w) => w.word + ':' + w.level).join(','));
    ok('2 5 từ đầu thuộc bài 1', first.every((w) => H.Data.unitOfWord.get(w.id).n === 1), first.map((w) => H.Data.unitOfWord.get(w.id).n));

    /* 3. Đi hết thang bài tập cho 5 từ, trả lời đúng hết */
    const ids = first.map((w) => w.id);
    let guard = 0;
    while (H.session() && guard++ < 60) await answer(true);
    ok('3 phiên kết thúc', !H.session() && view().includes('Xong phiên học'), guard);
    const st = ids.map((id) => H.Store.card(id));
    ok('3 cả 5 từ tốt nghiệp, khoảng cách 1 ngày', st.every((c) => c.state === 'review' && c.interval === 1), JSON.stringify(st.map((c) => [c.state, c.interval, c.ok])));
    ok('3 cấp sau khi tốt nghiệp là 2 (chờ ôn lại sau 1 ngày)', st.every((c) => H.SRS.level(c) === 2), st.map((c) => H.SRS.level(c)));
    ok('3 tóm tắt có ô "lượt lên cấp"', view().includes('lượt lên cấp'));

    /* 4. Gõ gần đúng: cho gõ lại một lần */
    const w5 = H.Data.words.find((w) => w.level === 'A1' && w.word.length >= 6 && /^[a-z]+$/.test(w.word) && !H.Store.card(w.id));
    H.Store.setCard(w5.id, H.SRS.schedule(H.SRS.introduce(Date.now() - 20 * 60000), 2, Date.now() - 12 * 60000));
    await go('#learn'); click('#review'); await tick();
    S = H.session();
    ok('4 thẻ thử là bài nghe & viết / gõ từ', S.cur.w.id === w5.id && (S.cur.kind === 'ltype' || S.cur.kind === 'type'), S.cur.kind + ' ' + S.cur.w.word);
    await submit(w5.word.slice(0, -1));
    ok('4 sai 1 ký tự: chưa chấm, báo gần đúng', !S.cur.answered && S.cur.near === true && view().includes('Gần đúng'));
    await submit(w5.word);
    ok('4 gõ lại đúng: tính đúng nhưng đánh dấu yếu', S.cur.answered && S.cur.correct === true && S.cur.weak === true);
    click('[data-act="continue"]'); await tick();
    ok('4 từ tốt nghiệp sau khi gõ lại đúng', H.Store.card(w5.id).state === 'review');

    const w6 = H.Data.words.find((w) => w.level === 'A1' && w.word.length >= 6 && /^[a-z]+$/.test(w.word) && !H.Store.card(w.id));
    H.Store.setCard(w6.id, H.SRS.schedule(H.SRS.introduce(Date.now() - 20 * 60000), 2, Date.now() - 12 * 60000));
    await go('#learn'); click('#review'); await tick();
    S = H.session();
    let g1 = 0;
    while (S && S.cur && S.cur.w.id !== w6.id && g1++ < 20) { await answer(true); S = H.session(); }
    if (S && S.cur) {
      await submit(w6.word.slice(0, -1)); await submit(w6.word.slice(0, -2));
      ok('4 sai lần hai thì tính là sai', S.cur.answered && S.cur.correct === false);
      click('[data-act="continue"]'); await tick();
      ok('4 sai thì học lại, không tốt nghiệp', H.Store.card(w6.id).state === 'learn');
      let g2 = 0; while (H.session() && g2++ < 30) await answer(true);
      ok('4 tóm tắt liệt kê từ cần chú ý', view().includes('Những từ cần chú ý'));
    } else ok('4 tìm lại được thẻ thử', false);

    /* 5. "Đã nhớ rõ từ" phải qua bài kiểm nghĩa (gõ từ từ nghĩa), hẹn sau vài thẻ chứ không gõ ngay cái vừa nhìn thấy */
    await go('#learn'); H.Store.settings.newPerDay = 5; click('#more'); await tick();
    S = H.session();
    const t1 = S.cur.w;
    click('[data-flip]'); await tick(); click('[data-act="known"]'); await tick();
    ok('5 bấm "đã nhớ rõ": sang thẻ khác, bài kiểm tra được hẹn sau', S.cur.w.id !== t1.id && S.checks[t1.id] === true && S.queue.indexOf(t1.id) >= 0 && S.queue.indexOf(t1.id) <= 6, S.queue.indexOf(t1.id));
    ok('5 chưa lưu và chưa lên cấp 5 trước khi kiểm tra', !H.Store.card(t1.id));
    let g5 = 0;
    while (H.session() && !(H.session().cur.w.id === t1.id) && g5++ < 30) await answer(true);
    S = H.session();
    ok('5 đến lượt: bài kiểm tra là gõ từ từ nghĩa, không còn nút "đã nhớ rõ"', S.cur.w.id === t1.id && S.cur.checkKnown === true && S.cur.kind === 'type' && !$('[data-act="known"]'), S.cur.kind);
    await submit(t1.word); click('[data-act="continue"]'); await tick();
    const k1 = H.Store.card(t1.id);
    ok('5 qua kiểm tra: lên cấp 5, khoảng cách >= 30 ngày', H.SRS.level(k1) === 5 && k1.interval >= 30 && k1.lk === 'type', JSON.stringify(k1));
    S = H.session(); let g6 = 0;
    while (S && S.cur.kind !== 'intro' && g6++ < 30) { await answer(true); S = H.session(); }
    const t2 = S.cur.w;
    click('[data-flip]'); await tick(); click('[data-act="known"]'); await tick();
    g6 = 0;
    while (H.session() && !(H.session().cur.w.id === t2.id && H.session().cur.checkKnown) && g6++ < 30) await answer(true);
    await submit('qqqqqq'); click('[data-act="continue"]'); await tick();
    const k2 = H.Store.card(t2.id);
    ok('5 trượt kiểm tra: vào học từ đầu (cấp 1)', k2 && k2.state === 'learn' && H.SRS.level(k2) === 1, JSON.stringify(k2));
    await go('#library'); await go('#learn');

    /* 6. Xếp trình độ: qua A0, A1; trượt A2 */
    await go('#placement');
    ok('6 trang giới thiệu xếp trình độ', view().includes('Xếp trình độ') && !!$('#pl-start'));
    click('#pl-start'); await tick();
    let n = 0;
    while (H.placement() && n++ < 25) {
      const P = H.placement(), q = P.qs[P.i];
      click((q.lv === 'A0' || q.lv === 'A1') ? '[data-pl="' + q.a + '"]' : '[data-pl="-1"]'); await tick();
    }
    ok('6 dừng sau cấp A2 (15 câu)', n === 15, n);
    ok('6 kết quả gợi ý bỏ qua A0, A1', !!$('#pl-apply') && $('#pl-apply').textContent.includes('A0, A1') && view().includes('A2'), $('#pl-apply') && $('#pl-apply').textContent);
    click('#pl-apply'); await tick(80);
    const path = H.Store.get().path;
    const lower = H.Data.units.filter((u) => u.level === 'A0' || u.level === 'A1');
    const notMarked = lower.filter((u) => !(path[u.id] && path[u.id].test >= 70));
    ok('6 các bài A0, A1 được đánh dấu đã xong', notMarked.length === 0, notMarked.length);
    ok('6 huy hiệu bài lộ trình không tính bài xếp trình độ', !H.Store.get().badges['unit-10'] && !H.Store.get().badges['a0-done']);

    /* 7. Mục tiêu TOEIC sau khi bỏ qua nền tảng: từ TOEIC lên đầu */
    H.Store.get().cards = {}; H.Store.get().daily = { date: '', newDone: 0, reviewDone: 0 };
    await go('#learn'); click('#learnnew'); await tick();
    S = H.session();
    const q7 = [S.cur.w].concat(S.queue.map((id) => H.Data.byId.get(id)));
    ok('7 mục tiêu TOEIC: 5 từ đầu thuộc chủ đề toeic', q7.every((w) => w.topic === 'toeic'), q7.map((w) => w.word + ':' + w.topic).join(','));
    await go('#library');

    /* 8. Từ của tôi */
    click('#my-add summary');
    const f = $('#my-form');
    f.querySelector('[name=word]').value = '123'; f.querySelector('[name=vi]').value = 'x'; f.requestSubmit(); await tick();
    ok('8 từ không hợp lệ bị từ chối', !H.Data.byId.has('123~n') && H.Store.get().custom.length === 0);
    f.querySelector('[name=word]').value = 'blorp'; f.querySelector('[name=vi]').value = 'từ thử nghiệm'; f.querySelector('[name=ex]').value = 'A blorp is not a real word.'; f.requestSubmit(); await tick(80);
    ok('8 thêm từ riêng thành công', H.Data.byId.has('blorp~n') && H.Store.get().custom.length === 1 && H.Store.get().pinned['blorp~n'] === 1);
    ok('8 thư viện hiện từ trong chủ đề "Từ của tôi"', $('#lib-list').textContent.includes('blorp'));
    H.Store.get().cards = {}; H.Store.get().daily = { date: '', newDone: 0, reviewDone: 0 };
    await go('#learn'); click('#learnnew'); await tick();
    ok('8 từ riêng được học đầu tiên', H.session().cur.w.id === 'blorp~n');
    click('[data-flip]'); await tick();
    ok('8 thẻ từ riêng không hiện định nghĩa trống', !$('.fc-more .i-def') && !!$('.fc-more .i-ex'));
    await go('#library');
    const sel = $('#f-topic'); sel.value = 'mine'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    await tick(); click('[data-id="blorp~n"] [data-act="delete"]'); await tick();
    ok('8 xóa từ riêng', !H.Data.byId.has('blorp~n') && H.Store.get().custom.length === 0 && !H.Store.get().pinned['blorp~n']);
    const R = H.Store;
    R.get().custom.push({ word: 'zibble', pos: 'v', vi: 'thử', def: '', ex: '' }); H.Data.setCustom(R.get().custom);
    const json = R.exportJSON(); R.importJSON(json); H.Data.setCustom(R.get().custom);
    ok('8 nhập lại file sao lưu giữ từ riêng', H.Data.byId.has('zibble~v'));
    R.get().custom = []; H.Data.setCustom([]);

    /* 9. Nhắc sao lưu */
    H.Data.words.slice(0, 25).forEach((w) => H.Store.setCard(w.id, H.SRS.introduce()));
    await go('#learn');
    ok('9 hiện nhắc sao lưu khi chưa từng sao lưu', !!$('#backup-now'));
    click('#backup-later'); await tick();
    ok('9 "Để sau" ẩn banner', !$('#backup-now') && H.Store.settings.backupSnooze > Date.now());
    H.Store.settings.backupSnooze = 0; await go('#library'); await go('#learn');
    click('#backup-now'); await tick();
    ok('9 sao lưu ngay ghi nhận thời điểm', H.Store.settings.lastBackup > 0 && !$('#backup-now'));

    /* 10. Cài đặt & lộ trình */
    await go('#settings');
    ok('10 cài đặt có mục tiêu học', !!$('#s-goal') && view().includes('Lần sao lưu cuối'));
    const g = $('#s-goal'); g.value = 'ielts'; g.dispatchEvent(new Event('change', { bubbles: true }));
    ok('10 đổi mục tiêu', H.Store.settings.goal === 'ielts');
    await go('#path');
    ok('10 lộ trình có liên kết xếp trình độ', !!$('a[href="#placement"]'));
    const u = H.Data.units.find((x) => x.level === 'A2');
    await go('#path/' + u.id);
    const skip = $('[data-p="skip"]');
    ok('10 nút bỏ qua bài chuyển thành kiểm tra', !!skip && skip.textContent.includes('kiểm tra'), skip && skip.textContent);
    if (skip) { click(skip); await tick(); ok('10 bắt đầu bài kiểm tra ở chế độ bỏ qua', H.listen() && H.listen().mode === 'test' && H.listen().opts.skip === true); }
    ok('11 thiết lập cũ đã bỏ', !('deck' in H.Store.settings) && !('newOrder' in H.Store.settings));
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  finish();
})();
