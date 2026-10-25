/* hiuhf0 — fx.js
 * Hiệu ứng vui mắt: pháo giấy, lấp lánh, rung kiểu thạch, đếm số, sticker bật ra, âm thanh tự tạo
 * (Web Audio, không cần file) và rung nhẹ trên điện thoại.
 * Mọi hiệu ứng tôn trọng cài đặt "Hiệu ứng" (Đầy đủ, Nhẹ, Tắt) và chế độ "giảm chuyển động" của hệ thống.
 * Âm thanh và rung mặc định tắt, bật trong Cài đặt.
 */
const FX = (() => {
  const html = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const level = () => (mq && mq.matches ? 'off' : (Store.settings.fx || 'full'));
  const full = () => level() === 'full';
  const on = () => level() !== 'off';

  /** Áp dụng mức hiệu ứng và giao diện màu (matcha, sakura, sky) lên thẻ <html>. */
  function apply() {
    html.classList.remove('fx-full', 'fx-light', 'fx-off');
    html.classList.add('fx-' + level());
    const skin = Store.settings.skin;
    if (skin && skin !== 'matcha') html.setAttribute('data-skin', skin); else html.removeAttribute('data-skin');
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);

  /* ----- Âm thanh ----- */
  let ac = null;
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, start, dur, type, vol) {
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start;
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // [tần số, lúc bắt đầu, độ dài, kiểu sóng, âm lượng]
  const SOUNDS = {
    tap: [[880, 0, .05, 'sine', .06]],
    flip: [[392, 0, .06, 'sine', .08], [523, .05, .09, 'sine', .08]],
    correct: [[660, 0, .09, 'sine', .12], [880, .09, .18, 'sine', .12]],
    wrong: [[262, 0, .14, 'triangle', .12], [196, .1, .22, 'triangle', .12]],
    levelup: [[523, 0, .1, 'sine', .12], [659, .1, .1, 'sine', .12], [784, .2, .1, 'sine', .12], [1047, .3, .3, 'sine', .12]],
    complete: [[523, 0, .12, 'sine', .12], [659, .12, .12, 'sine', .12], [784, .24, .12, 'sine', .12], [1047, .36, .12, 'sine', .12], [1319, .5, .4, 'triangle', .12]],
    sticker: [[784, 0, .08, 'sine', .12], [988, .08, .08, 'sine', .12], [1319, .16, .34, 'triangle', .12]]
  };
  function sound(name) {
    if (!Store.settings.sound) return;
    (SOUNDS[name] || []).forEach((n) => tone(n[0], n[1], n[2], n[3], n[4]));
  }

  /** Rung nhẹ trên điện thoại (nếu người dùng bật). */
  function haptic(pattern) {
    if (Store.settings.haptics && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* bỏ qua */ } }
  }

  /* ----- Hoạt họa bằng class ----- */
  function anim(el, name) {
    if (!el || !on()) return;
    const c = 'a-' + name;
    el.classList.remove(c);
    void el.offsetWidth; // chạy lại hoạt họa từ đầu
    el.classList.add(c);
    const done = (e) => {
      if (e.target !== el) return; // bỏ qua hoạt họa của phần tử con
      el.classList.remove(c);
      el.removeEventListener('animationend', done);
    };
    el.addEventListener('animationend', done);
  }

  /** Phản hồi sau mỗi câu trả lời: đúng thì nảy kiểu thạch và lấp lánh, sai thì rung nhẹ. */
  function feedback(ok, el) {
    sound(ok ? 'correct' : 'wrong');
    haptic(ok ? 12 : [20, 40, 20]);
    anim(el, ok ? 'jelly' : 'shake');
    if (ok && full()) sparkle(el, { count: 6 });
  }

  /* ----- Lấp lánh quanh một phần tử ----- */
  function sparkle(el, o) {
    if (!on() || !el) return;
    o = o || {};
    const r = el.getBoundingClientRect();
    const n = o.count || (full() ? 9 : 4);
    const glyphs = o.glyphs || ['✨', '🌸', '⭐', '💖'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = 40 + Math.random() * 50;
      s.className = 'fx-spark';
      s.textContent = glyphs[i % glyphs.length];
      s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px;font-size:${14 + Math.random() * 10}px`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  /* ----- Pháo giấy (canvas, tự dọn sau vài giây) ----- */
  function confetti(o) {
    if (!on()) return;
    o = o || {};
    const n = o.count || (full() ? 80 : 26);
    const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.className = 'fx-canvas';
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    document.body.appendChild(cv);
    const colors = ['#ff8fb3', '#63d2a4', '#ffd84d', '#7db2f5', '#ffb86b', '#c9a7ff'];
    const ox = o.x != null ? o.x : W / 2, oy = o.y != null ? o.y : H * 0.35;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, r: 4 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0], t: ['rect', 'dot', 'petal'][(Math.random() * 3) | 0] });
    }
    const t0 = performance.now(), life = full() ? 2400 : 1600;
    (function frame(now) {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      g.globalAlpha = Math.max(0, Math.min(1, (life - t) / 600));
      parts.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.t === 'petal' ? '#ffb3cc' : p.c;
        if (p.t === 'rect') g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.t === 'dot') { g.beginPath(); g.arc(0, 0, p.r / 1.5, 0, 6.283); g.fill(); }
        else { g.beginPath(); g.ellipse(0, 0, p.r, p.r / 2, 0, 0, 6.283); g.fill(); }
        g.restore();
      });
      if (t < life) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ----- Chip nổi báo lên cấp ----- */
  function chip(text, cls) {
    if (!on()) return;
    const el = document.createElement('div');
    el.className = 'fx-chip ' + (cls || '');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  /* ----- Sticker bật ra giữa màn hình, xếp hàng nếu nhiều cái cùng lúc ----- */
  const popQ = [];
  let popping = false;
  function stickerPop(items) {
    items.forEach((i) => popQ.push(i));
    if (!popping) nextPop();
  }
  function nextPop() {
    const it = popQ.shift();
    if (!it) { popping = false; return; }
    popping = true;
    sound(it.rarity === 'epic' || it.rarity === 'legend' ? 'levelup' : 'sticker');
    haptic(it.rarity === 'legend' ? [15, 40, 15, 40, 30] : [10, 30, 10]);
    const el = document.createElement('div');
    let tm = 0;
    const close = () => { clearTimeout(tm); el.remove(); nextPop(); };
    el.className = 'sticker-pop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Sticker mới');
    el.innerHTML = `<div class="sticker-pop-card ${it.rarity ? 'r-' + it.rarity : ''}"><p class="muted">Sticker mới!${it.label ? ` <span class="rarity-tag r-${it.rarity}">${it.label}</span>` : ''}</p><div class="sticker-pop-i">${it.html}</div><h2>${it.name}</h2><p class="muted">${it.desc}</p><button class="btn primary" type="button">Tuyệt vời</button></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', close);
    tm = setTimeout(close, 4200);
    confetti({ y: window.innerHeight * 0.4, count: it.rarity === 'legend' ? 140 : it.rarity === 'epic' ? 100 : undefined });
  }

  /* ----- Đếm số chạy lên (phần tử có data-count) ----- */
  function countUp(root) {
    (root || document).querySelectorAll('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count) || 0, suf = el.dataset.suffix || '';
      if (!on() || !to) { el.textContent = to + suf; return; }
      const t0 = performance.now(), ms = 700;
      (function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ----- Dango nhỏ ở góc phiên học, đổi biểu cảm theo câu trả lời ----- */
  let buddyTimer = 0;
  function buddy(expr, ms) {
    const el = document.getElementById('buddy');
    if (!el) return;
    el.innerHTML = Mascot.svg(expr, 56);
    anim(el, 'pop');
    clearTimeout(buddyTimer);
    buddyTimer = setTimeout(() => { const b = document.getElementById('buddy'); if (b) b.innerHTML = Mascot.svg('happy', 56); }, ms || 1400);
  }

  /* ----- Họa tiết nền trôi chậm (chỉ ở mức "Đầy đủ") ----- */
  function decor() {
    const bg = document.getElementById('bg');
    if (!bg || bg.childElementCount) return;
    ['🌸', '✨', '☁️', '🍡', '⭐', '🌿', '💮', '🍃'].forEach((g, i) => {
      const s = document.createElement('span');
      s.textContent = g;
      s.style.cssText = `left:${(i * 13 + 7) % 96}%;--d:${18 + ((i * 5) % 14)}s;--delay:-${(i * 3.7) % 20}s;font-size:${16 + ((i * 7) % 16)}px`;
      bg.appendChild(s);
    });
  }

  return { apply, level, on, full, sound, haptic, anim, feedback, sparkle, confetti, chip, stickerPop, countUp, buddy, decor };
})();
