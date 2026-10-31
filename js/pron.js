/* hiuhf0 — pron.js
 * Phần logic thuần của luyện phát âm (không đụng DOM, kiểm thử bằng Node, xem tests/pron.test.js):
 *   - âm vị chuẩn hóa (kiểu ARPAbet rút gọn) và so khớp âm vị mong đợi với âm vị nghe được
 *   - theo dõi từng nhóm âm: ghi từng lần luyện, ước lượng mức vững có kèm độ tin cậy, xếp thứ tự ưu tiên, kế hoạch hằng ngày
 *   - đánh giá kết quả nhận dạng giọng nói (nhiều phương án, độ tin cậy) và chọn kết quả tốt nhất sau vài lần thử
 *   - nhịp câu: từ nào nhấn, từ nào đọc nhẹ
 *   - sơ đồ miệng (SVG) cho các thẻ hướng dẫn tạo âm
 * Mọi con số ở đây là heuristics để xếp thứ tự luyện, không phải thang điểm đã được kiểm định.
 */
const Pron = (() => {
  const DAY = 86400000;

  /* ================= Âm vị chuẩn hóa ================= */
  // Bộ 39 âm của TIMIT: cùng bộ với mô hình nhận dạng âm vị chạy trên máy và gần với bộ SAPI của dịch vụ Azure
  const MULTI = [['tʃ', 'ch'], ['dʒ', 'jh'], ['eɪ', 'ey'], ['aɪ', 'ay'], ['ɔɪ', 'oy'], ['aʊ', 'aw'], ['oʊ', 'ow']];
  const SINGLE = {
    i: 'iy', ɪ: 'ih', ɛ: 'eh', e: 'eh', æ: 'ae', ɑ: 'aa', ɒ: 'aa', a: 'aa', ɔ: 'ao', ʌ: 'ah', ə: 'ah', ɐ: 'ah', ʊ: 'uh', u: 'uw', o: 'ow', ɝ: 'er', ɚ: 'er', ɜ: 'er',
    ʧ: 'ch', ʤ: 'jh', p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', ɡ: 'g', f: 'f', v: 'v', θ: 'th', ð: 'dh', s: 's', z: 'z', ʃ: 'sh', ʒ: 'zh', h: 'hh', m: 'm', n: 'n', ŋ: 'ng',
    l: 'l', r: 'r', ɹ: 'r', j: 'y', w: 'w', ɾ: 'd'
  };
  const VOWELS = new Set(['iy', 'ih', 'eh', 'ae', 'aa', 'ao', 'ah', 'uh', 'uw', 'er', 'ey', 'ay', 'oy', 'aw', 'ow']);
  const SAPI = { aa: 'aa', ae: 'ae', ah: 'ah', ao: 'ao', aw: 'aw', ax: 'ah', ay: 'ay', b: 'b', ch: 'ch', d: 'd', dh: 'dh', eh: 'eh', er: 'er', ey: 'ey', f: 'f', g: 'g', h: 'hh', ih: 'ih', iy: 'iy', jh: 'jh', k: 'k', l: 'l', m: 'm', n: 'n', ng: 'ng', ow: 'ow', oy: 'oy', p: 'p', r: 'r', s: 's', sh: 'sh', t: 't', th: 'th', uh: 'uh', uw: 'uw', v: 'v', w: 'w', y: 'y', z: 'z', zh: 'zh' };
  const isVowel = (p) => VOWELS.has(p);

  /** Chuỗi IPA (một hoặc nhiều từ) thành mảng âm vị chuẩn hóa. Bỏ dấu nhấn, dấu độ dài, khoảng trắng. */
  function canon(ipa) {
    const s = String(ipa || '').replace(/[ˈˌː˞̩̃ʰ./\s|]/g, '');
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const two = s.substr(i, 2), m = MULTI.find((x) => x[0] === two);
      if (m) { out.push(m[1]); i++; continue; }
      const c = s[i];
      if (c === 'r' && out.length && s[i - 1] === 'ə' && out[out.length - 1] === 'ah') { out[out.length - 1] = 'er'; continue; } // "ər" như ɚ
      if (SINGLE[c]) out.push(SINGLE[c]);
    }
    return out;
  }
  const TO_IPA = { th: 'θ', dh: 'ð', sh: 'ʃ', ch: 'tʃ', jh: 'dʒ', zh: 'ʒ', ng: 'ŋ', hh: 'h', y: 'j', iy: 'i', ih: 'ɪ', eh: 'ɛ', ae: 'æ', aa: 'ɑ', ao: 'ɔ', ah: 'ʌ', uh: 'ʊ', uw: 'u', er: 'ɝ', ey: 'eɪ', ay: 'aɪ', oy: 'ɔɪ', aw: 'aʊ', ow: 'oʊ' };
  /** Âm vị chuẩn hóa sang ký hiệu IPA để hiển thị (th → θ). */
  const toIpa = (p) => TO_IPA[p] || p;
  /** Các ký tự của chuỗi IPA mà bộ tách âm vị bỏ qua vì không nhận ra (để kiểm tra dữ liệu). */
  const unmapped = (ipa) => Array.from(String(ipa || '').replace(/[ˈˌː˞̩̃ʰ./\s|]/g, '')).filter((c) => !SINGLE[c] && !MULTI.some((m) => m[0].indexOf(c) >= 0));
  /** Âm vị kiểu SAPI (Azure) sang âm vị chuẩn hóa; ký hiệu không nhận ra thì thử coi là IPA. */
  const fromSapi = (sym) => { const k = String(sym || '').toLowerCase(); return SAPI[k] || canon(sym)[0] || null; };

  /** So hai chuỗi âm vị (chỉnh sửa tối thiểu). Trả về [{ op: 'match' | 'sub' | 'del' | 'ins', e, h, ei }]. */
  function align(exp, heard) {
    const n = exp.length, m = heard.length;
    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) d[i][0] = i;
    for (let j = 0; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (exp[i - 1] === heard[j - 1] ? 0 : 1));
    const ops = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (exp[i - 1] === heard[j - 1] ? 0 : 1)) { ops.push({ op: exp[i - 1] === heard[j - 1] ? 'match' : 'sub', e: exp[i - 1], h: heard[j - 1], ei: i - 1 }); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.push({ op: 'del', e: exp[i - 1], h: null, ei: i - 1 }); i--; }
      else { ops.push({ op: 'ins', e: null, h: heard[j - 1], ei: i }); j--; }
    }
    return ops.reverse();
  }

  const STOPS = ['p', 't', 'k', 'b', 'd', 'g'];
  /** Từ các thao tác so khớp của MỘT từ, rút ra các vấn đề và nhóm luyện liên quan. confusions: PRON.confusions. */
  function issues(exp, ops, confusions) {
    const out = [], n = exp.length;
    ops.forEach((o) => {
      if (o.op === 'sub') {
        const c = (confusions || []).find((x) => x.exp === o.e && x.heard.indexOf(o.h) >= 0);
        out.push({ kind: 'sub', exp: o.e, heard: o.h, target: c ? c.target : null, guide: c ? c.guide : null, ei: o.ei });
      } else if (o.op === 'del') {
        const last = o.ei === n - 1, lastTwo = o.ei >= n - 2 && n >= 2 && !isVowel(exp[n - 1]) && !isVowel(exp[n - 2]);
        let target = null, guide = null;
        if (lastTwo && !isVowel(o.e)) { target = 'fin-cluster'; guide = 'cluster'; }
        else if (last && STOPS.indexOf(o.e) >= 0) { target = 'fin-stop'; guide = 'fin'; }
        else if (last && (o.e === 's' || o.e === 'z')) { target = 'fin-s'; guide = 'fin'; }
        else if (last && o.e === 'l') { target = 'fin-l'; guide = 'l'; }
        else if (last && (o.e === 'ng' || o.e === 'n')) { target = 'n-ng'; guide = 'ng'; }
        else if (o.ei === 0 && o.e === 's' && n > 2 && ['p', 't', 'k'].indexOf(exp[1]) >= 0) { target = 'init-s'; guide = 'cluster'; }
        else if (o.ei === 1 && (o.e === 'l' || o.e === 'r') && !isVowel(exp[0])) { target = 'init-lr'; guide = 'cluster'; }
        out.push({ kind: 'del', exp: o.e, heard: null, target, guide, ei: o.ei });
      } else if (o.op === 'ins' && o.h === 'ah') {
        // chèn "ơ" vào giữa các phụ âm (street → sờ-trít)
        const before = exp[o.ei - 1], after = exp[o.ei];
        if (before && after && !isVowel(before) && !isVowel(after)) out.push({ kind: 'ins', exp: null, heard: 'ah', target: o.ei <= 2 ? (before === 's' ? 'init-s' : 'init-lr') : 'fin-cluster', guide: 'cluster', ei: o.ei });
      }
    });
    return out;
  }

  /** Một âm bị điểm thấp ở vị trí idx trong từ có n âm: thuộc nhóm luyện nào (âm cuối từ xét trước). */
  function targetOfPhone(exp, idx, n, confusions) {
    if (idx === n - 1) {
      if (STOPS.indexOf(exp) >= 0) return { target: 'fin-stop', guide: 'fin' };
      if (exp === 's' || exp === 'z') return { target: 'fin-s', guide: 'fin' };
      if (exp === 'l') return { target: 'fin-l', guide: 'l' };
      if (exp === 'ng' || exp === 'n') return { target: 'n-ng', guide: 'ng' };
    }
    const c = (confusions || []).find((x) => x.exp === exp);
    return c ? { target: c.target, guide: c.guide } : { target: null, guide: null };
  }

  /* ================= Mục tiêu (nhóm âm) ================= */
  /** Danh sách mục tiêu: các nhóm cặp âm (js/data/pairs.js) cộng các mục không phải cặp âm (PRON.extra). */
  function targets(pairs, extra) {
    const t = Array.from(pairs || []).map((g) => ({ id: g.id, cat: g.cat, imp: g.imp || 1, vi: g.sound, pairGroup: true }));
    Array.from(extra || []).forEach((x) => t.push({ id: x.id, cat: x.cat, imp: x.imp || 1, vi: x.vi, guide: x.guide }));
    return t;
  }

  const last2 = (ph) => ph.slice(-2);
  // Từ nào luyện nhóm nào (theo âm vị của từ). Thứ tự là thứ tự ưu tiên khi một từ khớp nhiều nhóm.
  const RULES = [
    ['th-s', (p) => p.indexOf('th') >= 0],
    ['dh-d', (p) => p.indexOf('dh') >= 0],
    ['sh-s', (p) => p.indexOf('sh') >= 0],
    ['sh-ch', (p) => p.indexOf('sh') >= 0 || p.indexOf('ch') >= 0],
    ['jh-y', (p) => p.indexOf('jh') >= 0 || p.indexOf('y') >= 0],
    ['n-ng', (p) => p.indexOf('ng') >= 0],
    ['init-s', (p) => p.length > 2 && p[0] === 's' && ['p', 't', 'k'].indexOf(p[1]) >= 0],
    ['init-lr', (p) => p.length > 2 && !isVowel(p[0]) && (p[1] === 'l' || p[1] === 'r')],
    ['fin-cluster', (p) => p.length >= 3 && !isVowel(p[p.length - 1]) && !isVowel(p[p.length - 2])],
    ['fin-s', (p) => ['s', 'z'].indexOf(p[p.length - 1]) >= 0],
    ['fin-stop', (p) => STOPS.indexOf(p[p.length - 1]) >= 0],
    ['fin-l', (p) => p[p.length - 1] === 'l'],
    ['l-r', (p) => p.indexOf('l') >= 0 || p.indexOf('r') >= 0],
    ['b-v', (p) => p.indexOf('v') >= 0],
    ['ae-eh', (p) => p.indexOf('ae') >= 0],
    ['aa-ah', (p) => p.indexOf('aa') >= 0],
    ['uh-uw', (p) => p.indexOf('uh') >= 0 || p.indexOf('uw') >= 0],
    ['iy-ih', (p) => p.indexOf('iy') >= 0 || p.indexOf('ih') >= 0],
    ['eh-ih', (p) => p.indexOf('eh') >= 0],
    ['ey-eh', (p) => p.indexOf('ey') >= 0],
    ['fin-voice', (p) => ['p', 'b', 't', 'd', 'k', 'g', 'f', 'v'].indexOf(p[p.length - 1]) >= 0]
  ];
  /** Tối đa `max` nhóm một từ đang luyện (từ cụ thể trước, chung chung sau). */
  function targetsOfIpa(ipa, max = 2) {
    const p = canon(ipa);
    if (!p.length) return [];
    return RULES.filter((r) => r[1](p)).slice(0, max).map((r) => r[0]);
  }

  /* ================= Theo dõi từng nhóm ================= */
  const EV_CAP = 80;
  // Trọng số theo loại bằng chứng: nghe phân biệt đáng tin nhất, nhận dạng giọng nói nhiễu nên nhẹ hơn, tự đánh giá nhẹ nhất
  const KIND_W = { perc: 1, prod: 0.5, self: 0.25, azure: 1, local: 0.7 };
  const blank = () => ({ v: 1, t: {}, diag: null, plan: null, rec: [] });
  const ensure = (st) => st.pron || (st.pron = blank());

  /** Ghi một lần luyện vào nhóm id. kind: perc | prod | self | azure | local. */
  function record(p, id, kind, ok, now = Date.now(), w) {
    const t = p.t[id] || (p.t[id] = { ev: [], last: 0 });
    t.ev.push([now, kind, ok ? 1 : 0, Math.round((w == null ? (KIND_W[kind] == null ? 0.5 : KIND_W[kind]) : w) * 100)]);
    if (t.ev.length > EV_CAP) t.ev.splice(0, t.ev.length - EV_CAP);
    t.last = now;
  }

  /** Mức vững của một nhóm: p (0..1), n (số lần luyện quy đổi), level (low/mid/high), last. Bằng chứng cũ nhạt dần (nửa đời 30 ngày). */
  function estimate(p, id, now = Date.now()) {
    const t = p.t[id];
    let s = 0, f = 0, n = 0;
    if (t) t.ev.forEach((e) => { const w = (e[3] / 100) * Math.pow(0.5, (now - e[0]) / (30 * DAY)); n += w; if (e[2]) s += w; else f += w; });
    const level = n < 4 ? 'low' : n < 10 ? 'mid' : 'high';
    return { p: (s + 2) / (s + f + 3), n, level, last: t ? t.last : 0, has: !!(t && t.ev.length) };
  }

  /** Sau bao nhiêu ngày thì nên luyện lại nhóm này. */
  function dueDays(est) {
    if (est.level === 'low' || est.p < 0.6) return 1;
    if (est.p < 0.75) return 2;
    if (est.p < 0.9) return 5;
    return est.level === 'high' ? 14 : 5;
  }
  const isDue = (est, now) => !est.has || (now - est.last) / DAY >= dueDays(est);

  /** Điểm ưu tiên: yếu, chưa đủ dữ liệu, quan trọng với việc người khác hiểu mình, và đã đến lúc luyện lại thì cao. */
  function priority(est, imp, now) {
    const weak = 1 - est.p + (est.level === 'low' ? 0.15 : 0);
    const due = est.has ? Math.min(1, (now - est.last) / (dueDays(est) * DAY)) : 1;
    return weak * imp * (0.5 + 0.5 * due);
  }

  /** Kế hoạch hôm nay: k nhóm cần luyện nhất, kèm lý do. Luôn có ít nhất một mục trọng âm/nhịp nếu nó chưa vững. */
  function plan(p, tgts, now = Date.now(), k = 3) {
    const rows = tgts.map((t) => { const e = estimate(p, t.id, now); return { t, e, score: priority(e, t.imp, now), due: isDue(e, now) }; })
      .filter((r) => r.due || r.e.p < 0.85)
      .sort((a, b) => b.score - a.score);
    const pick = rows.slice(0, k);
    const pr = rows.find((r) => r.t.cat === 'prosody' && r.e.p < 0.85);
    if (pr && !pick.some((r) => r.t.cat === 'prosody')) pick[pick.length - 1] = pr;
    return pick.filter(Boolean).map((r) => ({
      id: r.t.id, vi: r.t.vi, cat: r.t.cat, p: r.e.p, level: r.e.level,
      reason: !r.e.has ? 'chưa đo' : r.e.p < 0.6 ? 'đang yếu' : r.e.p < 0.8 ? 'chưa vững' : 'đến lúc ôn lại'
    }));
  }

  /** Hồ sơ theo nhóm lớn: mức vững trung bình (có trọng số độ quan trọng) và độ tin cậy. */
  function profile(p, tgts, cats, now = Date.now()) {
    return Array.from(cats).map((c) => {
      const rows = tgts.filter((t) => t.cat === c.key).map((t) => ({ t, e: estimate(p, t.id, now) }));
      const measured = rows.filter((r) => r.e.has);
      const wsum = measured.reduce((a, r) => a + r.t.imp, 0);
      const avg = wsum ? measured.reduce((a, r) => a + r.e.p * r.t.imp, 0) / wsum : null;
      const n = measured.reduce((a, r) => a + r.e.n, 0);
      return { cat: c.key, vi: c.vi, icon: c.icon, p: avg, n, level: !measured.length ? 'none' : n < 6 ? 'low' : n < 16 ? 'mid' : 'high', weakest: measured.sort((a, b) => a.e.p - b.e.p).slice(0, 2).map((r) => r.t.id), total: rows.length, measured: measured.length };
    });
  }

  /* ================= Đánh giá kết quả nhận dạng giọng nói ================= */
  const norm = (s) => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const RANK = { match: 3, alt: 2, other: 1, none: 0 };

  /** alts: [{ t, c }] các phương án của một lần nhận dạng, theo thứ tự trình duyệt trả về.
   *  match: phương án đầu là từ cần đọc; alt: từ cần đọc nằm trong các phương án khác (rank > 0); other: nghe thành từ khác; none: không nghe được gì. */
  function judgeWord(target, alts) {
    const T = norm(target);
    const list = Array.from(alts || []).map((a) => ({ t: norm(a.t), c: a.c || 0 })).filter((a) => a.t);
    if (!list.length) return { v: 'none', rank: -1, heard: '', c: 0 };
    if (list[0].t === T) return { v: 'match', rank: 0, heard: list[0].t, c: list[0].c };
    const r = list.findIndex((a) => a.t === T);
    if (r > 0) return { v: 'alt', rank: r, heard: list[0].t, c: list[r].c };
    return { v: 'other', rank: -1, heard: list[0].t, c: list[0].c };
  }
  /** results: mảng các lần nhận dạng (mỗi lần là mảng phương án). Lấy kết quả tốt nhất. */
  function judgeBest(target, results) {
    let best = { v: 'none', rank: -1, heard: '', c: 0 };
    Array.from(results || []).forEach((alts) => { const j = judgeWord(target, alts); if (RANK[j.v] > RANK[best.v] || (RANK[j.v] === RANK[best.v] && j.c > best.c)) best = j; });
    return best;
  }
  /** Từ đọc có tính là "đạt" không: nghe đúng ngay, hoặc từ đúng nằm trong hai phương án đầu. */
  const passes = (j) => j.v === 'match' || (j.v === 'alt' && j.rank <= 1);
  /** Cặp tối thiểu: người học muốn đọc `target`; máy nghe thành `target`, `other` hay từ khác. */
  function judgeContrast(target, other, alts) {
    const j = judgeWord(target, alts);
    if (passes(j)) return { v: 'target', heard: j.heard };
    const list = Array.from(alts || []).map((a) => norm(a.t));
    if (list[0] === norm(other)) return { v: 'other', heard: list[0] };
    return { v: 'neither', heard: list[0] || '' };
  }

  /* ================= Chất lượng bản thu ================= */
  const MIC = {
    short: 'Bản thu quá ngắn: hãy bấm đọc rồi mới nói, và đừng dừng quá sớm.',
    silent: 'Gần như không thu được tiếng. Kiểm tra micro và quyền truy cập micro của trình duyệt.',
    quiet: 'Giọng hơi nhỏ: nói to hơn hoặc đưa micro lại gần (khoảng một gang tay).',
    clip: 'Giọng bị vỡ vì quá to: lùi micro ra xa hoặc nói nhỏ lại.',
    noisy: 'Xung quanh khá ồn nên kết quả kém tin cậy: tìm chỗ yên tĩnh hơn.'
  };
  /** q: kết quả Dsp.quality. Lời khuyên bằng tiếng Việt; rỗng nếu bản thu tốt. */
  const micAdvice = (q) => (q && q.issues ? Array.from(q.issues).map((k) => MIC[k]).filter(Boolean).join(' ') : '');

  /* ================= Nhịp câu ================= */
  const FUNC_POS = new Set(['det', 'pron', 'prep', 'conj']);
  const FUNC_WORDS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'to', 'of', 'and', 'or', 'but', 'a', 'an', 'the', 'at', 'in', 'on', 'for', 'from', 'with', 'by', 'as', 'than', 'that', 'there', 'some', 'any', 'if', 'so', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their']);
  const STRESS_PRON = new Set(['this', 'that', 'these', 'those', 'mine', 'yours', 'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose', 'no', 'not', 'never', 'nobody', 'nothing']);
  /** Tách câu thành các từ, đánh dấu từ nào được nhấn (nội dung) và từ nào đọc nhẹ (chức năng).
   *  posOf(token) trả về loại từ trong kho (hoặc null). Từ chức năng đứng cuối câu thì được nhấn ("Yes, I do"). */
  function rhythm(sentence, posOf, weak) {
    const toks = String(sentence).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    return toks.map((w, i) => {
      const lw = w.toLowerCase();
      const pos = posOf ? posOf(lw) : null;
      let fn = FUNC_WORDS.has(lw) || (FUNC_POS.has(pos) && !STRESS_PRON.has(lw));
      if (STRESS_PRON.has(lw)) fn = false;
      if (fn && i === toks.length - 1) fn = false;
      return { w, stressed: !fn, weak: fn && weak && weak[lw] ? weak[lw] : null };
    });
  }

  /* ================= Sơ đồ miệng ================= */
  const r1 = (n) => Math.round(n * 10) / 10;
  /** Đường cong mượt qua các điểm (Catmull-Rom đổi sang Bezier). */
  function spline(pts) {
    let d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ' C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
    }
    return d;
  }
  /** SVG mặt cắt dọc của miệng (nhìn nghiêng, mặt quay sang trái). pic: xem js/data/pron.js. Chỉ để minh họa. */
  function mouthSVG(pic) {
    const j = (pic.jaw || 0) * 14, T = pic.tongue, tip = T[T.length - 1], root = T[0];
    const lips = pic.lips || 'neutral';
    const dx = lips === 'round' ? -9 : lips === 'spread' ? 2 : 0;
    const gap = lips === 'round' ? -4 : 0;
    const ly = lips === 'teethlip' ? -8 : lips === 'closed' ? -10 : 0;
    const velum = pic.velum === 'down' ? 'C160 60 166 78 162 94' : 'C162 54 170 60 174 70';
    const tongue = spline(T) + ' L' + r1(tip[0] + 3) + ' ' + r1(tip[1] + 13) + ' C' + r1(tip[0] + 30) + ' ' + r1(Math.min(150, tip[1] + 34)) + ' ' + r1(root[0] - 24) + ' 150 ' + r1(root[0]) + ' 148 Z';
    const arrow = (a) => {
      const [x1, y1, x2, y2] = a, ang = Math.atan2(y2 - y1, x2 - x1), h = 6;
      const p = (t) => r1(x2 - h * Math.cos(ang + t)) + ',' + r1(y2 - h * Math.sin(ang + t));
      return '<path class="mp-air" d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '"/><path class="mp-airh" d="M' + x2 + ',' + y2 + ' L' + p(0.5) + ' L' + p(-0.5) + ' Z"/>';
    };
    const voice = pic.voiced ? '<path class="mp-voice" d="M164 160 l4 -7 l4 12 l4 -12 l4 12 l4 -12 l4 7"/>' : '<path class="mp-novoice" d="M164 160 h24"/>';
    return '<svg class="mouth" viewBox="0 0 220 176" role="img" aria-label="Sơ đồ vị trí lưỡi và môi (minh họa)">'
      + '<path class="mp-line" d="M55 68 C56 58 66 54 76 50 C104 38 134 38 152 50 ' + velum + '"/>'
      + '<path class="mp-line" d="M176 70 L176 156"/>'
      + '<rect class="mp-teeth" x="46" y="66" width="9" height="18" rx="2"/>'
      + '<rect class="mp-teeth" x="46" y="' + r1(90 + j) + '" width="9" height="17" rx="2"/>'
      + '<path class="mp-line" d="M44 ' + r1(100 + j) + ' C40 ' + r1(118 + j) + ' 54 ' + r1(130 + j) + ' 90 ' + r1(134 + j) + ' L170 154"/>'
      + '<path class="mp-lip" d="M' + (32 + dx) + ' 44 C' + (32 + dx) + ' 56 ' + (36 + dx) + ' 62 ' + (44 + dx) + ' ' + r1(70 + gap) + '"/>'
      + '<path class="mp-lip" d="M' + (44 + dx) + ' ' + r1(92 + j + gap * -1 + ly) + ' C' + (34 + dx) + ' ' + r1(96 + j + ly) + ' ' + (34 + dx) + ' ' + r1(112 + j) + ' ' + (46 + dx) + ' ' + r1(118 + j) + '"/>'
      + '<path class="mp-tongue" d="' + tongue + '"/>'
      + (pic.contact ? '<circle class="mp-hot" cx="' + pic.contact[0] + '" cy="' + pic.contact[1] + '" r="4.5"/>' : '')
      + (pic.velum === 'down' ? '<path class="mp-air" d="M150 44 C146 26 110 22 70 30"/><path class="mp-airh" d="M70,30 L77,24 L78,34 Z"/>' : '')
      + (pic.air ? arrow(pic.air) : '')
      + voice
      + '</svg>';
  }

  /* ================= Bài đo ================= */
  const shuffle = (a, rand = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /** Một câu nghe phân biệt: nghe một trong hai từ của một cặp, chọn từ đã nghe. */
  function percItem(group, rand = Math.random, used) {
    const ps = shuffle(Array.from(group.pairs), rand);
    const p = (used && ps.find((x) => !used.has(x[0] + '|' + x[2]))) || ps[0];
    if (used) used.add(p[0] + '|' + p[2]);
    return { t: 'perc', target: group.id, p: Array.from(p), side: rand() < 0.5 ? 0 : 1 };
  }
  /** Các câu nghe phân biệt của bài đo, xen kẽ giữa các nhóm để không dồn một nhóm liên tiếp. */
  function buildPerc(pairs, cfg, rand = Math.random) {
    const groups = cfg.groups.map((id) => Array.from(pairs).find((g) => g.id === id)).filter(Boolean);
    const used = new Set(), rounds = [];
    for (let r = 0; r < cfg.perGroup; r++) rounds.push(shuffle(groups, rand).map((g) => percItem(g, rand, used)));
    return rounds.reduce((a, b) => a.concat(b), []);
  }

  const api = { canon, toIpa, unmapped, fromSapi, align, issues, targetOfPhone, isVowel, targets, targetsOfIpa, blank, ensure, record, estimate, dueDays, isDue, priority, plan, profile, judgeWord, judgeBest, passes, judgeContrast, micAdvice, rhythm, spline, mouthSVG, percItem, buildPerc, KIND_W, EV_CAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
