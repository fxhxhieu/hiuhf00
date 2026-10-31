/* Chạy: node --test
 * Kiểm tra phần chọn giọng theo vùng của js/tts.js (luyện nghe với nhiều giọng) bằng một trình duyệt giả. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'tts.js'), 'utf8').replace(/^const TTS/m, 'this.TTS');

/** Nạp tts.js trong một vùng giả có speechSynthesis. Trả về TTS và danh sách câu đã được "nói". */
function load(voiceList, settings = {}) {
  const spoken = [];
  const synth = { getVoices: () => voiceList, cancel() {}, speak(u) { spoken.push(u); }, onvoiceschanged: null };
  class Utterance { constructor(text) { this.text = text; } }
  const sandbox = {
    window: { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance },
    speechSynthesis: synth, SpeechSynthesisUtterance: Utterance,
    Store: { settings: Object.assign({ voice: '', rate: 0.9, listenMix: false }, settings) }
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { TTS: sandbox.TTS, spoken };
}
const V = (name, lang) => ({ name, lang });
const VOICES = [V('Microsoft David', 'en-US'), V('Microsoft Zira', 'en-US'), V('Microsoft Mark', 'en-GB'), V('Google UK English Female', 'en-GB'),
  V('Microsoft Natasha Online (Natural)', 'en-AU'), V('Microsoft Heera', 'en-IN'), V('Thai', 'th-TH')];

test('mỗi vùng giữ một giọng, ưu tiên giọng tự nhiên, xếp theo mã vùng và bỏ giọng không phải tiếng Anh', () => {
  const { TTS } = load(VOICES);
  // Mảng sinh ra trong vùng vm là mảng của "realm" khác, nên đổi sang mảng thường trước khi so sánh
  assert.deepEqual(Array.from(TTS.accentPool(), (v) => v.name), ['Microsoft Natasha Online (Natural)', 'Google UK English Female', 'Microsoft Heera', 'Microsoft David']);
  assert.deepEqual(Array.from(TTS.accentNames()), ['Úc', 'Anh', 'Ấn Độ', 'Mỹ']);
});

test('mã băm ổn định theo nội dung câu', () => {
  const { TTS } = load(VOICES);
  assert.equal(TTS.hash('She sells sea shells.'), TTS.hash('She sells sea shells.'));
  assert.notEqual(TTS.hash('apple'), TTS.hash('banana'));
});

test('tắt nhiều giọng, hoặc không đòi mix: dùng giọng mặc định như trước', () => {
  let t = load(VOICES, { listenMix: false });
  t.TTS.speak('hello', { mix: true });
  assert.equal(t.spoken[0].voice.name, 'Microsoft David');
  t = load(VOICES, { listenMix: true });
  t.TTS.speak('hello');
  assert.equal(t.spoken[0].voice.name, 'Microsoft David', 'chỉ đổi giọng khi bài nghe đòi mix');
  t.TTS.speak('hello', { mix: true, voice: VOICES[2] });
  assert.equal(t.spoken[1].voice.name, 'Microsoft Mark', 'voice chỉ định rõ luôn được ưu tiên');
});

test('bật nhiều giọng: cùng một câu luôn cùng giọng, nhiều câu thì ra nhiều giọng khác nhau', () => {
  const { TTS, spoken } = load(VOICES, { listenMix: true });
  const pool = new Set(TTS.accentPool().map((v) => v.name));
  const sentences = Array.from({ length: 40 }, (_, i) => 'This is sentence number ' + i + '.');
  const first = sentences.map((s) => { TTS.speak(s, { mix: true }); return spoken[spoken.length - 1].voice.name; });
  const again = sentences.map((s) => { TTS.speak(s, { mix: true }); return spoken[spoken.length - 1].voice.name; });
  assert.deepEqual(again, first, 'nghe lại phải giữ giọng cũ');
  first.forEach((n) => assert.ok(pool.has(n), n));
  assert.ok(new Set(first).size >= 3, 'chỉ ra ' + new Set(first).size + ' giọng');
  assert.equal(spoken[spoken.length - 1].lang, spoken[spoken.length - 1].voice.lang);
});

test('máy chỉ có một vùng giọng hoặc không có giọng nào: vẫn đọc được, không lỗi', () => {
  let t = load([V('Microsoft David', 'en-US'), V('Microsoft Zira', 'en-US')], { listenMix: true });
  assert.equal(t.TTS.accentPool().length, 1);
  t.TTS.speak('hello', { mix: true });
  assert.equal(t.spoken[0].voice.lang, 'en-US');
  t = load([], { listenMix: true });
  assert.deepEqual(Array.from(t.TTS.accentPool()), []);
  t.TTS.speak('hello', { mix: true });
  assert.equal(t.spoken[0].voice, undefined);
  assert.equal(t.spoken[0].lang, 'en-US');
});

test("mix: 'always' đổi giọng kể cả khi tắt nhiều giọng trong Cài đặt; seed cho giọng khác ở lần nghe khác", () => {
  const { TTS, spoken } = load(VOICES, { listenMix: false });
  const pool = new Set(Array.from(TTS.accentPool(), (v) => v.name));
  const last = () => spoken[spoken.length - 1].voice.name;
  const words = ['think', 'sink', 'ship', 'sheep', 'light', 'right', 'bad', 'bat'];
  const first = words.map((w) => { TTS.speak(w, { mix: 'always', seed: 1 }); return last(); });
  first.forEach((n) => assert.ok(pool.has(n), n));
  assert.ok(new Set(first).size >= 2, 'nhiều từ phải ra nhiều giọng, chỉ ra ' + new Set(first).size);
  const again = words.map((w) => { TTS.speak(w, { mix: 'always', seed: 1 }); return last(); });
  assert.deepEqual(again, first, 'cùng từ, cùng seed thì cùng giọng');
  const bySeed = Array.from({ length: 12 }, (_, s) => { TTS.speak('think', { mix: 'always', seed: s }); return last(); });
  assert.ok(new Set(bySeed).size >= 2, 'seed khác nhau phải có thể ra giọng khác, chỉ ra ' + new Set(bySeed).size);
  TTS.speak('think');
  assert.equal(last(), 'Microsoft David', 'không đòi mix thì dùng giọng mặc định');
  TTS.speak('think', { mix: true });
  assert.equal(last(), 'Microsoft David', "mix: true vẫn phải bật trong Cài đặt, chỉ 'always' bỏ qua cài đặt");
  TTS.speak('think', { mix: 'always', seed: 3, voice: VOICES[2] });
  assert.equal(last(), 'Microsoft Mark', 'voice chỉ định rõ luôn được ưu tiên');
});
