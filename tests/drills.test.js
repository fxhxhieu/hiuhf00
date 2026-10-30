/* Chạy: node --test
 * Kiểm tra các bài sinh từ dữ liệu (js/drills.js): trọng âm, đuôi -s / -ed, ghép cụm. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Drills = require('../js/drills.js');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* Nạp dữ liệu giống tests/data.test.js: các tệp dữ liệu chạy trong một vùng vm riêng */
function loadData() {
  const sandbox = { window: {} };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  Array.from(indexHtml.matchAll(/<script src="(js\/data\/[^"]+)"/g), (m) => m[1])
    .forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8').replace(/^const Data/m, 'this.Data'), sandbox);
  return sandbox.Data;
}
const Data = loadData();
const words = Array.from(Data.words);
const irregular = new Set(Array.from(Data.irregular, (v) => v.base));

/* Bộ sinh số giả ngẫu nhiên cố định để kết quả lặp lại được */
const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

/* ===== Trọng âm ===== */

test('analyze: số âm tiết và âm tiết mang dấu nhấn chính', () => {
  const at = (ipa) => Drills.analyze(ipa);
  assert.deepEqual(at('əˈbaʊt'), { n: 2, k: 1 });
  assert.deepEqual(at('ˌækəˈdɛmɪk'), { n: 4, k: 2 });
  assert.deepEqual(at('ˈfoʊˌtoʊ'), { n: 2, k: 0 });
  assert.deepEqual(at('piˈænə'), { n: 3, k: 1 });
  assert.deepEqual(at('ˈbæskətˌbɔl'), { n: 3, k: 0 });
  assert.deepEqual(at('ɪnˈθuziˌæzəm'), { n: 5, k: 1 });
  assert.deepEqual(at('riˈlaɪəbəl'), { n: 4, k: 1 });
  assert.deepEqual(at('ˈtɔɪ'), { n: 1, k: 0 }, 'nguyên âm đôi chỉ tính một âm tiết');
  assert.deepEqual(at(''), { n: 0, k: -1 });
  assert.deepEqual(at(null), { n: 0, k: -1 });
});

