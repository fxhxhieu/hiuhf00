/* hiuhf0 — share.js
 * Tạo ảnh PNG vuông 1080px ngay trên máy (canvas) để khoe sticker, chuỗi ngày, trang nhật ký.
 * Có Web Share thì mở bảng chia sẻ của hệ điều hành, không thì tải ảnh về.
 */
const Share = (() => {
  const W = 1080, H = 1080;
  const FONT = '"Nunito", ui-rounded, "Segoe UI", system-ui, sans-serif';
  const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif';

  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /** Viết chữ tự xuống dòng, trả về toạ độ y sau dòng cuối. */
  function wrapText(g, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/);
    let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) {
        if (++n >= maxLines) { g.fillText(line + '…', x, y); return y + lh; }
        g.fillText(line, x, y);
        y += lh;
        line = words[i];
      } else line = test;
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
  }

  /** Vẽ thẻ. o: { title, subtitle, svg (chuỗi SVG) hoặc emoji, from, to, tag, footer } → Promise<Blob> */
  async function card(o) {
    try { await document.fonts.load('900 64px Nunito'); } catch (e) { /* dùng font dự phòng */ }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, o.from || '#fff6ec');
    bg.addColorStop(1, o.to || '#ffd9e6');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // chấm màu trang trí
    ['#ffb3cc', '#a8e0bd', '#ffd84d', '#9cc7ff', '#c9a7ff'].forEach((c, i) => {
      g.globalAlpha = 0.35;
      g.fillStyle = c;
      g.beginPath();
      g.arc(120 + i * 220, i % 2 ? 60 : 1020, 46 + (i % 3) * 16, 0, 6.283);
      g.fill();
    });
    g.globalAlpha = 1;
    // thẻ trắng
    g.save();
    g.shadowColor = 'rgba(120,70,50,.28)';
    g.shadowBlur = 40;
    g.shadowOffsetY = 18;
    g.fillStyle = '#fffdf9';
    roundRect(g, 90, 90, W - 180, H - 180, 72);
    g.fill();
    g.restore();
    g.lineWidth = 6;
    g.strokeStyle = '#f1dfcb';
    roundRect(g, 90, 90, W - 180, H - 180, 72);
    g.stroke();
    g.textAlign = 'center';
    // nhãn nhỏ phía trên
    if (o.tag) {
      g.fillStyle = '#76606a';
      g.font = `800 40px ${FONT}`;
      g.fillText(o.tag, W / 2, 190);
    }
    // hình
    if (o.svg) {
      try {
        const img = await loadImg(svgUrl(o.svg));
        const h = 470, w = (img.width / img.height) * h;
        g.drawImage(img, (W - w) / 2, 215, w, h);
      } catch (e) { /* bỏ hình nếu không vẽ được */ }
    } else if (o.emoji) {
      g.font = `300px ${EMOJI_FONT}`;
      g.fillStyle = '#3b2c30';
      g.fillText(o.emoji, W / 2, 560);
    }
    // chữ
    g.fillStyle = '#3b2c30';
    g.font = `900 78px ${FONT}`;
    let y = wrapText(g, o.title || '', W / 2, 770, W - 300, 88, 2);
    if (o.subtitle) {
      g.fillStyle = '#76606a';
      g.font = `700 42px ${FONT}`;
      y = wrapText(g, o.subtitle, W / 2, y + 6, W - 320, 52, 2);
    }
    g.fillStyle = '#2a7c5a';
    g.font = `900 38px ${FONT}`;
    g.fillText(o.footer || 'hiuhf0 · học từ vựng cùng Dango', W / 2, 960);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  /** Chia sẻ ảnh qua Web Share nếu có, không thì tải về. Trả về 'shared' | 'saved' | 'cancel'. */
  async function share(o) {
    const blob = await card(o);
    if (!blob) return 'cancel';
    const file = new File([blob], 'hiuhf0.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: o.title || 'hiuhf0' }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hiuhf0-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    return 'saved';
  }

  return { card, share };
})();
