/* hiuhf0 — writing.js
 * Hỗ trợ viết tiếng Anh chạy hoàn toàn trên máy (không cần mạng, không dùng AI):
 * đếm từ, bắt các lỗi cơ bản người Việt hay mắc và giải thích bằng tiếng Việt.
 * Là hàm thuần nên kiểm thử được bằng Node (xem tests/writing.test.js).
 */
const Writing = (() => {
  const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

  const tokens = (text) => String(text).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const countWords = (text) => (String(text).match(/[A-Za-zÀ-ỹ]+(?:'[A-Za-zÀ-ỹ]+)?/g) || []).length;
  // Không dùng lookbehind để chạy được trên cả Safari cũ
  const sentences = (text) => (String(text).match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);

  /** Dạng ngôi thứ ba số ít của động từ: go → goes, study → studies, have → has. */
  function third(v) {
    if (v === 'have') return 'has';
    if (v === 'do') return 'does';
    if (v === 'be') return 'is';
    if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }

  const SV_VERBS = 'go like want need live work play eat study love make take get come see know think say read write watch drink buy help use try call meet visit wear walk run sleep start stop open close speak listen cook clean wash sing dance drive fly ride teach learn ask answer feel look give tell find keep put bring show stay turn move pay sell win lose'.split(' ');
  // "make it work", "let it go": it/him đứng sau các động từ này là tân ngữ, không phải chủ ngữ
  const OBJ_BEFORE = new Set(['let', 'make', 'help', 'see', 'watch', 'hear', 'have', 'get', 'want', 'need', 'saw', 'heard', 'made', 'let\'s']);
  const A_EXC = /^(uni|use|usu|uti|eur|one|once|ubiq|ufo|ura)/i;           // "a university", "a one-hour..."
  const AN_EXC = /^(hour|honest|honou?r|heir|mba|fbi|html|hr|sms|mri|x-?ray)/i; // "an hour", "an honest"

  const DAYS = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
  const MONTHS = '(january|february|march|april|may|june|july|august|september|october|november|december)';

  /* Bảng lỗi hay gặp: [regex, hàm sửa hoặc chuỗi, lời giải thích] */
  const COMMON = [
    [/\bI have (\d+) years? old\b/gi, 'I am $1 years old', 'Tuổi dùng “to be”, không dùng “have”: I am 20 years old.'],
    [/\bI am agree\b/gi, 'I agree', '“agree” là động từ, không cần “am”: I agree.'],
    [/\bdepend of\b/gi, 'depend on', 'Đi với giới từ “on”: depend on.'],
    [/\bdiscuss about\b/gi, 'discuss', '“discuss” đã có nghĩa là bàn về, không thêm “about”.'],
    [/\bmarried with\b/gi, 'married to', 'Kết hôn với ai dùng “married to”.'],
    [/\bmore (better|easier|bigger|faster|cheaper|harder|smaller)\b/gi, '$1', 'Từ so sánh hơn đã có đuôi -er, không thêm “more”.'],
    [/\b(am|is|are|feel|felt|was|were|'m) boring\b/gi, null, 'Nếu bạn thấy chán thì dùng “bored”; “boring” là “nhàm chán” (nói về người/vật gây chán).'],
    [/\b(am|is|are|was|were|'m) (very )?interesting in\b/gi, null, 'Thích thú về điều gì dùng “interested in”.'],
    [/\bmany (informations|advices|homeworks|knowledges|furnitures|equipments|luggages|news)\b/gi, (m) => m.replace(/^many\s+/i, 'much ').replace(/s$/i, (x, off, str) => (/news$/i.test(str) ? x : '')), 'Danh từ không đếm được, không thêm -s và không dùng “many” (dùng “much” hoặc “a lot of”).'],
    [/\b(informations|advices|homeworks|knowledges|furnitures|equipments|luggages)\b/gi, (m) => m.slice(0, -1), 'Danh từ không đếm được, không thêm -s.'],
    [/\bpeoples\b/gi, 'people', '“people” đã là số nhiều, không thêm -s.'],
    [/\bchildrens\b/gi, 'children', 'Số nhiều của child là children.'],
    [/\bmans\b/gi, 'men', 'Số nhiều của man là men.'],
    [/\bwomans\b/gi, 'women', 'Số nhiều của woman là women.'],
    [/\bfoots\b/gi, 'feet', 'Số nhiều của foot là feet.'],
    [/\btooths\b/gi, 'teeth', 'Số nhiều của tooth là teeth.'],
    [/\bpeople is\b/gi, 'people are', '“people” là số nhiều nên đi với “are”.'],
    [/\bI (no|not) (like|want|have|know|understand|eat|go|need)\b/gi, 'I do not $2', 'Phủ định động từ thường dùng “do not”: I do not like.'],
    [new RegExp('\\bon (the )?(morning|afternoon|evening)\\b', 'gi'), 'in the $2', 'Buổi trong ngày dùng “in the”: in the morning.'],
    [new RegExp('\\b(at|in) (the )?' + DAYS + '\\b', 'gi'), 'on $3', 'Thứ trong tuần dùng “on”: on Monday.'],
    [new RegExp('\\b(on|at) ' + MONTHS + '\\b', 'gi'), 'in $2', 'Tháng dùng “in”: in March.'],
    [/\bgo to home\b/gi, 'go home', '“home” đứng sau “go” không cần “to”: go home.'],
    [/\blisten (the|a|my|his|her|our|their) /gi, 'listen to $1 ', 'Nghe cái gì dùng “listen to”.'],
    [/\bI very (like|love|want)\b/gi, null, 'Không đặt “very” trước động từ. Nói “I like it very much” hoặc “I really like it”.'],
    [/\bgood in (english|math|maths|music|sports?)\b/gi, null, 'Giỏi về cái gì dùng “good at”.']
  ];

  /** Kiểm tra bài viết. Trả về danh sách gợi ý: { kind: 'error'|'tip'|'info'|'vi', msg, from, to, found, fix } */
  function check(text) {
    text = String(text);
    const out = [];
    const push = (kind, msg, from, to, fix) => out.push({ kind, msg, from, to, found: text.slice(from, to), fix: fix === undefined ? null : fix });
    if (!text.trim()) return out;

    // 1. Chữ I viết thường
    let m;
    const reI = /(^|[\s("“])(i)(?=['’][mdl]|['’]ve|['’]ll|[\s,.!?;:)"”]|$)/g;
    while ((m = reI.exec(text))) push('error', 'Đại từ “I” (tôi) luôn viết hoa.', m.index + m[1].length, m.index + m[1].length + 1, 'I');

    // 2. Đầu câu chưa viết hoa
    const reCap = /(^|[.!?]\s+|\n\s*)([a-z])/g;
    const ABBR = /\b(e\.g|i\.e|etc|mr|mrs|ms|dr|vs|a\.m|p\.m)\.\s*$/i;
    while ((m = reCap.exec(text))) {
      const at = m.index + m[1].length;
      if (m[1].trim() && ABBR.test(text.slice(Math.max(0, m.index - 6), m.index + 1))) continue;
      if (text[at] === 'i' && /^i(['’]|\s)/.test(text.slice(at))) continue; // đã báo ở luật "I"
      push('error', 'Chữ cái đầu câu cần viết hoa.', at, at + 1, text[at].toUpperCase());
    }

    // 3. Thiếu dấu câu cuối mỗi đoạn
    const re3 = /[^\n]+/g;
    while ((m = re3.exec(text))) {
      const line = m[0].replace(/\s+$/, '');
      if (line.length > 12 && countWords(line) >= 3 && !/[.!?…"”')]$/.test(line) && !VI_CHARS.test(line)) {
        push('tip', 'Câu cuối của đoạn chưa có dấu chấm (hoặc ? !).', m.index + line.length, m.index + line.length, '.');
      }
    }

    // 4. Khoảng trắng và dấu câu
    const reSp = /[ \t]+([,.!?;:])/g;
    while ((m = reSp.exec(text))) push('tip', 'Không có dấu cách trước dấu câu.', m.index, m.index + m[0].length, m[1]);
    const reNoSp = /([,;:])([A-Za-z])/g;
    while ((m = reNoSp.exec(text))) push('tip', 'Sau dấu phẩy cần một dấu cách.', m.index, m.index + 2, m[1] + ' ' + m[2]);

    // 5. Lặp từ liền kề
    const reRep = /\b([A-Za-z']+)\s+\1\b/gi;
    while ((m = reRep.exec(text))) {
      if (/^(had|that)$/i.test(m[1])) continue;
      push('tip', 'Từ bị lặp liền nhau (nếu cố ý thì bỏ qua).', m.index, m.index + m[0].length, m[1]);
    }

    // 6. Hòa hợp chủ ngữ và động từ
    const reSV = /\b(he|she|it|I|you|we|they)\s+(are|is|am|have|has|do|does|don't|doesn't|do not|does not|was|were)\b/gi;
    while ((m = reSV.exec(text))) {
      const subj = m[1].toLowerCase(), verb = m[2].toLowerCase();
      const prev = (text.slice(0, m.index).match(/([A-Za-z']+)\s*$/) || [])[1];
      const sing = subj === 'he' || subj === 'she' || subj === 'it';
      if (subj === 'it' && prev && OBJ_BEFORE.has(prev.toLowerCase())) continue;
      if (verb === 'were' && prev && /^(if|wish)$/i.test(prev)) continue; // "if he were"
      let fix = null, msg = '';
      if (sing && /^(are|have|do|don't|do not|were)$/.test(verb)) {
        const map = { are: 'is', have: 'has', do: 'does', "don't": "doesn't", 'do not': 'does not', were: 'was' };
        fix = m[1] + ' ' + map[verb];
        msg = `Với “${m[1]}” dùng “${map[verb]}”, không dùng “${m[2]}”.`;
      } else if (!sing && /^(is|has|does|was)$/.test(verb) && subj !== 'i') {
        const map = { is: 'are', has: 'have', does: 'do', was: 'were' };
        fix = m[1] + ' ' + map[verb];
        msg = `Với “${m[1]}” dùng “${map[verb]}”, không dùng “${m[2]}”.`;
      } else if (subj === 'i' && /^(is|are)$/.test(verb)) {
        fix = 'I am'; msg = 'Với “I” dùng “am”.';
      } else if (subj === 'i' && /^(has|does)$/.test(verb)) {
        fix = 'I ' + (verb === 'has' ? 'have' : 'do'); msg = `Với “I” dùng “${verb === 'has' ? 'have' : 'do'}”.`;
      } else if (subj !== 'i' && verb === 'am') {
        fix = m[1] + (sing ? ' is' : ' are'); msg = `“am” chỉ đi với “I”. Với “${m[1]}” dùng “${sing ? 'is' : 'are'}”.`;
      }
      if (fix) push('error', msg, m.index, m.index + m[0].length, fix);
    }
    const reV3 = new RegExp('\\b(he|she|it)\\s+(' + SV_VERBS.join('|') + ')\\b', 'gi');
    while ((m = reV3.exec(text))) {
      const prev = (text.slice(0, m.index).match(/([A-Za-z']+)\s*$/) || [])[1];
      if (prev && (OBJ_BEFORE.has(prev.toLowerCase()) || /^(to|will|would|can|could|should|must|may|might|not|didn't|doesn't|don't)$/i.test(prev))) continue;
      const v = m[2].toLowerCase();
      push('error', `Chủ ngữ “${m[1]}” (ngôi thứ ba số ít) thì động từ thêm -s/-es: ${third(v)}.`, m.index, m.index + m[0].length, m[1] + ' ' + third(v));
    }

    // 7. a / an
    const reA = /\b(a|an)\s+([A-Za-z][A-Za-z-]*)/gi;
    while ((m = reA.exec(text))) {
      const art = m[1], next = m[2];
      const isVowel = /^[aeiou]/i.test(next);
      if (art.toLowerCase() === 'a' && isVowel && !A_EXC.test(next)) push('error', `Trước “${next}” (âm nguyên âm) dùng “an”.`, m.index, m.index + art.length, art === 'A' ? 'An' : 'an');
      else if (art.toLowerCase() === 'an' && !isVowel && !AN_EXC.test(next)) push('error', `Trước “${next}” (âm phụ âm) dùng “a”.`, m.index, m.index + art.length, art === 'An' ? 'A' : 'a');
    }

    // 8. Lỗi hay gặp của người Việt
    COMMON.forEach(([re, fix, msg]) => {
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        let f = null;
        if (typeof fix === 'function') f = fix(m[0]);
        else if (typeof fix === 'string') f = m[0].replace(new RegExp(re.source, re.flags.replace('g', '')), fix);
        if (/^boring|am boring|is boring/i.test(m[0]) || /boring$/i.test(m[0])) f = m[0].replace(/boring$/i, 'bored');
        if (/interesting in$/i.test(m[0])) f = m[0].replace(/interesting in$/i, 'interested in');
        push('error', msg, m.index, m.index + m[0].length, f);
      }
    });

    // 9. Câu quá dài
    sentences(text).forEach((s) => {
      if (countWords(s) > 35) {
        const at = text.indexOf(s);
        push('tip', 'Câu này khá dài (hơn 35 từ). Thử tách thành hai câu cho dễ đọc.', at, at + Math.min(s.length, 40), null);
      }
    });

    // 10. Từ tiếng Việt lẫn trong bài (gợi ý tra bằng "Dịch nhanh")
    const reVi = /[A-Za-zÀ-ỹ]+/g;
    const seen = new Set();
    while ((m = reVi.exec(text))) {
      if (VI_CHARS.test(m[0]) && !seen.has(m[0].toLowerCase())) { seen.add(m[0].toLowerCase()); push('vi', `“${m[0]}” là tiếng Việt. Dùng mục “Dịch nhanh” để tìm từ tiếng Anh.`, m.index, m.index + m[0].length, null); }
    }

    // Bỏ gợi ý nằm gọn trong một gợi ý lớn hơn (ví dụ "i" nằm trong "i am agree") cho đỡ rối
    out.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from));
    return out.filter((t, i) => !out.some((u, j) => j < i && u.from <= t.from && u.to >= t.to && (u.to - u.from) > (t.to - t.from)));
  }

  /** Áp dụng một gợi ý sửa lỗi vào văn bản. */
  function apply(text, tip) {
    if (tip.fix == null) return text;
    return text.slice(0, tip.from) + tip.fix + text.slice(tip.to);
  }

  /** Số liệu cơ bản của bài viết. */
  function stats(text) {
    const ss = sentences(text);
    const words = countWords(text);
    return { words, sentences: ss.length, longest: ss.reduce((a, s) => Math.max(a, countWords(s)), 0), avg: ss.length ? Math.round((words / ss.length) * 10) / 10 : 0 };
  }

  const api = { tokens, countWords, sentences, third, check, apply, stats, VI_CHARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
