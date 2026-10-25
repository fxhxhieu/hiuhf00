/* Chạy: node --test
 * Kiểm tra dữ liệu từ vựng: đúng định dạng, đủ IPA, không trùng, và bài lộ trình cũ giữ nguyên
 * (để tiến độ người dùng đã lưu theo mã bài không bị lệch khi thêm từ mới). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dataFiles = () => Array.from(indexHtml.matchAll(/<script src="(js\/data\/[^"]+)"/g), (m) => m[1]);

/* Dữ liệu chạy trong một vùng vm riêng nên mảng khác "realm"; so sánh bằng bản sao ([...]) cho đúng. */
function loadData() {
  const sandbox = { window: {} };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  // Nạp các tệp dữ liệu đúng thứ tự khai báo trong index.html (thứ tự có ý nghĩa: texts.js trước quiz.js trước texts-situations.js)
  dataFiles().forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8').replace(/^const Data/m, 'this.Data'), sandbox);
  SANDBOX.current = sandbox;
  return sandbox.Data;
}

const SANDBOX = { current: null };
const Data = loadData();
/* window của sandbox (để đọc JOURNAL_TOPICS ...) */
function window_() { return SANDBOX.current.window; }

test('dữ liệu không có cảnh báo định dạng, trùng từ hay chủ đề lạ', () => {
  assert.deepEqual([...Data.warnings], []);
});

test('mọi từ có IPA, nghĩa, định nghĩa và câu ví dụ', () => {
  const bad = Data.words.filter((w) => !w.ipa || !w.vi || !w.def || !w.ex);
  assert.deepEqual(Array.from(bad, (w) => w.id), []);
});

test('mã từ là duy nhất và mọi chủ đề đều hợp lệ', () => {
  const ids = new Set(Data.words.map((w) => w.id));
  assert.equal(ids.size, Data.words.length);
  Data.words.forEach((w) => {
    assert.ok(Data.topicMap[w.topic], 'chủ đề lạ: ' + w.topic + ' ở ' + w.id);
    w.tags.forEach((t) => assert.ok(Data.topicMap[t], 'nhãn lạ: ' + t + ' ở ' + w.id));
  });
});

test('mọi từ thuộc đúng một bài lộ trình', () => {
  const seen = new Map();
  Data.units.forEach((u) => u.ids.forEach((id) => { assert.ok(!seen.has(id), 'từ nằm ở hai bài: ' + id); seen.set(id, u.id); }));
  assert.equal(seen.size, Data.words.length);
});

test('mọi bài của bản đã phát hành còn nguyên mã, và từ cũ vẫn nằm đúng bài cũ', () => {
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'units-v1.json'), 'utf8'));
  Object.keys(old).forEach((id) => {
    const u = Data.unitById.get(id);
    assert.ok(u, 'mất bài ' + id);
    // Được phép thêm từ mới vào cuối bài, nhưng không được bỏ hay chuyển từ cũ sang bài khác
    const now = new Set(u.ids);
    old[id].forEach((w) => assert.ok(now.has(w), 'từ ' + w + ' không còn ở bài ' + id));
  });
});

test('các chủ đề tình huống chỉ gồm cụm từ viết thường, không dấu câu', () => {
  const sit = Data.words.filter((w) => w.topic.startsWith('sit-'));
  assert.ok(sit.length >= 70);
  sit.forEach((w) => {
    assert.equal(w.pos, 'phr');
    assert.match(w.word, /^[a-z ]+$/, 'cụm từ có ký tự lạ: ' + w.word);
  });
});

test('mỗi chủ đề mới có ít nhất 12 từ và có ví dụ chứa từ khóa', () => {
  ['animals', 'weather', 'numbers', 'calendar', 'sports', 'jobs', 'vehicles', 'routine'].forEach((k) => {
    assert.ok(Data.words.filter((w) => Data.inTopic(w, k)).length >= 12, k);
  });
});

test('hội thoại tình huống: có đủ 6 bài, câu hỏi nghe hiểu hợp lệ', () => {
  const sit = Array.from(Data.texts).filter((t) => t.id.indexOf('a2-sit-') === 0);
  assert.equal(sit.length, 6);
  sit.forEach((t) => {
    assert.ok(t.sentences.length >= 8, t.id);
    t.sentences.forEach((s) => { assert.equal(s.length, 2); assert.match(s[0], /^[A-Z][A-Za-z]*: /, 'thiếu tên người nói ở ' + t.id); });
    const q = Data.quiz[t.id];
    assert.ok(q && q.length === 3, 'thiếu câu hỏi cho ' + t.id);
    q.forEach((it) => { assert.ok(it.a >= 0 && it.a < it.o.length, 'đáp án sai ở ' + t.id); assert.ok(it.v && it.q); });
  });
});

