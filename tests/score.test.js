/* Chạy: node --test
 * Kiểm tra js/pron-score.js: phân tích kết quả Azure, so âm vị của mô hình trên máy, cấu hình, và việc gọi Azure bằng fetch giả.
 * Không gọi dịch vụ thật và không tải mô hình: xem ghi chú đầu tệp js/pron-score.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Scorer = require('../js/pron-score.js');
const Dsp = require('../js/audio.js');

const ROOT = path.join(__dirname, '..');
const sb = { window: {} };
vm.createContext(sb);
['js/data/pron.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f }));
const CONF = Array.from(sb.window.PRON.confusions);
const A = (x) => Array.from(x);

/** Phản hồi mẫu theo tài liệu "Speech to text REST API for short audio" (điểm để phẳng ở mức NBest và Words). */
const SAMPLE_FLAT = {
  RecognitionStatus: 'Success', Offset: 700000, Duration: 8400000, DisplayText: 'Think.',
  NBest: [{
    Confidence: 0.98, Lexical: 'think', Display: 'Think.', AccuracyScore: 62, FluencyScore: 100, CompletenessScore: 100, PronScore: 70, ProsodyScore: 88,
    Words: [{ Word: 'think', AccuracyScore: 62, ErrorType: 'Mispronunciation', Phonemes: [
      { Phoneme: 'th', AccuracyScore: 31 }, { Phoneme: 'ih', AccuracyScore: 90 }, { Phoneme: 'ng', AccuracyScore: 75 }, { Phoneme: 'k', AccuracyScore: 100 }
    ] }]
  }]
};
const SAMPLE_NESTED = {
  RecognitionStatus: 'Success',
  NBest: [{
    Display: 'Cats.', PronunciationAssessment: { AccuracyScore: 70, FluencyScore: 100, CompletenessScore: 100, PronScore: 80 },
    Words: [{ Word: 'cats', PronunciationAssessment: { AccuracyScore: 70, ErrorType: 'Mispronunciation' }, Phonemes: [
      { Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 100 } }, { Phoneme: 'ae', PronunciationAssessment: { AccuracyScore: 95 } },
      { Phoneme: 't', PronunciationAssessment: { AccuracyScore: 90 } }, { Phoneme: 's', PronunciationAssessment: { AccuracyScore: 12 } }
    ] }]
  }]
};

test('azureHeader: JSON mã hóa base64, chỉ chấm ngữ điệu khi được yêu cầu', () => {
  const j = JSON.parse(Buffer.from(Scorer.azureHeader('Good morning.', { prosody: true }), 'base64').toString('utf8'));
  assert.deepEqual(j, { ReferenceText: 'Good morning.', GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: 'True', EnableProsodyAssessment: 'True' });
  assert.equal(JSON.parse(Buffer.from(Scorer.azureHeader('think'), 'base64').toString('utf8')).EnableProsodyAssessment, undefined);
});

test('azureUrl: điểm cuối theo vùng, hoặc theo tên tài nguyên nếu có khai báo', () => {
  assert.equal(Scorer.azureUrl({ region: 'southeastasia' }), 'https://southeastasia.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed');
  assert.equal(Scorer.azureUrl({ endpoint: 'https://myres.cognitiveservices.azure.com/' }), 'https://myres.cognitiveservices.azure.com/stt/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed');
});

test('parseAzure: đọc được điểm để phẳng lẫn điểm lồng nhau, đổi âm vị sang dạng chuẩn hóa', () => {
  [SAMPLE_FLAT, SAMPLE_NESTED].forEach((s) => {
    const a = Scorer.parseAzure(s);
    assert.ok(a.ok);
    assert.equal(a.words.length, 1);
    assert.ok(a.words[0].ph.every((p) => typeof p.acc === 'number' && p.p));
  });
  const f = Scorer.parseAzure(SAMPLE_FLAT);
  assert.deepEqual(A(f.words[0].ph.map((p) => p.p)), ['th', 'ih', 'ng', 'k']);
  assert.equal(f.scores.pron, 70); assert.equal(f.scores.pros, 88);
  assert.equal(Scorer.parseAzure(SAMPLE_NESTED).scores.pron, 80);
  assert.deepEqual({ ...Scorer.parseAzure({ RecognitionStatus: 'NoMatch' }) }, { ok: false, status: 'NoMatch' });
  assert.equal(Scorer.parseAzure(null).ok, false);
});

