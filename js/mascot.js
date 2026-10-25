/* hiuhf0 — mascot.js
 * Dango, linh vật xiên bánh mochi hồng, trắng, xanh (khớp logo). Vẽ bằng SVG nhúng nên không cần file ảnh.
 * Mỗi biểu cảm chỉ đổi mắt, miệng và vài điểm trang trí quanh viên bánh giữa.
 * Phụ kiện (mũ, kính, khăn...) vẽ chồng lên, mở khóa bằng sticker; huy hiệu chủ đề nằm ở góc dưới bên phải.
 */
const Mascot = (() => {
  const INK = '#3b2c30';
  const FONT = 'Nunito,system-ui,sans-serif';
  const EDGE = '#e8d6c2';

  const star = (x, y, s, c = '#ffd84d') => `<path class="m-spark" d="M${x} ${y - s} L${x + s * .3} ${y - s * .3} L${x + s} ${y} L${x + s * .3} ${y + s * .3} L${x} ${y + s} L${x - s * .3} ${y + s * .3} L${x - s} ${y} L${x - s * .3} ${y - s * .3} Z" fill="${c}"/>`;
  const heart = (x, y, s, c = '#ef5b86') => `<path d="M${x} ${y + s * .9} C${x - s * 1.6} ${y - s * .2} ${x - s * .7} ${y - s * 1.1} ${x} ${y - s * .3} C${x + s * .7} ${y - s * 1.1} ${x + s * 1.6} ${y - s * .2} ${x} ${y + s * .9} Z" fill="${c}"/>`;
  const eye = (x, y, rx = 3.6, ry = 4.8, dx = 0, dy = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${x + 1.3 + dx}" cy="${y - 1.7 + dy}" r="1.4" fill="#fff"/>`;
  const line = (d, w = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bubble = (t) => `<circle cx="95" cy="38" r="13" fill="#fff" stroke="${EDGE}" stroke-width="2"/><circle cx="82" cy="54" r="3" fill="#fff" stroke="${EDGE}" stroke-width="1.5"/><text x="95" y="44" text-anchor="middle" font-size="17" font-weight="900" fill="#8a7bd8" font-family="${FONT}">${t}</text>`;
  const flower = (x, y, c, mid) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(7 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(7 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="5.2" fill="${c}"/>`).join('')}<circle r="4" fill="${mid}"/></g>`;

  const FACES = {
    happy: { eyes: eye(48, 72) + eye(72, 72), mouth: line('M53 83 Q60 91 67 83'), extra: '' },
    cheer: {
      eyes: line('M42 75 Q48 66 54 75') + line('M66 75 Q72 66 78 75'),
      mouth: `<path d="M52 82 Q60 98 68 82 Z" fill="#e8607f" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
      extra: star(18, 48, 7) + star(102, 54, 6, '#ff8fb3') + star(98, 114, 5)
    },
    sad: {
      eyes: eye(48, 74, 3.4, 4.4) + eye(72, 74, 3.4, 4.4) + line('M41 64 L54 67', 2.6) + line('M79 64 L66 67', 2.6),
      mouth: line('M53 91 Q60 83 67 91'),
      extra: '<path d="M41 80 Q37 87 41 91 Q45 87 41 80Z" fill="#8ed1fc"/>'
    },
    sleepy: {
      eyes: line('M42 73 Q48 79 54 73') + line('M66 73 Q72 79 78 73'),
      mouth: line('M56 86 Q60 89 64 86', 2.6),
      extra: `<text x="86" y="52" font-size="17" font-weight="900" fill="#8a7bd8" font-family="${FONT}">z</text><text x="99" y="37" font-size="12" font-weight="900" fill="#b3a6ee" font-family="${FONT}">z</text>`
    },
    think: {
      eyes: eye(49, 71, 3.6, 4.8, 1.2, -1) + eye(73, 71, 3.6, 4.8, 1.2, -1),
      mouth: line('M55 87 Q60 85 66 88', 2.6),
      extra: bubble('?')
    },
    wow: {
      eyes: eye(48, 72, 4.4, 5.8) + eye(72, 72, 4.4, 5.8),
      mouth: `<ellipse cx="60" cy="88" rx="4.6" ry="5.6" fill="#e8607f" stroke="${INK}" stroke-width="2.2"/>`,
      extra: star(20, 52, 6) + star(100, 48, 7, '#ff8fb3')
    },
    love: {
      eyes: heart(48, 72, 5.6) + heart(72, 72, 5.6),
      mouth: line('M53 84 Q60 91 67 84'),
      extra: heart(100, 50, 5) + heart(20, 58, 4, '#ff8fb3')
    }
  };
  const EXPR = Object.keys(FACES);

  /* Phụ kiện: tên hiển thị và hình vẽ (toạ độ cùng hệ với thân Dango, đỉnh đầu ở khoảng y = 11). */
  const ACC = {
    chef: { name: 'Mũ đầu bếp', svg: `<path d="M38 20 Q30 4 40 -2 Q42 -14 56 -12 Q64 -20 74 -12 Q88 -12 82 2 Q92 8 82 20 Z" fill="#fff" stroke="${EDGE}" stroke-width="2.4" stroke-linejoin="round"/><rect x="40" y="18" width="42" height="9" rx="3" fill="#fff" stroke="${EDGE}" stroke-width="2.4"/>` },
    pilot: { name: 'Mũ phi công', svg: '<path d="M36 26 Q36 4 60 4 Q84 4 84 26 Z" fill="#3b5ea6"/><rect x="32" y="24" width="56" height="7" rx="3.5" fill="#2a4580"/><circle cx="60" cy="15" r="5" fill="#ffd84d"/>' },
    doctor: { name: 'Mũ bác sĩ', svg: `<path d="M38 26 Q38 6 60 6 Q82 6 82 26 Z" fill="#fff" stroke="${EDGE}" stroke-width="2"/><rect x="56" y="10" width="8" height="13" fill="#ef5b6f"/><rect x="52" y="14" width="16" height="5" fill="#ef5b6f"/>` },
    grad: { name: 'Mũ tốt nghiệp', svg: '<path d="M22 14 L60 0 L98 14 L60 28 Z" fill="#3d3a4a"/><path d="M42 22 V34 Q60 42 78 34 V22" fill="#55526a"/><line x1="92" y1="15" x2="92" y2="34" stroke="#ffd84d" stroke-width="2.5"/><circle cx="92" cy="36" r="3" fill="#ffd84d"/>' },
    headset: { name: 'Tai nghe', svg: '<path d="M26 56 Q26 8 60 8 Q94 8 94 56" fill="none" stroke="#5b6bd6" stroke-width="5" stroke-linecap="round"/><rect x="18" y="52" width="14" height="24" rx="6" fill="#5b6bd6"/><rect x="88" y="52" width="14" height="24" rx="6" fill="#5b6bd6"/><path d="M26 76 Q30 92 46 94" fill="none" stroke="#5b6bd6" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="94" r="4" fill="#5b6bd6"/>' },
    crown: { name: 'Vương miện', svg: `<path d="M38 26 L42 4 L51 16 L60 0 L69 16 L78 4 L82 26 Z" fill="#ffd84d" stroke="#e0a82a" stroke-width="2" stroke-linejoin="round"/><circle cx="42" cy="4" r="3" fill="#ef5b86"/><circle cx="60" cy="0" r="3" fill="#63d2a4"/><circle cx="78" cy="4" r="3" fill="#7db2f5"/>` },
    explorer: { name: 'Mũ thám hiểm', svg: '<ellipse cx="60" cy="25" rx="38" ry="8" fill="#c9a26b"/><path d="M40 25 Q42 4 60 4 Q78 4 80 25 Z" fill="#d9b67d"/><rect x="42" y="17" width="36" height="5" fill="#8a5a2b"/>' },
    headband: { name: 'Băng đô thể thao', svg: '<path d="M30 40 Q60 22 90 40" fill="none" stroke="#ef5b6f" stroke-width="7" stroke-linecap="round"/><path d="M88 38 L98 30 M88 42 L101 43" stroke="#ef5b6f" stroke-width="4" stroke-linecap="round"/>' },
    tie: { name: 'Nơ cổ', svg: '<path d="M60 105 L49 99 L49 113 Z M60 105 L71 99 L71 113 Z" fill="#ef5b6f"/><circle cx="60" cy="105" r="4" fill="#c43c52"/>' },
    flower: { name: 'Hoa cài tai', svg: flower(88, 26, '#ffb3cc', '#ffd84d') },
    partyhat: { name: 'Mũ tiệc', svg: '<path d="M44 26 L60 -16 L76 26 Z" fill="#ff8fb3"/><path d="M50 8 L70 8 M46 18 L74 18" stroke="#fff" stroke-width="2.5" opacity=".85"/><circle cx="60" cy="-17" r="4.5" fill="#ffd84d"/>' },
    bow: { name: 'Nơ hồng', svg: '<path d="M34 24 L20 13 L20 35 Z M34 24 L48 13 L48 35 Z" fill="#ff8fb3"/><circle cx="34" cy="24" r="4.5" fill="#e0527f"/>' },
    glasses: { name: 'Kính tròn', svg: `<circle cx="48" cy="73" r="10.5" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="3"/><circle cx="72" cy="73" r="10.5" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="3"/><path d="M58.5 73 H61.5" stroke="${INK}" stroke-width="3"/>` },
    scarf: { name: 'Khăn len', svg: '<path d="M32 100 Q60 116 88 100 L88 111 Q60 126 32 111 Z" fill="#ef5b6f"/><path d="M76 112 L84 138 L70 135 Z" fill="#c43c52"/>' },
    wizard: { name: 'Mũ phù thủy', svg: '<path d="M30 26 L60 -20 L90 26 Z" fill="#6b4bd6"/><ellipse cx="60" cy="26" rx="38" ry="7" fill="#5538b8"/><circle cx="60" cy="8" r="3" fill="#ffd84d"/><circle cx="52" cy="16" r="2" fill="#fff" opacity=".8"/>' },
    santa: { name: 'Mũ ông già Noel', svg: '<path d="M38 28 Q40 2 66 0 Q82 -2 92 16 L82 28 Z" fill="#e0384d"/><rect x="34" y="23" width="54" height="9" rx="4.5" fill="#fff"/><circle cx="92" cy="15" r="6.5" fill="#fff"/>' },
    tet: { name: 'Hoa mai ngày Tết', svg: `${flower(88, 22, '#ffd84d', '#ff9f43')}${flower(34, 24, '#ffd84d', '#ff9f43')}` },
    lantern: { name: 'Đèn ông sao', svg: `<g transform="translate(96 98)"><path d="M0 -15 L4.5 -4.5 L15 -4.5 L6.5 3 L9.5 14 L0 7.5 L-9.5 14 L-6.5 3 L-15 -4.5 L-4.5 -4.5 Z" fill="#ffd84d" stroke="#e0a82a" stroke-width="2"/><circle r="3" fill="#ef5b6f"/></g>` },
    pumpkin: { name: 'Bí ngô Halloween', svg: '<ellipse cx="60" cy="14" rx="21" ry="14" fill="#ff9f43"/><path d="M52 4 Q46 14 52 26 M68 4 Q74 14 68 26 M60 0 V28" stroke="#d9791f" stroke-width="2" fill="none"/><path d="M60 0 V-6 Q64 -10 68 -8" stroke="#4a8a3a" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    heartband: { name: 'Băng đô trái tim', svg: `<path d="M34 34 Q60 18 86 34" fill="none" stroke="#ff8fb3" stroke-width="4" stroke-linecap="round"/>${heart(44, 18, 7)}${heart(76, 18, 7)}` },
    umbrella: { name: 'Ô xanh', svg: '<path d="M16 24 Q60 -36 104 24 Q94 31 84 24 Q72 31 60 24 Q48 31 36 24 Q26 31 16 24 Z" fill="#7db2f5"/><path d="M60 -8 V24" stroke="#4a78c2" stroke-width="3"/><circle cx="60" cy="-14" r="3" fill="#4a78c2"/>' },
    bell: { name: 'Mũ nhân viên khách sạn', svg: '<rect x="40" y="4" width="40" height="22" rx="7" fill="#d94a4a"/><rect x="40" y="13" width="40" height="3.5" fill="#ffd84d"/><path d="M80 12 Q92 14 92 28" stroke="#ffd84d" stroke-width="2.5" fill="none"/>' },
    bag: { name: 'Túi mua sắm', svg: '<g transform="translate(94 98)"><rect x="-11" y="-6" width="24" height="28" rx="3" fill="#ffb86b"/><path d="M-5 -6 V-12 Q1 -19 8 -12 V-6" fill="none" stroke="#c97a2b" stroke-width="2.5"/></g>' },
    speech: { name: 'Lời chào Hi', svg: `<rect x="78" y="10" width="36" height="24" rx="11" fill="#fff" stroke="${EDGE}" stroke-width="2"/><path d="M86 34 L84 42 L94 34 Z" fill="#fff" stroke="${EDGE}" stroke-width="2" stroke-linejoin="round"/><text x="96" y="27" text-anchor="middle" font-weight="900" font-size="14" fill="#5b6bd6" font-family="${FONT}">Hi!</text>` }
  };
  const ACC_KEYS = Object.keys(ACC);

  /** Trả về chuỗi SVG của Dango với biểu cảm `expr` (happy, cheer, sad, sleepy, think, wow, love).
   *  opts.acc: tên phụ kiện (xem ACC), opts.badge: emoji huy hiệu ở góc dưới bên phải. */
  function svg(expr = 'happy', size = 96, cls = '', opts = {}) {
    const f = FACES[expr] || FACES.happy;
    const acc = ACC[opts.acc];
    const top = acc ? -24 : 0, h = acc ? 174 : 150;
    const badge = opts.badge ? `<g><circle cx="98" cy="124" r="19" fill="#fff" stroke="${EDGE}" stroke-width="2.5"/><text x="98" y="132" text-anchor="middle" font-size="22">${opts.badge}</text></g>` : '';
    return `<svg class="dango dango-${expr} ${cls}" viewBox="0 ${top} 120 ${h}" width="${size}" height="${Math.round(size * h / 120)}" aria-hidden="true" focusable="false">
      <rect x="57" y="8" width="6" height="140" rx="3" fill="#d9b48a"/>
      <circle cx="60" cy="118" r="27" fill="#a8e0bd"/>
      <ellipse cx="49" cy="108" rx="7" ry="4" fill="#fff" opacity=".5" transform="rotate(-25 49 108)"/>
      <circle cx="60" cy="38" r="27" fill="#ffb3cc"/>
      <ellipse cx="48" cy="27" rx="7" ry="4" fill="#fff" opacity=".55" transform="rotate(-25 48 27)"/>
      <path d="M60 12 Q56 2 46 4 Q50 14 60 12Z" fill="#7fd1a0"/>
      <circle cx="60" cy="77" r="31" fill="#fffdf9" stroke="#f0e2d2" stroke-width="2"/>
      <ellipse cx="38" cy="85" rx="6.5" ry="4.2" fill="#ffb3c1" opacity=".8"/>
      <ellipse cx="82" cy="85" rx="6.5" ry="4.2" fill="#ffb3c1" opacity=".8"/>
      <g class="m-eyes">${f.eyes}</g>
      ${f.mouth}
      ${f.extra}
      ${acc ? `<g class="m-acc">${acc.svg}</g>` : ''}
      ${badge}
    </svg>`;
  }

  return { svg, EXPR, ACC, ACC_KEYS };
})();
