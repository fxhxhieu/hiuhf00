/* hiuhf0 — data.js
 * Đọc dữ liệu thô trong js/data/*.js rồi dựng chỉ mục.
 *
 * Mỗi dòng từ vựng:   từ|loại từ|nghĩa tiếng Việt|định nghĩa tiếng Anh|câu ví dụ
 * Dòng chủ đề:        # khóa-chủ-đề
 */
const Data = (() => {
  const LEVELS = [
    { key: 'A0', name: 'A0 · Nhập môn' },
    { key: 'A1', name: 'A1 · Sơ cấp' },
    { key: 'A2', name: 'A2 · Cơ bản' },
    { key: 'B1', name: 'B1 · Trung cấp' }
  ];

  const TOPICS = [
    { key: 'basics', vi: 'Nền tảng: đại từ, mạo từ, trợ động từ', icon: '🧱' },
    { key: 'greetings', vi: 'Chào hỏi & mẫu câu giao tiếp', icon: '👋' },
    { key: 'people', vi: 'Con người & gia đình', icon: '👪' },
    { key: 'time', vi: 'Thời gian & số đếm', icon: '⏰' },
    { key: 'food', vi: 'Ăn uống', icon: '🍜' },
    { key: 'home', vi: 'Nhà cửa & đồ dùng', icon: '🏠' },
    { key: 'body', vi: 'Cơ thể & sức khỏe', icon: '🩺' },
    { key: 'clothes', vi: 'Quần áo & màu sắc', icon: '👕' },
    { key: 'nature', vi: 'Thiên nhiên, thời tiết & động vật', icon: '🌿' },
    { key: 'school', vi: 'Học tập & giáo dục', icon: '🎓' },
    { key: 'work', vi: 'Công việc & kinh doanh', icon: '💼' },
    { key: 'travel', vi: 'Du lịch & giao thông', icon: '✈️' },
    { key: 'places', vi: 'Địa điểm & thành phố', icon: '🏙️' },
    { key: 'shopping', vi: 'Mua sắm & tiền bạc', icon: '🛍️' },
    { key: 'tech', vi: 'Công nghệ & truyền thông', icon: '💻' },
    { key: 'feelings', vi: 'Cảm xúc & tính cách', icon: '💛' },
    { key: 'leisure', vi: 'Giải trí & sở thích', icon: '🎧' },
    { key: 'society', vi: 'Xã hội & đời sống', icon: '🏛️' },
    { key: 'verbs', vi: 'Động từ thông dụng', icon: '🏃' },
    { key: 'adj', vi: 'Tính từ thông dụng', icon: '✨' },
    { key: 'func', vi: 'Từ chức năng & trạng từ', icon: '🔗' },
    { key: 'abstract', vi: 'Khái niệm & ý tưởng', icon: '💡' }
  ];
  const topicMap = {};
  TOPICS.forEach((t) => { topicMap[t.key] = t; });

  const levelIndex = (k) => LEVELS.findIndex((l) => l.key === k);
  const ipaMap = {};
  String((typeof window !== 'undefined' && window.IPA_RAW) || '').split('\n').forEach((l) => {
    const i = l.indexOf('|');
    if (i > 0) ipaMap[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });
  const raw = (typeof window !== 'undefined' && window.VOCAB_RAW) || [];
  const words = [];
  const byId = new Map();
  const warnings = [];

  raw.forEach((block, bi) => {
    let topic = 'verbs';
    String(block.text).split('\n').forEach((line, li) => {
      const t = line.trim();
      if (!t) return;
      if (t.charAt(0) === '#') {
        topic = t.slice(1).trim().split('|')[0].trim();
        if (!topicMap[topic]) warnings.push('Chủ đề lạ: ' + topic);
        return;
      }
      const p = t.split('|').map((s) => s.trim());
      if (p.length !== 5 || p.some((s) => !s)) {
        warnings.push('Dòng sai định dạng (' + block.level + ', khối ' + bi + ', dòng ' + (li + 1) + '): ' + t);
        return;
      }
      const w = { word: p[0], pos: p[1], vi: p[2], def: p[3], ex: p[4], level: block.level, topic };
      w.id = w.word.toLowerCase().replace(/\s+/g, '-') + '~' + w.pos;
      if (byId.has(w.id)) { warnings.push('Trùng từ: ' + w.id); return; }
      w.ipa = ipaMap[w.id] || ipaMap[w.word.toLowerCase()] || '';
      byId.set(w.id, w);
      words.push(w);
    });
  });

  // Giữ thứ tự: cấp độ (A1 → B1) rồi tới thứ tự khai báo trong file.
  words.forEach((w, i) => { w._o = i; });
  words.sort((a, b) => (levelIndex(a.level) - levelIndex(b.level)) || (a._o - b._o));

  // Chỉ mục tra từ (từ cấp thấp nhất được ưu tiên).
  const index = new Map();
  words.forEach((w) => { const k = w.word.toLowerCase(); if (!index.has(k)) index.set(k, w); });

  function stems(t) {
    const out = [t];
    const add = (s) => { if (s.length > 1 && out.indexOf(s) < 0) out.push(s); };
    if (t.endsWith('ies')) add(t.slice(0, -3) + 'y');
    if (t.endsWith('ied')) add(t.slice(0, -3) + 'y');
    if (t.endsWith('es')) add(t.slice(0, -2));
    if (t.endsWith('s')) add(t.slice(0, -1));
    if (t.endsWith('ed')) { add(t.slice(0, -2)); add(t.slice(0, -1)); if (/(.)\1ed$/.test(t)) add(t.slice(0, -3)); }
    if (t.endsWith('ing')) { add(t.slice(0, -3)); add(t.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(t)) add(t.slice(0, -4)); }
    if (t.endsWith('ly')) add(t.slice(0, -2));
    if (t.endsWith('er')) { add(t.slice(0, -2)); add(t.slice(0, -1)); }
    if (t.endsWith('est')) add(t.slice(0, -3));
    return out;
  }

  function lookup(token) {
    const t = String(token).toLowerCase().replace(/[’]/g, "'").replace(/'s$/, '').replace(/^'+|'+$/g, '');
    if (!t) return null;
    const list = stems(t);
    for (let i = 0; i < list.length; i++) {
      const w = index.get(list[i]);
      if (w) return w;
    }
    return null;
  }

  const texts = (typeof window !== 'undefined' && window.TEXTS) || [];

  const quiz = (typeof window !== 'undefined' && window.QUIZ) || {};
  const pairs = (typeof window !== 'undefined' && window.PAIRS) || [];
  const ipaOf = (word) => ipaMap[String(word).toLowerCase()] || '';

  return { LEVELS, TOPICS, topicMap, words, byId, lookup, texts, quiz, pairs, ipaOf, warnings };
})();