test('fromAzure: âm dưới 60 là vấn đề kèm nhóm luyện, 60 đến 79 chỉ cần chú ý, âm cuối xét trước', () => {
  const r = Scorer.fromAzure(Scorer.parseAzure(SAMPLE_FLAT), CONF);
  assert.deepEqual(A(r.words[0].ph.map((p) => p.state)), ['bad', 'ok', 'weak', 'ok']);
  assert.deepEqual(A(r.issues).map((i) => [i.word, i.exp, i.score, i.target, i.guide]), [['think', 'th', 31, 'th-s', 'th']]);
  const c = Scorer.fromAzure(Scorer.parseAzure(SAMPLE_NESTED), CONF);
  assert.deepEqual(A(c.issues).map((i) => [i.exp, i.target]), [['s', 'fin-s']], '/s/ cuối từ bị điểm thấp là lỗi âm cuối');
  assert.equal(r.provider, 'azure'); assert.equal(r.acc, 62);
});

test('compareIpa: so âm vị mô hình nghe được với IPA mong đợi, chỉ ra âm thay thế', () => {
  const r = Scorer.compareIpa([{ w: 'think', ipa: 'ˈθɪŋk' }], 'sɪŋk', CONF);
  assert.deepEqual(A(r.words[0].ph).map((p) => p.state), ['sub', 'ok', 'ok', 'ok']);
  assert.deepEqual(A(r.issues).map((i) => [i.word, i.kind, i.exp, i.heard, i.target]), [['think', 'sub', 'th', 's', 'th-s']]);
  assert.equal(r.acc, 75);
  const perfect = Scorer.compareIpa([{ w: 'think', ipa: 'ˈθɪŋk' }], 'θɪŋk', CONF);
  assert.equal(perfect.acc, 100); assert.deepEqual(A(perfect.issues), []);
});

test('compareIpa: âm cuối bị rụng và cụm phụ âm bị chèn "ơ", gán đúng từ trong câu nhiều từ', () => {
  const r = Scorer.compareIpa([{ w: 'I', ipa: 'aɪ' }, { w: 'want', ipa: 'ˈwɑnt' }, { w: 'street', ipa: 'ˈstrit' }], 'aɪ wɑn sətrit', CONF);
  const by = {}; A(r.issues).forEach((i) => { (by[i.word] = by[i.word] || []).push(i.kind + ':' + (i.exp || i.heard) + ':' + i.target); });
  assert.deepEqual(by.want, ['del:t:fin-cluster']);
  assert.deepEqual(by.street, ['ins:ah:init-s']);
  assert.equal(by.I, undefined);
  assert.ok(r.acc < 100 && r.acc > 60);
  const none = Scorer.compareIpa([{ w: 'sit', ipa: 'ˈsɪt' }], '', CONF);
  assert.equal(none.acc, 0);
  assert.ok(A(none.words[0].ph).every((p) => p.state === 'del'));
});

test('cấu hình: lưu riêng khỏi state, đọc lại đúng, hỏng thì về mặc định; chỉ "sẵn sàng" khi đủ thông tin', () => {
  const store = {};
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  try {
    assert.equal(Scorer.load().provider, 'off');
    assert.ok(Scorer.save({ provider: 'azure', key: 'abc', region: 'eastus' }));
    assert.deepEqual({ ...Scorer.load() }, { ...Scorer.DEFAULT, provider: 'azure', key: 'abc', region: 'eastus' });
    assert.ok(Object.keys(store).every((k) => k === 'hiuhf0.scorer'));
    store['hiuhf0.scorer'] = '{hỏng';
    assert.equal(Scorer.load().provider, 'off');
  } finally { delete global.localStorage; }
  assert.equal(Scorer.ready({ provider: 'off' }), false);
  assert.equal(Scorer.ready({ provider: 'azure', key: '', region: 'eastus' }), false);
  assert.equal(Scorer.ready({ provider: 'azure', key: 'k', region: 'eastus' }), true);
  assert.equal(Scorer.ready({ provider: 'local' }), true);
});

