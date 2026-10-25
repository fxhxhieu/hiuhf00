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
    { key: 'abstract', vi: 'Khái niệm & ý tưởng', icon: '💡' },
    { key: 'ielts', vi: 'IELTS: từ học thuật thường gặp', icon: '🎯' },
    { key: 'toeic', vi: 'TOEIC: công sở & kinh doanh', icon: '📈' },
    { key: 'animals', vi: 'Động vật', icon: '🐶' },
    { key: 'weather', vi: 'Thời tiết & khí hậu', icon: '⛅' },
    { key: 'numbers', vi: 'Số đếm & thứ tự', icon: '🔢' },
    { key: 'calendar', vi: 'Lịch & thời gian', icon: '📅' },
    { key: 'sports', vi: 'Thể thao', icon: '⚽' },
    { key: 'jobs', vi: 'Nghề nghiệp', icon: '🧑‍🍳' },
    { key: 'vehicles', vi: 'Phương tiện', icon: '🚌' },
    { key: 'routine', vi: 'Thói quen hằng ngày', icon: '🌅' },
    { key: 'sit-restaurant', vi: 'Tình huống: nhà hàng & gọi món', icon: '🍽️' },
    { key: 'sit-hotel', vi: 'Tình huống: khách sạn', icon: '🏨' },
    { key: 'sit-airport', vi: 'Tình huống: sân bay', icon: '🛫' },
    { key: 'sit-doctor', vi: 'Tình huống: đi khám bệnh', icon: '🏥' },
    { key: 'sit-directions', vi: 'Tình huống: hỏi đường', icon: '🧭' },
    { key: 'sit-phone', vi: 'Tình huống: gọi điện thoại', icon: '📞' },
    { key: 'mine', vi: 'Từ của tôi', icon: '⭐' }
  ];
  const topicMap = {};
  TOPICS.forEach((t) => { topicMap[t.key] = t; });

  const levelIndex = (k) => LEVELS.findIndex((l) => l.key === k);
  const idOf = (word, pos) => word.toLowerCase().replace(/\s+/g, '-') + '~' + pos;
  const ipaMap = {};
  String((typeof window !== 'undefined' && window.IPA_RAW) || '').split('\n').forEach((l) => {
    const i = l.indexOf('|');
    if (i > 0) ipaMap[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });
  const emojiMap = {};
  String((typeof window !== 'undefined' && window.EMOJI_RAW) || '').split('\n').forEach((l) => {
    const i = l.indexOf('|');
    if (i > 0) emojiMap[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
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
      w.id = idOf(w.word, w.pos);
      if (byId.has(w.id)) { warnings.push('Trùng từ: ' + w.id); return; }
      w.ipa = ipaMap[w.id] || ipaMap[w.word.toLowerCase()] || '';
      w.emoji = emojiMap[w.id] || (w.pos === 'n' ? emojiMap[w.word.toLowerCase()] : '') || '';
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

  /* Từ người học tự thêm (cấp 'MY', chủ đề 'mine'): nạp lại toàn bộ mỗi lần danh sách thay đổi.
   * Không nằm trong bài lộ trình nào; ứng dụng tự ghim để được học sớm. */
  function setCustom(list) {
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (!w.custom) continue;
      byId.delete(w.id);
      if (index.get(w.word.toLowerCase()) === w) index.delete(w.word.toLowerCase());
      words.splice(i, 1);
    }
    (list || []).forEach((c) => {
      const w = { word: c.word, pos: c.pos, vi: c.vi, def: c.def || '', ex: c.ex || '', level: 'MY', topic: 'mine', tags: [], custom: true, ipa: '', emoji: '' };
      w.id = idOf(w.word, w.pos);
      if (byId.has(w.id)) return;
      w.ipa = ipaMap[w.id] || ipaMap[w.word.toLowerCase()] || '';
      byId.set(w.id, w);
      words.push(w);
      if (!index.has(w.word.toLowerCase())) index.set(w.word.toLowerCase(), w);
    });
  }

  /* ----- Lộ trình: chia kho từ thành các bài nhỏ (mỗi bài khoảng 10 từ) ----- */
  const A0_UNITS = [
    ['Chào hỏi cơ bản', '👋', 'hi,bye,good morning,good afternoon,good evening,good night,how are you,i am fine,nice to meet you,see you later'],
    ['Lịch sự khi giao tiếp', '🙏', 'thank you,you are welcome,excuse me,i am sorry,no problem,of course,have a nice day,okay,welcome,thank,excuse'],
    ['Hỏi và trả lời', '💬', 'what is your name,how old are you,where are you from,how much is it,i do not know,i do not understand,say it again,speak slowly'],
    ['Cách xưng hô', '🧑‍🤝‍🧑', 'sir,mr,mrs,ms,mom,dad,i,you,he,she'],
    ['Đại từ nhân xưng', '🙋', 'it,we,they,me,him,her,us,them'],
    ['Từ chỉ sở hữu', '🏷️', 'my,your,his,its,our,their,whose'],
    ['Mạo từ & từ chỉ định', '👉', 'a,an,the,this,that,these,those'],
    ['Động từ to be và have', '🧩', 'am,is,are,was,were,been,has,had,does,did'],
    ['Trợ động từ', '⚙️', 'can,could,will,would,should,must,might'],
    ['Số 13 đến 90', '🔢', 'thirteen,fourteen,fifteen,sixteen,seventeen,eighteen,nineteen,forty,sixty,seventy,eighty,ninety,fourth,fifth,quarter'],
    ['Vài từ hữu ích', '✨', 'now,than,out,off,gray,left,straight']
  ];
  const units = [];
  const unitById = new Map();
  const unitOfWord = new Map(); // id từ → bài lộ trình chứa từ đó
  (function buildUnits() {
    const a0 = words.filter((w) => w.level === 'A0');
    const byText = new Map();
    a0.forEach((w) => { byText.set(w.word.toLowerCase(), w); });
    const used = new Set();
    A0_UNITS.forEach((u, i) => {
      const ids = [];
      u[2].split(',').forEach((t) => { const w = byText.get(t.trim()); if (w && !used.has(w.id)) { used.add(w.id); ids.push(w.id); } });
      if (i === A0_UNITS.length - 1) a0.forEach((w) => { if (!used.has(w.id)) { used.add(w.id); ids.push(w.id); } });
      if (ids.length) units.push({ id: 'a0-' + (i + 1), level: 'A0', topic: 'basics', title: u[0], icon: u[1], ids });
    });
    LEVELS.forEach((l) => {
      if (l.key === 'A0') return;
      TOPICS.forEach((t) => {
        const ws = words.filter((w) => w.level === l.key && w.topic === t.key);
        if (!ws.length) return;
        const chunks = [];
        for (let i = 0; i < ws.length; i += 10) chunks.push(ws.slice(i, i + 10));
        if (chunks.length > 1 && chunks[chunks.length - 1].length < 5) { const last = chunks.pop(); chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(last); }
        chunks.forEach((c, k) => units.push({ id: l.key.toLowerCase() + '-' + t.key + '-' + (k + 1), level: l.key, topic: t.key, title: t.vi + (chunks.length > 1 ? ' (' + (k + 1) + '/' + chunks.length + ')' : ''), icon: t.icon, ids: c.map((w) => w.id) }));
      });
    });
    units.forEach((u, i) => { u.n = i + 1; unitById.set(u.id, u); u.ids.forEach((id) => unitOfWord.set(id, u)); });
  })();

  /* ----- Phân loại lại chủ đề để hiển thị (không đổi cách chia bài của Lộ trình) -----
   * =chủ-đề|từ1, từ2   chuyển từ sang chủ đề đó
   * +chủ-đề|từ1, từ2   thêm nhãn chủ đề phụ (một từ có thể thuộc nhiều chủ đề)
   * Viết "từ~loại" khi cần chỉ rõ một loại từ; không có "~" thì áp dụng cho mọi loại từ cùng chữ. */
  words.forEach((w) => { w.tags = []; });
  String((typeof window !== 'undefined' && window.TOPICMAP_RAW) || '').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.charAt(0) === '/') return;
    const mode = t.charAt(0), i = t.indexOf('|');
    if ((mode !== '=' && mode !== '+') || i < 0) { warnings.push('Dòng phân loại sai: ' + t); return; }
    const topic = t.slice(1, i).trim();
    if (!topicMap[topic]) { warnings.push('Chủ đề lạ trong phân loại: ' + topic); return; }
    t.slice(i + 1).split(',').forEach((tok) => {
      tok = tok.trim();
      if (!tok) return;
      const [word, pos] = tok.split('~');
      const hit = pos ? [byId.get(idOf(word, pos))].filter(Boolean) : words.filter((w) => w.word.toLowerCase() === word.toLowerCase());
      if (!hit.length) { warnings.push('Phân loại: không thấy từ ' + tok); return; }
      hit.forEach((w) => { if (mode === '=') w.topic = topic; else if (w.topic !== topic && w.tags.indexOf(topic) < 0) w.tags.push(topic); });
    });
  });
  const inTopic = (w, key) => w.topic === key || w.tags.indexOf(key) >= 0;

  /* ----- Thông tin mở rộng: ví dụ thêm, cụm kết hợp, họ từ, ghi chú (js/data/extras.js) ----- */
  String((typeof window !== 'undefined' && window.EXTRAS_RAW) || '').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.charAt(0) === '/') return;
    const p = t.split('|').map((s) => s.trim());
    if (p.length !== 6) { warnings.push('Dòng thông tin thêm sai định dạng: ' + t.slice(0, 40)); return; }
    const w = byId.get(p[0]);
    if (!w) { warnings.push('Thông tin thêm: không thấy từ ' + p[0]); return; }
    const list = (s, sep) => (s ? s.split(sep).map((x) => x.trim()).filter(Boolean) : []);
    w.more = { ex: [p[1], p[2]].filter(Boolean), coll: list(p[3], ';'), fam: list(p[4], ','), note: p[5] };
  });

  /* ----- Động từ bất quy tắc (js/data/irregular.js) ----- */
  const irregular = [];
  const irrMap = {};
  String((typeof window !== 'undefined' && window.IRREGULAR_RAW) || '').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.charAt(0) === '/') return;
    const p = t.split('|').map((s) => s.trim());
    if (p.length !== 4 || p.some((s) => !s)) { warnings.push('Dòng động từ bất quy tắc sai định dạng: ' + t); return; }
    const v = { base: p[0], v2: p[1], v3: p[2], vi: p[3] };
    irregular.push(v);
    irrMap[v.base] = v;
  });

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

  return { LEVELS, TOPICS, topicMap, words, byId, lookup, texts, quiz, pairs, ipaOf, units, unitById, unitOfWord, idOf, setCustom, inTopic, irregular, irrMap, warnings };
})();
