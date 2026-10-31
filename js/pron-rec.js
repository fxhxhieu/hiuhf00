/* hiuhf0 — pron-rec.js
 * Thu âm và phản hồi giọng nói cho luyện phát âm (đi cùng js/pron-ui.js):
 *   - bài đọc (tác vụ 'prod'): kiểm tra bản thu, nhận dạng giọng nói (nhiều phương án), phân tích âm tiết và cao độ, chấm âm vị nếu đã bật
 *   - bản ghi mốc lưu trên máy (IndexedDB), nghe lại, so sánh, gửi nhờ người khác nhận xét
 *   - cài đặt chấm âm vị (Azure hoặc mô hình trên máy) và Phòng thử nghiệm đo độ đáng tin của bộ chấm bằng giọng của chính bạn
 * Mọi phép đo từ micro ở đây chỉ là dấu hiệu tham khảo; xem ghi chú ở js/audio.js và js/pron-score.js.
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const U = window.PronUI;
  const { $, $$, esc, view, toast } = A;
  const { st, tg, R, frame, nextBtn, advance, aborters, guideLink, runSeq, group } = U;
  const PR = window.PRON;
  const NO_RECOG = ['stress', 'intonation', 'rhythm']; // mục tiêu mà việc máy có nghe đúng từ hay không chẳng nói lên điều gì
  const MAX_MS = { word: 7000, sentence: 15000 };
  const MAX_TRIES = 3; // nhận dạng giọng nói hay nghe nhầm nên cho thử lại, nhưng không để thử mãi cho tới khi máy chịu "đạt"
  const BLOCKING = ['short', 'silent', 'quiet', 'clip'];

  /* ================= Kho bản ghi (IndexedDB, chỉ trên máy này) ================= */
  const Archive = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('Trình duyệt không hỗ trợ IndexedDB'));
      const r = indexedDB.open('hiuhf0-rec', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const run = (mode, fn) => open().then((db) => new Promise((res, rej) => {
      const t = db.transaction('rec', mode), req = fn(t.objectStore('rec'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
    }));
    return { put: (o) => run('readwrite', (s) => s.put(o)), get: (id) => run('readonly', (s) => s.get(id)), del: (id) => run('readwrite', (s) => s.delete(id)) };
  })();
  const MAX_REC = 40;
  async function saveRec(t, blob) {
    const p = st(), id = 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    await Archive.put({ id, ts: Date.now(), text: t.text, target: t.target, mime: blob.type || 'audio/webm', blob });
    p.rec.push({ id, ts: Date.now(), text: t.text.slice(0, 120), target: t.target });
    while (p.rec.length > MAX_REC) { const old = p.rec.shift(); Archive.del(old.id).catch(() => {}); }
    Store.save();
  }

  /* ================= Một lần thu và phân tích ================= */
  async function startRec() { await A.Rec.start(); if (A.Recog.C) A.Recog.start({ alts: 5 }); }
  async function stopRec() {
    const [blob, said] = await Promise.all([A.Rec.stop(), A.Recog.C ? A.Recog.stop() : Promise.resolve('')]);
    return { blob, said: said || '', results: A.Recog.C ? (A.Recog.results || []).slice() : [] };
  }
  function refOf(t) {
    if (t.kind === 'word') return { text: t.text, words: [{ w: t.text, ipa: t.ipa || '' }] };
    const toks = t.text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    return { text: t.text, words: toks.map((w) => ({ w, ipa: Data.ipaOf(w.toLowerCase()) || '' })) };
  }
  /** Đánh giá bản thu: chất lượng, nhận dạng giọng nói, âm tiết/cao độ, chấm âm vị nếu bật. onStatus(text) báo tiến độ. */
  async function analyze(t, rec, onStatus) {
    const r = { blob: rec.blob, said: rec.said, results: rec.results, mic: null, blockMic: false, an: null, d: null, rg: null, cmp: null, sc: null };
    if (rec.blob && rec.blob.size) {
      try { r.d = await Dsp.decodeBlob(rec.blob); r.an = Dsp.analyze(r.d.x, r.d.sr); } catch (e) { r.an = null; }
    }
    if (r.an && !r.an.q.ok) { r.mic = r.an.q; r.blockMic = r.an.q.issues.some((i) => BLOCKING.indexOf(i) >= 0); }
    if (r.blockMic) return r;
    if (A.Recog.C) {
      if (t.kind === 'sentence') r.rg = { pct: A.scoreSpeech(t.text, r.said).pct, v: 'sent' };
      else {
        r.rg = Pron.judgeBest(t.text, r.results.length ? r.results : (r.said ? [[{ t: r.said, c: 0 }]] : []));
        if (t.other) r.cmp = Pron.judgeContrast(t.text, t.other, r.results[0] || (r.said ? [{ t: r.said, c: 0 }] : []));
      }
    }
    const cfg = Scorer.load();
    if (Scorer.ready(cfg) && r.d) r.sc = await Scorer.assess(r.d.x, r.d.sr, refOf(t), cfg, PR.confusions, onStatus);
    return r;
  }
  /** Máy nhận dạng có cho là đạt không (null nếu không có thông tin). */
  function recogOk(t, r) {
    if (!r.rg) return null;
    if (t.kind === 'sentence') return r.rg.pct >= 75;
    if (t.other && r.cmp) return r.cmp.v === 'target';
    return Pron.passes(r.rg);
  }
  /** Bộ chấm âm vị có báo lỗi gì ở bản thu này không (âm bị thay, thiếu, điểm thấp, hoặc cả từ bị coi là sai/thiếu). */
  const scFlag = (sc) => !!(sc && !sc.error && (sc.issues.length > 0 || sc.words.some((w) => w.err === 'Mispronunciation' || w.err === 'Omission' || w.err === 'Insertion')));

  /* ================= Vẽ phân tích giọng ================= */
  function paint(cv, r, t) {
    if (!cv || !r.d || !r.an || !r.an.span) return;
    const dpr = window.devicePixelRatio || 1, W = cv.width = Math.max(300, cv.clientWidth) * dpr, H = cv.height = 150 * dpr;
    const g = cv.getContext('2d'), cs = getComputedStyle(cv);
    const ink = cs.color, brand = cs.getPropertyValue('--brand').trim() || '#3a9d6e', bad = cs.getPropertyValue('--bad').trim() || '#d14b5a';
    const sp = r.an.span, sr = r.d.sr, x = r.d.x, a = Math.floor(sp.t0 * sr), n = Math.max(1, Math.min(x.length, Math.ceil(sp.t1 * sr)) - a), dur = n / sr;
    let pk = 0.01;
    for (let i = a; i < a + n; i++) pk = Math.max(pk, Math.abs(x[i]));
    g.clearRect(0, 0, W, H);
    const mid = 38 * dpr, amp = 34 * dpr / pk;
    g.strokeStyle = ink; g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath();
    for (let px = 0; px < W; px++) {
      const i0 = a + Math.floor((px / W) * n), i1 = a + Math.floor(((px + 1) / W) * n);
      let mn = 1, mx = -1;
      for (let i = i0; i < i1 && i < x.length; i++) { if (x[i] < mn) mn = x[i]; if (x[i] > mx) mx = x[i]; }
      if (mx >= mn) { g.moveTo(px, mid - mx * amp); g.lineTo(px, mid - mn * amp); }
    }
    g.stroke(); g.globalAlpha = 1;
    // cao độ: chấm theo bán cung so với trung vị
    const f0 = r.an.pitch ? r.an.pitch.f0 : [], hop = r.an.pitch ? r.an.pitch.hop : 0.01, v = f0.filter((f) => f > 0).sort((p, q) => p - q);
    if (v.length > 5) {
      const ref = v[v.length >> 1];
      g.fillStyle = brand;
      f0.forEach((f, i) => { if (f > 0) { const s = Math.max(-10, Math.min(10, Dsp.semis(f, ref))); g.fillRect((i * hop / dur) * W, (112 - s * 4) * dpr, 3 * dpr, 3 * dpr); } });
    }
    // âm tiết
    g.font = 12 * dpr + 'px sans-serif'; g.textAlign = 'center';
    r.an.syl.forEach((s, i) => {
      const px = (s.t / dur) * W, top = r.an.prom && r.an.prom.idx === i;
      g.strokeStyle = top ? brand : ink; g.globalAlpha = top ? 1 : 0.35; g.setLineDash([4 * dpr, 4 * dpr]); g.lineWidth = (top ? 2 : 1) * dpr;
      g.beginPath(); g.moveTo(px, 4 * dpr); g.lineTo(px, H - 16 * dpr); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.fillStyle = top ? brand : ink; g.fillText(String(i + 1), px, H - 3 * dpr);
    });
    if (t.stress && r.an.syl.length === t.stress.n) {
      const s = r.an.syl[t.stress.k], px = (s.t / dur) * W;
      g.strokeStyle = bad; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(px, 8 * dpr, 5 * dpr, 0, 6.3); g.stroke();
    }
  }

  /* ================= Lời nhận xét ================= */
  function issueText(i) {
    const exp = i.exp ? '/' + Pron.toIpa(i.exp) + '/' : '';
    const g = i.guide ? ` <a href="#pron/guide/${i.guide}">cách tạo âm</a>` : '';
    if (i.kind === 'sub') return `<li>“${esc(i.word)}”: âm ${exp} nghe như /${esc(Pron.toIpa(i.heard))}/.${g}</li>`;
    if (i.kind === 'del') return `<li>“${esc(i.word)}”: thiếu âm ${exp}.${g}</li>`;
    if (i.kind === 'ins') return `<li>“${esc(i.word)}”: thừa một âm “ơ” xen giữa các phụ âm.${g}</li>`;
    if (i.kind === 'low') return `<li>“${esc(i.word)}”: âm ${exp} điểm thấp (${Math.round(i.score)}/100).${g}</li>`;
    if (i.kind === 'omit') return `<li>“${esc(i.word)}”: máy không nghe thấy từ này.</li>`;
    return '';
  }
  function scHTML(sc) {
    if (!sc) return '';
    if (sc.error) return `<p class="notice">${esc(sc.error)}</p>`;
    const words = sc.words.map((w) => `<span class="phw"><b>${esc(w.w)}</b> ${w.ph.map((p) => `<i class="ph ${p.state}" title="${p.score != null ? Math.round(p.score) + '/100' : p.heard ? 'nghe thành /' + esc(Pron.toIpa(p.heard)) + '/' : p.state === 'del' ? 'thiếu' : ''}">${esc(Pron.toIpa(p.p))}</i>`).join('')}</span>`).join(' ');
    const list = sc.issues.map(issueText).join('');
    return `<div class="card scbox"><h3>Chấm âm vị (${sc.provider === 'azure' ? 'Azure' : 'mô hình trên máy'})</h3><div class="phrow">${words}</div>
      ${list ? `<ul class="misslist">${list}</ul>` : '<p class="hint">Chưa thấy âm nào bất thường.</p>'}
      <p class="hint">Vẫn là kết quả của máy: hãy đối chiếu với tai của bạn, và dùng Phòng thử nghiệm để biết bộ chấm này có đáng tin với giọng bạn không.</p></div>`;
  }
  const DIR = { rise: 'lên giọng', fall: 'xuống giọng', flat: 'gần như đều' };
  function dspHTML(t, r) {
    const an = r.an;
    if (!an || !an.span || NO_RECOG.indexOf(t.target) < 0) return '';
    let msg = '';
    if (t.stress) {
      if (an.syl.length === t.stress.n && an.prom) {
        const ok = an.prom.idx === t.stress.k;
        msg = `Máy thấy ${an.syl.length} âm tiết; âm tiết nổi nhất (to, dài, cao) là thứ <b>${an.prom.idx + 1}</b>, mẫu nhấn ở thứ <b>${t.stress.k + 1}</b>: ${ok ? 'khớp ✅' : 'chưa khớp. Hãy đọc to và dài hơn âm tiết thứ ' + (t.stress.k + 1) + ', đọc nhẹ các âm còn lại.'}`;
      } else msg = `Máy thấy ${an.syl.length} âm tiết trong khi từ có ${t.stress.n}: chưa đủ chắc để nhận xét trọng âm. Thử nói chậm và tách rõ từng âm tiết, trong phòng yên tĩnh.`;
    } else if (t.expect && an.shape) {
      const ok = an.shape.dir === t.expect;
      msg = `Cuối câu bạn <b>${DIR[an.shape.dir]}</b>${an.shape.range < 3 ? '; cả câu khá đều (biên độ ' + an.shape.range.toFixed(1) + ' bán cung)' : ''}. Câu này cần <b>${DIR[t.expect]}</b>: ${ok ? 'đúng ✅' : 'chưa đúng.'}`;
    } else if (t.expect) msg = 'Máy chưa đo chắc được cao độ (giọng quá nhỏ hoặc ngắt quãng). Thử nói rõ và liền mạch hơn.';
    else msg = an.shape ? `Cuối câu bạn ${DIR[an.shape.dir]}; biên độ cao độ ${an.shape.range.toFixed(1)} bán cung (dưới 3 là khá đều).` : '';
    return `<div class="card scbox"><h3>Phân tích giọng (thử nghiệm)</h3><canvas class="anal" id="pr-cv" aria-label="Sóng âm, đường cao độ và các âm tiết máy tìm thấy"></canvas>
      <p class="legend"><span>nét xám: sóng âm</span><span>chấm xanh: cao độ</span><span>vạch số: âm tiết</span>${t.stress && an.syl.length === t.stress.n ? '<span>vòng đỏ: chỗ mẫu nhấn</span>' : ''}</p><p>${msg}</p>
      <p class="hint">Máy chỉ đoán từ độ to, độ dài và cao độ, dễ sai khi có tạp âm. Dùng như một gợi ý để nghe lại, không phải kết luận.</p></div>`;
  }
  function recogHTML(t, my) {
    const r = my.r;
    if (NO_RECOG.indexOf(t.target) >= 0) return '';
    if (!A.Recog.C) return '<p class="muted center">Trình duyệt này không nhận dạng giọng nói được: hãy nghe lại bản ghi, so với mẫu và tự đánh giá bên dưới.</p>';
    if (t.kind === 'sentence') {
      const sc = A.scoreSpeech(t.text, r.said);
      const words = sc.T.map((w, k) => `<span class="${sc.matched[k] ? 'okw' : 'missw'}">${esc(w)}</span>`).join(' ');
      return `<div class="result ${sc.pct >= 75 ? 'ok' : 'bad'}">${sc.pct >= 75 ? 'Đọc tốt' : 'Chưa đủ'}: khớp ${sc.pct}% số từ<div class="sc-words">${words}</div><small>Máy nghe được: “${esc(r.said)}”</small></div>`;
    }
    const j = r.rg, ok = recogOk(t, r);
    const line = j.v === 'match' ? `Máy nghe được “${esc(j.heard)}”: khớp.` : j.v === 'alt' ? `Máy nghe được “${esc(j.heard)}”, từ cần đọc nằm trong các phương án gần nhất: gần đúng.`
      : j.v === 'other' ? `Máy nghe thành “${esc(j.heard)}”.${r.cmp && r.cmp.v === 'other' ? ` Đó chính là từ còn lại trong cặp: dấu hiệu bạn đang đọc gần với âm kia. ${guideLink(t.target)}` : ''}` : 'Máy không nghe được gì.';
    return `<div class="result ${ok ? 'ok' : j.v === 'none' ? '' : 'bad'}">${line}<small>Lần thử ${my.tries}/${MAX_TRIES}. Nhận dạng giọng nói hay nghe nhầm hoặc tự sửa cho đúng, nên đây chỉ là một dấu hiệu.</small></div>`;
  }

  /* ================= Tác vụ đọc (thu âm) ================= */
  R.prod = (S, t) => {
    const my = { phase: 'ready', tries: 0, r: null, url: null, ev: { recog: null, dsp: null, sc: null, prov: '', other: [] }, self: false, saved: false, valid: false, committed: false, status: '', raf: 0, timer: 0 };
    const clean = () => {
      cancelAnimationFrame(my.raf); clearTimeout(my.timer);
      if (my.phase === 'rec') { A.Rec.stop(); if (A.Recog.C) A.Recog.stop(); }
      if (my.valid && !my.skipped) commit(); // thoát giữa chừng vẫn giữ những lần đọc đã có kết quả
      my.phase = 'gone';
      if (my.url) URL.revokeObjectURL(my.url);
    };
    aborters.push(clean);
    const can = A.Rec.supported;
    const say = (extra) => `data-say="${esc(t.text)}" data-mix="always" data-seed="${S.i}" ${extra || ''}`;

    const draw = () => {
      if (my.phase === 'gone') return;
      const rec = my.phase === 'rec', busy = my.phase === 'busy', res = my.phase === 'result';
      const prompt = `<div class="prompt"><div class="fc-word ${t.kind === 'sentence' ? 'long' : ''}">${esc(t.text)}</div>${t.ipa ? `<span class="ipa">/${esc(t.ipa)}/</span>` : ''}${t.vi ? `<p class="muted">${esc(t.vi)}</p>` : ''}
        <div class="row wrap center-row"><button class="btn" ${say()}>🔊 Nghe mẫu</button><button class="btn" ${say('data-rate="0.55"')}>🐢 Nghe chậm</button>${guideLink(t.target)}</div>
        ${t.note ? `<p class="hint center">${esc(t.note)}</p>` : ''}${t.other ? `<p class="hint center">Máy sẽ xem bạn đọc “${esc(t.text)}” hay bị nghe thành “${esc(t.other)}”.</p>` : ''}</div>`;
      let body = prompt;
      if (!can) body += '<p class="notice">Trình duyệt không cho dùng micro. Mở trang bằng https hoặc localhost trên Chrome, Edge hoặc Safari.</p>';
      else if (rec) body += '<div class="prompt"><p class="muted center">Đang thu… hãy đọc, rồi bấm “Dừng”.</p><div class="meter" aria-hidden="true"><i id="pr-meter"></i></div><button class="btn primary lg rec" data-pr="rec">⏹ Dừng</button></div>';
      else if (busy) body += `<p class="muted center">Đang phân tích${my.status ? ': ' + esc(my.status) : '…'}</p>`;
      else if (my.tries >= MAX_TRIES) body += `<p class="hint center">Đã đủ ${MAX_TRIES} lần thử cho mục này. Nghe lại mẫu rồi sang mục tiếp theo; mai luyện lại sẽ dễ hơn.</p>`;
      else body += `<div class="prompt"><button class="btn primary lg" data-pr="rec">${res ? '🎤 Đọc lại' : '🎤 Bấm và đọc'}</button></div>`;
      if (res) {
        const r = my.r;
        if (r.blockMic) body += `<div class="result bad">Bản thu chưa tốt nên lần này không tính. ${esc(Pron.micAdvice(r.mic))}</div>`;
        else {
          if (r.mic) body += `<p class="notice">${esc(Pron.micAdvice(r.mic))}</p>`;
          body += recogHTML(t, my) + scHTML(r.sc) + dspHTML(t, r);
          body += `<div class="card"><p class="muted center">Nghe lại bản ghi của bạn rồi nghe mẫu: có giống nhau không?</p>
            <div class="row wrap center-row"><button class="btn" data-pr="mine">▶ Bản ghi của bạn</button><button class="btn" ${say()}>▶ Mẫu</button>${my.saved ? '<span class="muted">Đã lưu mốc ✓</span>' : '<button class="btn ghost" data-pr="save">💾 Lưu làm bản ghi mốc</button>'}</div>
            ${my.self ? '<p class="muted center">Đã ghi nhận tự đánh giá ✓</p>' : '<div class="row wrap center-row"><button class="btn" data-pr="selfok">Giống mẫu</button><button class="btn" data-pr="selfbad">Chưa giống</button></div>'}</div>`;
        }
      }
      const foot = my.tries ? `<div class="act2"><button class="btn primary lg" data-pr="done"><span>${S.i + 1 >= S.tasks.length ? 'Xong' : 'Tiếp tục'}</span></button><button class="btn lg" data-pr="skip"><span>Bỏ qua mục này</span></button></div>` : '<div class="row wrap center-row"><button class="btn ghost sm" data-pr="skip">Bỏ qua mục này</button></div>';
      frame(S, body, foot);
      if (rec) meterLoop();
      if (res && my.r && !my.r.blockMic) { const cv = $('#pr-cv'); if (cv) paint(cv, my.r, t); }
    };
    const meterLoop = () => { const el = $('#pr-meter'); if (!el || my.phase !== 'rec') return; el.style.width = Math.round(A.Rec.level() * 100) + '%'; my.raf = requestAnimationFrame(meterLoop); };

    const stop = async () => {
      clearTimeout(my.timer); cancelAnimationFrame(my.raf);
      my.phase = 'busy'; my.status = ''; draw();
      let r;
      try {
        const rec = await stopRec();
        if (my.phase === 'gone') return;
        r = await analyze(t, rec, (s) => { my.status = s; if (my.phase === 'busy') draw(); });
      } catch (e) { r = { blockMic: true, mic: { issues: ['silent'] } }; }
      if (my.phase === 'gone') return;
      my.r = r;
      if (my.url) URL.revokeObjectURL(my.url);
      my.url = r.blob && r.blob.size ? URL.createObjectURL(r.blob) : null;
      if (!r.blockMic) {
        my.tries += 1; my.valid = true;
        const ok = recogOk(t, r);
        if (ok != null && NO_RECOG.indexOf(t.target) < 0) my.ev.recog = my.ev.recog === true ? true : ok;
        if (r.an && t.stress && r.an.syl.length === t.stress.n && r.an.prom) my.ev.dsp = r.an.prom.idx === t.stress.k;
        if (r.an && t.expect && r.an.shape) my.ev.dsp = r.an.shape.dir === t.expect;
        if (r.sc && !r.sc.error) {
          // Bằng chứng cho nhóm đang luyện chỉ có khi nhóm đó là cặp âm; lỗi bộ chấm thấy ở nhóm khác được ghi như bằng chứng phụ
          const ok = group(t.target) ? !r.sc.issues.some((i) => i.target === t.target) : null;
          if (ok != null) my.ev.sc = my.ev.sc === true ? true : ok;
          my.ev.prov = r.sc.provider;
          my.ev.other = r.sc.issues.map((i) => i.target).filter((id, k, a) => id && id !== t.target && a.indexOf(id) === k);
        }
      }
      my.phase = 'result';
      draw();
    };
    const start = async () => {
      try { await startRec(); } catch (e) { toast('Không mở được micro. Hãy cho phép trình duyệt dùng micro (cần https hoặc localhost).'); return; }
      if (my.phase === 'gone') { A.Rec.stop(); if (A.Recog.C) A.Recog.stop(); return; }
      my.phase = 'rec'; draw();
      my.timer = setTimeout(() => { if (my.phase === 'rec') stop(); }, MAX_MS[t.kind] || 7000);
    };
    /** Ghi bằng chứng một lần cho cả mục (kể cả khi đọc lại nhiều lần): kết quả tốt nhất của các lần thử. */
    const commit = () => {
      if (!my.valid || my.committed) return;
      my.committed = true;
      const p = st(), now = Date.now();
      if (my.ev.recog != null) Pron.record(p, t.target, 'prod', my.ev.recog, now);
      if (my.ev.dsp != null) Pron.record(p, t.target, 'prod', my.ev.dsp, now, 0.3);
      if (my.ev.sc != null) Pron.record(p, t.target, my.ev.prov, my.ev.sc, now);
      my.ev.other.forEach((id) => Pron.record(p, id, my.ev.prov, false, now, 0.5));
      if (my.ev.recog != null) Store.logSpeak(my.ev.recog);
      S.read = (S.read || 0) + 1;
      Store.save();
    };
    S.handle = async (e) => {
      const b = e.target.closest('[data-pr]');
      if (!b) return;
      const a = b.dataset.pr;
      if (a === 'rec') { if (my.phase === 'rec') return stop(); if (my.phase === 'busy' || my.tries >= MAX_TRIES) return; return start(); }
      if (a === 'mine' && my.url) { const au = new Audio(my.url); au.play().catch(() => {}); return; }
      if (a === 'save' && my.r && my.r.blob) { try { await saveRec(t, my.r.blob); my.saved = true; toast('Đã lưu bản ghi mốc trên máy này.'); draw(); } catch (err) { toast('Không lưu được bản ghi: ' + (err && err.message ? err.message : 'lỗi kho lưu trữ')); } return; }
      if ((a === 'selfok' || a === 'selfbad') && !my.self) { my.self = true; Pron.record(st(), t.target, 'self', a === 'selfok'); Store.save(); draw(); return; }
      if (a === 'done') { commit(); return advance(); }
      if (a === 'skip') { my.skipped = true; return advance(); }
    };
    draw();
  };

  /* ================= Bản ghi của tôi ================= */
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('vi-VN');
  async function playRec(id) {
    const rec = await Archive.get(id);
    if (!rec) return toast('Không tìm thấy bản ghi này.');
    const url = URL.createObjectURL(rec.blob), au = new Audio(url);
    await new Promise((res) => { au.onended = res; au.onerror = res; au.play().catch(res); });
    URL.revokeObjectURL(url);
  }
  async function shareRecs(ids) {
    const metas = st().rec.filter((r) => ids.indexOf(r.id) >= 0), files = [];
    for (const m of metas) {
      const rec = await Archive.get(m.id);
      if (rec) files.push(new File([rec.blob], 'hiuhf0-' + m.text.replace(/[^a-z0-9]+/gi, '-').slice(0, 30) + '-' + fmtDate(m.ts).replace(/\//g, '-') + (/mp4|aac/.test(rec.mime) ? '.m4a' : '.webm'), { type: rec.mime }));
    }
    const text = 'Nhờ bạn nghe và nhận xét phát âm giúp mình. Các mục: ' + metas.map((m) => '“' + m.text + '”').join(', ') + '. Bạn để ý giúp: âm cuối, âm th/s/sh, trọng âm và nhịp có tự nhiên không? Cảm ơn bạn!';
    if (navigator.canShare && files.length && navigator.canShare({ files })) { try { await navigator.share({ files, title: 'Nhờ nhận xét phát âm', text }); } catch (e) { /* người dùng đóng hộp chia sẻ */ } return; }
    if (navigator.clipboard) { try { await navigator.clipboard.writeText(text); } catch (e) { /* bỏ qua */ } }
    files.forEach((f) => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    toast('Trình duyệt này không chia sẻ trực tiếp được: đã tải file về và chép lời nhắn, hãy gửi cho người nhận xét.');
  }
  async function renderRec() {
    const list = st().rec.slice().reverse();
    let usage = '';
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); usage = `Đang dùng khoảng ${(e.usage / 1048576).toFixed(1)} MB trong tổng ${(e.quota / 1048576).toFixed(0)} MB mà trình duyệt cho phép.`; } } catch (e) { /* bỏ qua */ }
    const byText = {};
    list.forEach((r) => { (byText[r.text] = byText[r.text] || []).push(r); });
    view.innerHTML = `
      <a class="back" href="#pron">‹ Luyện phát âm</a>
      <section class="page-h"><h1>Bản ghi của tôi</h1><p class="muted">Giọng của bạn ở các mốc khác nhau. Nghe lại bản cũ rồi bản mới để thấy mình tiến bộ. Bản ghi chỉ nằm trong trình duyệt này, không có trong file sao lưu và không gửi đi đâu nếu bạn không chọn chia sẻ.</p></section>
      ${list.length ? '' : '<div class="empty card">Chưa có bản ghi nào. Khi luyện đọc, bấm “💾 Lưu làm bản ghi mốc” sau một lần đọc bạn thấy tốt.</div>'}
      ${Object.keys(byText).map((txt) => `<section class="card"><div class="card-h"><h2>${esc(txt)}</h2>${byText[txt].length > 1 ? `<button class="btn sm" data-cmp="${esc(txt)}">⏮ Nghe cũ rồi mới</button>` : ''}</div>
        ${byText[txt].map((r) => `<div class="row between wrap recrow"><label class="field row"><input type="checkbox" data-sel="${r.id}"><span>${fmtDate(r.ts)}</span></label><span><button class="btn sm" data-play="${r.id}">▶ Nghe</button><button class="btn sm ghost" data-del="${r.id}" aria-label="Xóa bản ghi">🗑</button></span></div>`).join('')}</section>`).join('')}
      ${list.length ? `<div class="row wrap"><button class="btn primary" id="rec-share">📤 Gửi các bản đã chọn nhờ nhận xét</button></div><p class="hint">${esc(usage)} Tối đa ${MAX_REC} bản; bản cũ nhất tự bị xóa khi đầy.</p>` : ''}`;
    view.onclick = async (e) => {
      const pl = e.target.closest('[data-play]'), del = e.target.closest('[data-del]'), cmp = e.target.closest('[data-cmp]');
      if (pl) return playRec(pl.dataset.play).catch(() => toast('Không phát được bản ghi.'));
      if (del) { if (!confirm('Xóa bản ghi này?')) return; const p = st(); p.rec = p.rec.filter((r) => r.id !== del.dataset.del); Store.save(); await Archive.del(del.dataset.del).catch(() => {}); return renderRec(); }
      if (cmp) { const rs = (byText[cmp.dataset.cmp] || []).slice().sort((a, b) => a.ts - b.ts); const a = rs[0], b = rs[rs.length - 1]; toast('Nghe bản ' + fmtDate(a.ts) + ', rồi bản ' + fmtDate(b.ts)); await playRec(a.id).catch(() => {}); await new Promise((r) => setTimeout(r, 500)); return playRec(b.id).catch(() => {}); }
      if (e.target.closest('#rec-share')) { const ids = $$('[data-sel]:checked').map((x) => x.dataset.sel); if (!ids.length) return toast('Hãy chọn ít nhất một bản ghi.'); shareRecs(ids); }
    };
  }

  /* ================= Cài đặt chấm âm vị ================= */
  function renderScore() {
    const c = Scorer.load();
    view.innerHTML = `
      <a class="back" href="#pron">‹ Luyện phát âm</a>
      <section class="page-h"><h1>Chấm âm vị (tùy chọn)</h1><p class="muted">Mặc định chỉ dùng nhận dạng giọng nói của trình duyệt, vốn không sinh ra để chấm phát âm. Bạn có thể bật thêm một bộ chấm theo từng âm vị. Hãy kiểm tra độ chính xác ở <a href="#pron/lab">Phòng thử nghiệm</a> trước khi tin điểm của nó.</p></section>
      <section class="card form">
        <label class="field row"><input type="radio" name="prov" value="off" ${c.provider === 'off' ? 'checked' : ''}><span><b>Tắt</b></span></label>
        <label class="field row"><input type="radio" name="prov" value="azure" ${c.provider === 'azure' ? 'checked' : ''}><span><b>Azure AI Speech</b> (cần khóa của bạn)</span></label>
        <label class="field row"><input type="radio" name="prov" value="local" ${c.provider === 'local' ? 'checked' : ''}><span><b>Mô hình chạy trên máy</b> (tải một lần, khoảng 355 MB)</span></label>
      </section>
      <section class="card form" id="sc-azure">
        <h2>Azure AI Speech</h2>
        <p class="hint">Âm thanh của bạn được gửi tới Microsoft để chấm. Dịch vụ tính phí theo thời gian âm thanh (xem bảng giá hiện hành trên Azure). Khóa chỉ lưu trong trình duyệt này, không nằm trong file sao lưu. Ai dùng chung máy này cũng đọc được khóa.</p>
        <label class="field"><span>Khóa (Speech resource key)</span><input class="input" type="password" id="sc-key" autocomplete="off" value="${esc(c.key)}"></label>
        <label class="field"><span>Vùng (ví dụ eastus, southeastasia)</span><input class="input" id="sc-region" value="${esc(c.region)}" autocapitalize="off" spellcheck="false"></label>
        <label class="field"><span>Hoặc địa chỉ tài nguyên (không bắt buộc)</span><input class="input" id="sc-endpoint" placeholder="https://ten-tai-nguyen.cognitiveservices.azure.com" value="${esc(c.endpoint)}" autocapitalize="off" spellcheck="false"></label>
        <div class="row wrap"><button class="btn" id="sc-test">Thử kết nối</button><span class="muted" id="sc-test-out"></span></div>
      </section>
      <section class="card form" id="sc-local">
        <h2>Mô hình trên máy</h2>
        <p class="hint">Âm thanh không rời khỏi máy. Lần đầu bấm “Tải mô hình”, trình duyệt tải thư viện từ jsDelivr và mô hình từ Hugging Face (khoảng 355 MB) rồi lưu lại. Mô hình huấn luyện trên giọng Mỹ bản xứ nên có thể kém chính xác với giọng người Việt nói tiếng Anh; phép thử ở Phòng thử nghiệm sẽ cho bạn biết. Máy yếu có thể chậm hoặc hết bộ nhớ.</p>
        <div class="row wrap"><button class="btn" id="sc-load">Tải mô hình</button><span class="muted" id="sc-load-out">${Scorer.localReady() ? 'Đã tải xong, sẵn sàng.' : ''}</span></div>
        <details><summary>Nâng cao</summary>
          <label class="field"><span>Địa chỉ thư viện Transformers.js</span><input class="input" id="sc-lib" value="${esc(c.lib)}" autocapitalize="off" spellcheck="false"></label>
          <label class="field"><span>Mô hình (Hugging Face)</span><input class="input" id="sc-model" value="${esc(c.model)}" autocapitalize="off" spellcheck="false"></label></details>
      </section>
      <div class="row wrap"><button class="btn primary lg" id="sc-save">Lưu cài đặt</button></div>
      <p class="hint">Việc gọi Azure và tải mô hình chưa được thử với dịch vụ thật trong quá trình phát triển, chỉ được kiểm thử bằng dữ liệu mẫu theo tài liệu. Nếu gặp lỗi, thông báo sẽ hiện ngay ở bước chấm.</p>`;
    const read = () => ({ provider: ($('input[name=prov]:checked') || {}).value || 'off', key: $('#sc-key').value.trim(), region: $('#sc-region').value.trim() || 'eastus', endpoint: $('#sc-endpoint').value.trim(), lib: $('#sc-lib').value.trim() || Scorer.DEFAULT.lib, model: $('#sc-model').value.trim() || Scorer.DEFAULT.model });
    view.onclick = async (e) => {
      if (e.target.closest('#sc-save')) { const ok = Scorer.save(read()); toast(ok ? 'Đã lưu cài đặt chấm âm vị.' : 'Không lưu được (trình duyệt chặn lưu trữ).'); return; }
      if (e.target.closest('#sc-test')) {
        const out = $('#sc-test-out'), cfg = read();
        if (!cfg.key) { out.textContent = 'Hãy nhập khóa trước.'; return; }
        out.textContent = 'Đang thử…';
        const r = await Scorer.azureTest(cfg);
        out.textContent = r.msg;
        return;
      }
      if (e.target.closest('#sc-load')) {
        const out = $('#sc-load-out'), cfg = read();
        if (!confirm('Tải thư viện (jsDelivr) và mô hình khoảng 355 MB (Hugging Face) về trình duyệt này? Nên dùng Wi-Fi.')) return;
        out.textContent = 'Đang tải…';
        try { await Scorer.localLoad(cfg, (s) => { out.textContent = s; }); out.textContent = 'Đã tải xong, sẵn sàng.'; } catch (err) { out.textContent = 'Lỗi: ' + String((err && err.message) || err).slice(0, 160); }
      }
    };
  }

  /* ================= Phòng thử nghiệm ================= */
  // Từ cần đọc đúng nằm ở vị trí này trong cặp (từ có âm người Việt hay thiếu)
  const LAB_T = { 'th-s': 0, 'l-r': 1, 'fin-stop': 1, 'fin-s': 1, 'init-s': 1, 'iy-ih': 0, 'sh-s': 0, 'fin-cluster': 1 };
  function labTasks() {
    const out = [];
    Object.keys(LAB_T).forEach((id) => {
      const g = group(id), p = U.pick(g.pairs), i = LAB_T[id];
      const base = { type: 'lab', target: id, kind: 'word', text: p[i * 2], ipa: p[i * 2 + 1], other: p[(1 - i) * 2] };
      out.push(Object.assign({ say: p[i * 2], correct: true }, base), Object.assign({ say: p[(1 - i) * 2], correct: false }, base));
    });
    return U.shuffle(out);
  }
  R.lab = (S, t) => {
    const my = { phase: 'ready', r: null, status: '', timer: 0, raf: 0 };
    const clean = () => { clearTimeout(my.timer); cancelAnimationFrame(my.raf); if (my.phase === 'rec') { A.Rec.stop(); if (A.Recog.C) A.Recog.stop(); } my.phase = 'gone'; };
    aborters.push(clean);
    const draw = () => {
      if (my.phase === 'gone') return;
      const rec = my.phase === 'rec', busy = my.phase === 'busy', res = my.phase === 'result' && my.r && !my.r.blockMic;
      const ins = t.correct ? 'Đọc từ này <b>cho đúng nhất</b> có thể:' : `Lần này <b>cố ý đọc nhầm</b>: coi như bạn muốn nói “${esc(t.text)}” nhưng lại đọc thành:`;
      let body = `<div class="prompt"><p class="muted center">${ins}</p><div class="fc-word">${esc(t.say)}</div><button class="btn" data-say="${esc(t.say)}">🔊 Nghe</button></div>`;
      if (rec) body += '<div class="prompt"><div class="meter" aria-hidden="true"><i id="pr-meter"></i></div><button class="btn primary lg rec" data-pr="rec">⏹ Dừng</button></div>';
      else if (busy) body += `<p class="muted center">Đang phân tích${my.status ? ': ' + esc(my.status) : '…'}</p>`;
      else body += `<div class="prompt"><button class="btn primary lg" data-pr="rec">${my.phase === 'result' ? '🎤 Thu lại' : '🎤 Bấm và đọc'}</button></div>`;
      if (my.phase === 'result' && my.r) {
        if (my.r.blockMic) body += `<div class="result bad">Bản thu chưa tốt nên chưa tính. ${esc(Pron.micAdvice(my.r.mic))}</div>`;
        else body += `<div class="result">Đã ghi nhận.<small>Máy nghe được: “${esc(my.r.said || '(không nghe được gì)')}”${my.r.sc && my.r.sc.error ? ' · ' + esc(my.r.sc.error) : ''}</small></div>`;
      }
      frame(S, body, res ? nextBtn(S) : '');
      if (rec) { const loop = () => { const el = $('#pr-meter'); if (!el || my.phase !== 'rec') return; el.style.width = Math.round(A.Rec.level() * 100) + '%'; my.raf = requestAnimationFrame(loop); }; loop(); }
    };
    const stop = async () => {
      clearTimeout(my.timer); my.phase = 'busy'; draw();
      let r;
      try { r = await analyze(t, await stopRec(), (s) => { my.status = s; if (my.phase === 'busy') draw(); }); } catch (e) { r = { blockMic: true, mic: { issues: ['silent'] } }; }
      if (my.phase === 'gone') return;
      my.r = r; my.phase = 'result';
      if (!r.blockMic) {
        const ok = recogOk(t, r);
        const row = { target: t.target, correct: t.correct, recog: ok == null ? null : !ok, sc: r.sc && !r.sc.error ? scFlag(r.sc) : null, prov: r.sc && !r.sc.error ? r.sc.provider : '' };
        S.rows = (S.rows || []).filter((x) => x.i !== S.i).concat(Object.assign(row, { i: S.i }));
      }
      draw();
    };
    S.handle = async (e) => {
      const b = e.target.closest('[data-pr="rec"]');
      if (!b) return;
      if (my.phase === 'rec') return stop();
      if (my.phase === 'busy') return;
      try { await startRec(); } catch (err) { toast('Không mở được micro.'); return; }
      if (my.phase === 'gone') { A.Rec.stop(); if (A.Recog.C) A.Recog.stop(); return; }
      my.phase = 'rec'; draw();
      my.timer = setTimeout(() => { if (my.phase === 'rec') stop(); }, 6000);
    };
    draw();
  };
  const pctTxt = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '–');
  function labReport(S) {
    const rows = S.rows || [];
    const stat = (key) => {
      const a = rows.filter((r) => r.correct && r[key] != null), b = rows.filter((r) => !r.correct && r[key] != null);
      const fa = a.filter((r) => r[key]).length, hit = b.filter((r) => r[key]).length;
      return { nA: a.length, nB: b.length, fa, hit, sens: b.length ? hit / b.length : null, spec: a.length ? 1 - fa / a.length : null };
    };
    const srcs = [['Nhận dạng giọng nói của trình duyệt', stat('recog')]];
    const prov = rows.find((r) => r.prov);
    if (prov) srcs.push([prov.prov === 'azure' ? 'Azure AI Speech' : 'Mô hình trên máy', stat('sc')]);
    const verdict = (s) => (s.sens == null || s.spec == null ? 'chưa đủ dữ liệu' : s.sens >= 0.7 && s.spec >= 0.8 ? 'tạm dùng được với giọng của bạn' : s.spec < 0.8 ? 'hay báo lỗi nhầm khi bạn đọc đúng: chưa nên tin' : 'bỏ sót nhiều lỗi thật: chưa nên tin');
    view.innerHTML = `
      <section class="card summary"><h1>Kết quả thử nghiệm</h1>
        <p class="muted">Bạn đã thu ${rows.length} lần (đọc đúng và cố ý đọc sai). Mỗi nguồn chấm được hỏi: “có lỗi không?”. Phát hiện = tỉ lệ lần đọc sai cố ý mà nguồn đó báo lỗi. Báo nhầm = tỉ lệ lần đọc đúng mà vẫn bị báo lỗi.</p>
        ${srcs.map(([name, s]) => `<div class="card"><h2>${esc(name)}</h2><div class="stats"><div class="stat"><b>${pctTxt(s.hit, s.nB)}</b><span>phát hiện lỗi thật (${s.hit}/${s.nB})</span></div><div class="stat"><b>${pctTxt(s.fa, s.nA)}</b><span>báo nhầm (${s.fa}/${s.nA})</span></div></div><p>Nhận xét: <b>${verdict(s)}</b>.</p></div>`).join('')}
        <p class="hint">Chỉ khoảng ${rows.length} lần thu nên con số còn rất thô: thử lại vài lần ở các hôm khác nhau trước khi kết luận. Ngưỡng “tạm dùng được” là phát hiện từ 70% và báo nhầm dưới 20%, do tôi đặt ra, không phải chuẩn khoa học. ${prov ? '' : 'Chưa bật bộ chấm âm vị nào, hãy vào <a href="#pron/score">Chấm âm vị</a> để so sánh.'}</p>
        <div class="row wrap"><a class="btn primary" href="#pron">Về trang chính</a><button class="btn" id="lab-again">Thử lại</button></div></section>`;
    view.onclick = (e) => { if (e.target.closest('#lab-again')) startLab(); };
  }
  function startLab() {
    if (!A.Rec.supported) { toast('Trình duyệt này không cho dùng micro.'); return; }
    runSeq({ title: 'Phòng thử nghiệm', tasks: labTasks(), back: '#pron/lab', onFinish: labReport });
  }
  function renderLab() {
    const c = Scorer.load();
    view.innerHTML = `
      <a class="back" href="#pron">‹ Luyện phát âm</a>
      <section class="page-h"><h1>Phòng thử nghiệm</h1><p class="muted">Các bộ chấm tự động có thể sai nhiều với giọng bạn. Bài thử này đo thẳng điều đó: bạn đọc 8 từ cho đúng và đọc 8 lần cố ý sai (ví dụ muốn nói “think” nhưng đọc thành “sink”). Rồi xem mỗi bộ chấm bắt được bao nhiêu lỗi thật và báo nhầm bao nhiêu lần đọc đúng.</p></section>
      <section class="card"><p>Bộ chấm âm vị hiện tại: <b>${c.provider === 'off' ? 'chưa bật (chỉ so sánh nhận dạng giọng nói của trình duyệt)' : c.provider === 'azure' ? 'Azure AI Speech' : 'Mô hình trên máy'}</b>. <a href="#pron/score">Đổi</a></p>
        <p class="hint">Mất khoảng 6 phút, cần micro và phòng yên tĩnh. Nếu bật Azure, âm thanh các lần thu được gửi tới Microsoft.</p>
        <div class="row wrap"><button class="btn primary lg" id="lab-go">Bắt đầu thử nghiệm</button></div></section>`;
    view.onclick = (e) => { if (e.target.closest('#lab-go')) startLab(); };
  }

  U.routes = { rec: renderRec, lab: renderLab, score: renderScore };
  U.Archive = Archive;
  U.analyze = analyze;
  U.recogOk = recogOk;
  U.refOf = refOf;
  U.labTasks = labTasks;
  U.labReport = labReport;
});