test('mọi bài đọc có câu hỏi hợp lệ và id không trùng', () => {
  const ids = Array.from(Data.texts, (t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  Object.keys(Data.quiz).forEach((id) => assert.ok(ids.indexOf(id) >= 0, 'câu hỏi cho bài không tồn tại: ' + id));
});

test('thông tin mở rộng của từ: đủ ví dụ, cụm kết hợp và ghi chú', () => {
  const withMore = Array.from(Data.words).filter((w) => w.more);
  assert.ok(withMore.length >= 80, 'chỉ có ' + withMore.length);
  withMore.forEach((w) => {
    assert.ok(w.more.ex.length >= 1, w.id);
    assert.ok(w.more.coll.length >= 3, w.id + ' thiếu cụm kết hợp');
    assert.ok(w.more.note.length > 10, w.id + ' thiếu ghi chú');
  });
});

test('động từ bất quy tắc: đủ dạng, không trùng, khớp kho từ khi có', () => {
  const list = Array.from(Data.irregular);
  assert.ok(list.length >= 80, 'chỉ có ' + list.length);
  assert.equal(new Set(list.map((v) => v.base)).size, list.length);
  const known = { go: ['went', 'gone'], eat: ['ate', 'eaten'], be: ['was/were', 'been'], put: ['put', 'put'], buy: ['bought', 'bought'] };
  Object.keys(known).forEach((b) => { const v = Data.irrMap[b]; assert.ok(v, b); assert.equal(v.v2, known[b][0]); assert.equal(v.v3, known[b][1]); });
});

test('chủ đề nhật ký đủ gợi ý, câu mở đầu và mẫu điền', () => {
  const topics = Array.from(window_().JOURNAL_TOPICS);
  assert.ok(topics.length >= 20);
  topics.forEach((t) => {
    assert.ok(t.prompts.length >= 2, t.key);
    assert.ok(t.prompts.every((p) => p.length === 2 && p[0] && p[1]), t.key);
    assert.ok(t.starters.length >= 3, t.key);
    assert.equal(t.template.length, 2, t.key);
    (t.vocab || []).forEach((k) => assert.ok(Data.topicMap[k], 'chủ đề từ vựng lạ ' + k + ' ở ' + t.key));
  });
  const ch = Array.from(window_().JOURNAL_CHALLENGE);
  assert.equal(ch.length, 7);
  ch.forEach((c, i) => { assert.equal(c.day, i + 1); assert.ok(topics.some((t) => t.key === c.topic), c.topic); });
});

test('mọi tệp dữ liệu và mã nguồn nằm trong index.html và trong danh sách offline của sw.js', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const cached = new Set(Array.from(sw.matchAll(/'([^']+\.(?:js|css|woff2|png|html))'/g), (m) => m[1]));
  const onDisk = fs.readdirSync(path.join(ROOT, 'js', 'data')).map((f) => 'js/data/' + f).concat(fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f));
  onDisk.forEach((f) => {
    assert.ok(indexHtml.indexOf('src="' + f + '"') >= 0, f + ' chưa được nạp trong index.html');
    assert.ok(cached.has(f), f + ' chưa có trong danh sách offline của sw.js');
  });
  fs.readdirSync(path.join(ROOT, 'fonts')).filter((f) => f.endsWith('.woff2')).forEach((f) => assert.ok(cached.has('fonts/' + f), f));
});

test('phiên bản service worker khớp thẻ app-version trong index.html', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const v = /const CACHE = 'hiuhf0-(v\d+)'/.exec(sw)[1];
  assert.ok(indexHtml.indexOf('<meta name="app-version" content="' + v + '">') >= 0, 'app-version không khớp ' + v);
});

test('mọi tệp trong danh sách offline của sw.js đều tồn tại (thiếu một tệp là cài service worker thất bại)', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const block = /const FILES = \[([\s\S]*?)\];/.exec(sw)[1];
  const files = Array.from(block.matchAll(/'([^']+)'/g), (m) => m[1]).filter((f) => f !== './');
  assert.ok(files.length > 40);
  files.forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, f)), 'sw.js liệt kê tệp không tồn tại: ' + f));
});
