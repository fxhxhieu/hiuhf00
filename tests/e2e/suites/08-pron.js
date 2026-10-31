/* Bộ kiểm thử trình duyệt: trang Luyện phát âm (#pron): hồ sơ và bài đo, kế hoạch hằng ngày, thẻ hướng dẫn tạo âm,
 * bài đọc có thu âm (micro và nhận dạng giọng nói được giả lập bằng WAV tổng hợp), phân tích âm tiết và cao độ,
 * chấm âm vị (Azure giả lập bằng fetch, mô hình trên máy giả lập bằng một module data:), bản ghi mốc, chia sẻ, Phòng thử nghiệm.
 * Không dùng micro thật, không gọi dịch vụ thật, không tải mô hình thật.
 * Chạy bằng tests/e2e/run.js: trang được nạp kèm tệp này, kết quả ghi vào #out và document.title = "DONE". */
(async () => {
  const out = { checks: [], errors: [] };
  const pre = document.createElement('pre'); pre.id = 'out'; document.body.appendChild(pre);
  window.addEventListener('error', (e) => out.errors.push('onerror: ' + e.message));
  window.addEventListener('unhandledrejection', (e) => out.errors.push('unhandledrejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)));
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
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await tick(25); } return false; };
  const P = () => H.Store.get().pron;
  const evOf = (id) => (P().t[id] ? P().t[id].ev : []);
  const lastEv = (id) => evOf(id)[evOf(id).length - 1];

  /* ---------- Tín hiệu tổng hợp (giống tests/audio.test.js) và micro giả ---------- */
  const SR = 16000;
  const sil = (sec) => new Float32Array(Math.round(sec * SR));
  const hann = (t, d) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / d);
  function addSyl(x, start, dur, amp, f1, f2 = f1) {
    let phase = 0;
    const a = Math.round(start * SR), n = Math.round(dur * SR);
    for (let i = 0; i < n; i++) {
      phase += (2 * Math.PI * (f1 + (f2 - f1) * (i / n))) / SR;
      x[a + i] += hann(i / SR, dur) * amp * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
    }
  }
  const noise = (x, amp) => { let s = 7; for (let i = 0; i < x.length; i++) { s = (s * 1103515245 + 12345) % 2147483648; x[i] += (s / 2147483648 - 0.5) * 2 * amp; } return x; };
  const SIG = {
    word: () => { const x = sil(1.2); addSyl(x, 0.3, 0.5, 0.35, 150); return noise(x, 0.002); },
    three: () => { const x = sil(1.3); addSyl(x, 0.2, 0.18, 0.2, 140); addSyl(x, 0.5, 0.2, 0.55, 170); addSyl(x, 0.82, 0.18, 0.3, 130); return noise(x, 0.002); },
    rise: () => { const x = sil(1.1); addSyl(x, 0.15, 0.8, 0.4, 120, 190); return noise(x, 0.002); },
    fall: () => { const x = sil(1.1); addSyl(x, 0.15, 0.8, 0.4, 190, 120); return noise(x, 0.002); },
    silent: () => sil(1.2),
    quiet: () => { const x = sil(1.2); addSyl(x, 0.3, 0.5, 0.02, 150); return noise(x, 0.0002); },
    garbage: () => null
  };
  const blobOf = (x) => (x ? new Blob([Dsp.wav16k(x, SR)], { type: 'audio/wav' }) : new Blob([new Uint8Array(200)], { type: 'audio/webm' }));
  const AR = window.App.Rec, AG = window.App.Recog;
  const calls = { start: 0, stop: 0 };
  const mic = { sig: SIG.word, said: '', alts: [] };
  AR.supported = true;
  AR.start = async () => { calls.start += 1; };
  AR.stop = async () => { calls.stop += 1; return blobOf(mic.sig()); };
  AR.level = () => 0.4;
  AG.C = function FakeRecognition() {};
  AG.start = () => {};
  AG.stop = async () => mic.said;
  AG.results = [];
  if (!TTS.ok) { TTS.ok = true; TTS.speak = () => {}; }

  /** Thu một lần: bấm thu, đợi thanh mức to, (whileRec nếu có), bấm dừng, đợi phân tích xong. */
  async function record(sig, said, alts, whileRec) {
    mic.sig = sig; mic.said = said || '';
    AG.results = alts || (said ? [[{ t: said, c: 0.9 }]] : []);
    click('[data-pr="rec"]');
    if (!(await waitFor(() => $('#pr-meter')))) throw new Error('không vào trạng thái đang thu');
    if (whileRec) { await tick(150); whileRec(); }
    click('[data-pr="rec"]');
    if (!(await waitFor(() => !view().includes('Đang phân tích') && !$('#pr-meter') && ($('[data-pr="mine"]') || $('.result'))))) throw new Error('phân tích không xong');
    await tick(40);
  }
  /** Chạy một chuỗi bài chỉ có các bài trong tay: onFinish ghi lại để kiểm tra. */
  const finished = { n: 0 };
  const run = (title, tasks) => { finished.n = 0; PronUI.runSeq({ title, tasks, back: '#pron', onFinish: () => { finished.n += 1; } }); };
  const prod = (o) => Object.assign({ type: 'prod', kind: 'word' }, o);
  const THINK = prod({ target: 'th-s', text: 'think', ipa: 'θɪŋk', other: 'sink' });

  /** Làm hết chuỗi bài đang chạy: nghe đúng/sai theo `wrong` (tập mã nhóm), bài đọc thì bỏ qua. */
  async function runThrough(wrong) {
    let n = 0;
    while (n++ < 80) {
      const S = PronUI.getSeq();
      if (!S || S.i >= S.tasks.length) return n;
      const t = S.tasks[S.i], right = !(wrong && wrong.has(t.target));
      if (t.type === 'perc') click('[data-pick="' + (right ? t.side : 1 - t.side) + '"]');
      else if (t.type === 'stress' || t.type === 'ending') click('[data-pick="' + (right ? t.q.a : (t.q.a + 1) % t.q.opts.length) + '"]');
      else if (t.type === 'rhythm') {
        t.toks.forEach((k, i) => { if (k.stressed === right) click('[data-tok="' + i + '"]'); });
        click('[data-act="check"]');
      } else { click('[data-pr="skip"]'); await tick(15); continue; }
      await tick(15);
      click('[data-pr="next"]'); await tick(15);
    }
    return n;
  }

  try {
    H.Store.settings.onboarded = true;
    const PRON = window.PRON;

    /* ===== A: trang chính và đường vào ===== */
    await go('#practice');
    ok('A1 trang Luyện có ô vào Luyện phát âm', !!$('a.hub[href="#pron"]'));
    await go('#pron');
    ok('A2 trang chính: tiêu đề, bài đo, kế hoạch, và các ô Cách tạo âm / Bản ghi / Chấm âm vị / Phòng thử nghiệm', view().includes('Luyện phát âm') && !!$('[data-act="diag"]') && !!$('[data-act="plan"]')
      && ['#pron/guide', '#pron/rec', '#pron/score', '#pron/lab', '#pron/rhythm'].every((h) => !!$('a.hub[href="' + h + '"]')));
    ok('A3 chưa có dữ liệu thì nói rõ là chưa đo, không bịa phần trăm', view().includes('Chưa có dữ liệu') && $$('.mrow').length === 0);
    ok('A4 nhắc đây là ước lượng, không phải thang trình độ', view().includes('không phải thang đánh giá trình độ'));

    /* ===== B: thẻ hướng dẫn tạo âm ===== */
    await go('#pron/guide');
    ok('B1 danh sách thẻ: mỗi thẻ có liên kết', $$('a.chip[href^="#pron/guide/"]').length === PRON.guides.length, $$('a.chip[href^="#pron/guide/"]').length + '/' + PRON.guides.length);
    ok('B2 danh sách thẻ nói rõ sơ đồ chỉ để minh họa và cần giáo viên ngữ âm xem lại', view().includes('không chính xác về giải phẫu') && view().includes('giáo viên ngữ âm'));
    let badGuides = [];
    for (const g of PRON.guides) {
      await go('#pron/guide/' + g.id, 25);
      const okPic = g.pic ? !!$('svg.mouth') && $$('svg.mouth .mp-tongue').length === 1 : true;
      const okHow = $$('ol li').length === g.how.length && g.check.every((c) => view().includes(c.slice(0, 20)));
      if (!(okPic && okHow && $$('[data-say]').length === g.words.length)) badGuides.push(g.id);
    }
    ok('B3 mọi thẻ hiện đúng sơ đồ (nếu có), các bước, cách tự kiểm tra và nút nghe từng từ', !badGuides.length, badGuides.join(','));
    await go('#pron/guide/th');
    ok('B4 thẻ /θ/ có sơ đồ, chú giải màu và nút đọc thử', !!$('svg.mouth') && !!$('.legend') && !!$('#pr-try') && view().includes('So với tiếng Việt'));
    ok('B5 sơ đồ có chữ thay thế cho trình đọc màn hình và có điểm chạm', $('svg.mouth').getAttribute('aria-label').length > 10 && !!$('svg.mouth .mp-hot'));
    await go('#pron/guide/khong-co');
    ok('B6 mã thẻ lạ thì quay về danh sách', !!$('a.chip[href^="#pron/guide/"]') && !$('svg.mouth'));
    await go('#pron/guide/th');
    click('[data-ear]'); await tick(60);
    ok('B7 "Luyện tai nhóm này" từ thẻ chạy 6 câu nghe', PronUI.getSeq() && PronUI.getSeq().tasks.length === 6 && !!$('[data-pick]'));
    const kb = $('.prompt .btn kbd'), kbBtn = kb && kb.closest('.btn');
    ok('B7b phím tắt P nằm trong nút Nghe, không nổi lên góc trang', !!kb && getComputedStyle(kb).position === 'static' && kb.getBoundingClientRect().left >= kbBtn.getBoundingClientRect().left && kb.getBoundingClientRect().right <= kbBtn.getBoundingClientRect().right && kb.getBoundingClientRect().top >= kbBtn.getBoundingClientRect().top);
    await runThrough(); await tick(60);
    ok('B8 xong thì về lại đúng thẻ (cùng địa chỉ cũng phải vẽ lại)', !!$('svg.mouth') && location.hash === '#pron/guide/th', location.hash);

    /* ===== C: bài đo ===== */
    await go('#pron');
    Object.keys(P().t).forEach((k) => { delete P().t[k]; }); // các bước trên đã ghi thêm bằng chứng cho nhóm th-s
    click('[data-act="diag"]'); await tick(60);
    const D = PronUI.getSeq();
    ok('C1 bài đo: 34 tác vụ (20 nghe cặp âm, 4 trọng âm, 4 đuôi từ, 6 đọc)', D && D.tasks.length === 34 && D.tasks.filter((t) => t.type === 'perc').length === 20 && D.tasks.filter((t) => t.type === 'prod').length === 6, D && D.tasks.length);
    ok('C2 bài đo khởi động ở tác vụ nghe, có đếm tiến độ', $('.s-count').textContent === '0/34' && !!$('[data-pick]'));
    await runThrough(new Set(['th-s']));
    ok('C3 xong bài đo thì hỏi phần tự thấy khó (trọng số nhẹ)', view().includes('Gần xong rồi') && view().includes('trọng số rất nhẹ'));
    ok('C4 mỗi nhóm cặp âm được đo 2 lần, nhóm th-s sai cả 2', evOf('th-s').filter((e) => e[1] === 'perc').length === 2 && evOf('th-s').every((e) => e[2] === 0) && evOf('l-r').every((e) => e[2] === 1));
    ok('C5 bài đo ghi vào thống kê luyện nghe cặp âm', H.Store.get().listen.pair && H.Store.get().listen.pair.n >= 20);
    click('input[type=checkbox][value="' + PronUI.tg('th-s').cat + '"]'); click('#pr-self'); await tick(60);
    ok('C6 kết quả: hồ sơ theo nhóm và 3 việc nên luyện, có th-s', $$('.mrow').length === PRON.cats.length && view().includes('3 việc nên luyện trước') && $$('.task').length >= 1 && view().includes(PronUI.tg('th-s').vi));
    ok('C7 tự đánh giá chỉ ghi bằng chứng nhẹ (loại self, trọng số 25)', evOf(PronUI.tg('th-s').id).some((e) => e[1] === 'self' && e[3] === 25));
    ok('C8 đã lưu ngày đo', !!P().diag && P().diag.n === 34);
    ok('C9 nhóm mới đo vài lần thì ghi "ít dữ liệu", không dùng chữ khẳng định', view().includes('ít dữ liệu'));
    ok('C9b bài đo lưu ảnh chụp hồ sơ để so tiến bộ lần sau: 1 ảnh, có các nhóm lớn đã đo, mức trong 0..1', P().diag.hist.length === 1 && P().diag.hist[0].ts === P().diag.ts && Object.keys(P().diag.hist[0].s).length >= 3 && Object.values(P().diag.hist[0].s).every((v) => v >= 0 && v <= 1), JSON.stringify(P().diag.hist));
    ok('C9c lần đo đầu tiên chưa có mũi tên so sánh (chưa có lần đo trước)', !$('.mrow-h small.up') && !$('.mrow-h small.down') && !view().includes('thay đổi so với lần đo'));

    /* thoát giữa chừng phải về trang chính (đặt lại cùng hash vẫn vẽ lại) */
    await go('#pron');
    click('[data-act="diag"]'); await tick(40);
    click('#pr-exit'); await tick(80);
    ok('C10 thoát bài đo giữa chừng: về trang chính, không kẹt ở khung bài', !!$('[data-act="diag"]') && !$('#pr-exit') && PronUI.getSeq() === null && location.hash === '#pron');

    /* ===== D: kế hoạch hằng ngày ===== */
    await go('#pron');
    ok('D1 sau khi đo: hồ sơ có số liệu và kế hoạch hôm nay có nhóm th-s', $$('.mrow').length === PRON.cats.length && $$('.task').length >= 1 && view().includes(PronUI.tg('th-s').vi) && view().includes('Đo lại'));
    click('[data-act="plan"]'); await tick(60);
    const PL = PronUI.getSeq();
    ok('D2 kế hoạch: có bài nghe rồi tới bài đọc, lưu kế hoạch của ngày', PL && PL.tasks.some((t) => t.type === 'perc') && PL.tasks.some((t) => t.type === 'prod') && PL.tasks.findIndex((t) => t.type === 'prod') > PL.tasks.findIndex((t) => t.type === 'perc') && P().plan && P().plan.ids.length >= 1);
    await runThrough();
    ok('D3 xong kế hoạch: tổng kết, ghi nhận ngày luyện', view().includes('Xong lượt luyện hôm nay') && H.Store.stat('pronDays') === 1 && P().plan.done.indexOf('all') >= 0, view().slice(0, 100));
    ok('D4 tổng kết không tính bài đọc bị bỏ qua là đã đọc (0/số bài đọc)', /^0\/[1-9]\d*$/.test($$('.stat b')[1].textContent), $$('.stat b').map((b) => b.textContent).join(' | '));
    await go('#pron');
    ok('D5 trang chính ghi "đã xong" cho hôm nay', view().includes('đã xong'));

    /* ===== D2: tiến bộ giữa hai lần đo ===== */
    ok('D6 vừa đo xong thì hồ sơ chưa có mũi tên (chưa đổi gì so với ảnh chụp)', !$('.mrow-h small.up') && !$('.mrow-h small.down'));
    ['th-s', 'l-r', 'init-s', 'fin-stop', 'iy-ih'].forEach((id) => { for (let i = 0; i < 12; i++) Pron.record(P(), id, 'perc', true); });
    await go('#pron');
    ok('D7 luyện tốt thêm thì hồ sơ hiện ▲ và ghi chú so với ngày của lần đo trước', $$('.mrow-h small.up').length >= 1 && !$('.mrow-h small.down') && view().includes('thay đổi so với lần đo ngày ' + new Date(P().diag.hist[0].ts).toLocaleDateString('vi-VN')), $$('.mrow-h b').map((b) => b.textContent).join(' | '));
    click('[data-act="diag"]'); await tick(60);
    await runThrough();
    click('#pr-self'); await tick(60);
    ok('D8 đo lại: có 2 ảnh chụp và trang kết quả so với lần đo trước (có ▲)', P().diag.hist.length === 2 && P().diag.hist[1].ts === P().diag.ts && $$('.mrow-h small.up').length >= 1 && view().includes('thay đổi so với lần đo ngày'), JSON.stringify(P().diag.hist.map((h) => h.ts)));
    await go('#pron');
    ok('D9 về trang chính sau khi đo lại: baseline là ảnh mới nhất nên mũi tên biến mất', !$('.mrow-h small.up') && !$('.mrow-h small.down') && P().diag.hist.length === 2);

    /* ===== E: bài đọc có thu âm (micro và nhận dạng giả lập) ===== */
    await go('#pron');
    const before = evOf('th-s').length, speak0 = H.Store.get().speak.n;
    run('thử', [THINK, THINK]);
    ok('E1 bài đọc: hiện từ, IPA, nút nghe mẫu, nghe chậm, cách tạo âm; chưa có nút Tiếp tục', view().includes('think') && view().includes('θɪŋk') && $$('[data-say]').length >= 2 && !!$('a[href="#pron/guide/th"]') && !$('[data-pr="done"]'));
    await record(SIG.word, 'sink', [[{ t: 'sink', c: 0.9 }, { t: 'sing', c: 0.3 }]], () => {
      const m = $('.meter').getBoundingClientRect(), bar = $('#pr-meter').getBoundingClientRect();
      ok('E1b khi đang thu: thanh mức to có bề rộng thấy được và đang chạy theo mức to (không co về 0)', m.width > 150 && m.height >= 8 && bar.width > 40 && bar.width < m.width, Math.round(m.width) + 'x' + Math.round(m.height) + ' / ' + Math.round(bar.width));
    });
    ok('E2 máy nghe thành từ kia trong cặp: báo gần với âm kia, kèm cách tạo âm, lần thử 1/3', view().includes('Đó chính là từ còn lại') && view().includes('Lần thử 1/3') && !!$('.result.bad'), view().slice(0, 200));
    ok('E3 chưa bấm Tiếp tục thì chưa ghi bằng chứng', evOf('th-s').length === before);
    await record(SIG.word, 'think', [[{ t: 'think', c: 0.9 }]]);
    ok('E4 đọc lại và được nghe đúng: báo khớp, lần thử 2/3', !!$('.result.ok') && view().includes('khớp') && view().includes('Lần thử 2/3'));
    ok('E5 có nghe lại bản ghi, so với mẫu, tự đánh giá, lưu mốc', !!$('[data-pr="mine"]') && !!$('[data-pr="selfok"]') && !!$('[data-pr="save"]'));
    click('[data-pr="selfbad"]'); await tick(30);
    ok('E6 tự đánh giá "chưa giống": ghi bằng chứng nhẹ (self, sai) và chỉ ghi được một lần', evOf('th-s').filter((e) => e[1] === 'self').length >= 1 && !$('[data-pr="selfbad"]') && lastEv('th-s')[1] === 'self' && lastEv('th-s')[2] === 0 && lastEv('th-s')[3] === 25);
    click('[data-pr="done"]'); await tick(40);
    const prodEv = evOf('th-s').filter((e) => e[1] === 'prod');
    ok('E7 Tiếp tục: ghi đúng một bằng chứng đọc (kết quả tốt nhất của các lần thử = đúng, trọng số 50)', prodEv.length === 1 && prodEv[0][2] === 1 && prodEv[0][3] === 50, JSON.stringify(prodEv));
    ok('E8 bài đọc có tính vào thống kê Luyện nói và được đếm là đã đọc', H.Store.get().speak.n === speak0 + 1 && PronUI.getSeq().read === 1);
    /* mục thứ hai: bản thu quá nhỏ và im lặng không được tính */
    await record(SIG.silent, '');
    ok('E9 bản thu im lặng: báo kiểm tra micro, không tính lần thử, không có nút Tiếp tục', view().includes('không tính') && view().includes('micro') && !$('[data-pr="done"]') && !$('[data-pr="mine"]'));
    await record(SIG.quiet, 'think');
    ok('E10 bản thu quá nhỏ: báo nói to hơn / đưa micro lại gần, vẫn không tính dù máy nghe đúng', view().includes('không tính') && view().includes('to hơn') && !$('[data-pr="done"]'));
    await record(SIG.garbage, 'think');
    ok('E11 không giải mã được bản thu: vẫn dùng kết quả nhận dạng, không lỗi', !!$('.result.ok') && !$('canvas.anal'));
    const evBefore = evOf('th-s').length;
    click('[data-pr="skip"]'); await tick(40);
    ok('E12 bỏ qua mục: không ghi bằng chứng, chuỗi bài kết thúc', evOf('th-s').length === evBefore && finished.n === 1);

    /* tối đa 3 lần thử mỗi mục; kết quả tốt nhất của các lần thử mới được tính */
    const evCap = evOf('th-s').length;
    run('3 lần', [THINK]);
    await record(SIG.word, 'sink', [[{ t: 'sink', c: 0.9 }, { t: 'sing', c: 0.3 }]]);
    await record(SIG.word, 'sink', [[{ t: 'sink', c: 0.9 }, { t: 'sing', c: 0.3 }]]);
    ok('E13 sau 2 lần thử vẫn còn nút đọc lại, chưa có thông báo hết lượt', !!$('[data-pr="rec"]') && view().includes('Lần thử 2/3') && !view().includes('Đã đủ 3 lần'));
    await record(SIG.word, 'think');
    ok('E14 lần thử thứ 3: ghi "3/3", ẩn nút đọc lại, báo đã đủ lượt', view().includes('Lần thử 3/3') && !$('[data-pr="rec"]') && view().includes('Đã đủ 3 lần thử'), view().slice(0, 140));
    click('[data-pr="done"]'); await tick(40);
    const capEv = evOf('th-s').slice(evCap).filter((e) => e[1] === 'prod');
    ok('E15 sai hai lần rồi đúng ở lần thứ 3: ghi đúng một bằng chứng đọc là đúng (tốt nhất của 3 lần)', capEv.length === 1 && capEv[0][2] === 1, JSON.stringify(capEv));
    run('3 lần sai', [THINK]);
    for (let i = 0; i < 3; i++) await record(SIG.word, 'sink', [[{ t: 'sink', c: 0.9 }, { t: 'sing', c: 0.3 }]]);
    click('[data-pr="done"]'); await tick(40);
    const capEv2 = evOf('th-s').slice(evCap).filter((e) => e[1] === 'prod');
    ok('E16 sai cả 3 lần: bằng chứng đọc là sai (không bị "thử cho tới khi qua")', capEv2.length === 2 && capEv2[1][2] === 0, JSON.stringify(capEv2));

    /* ===== F: trọng âm và ngữ điệu bằng phân tích âm thanh ===== */
    run('trọng âm', [prod({ target: 'stress', text: 'banana', ipa: 'bəˈnænə', stress: { n: 3, k: 1 } }), prod({ target: 'stress', text: 'banana', ipa: 'bəˈnænə', stress: { n: 3, k: 0 } })]);
    await record(SIG.three, 'banana');
    ok('F1 trọng âm: không hiện kết quả nhận dạng từ (vô nghĩa với trọng âm), có biểu đồ phân tích', !$('.result') && !!$('canvas.anal') && view().includes('Phân tích giọng (thử nghiệm)'));
    ok('F2 trọng âm đúng (âm tiết 2 to nhất): máy thấy 3 âm tiết, nổi nhất là thứ 2, khớp', view().includes('Máy thấy 3 âm tiết') && view().includes('thứ 2') && view().includes('khớp ✅'), $('.scbox') && $('.scbox').textContent.slice(0, 260));
    ok('F3 biểu đồ được vẽ (canvas có kích thước và không trống)', $('canvas.anal').width > 100 && $('canvas.anal').getContext('2d').getImageData(0, 0, $('canvas.anal').width, $('canvas.anal').height).data.some((v, i) => i % 4 === 3 && v > 0));
    ok('F4 luôn nhắc đây là gợi ý, dễ sai khi có tạp âm', view().includes('không phải kết luận'));
    click('[data-pr="done"]'); await tick(40);
    ok('F5 ghi bằng chứng trọng âm nhẹ (đọc, trọng số 30)', lastEv('stress') && lastEv('stress')[1] === 'prod' && lastEv('stress')[2] === 1 && lastEv('stress')[3] === 30, JSON.stringify(lastEv('stress')));
    await record(SIG.three, 'banana');
    ok('F6 mẫu nhấn ở âm tiết 1 mà người đọc nhấn âm 2: báo chưa khớp, chỉ cách sửa', view().includes('chưa khớp') && view().includes('thứ 1'));
    click('[data-pr="done"]'); await tick(40);
    ok('F7 bằng chứng sai được ghi', lastEv('stress')[2] === 0);

    run('ngữ điệu', [prod({ target: 'intonation', kind: 'sentence', text: 'Are you ready?', expect: 'rise' }), prod({ target: 'intonation', kind: 'sentence', text: 'Are you ready?', expect: 'rise' })]);
    await record(SIG.rise, 'are you ready');
    ok('F8 ngữ điệu: câu hỏi lên giọng được nhận là lên và đúng', view().includes('lên giọng') && view().includes('đúng ✅'), $('.scbox') && $('.scbox').textContent.slice(0, 200));
    click('[data-pr="done"]'); await tick(40);
    await record(SIG.fall, 'are you ready');
    ok('F9 câu hỏi mà xuống giọng: báo chưa đúng', view().includes('xuống giọng') && view().includes('chưa đúng'));
    click('[data-pr="done"]'); await tick(40);
    ok('F10 bằng chứng ngữ điệu: đúng rồi sai', evOf('intonation').length === 2 && evOf('intonation')[0][2] === 1 && evOf('intonation')[1][2] === 0);

    /* đọc câu (kind = sentence) chấm theo tỉ lệ từ khớp */
    run('câu', [prod({ target: 'rhythm', kind: 'sentence', text: 'I want to go home.' }), prod({ target: 'init-s', kind: 'sentence', text: 'She sells sea shells' })]);
    await record(SIG.three, 'i want to go');
    ok('F11 bài nhịp câu không hiện kết quả nhận dạng từ', !$('.sc-words'));
    click('[data-pr="done"]'); await tick(40);
    await record(SIG.three, 'she sells');
    ok('F12 đọc câu thiếu từ: báo tỉ lệ khớp và tô từ thiếu', view().includes('Chưa đủ') && $$('.sc-words .missw').length === 2 && $$('.sc-words .okw').length === 2, view().slice(0, 150));
    click('[data-pr="skip"]'); await tick(40);

    /* ===== G: chấm âm vị bằng Azure (giả lập fetch) ===== */
    await go('#pron/score');
    ok('G1 trang cài đặt: mặc định tắt, cảnh báo âm thanh gửi tới Microsoft và khóa lưu riêng', $('input[name=prov][value=off]').checked && view().includes('gửi tới Microsoft') && view().includes('không nằm trong file sao lưu'));
    ok('G2 nói rõ chưa thử với dịch vụ thật', view().includes('chưa được thử với dịch vụ thật'));
    const KEY = 'k-test-0123456789abcdef';
    click('input[name=prov][value=azure]');
    $('#sc-key').value = KEY; $('#sc-region').value = 'southeastasia';
    click('#sc-save'); await tick(30);
    const cfgSaved = JSON.parse(localStorage.getItem('hiuhf0.scorer') || '{}');
    ok('G3 lưu cài đặt: nguồn, khóa, vùng nằm ở khóa localStorage riêng', cfgSaved.provider === 'azure' && cfgSaved.key === KEY && cfgSaved.region === 'southeastasia');
    ok('G4 khóa không lọt vào trạng thái ứng dụng, file sao lưu và các khóa localStorage khác', H.Store.exportJSON().indexOf(KEY) < 0 && Object.keys(localStorage).filter((k) => k !== 'hiuhf0.scorer').every((k) => (localStorage.getItem(k) || '').indexOf(KEY) < 0));
    await go('#pron/score');
    ok('G5 mở lại trang vẫn thấy cài đặt đã lưu', $('input[name=prov][value=azure]').checked && $('#sc-key').value === KEY && $('#sc-region').value === 'southeastasia' && $('#sc-key').type === 'password');
    const realFetch = window.fetch, azure = { status: 200, body: null, seen: [] };
    window.fetch = async (url, opt) => {
      if (String(url).indexOf('stt.speech.microsoft.com') >= 0) {
        azure.seen.push({ url: String(url), headers: opt && opt.headers, size: opt && opt.body ? opt.body.length : 0 });
        return { ok: azure.status === 200, status: azure.status, json: async () => azure.body };
      }
      return realFetch(url, opt);
    };
    azure.status = 401;
    click('#sc-test'); await waitFor(() => $('#sc-test-out').textContent.length > 3 && !$('#sc-test-out').textContent.includes('Đang thử'));
    ok('G6 thử kết nối với khóa sai: báo khóa hoặc vùng không đúng', $('#sc-test-out').textContent.includes('Khóa hoặc vùng Azure không đúng'), $('#sc-test-out').textContent);
    azure.status = 200; azure.body = { RecognitionStatus: 'InitialSilenceTimeout' };
    click('#sc-test'); await waitFor(() => $('#sc-test-out').textContent.includes('hợp lệ'));
    ok('G7 thử kết nối với khóa đúng: báo hợp lệ; gọi đúng vùng, gửi khóa trong header', $('#sc-test-out').textContent.includes('hợp lệ') && azure.seen[azure.seen.length - 1].url.indexOf('https://southeastasia.stt.speech.microsoft.com/') === 0 && azure.seen[azure.seen.length - 1].headers['Ocp-Apim-Subscription-Key'] === KEY);
    ok('G8 bản thử gửi một giây im lặng WAV 16 kHz (44 byte tiêu đề + 32000)', azure.seen[azure.seen.length - 1].size === 44 + 32000, azure.seen[azure.seen.length - 1].size);

    azure.body = {
      RecognitionStatus: 'Success',
      NBest: [{ Display: 'Think.', PronunciationAssessment: { AccuracyScore: 62, FluencyScore: 100, CompletenessScore: 100, PronScore: 78 },
        Words: [{ Word: 'think', PronunciationAssessment: { AccuracyScore: 62, ErrorType: 'Mispronunciation' },
          Phonemes: [{ Phoneme: 'th', PronunciationAssessment: { AccuracyScore: 31 } }, { Phoneme: 'ih', PronunciationAssessment: { AccuracyScore: 92 } }, { Phoneme: 'ng', PronunciationAssessment: { AccuracyScore: 70 } }, { Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 40 } }] }] }]
    };
    const nPre = evOf('th-s').length;
    run('azure', [THINK]);
    await record(SIG.word, 'think');
    ok('G9 có kết quả Azure: khung chấm âm vị, từng âm có màu/ký hiệu, âm /θ/ bị đánh dấu thấp', !!$('.scbox .phrow') && view().includes('Chấm âm vị (Azure)') && $$('.scbox .ph').length === 4 && $$('.scbox .ph.bad').length === 2 && $$('.scbox .ph.weak').length === 1 && $('.scbox .ph.bad').textContent.indexOf('θ') >= 0, $$('.scbox .ph').map((e) => e.className + ':' + e.textContent).join('|'));
    ok('G10 danh sách vấn đề nêu âm, điểm và dẫn tới thẻ cách tạo âm', $('.scbox .misslist') && $('.scbox .misslist').textContent.includes('31/100') && !!$('.scbox .misslist a[href^="#pron/guide/"]'), $('.scbox .misslist') && $('.scbox .misslist').innerHTML.slice(0, 200));
    ok('G11 nhắc đây vẫn là kết quả của máy, kèm Phòng thử nghiệm', view().includes('Phòng thử nghiệm') || view().includes('đối chiếu với tai'));
    ok('G12 bản gửi đi là WAV 16 kHz có header chấm điểm cấp âm vị', azure.seen[azure.seen.length - 1].size > 44 + 3000 && JSON.parse(atob(azure.seen[azure.seen.length - 1].headers['Pronunciation-Assessment'])).Granularity === 'Phoneme');
    click('[data-pr="done"]'); await tick(40);
    const az = evOf('th-s').slice(nPre).filter((e) => e[1] === 'azure');
    ok('G13 ghi bằng chứng loại azure (trọng số 100) cho nhóm th-s: sai, vì có lỗi /θ/', az.length === 1 && az[0][2] === 0 && az[0][3] === 100, JSON.stringify(evOf('th-s').slice(nPre)));
    const fsAz = evOf('fin-stop').filter((e) => e[1] === 'azure');
    ok('G14 lỗi /k/ cuối từ (nhóm khác với nhóm đang luyện) chỉ ghi một bằng chứng phụ: sai, trọng số một nửa (50)', fsAz.length === 1 && fsAz[0][2] === 0 && fsAz[0][3] === 50, JSON.stringify(fsAz));
    azure.status = 429;
    run('azure lỗi', [THINK]);
    await record(SIG.word, 'think');
    ok('G15 Azure báo vượt hạn mức: hiện thông báo lỗi dễ hiểu, vẫn có kết quả nhận dạng, không lỗi JS', view().includes('vượt hạn mức') && !!$('.result'));
    click('[data-pr="skip"]'); await tick(30);
    window.fetch = realFetch;

    /* ===== H: chấm âm vị bằng mô hình trên máy (module giả qua data:) ===== */
    window.__fakeHeard = 'sɪŋk';
    const fakeLib = 'data:text/javascript,' + encodeURIComponent('export async function pipeline(){ return async () => ({ text: globalThis.__fakeHeard || "" }); }');
    await go('#pron/score');
    click('input[name=prov][value=local]');
    $('#sc-lib').value = fakeLib; $('#sc-model').value = 'fake/model';
    click('#sc-save'); await tick(30);
    ok('H1 chọn mô hình trên máy: hiện nút tải và cảnh báo dung lượng, giọng bản xứ, máy yếu', !!$('#sc-load') && view().includes('355 MB') && view().includes('giọng người Việt') && view().includes('Máy yếu'));
    click('#sc-load'); await waitFor(() => $('#sc-load-out').textContent.includes('sẵn sàng'));
    ok('H2 tải mô hình (giả): báo sẵn sàng và Scorer.localReady()', $('#sc-load-out').textContent.includes('sẵn sàng') && Scorer.localReady());
    run('local', [THINK]);
    await record(SIG.word, 'think');
    ok('H3 mô hình nghe /sɪŋk/: khung "mô hình trên máy", âm /θ/ bị thay bằng /s/, dẫn tới thẻ', view().includes('Chấm âm vị (mô hình trên máy)') && $$('.scbox .ph.sub').length === 1 && $('.scbox .misslist').textContent.includes('nghe như /s/'), $('.scbox') && $('.scbox').textContent.slice(0, 200));
    click('[data-pr="done"]'); await tick(40);
    const loc = evOf('th-s').filter((e) => e[1] === 'local');
    ok('H4 ghi bằng chứng loại local (trọng số 70) là sai', loc.length === 1 && loc[0][2] === 0 && loc[0][3] === 70, JSON.stringify(loc));
    window.__fakeHeard = 'θɪŋk';
    run('local đúng', [THINK]);
    await record(SIG.word, 'think');
    ok('H5 nghe đúng /θɪŋk/: không có âm nào bị đánh dấu', $$('.scbox .ph').length === 4 && $$('.scbox .ph.sub, .scbox .ph.del, .scbox .ph.bad').length === 0 && view().includes('Chưa thấy âm nào bất thường'));
    click('[data-pr="done"]'); await tick(40);
    ok('H6 bằng chứng local đúng được ghi', lastEv('th-s')[1] === 'local' && lastEv('th-s')[2] === 1);

    /* ===== I: bản ghi mốc, nghe lại, chia sẻ, xóa ===== */
    await go('#pron/rec');
    ok('I1 chưa có bản ghi thì nói rõ cách tạo', P().rec.length === 0 && view().includes('Chưa có bản ghi nào'));
    run('lưu', [THINK]);
    await record(SIG.word, 'think');
    click('[data-pr="save"]'); await waitFor(() => P().rec.length === 1);
    ok('I2 lưu bản ghi mốc: có mục trong trạng thái và trong IndexedDB (có dữ liệu âm thanh)', P().rec.length === 1 && P().rec[0].text === 'think');
    const rec0 = await PronUI.Archive.get(P().rec[0].id);
    ok('I3 bản ghi trong IndexedDB có blob có kích thước và loại', rec0 && rec0.blob && rec0.blob.size > 1000 && rec0.mime.length > 3, rec0 && rec0.blob && rec0.blob.size);
    ok('I4 trạng thái chỉ giữ siêu dữ liệu, không giữ âm thanh', JSON.stringify(P().rec).indexOf('blob') < 0 && JSON.stringify(H.Store.get()).length < 400000);
    click('[data-pr="skip"]'); await tick(30);
    await go('#pron/rec');
    ok('I5 trang Bản ghi của tôi liệt kê bản ghi, có nghe, xóa, và nói rõ chỉ nằm trên máy', $$('[data-play]').length === 1 && !!$('[data-del]') && view().includes('chỉ nằm trong trình duyệt này'));
    let shared = null;
    navigator.canShare = () => true; navigator.share = async (d) => { shared = d; };
    click('[data-sel]'); click('#rec-share'); await waitFor(() => shared);
    ok('I6 chia sẻ: gửi đúng file âm thanh và lời nhắn nhờ nhận xét (Web Share)', shared && shared.files.length === 1 && shared.files[0].size > 1000 && /think/.test(shared.files[0].name) && shared.text.includes('âm cuối'), shared && shared.text);
    shared = null;
    click('[data-sel]'); click('#rec-share'); await tick(60);
    ok('I7 chưa chọn bản nào thì nhắc chọn, không chia sẻ', shared === null && $('#toast').textContent.includes('chọn ít nhất'), $('#toast').textContent);
    click('[data-del]'); await waitFor(() => view().includes('Chưa có bản ghi nào'));
    const gone = await PronUI.Archive.get(rec0.id);
    ok('I8 xóa bản ghi: mất ở cả trạng thái và IndexedDB, trang cập nhật', P().rec.length === 0 && !gone && view().includes('Chưa có bản ghi nào'));

    /* ===== J: Phòng thử nghiệm ===== */
    Scorer.save({ provider: 'off' });
    await go('#pron/lab');
    ok('J1 trang giới thiệu: nói thẳng bộ chấm có thể sai nhiều, có nút bắt đầu', view().includes('có thể sai nhiều') && !!$('#lab-go'));
    click('#lab-go'); await tick(60);
    const LS = PronUI.getSeq();
    ok('J2 16 lượt: 8 nhóm âm, mỗi nhóm một lần đọc đúng và một lần cố ý đọc sai', LS && LS.tasks.length === 16 && LS.tasks.filter((t) => t.correct).length === 8 && LS.tasks.every((t) => t.type === 'lab'), LS && LS.tasks.length);
    let n = 0, wordingOk = true;
    while (PronUI.getSeq() && PronUI.getSeq().i < 16 && n++ < 40) {
      const S = PronUI.getSeq(), t = S.tasks[S.i], txt = view();
      if (t.correct ? !txt.includes('cho đúng nhất') : !(txt.includes('cố ý đọc nhầm') && txt.includes('“' + t.text + '”') && txt.includes(t.say))) wordingOk = false;
      await record(SIG.word, t.say, [[{ t: t.say, c: 0.9 }]]);
      click('[data-pr="next"]'); await tick(30);
    }
    ok('J2b lời hướng dẫn mỗi lượt đúng: đọc cho đúng nhất, hoặc cố ý đọc nhầm (nói rõ từ định nói và từ phải đọc)', wordingOk);
    ok('J3 xong 16 lượt hiện báo cáo', view().includes('Kết quả thử nghiệm') && view().includes('Nhận dạng giọng nói của trình duyệt'), view().slice(0, 100));
    ok('J4 báo cáo có phát hiện lỗi thật 100% (8/8) và báo nhầm 0% (0/8) với máy nghe chính xác', view().includes('100%') && view().includes('(8/8)') && view().includes('0%') && view().includes('(0/8)'), view().slice(80, 360));
    ok('J5 báo cáo nói rõ con số còn thô và ngưỡng do tôi đặt', view().includes('rất thô') && view().includes('không phải chuẩn khoa học'));
    ok('J6 chưa bật bộ chấm âm vị thì gợi ý bật để so sánh', view().includes('Chưa bật bộ chấm âm vị nào'));
    /* lần chạy thứ hai với mô hình trên máy (giả: nghe đúng IPA của từ được nói) */
    const ipaOf = (t) => { const g = Data.pairs.find((x) => x.id === t.target), p = g.pairs.find((q) => q[0] === t.say || q[2] === t.say); return p[0] === t.say ? p[1] : p[3]; };
    Scorer.save({ provider: 'local', lib: fakeLib, model: 'fake/model' });
    await go('#pron/lab');
    click('#lab-go'); await tick(60);
    n = 0;
    while (PronUI.getSeq() && PronUI.getSeq().i < 16 && n++ < 40) {
      const S = PronUI.getSeq(), t = S.tasks[S.i];
      window.__fakeHeard = ipaOf(t);
      await record(SIG.word, t.say, [[{ t: t.say, c: 0.9 }]]);
      click('[data-pr="next"]'); await tick(30);
    }
    ok('J7 báo cáo thứ hai có thêm cột cho mô hình trên máy', view().includes('Mô hình trên máy') && view().includes('báo nhầm'), view().slice(0, 120));
    const rows = PronUI.getSeq().rows;
    ok('J8 mô hình giả nghe đúng: 0 lần báo nhầm khi đọc đúng; phần lớn lỗi cố ý được phát hiện', rows.length === 16 && rows.filter((r) => r.correct && r.sc).length === 0 && rows.filter((r) => !r.correct && r.sc).length >= 6, JSON.stringify(rows.map((r) => [r.target, r.correct, r.sc])));
    Scorer.save({ provider: 'off' });

    /* ===== K: dọn dẹp khi rời trang giữa lúc đang thu ===== */
    await go('#pron');
    run('rời', [THINK]);
    const stops0 = calls.stop, evK = evOf('th-s').length, speakK = H.Store.get().speak.n;
    click('[data-pr="rec"]'); await waitFor(() => $('#pr-meter'));
    await go('#learn');
    ok('K1 rời trang khi đang thu: dừng micro, bỏ chuỗi bài, không lỗi', calls.stop === stops0 + 1 && PronUI.getSeq() === null);
    ok('K2 rời trang khi chưa có kết quả nào: không để lại bằng chứng', evOf('th-s').length === evK && H.Store.get().speak.n === speakK);
    /* đã có một lần đọc có kết quả rồi thoát bằng nút ✕: vẫn giữ kết quả ("Các câu đã làm vẫn được ghi nhận") */
    await go('#pron');
    run('thoát', [THINK, THINK]);
    await record(SIG.word, 'think');
    const evX = evOf('th-s').length;
    click('#pr-exit'); await tick(80);
    ok('K3 thoát bằng ✕ sau một lần đọc có kết quả: bằng chứng được giữ đúng một lần', evOf('th-s').length === evX + 1 && lastEv('th-s')[1] === 'prod' && location.hash === '#pron', evOf('th-s').length - evX);

    /* ===== L: sao lưu và dữ liệu hỏng ===== */
    const backup = H.Store.exportJSON();
    const j0 = JSON.parse(backup);
    ok('L1 file sao lưu có tiến độ phát âm và bản ghi mốc (chỉ siêu dữ liệu), không có khóa chấm điểm', !!j0.pron && Object.keys(j0.pron.t).length > 5 && backup.indexOf(KEY) < 0 && backup.indexOf('southeastasia') < 0);
    H.Store.importJSON(JSON.stringify({ cards: {}, pron: {
      t: { 'th-s': { ev: [[1, 'perc', 1, 100], [2, 'perc', 0, 9999], 'rác', [3]], last: 5 }, 'hỏng': { ev: 'hỏng' }, 'zzz': 5 },
      rec: 'x', plan: 3, diag: 'x'
    } }));
    const q = P();
    ok('L2 nhập sao lưu hỏng: bỏ mục sai hình dạng, kẹp trọng số, giữ mục đúng', Object.keys(q.t).join() === 'th-s' && q.t['th-s'].ev.length === 2 && q.t['th-s'].ev[1][3] === 400 && Array.isArray(q.rec) && q.rec.length === 0 && q.plan === null && q.diag === null, JSON.stringify(q));
    let err = null;
    try { await go('#pron'); } catch (e) { err = e; }
    ok('L3 trang chính vẫn vẽ được với dữ liệu đã làm sạch', !err && !!$('[data-act="diag"]') && $$('.mrow').length === PRON.cats.length, err && err.message);
    H.Store.importJSON(JSON.stringify({ cards: {}, pron: { diag: { ts: 5, n: 'x', hist: [{ ts: 1, s: { cons: 5, vowel: 'x', final: null, ok: 0.4 } }, 'rác', { s: 3 }] } } }));
    const dh = P().diag;
    ok('L3b ảnh chụp hồ sơ hỏng được làm sạch: bỏ mục sai hình dạng, kẹp về 0..1, bỏ giá trị không phải số', dh && dh.hist.length === 1 && dh.hist[0].s.cons === 1 && dh.hist[0].s.ok === 0.4 && !('vowel' in dh.hist[0].s) && !('final' in dh.hist[0].s), JSON.stringify(dh));
    H.Store.importJSON(backup);
    ok('L4 nhập lại bản sao lưu cũ: tiến độ phát âm khôi phục nguyên vẹn', JSON.stringify(P().t) === JSON.stringify(j0.pron.t));
    H.Store.settings.onboarded = true;
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
