/* Chạy: node --test
 * Kiểm tra phần logic thuần của luyện phát âm (js/pron.js) và dữ liệu đi kèm (js/data/pairs.js, js/data/pron.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Pron = require('../js/pron.js');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function loadData() {
  const sandbox = { window: {} };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  Array.from(indexHtml.matchAll(/<script src="(js\/data\/[^"]+)"/g), (m) => m[1])
    .forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8').replace(/^const Data/m, 'this.Data'), sandbox);
  return sandbox;
}
const sb = loadData();
const Data = sb.Data, PRON = sb.window.PRON, PAIRS = Array.from(sb.window.PAIRS);
const TGT = Pron.targets(PAIRS, Array.from(PRON.extra));
const CATS = Array.from(PRON.cats);
const A = (x) => Array.from(x); // mảng từ vùng vm khác cần đổi sang mảng thường trước khi so sánh
const DAY = 86400000;

/* ===== Âm vị ===== */

test('canon: tách IPA thành âm vị chuẩn hóa (nguyên âm đôi, phụ âm kép, r đi kèm nguyên âm)', () => {
  const c = (s) => Pron.canon(s).join(' ');
  assert.equal(c('ˈθɪŋk'), 'th ih ng k');
  assert.equal(c('ˈʃɪp'), 'sh ih p');
  assert.equal(c('ˈtʃɛr'), 'ch eh r');
  assert.equal(c('ˈstrit'), 's t r iy t');
  assert.equal(c('ˈwɝks'), 'w er k s');
  assert.equal(c('ˈbaɪt'), 'b ay t');
  assert.equal(c('ˈgoʊt'), 'g ow t');
  assert.equal(c('ˈdʒæm'), 'jh ae m');
  assert.equal(c('ˈwɔtər'), 'w ao t er', 'ər là ɚ');
  assert.equal(c('ɪn ʤɛnɝəl'), 'ih n jh eh n er ah l', 'nhiều từ, ký tự ʤ của mô hình');
  assert.equal(c(''), '');
});

test('mọi ký tự IPA trong kho từ và cặp âm đều được bộ tách âm vị nhận ra', () => {
  const bad = new Set();
  Data.words.forEach((w) => Pron.unmapped(w.ipa).forEach((ch) => bad.add(ch + ' trong ' + w.word)));
  PAIRS.forEach((g) => A(g.pairs).forEach((p) => { Pron.unmapped(p[1]).concat(Pron.unmapped(p[3])).forEach((ch) => bad.add(ch + ' trong ' + p[0])); }));
  assert.deepEqual([...bad].slice(0, 5), []);
});

test('toIpa và micAdvice: hiển thị âm vị và lời khuyên về bản thu', () => {
  assert.equal(Pron.toIpa('th'), 'θ'); assert.equal(Pron.toIpa('ow'), 'oʊ'); assert.equal(Pron.toIpa('k'), 'k');
  assert.equal(Pron.canon('ˈθɪŋk').map(Pron.toIpa).join(''), 'θɪŋk');
  assert.equal(Pron.micAdvice({ issues: [] }), '');
  assert.match(Pron.micAdvice({ issues: ['quiet', 'noisy'] }), /nhỏ.*ồn/);
  assert.equal(Pron.micAdvice(null), '');
});

test('fromSapi: âm vị kiểu Azure sang âm vị chuẩn hóa', () => {
  assert.equal(Pron.fromSapi('th'), 'th'); assert.equal(Pron.fromSapi('ax'), 'ah'); assert.equal(Pron.fromSapi('h'), 'hh');
  assert.equal(Pron.fromSapi('AX'), 'ah'); assert.equal(Pron.fromSapi('θ'), 'th'); assert.equal(Pron.fromSapi('iy'), 'iy');
});

