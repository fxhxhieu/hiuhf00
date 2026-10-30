/* hiuhf0 — drills.js
 * Ba dạng bài ngắn (10 câu mỗi lượt) ở trang "Trọng âm, đuôi từ, cụm từ" (#drills), sinh từ dữ liệu có sẵn:
 *   - Trọng âm: nghe một từ, chọn âm tiết được nhấn. Suy ra từ dấu ˈ trong IPA (js/data/ipa.js).
 *   - Đuôi -s và -ed: đuôi đọc là /s/ /z/ /ɪz/ hay /t/ /d/ /ɪd/. Suy ra từ âm cuối của IPA từ gốc.
 *   - Ghép cụm: chọn từ đúng cho cụm kết hợp (make a decision, do homework…). Các cụm lấy từ js/data/extras.js; những từ làm
 *     đáp án nhiễu do người soạn chọn tay trong COLLOCATION_SETS, vì sinh tự động sẽ cho ra nhiều câu có hai đáp án đúng
 *     (look out / watch out, get a job / find a job…).
 * Phần sinh câu hỏi là hàm thuần nên kiểm thử được bằng Node (tests/drills.test.js). Phần giao diện đăng ký qua AppModules.
 */
const Drills = (() => {
  const shuffled = (arr, rand = Math.random) => {
    const a = Array.from(arr);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  /** Lấy lần lượt từ mỗi nhóm (xoay vòng) cho tới đủ n, để các nhóm xuất hiện gần đều nhau. */
  function balanced(groups, n, rand) {
    const lists = shuffled(Object.keys(groups).map((k) => shuffled(groups[k], rand)), rand);
    const out = [];
    for (let i = 0; out.length < n && lists.some((l) => l.length > i); i++) lists.forEach((l) => { if (out.length < n && l[i]) out.push(l[i]); });
    return shuffled(out, rand);
  }
  // Từ đơn có IPA (bỏ cụm từ, từ có dấu gạch nối, dấu nháy, từ không có nguyên âm như Mr, Mrs và từ người học tự thêm)
  const single = (w) => !!w && !w.custom && w.pos !== 'phr' && !!w.ipa && !/[\s'’-]/.test(w.word) && /[aeiouy]/i.test(w.word);

  /* ================= Trọng âm ================= */
  // Hạt nhân âm tiết trong IPA: một nguyên âm, kèm /ɪ/ hoặc /ʊ/ đi sau nếu là nguyên âm đôi (eɪ, aɪ, ɔɪ, aʊ, oʊ)
  const NUCLEUS = /[aeiouɑɒæɛɪɔʊʌəɚɝɜɐ][ɪʊ]?/g;

  /** Số âm tiết (n) và vị trí âm tiết mang dấu nhấn chính ˈ (k, tính từ 0; -1 nếu không có) của một phiên âm IPA. */
  function analyze(ipa) {
    const s = String(ipa || '').replace(/[/.]/g, '');
    const i = s.indexOf('ˈ');
    return { n: (s.match(NUCLEUS) || []).length, k: i < 0 ? -1 : (s.slice(0, i).match(NUCLEUS) || []).length };
  }

  /** Các từ đơn có từ 2 âm tiết trở lên và dấu nhấn chính. Chính tả có nhiều thẻ mà nhấn khác nhau (record danh từ / động từ)
   *  bị loại, vì giọng đọc của trình duyệt không biết đang hỏi loại từ nào. */
  function stressPool(words) {
    const by = new Map();
    Array.from(words).forEach((w) => {
      if (!single(w)) return;
      const a = analyze(w.ipa);
      if (a.n < 2 || a.k < 0) return;
      const key = w.word.toLowerCase();
      if (!by.has(key)) by.set(key, []);
      by.get(key).push({ w, a });
    });
    const out = [];
    by.forEach((list) => { if (new Set(list.map((x) => x.a.n + ':' + x.a.k)).size === 1) out.push(list[0]); });
    return out;
  }

  function stressOptions(n, k, rand) {
    const all = Array.from({ length: n }, (_, i) => i);
    if (n <= 4) return all;
    return shuffled(all.filter((i) => i !== k), rand).slice(0, 3).concat(k).sort((a, b) => a - b);
  }

  /** n câu hỏi trọng âm. Một nửa là từ không nhấn ở âm đầu (để không thể đoán "luôn âm đầu"), và ưu tiên từ từ 3 âm tiết. */
  function stressQuestions(words, n = 10, rand = Math.random) {
    const pool = stressPool(words);
    const later = shuffled(pool.filter((x) => x.a.k > 0), rand);
    const first3 = shuffled(pool.filter((x) => x.a.k === 0 && x.a.n >= 3), rand);
    const first2 = shuffled(pool.filter((x) => x.a.k === 0 && x.a.n === 2), rand);
    const half = Math.ceil(n / 2);
    const picked = later.slice(0, half);
    first3.slice(0, n - picked.length).forEach((x) => picked.push(x));
    first2.slice(0, n - picked.length).forEach((x) => picked.push(x));
    later.slice(half, half + n - picked.length).forEach((x) => picked.push(x));
    return shuffled(picked.slice(0, n), rand).map(({ w, a }) => {
      const opts = stressOptions(a.n, a.k, rand);
      return { w, n: a.n, k: a.k, opts, a: opts.indexOf(a.k) };
    });
  }

  /* ================= Đuôi -s và -ed ================= */
  const strip = (ipa) => String(ipa || '').replace(/[ˈˌ./]/g, '').trim();
  /** Âm cuối của một phiên âm: tʃ, dʒ hoặc một ký tự. */
  function lastSound(ipa) {
    const s = strip(ipa);
    return /(tʃ|dʒ)$/.test(s) ? s.slice(-2) : s.slice(-1);
  }
  /** Đuôi -ed đọc là /ɪd/ (sau t, d), /t/ (sau âm vô thanh) hay /d/ (còn lại). */
  const edClass = (ls) => (ls === 't' || ls === 'd' ? 'ɪd' : ['p', 'k', 'f', 's', 'ʃ', 'tʃ', 'θ'].indexOf(ls) >= 0 ? 't' : 'd');
  /** Đuôi -s đọc là /ɪz/ (sau s, z, ʃ, ʒ, tʃ, dʒ), /s/ (sau p, t, k, f, θ) hay /z/ (còn lại). */
  const sClass = (ls) => (['s', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ'].indexOf(ls) >= 0 ? 'ɪz' : ['p', 't', 'k', 'f', 'θ'].indexOf(ls) >= 0 ? 's' : 'z');

  /** Dạng quá khứ của động từ có quy tắc: like → liked, study → studied, stop → stopped, visit → visited. */
  function pastForm(v, ipa) {
    v = v.toLowerCase();
    if (/e$/.test(v)) return v + 'd';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied';
    const a = analyze(ipa);
    // phụ âm + nguyên âm + phụ âm cuối thì gấp đôi nếu nhấn ở âm tiết cuối: stop → stopped, prefer → preferred, nhưng visit → visited
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(v.replace(/qu/g, 'q')) && (a.n === 1 || a.k === a.n - 1)) return v + v.slice(-1) + 'ed';
    return v + 'ed';
  }
  /** Dạng ngôi thứ ba số ít: work → works, watch → watches, study → studies. */
  function thirdForm(v) {
    v = v.toLowerCase();
    if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }

  // Động từ có cách đọc hoặc cách viết đuôi riêng, bất quy tắc mà bảng động từ bất quy tắc chưa có (hang, bend, spread…), hoặc dễ
  // gây tranh cãi giữa Anh–Mỹ và Anh–Anh (fit → fitted/fit, travel → traveled/travelled): không đưa vào bài
  const ENDING_SKIP = new Set(['say', 'pay', 'lay', 'quit', 'be', 'have', 'do', 'go', 'hang', 'bend', 'spread', 'beat', 'overcome', 'undergo', 'withdraw', 'fit', 'broadcast', 'lie', 'found',
    'travel', 'cancel', 'label', 'model', 'level', 'signal', 'total', 'focus']);
  const ENDING_OPTS = { ed: ['t', 'd', 'ɪd'], s: ['s', 'z', 'ɪz'] };

  /** Động từ có quy tắc (không phải bất quy tắc, không ở cấp A0) cùng đuôi cần hỏi. irregular: Set các động từ bất quy tắc ở dạng nguyên mẫu. */
  function endingPool(words, kind, irregular) {
    const irr = irregular || new Set();
    return Array.from(words).filter((w) => single(w) && w.pos === 'v' && w.level !== 'A0' && /^[a-z]+$/i.test(w.word) && !/c$/i.test(w.word)
      && !irr.has(w.word.toLowerCase()) && !ENDING_SKIP.has(w.word.toLowerCase())).map((w) => {
      const ls = lastSound(w.ipa);
      return { w, ls, answer: kind === 'ed' ? edClass(ls) : sClass(ls), form: kind === 'ed' ? pastForm(w.word, w.ipa) : thirdForm(w.word) };
    });
  }

  function endingQuestions(words, kind, n = 10, rand = Math.random, irregular) {
    const groups = {};
    endingPool(words, kind, irregular).forEach((x) => { (groups[x.answer] || (groups[x.answer] = [])).push(x); });
    return balanced(groups, n, rand).map((x) => ({ kind, w: x.w, form: x.form, ls: x.ls, answer: x.answer, opts: ENDING_OPTS[kind], a: ENDING_OPTS[kind].indexOf(x.answer) }));
  }

  /** Lời giải thích bằng tiếng Việt vì sao đuôi đọc như vậy. */
  function endingRule(q) {
    const e = q.kind === 'ed' ? '-ed' : '-s/-es', base = '“' + q.w.word + '” kết thúc bằng âm /' + q.ls + '/';
    if (q.kind === 'ed') {
      if (q.answer === 'ɪd') return base + ' (t hoặc d) nên ' + e + ' đọc thêm một âm tiết /ɪd/: wanted, needed.';
      if (q.answer === 't') return base + ' là âm vô thanh nên ' + e + ' đọc /t/: worked, stopped.';
      return base + ' là âm hữu thanh hoặc nguyên âm nên ' + e + ' đọc /d/: played, called.';
    }
    if (q.answer === 'ɪz') return base + ' (âm rít) nên ' + e + ' đọc thêm một âm tiết /ɪz/: watches, uses.';
    if (q.answer === 's') return base + ' là âm vô thanh nên ' + e + ' đọc /s/: works, stops.';
    return base + ' là âm hữu thanh hoặc nguyên âm nên ' + e + ' đọc /z/: plays, calls.';
  }

  /* ================= Ghép cụm ================= */
  /* Mỗi bộ: các động từ dễ nhầm với nhau và những cụm [động từ, phần còn lại] chỉ có đúng một đáp án trong bộ đó.
   * Mọi cụm phải có trong extras.js của từ đó, và ghép phần còn lại với các động từ khác của bộ không được ra một cụm hợp lệ
   * (tests/drills.test.js kiểm tra cả hai điều này). Không đưa vào cụm kiểu phrasal verb (look out / watch out). */
  const COLLOCATION_SETS = [
    { verbs: ['make', 'do'], items: [['make', 'a decision'], ['make', 'a mistake'], ['make', 'friends'], ['make', 'money'], ['make', 'a phone call'], ['do', 'homework'], ['do', 'the dishes'], ['do', 'exercise'], ['do', 'your best'], ['do', 'business']] },
    { verbs: ['say', 'tell', 'speak', 'talk'], items: [['say', 'hello'], ['say', 'goodbye'], ['say', 'sorry'], ['say', 'yes'], ['tell', 'a story'], ['tell', 'a lie'], ['speak', 'English']] },
    { verbs: ['take', 'make', 'do'], items: [['take', 'a photo'], ['take', 'a shower']] },
    { verbs: ['play', 'do', 'go'], items: [['play', 'football'], ['play', 'the guitar'], ['play', 'games']] },
    { verbs: ['give', 'make', 'do'], items: [['give', 'advice'], ['give', 'a hand']] },
    { verbs: ['ask', 'make', 'tell'], items: [['ask', 'a question']] },
    { verbs: ['watch', 'see', 'look'], items: [['watch', 'TV'], ['see', 'a doctor']] }
  ];

  const collList = (words, verb) => {
    const w = Array.from(words).find((x) => x.word === verb && x.pos === 'v' && x.more);
    return w ? Array.from(w.more.coll, (c) => c.toLowerCase()) : [];
  };

  /** Các câu hỏi ghép cụm còn khớp với dữ liệu extras (cụm nào không còn trong dữ liệu thì bỏ qua). */
  function collocationItems(words) {
    const out = [];
    COLLOCATION_SETS.forEach((set) => set.items.forEach(([verb, rest]) => {
      const phrase = verb + ' ' + rest;
      if (collList(words, verb).indexOf(phrase.toLowerCase()) < 0) return;
      const head = Array.from(words).find((x) => x.word === verb && x.pos === 'v' && x.more);
      out.push({ set, verb, rest, phrase, stem: '___ ' + rest, note: head && head.more.note ? head.more.note : '' });
    }));
    return out;
  }

  function collocationQuestions(words, n = 10, rand = Math.random) {
    return shuffled(collocationItems(words), rand).slice(0, n).map((it) => {
      const opts = shuffled(it.set.verbs, rand);
      return { stem: it.stem, phrase: it.phrase, answer: it.verb, note: it.note, opts, a: opts.indexOf(it.verb) };
    });
  }

  const api = { analyze, stressPool, stressQuestions, lastSound, edClass, sClass, pastForm, thirdForm, endingPool, endingQuestions, endingRule, COLLOCATION_SETS, collocationItems, collocationQuestions, shuffled };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ================= Giao diện ================= */
  if (typeof window !== 'undefined') {
    window.AppModules = window.AppModules || [];
    window.AppModules.push((A) => {
      const { $, esc, view, toast } = A;
      const dango = (e, s) => (A.stickers ? A.stickers.dango(e, s) : Mascot.svg(e, s));
      const DRILLS = [
        ['stress', '🥁', 'Trọng âm', 'Nghe một từ, chọn âm tiết được nhấn mạnh', 'sky'],
        ['ending', '🔚', 'Đuôi -s và -ed', 'Đuôi đọc là /s/, /z/, /ɪz/ hay /t/, /d/, /ɪd/?', 'mint'],
        ['collo', '🧲', 'Ghép cụm', 'make hay do? say hay tell? Chọn từ đúng cho cụm', 'pink']
      ];
      const SRC = [['learned', 'Từ bạn đã học'], ['a12', 'Cấp A1, A2'], ['all', 'Mọi cấp']];
      let src = null; // chưa chọn thì tự chọn theo số từ đã học
      let cur = null; // lượt đang chơi

      const mine = () => Data.words.filter((w) => Store.card(w.id));
      const effectiveSrc = () => src || (mine().length >= 60 ? 'learned' : 'a12');
      function wordsFor(s) {
        if (s === 'learned') return mine();
        if (s === 'a12') return Data.words.filter((w) => w.level === 'A1' || w.level === 'A2');
        return Data.words.slice();
      }
      const irregularSet = () => new Set(Data.irregular.map((v) => v.base));
      /** Dựng câu hỏi từ nguồn từ đã chọn; ít quá thì mở rộng ra mọi từ. */
      function build(make) {
        let qs = make(wordsFor(effectiveSrc()));
        if (qs.length < 8) qs = make(Data.words);
        return qs;
      }

      const dots = (n, k) => `<span class="dots" role="img" aria-label="Nhấn âm tiết thứ ${k + 1} trong ${n} âm tiết">${Array.from({ length: n }, (_, i) => `<i class="${i === k ? 'on' : ''}" aria-hidden="true">${i === k ? '●' : '○'}</i>`).join('')}</span>`;

      const DEF = {
        stress: {
          title: 'Trọng âm',
          make: () => build((ws) => stressQuestions(ws, 10)),
          autoSay: (q) => q.w.word,
          prompt: (q) => `<div class="prompt"><div class="fc-word">${esc(q.w.word)}</div><div class="fc-pos">${esc(q.w.pos)} · ${esc(q.w.vi)}</div><div class="row wrap center-row"><button class="btn" data-say="${esc(q.w.word)}">🔊 Nghe <kbd>P</kbd></button><button class="btn" data-say="${esc(q.w.word)}" data-rate="0.55">🐢 Nghe chậm</button></div></div><p class="muted center">Âm tiết nào được nhấn mạnh nhất?</p>`,
          label: (q, k) => dots(q.n, q.opts[k]),
          reveal: (q) => `<p><b>${esc(q.w.word)}</b> <span class="ipa">/${esc(q.w.ipa)}/</span> · nhấn ở âm tiết thứ ${q.k + 1} trong ${q.n}</p><p class="muted">Dấu ˈ trong phiên âm nằm ngay trước âm tiết được nhấn. Đọc âm này to, dài và rõ hơn; các âm còn lại đọc nhẹ và nhanh, nhiều âm thành /ə/.</p>`,
          missed: (q) => `<b>${esc(q.w.word)}</b> <span class="ipa">/${esc(q.w.ipa)}/</span> · nhấn âm tiết thứ ${q.k + 1} trong ${q.n}`,
          log: (ok) => Store.logListen('stress', ok)
        },
        ending: {
          title: 'Đuôi -s và -ed',
          make: () => build((ws) => shuffled(endingQuestions(ws, 'ed', 5, Math.random, irregularSet()).concat(endingQuestions(ws, 's', 5, Math.random, irregularSet())))),
          prompt: (q) => `<div class="prompt"><div class="fc-pos">${q.kind === 'ed' ? 'Dạng quá khứ có quy tắc' : 'Động từ ngôi thứ ba số ít'}</div><div class="fc-word">${esc(q.form)}</div><span class="ipa">${esc(q.w.word)} /${esc(q.w.ipa)}/ · ${esc(q.w.vi)}</span></div><p class="muted center">Đuôi <b>-${q.kind === 'ed' ? 'ed' : (/es$/.test(q.form) && !/[^aeiou]ies$/.test(q.form) ? 'es' : 's')}</b> trong “${esc(q.form)}” đọc là gì?</p>`,
          label: (q, k) => '/' + esc(q.opts[k]) + '/',
          reveal: (q) => `<p>${esc(endingRule(q))}</p><p><button class="btn sm" data-say="${esc(q.form)}">🔊 Nghe “${esc(q.form)}”</button></p>`,
          after: (q) => { if (TTS.ok) TTS.speak(q.form); },
          missed: (q) => `<b>${esc(q.form)}</b> · ${esc(endingRule(q))}`,
          log: (ok) => Store.logListen('ending', ok)
        },
        collo: {
          title: 'Ghép cụm',
          make: () => collocationQuestions(Data.words, 10),
          prompt: (q) => `<div class="prompt"><div class="fc-word long">${esc(q.stem)}</div></div><p class="muted center">Chọn từ còn thiếu để thành cụm thường dùng</p>`,
          label: (q, k) => esc(q.opts[k]),
          reveal: (q) => `<p><b>${esc(q.phrase)}</b> <button class="icon-btn sm" data-say="${esc(q.phrase)}" aria-label="Nghe cụm">🔊</button></p>${q.note ? `<p class="i-note">💡 ${esc(q.note)}</p>` : ''}`,
          missed: (q) => `<b>${esc(q.phrase)}</b>`,
          log: (ok) => { if (ok) Store.bump('colloOk'); }
        }
      };

      function renderHub() {
        cur = null;
        const s = effectiveSrc();
        view.innerHTML = `
          <a class="back" href="#practice">‹ Luyện</a>
          <section class="page-h row"><div class="dango-wrap sm">${dango('wow', 72)}</div><div><h1>Trọng âm, đuôi từ, cụm từ</h1><p class="muted">Ba dạng bài ngắn, mỗi lượt 10 câu, sinh từ phiên âm IPA và kho cụm kết hợp có sẵn.</p></div></section>
          <section class="card">
            <p class="field-l">Từ dùng cho bài Trọng âm và Đuôi -s, -ed</p>
            <div class="chips" id="dr-src">${SRC.map(([k, l]) => `<button class="chip" data-src="${k}" aria-pressed="${s === k}">${l}</button>`).join('')}</div>
          </section>
          <div class="hubgrid">${DRILLS.map(([k, i, t, d, c]) => A.hubTile('#drills/' + k, i, t, d, c)).join('')}</div>
          <section class="card">
            <h2>Nhớ nhanh</h2>
            <p class="hint"><b>Trọng âm.</b> Từ nhiều âm tiết chỉ có một âm tiết nhấn chính: đọc to, dài, rõ hơn; các âm còn lại đọc nhẹ. Tiếng Việt mỗi âm tiết gần như đều nhau nên đây là chỗ hay sai.</p>
            <p class="hint"><b>Đuôi -ed.</b> Sau /t/ hoặc /d/ đọc /ɪd/ (wanted). Sau âm vô thanh /p k f s ʃ tʃ θ/ đọc /t/ (worked). Còn lại đọc /d/ (played).</p>
            <p class="hint"><b>Đuôi -s.</b> Sau /s z ʃ ʒ tʃ dʒ/ đọc /ɪz/ (watches). Sau âm vô thanh /p t k f θ/ đọc /s/ (works). Còn lại đọc /z/ (plays).</p>
          </section>`;
        view.onclick = (e) => { const c = e.target.closest('[data-src]'); if (c) { src = c.dataset.src; renderHub(); } };
      }

      function draw() {
        const { def, qs, i, right, picked } = cur;
        const q = qs[i], done = picked != null;
        const opts = q.opts.map((o, k) => {
          let cls = 'opt';
          if (done) cls += k === q.a ? ' correct' : (picked === k ? ' wrong' : ' dim');
          return `<button class="${cls}" data-pick="${k}" ${done ? 'disabled' : ''}><kbd>${k + 1}</kbd><span>${def.label(q, k)}</span></button>`;
        }).join('');
        view.innerHTML = `
          <section class="session">
            <div class="s-top"><button class="icon-btn" id="dr-exit" aria-label="Thoát bài">✕</button><div class="progress"><i style="width:${Math.round((i / qs.length) * 100)}%"></i></div><span class="s-count">${i}/${qs.length}</span></div>
            <div class="s-counts"><span class="k-learn">Đúng ${right}</span><span class="s-meta">${esc(def.title)}</span></div>
            <div id="stage">${def.prompt(q)}<div class="options ${cur.id === 'stress' ? 'dotopts' : ''}">${opts}</div>
              ${done ? `<div class="result ${picked === q.a ? 'ok' : 'bad'}">${picked === q.a ? 'Chính xác' : 'Chưa đúng'}</div><div class="card reveal">${def.reveal(q)}</div>` : ''}</div>
            <div id="actions">${done ? `<button class="btn primary lg block" data-dr="next">${i + 1 >= qs.length ? 'Xem kết quả' : 'Tiếp tục'} <kbd>Enter</kbd></button>` : ''}</div>
          </section>`;
        view.onclick = onClick;
      }

      function ask() {
        draw();
        const q = cur.qs[cur.i];
        if (cur.def.autoSay && TTS.ok) TTS.speak(cur.def.autoSay(q));
      }

      function answer(k) {
        if (!cur || cur.picked != null) return;
        const q = cur.qs[cur.i], ok = k === q.a;
        cur.picked = k;
        if (ok) cur.right += 1; else cur.missed.push(q);
        cur.def.log(ok);
        draw();
        FX.feedback(ok, $('#stage .result'));
        if (cur.def.after) cur.def.after(q);
      }

      function next() {
        if (!cur || cur.picked == null) return;
        cur.i += 1;
        cur.picked = null;
        if (cur.i >= cur.qs.length) return summary();
        ask();
      }

      function summary() {
        const { def, qs, right, missed, id } = cur;
        const stars = right >= 9 ? 3 : right >= 7 ? 2 : 1;
        Store.bump('drills');
        if (stars >= 2) { FX.confetti(); FX.sound('complete'); }
        const miss = missed.map((q) => `<li>${def.missed(q)}</li>`).join('');
        view.innerHTML = `<section class="card summary"><div class="dango-wrap">${dango(stars === 3 ? 'cheer' : stars === 2 ? 'happy' : 'think', 96)}</div>
          <div class="stars" role="img" aria-label="${stars} trên 3 sao">${[1, 2, 3].map((n) => `<span class="star ${n <= stars ? 'on' : ''}" style="--i:${n}">★</span>`).join('')}</div>
          <h1>${right}/${qs.length} câu đúng</h1><p class="muted">${esc(def.title)}${stars === 3 ? ': giỏi quá!' : ': xem lại phần “Nhớ nhanh” rồi thử thêm lượt nữa nhé.'}</p>
          ${miss ? `<h2>Những câu cần xem lại</h2><ul class="misslist">${miss}</ul>` : ''}
          <div class="row wrap"><button class="btn primary" id="dr-again">Luyện lại</button><a class="btn" href="#drills">Bài khác</a></div></section>`;
        view.onclick = (e) => { if (e.target.closest('#dr-again')) play(id); };
        cur = null;
        setTimeout(() => A.checkBadges(), 400);
      }

      function onClick(e) {
        if (!cur) return;
        if (e.target.closest('[data-say]')) return;
        const b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'dr-exit') { if (confirm('Thoát bài này? Kết quả các câu đã làm vẫn được ghi nhận.')) { cur = null; location.hash = '#drills'; } return; }
        if (b.dataset.pick != null) return answer(+b.dataset.pick);
        if (b.dataset.dr === 'next') next();
      }

      function play(id) {
        const def = DEF[id];
        const qs = def.make();
        if (!qs.length) { toast('Chưa đủ dữ liệu để tạo bài này.'); return renderHub(); }
        cur = { id, def, qs, i: 0, right: 0, picked: null, missed: [] };
        ask();
      }

      document.addEventListener('keydown', (e) => {
        if (!cur || A.currentRoute() !== 'drills') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const q = cur.qs[cur.i];
        if (e.key >= '1' && e.key <= '4' && cur.picked == null && +e.key <= q.opts.length) { e.preventDefault(); answer(+e.key - 1); return; }
        if ((e.key === 'Enter' || (e.key === ' ' && tag !== 'button')) && cur.picked != null) { e.preventDefault(); next(); return; }
        if ((e.key === 'p' || e.key === 'P') && cur.def.autoSay && TTS.ok) TTS.speak(cur.def.autoSay(q));
      });

      A.routes.drills = (arg) => (DEF[arg] ? play(arg) : renderHub());
      A.NAV_OF.drills = 'practice';
      A.hubs.practice.push(() => A.hubTile('#drills', '🎯', 'Trọng âm, đuôi từ, cụm từ', 'Nghe chọn âm nhấn, đuôi -s/-ed đọc thế nào, ghép cụm make/do', 'sun'));
    });
  }

  return api;
})();
