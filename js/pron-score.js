/* hiuhf0 — pron-score.js
 * Chấm phát âm ở mức từng âm vị, tùy chọn và mặc định TẮT (Cài đặt ở trang #pron/score). Hai nguồn:
 *   azure  Azure AI Speech "Pronunciation Assessment" qua REST. Cần khóa của chính bạn; âm thanh được gửi tới Microsoft.
 *   local  mô hình nhận dạng âm vị (wav2vec2, Transformers.js) chạy ngay trong trình duyệt. Âm thanh không rời máy, nhưng phải tải
 *          thư viện từ jsDelivr và mô hình khoảng 355 MB từ Hugging Face một lần (trình duyệt lưu lại cho lần sau).
 * Cả hai trả về cùng một dạng kết quả để phần giao diện không cần biết nguồn nào:
 *   { provider, words: [{ w, ph: [{ p, state: 'ok' | 'weak' | 'bad' | 'del' | 'sub', heard?, score? }] }], issues: [...], acc, scores? }
 * Phần phân tích kết quả và so âm vị là hàm thuần (tests/score.test.js). Việc gọi dịch vụ thật và tải mô hình chưa được thử trong
 * quá trình phát triển: hãy dùng "Phòng thử nghiệm" ở #pron/lab để kiểm tra độ chính xác bằng bản thu của chính bạn trước khi tin.
 */