test('align: nhận ra thay thế, thiếu và thừa âm', () => {
  const ops = (e, h) => A(Pron.align(e.split(' '), h.split(' ')));
  const sub = ops('th ih ng k', 's ih ng k').filter((o) => o.op !== 'match');
  assert.deepEqual(sub.map((o) => [o.op, o.e, o.h]), [['sub', 'th', 's']]);
  const del = ops('b ae t', 'b ae').filter((o) => o.op !== 'match');
  assert.deepEqual(del.map((o) => [o.op, o.e, o.ei]), [['del', 't', 2]]);
  const ins = ops('s t r iy t', 's ah t r iy t').filter((o) => o.op !== 'match');
  assert.deepEqual(ins.map((o) => [o.op, o.h, o.ei]), [['ins', 'ah', 1]]);
  assert.ok(ops('k ae t', 'k ae t').every((o) => o.op === 'match'));
});

test('issues: gắn mỗi lỗi với nhóm luyện và thẻ hướng dẫn', () => {
  const conf = A(PRON.confusions);
  const iss = (e, h) => A(Pron.issues(e.split(' '), Pron.align(e.split(' '), h.split(' ')), conf)).map((x) => [x.kind, x.exp || x.heard, x.target, x.guide]);
  assert.deepEqual(iss('th ih ng k', 's ih ng k'), [['sub', 'th', 'th-s', 'th']]);
  assert.deepEqual(iss('b ae t', 'b ae'), [['del', 't', 'fin-stop', 'fin']]);
  assert.deepEqual(iss('b ah s', 'b ah'), [['del', 's', 'fin-s', 'fin']]);
  assert.deepEqual(iss('w er k s', 'w er k'), [['del', 's', 'fin-cluster', 'cluster']]);
  assert.deepEqual(iss('s t r iy t', 's ah t r iy t'), [['ins', 'ah', 'init-s', 'cluster']]);
  assert.deepEqual(iss('f iy l', 'f iy'), [['del', 'l', 'fin-l', 'l']]);
  assert.deepEqual(iss('s ih t', 's ih t'), []);
});

test('targetsOfIpa: từ luyện những nhóm nào (cụ thể trước, tối đa 2)', () => {
  assert.deepEqual(A(Pron.targetsOfIpa('ˈθɪŋk')), ['th-s', 'n-ng']);
  assert.deepEqual(A(Pron.targetsOfIpa('ˈstrit')), ['init-s', 'fin-stop']);
  assert.deepEqual(A(Pron.targetsOfIpa('ˈbɛst')), ['fin-cluster', 'fin-stop']);
  assert.deepEqual(A(Pron.targetsOfIpa('')), []);
  Data.words.slice(0, 400).forEach((w) => Pron.targetsOfIpa(w.ipa).forEach((id) => assert.ok(TGT.some((t) => t.id === id), id + ' không phải mục tiêu')));
});

/* ===== Theo dõi và kế hoạch ===== */

test('estimate: chưa có dữ liệu thì thấp và chưa đo; luyện đúng nhiều thì cao; bằng chứng cũ nhạt dần', () => {
  const p = Pron.blank(), now = 1e12;
  let e = Pron.estimate(p, 'th-s', now);
  assert.equal(e.has, false); assert.equal(e.level, 'low'); assert.ok(Math.abs(e.p - 2 / 3) < 1e-9);
  for (let i = 0; i < 12; i++) Pron.record(p, 'th-s', 'perc', true, now - i * 1000);
  e = Pron.estimate(p, 'th-s', now);
  assert.ok(e.has && e.p > 0.88 && e.level === 'high', JSON.stringify(e));
  const old = Pron.blank();
  for (let i = 0; i < 12; i++) Pron.record(old, 'th-s', 'perc', true, now - 90 * DAY);
  assert.ok(Pron.estimate(old, 'th-s', now).n < 2, 'ba tháng trước chỉ còn khoảng một phần tám trọng số');
  for (let i = 0; i < 120; i++) Pron.record(p, 'l-r', 'perc', i % 2 === 0, now);
  assert.equal(p.t['l-r'].ev.length, Pron.EV_CAP, 'giữ tối đa ' + Pron.EV_CAP + ' lần gần nhất');
});

