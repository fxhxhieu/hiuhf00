/* hiuhf0 — mascot.js
 * Dango, linh vật xiên bánh mochi hồng, trắng, xanh (khớp logo). Vẽ bằng SVG nhúng nên không cần file ảnh.
 * Mỗi biểu cảm chỉ đổi mắt, miệng và vài điểm trang trí quanh viên bánh giữa.
 */
const Mascot = (() => {
  const INK = '#3b2c30';
  const FONT = 'Nunito,system-ui,sans-serif';

  const star = (x, y, s, c = '#ffd84d') => `<path class="m-spark" d="M${x} ${y - s} L${x + s * .3} ${y - s * .3} L${x + s} ${y} L${x + s * .3} ${y + s * .3} L${x} ${y + s} L${x - s * .3} ${y + s * .3} L${x - s} ${y} L${x - s * .3} ${y - s * .3} Z" fill="${c}"/>`;
  const heart = (x, y, s, c = '#ef5b86') => `<path d="M${x} ${y + s * .9} C${x - s * 1.6} ${y - s * .2} ${x - s * .7} ${y - s * 1.1} ${x} ${y - s * .3} C${x + s * .7} ${y - s * 1.1} ${x + s * 1.6} ${y - s * .2} ${x} ${y + s * .9} Z" fill="${c}"/>`;
  const eye = (x, y, rx = 3.6, ry = 4.8, dx = 0, dy = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${x + 1.3 + dx}" cy="${y - 1.7 + dy}" r="1.4" fill="#fff"/>`;
  const line = (d, w = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bubble = (t) => `<circle cx="95" cy="38" r="13" fill="#fff" stroke="#e8d6c2" stroke-width="2"/><circle cx="82" cy="54" r="3" fill="#fff" stroke="#e8d6c2" stroke-width="1.5"/><text x="95" y="44" text-anchor="middle" font-size="17" font-weight="900" fill="#8a7bd8" font-family="${FONT}">${t}</text>`;

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

  /** Trả về chuỗi SVG của Dango với biểu cảm `expr` (happy, cheer, sad, sleepy, think, wow, love). */
  function svg(expr = 'happy', size = 96, cls = '') {
    const f = FACES[expr] || FACES.happy;
    return `<svg class="dango dango-${expr} ${cls}" viewBox="0 0 120 150" width="${size}" height="${Math.round(size * 1.25)}" aria-hidden="true" focusable="false">
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
    </svg>`;
  }

  return { svg, EXPR };
})();