const Scorer = (() => {
  const P = typeof Pron !== 'undefined' ? Pron : require('./pron.js');
  const D = typeof Dsp !== 'undefined' ? Dsp : require('./audio.js');
  const KEY = 'hiuhf0.scorer'; // để riêng, không nằm trong state nên không lẫn vào file sao lưu (khóa API là bí mật)
  const DEFAULT = { provider: 'off', key: '', region: 'eastus', endpoint: '', lib: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2', model: 'robg/speako-phoneme-recognizer' };

  function load() {
    try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEFAULT); }
  }
  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, DEFAULT, c))); return true; } catch (e) { return false; }
  }
  const ready = (c) => (c.provider === 'azure' ? !!(c.key && (c.region || c.endpoint)) : c.provider === 'local');

  /* ----- Azure ----- */
  const b64 = (s) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64'));
  /** Giá trị của header Pronunciation-Assessment (JSON mã hóa base64). Chấm ngữ điệu chỉ có ý nghĩa với câu. */
  function azureHeader(ref, o = {}) {
    const j = { ReferenceText: ref, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: 'True' };
    if (o.prosody) j.EnableProsodyAssessment = 'True';
    return b64(JSON.stringify(j));
  }
  function azureUrl(cfg) {
    const q = '?language=en-US&format=detailed';
    if (cfg.endpoint) return cfg.endpoint.replace(/\/+$/, '') + '/stt/speech/recognition/conversation/cognitiveservices/v1' + q;
    return 'https://' + (cfg.region || 'eastus') + '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1' + q;
  }
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  /** Phân tích JSON Azure. Phiên bản mới có thể lồng điểm trong PronunciationAssessment, bản cũ để phẳng: đọc được cả hai. */
  function parseAzure(j) {
    if (!j || j.RecognitionStatus !== 'Success') return { ok: false, status: (j && j.RecognitionStatus) || 'Error' };
    const nb = (j.NBest && j.NBest[0]) || {};
    const sc = (o) => (o && o.PronunciationAssessment) || o || {};
    const top = sc(nb);
    const words = (nb.Words || []).map((w) => ({
      w: w.Word, acc: num(sc(w).AccuracyScore), err: sc(w).ErrorType || 'None',
      ph: (w.Phonemes || []).map((p) => ({ raw: p.Phoneme, p: P.fromSapi(p.Phoneme), acc: num(sc(p).AccuracyScore) }))
    }));
    return { ok: true, text: nb.Display || nb.Lexical || '', scores: { acc: num(top.AccuracyScore), flu: num(top.FluencyScore), comp: num(top.CompletenessScore), pron: num(top.PronScore), pros: num(top.ProsodyScore) }, words };
  }
  const stateOf = (acc) => (acc == null ? 'ok' : acc >= 80 ? 'ok' : acc >= 60 ? 'weak' : 'bad');
  /** Kết quả Azure đã phân tích sang dạng chung. Âm điểm dưới 60 là vấn đề; 60 đến 79 là cần chú ý. */
  function fromAzure(a, confusions) {
    const issues = [];
    const words = a.words.map((w) => {
      const n = w.ph.length;
      const ph = w.ph.map((x, i) => {
        const state = stateOf(x.acc);
        if (state === 'bad') { const t = P.targetOfPhone(x.p, i, n, confusions); issues.push({ word: w.w, kind: 'low', exp: x.p, score: x.acc, target: t.target, guide: t.guide }); }
        return { p: x.p, state, score: x.acc };
      });
      if (w.err === 'Omission') issues.push({ word: w.w, kind: 'omit', exp: null, target: null, guide: null });
      return { w: w.w, err: w.err, acc: w.acc, ph };
    });
    return { provider: 'azure', words, issues, acc: a.scores.acc, scores: a.scores, text: a.text };
  }

  /* ----- So âm vị (mô hình trên máy) ----- */
  /** refWords: [{ w, ipa }] theo thứ tự câu; heardStr: chuỗi âm vị (IPA) mô hình nghe được. */
  function compareIpa(refWords, heardStr, confusions) {
    const words = refWords.map((r) => ({ w: r.w, exp: P.canon(r.ipa) }));
    const toks = String(heardStr || '').trim().split(/\s+/).filter(Boolean);
    const per = words.map(() => ({ ph: [], ops: [] }));
    const put = (wi, o, ei) => {
      per[wi].ops.push({ op: o.op, e: o.e, h: o.h, ei });
      if (o.op !== 'ins') per[wi].ph.push({ p: o.e, state: o.op === 'match' ? 'ok' : o.op === 'sub' ? 'sub' : 'del', heard: o.h || null });
    };
    let matched = 0, total = 0, heardAll = [];
    if (words.length > 1 && toks.length === words.length) {
      // mô hình tách đúng số từ: so từng từ với từ tương ứng, tránh lẫn âm giữa hai từ liền nhau
      words.forEach((w, wi) => {
        const h = P.canon(toks[wi]);
        heardAll = heardAll.concat(h);
        P.align(w.exp, h).forEach((o) => { put(wi, o, o.ei); if (o.op === 'match') matched++; });
        total += w.exp.length;
      });
    } else {
      const exp = [], owner = [], start = [];
      words.forEach((w, wi) => { start.push(exp.length); w.exp.forEach((p) => { exp.push(p); owner.push(wi); }); });
      heardAll = P.canon(heardStr);
      P.align(exp, heardAll).forEach((o) => {
        const wi = o.op === 'ins' ? owner[Math.max(0, Math.min(exp.length - 1, o.ei - 1))] : owner[o.ei];
        if (wi == null) return;
        put(wi, o, o.ei - start[wi]);
        if (o.op === 'match') matched++;
      });
      total = exp.length;
    }
    const issues = [];
    words.forEach((w, wi) => P.issues(w.exp, per[wi].ops, confusions).forEach((x) => issues.push(Object.assign({ word: w.w }, x))));
    return { provider: 'local', words: words.map((w, wi) => ({ w: w.w, ph: per[wi].ph })), issues, acc: total ? (matched / total) * 100 : null, heard: heardAll.join(' ') };
  }

  /* ----- Gọi dịch vụ và mô hình ----- */
  const errAzure = (status) => (status === 401 || status === 403 ? 'Khóa hoặc vùng Azure không đúng.' : status === 400 ? 'Azure không nhận định dạng âm thanh hoặc tham số.' : status === 429 ? 'Azure báo vượt hạn mức, hãy thử lại sau.' : 'Azure trả về lỗi ' + status + '.');

  /** x: mảng số đơn kênh, sr: tần số lấy mẫu; ref: { text, words: [{ w, ipa }] }. */
  async function azureAssess(x, sr, ref, cfg, confusions) {
    const wav = D.wav16k(x, sr);
    if (wav.length > 44 + 16000 * 2 * 30) return { error: 'Bản thu dài hơn 30 giây, Azure không chấm phát âm được.' };
    let res;
    try {
      res = await fetch(azureUrl(cfg), {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': cfg.key, 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json', 'Pronunciation-Assessment': azureHeader(ref.text, { prosody: ref.words.length >= 3 }) },
        body: wav
      });
    } catch (e) { return { error: 'Không kết nối được tới Azure (mất mạng, hoặc trình duyệt/mạng đang chặn).' }; }
    if (!res.ok) return { error: errAzure(res.status) };
    let j;
    try { j = await res.json(); } catch (e) { return { error: 'Azure trả về dữ liệu không đọc được.' }; }
    const a = parseAzure(j);
    if (!a.ok) return { error: a.status === 'NoMatch' ? 'Azure không nhận ra lời nói trong bản thu.' : a.status === 'InitialSilenceTimeout' || a.status === 'BabbleTimeout' ? 'Bản thu chỉ có im lặng hoặc tạp âm.' : 'Azure không chấm được bản thu (' + a.status + ').' };
    return fromAzure(a, confusions);
  }

  /** Thử khóa và vùng bằng một giây im lặng (không chấm gì): 401/403 là sai khóa hoặc vùng, 200 là dùng được. */
  async function azureTest(cfg) {
    const wav = D.wav16k(new Float32Array(16000), 16000);
    try {
      const res = await fetch(azureUrl(cfg), { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': cfg.key, 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json' }, body: wav });
      return res.ok ? { ok: true, msg: 'Kết nối được và khóa hợp lệ.' } : { ok: false, msg: errAzure(res.status) };
    } catch (e) { return { ok: false, msg: 'Không kết nối được tới Azure (mất mạng, hoặc trình duyệt/mạng đang chặn).' }; }
  }

  let localPipe = null, localKey = '';
  /** Tải thư viện và mô hình (chỉ khi người dùng bấm). onStatus(text) báo tiến độ. */
  async function localLoad(cfg, onStatus) {
    const k = cfg.lib + '|' + cfg.model;
    if (localPipe && localKey === k) return localPipe;
    let last = -10;
    const mod = await import(cfg.lib);
    localPipe = await mod.pipeline('automatic-speech-recognition', cfg.model, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (p) => { if (onStatus && p && p.status === 'progress' && p.file && /onnx/.test(p.file) && p.progress - last >= 5) { last = p.progress; onStatus('Đang tải mô hình: ' + Math.round(p.progress) + '%'); } }
    });
    localKey = k;
    return localPipe;
  }
  const localReady = () => !!localPipe;
  async function localAssess(x, sr, ref, cfg, confusions, onStatus) {
    try {
      const pipe = await localLoad(cfg, onStatus);
      const out = await pipe(D.resample(x, sr, 16000));
      return compareIpa(ref.words, out.text || '', confusions);
    } catch (e) { return { error: 'Mô hình trên máy không chạy được: ' + String((e && e.message) || e).slice(0, 160) }; }
  }

  async function assess(x, sr, ref, cfg, confusions, onStatus) {
    if (cfg.provider === 'azure') return azureAssess(x, sr, ref, cfg, confusions);
    if (cfg.provider === 'local') return localAssess(x, sr, ref, cfg, confusions, onStatus);
    return { error: 'Chưa bật nguồn chấm âm vị.' };
  }

  const api = { DEFAULT, load, save, ready, azureHeader, azureUrl, parseAzure, fromAzure, compareIpa, azureAssess, azureTest, localLoad, localReady, localAssess, assess, stateOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