test('trọng số: nghe phân biệt nặng hơn nhận dạng giọng nói, nặng hơn tự đánh giá', () => {
  const now = 1e12, p = Pron.blank();
  Pron.record(p, 'a', 'perc', false, now); Pron.record(p, 'b', 'prod', false, now); Pron.record(p, 'c', 'self', false, now);
  assert.ok(Pron.estimate(p, 'a', now).p < Pron.estimate(p, 'b', now).p && Pron.estimate(p, 'b', now).p < Pron.estimate(p, 'c', now).p);
});

test('plan: nhóm yếu lên đầu, nhóm vững và mới luyện thì không có mặt; luôn có một mục nhịp/trọng âm nếu chưa vững', () => {
  const now = 1e12, p = Pron.blank();
  for (let i = 0; i < 12; i++) Pron.record(p, 'th-s', 'perc', false, now - 2 * DAY);        // rất yếu, đã lâu chưa luyện
  for (let i = 0; i < 10; i++) Pron.record(p, 'l-r', 'perc', true, now - 3600000);          // vững và vừa luyện
  for (let i = 0; i < 10; i++) Pron.record(p, 'fin-stop', 'perc', i < 5, now - 2 * DAY);    // trung bình
  const pl = A(Pron.plan(p, TGT, now, 3));
  assert.equal(pl.length, 3);
  assert.equal(pl[0].id, 'th-s');
  assert.ok(!pl.some((x) => x.id === 'l-r'), 'nhóm đã vững và mới luyện không cần đưa vào');
  assert.ok(pl.some((x) => x.cat === 'prosody'), 'phải có một mục trọng âm/nhịp/ngữ điệu: ' + pl.map((x) => x.id));
  const fresh = A(Pron.plan(Pron.blank(), TGT, now, 3));
  assert.equal(fresh.length, 3);
  assert.ok(fresh.every((x) => x.reason === 'chưa đo'));
});

test('dueDays và isDue: yếu thì luyện lại sau 1 ngày, vững chắc thì sau 14 ngày', () => {
  const now = 1e12;
  assert.equal(Pron.dueDays({ p: 0.5, level: 'high' }), 1);
  assert.equal(Pron.dueDays({ p: 0.8, level: 'mid' }), 5);
  assert.equal(Pron.dueDays({ p: 0.95, level: 'high' }), 14);
  assert.equal(Pron.isDue({ has: false }, now), true);
  assert.equal(Pron.isDue({ has: true, p: 0.95, level: 'high', last: now - 2 * DAY }, now), false);
});

test('profile: gộp theo nhóm lớn, nhóm chưa đo thì p = null, nêu nhóm yếu nhất', () => {
  const now = 1e12, p = Pron.blank();
  for (let i = 0; i < 8; i++) { Pron.record(p, 'th-s', 'perc', i < 2, now); Pron.record(p, 'l-r', 'perc', true, now); }
  const pr = A(Pron.profile(p, TGT, CATS, now));
  const cons = pr.find((x) => x.cat === 'cons'), vowel = pr.find((x) => x.cat === 'vowel');
  assert.equal(vowel.p, null); assert.equal(vowel.level, 'none');
  assert.ok(cons.p > 0.4 && cons.p < 0.9 && cons.measured === 2, JSON.stringify(cons));
  assert.equal(cons.weakest[0], 'th-s');
});

/* ===== Nhận dạng giọng nói ===== */