test('azureAssess: gửi đúng địa chỉ, header, âm thanh WAV 16 kHz và đọc kết quả; báo lỗi dễ hiểu', async () => {
  const x = new Float32Array(16000).map((_, i) => 0.3 * Math.sin(i / 10));
  const seen = [];
  global.fetch = async (url, init) => { seen.push({ url, init }); return { ok: true, status: 200, json: async () => SAMPLE_FLAT }; };
  try {
    const ref = { text: 'think', words: [{ w: 'think', ipa: 'ˈθɪŋk' }] };
    const r = await Scorer.azureAssess(x, 16000, ref, { provider: 'azure', key: 'KEY', region: 'eastus' }, CONF);
    assert.equal(r.provider, 'azure'); assert.equal(r.issues[0].target, 'th-s');
    const { url, init } = seen[0];
    assert.ok(url.startsWith('https://eastus.stt.speech.microsoft.com/'));
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Ocp-Apim-Subscription-Key'], 'KEY');
    assert.equal(init.headers['Content-Type'], 'audio/wav; codecs=audio/pcm; samplerate=16000');
    assert.equal(JSON.parse(Buffer.from(init.headers['Pronunciation-Assessment'], 'base64').toString()).ReferenceText, 'think');
    assert.equal(init.body.length, 44 + 16000 * 2);
    assert.equal(String.fromCharCode(...init.body.slice(0, 4)), 'RIFF');

    global.fetch = async () => ({ ok: false, status: 401 });
    assert.match((await Scorer.azureAssess(x, 16000, ref, { key: 'bad', region: 'eastus' }, CONF)).error, /Khóa hoặc vùng/);
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    assert.match((await Scorer.azureAssess(x, 16000, ref, { key: 'k', region: 'eastus' }, CONF)).error, /Không kết nối/);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ RecognitionStatus: 'NoMatch' }) });
    assert.match((await Scorer.azureAssess(x, 16000, ref, { key: 'k', region: 'eastus' }, CONF)).error, /không nhận ra/);
    const long = new Float32Array(16000 * 31);
    assert.match((await Scorer.azureAssess(long, 16000, ref, { key: 'k', region: 'eastus' }, CONF)).error, /30 giây/);
  } finally { delete global.fetch; }
});

test('azureTest: gửi một giây im lặng không kèm chấm điểm; báo đúng khi khóa sai hoặc mất mạng', async () => {
  const seen = [];
  global.fetch = async (url, init) => { seen.push({ url, init }); return { ok: true, status: 200 }; };
  try {
    assert.ok((await Scorer.azureTest({ key: 'k', region: 'eastus' })).ok);
    assert.equal(seen[0].init.headers['Pronunciation-Assessment'], undefined);
    assert.equal(seen[0].init.body.length, 44 + 16000 * 2);
    global.fetch = async () => ({ ok: false, status: 403 });
    assert.match((await Scorer.azureTest({ key: 'k', region: 'eastus' })).msg, /Khóa hoặc vùng/);
    global.fetch = async () => { throw new TypeError('x'); };
    assert.equal((await Scorer.azureTest({ key: 'k', region: 'eastus' })).ok, false);
  } finally { delete global.fetch; }
});

test('assess: chưa bật nguồn nào thì trả lỗi, không gọi mạng', async () => {
  let called = false;
  global.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  try {
    const r = await Scorer.assess(new Float32Array(100), 16000, { text: 'a', words: [] }, { provider: 'off' }, CONF);
    assert.ok(r.error); assert.equal(called, false);
  } finally { delete global.fetch; }
  assert.ok(typeof Dsp.wav16k === 'function');
});
