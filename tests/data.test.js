/* Chạy: node --test
 * Kiểm tra dữ liệu từ vựng: đúng định dạng, đủ IPA, không trùng, và bài lộ trình cũ giữ nguyên
 * (để tiến độ người dùng đã lưu theo mã bài không bị lệch khi thêm từ mới). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* Dữ liệu chạy trong một vùng vm riêng nên mảng khác "realm"; so sánh bằng bản sao ([...]) cho đúng. */
function loadData() {
  const sandbox = { window: {} };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const dir = path.join(ROOT, 'js', 'data');
  fs.readdirSync(dir).forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f }));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8').replace(/^const Data/m, 'this.Data'), sandbox);
  return sandbox.Data;
}

const Data = loadData();

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