test('judgeWord: đúng ngay, đúng ở phương án khác, nghe thành từ khác, không nghe được', () => {
  const alt = (...t) => t.map((x, i) => ({ t: x, c: 0.9 - i * 0.2 }));
  assert.equal(Pron.judgeWord('Think', alt('think.')).v, 'match');
  const j = Pron.judgeWord('think', alt('sink', 'think'));
  assert.equal(j.v, 'alt'); assert.equal(j.rank, 1); assert.equal(j.heard, 'sink');
  assert.equal(Pron.judgeWord('think', alt('sink', 'thing')).v, 'other');
  assert.equal(Pron.judgeWord('think', []).v, 'none');
  assert.equal(Pron.judgeWord('think', [{ t: '  ', c: 1 }]).v, 'none');
  assert.ok(Pron.passes({ v: 'match' }) && Pron.passes({ v: 'alt', rank: 1 }));
  assert.ok(!Pron.passes({ v: 'alt', rank: 2 }) && !Pron.passes({ v: 'other' }));
});

test('judgeBest: sau nhiều lần thử lấy kết quả tốt nhất', () => {
  const r = [[{ t: 'sink', c: 0.9 }], [{ t: 'think', c: 0.6 }], [{ t: 'thing', c: 0.9 }]];
  assert.equal(Pron.judgeBest('think', r).v, 'match');
  assert.equal(Pron.judgeBest('think', [[{ t: 'sink', c: 0.9 }]]).v, 'other');
  assert.equal(Pron.judgeBest('think', []).v, 'none');
});

test('judgeContrast: nghe thành từ cần đọc, thành từ trong cặp, hay thành từ khác', () => {
  const a = (t) => [{ t, c: 0.8 }];
  assert.equal(Pron.judgeContrast('ship', 'sheep', a('ship')).v, 'target');
  assert.deepEqual({ ...Pron.judgeContrast('ship', 'sheep', a('sheep')) }, { v: 'other', heard: 'sheep' });
  assert.equal(Pron.judgeContrast('ship', 'sheep', a('chip')).v, 'neither');
});

/* ===== Nhịp câu ===== */

test('rhythm: từ nội dung được nhấn, từ chức năng đọc nhẹ kèm dạng yếu, từ chức năng cuối câu được nhấn', () => {
  const pos = (w) => { const x = Data.lookup(w); return x ? x.pos : null; };
  const weak = PRON.weak;
  const r = (s) => A(Pron.rhythm(s, pos, weak)).map((t) => (t.stressed ? t.w.toUpperCase() : t.w.toLowerCase()));
  assert.deepEqual(r('I want to go home.'), ['i', 'WANT', 'to', 'GO', 'HOME']);
  assert.deepEqual(r('Where do you live?'), ['WHERE', 'do', 'you', 'LIVE']);
  assert.deepEqual(r('Yes, I do.'), ['YES', 'i', 'DO'], 'trợ động từ cuối câu được nhấn');
  assert.deepEqual(r('She is looking for a job.'), ['she', 'is', 'LOOKING', 'for', 'a', 'JOB']);
  const to = A(Pron.rhythm('I want to go', pos, weak)).find((t) => t.w === 'to');
  assert.equal(to.weak, 'tə');
  assert.deepEqual(A(Pron.rhythm('', pos, weak)), []);
});

/* ===== Sơ đồ miệng ===== */

test('mouthSVG: mọi thẻ hướng dẫn có sơ đồ đều vẽ được, tọa độ nằm trong khung', () => {
  const withPic = A(PRON.guides).filter((g) => g.pic);
  assert.ok(withPic.length >= 18, 'chỉ có ' + withPic.length + ' sơ đồ');
  withPic.forEach((g) => {
    const svg = Pron.mouthSVG(g.pic);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && svg.indexOf('mp-tongue') > 0, g.id);
    assert.ok(!/NaN|undefined/.test(svg), g.id + ' có NaN/undefined');
    assert.ok(g.pic.tongue.length >= 5, g.id + ' ít điểm lưỡi');
    g.pic.tongue.forEach(([x, y]) => assert.ok(x >= 20 && x <= 180 && y >= 40 && y <= 150, g.id + ' điểm lưỡi ngoài khung ' + x + ',' + y));
  });
});