test('bài trọng âm: chỉ từ đơn từ 2 âm tiết, và bỏ chính tả có nhiều thẻ nhấn khác nhau', () => {
  const pool = Drills.stressPool(words);
  assert.ok(pool.length > 1000, 'chỉ có ' + pool.length);
  pool.forEach(({ w, a }) => {
    assert.ok(a.n >= 2 && a.k >= 0 && a.k < a.n, w.id + ' ' + JSON.stringify(a));
    assert.ok(!/[\s'’-]/.test(w.word) && w.pos !== 'phr', w.id);
  });
  const by = new Map();
  words.forEach((w) => { const k = w.word.toLowerCase(); if (!by.has(k)) by.set(k, []); by.get(k).push(w); });
  const inPool = new Set(pool.map((x) => x.w.word.toLowerCase()));
  by.forEach((list, key) => {
    const shapes = new Set(list.filter((w) => w.ipa).map((w) => { const a = Drills.analyze(w.ipa); return a.n + ':' + a.k; }));
    if (shapes.size > 1) assert.ok(!inPool.has(key), key + ' có nhiều kiểu nhấn nhưng vẫn vào bài');
  });
});

test('câu hỏi trọng âm: đáp án khớp IPA, phương án gọn và một nửa không nhấn ở âm đầu', () => {
  const qs = Drills.stressQuestions(words, 10, seeded(7));
  assert.equal(qs.length, 10);
  assert.equal(new Set(qs.map((q) => q.w.word)).size, 10, 'không lặp từ');
  qs.forEach((q) => {
    const a = Drills.analyze(q.w.ipa);
    assert.equal(q.n, a.n); assert.equal(q.k, a.k);
    assert.equal(q.opts[q.a], q.k, 'a phải trỏ tới vị trí nhấn đúng');
    assert.deepEqual(q.opts, q.opts.slice().sort((x, y) => x - y), 'phương án xếp theo thứ tự âm tiết');
    assert.equal(q.opts.length, Math.min(q.n, 4));
  });
  assert.ok(qs.filter((q) => q.k > 0).length >= 5, 'cần ít nhất 5/10 câu nhấn không ở âm đầu');
  assert.ok(qs.filter((q) => q.n >= 3).length >= 5, 'cần ưu tiên từ từ 3 âm tiết');
});

test('câu hỏi trọng âm: nguồn từ ít thì trả về ít câu hơn, không lỗi', () => {
  assert.deepEqual(Drills.stressQuestions([], 10), []);
  const few = words.filter((w) => w.id === 'about~prep' || w.word === 'photo').slice(0, 2);
  assert.ok(Drills.stressQuestions(few, 10).length <= 2);
});

/* ===== Đuôi -s và -ed ===== */

test('quy tắc đuôi -ed và -s theo âm cuối', () => {
  assert.equal(Drills.lastSound('/ˈwɝk/'), 'k');
  assert.equal(Drills.lastSound('wɑtʃ'), 'tʃ');
  assert.equal(Drills.lastSound('ˈmænɪdʒ'), 'dʒ');
  [['t', 'ɪd'], ['d', 'ɪd'], ['k', 't'], ['p', 't'], ['f', 't'], ['s', 't'], ['ʃ', 't'], ['tʃ', 't'], ['θ', 't'], ['n', 'd'], ['l', 'd'], ['v', 'd'], ['z', 'd'], ['ɝ', 'd'], ['ɪ', 'd'], ['dʒ', 'd'], ['ŋ', 'd']]
    .forEach(([ls, ed]) => assert.equal(Drills.edClass(ls), ed, '-ed sau /' + ls + '/'));
  [['s', 'ɪz'], ['z', 'ɪz'], ['ʃ', 'ɪz'], ['ʒ', 'ɪz'], ['tʃ', 'ɪz'], ['dʒ', 'ɪz'], ['p', 's'], ['t', 's'], ['k', 's'], ['f', 's'], ['θ', 's'], ['n', 'z'], ['l', 'z'], ['v', 'z'], ['d', 'z'], ['ɝ', 'z'], ['ɪ', 'z']]
    .forEach(([ls, s]) => assert.equal(Drills.sClass(ls), s, '-s sau /' + ls + '/'));
});

test('dạng quá khứ và ngôi thứ ba viết đúng chính tả', () => {
  const past = (v) => Drills.pastForm(v, Data.byId.get(v + '~v') ? Data.byId.get(v + '~v').ipa : '');
  [['like', 'liked'], ['play', 'played'], ['study', 'studied'], ['stop', 'stopped'], ['plan', 'planned'], ['visit', 'visited'], ['prefer', 'preferred'], ['open', 'opened'], ['fix', 'fixed'], ['watch', 'watched'], ['admit', 'admitted'], ['listen', 'listened'], ['enjoy', 'enjoyed'], ['agree', 'agreed']]
    .forEach(([v, p]) => assert.equal(past(v), p, v));
  assert.equal(Drills.pastForm('equip', 'ɪˈkwɪp'), 'equipped', 'qu tính như một phụ âm');
  [['work', 'works'], ['watch', 'watches'], ['study', 'studies'], ['play', 'plays'], ['go', 'goes'], ['fix', 'fixes'], ['wash', 'washes'], ['like', 'likes'], ['carry', 'carries']]
    .forEach(([v, s]) => assert.equal(Drills.thirdForm(v), s, v));
});

test('bài đuôi -s/-ed: động từ có quy tắc, không bất quy tắc, đáp án khớp âm cuối', () => {
  ['ed', 's'].forEach((kind) => {
    const pool = Drills.endingPool(words, kind, irregular);
    assert.ok(pool.length > 300, kind + ' chỉ có ' + pool.length);
    pool.forEach((x) => {
      assert.equal(x.w.pos, 'v');
      assert.notEqual(x.w.level, 'A0');
      assert.ok(!irregular.has(x.w.word.toLowerCase()), x.w.word + ' là động từ bất quy tắc');
      assert.ok(kind === 'ed' ? /ed$/.test(x.form) : /s$/.test(x.form), x.form);
      assert.equal(x.answer, kind === 'ed' ? Drills.edClass(x.ls) : Drills.sClass(x.ls));
    });
  });
  ['hang', 'bend', 'spread', 'beat', 'fit', 'lie', 'found', 'say'].forEach((v) => {
    assert.ok(!Drills.endingPool(words, 'ed', irregular).some((x) => x.w.word === v), v + ' không được vào bài');
  });
});

test('câu hỏi đuôi -s/-ed: cân bằng ba kiểu đọc và đáp án trỏ đúng', () => {
  ['ed', 's'].forEach((kind) => {
    const qs = Drills.endingQuestions(words, kind, 9, seeded(3), irregular);
    assert.equal(qs.length, 9);
    const count = {};
    qs.forEach((q) => {
      assert.equal(q.opts[q.a], q.answer);
      assert.equal(q.opts.length, 3);
      count[q.answer] = (count[q.answer] || 0) + 1;
      assert.ok(Drills.endingRule(q).length > 20 && Drills.endingRule(q).indexOf('/' + q.answer + '/') >= 0, 'lời giải thích phải nêu đáp án: ' + q.form);
    });
    assert.deepEqual(Object.values(count), [3, 3, 3], kind + ' ' + JSON.stringify(count));
  });
});

/* ===== Ghép cụm ===== */

test('ghép cụm: mọi cụm đều có trong extras, đáp án nhiễu không ghép ra cụm hợp lệ trong dữ liệu', () => {
  const total = Drills.COLLOCATION_SETS.reduce((n, s) => n + s.items.length, 0);
  assert.equal(Drills.collocationItems(words).length, total, 'có cụm không còn khớp với js/data/extras.js');
  const all = new Set();
  words.filter((w) => w.more).forEach((w) => Array.from(w.more.coll).forEach((c) => all.add(c.toLowerCase())));
  Drills.COLLOCATION_SETS.forEach((set) => {
    set.items.forEach(([verb, rest]) => {
      assert.ok(set.verbs.includes(verb), verb + ' phải nằm trong bộ động từ');
      set.verbs.filter((v) => v !== verb).forEach((other) => {
        assert.ok(!all.has((other + ' ' + rest).toLowerCase()), '“' + other + ' ' + rest + '” cũng là cụm hợp lệ trong dữ liệu, câu hỏi sẽ có hai đáp án đúng');
      });
    });
  });
});

test('ghép cụm: phần còn lại của cụm không trùng nhau giữa các bộ (mỗi câu hỏi chỉ có một đáp án)', () => {
  const rests = Drills.COLLOCATION_SETS.flatMap((s) => s.items.map((it) => it[1].toLowerCase()));
  assert.equal(new Set(rests).size, rests.length);
});

test('câu hỏi ghép cụm: đáp án nằm trong phương án, không lặp câu', () => {
  const qs = Drills.collocationQuestions(words, 10, seeded(11));
  assert.equal(qs.length, 10);
  assert.equal(new Set(qs.map((q) => q.stem)).size, 10);
  qs.forEach((q) => {
    assert.equal(q.opts[q.a], q.answer);
    assert.ok(q.opts.length >= 2 && q.opts.length <= 4);
    assert.equal(q.stem, '___ ' + q.phrase.slice(q.answer.length + 1));
  });
  assert.deepEqual(Drills.collocationQuestions([], 10), [], 'không có dữ liệu thì không có câu hỏi');
});

test('shuffled không đổi mảng gốc', () => {
  const a = [1, 2, 3, 4, 5];
  const b = Drills.shuffled(a, seeded(1));
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
  assert.deepEqual(b.slice().sort(), a);
});
