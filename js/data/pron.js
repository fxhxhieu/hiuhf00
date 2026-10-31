/* hiuhf0 — dữ liệu luyện phát âm: nhóm mục tiêu, bài đo, nhầm lẫn thường gặp, từ đọc nhẹ và hướng dẫn tạo âm.
 * Các nhóm cặp âm (id, cat, imp) nằm ở js/data/pairs.js; ở đây là phần còn lại.
 *
 * Hướng dẫn tạo âm (guides): mỗi mục có
 *   id, ipa, name, cat, targets (mã nhóm cặp âm liên quan),
 *   how (các bước), vs (so với tiếng Việt), check (cách tự kiểm tra bằng thao tác thật), fix (khi nghe sai), words (từ ví dụ),
 *   pic (sơ đồ miệng, nếu có): tongue (các điểm từ gốc lưỡi tới đầu lưỡi), lips, jaw (0 khép … 1 mở), contact, velum, voiced, air.
 * Sơ đồ chỉ mang tính minh họa, không chính xác về giải phẫu. Nội dung nên được giáo viên ngữ âm xem lại. */
window.PRON = {
  cats: [
    { key: 'vowel', vi: 'Nguyên âm', icon: '🅰️' },
    { key: 'cons', vi: 'Phụ âm đầu', icon: '👅' },
    { key: 'final', vi: 'Âm cuối', icon: '🔚' },
    { key: 'cluster', vi: 'Cụm phụ âm', icon: '🧩' },
    { key: 'prosody', vi: 'Trọng âm, nhịp, ngữ điệu', icon: '🥁' }
  ],
  // Mục tiêu không phải cặp âm
  extra: [
    { id: 'stress', cat: 'prosody', imp: 1.5, vi: 'Trọng âm từ', guide: 'stress' },
    { id: 'ending', cat: 'final', imp: 1.3, vi: 'Đuôi -s và -ed', guide: 'fin' },
    { id: 'rhythm', cat: 'prosody', imp: 1.2, vi: 'Từ đọc nhẹ và nhịp câu', guide: 'weak' },
    { id: 'intonation', cat: 'prosody', imp: 1, vi: 'Ngữ điệu', guide: 'intonation' }
  ],
  // Bài đo: nhóm cặp âm nào được nghe thử và mỗi nhóm bao nhiêu câu
  diag: {
    groups: ['fin-voice', 'fin-stop', 'fin-s', 'fin-cluster', 'init-s', 'iy-ih', 'ae-eh', 'th-s', 'l-r', 'sh-s'],
    perGroup: 2,
    stress: 4,
    ending: 4,
    produce: ['th-s', 'l-r', 'fin-stop', 'fin-s', 'init-s', 'iy-ih']
  },
  // Nhầm lẫn thường gặp: âm cần có (exp) bị nghe thành (heard) thì ghi vào nhóm nào. Dùng mã âm kiểu ARPAbet rút gọn (xem js/pron.js).
  confusions: [
    { exp: 'th', heard: ['s', 't', 'f', 'd'], target: 'th-s', guide: 'th' },
    { exp: 'dh', heard: ['d', 'z', 'v'], target: 'dh-d', guide: 'dh' },
    { exp: 'sh', heard: ['s', 'ch'], target: 'sh-s', guide: 'sh' },
    { exp: 's', heard: ['sh'], target: 'sh-s', guide: 's' },
    { exp: 'ch', heard: ['sh', 'jh'], target: 'sh-ch', guide: 'ch' },
    { exp: 'jh', heard: ['y', 'ch', 'zh'], target: 'jh-y', guide: 'jh' },
    { exp: 'l', heard: ['r', 'n'], target: 'l-r', guide: 'l' },
    { exp: 'r', heard: ['l', 'w'], target: 'l-r', guide: 'r' },
    { exp: 'v', heard: ['b', 'w', 'f'], target: 'b-v', guide: 'v' },
    { exp: 'b', heard: ['v'], target: 'b-v', guide: 'v' },
    { exp: 'iy', heard: ['ih'], target: 'iy-ih', guide: 'iy' },
    { exp: 'ih', heard: ['iy', 'eh'], target: 'iy-ih', guide: 'ih' },
    { exp: 'eh', heard: ['ae', 'ih'], target: 'ae-eh', guide: 'eh' },
    { exp: 'ae', heard: ['eh', 'ah', 'aa'], target: 'ae-eh', guide: 'ae' },
    { exp: 'ah', heard: ['aa', 'ae'], target: 'aa-ah', guide: 'ah' },
    { exp: 'aa', heard: ['ah', 'ao'], target: 'aa-ah', guide: 'aa' },
    { exp: 'uh', heard: ['uw'], target: 'uh-uw', guide: 'uh' },
    { exp: 'uw', heard: ['uh'], target: 'uh-uw', guide: 'uw' },
    { exp: 'ey', heard: ['eh'], target: 'ey-eh', guide: 'eh' },
    { exp: 'ng', heard: ['n', 'g'], target: 'n-ng', guide: 'ng' },
    { exp: 'n', heard: ['ng'], target: 'n-ng', guide: 'ng' }
  ],
  // Từ chức năng đọc nhẹ trong câu (dạng yếu, IPA). Dùng cho bài Nhịp câu.
  weak: {
    a: 'ə', an: 'ən', the: 'ðə', to: 'tə', and: 'ən', of: 'əv', for: 'fɚ', at: 'ət', from: 'frəm', as: 'əz', but: 'bət', or: 'ɚ', than: 'ðən',
    can: 'kən', could: 'kəd', would: 'wəd', should: 'ʃəd', must: 'məst', will: 'wəl', have: 'həv', has: 'həz', had: 'həd', do: 'də', does: 'dəz',
    is: 'z', are: 'ɚ', was: 'wəz', were: 'wɚ', be: 'bi', been: 'bɪn', am: 'əm', you: 'jə', your: 'jɚ', he: 'i', she: 'ʃi', him: 'ɪm', her: 'ɚ', them: 'ðəm',
    us: 'əs', there: 'ðɚ', some: 'səm', that: 'ðət', my: 'mɪ', our: 'ɑr', his: 'ɪz', their: 'ðɛr', its: 'ɪts', we: 'wi', they: 'ðeɪ', me: 'mi', in: 'ɪn', on: 'ɑn', with: 'wɪð', by: 'baɪ', if: 'ɪf', so: 'soʊ'
  },
  guides: [
    // ---------- Nguyên âm ----------
    {
      id: 'iy', ipa: 'i', name: 'Âm /i/ (see, feel)', cat: 'vowel', targets: ['iy-ih'],
      how: ['Nâng thân lưỡi cao ở phía trước, gần chạm vòm miệng.', 'Kéo môi sang hai bên như đang mỉm cười, hàm khép.', 'Giữ âm DÀI và căng, không buông lỏng giữa chừng.'],
      vs: 'Gần giống “i” tiếng Việt nhưng dài và căng hơn. Lỗi hay gặp: rút ngắn thành /ɪ/ nên “sheep” nghe như “ship”.',
      check: ['Soi gương: hai khóe môi kéo ngang.', 'Đọc “seeee” kéo dài một nhịp, rồi so với “sit” chỉ ngắn một nhịp: độ dài phải khác rõ.'],
      fix: 'Nếu bị nghe là /ɪ/: kéo môi ngang hơn và kéo dài âm gấp đôi.',
      words: ['see', 'feel', 'green', 'sheep'],
      pic: { tongue: [[170, 142], [160, 122], [146, 96], [124, 68], [100, 54], [78, 56], [66, 68]], lips: 'spread', jaw: 0.1, voiced: true }
    },
    {
      id: 'ih', ipa: 'ɪ', name: 'Âm /ɪ/ (sit, ship)', cat: 'vowel', targets: ['iy-ih', 'eh-ih'],
      how: ['Lưỡi thấp hơn và lùi hơn một chút so với /i/.', 'Môi thả lỏng, không kéo ngang.', 'Đọc NGẮN và nhẹ.'],
      vs: 'Nằm giữa “i” và “ê” của tiếng Việt, ngắn hơn “i”. Lỗi hay gặp: đọc thành /i/ dài.',
      check: ['Soi gương: môi thả lỏng, không như đang cười.', 'So “sit” (ngắn) với “seat” (dài): độ dài khác rõ.'],
      fix: 'Nếu bị nghe là /i/: bớt kéo môi ngang và đọc ngắn lại.',
      words: ['sit', 'ship', 'big', 'fill'],
      pic: { tongue: [[170, 142], [160, 124], [146, 100], [124, 74], [100, 60], [78, 62], [64, 74]], lips: 'neutral', jaw: 0.2, voiced: true }
    },
    {
      id: 'eh', ipa: 'ɛ', name: 'Âm /ɛ/ (bed, red)', cat: 'vowel', targets: ['ae-eh', 'ey-eh', 'eh-ih'],
      how: ['Miệng mở vừa, lưỡi ở giữa phía trước.', 'Môi thả lỏng, hàm hạ nhẹ.', 'Đọc ngắn.'],
      vs: 'Giống “e” tiếng Việt nhưng ngắn hơn. Lỗi hay gặp: đọc thành /æ/ (bad ↔ bed) hoặc kéo thành /eɪ/ (let ↔ late).',
      check: ['Soi gương: miệng mở khoảng một ngón tay, môi không kéo ngang.'],
      fix: 'Nếu nghe giống /æ/: ngậm miệng lại một chút. Nếu nghe giống /eɪ/: dừng sớm, đừng trượt lên.',
      words: ['bed', 'red', 'men', 'pen'],
      pic: { tongue: [[170, 142], [160, 126], [146, 106], [124, 84], [100, 72], [78, 72], [62, 82]], lips: 'neutral', jaw: 0.45, voiced: true }
    },
    {
      id: 'ae', ipa: 'æ', name: 'Âm /æ/ (cat, bad)', cat: 'vowel', targets: ['ae-eh', 'ae-ah'],
      how: ['Hạ hàm, mở miệng rộng hơn khi đọc /ɛ/.', 'Lưỡi phẳng và thấp ở phía trước.', 'Âm nằm giữa “a” và “e”.'],
      vs: 'Không có trong tiếng Việt. Người Việt hay đọc thành “e” (bad → bed) hoặc “a” (cat → cot).',
      check: ['Mở miệng sao cho đặt vừa hai ngón tay chồng lên nhau giữa hai hàm răng.', 'So “bad” với “bed”: miệng của “bad” phải mở rộng hơn rõ.'],
      fix: 'Nếu nghe giống /ɛ/: hạ hàm thấp hơn. Nếu nghe giống “a”: đưa lưỡi ra trước và bớt tròn môi.',
      words: ['cat', 'bad', 'man', 'hand'],
      pic: { tongue: [[170, 142], [160, 130], [146, 118], [124, 104], [100, 96], [78, 92], [60, 96]], lips: 'neutral', jaw: 0.85, voiced: true }
    },
    {
      id: 'ah', ipa: 'ʌ', name: 'Âm /ʌ/ (cup, but)', cat: 'vowel', targets: ['ae-ah', 'aa-ah'],
      how: ['Lưỡi thả lỏng ở giữa miệng, hơi thấp.', 'Miệng mở vừa, môi không tròn.', 'Đọc ngắn và nhanh.'],
      vs: 'Gần với “ă” hoặc “ơ” ngắn của tiếng Việt, không có âm giống hệt. Lỗi hay gặp: đọc thành /ɑ/ (cup → cop) hoặc /æ/ (cut → cat).',
      check: ['Soi gương: môi không tròn, miệng mở vừa, hàm không hạ quá thấp.'],
      fix: 'Nếu nghe giống /ɑ/: ngậm miệng bớt lại và đọc ngắn hơn.',
      words: ['cup', 'but', 'luck', 'bus'],
      pic: { tongue: [[170, 142], [160, 126], [146, 104], [126, 90], [104, 86], [80, 92], [62, 102]], lips: 'neutral', jaw: 0.5, voiced: true }
    },
    {
      id: 'ax', ipa: 'ə', name: 'Âm /ə/ (about, banana)', cat: 'vowel', targets: ['rhythm', 'stress'],
      how: ['Thả lỏng hoàn toàn lưỡi và môi ở giữa miệng.', 'Đọc rất ngắn, yếu và nhẹ hơn các âm xung quanh.'],
      vs: 'Giống “ơ” rất ngắn. Là âm phổ biến nhất của tiếng Anh, nhưng người Việt hay đọc rõ theo chữ viết (a → “a”, o → “o”) nên câu nghe nặng nề, thiếu nhịp.',
      check: ['Đọc “banana”: âm đầu và âm cuối phải yếu hơn hẳn âm giữa.', 'Ghi âm và nghe lại: các âm tiết không nhấn có nhẹ và ngắn không?'],
      fix: 'Đừng cố đọc rõ mọi chữ cái: ở âm tiết không nhấn, nguyên âm thường thành /ə/.',
      words: ['about', 'banana', 'today', 'support'],
      pic: { tongue: [[170, 142], [160, 124], [146, 100], [126, 82], [104, 76], [80, 82], [62, 94]], lips: 'neutral', jaw: 0.35, voiced: true }
    },
    {
      id: 'aa', ipa: 'ɑ', name: 'Âm /ɑ/ (hot, father)', cat: 'vowel', targets: ['aa-ah'],
      how: ['Hạ hàm thấp, mở miệng rộng.', 'Lưỡi thấp, phần sau hơi nhô lên.', 'Môi không tròn.'],
      vs: 'Gần “a” tiếng Việt nhưng miệng mở rộng và lưỡi lùi hơn. Lỗi hay gặp: tròn môi thành /ɔ/ hoặc đọc ngắn thành /ʌ/.',
      check: ['Soi gương: miệng mở rộng, môi không chu.'],
      fix: 'Nếu nghe giống /ʌ/: mở miệng rộng hơn và kéo dài một chút.',
      words: ['hot', 'father', 'stop', 'lock'],
      pic: { tongue: [[170, 142], [160, 120], [150, 98], [130, 92], [104, 102], [80, 110], [60, 116]], lips: 'neutral', jaw: 0.9, voiced: true }
    },
    {
      id: 'uh', ipa: 'ʊ', name: 'Âm /ʊ/ (book, full)', cat: 'vowel', targets: ['uh-uw'],
      how: ['Môi tròn nhẹ và lỏng.', 'Lưỡi cao ở phía sau nhưng thả lỏng hơn /u/.', 'Đọc ngắn.'],
      vs: 'Gần “u” tiếng Việt nhưng ngắn và lỏng hơn. Lỗi hay gặp: kéo dài thành /u/ (full ↔ fool).',
      check: ['So “full” (ngắn) với “fool” (dài, môi chu rõ).'],
      fix: 'Nếu nghe giống /u/: bớt chu môi và đọc ngắn lại.',
      words: ['book', 'good', 'full', 'put'],
      pic: { tongue: [[170, 142], [162, 116], [152, 84], [134, 62], [108, 72], [84, 92], [66, 108]], lips: 'round', jaw: 0.3, voiced: true }
    },
    {
      id: 'uw', ipa: 'u', name: 'Âm /u/ (food, blue)', cat: 'vowel', targets: ['uh-uw'],
      how: ['Chu môi tròn và đẩy ra trước.', 'Lưỡi cao ở phía sau, hàm khép.', 'Giữ âm dài.'],
      vs: 'Gần “u” tiếng Việt, nhưng dài và tròn môi rõ hơn.',
      check: ['Soi gương: môi chu ra phía trước.'],
      fix: 'Nếu nghe giống /ʊ/: chu môi hơn và kéo dài.',
      words: ['food', 'blue', 'school', 'two'],
      pic: { tongue: [[170, 142], [164, 112], [156, 78], [140, 54], [112, 64], [86, 88], [68, 106]], lips: 'round', jaw: 0.15, voiced: true }
    },
    // ---------- Phụ âm ----------
    {
      id: 'th', ipa: 'θ', name: 'Âm /θ/ (think, three)', cat: 'cons', targets: ['th-s'],
      how: ['Đặt đầu lưỡi nhẹ giữa hai hàm răng (hoặc chạm mép răng cửa trên).', 'Thổi hơi ra qua khe hẹp giữa lưỡi và răng.', 'Không rung cổ họng.'],
      vs: 'Tiếng Việt không có âm này. Người Việt hay đọc thành “t”, “th” kiểu Việt (bật hơi) hoặc “s”.',
      check: ['Đặt tay lên cổ: không thấy rung.', 'Soi gương: thấy đầu lưỡi thò nhẹ giữa hai hàm răng.'],
      fix: 'Nghe giống “s”: lưỡi còn nằm sau răng, hãy đẩy ra trước. Nghe giống “t”: lưỡi đang chặn hơi, hãy để hơi thoát liên tục.',
      words: ['think', 'three', 'mouth', 'thanks'],
      pic: { tongue: [[170, 142], [158, 122], [140, 106], [114, 98], [86, 94], [56, 90], [42, 88]], lips: 'neutral', jaw: 0.35, contact: [46, 86], air: [36, 84, 14, 84], voiced: false }
    },
    {
      id: 'dh', ipa: 'ð', name: 'Âm /ð/ (this, mother)', cat: 'cons', targets: ['dh-d'],
      how: ['Đặt lưỡi như khi đọc /θ/: đầu lưỡi nhẹ giữa hai hàm răng.', 'Cho dây thanh rung khi hơi đi qua.'],
      vs: 'Tiếng Việt không có âm này. Người Việt hay đọc thành “d” hoặc “z”.',
      check: ['Đặt tay lên cổ: có rung (khác /θ/ không rung).', 'Lưỡi chỉ chạm nhẹ, không chặn kín hơi.'],
      fix: 'Nghe giống “d”: lưỡi chặn kín quá, hãy để hơi thoát liên tục giữa lưỡi và răng.',
      words: ['this', 'that', 'mother', 'breathe'],
      pic: { tongue: [[170, 142], [158, 122], [140, 106], [114, 98], [86, 94], [56, 90], [42, 88]], lips: 'neutral', jaw: 0.35, contact: [46, 86], air: [36, 84, 14, 84], voiced: true }
    },
    {
      id: 's', ipa: 's', name: 'Âm /s/ (see, bus)', cat: 'cons', targets: ['sh-s', 'fin-s'],
      how: ['Nâng đầu lưỡi gần lợi trên, chừa một khe rất hẹp.', 'Môi không tròn, răng gần khít.', 'Thổi hơi liên tục, không rung cổ họng.'],
      vs: 'Giống “x”/“s” tiếng Việt khi ở đầu từ. Khó ở CUỐI từ vì tiếng Việt không có âm cuối /s/: người học hay bỏ (bus → “bơ”). Hãy giữ lưỡi và thổi hơi hết.',
      check: ['Tay trên cổ: không rung.', 'Kéo dài “sssss” rồi dừng hẳn, đừng kết thúc bằng “ơ”.'],
      fix: 'Nghe giống /ʃ/: lưỡi lùi quá, đưa ra trước và bỏ chu môi.',
      words: ['see', 'bus', 'class', 'miss'],
      pic: { tongue: [[170, 142], [158, 122], [140, 100], [114, 84], [88, 74], [68, 72], [60, 72]], lips: 'spread', jaw: 0.15, air: [52, 72, 28, 72], voiced: false }
    },
    {
      id: 'z', ipa: 'z', name: 'Âm /z/ (zoo, cars)', cat: 'cons', targets: ['fin-s', 'fin-voice'],
      how: ['Đặt lưỡi như khi đọc /s/.', 'Cho dây thanh rung trong lúc thổi hơi.'],
      vs: 'Khác /s/ ở chỗ có rung. Tiếng Việt không có âm cuối /z/ nên “cars”, “plays” hay bị cụt (thành “ca”, “plây”).',
      check: ['Tay trên cổ: có rung, như đang ngân “zzzz”.'],
      fix: 'Nghe giống /s/: giữ rung dây thanh đến hết âm.',
      words: ['zoo', 'cars', 'plays', 'easy'],
      pic: { tongue: [[170, 142], [158, 122], [140, 100], [114, 84], [88, 74], [68, 72], [60, 72]], lips: 'spread', jaw: 0.15, air: [52, 72, 28, 72], voiced: true }
    },
    {
      id: 'sh', ipa: 'ʃ', name: 'Âm /ʃ/ (she, wash)', cat: 'cons', targets: ['sh-s', 'sh-ch'],
      how: ['Lùi lưỡi về sau lợi trên một chút, thân lưỡi nâng lên.', 'Chu môi nhẹ.', 'Thổi hơi liên tục như khi bảo ai “suỵt”.'],
      vs: 'Gần “s”/“x” nhưng lưỡi lùi và môi chu hơn. Lỗi hay gặp: đọc thành /s/ (she ↔ see).',
      check: ['Soi gương: môi chu ra phía trước.', 'Nói “sh” như khi bảo ai yên lặng: nếu đọc đúng thì âm “suỵt” hiện ra.'],
      fix: 'Nghe giống /s/: lùi lưỡi và chu môi thêm.',
      words: ['she', 'ship', 'wash', 'fish'],
      pic: { tongue: [[170, 142], [158, 120], [140, 94], [116, 72], [92, 64], [74, 66], [66, 76]], lips: 'round', jaw: 0.2, air: [56, 76, 26, 76], voiced: false }
    },
    {
      id: 'ch', ipa: 'tʃ', name: 'Âm /tʃ/ (chair, watch)', cat: 'cons', targets: ['sh-ch'],
      how: ['Bắt đầu như /t/: lưỡi chạm sau lợi trên chặn hơi.', 'Rồi nhả ra thành /ʃ/, môi chu.', 'Không rung cổ họng.'],
      vs: 'Gần “ch” tiếng Việt nhưng bật hơi mạnh hơn và môi chu hơn. Ở CUỐI từ (watch, teach) phải đọc rõ vì tiếng Việt không có /tʃ/ cuối.',
      check: ['Đặt tờ giấy mỏng trước miệng: giấy rung khi bạn bật “ch”.'],
      fix: 'Nghe giống /ʃ/: chặn hơi hẳn một nhịp ngắn trước khi nhả ra.',
      words: ['chair', 'cheap', 'watch', 'teach'],
      pic: { tongue: [[170, 142], [158, 120], [140, 94], [116, 72], [92, 64], [74, 64], [64, 70]], lips: 'round', jaw: 0.2, contact: [64, 64], air: [56, 74, 26, 74], voiced: false }
    },
    {
      id: 'jh', ipa: 'dʒ', name: 'Âm /dʒ/ (job, bridge)', cat: 'cons', targets: ['jh-y'],
      how: ['Đặt lưỡi như /tʃ/ nhưng cho dây thanh rung.', 'Chặn hơi một nhịp ngắn rồi nhả ra thành âm xát.'],
      vs: 'Ở cuối từ (page, bridge, language) tiếng Việt không có âm này nên hay bị cụt. Đọc cho hết âm, có rung.',
      check: ['Tay trên cổ: có rung (khác /tʃ/ không rung).'],
      fix: 'Nghe giống /j/ (yes): chặn hơi hẳn trước khi nhả.',
      words: ['job', 'age', 'bridge', 'language'],
      pic: { tongue: [[170, 142], [158, 120], [140, 94], [116, 72], [92, 64], [74, 64], [64, 70]], lips: 'round', jaw: 0.2, contact: [64, 64], air: [56, 74, 26, 74], voiced: true }
    },
    {
      id: 'l', ipa: 'l', name: 'Âm /l/ (light, feel)', cat: 'cons', targets: ['l-r', 'fin-l'],
      how: ['Đầu lưỡi chạm lợi trên.', 'Hơi thoát qua hai bên lưỡi.', 'Có rung cổ họng.'],
      vs: 'Ở đầu từ giống “l” tiếng Việt. Ở CUỐI từ (feel, milk) phải giữ lưỡi chạm lợi; người học hay bỏ hoặc đọc thành “u/âu” (feel → “phiu”).',
      check: ['Đọc “feel” rồi giữ nguyên lưỡi: đầu lưỡi phải đang chạm lợi trên.'],
      fix: 'Nghe giống /r/: đầu lưỡi phải chạm lợi trên chứ không cuộn lên.',
      words: ['light', 'feel', 'milk', 'school'],
      pic: { tongue: [[170, 142], [158, 124], [140, 108], [116, 98], [92, 84], [70, 68], [60, 64]], lips: 'neutral', jaw: 0.3, contact: [60, 62], voiced: true }
    },
    {
      id: 'r', ipa: 'r', name: 'Âm /r/ (red, right)', cat: 'cons', targets: ['l-r', 'init-lr'],
      how: ['Cuộn nhẹ đầu lưỡi lên, hoặc dồn thân lưỡi lên cao; đầu lưỡi KHÔNG chạm vòm miệng.', 'Môi hơi tròn, chu ra.', 'Có rung cổ họng.'],
      vs: 'Khác “r” tiếng Việt (rung lưỡi hoặc âm xát). Lỗi hay gặp: đọc thành /l/ hoặc “z/gi”.',
      check: ['Soi gương: môi chu; đầu lưỡi không chạm răng hay lợi.'],
      fix: 'Nghe giống /l/: kéo đầu lưỡi lên và lùi khỏi lợi, không để chạm.',
      words: ['red', 'right', 'around', 'car'],
      pic: { tongue: [[170, 142], [158, 118], [140, 90], [120, 70], [100, 72], [84, 84], [74, 94]], lips: 'round', jaw: 0.25, voiced: true }
    },
    {
      id: 'v', ipa: 'v', name: 'Âm /v/ (very, love)', cat: 'cons', targets: ['b-v'],
      how: ['Răng cửa trên chạm nhẹ môi dưới.', 'Thổi hơi và cho dây thanh rung.'],
      vs: 'Có trong tiếng Việt (v) nhưng khi nói tiếng Anh hay bị đọc thành /b/ hoặc /w/; ở CUỐI từ (love, have) người học hay bỏ hoặc đổi thành “p/f”.',
      check: ['Soi gương: thấy răng trên chạm môi dưới.', 'Tay trên cổ: có rung.'],
      fix: 'Nghe giống /b/: đừng mím hai môi, hãy để răng trên chạm môi dưới và hơi thoát liên tục.',
      words: ['very', 'love', 'have', 'move'],
      pic: { tongue: [[170, 142], [158, 126], [140, 112], [116, 104], [90, 100], [66, 100]], lips: 'teethlip', jaw: 0.2, air: [44, 94, 22, 94], voiced: true }
    },
    {
      id: 'ng', ipa: 'ŋ', name: 'Âm /ŋ/ (sing, morning)', cat: 'final', targets: ['n-ng'],
      how: ['Cuối lưỡi chạm vòm mềm.', 'Hạ vòm mềm để hơi thoát qua mũi.', 'Không bật thêm /g/ ở cuối.'],
      vs: 'Có “ng” cuối trong tiếng Việt nên khá quen. Lỗi hay gặp: thêm /g/ (sing → “sing-g”) hoặc đổi thành /n/ (thing → thin).',
      check: ['Bịt mũi khi đọc “sing”: âm cuối bị nghẹt nếu bạn đọc đúng /ŋ/.'],
      fix: 'Nghe giống /n/: dùng cuối lưỡi chứ không dùng đầu lưỡi.',
      words: ['sing', 'long', 'thing', 'morning'],
      pic: { tongue: [[170, 142], [164, 112], [158, 80], [150, 58], [124, 84], [96, 98], [68, 104]], lips: 'neutral', jaw: 0.2, contact: [152, 52], velum: 'down', voiced: true }
    },
    // ---------- Âm cuối, cụm, prosody (không có sơ đồ miệng) ----------
    {
      id: 'fin', ipa: '', name: 'Âm cuối từ', cat: 'final', targets: ['fin-stop', 'fin-s', 'fin-voice', 'fin-l', 'ending'],
      how: ['Đọc đủ âm cuối của mọi từ: /p t k b d g s z f v l/.', 'Với âm cuối hữu thanh (b, d, g, v, z): cho dây thanh rung đến hết và KÉO DÀI nguyên âm đứng trước (bad dài hơn bat).', 'Dừng âm cuối gọn, đừng thêm “ơ” ở sau.'],
      vs: 'Tiếng Việt chỉ có âm cuối p, t, k, m, n, ng (và các âm lướt). Không có /s z f v l b d g/ ở cuối, nên người học hay bỏ hoặc thay: bus → “bơ”, bag → “bét”.',
      check: ['Tay trên cổ: cuối “bag”, “bad” vẫn rung; cuối “back”, “bat” thì không.', 'Ghi âm rồi nghe lại: âm cuối còn không?'],
      fix: 'Nếu hay bỏ âm cuối: đọc chậm, nhấn âm cuối hơn bình thường, rồi tăng tốc dần.',
      words: ['bag', 'bad', 'bus', 'love']
    },
    {
      id: 'cluster', ipa: '', name: 'Cụm phụ âm', cat: 'cluster', targets: ['fin-cluster', 'init-s', 'init-lr'],
      how: ['Đọc liền các phụ âm, không chèn nguyên âm vào giữa (street không phải “sờ-trít”).', 'Ở cuối từ giữ đủ cả hai phụ âm (best, asked, texts): đọc chậm từng phụ âm trước rồi mới nối lại.', 'Bắt đầu từ cụm dễ (sp, st, sk) rồi tới cụm dài (str, spl).'],
      vs: 'Tiếng Việt không có cụm phụ âm trong một âm tiết, nên người học hay chèn “ơ” vào giữa hoặc bỏ bớt phụ âm.',
      check: ['Nói chậm “s…t…r…eet” rồi rút ngắn khoảng nghỉ dần cho tới khi liền mạch.'],
      fix: 'Nếu hay bỏ phụ âm cuối: đọc phụ âm cuối nhẹ nhưng vẫn phải nghe được.',
      words: ['street', 'spring', 'best', 'asked']
    },
    {
      id: 'stress', ipa: '', name: 'Trọng âm từ', cat: 'prosody', targets: ['stress'],
      how: ['Mỗi từ nhiều âm tiết có MỘT âm tiết nhấn chính: đọc to hơn, dài hơn, cao hơn.', 'Các âm tiết còn lại đọc nhẹ, ngắn; nhiều âm thành /ə/.', 'Dấu ˈ trong phiên âm đứng ngay trước âm tiết được nhấn.'],
      vs: 'Tiếng Việt các âm tiết gần như đều nhau và mỗi âm tiết có thanh điệu riêng, nên người học hay nhấn đều, hoặc áp thanh điệu vào từng âm tiết.',
      check: ['Gõ nhịp: gõ mạnh ở âm tiết nhấn, nhẹ ở các âm khác.', 'Dùng bài “Trọng âm” để nghe và chọn, rồi bài thu âm để xem âm tiết nào của bạn nổi nhất.'],
      fix: 'Đọc to hẳn âm tiết nhấn và đọc lướt các âm còn lại, ban đầu cứ làm quá lên.',
      words: ['about', 'banana', 'photograph', 'photography']
    },
    {
      id: 'weak', ipa: '', name: 'Từ đọc nhẹ và nhịp câu', cat: 'prosody', targets: ['rhythm'],
      how: ['Từ mang nghĩa chính (danh từ, động từ chính, tính từ, trạng từ) được nhấn.', 'Từ chức năng (a, the, to, of, and, can, for…) đọc nhẹ và nhanh, nguyên âm thành /ə/.', 'Khoảng cách giữa các từ nhấn gần bằng nhau: các từ nhẹ bị nén lại.'],
      vs: 'Tiếng Việt đọc rõ từng âm tiết với độ dài gần như nhau, nên khi nói tiếng Anh dễ bị “đều đều”, khó nghe tự nhiên.',
      check: ['Gõ nhịp theo từ nhấn: “I WANT to GO HOME”: bốn nhịp đều nhau dù có từ nhẹ xen giữa hay không.'],
      fix: 'Nén các từ nhẹ lại cho vừa khoảng giữa hai từ nhấn.',
      words: ['I want to go home.', 'She is looking for a job.']
    },
    {
      id: 'intonation', ipa: '', name: 'Ngữ điệu', cat: 'prosody', targets: ['intonation'],
      how: ['Câu trần thuật và câu hỏi Wh- (what, where…): xuống giọng ở cuối.', 'Câu hỏi Yes/No: lên giọng ở cuối.', 'Liệt kê: lên ở các mục đầu, xuống ở mục cuối.'],
      vs: 'Tiếng Việt dùng thanh điệu trong từng âm tiết. Khi nói tiếng Anh đừng áp thanh điệu vào từng từ, hãy để cao độ lên xuống theo cả cụm từ.',
      check: ['Dùng bản phân tích cao độ ở phần thu âm để xem đường lên xuống ở cuối câu.'],
      fix: 'Nếu giọng đều đều: cố ý nâng cao độ ở từ nhấn cuối cùng rồi để rơi xuống (hoặc nâng lên nếu là câu hỏi Yes/No).',
      words: ['Where do you live?', 'Do you like coffee?']
    }
  ]
};