/* ===== Dữ liệu ===== */

test('nhóm cặp âm: mã duy nhất, nhóm lớn hợp lệ, mỗi cặp hai từ khác nhau có IPA khác nhau', () => {
  const ids = PAIRS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(PAIRS.length >= 22);
  const cats = new Set(CATS.map((c) => c.key));
  PAIRS.forEach((g) => {
    assert.ok(/^[a-z-]+$/.test(g.id), g.id);
    assert.ok(cats.has(g.cat), g.id + ' nhóm lớn lạ ' + g.cat);
    assert.ok(g.imp >= 0.5 && g.imp <= 2, g.id);
    assert.ok(g.sound && g.tip && g.pairs.length >= 3, g.id);
    A(g.pairs).forEach((p) => {
      assert.equal(p.length, 4, g.id);
      assert.ok(p.every((s) => typeof s === 'string' && s), g.id);
      assert.notEqual(p[0], p[2], g.id);
      assert.notEqual(Pron.canon(p[1]).join(' '), Pron.canon(p[3]).join(' '), g.id + ': ' + p[0] + ' và ' + p[2] + ' có cùng âm vị');
    });
  });
});

test('dữ liệu hướng dẫn: mã duy nhất, nhóm liên quan có thật, đủ phần, bài đo và nhầm lẫn trỏ đúng nhóm', () => {
  const gids = A(PRON.guides).map((g) => g.id);
  assert.equal(new Set(gids).size, gids.length);
  const tids = new Set(TGT.map((t) => t.id));
  assert.equal(tids.size, TGT.length, 'mục tiêu trùng mã');
  A(PRON.guides).forEach((g) => {
    assert.ok(g.name && g.how.length >= 2 && g.vs && g.check.length >= 1 && g.fix && g.words.length >= 2, g.id);
    A(g.targets).forEach((t) => assert.ok(tids.has(t), g.id + ' trỏ tới nhóm không có: ' + t));
  });
  A(PRON.extra).forEach((x) => assert.ok(gids.includes(x.guide), x.id + ' trỏ tới thẻ không có: ' + x.guide));
  A(PRON.confusions).forEach((c) => { assert.ok(tids.has(c.target), c.target); assert.ok(gids.includes(c.guide), c.guide); assert.ok(c.heard.length); });
  A(PRON.diag.groups).concat(A(PRON.diag.produce)).forEach((id) => assert.ok(PAIRS.some((g) => g.id === id), 'bài đo dùng nhóm không có: ' + id));
  Object.keys(PRON.weak).forEach((k) => assert.ok(typeof PRON.weak[k] === 'string' && PRON.weak[k]));
  // mỗi nhóm cặp âm đều có ít nhất một thẻ hướng dẫn để trỏ tới
  PAIRS.forEach((g) => assert.ok(A(PRON.guides).some((x) => A(x.targets).includes(g.id)), g.id + ' chưa có thẻ hướng dẫn nào'));
});

test('buildPerc: đủ số câu mỗi nhóm, cặp lấy đúng từ nhóm đó và không lặp trong một nhóm', () => {
  const cfg = PRON.diag;
  const items = A(Pron.buildPerc(PAIRS, { groups: A(cfg.groups), perGroup: cfg.perGroup }, () => 0.37));
  assert.equal(items.length, cfg.groups.length * cfg.perGroup);
  A(cfg.groups).forEach((id) => {
    const mine = items.filter((x) => x.target === id);
    assert.equal(mine.length, cfg.perGroup, id);
    assert.equal(new Set(mine.map((x) => x.p[0])).size, mine.length, id + ' lặp cặp');
    const g = PAIRS.find((x) => x.id === id);
    mine.forEach((x) => assert.ok(A(g.pairs).some((p) => p[0] === x.p[0] && p[2] === x.p[2]), id));
    mine.forEach((x) => assert.ok(x.side === 0 || x.side === 1));
  });
});
