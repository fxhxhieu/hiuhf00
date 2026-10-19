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

  function cancel() { if (ok) speechSynthesis.cancel(); }

  /** Đọc một đoạn; Promise resolve(true) khi đọc xong, resolve(false) nếu bị ngắt/không hỗ trợ. */
  function speak(text, opts = {}) {
    if (!ok || !text) return Promise.resolve(false);
    cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = pick();
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
    onChange: (fn) => listeners.push(fn)
  };
})();
