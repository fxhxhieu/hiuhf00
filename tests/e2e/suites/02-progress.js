/* Bộ kiểm thử trình duyệt: Trang Tiến độ: dự báo lịch ôn, tỉ lệ nhớ đúng, thanh cấp.
 * Chạy bằng tests/e2e/run.js: trang được nạp kèm tệp này, kết quả ghi vào #out và document.title = "DONE". */
(async () => {
  const out = { checks: [], errors: [] };
  const pre = document.createElement('pre'); pre.id = 'out'; document.body.appendChild(pre);
  window.addEventListener('error', (e) => out.errors.push('onerror: ' + e.message));
  const _ce = console.error; console.error = (...a) => { out.errors.push('console.error: ' + a.join(' ')); _ce(...a); };
  const ok = (name, cond, extra) => out.checks.push([cond ? 'PASS' : 'FAIL', name, extra === undefined ? '' : String(extra)]);
  const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const H = window.hiuhf0;
  const DAY = 86400000;
  try {
    H.Store.settings.onboarded = true;
    const day0 = H.SRS.startOfDay(Date.now());
    const mk = (i, dueMs, state) => H.Store.setCard(H.Data.words[i].id, { state: state || 'review', step: 0, interval: 5, ease: 2.5, reps: 3, lapses: 0, due: dueMs, last: day0 - DAY, ok: 1 });
    mk(0, day0 - 3 * DAY);          // quá hạn → hôm nay
    mk(1, day0 + 3600000);          // hôm nay
    mk(2, day0 + DAY + 1000);       // ngày mai
    mk(3, day0 + DAY + 5000);       // ngày mai
    mk(4, day0 + 3 * DAY);          // 2–7 ngày
    mk(5, day0 + 7 * DAY + 1000);   // 2–7 ngày (ngày thứ 7)
    mk(6, day0 + 9 * DAY);          // ngoài dự báo
    location.hash = '#progress'; await tick(80);
    const nums = [...document.querySelectorAll('#forecast .stat b')].map((b) => b.textContent);
    ok('dự báo: 2 hôm nay, 2 ngày mai, 2 trong 2–7 ngày', nums[0] === '2' && nums[1] === '2' && nums[2] === '2', nums.join(','));
    ok('chưa đủ 10 lượt ôn: tỉ lệ nhớ hiện "–" kèm gợi ý', nums[3] === '–' && $('#forecast').textContent.includes('ít nhất 10 lượt'));

    // Ghi 12 lượt ôn, 9 đúng → 75%
    for (let i = 0; i < 12; i++) H.Store.logReview(false, i < 9);
    location.hash = '#library'; await tick(60); location.hash = '#progress'; await tick(80);
    const nums2 = [...document.querySelectorAll('#forecast .stat b')].map((b) => b.textContent);
    ok('tỉ lệ nhớ đúng 9/12 = 75%', nums2[3] === '75%', nums2.join(','));
    const r = H.Store.retention(14);
    ok('retention() trả số liệu', r.reviews === 12 && r.correct === 9 && r.pct === 75, JSON.stringify(r));
    // Lượt học từ mới không làm lệch tỉ lệ
    for (let i = 0; i < 5; i++) H.Store.logReview(true, true);
    ok('học từ mới không tính vào tỉ lệ ôn', H.Store.retention(14).pct === 75);
    // Ngày cũ chưa có trường rok bị bỏ qua
    const old = new Date(); old.setDate(old.getDate() - 3);
    H.Store.get().log[H.Store.dayKey(old.getTime())] = { n: 5, r: 20, ok: 3 };
    ok('ngày cũ không có rok bị bỏ qua', H.Store.retention(14).reviews === 12);

    // Thanh cấp: cấp 3 có 7 từ trên tổng 7 từ đã học → thanh đầy, không phải 7/2171
    const rows = [...document.querySelectorAll('.mrow')];
    const w3 = rows.map((x) => x.querySelector('.progress i').style.width);
    const lv3 = rows.findIndex((x) => x.textContent.includes('Cấp 3'));
    ok('thanh cấp tính trên số từ đã học (cấp 3 = 100%)', parseFloat(w3[lv3]) === 100, w3.join(' | '));
    ok('thanh cấp 0 vẫn tính trên toàn kho', parseFloat(w3[0]) > 99, w3[0]);
  } catch (err) {
    out.errors.push('EXC: ' + err.message + ' @ ' + (err.stack || '').split('\n').slice(0, 3).join(' | '));
  }
  pre.textContent = JSON.stringify(out, null, 1); document.title = 'DONE';
})();
