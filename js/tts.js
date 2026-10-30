/* hiuhf0 — tts.js
 * Đọc to bằng Web Speech API có sẵn trong trình duyệt (không cần file âm thanh).
 */
const TTS = (() => {
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voices = [];
  let current = null;           // giữ tham chiếu để tránh bị GC làm mất sự kiện onend (lỗi của Chrome)
  const listeners = [];

  function load() {
    if (!ok) return;
    voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* bỏ qua */ } });
  }
  if (ok) {
    load();
    speechSynthesis.onvoiceschanged = load;
  }

  function pick() {
    const pref = Store.settings.voice;
    if (pref) {
      const v = voices.find((x) => x.name === pref);
      if (v) return v;
    }
    const us = voices.filter((v) => /en[-_]US/i.test(v.lang));
    return us.find((v) => /(Google|Samantha|Aria|Jenny|Natural)/i.test(v.name)) || us[0] || voices[0] || null;
  }

  /* ----- Nhiều giọng khi luyện nghe (Cài đặt → Giọng khi luyện nghe) ----- */
  const regionOf = (v) => { const m = /^en[-_]([A-Za-z]{2})/i.exec(v.lang || ''); return m ? m[1].toUpperCase() : ''; };
  const REGIONS = { US: 'Mỹ', GB: 'Anh', AU: 'Úc', CA: 'Canada', IN: 'Ấn Độ', IE: 'Ireland', ZA: 'Nam Phi', NZ: 'New Zealand', SG: 'Singapore', PH: 'Philippines', NG: 'Nigeria', KE: 'Kenya', HK: 'Hồng Kông' };
  const natural = (v) => /(natural|online|neural|google|premium|enhanced)/i.test(v.name);
  /** Mỗi vùng giọng giữ một giọng (ưu tiên giọng "tự nhiên"), xếp theo mã vùng để thứ tự ổn định giữa các lần mở. */
  function accentPool() {
    const best = {};
    voices.forEach((v) => { const r = regionOf(v); if (r && (!best[r] || (natural(v) && !natural(best[r])))) best[r] = v; });
    return Object.keys(best).sort().map((r) => best[r]);
  }
  const accentNames = () => accentPool().map((v) => REGIONS[regionOf(v)] || regionOf(v));
  /** Mã băm nhỏ của một chuỗi: cùng một câu luôn ra cùng một số, nên bấm nghe lại vẫn là giọng cũ. */
  function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function mixVoice(text) { const p = accentPool(); return p.length ? p[hash(String(text)) % p.length] : null; }

  function cancel() { if (ok) speechSynthesis.cancel(); }

  /** Đọc một đoạn; Promise resolve(true) khi đọc xong, resolve(false) nếu bị ngắt/không hỗ trợ.
   *  opts.mix: ở bài luyện nghe, khi người học bật "nhiều giọng" thì mỗi câu một giọng vùng khác nhau (cố định theo nội dung câu). */
  function speak(text, opts = {}) {
    if (!ok || !text) return Promise.resolve(false);
    cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = opts.voice || (opts.mix && Store.settings.listenMix ? mixVoice(text) : null) || pick();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
      u.rate = opts.rate || Store.settings.rate || 0.9;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      if (opts.onboundary) u.onboundary = opts.onboundary;
      current = u;
      speechSynthesis.speak(u);
    });
  }

  return {
    ok,
    speak,
    cancel,
    voices: () => voices,
    accentPool,
    accentNames,
    hash,
    onChange: (fn) => listeners.push(fn)
  };
})();
