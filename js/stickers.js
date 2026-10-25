/* hiuhf0 — stickers.js
 * Sổ sticker: thành tích có độ hiếm, sticker chủ đề (Dango mặc đồ theo chủ đề), sticker theo dịp lễ, sticker bí mật,
 * album từ vựng, tủ đồ phụ kiện cho Dango và ghim sticker lên trang Hôm nay.
 * Nạp trước app.js và đăng ký qua AppModules.
 */
window.AppModules = window.AppModules || [];
window.AppModules.push((A) => {
  const { $, $$, esc, view, toast } = A;

  const RARITY = {
    common: { name: 'Thường', order: 0 },
    rare: { name: 'Hiếm', order: 1 },
    epic: { name: 'Sử thi', order: 2 },
    legend: { name: 'Huyền thoại', order: 3 }
  };

  /* ===== Danh mục thành tích ===== */
  const GROUPS = [
    ['habit', 'Thói quen'], ['learn', 'Học từ'], ['practice', 'Luyện tập'], ['path', 'Lộ trình'],
    ['journal', 'Nhật ký'], ['game', 'Trò chơi'], ['explore', 'Khám phá'], ['secret', 'Bí mật']
  ];
  const ACH = [];
  const add = (id, icon, name, desc, rarity, group, ok, extra) => ACH.push(Object.assign({ id, icon, name, desc, rarity, group, ok: ok || (() => false) }, extra || {}));

  // Thói quen
  add('streak-3', '🔥', '3 ngày liên tiếp', 'Học 3 ngày liên tiếp', 'common', 'habit', (c) => c.streak >= 3);
  add('streak-7', '🚀', '7 ngày liên tiếp', 'Học 7 ngày liên tiếp', 'rare', 'habit', (c) => c.streak >= 7, { mascot: 'cheer' });
  add('streak-14', '🌠', '14 ngày liên tiếp', 'Học 14 ngày liên tiếp', 'rare', 'habit', (c) => c.streak >= 14);
  add('streak-30', '💎', '30 ngày liên tiếp', 'Học 30 ngày liên tiếp', 'epic', 'habit', (c) => c.streak >= 30, { mascot: 'love' });
  add('streak-60', '🏔️', '60 ngày liên tiếp', 'Học 60 ngày liên tiếp', 'epic', 'habit', (c) => c.streak >= 60);
  add('streak-100', '👑', '100 ngày liên tiếp', 'Học 100 ngày liên tiếp', 'legend', 'habit', (c) => c.streak >= 100, { mascot: 'cheer', acc: 'crown' });
  add('streak-365', '🏆', 'Một năm không nghỉ', 'Học 365 ngày liên tiếp', 'legend', 'habit', (c) => c.streak >= 365, { mascot: 'love', acc: 'crown' });
  add('day-complete', '🌈', 'Ngày trọn vẹn', 'Xong cả ba việc trong một ngày', 'rare', 'habit', null, { mascot: 'cheer' });
  add('night-owl', '🦉', 'Cú đêm', 'Học 5 lượt sau 23 giờ đêm', 'rare', 'habit', (c) => c.stats.night >= 5, { mascot: 'sleepy' });
  add('early-bird', '🐦', 'Chim sớm', 'Học 5 lượt trong khoảng 4 đến 7 giờ sáng', 'rare', 'habit', (c) => c.stats.early >= 5);
  add('freeze-used', '❄️', 'Dango giữ chuỗi', 'Được Dango giữ chuỗi một lần khi lỡ một ngày', 'common', 'habit', (c) => c.frozen > 0 || c.stats.frozenEver > 0);
  add('time-1h', '⏱️', '1 giờ cùng Dango', 'Đã dùng app tổng cộng 1 giờ', 'common', 'habit', (c) => c.usage >= 3600);
  add('time-10h', '⌛', '10 giờ cùng Dango', 'Đã dùng app tổng cộng 10 giờ', 'rare', 'habit', (c) => c.usage >= 36000);
  add('time-50h', '🕰️', '50 giờ cùng Dango', 'Đã dùng app tổng cộng 50 giờ', 'epic', 'habit', (c) => c.usage >= 180000);

  // Học từ
  add('first-word', '🌱', 'Từ đầu tiên', 'Học từ vựng đầu tiên', 'common', 'learn', (c) => c.cards >= 1, { mascot: 'happy', acc: 'bow' });
  add('words-100', '📘', '100 từ đầu tiên', 'Đã gặp 100 từ', 'common', 'learn', (c) => c.cards >= 100);
  add('words-500', '📚', '500 từ', 'Đã gặp 500 từ', 'rare', 'learn', (c) => c.cards >= 500);
  add('words-1000', '🏆', '1.000 từ', 'Đã gặp 1.000 từ', 'epic', 'learn', (c) => c.cards >= 1000, { mascot: 'wow' });
  add('words-2000', '📖', '2.000 từ', 'Đã gặp 2.000 từ', 'epic', 'learn', (c) => c.cards >= 2000);
  add('master-50', '⭐', '50 từ thuộc lòng', '50 từ ở cấp 5', 'rare', 'learn', (c) => c.mastered >= 50);
  add('master-200', '🌟', '200 từ thuộc lòng', '200 từ ở cấp 5', 'epic', 'learn', (c) => c.mastered >= 200, { mascot: 'cheer', acc: 'crown' });
  add('master-500', '✨', '500 từ thuộc lòng', '500 từ ở cấp 5', 'epic', 'learn', (c) => c.mastered >= 500);
  add('master-1000', '🌌', '1.000 từ thuộc lòng', '1.000 từ ở cấp 5', 'legend', 'learn', (c) => c.mastered >= 1000);
  add('hard-10', '💪', 'Đánh bại từ khó', '10 từ khó đã lên cấp 5', 'rare', 'learn', (c) => c.stats.hardBeaten >= 10);
  add('hard-50', '🦾', 'Khắc tinh từ khó', '50 từ khó đã lên cấp 5', 'epic', 'learn', (c) => c.stats.hardBeaten >= 50);
  add('my-word', '💫', 'Từ của riêng mình', 'Thêm từ đầu tiên vào “Từ của tôi”', 'common', 'learn', (c) => c.custom >= 1);
  add('custom-10', '🧩', 'Kho từ riêng', 'Thêm 10 từ vào “Từ của tôi”', 'rare', 'learn', (c) => c.custom >= 10);
  add('combo-10', '⚡', 'Combo 10', '10 câu đúng liên tiếp trong một phiên', 'rare', 'learn');
  add('combo-20', '💥', 'Combo 20', '20 câu đúng liên tiếp trong một phiên', 'epic', 'learn');
  add('combo-50', '🌋', 'Combo 50', '50 câu đúng liên tiếp trong một phiên', 'legend', 'learn', null, { acc: 'wizard', mascot: 'cheer' });
  add('three-star', '🌟', 'Ba sao', 'Một phiên học đạt 3 sao', 'rare', 'learn');
  add('star-run-3', '🎖️', 'Ba sao liên tiếp', '3 phiên liên tiếp đạt 3 sao', 'epic', 'learn', (c) => c.stats.starRun >= 3);
  add('perfect-session', '🎯', 'Không sai chữ nào', 'Phiên từ 20 thẻ trở lên đúng 100%', 'epic', 'learn');
  add('album-25', '🖼️', 'Album 25 hình', '25 từ trong album từ vựng', 'rare', 'learn', (c) => c.albumN >= 25);
  add('album-100', '🎨', 'Album 100 hình', '100 từ trong album từ vựng', 'epic', 'learn', (c) => c.albumN >= 100);
  add('album-300', '🏛️', 'Album 300 hình', '300 từ trong album từ vựng', 'epic', 'learn', (c) => c.albumN >= 300);
  add('album-all', '🏅', 'Album đầy đủ', 'Sưu tầm hết album từ vựng', 'legend', 'learn', (c) => c.albumTotal > 0 && c.albumN >= c.albumTotal);

  // Luyện tập
  add('listen-50', '👂', '50 câu nghe', 'Làm 50 câu luyện nghe', 'common', 'practice', (c) => c.listenN >= 50);
  add('listen-300', '🎧', '300 câu nghe', 'Làm 300 câu luyện nghe', 'rare', 'practice', (c) => c.listenN >= 300);
  add('listen-1000', '📻', '1.000 câu nghe', 'Làm 1.000 câu luyện nghe', 'epic', 'practice', (c) => c.listenN >= 1000);
  add('listen-perfect', '🎯', 'Nghe chuẩn', 'Một lượt nghe đúng cả 10 câu', 'rare', 'practice');
  add('listen-run-20', '🐇', 'Tai thính', '20 câu nghe đúng liên tiếp', 'rare', 'practice', (c) => c.stats.listenRun >= 20);
  add('speak-1', '🎤', 'Lần đầu luyện nói', 'Hoàn thành một lượt luyện nói', 'common', 'practice', (c) => c.speakN >= 1);
  add('speak-30', '🗣️', '30 từ đọc chuẩn', 'Đọc đúng 30 từ', 'rare', 'practice', (c) => c.speakOk >= 30);
  add('speak-100', '🎙️', 'Giọng chuẩn', 'Đọc đúng 100 từ', 'epic', 'practice', (c) => c.speakOk >= 100);
  add('shadow-all', '👻', 'Bóng ma shadowing', 'Luyện hết mọi câu của mọi bài shadowing', 'legend', 'practice', (c) => c.shadowAll);
  add('irregular-30', '🔁', 'Bất quy tắc không còn sợ', 'Trả lời đúng 30 câu về động từ bất quy tắc', 'rare', 'practice', (c) => c.stats.irregularOk >= 30);

  // Lộ trình
  add('unit-1', '🚪', 'Bài đầu tiên', 'Hoàn thành một bài lộ trình', 'common', 'path', (c) => c.units >= 1);
  add('unit-10', '🗺️', '10 bài lộ trình', 'Hoàn thành 10 bài', 'rare', 'path', (c) => c.units >= 10);
  add('unit-25', '🧭', '25 bài lộ trình', 'Hoàn thành 25 bài', 'rare', 'path', (c) => c.units >= 25);
  add('unit-50', '⛰️', '50 bài lộ trình', 'Hoàn thành 50 bài', 'epic', 'path', (c) => c.units >= 50);
  add('unit-100', '🏰', '100 bài lộ trình', 'Hoàn thành 100 bài', 'epic', 'path', (c) => c.units >= 100);
  add('unit-all', '🚩', 'Về đích lộ trình', 'Hoàn thành toàn bộ lộ trình', 'legend', 'path', (c) => c.units >= c.unitTotal && c.unitTotal > 0);
  add('a0-done', '🎓', 'Xong cấp A0', 'Hoàn thành mọi bài nhập môn', 'rare', 'path', (c) => c.levelDone.A0);
  add('a1-done', '📗', 'Xong cấp A1', 'Hoàn thành mọi bài A1', 'rare', 'path', (c) => c.levelDone.A1);
  add('a2-done', '📙', 'Xong cấp A2', 'Hoàn thành mọi bài A2', 'epic', 'path', (c) => c.levelDone.A2);
  add('b1-done', '📕', 'Xong cấp B1', 'Hoàn thành mọi bài B1', 'legend', 'path', (c) => c.levelDone.B1);
  add('test-100', '🥇', 'Điểm tuyệt đối', 'Đạt 100% ở một bài kiểm tra', 'rare', 'path');
  add('placed', '🧭', 'Biết mình ở đâu', 'Làm xong bài xếp trình độ', 'common', 'path');

  // Nhật ký
  add('journal-1', '📔', 'Trang nhật ký đầu tiên', 'Viết nhật ký tiếng Anh lần đầu', 'common', 'journal', (c) => c.jDays >= 1, { mascot: 'happy', acc: 'glasses' });
  add('journal-7', '✏️', '7 ngày viết liên tiếp', 'Viết nhật ký 7 ngày liên tiếp', 'rare', 'journal', (c) => c.jStreak >= 7);
  add('journal-30', '📓', '30 ngày viết liên tiếp', 'Viết nhật ký 30 ngày liên tiếp', 'epic', 'journal', (c) => c.jStreak >= 30);
  add('journal-words-500', '📝', 'Nhà văn nhí', 'Đã viết tổng cộng 500 từ trong nhật ký', 'rare', 'journal', (c) => c.jWords >= 500);
  add('journal-words-5000', '📜', 'Nhà văn thực thụ', 'Đã viết tổng cộng 5.000 từ trong nhật ký', 'epic', 'journal', (c) => c.jWords >= 5000);
  add('journal-moods', '🎭', 'Nhiều sắc thái', 'Ghi 5 tâm trạng khác nhau trong nhật ký', 'rare', 'journal', (c) => c.jMoods >= 5);
  add('journal-topics', '🗂️', 'Đủ mọi chủ đề', 'Viết nhật ký về 8 chủ đề khác nhau', 'rare', 'journal', (c) => c.jTopics >= 8);
  add('journal-used-50', '🔤', 'Dùng từ đã học', 'Dùng 50 từ đã học khác nhau trong nhật ký', 'rare', 'journal', (c) => c.jUsed >= 50);
  add('journal-letter', '💌', 'Thư gửi tương lai', 'Viết một lá thư gửi chính mình', 'rare', 'journal', (c) => c.letters >= 1);
  add('journal-letter-open', '📬', 'Thư đã đến', 'Mở một lá thư từ quá khứ', 'epic', 'journal', (c) => c.lettersOpened >= 1, { mascot: 'love' });
  add('journal-challenge', '🏁', 'Thử thách 7 ngày', 'Hoàn thành thử thách viết nhật ký 7 ngày', 'epic', 'journal', (c) => c.stats.challengeDone >= 1);
  add('journal-sprint', '⏳', 'Viết nhanh 3 phút', 'Hoàn thành một lượt viết nhanh 3 phút', 'rare', 'journal', (c) => c.stats.sprint >= 1);

  // Trò chơi
  add('game-first', '🎮', 'Chơi lần đầu', 'Hoàn thành một trò chơi', 'common', 'game', (c) => c.stats.games >= 1);
  add('game-win-10', '🕹️', 'Cao thủ nhí', 'Thắng 10 trò chơi', 'rare', 'game', (c) => c.stats.gamesWon >= 10);
  add('games-50', '🎲', 'Mê trò chơi', 'Chơi 50 trò chơi', 'epic', 'game', (c) => c.stats.games >= 50);
  add('game-perfect', '💯', 'Hoàn hảo', 'Thắng một trò chơi mà không sai lần nào', 'epic', 'game', (c) => c.stats.gamePerfect >= 1);

  // Khám phá
  add('skins-all', '🎨', 'Thợ trang trí', 'Thử cả ba giao diện màu', 'rare', 'explore', (c) => c.stats.skinMask === 7);
  add('sound-on', '🔔', 'Bật âm thanh', 'Thử bật âm thanh vui tai', 'common', 'explore', (c) => c.stats.soundUsed >= 1);
  add('first-backup', '💾', 'Cất kỹ', 'Sao lưu tiến độ lần đầu', 'common', 'explore', (c) => c.backedUp);
  add('share-1', '📸', 'Khoe thành tích', 'Chia sẻ ảnh sticker hoặc nhật ký', 'common', 'explore', (c) => c.stats.shared >= 1);

  // Bí mật
  add('secret-tap', '💗', 'Dango nhột rồi', 'Chạm vào Dango 10 lần liên tiếp', 'rare', 'secret', null, { secret: true, mascot: 'love' });
  add('secret-midnight', '🌃', 'Nửa đêm vẫn học', 'Học đúng vào lúc nửa đêm', 'epic', 'secret', (c) => c.stats.midnight >= 1, { secret: true, mascot: 'sleepy' });
  add('secret-lucky', '🍀', 'Quà may mắn', 'Dango tặng quà bất ngờ sau một phiên học', 'epic', 'secret', null, { secret: true, mascot: 'wow' });

  /* ===== Sticker theo dịp (chỉ nhận được khi học đúng ngày đó) ===== */
  // Ngày mùng 1 Tết và Rằm tháng Tám (dương lịch), có thể lệch một ngày tùy múi giờ nên có cửa sổ dung sai
  const TET = { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] };
  const MID = { 2026: [9, 25], 2027: [9, 15], 2028: [10, 3], 2029: [9, 22], 2030: [9, 12], 2031: [10, 1], 2032: [9, 19], 2033: [9, 8], 2034: [9, 27], 2035: [9, 16] };
  const SEASONS = [
    ['tet', '🌼', 'Tết đến rồi', 'Học vào mùng 1 đến mùng 3 Tết', 'epic', 'tet'],
    ['midautumn', '🏮', 'Trung thu vui vẻ', 'Học vào dịp Tết Trung thu', 'epic', 'lantern'],
    ['newyear', '🎆', 'Năm mới', 'Học vào ngày 1 tháng 1', 'rare', 'partyhat'],
    ['valentine', '💝', 'Ngày Valentine', 'Học vào ngày 14 tháng 2', 'rare', 'heartband'],
    ['women8', '🌷', 'Mùng 8 tháng 3', 'Học vào ngày 8 tháng 3', 'rare', 'flower'],
    ['children', '🎈', 'Quốc tế thiếu nhi', 'Học vào ngày 1 tháng 6', 'rare', 'partyhat'],
    ['national', '🇻🇳', 'Quốc khánh', 'Học vào ngày 2 tháng 9', 'rare', 'headband'],
    ['women20', '💐', 'Ngày 20 tháng 10', 'Học vào ngày 20 tháng 10', 'rare', 'flower'],
    ['halloween', '🎃', 'Halloween', 'Học vào ngày 31 tháng 10', 'rare', 'pumpkin'],
    ['teacher', '🍎', 'Ngày Nhà giáo', 'Học vào ngày 20 tháng 11', 'rare', 'grad'],
    ['xmas', '🎄', 'Giáng sinh', 'Học vào ngày 24 đến 26 tháng 12', 'rare', 'santa']
  ];
  SEASONS.forEach(([k, icon, name, desc, rarity, acc]) => add('season-' + k, icon, name, desc, rarity, 'season', null, { mascot: 'cheer', acc, season: k }));

  function activeSeasons(d) {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate(), out = [];
    const today = new Date(y, m - 1, day).getTime();
    const near = (t, from, to) => { if (!t) return false; const diff = Math.round((today - new Date(y, t[0] - 1, t[1]).getTime()) / 864e5); return diff >= from && diff <= to; };
    if (near(TET[y], 0, 2)) out.push('tet');
    if (near(MID[y], -1, 1)) out.push('midautumn');
    if (m === 1 && day === 1) out.push('newyear');
    if (m === 2 && day === 14) out.push('valentine');
    if (m === 3 && day === 8) out.push('women8');
    if (m === 6 && day === 1) out.push('children');
    if (m === 9 && day === 2) out.push('national');
    if (m === 10 && day === 20) out.push('women20');
    if (m === 10 && day === 31) out.push('halloween');
    if (m === 11 && day === 20) out.push('teacher');
    if (m === 12 && day >= 24 && day <= 26) out.push('xmas');
    return out;
  }

  /* ===== Sticker chủ đề: Dango mặc đồ theo chủ đề, bản "vững" có ánh vàng ===== */
  const TOPIC_ACC = {
    basics: 'grad', greetings: 'speech', numbers: 'glasses', calendar: 'partyhat', routine: 'bow', people: 'bow', jobs: 'tie', food: 'chef',
    home: 'bow', clothes: 'scarf', body: 'doctor', feelings: 'heartband', shopping: 'bag', places: 'bell', animals: 'explorer', weather: 'umbrella',
    nature: 'flower', travel: 'pilot', vehicles: 'pilot', leisure: 'partyhat', sports: 'headband', school: 'grad', work: 'tie', tech: 'headset',
    society: 'glasses', verbs: 'glasses', adj: 'bow', func: 'speech', abstract: 'wizard', ielts: 'wizard', toeic: 'tie', time: 'partyhat',
    'sit-restaurant': 'chef', 'sit-hotel': 'bell', 'sit-airport': 'pilot', 'sit-doctor': 'doctor', 'sit-directions': 'explorer', 'sit-phone': 'headset'
  };
  const topicDefs = () => A.liveTopics().reduce((out, t) => {
    const acc = TOPIC_ACC[t.key] || 'bow';
    out.push({ id: `topic-${t.key}-1`, topic: t.key, tier: 1, icon: t.icon, name: `${A.topicName(t)}: khám phá`, desc: 'Đã học 90% từ của chủ đề', rarity: 'rare', group: 'topic', costume: acc, expr: 'happy' });
    out.push({ id: `topic-${t.key}-2`, topic: t.key, tier: 2, icon: t.icon, name: `${A.topicName(t)}: vững`, desc: '80% từ của chủ đề đã lên cấp Vững', rarity: 'epic', group: 'topic', costume: acc, expr: 'cheer' });
    return out;
  }, []);

  let catalogCache = null;
  const catalog = () => catalogCache || (catalogCache = ACH.concat(topicDefs()));
  const byId = (id) => catalog().find((s) => s.id === id);

  /* ===== Phụ kiện cho Dango: mở khóa bằng sticker ===== */
  const ACC_UNLOCK = {
    bow: ['first-word', 'topic-people-1', 'topic-home-1'], chef: ['topic-food-1', 'topic-sit-restaurant-1'], pilot: ['topic-travel-1', 'topic-vehicles-1', 'topic-sit-airport-1'],
    doctor: ['topic-body-1', 'topic-sit-doctor-1'], grad: ['topic-school-1', 'topic-basics-1', 'season-teacher'], headset: ['topic-tech-1', 'topic-sit-phone-1', 'listen-300'],
    crown: ['master-200', 'streak-100'], explorer: ['topic-animals-1', 'topic-sit-directions-1'], headband: ['topic-sports-1', 'season-national'],
    tie: ['topic-work-1', 'topic-jobs-1', 'topic-toeic-1'], flower: ['topic-nature-1', 'season-women8', 'season-women20'], partyhat: ['topic-leisure-1', 'topic-calendar-1', 'streak-7', 'season-newyear', 'season-children'],
    glasses: ['journal-1', 'topic-verbs-1', 'topic-numbers-1'], scarf: ['topic-clothes-1'], wizard: ['topic-abstract-1', 'topic-ielts-1', 'combo-50'],
    santa: ['season-xmas'], tet: ['season-tet'], lantern: ['season-midautumn'], pumpkin: ['season-halloween'], heartband: ['topic-feelings-1', 'season-valentine'],
    umbrella: ['topic-weather-1'], bell: ['topic-sit-hotel-1', 'topic-places-1'], bag: ['topic-shopping-1'], speech: ['topic-greetings-1', 'topic-func-1']
  };
  const haveMap = () => Store.get().badges;
  const owned = (acc) => (ACC_UNLOCK[acc] || []).some((id) => haveMap()[id]);
  const equipped = () => { const a = Store.settings.dangoAcc; return a && owned(a) ? a : ''; };
  /** Dango đang đeo phụ kiện đã chọn. */
  const dango = (expr, size, cls) => Mascot.svg(expr, size, cls || '', { acc: equipped() });

  /* ===== Hình sticker ===== */
  function art(s, size) {
    size = size || 64;
    if (s.costume) return Mascot.svg(s.expr || 'happy', size, '', { acc: s.costume, badge: s.icon });
    if (s.mascot) return Mascot.svg(s.mascot, size, '', s.acc ? { acc: s.acc } : {});
    return `<span class="sticker-emo" aria-hidden="true">${s.icon}</span>`;
  }

  /* ===== Tính điều kiện ===== */
  let albumWords = null;
  const album = () => albumWords || (albumWords = Data.words.filter((w) => w.emoji && !w.custom));

  function ctx() {
    const st = Store.get(), cards = st.cards;
    let mastered = 0, albumN = 0;
    Data.words.forEach((w) => { const c = cards[w.id]; if (c && SRS.level(c) === 5) { mastered += 1; if (w.emoji && !w.custom) albumN += 1; } });
    const real = (u) => A.unitDone(u) && !A.unitState(u).placed;
    const levelDone = {};
    Data.LEVELS.forEach((l) => { const us = Data.units.filter((u) => u.level === l.key); levelDone[l.key] = us.length > 0 && us.every(real); });
    const jd = Store.journalDates();
    let jWords = 0;
    const moods = new Set(), topics = new Set(), used = new Set();
    jd.forEach((k) => { const e = st.journal[k]; jWords += e.words || 0; if (e.mood) moods.add(e.mood); if (e.topic) topics.add(e.topic); (e.used || []).forEach((x) => used.add(x)); });
    const shadowAll = Data.texts.length > 0 && Data.texts.every((t) => { const s = st.texts[t.id]; return s && s.shadow.length >= t.sentences.length; });
    return {
      stats: st.stats, cards: Object.keys(cards).length, mastered, albumN, albumTotal: album().length,
      streak: Store.streak(), frozen: Store.streakInfo().frozen.length,
      usage: st.usage.total, listenN: Object.keys(st.listen).reduce((a, k) => a + (st.listen[k].n || 0), 0),
      units: Data.units.filter(real).length, unitTotal: Data.units.length, levelDone,
      speakN: st.speak.n, speakOk: st.speak.ok, custom: st.custom.length, shadowAll,
      jDays: jd.length, jStreak: Store.journalStreak(), jWords, jMoods: moods.size, jTopics: topics.size, jUsed: used.size,
      letters: st.letters.length, lettersOpened: st.letters.filter((l) => l.opened).length,
      backedUp: !!Store.settings.lastBackup
    };
  }

  function activeToday() {
    const k = Store.dayKey(), l = Store.get().log[k], j = Store.journalGet(k);
    return !!((l && l.n + l.r + (l.l || 0) > 0) || (j && j.text.trim()));
  }

  /** Kiểm tra và trao sticker mới. extraIds: sticker được trao do một sự kiện (ví dụ combo, ba sao). */
  function check(extraIds) {
    const c = ctx(), st = Store.get().badges, got = [];
    if (c.frozen > 0 && !c.stats.frozenEver) Store.setStat('frozenEver', 1);
    const seasons = activeToday() ? activeSeasons(new Date()) : [];
    const ts = A.topicStats();
    catalog().forEach((s) => {
      if (st[s.id]) return;
      let earned = !!(extraIds && extraIds.indexOf(s.id) >= 0);
      if (!earned && s.season) earned = seasons.indexOf(s.season) >= 0;
      if (!earned && s.ok) earned = s.ok(c);
      if (!earned && s.topic) {
        const o = ts[s.topic];
        earned = !!o && o.n >= 5 && (s.tier === 1 ? o.seen >= o.n * 0.9 : o.strong >= o.n * 0.8);
      }
      if (earned && Store.award(s.id)) got.push(s);
    });
    if (got.length) announce(got);
    return got;
  }

  function popItem(s) {
    return { html: art(s, 96), name: esc(s.name), desc: esc(s.desc), rarity: s.rarity, label: RARITY[s.rarity].name };
  }
  function announce(got) {
    // Nhận nhiều cái cùng lúc (người dùng cũ mở bản mới) thì chỉ khoe tối đa 3 cái hiếm nhất rồi gộp phần còn lại
    const sorted = got.slice().sort((a, b) => RARITY[b.rarity].order - RARITY[a.rarity].order);
    if (sorted.length <= 3) return FX.stickerPop(sorted.map(popItem));
    const top = sorted.slice(0, 2).map(popItem);
    top.push({ html: art(sorted[2], 96), name: `Và ${sorted.length - 2} sticker khác`, desc: 'Mở Sổ sticker để xem tất cả nhé.', rarity: sorted[2].rarity, label: RARITY[sorted[2].rarity].name });
    FX.stickerPop(top);
  }

  const counts = () => { const cat = catalog(), st = haveMap(); return { have: cat.filter((s) => st[s.id]).length, total: cat.length }; };

  /* ===== Chi tiết một sticker ===== */
  let sheet = null;
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }
  window.addEventListener('hashchange', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  function shareData(s) {
    const o = { title: s.name, subtitle: s.desc, tag: 'Sticker ' + RARITY[s.rarity].name.toLowerCase() };
    if (s.costume || s.mascot) o.svg = s.costume ? Mascot.svg(s.expr || 'happy', 240, '', { acc: s.costume, badge: s.icon }) : Mascot.svg(s.mascot, 240, '', s.acc ? { acc: s.acc } : {});
    else o.emoji = s.icon;
    return o;
  }

  function openSticker(id) {
    const s = byId(id);
    if (!s) return;
    closeSheet();
    const have = haveMap()[id];
    const pins = Store.settings.pinStickers || [];
    const hidden = s.secret && !have;
    sheet = document.createElement('div');
    sheet.className = 'sheet-backdrop';
    sheet.innerHTML = `<div class="sheet sticker-sheet r-${s.rarity}" role="dialog" aria-modal="true" aria-label="${esc(hidden ? 'Sticker bí mật' : s.name)}">
      <button class="icon-btn sheet-x" id="ss-x" aria-label="Đóng">✕</button>
      <div class="sticker-sheet-art ${have ? '' : 'locked'}">${have ? art(s, 120) : `<span class="sticker-emo">${hidden ? '❔' : '🔒'}</span>`}</div>
      <p class="rarity-tag r-${s.rarity}">${RARITY[s.rarity].name}</p>
      <h2>${hidden ? 'Sticker bí mật' : esc(s.name)}</h2>
      <p class="muted">${hidden ? 'Hãy khám phá thật nhiều, sticker này sẽ tự mở khi bạn tìm ra bí mật của Dango.' : esc(s.desc)}</p>
      ${have ? `<p class="hint">Nhận ngày ${new Date(have).toLocaleDateString('vi-VN')}</p>
        <div class="row wrap center-row"><button class="btn" id="ss-pin">${pins.indexOf(id) >= 0 ? 'Bỏ ghim' : '📌 Ghim lên trang Hôm nay'}</button><button class="btn primary" id="ss-share">📸 Chia sẻ ảnh</button></div>` : ''}
    </div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', async (e) => {
      if (e.target === sheet || e.target.closest('#ss-x')) return closeSheet();
      if (e.target.closest('#ss-pin')) {
        const list = (Store.settings.pinStickers || []).slice();
        const i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1);
        else if (list.length >= 3) return toast('Chỉ ghim được 3 sticker. Hãy bỏ ghim một cái trước nhé.');
        else list.push(id);
        Store.settings.pinStickers = list;
        Store.save();
        toast(i >= 0 ? 'Đã bỏ ghim.' : 'Đã ghim lên trang Hôm nay.');
        closeSheet();
        if (A.currentRoute() === 'stickers') renderStickers();
        return;
      }
      if (e.target.closest('#ss-share')) {
        const r = await Share.share(shareData(s));
        if (r !== 'cancel') { Store.bump('shared'); check(); toast(r === 'saved' ? 'Đã tải ảnh về máy.' : 'Đã chia sẻ!'); }
      }
    });
    FX.sound('tap');
  }

  /* ===== Trang Sổ sticker ===== */
  const fil = { rarity: 'all', got: 'all' };
  const rot = (id) => ((id.length * 7 + id.charCodeAt(id.length - 1)) % 9) - 4;

  function tile(s, extra) {
    const have = haveMap()[s.id];
    const hidden = s.secret && !have;
    return `<button class="sticker r-${s.rarity} ${have ? 'got' : ''}" data-st="${esc(s.id)}" style="--rot:${rot(s.id)}deg">
      <span class="sticker-i">${have ? art(s, 64) : `<span class="sticker-emo" aria-hidden="true">${hidden ? '❔' : '🔒'}</span>`}</span>
      <b>${hidden ? 'Sticker bí mật' : esc(s.name)}</b>
      <small class="muted">${hidden ? 'Hãy khám phá để mở khóa' : esc(extra || s.desc)}</small>
      <span class="rarity-dot r-${s.rarity}" title="${RARITY[s.rarity].name}"></span></button>`;
  }
  const keep = (s) => (fil.rarity === 'all' || s.rarity === fil.rarity) && (fil.got === 'all' || (fil.got === 'got') === !!haveMap()[s.id]);

  function wardrobeHTML() {
    const cur = equipped();
    const items = Mascot.ACC_KEYS.map((k) => {
      const ok = owned(k);
      const first = (ACC_UNLOCK[k] || [])[0], hint = first && byId(first) ? byId(first).name : '';
      return `<button class="acc ${ok ? '' : 'locked'} ${cur === k ? 'on' : ''}" data-acc="${k}" ${ok ? '' : 'aria-disabled="true"'}>
        <span class="acc-i">${ok ? Mascot.svg('happy', 46, '', { acc: k }) : '<span class="sticker-emo">🔒</span>'}</span>
        <b>${esc(Mascot.ACC[k].name)}</b><small class="muted">${ok ? (cur === k ? 'Đang đeo' : 'Bấm để đeo') : esc('Mở bằng: ' + hint)}</small></button>`;
    }).join('');
    return `<section class="card"><div class="card-h"><h2>Tủ đồ của Dango</h2><span class="muted">${Mascot.ACC_KEYS.filter(owned).length}/${Mascot.ACC_KEYS.length} món</span></div>
      <p class="hint">Mỗi sticker mở khóa một món đồ cho Dango. Món bạn chọn sẽ hiện trên trang Hôm nay.</p>
      <div class="accs"><button class="acc ${cur ? '' : 'on'}" data-acc="">
        <span class="acc-i">${Mascot.svg('happy', 46)}</span><b>Không đeo gì</b><small class="muted">${cur ? 'Bấm để cởi' : 'Đang chọn'}</small></button>${items}</div></section>`;
  }

  function renderStickers() {
    const cat = catalog(), st = haveMap(), c = counts();
    const pins = (Store.settings.pinStickers || []).map(byId).filter(Boolean);
    const sections = GROUPS.map(([g, title]) => {
      const list = ACH.filter((s) => s.group === g && keep(s));
      return list.length ? `<section class="card"><h2>${title}</h2><div class="stickers">${list.map((s) => tile(s)).join('')}</div></section>` : '';
    }).join('');
    const seasonList = ACH.filter((s) => s.group === 'season' && keep(s));
    const ts = A.topicStats();
    const topicList = cat.filter((s) => s.group === 'topic' && keep(s));
    const chips = (name, opts, cur) => `<div class="chips" data-chips="${name}">${opts.map(([v, l]) => `<button class="chip" data-f="${name}:${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
    view.innerHTML = `
      <a class="back" href="#more">‹ Thêm</a>
      <section class="page-h row"><div class="dango-wrap sm">${dango(c.have ? 'love' : 'happy', 72)}</div><div><h1>Sổ sticker</h1><p class="muted"><span data-count="${c.have}">${c.have}</span>/${c.total} sticker. Học, luyện và viết nhật ký để sưu tầm thêm!</p></div></section>
      <section class="card row between wrap"><div><h2>Album từ vựng</h2><p class="muted">Mỗi từ thuộc lòng thành một sticker trong album.</p></div><a class="btn primary" href="#album">🖼️ Mở album (${albumHave()}/${album().length})</a></section>
      ${pins.length ? `<section class="card"><h2>Ghim của tôi</h2><div class="stickers">${pins.map((s) => tile(s)).join('')}</div></section>` : ''}
      ${wardrobeHTML()}
      <section class="card filters"><h2>Bộ lọc</h2>
        ${chips('rarity', [['all', 'Mọi độ hiếm'], ['common', 'Thường'], ['rare', 'Hiếm'], ['epic', 'Sử thi'], ['legend', 'Huyền thoại']], fil.rarity)}
        ${chips('got', [['all', 'Tất cả'], ['got', 'Đã có'], ['no', 'Chưa có']], fil.got)}</section>
      ${sections}
      ${seasonList.length ? `<section class="card"><h2>Theo dịp lễ</h2><p class="hint">Chỉ nhận được khi bạn học đúng vào ngày đó.</p><div class="stickers">${seasonList.map((s) => tile(s)).join('')}</div></section>` : ''}
      ${topicList.length ? `<section class="card"><h2>Chủ đề</h2><p class="hint">Học 90% từ của một chủ đề để nhận sticker khám phá, đưa 80% từ lên cấp Vững để nhận sticker vững.</p><div class="stickers">${topicList.map((s) => { const o = ts[s.topic] || { n: 0, seen: 0, strong: 0 }; return tile(s, s.tier === 1 ? `${o.seen}/${o.n} từ đã học` : `${o.strong}/${o.n} từ ở cấp Vững`); }).join('')}</div></section>` : ''}
      ${!sections && !seasonList.length && !topicList.length ? '<div class="empty card">Không có sticker nào khớp bộ lọc.</div>' : ''}`;
    FX.countUp(view);
    view.onclick = (e) => {
      const f = e.target.closest('[data-f]');
      if (f) { const [k, v] = f.dataset.f.split(':'); fil[k] = v; return renderStickers(); }
      const acc = e.target.closest('[data-acc]');
      if (acc) {
        const k = acc.dataset.acc;
        if (k && !owned(k)) return toast('Món này chưa mở khóa. ' + (acc.querySelector('small') ? acc.querySelector('small').textContent : ''));
        Store.settings.dangoAcc = k;
        Store.save();
        FX.sound('tap');
        renderStickers();
        FX.sparkle($('.page-h .dango-wrap'), { count: 6 });
        return;
      }
      const t = e.target.closest('[data-st]');
      if (t) openSticker(t.dataset.st);
    };
  }

  /* ===== Album từ vựng ===== */
  const alb = { level: 'all', got: 'all', q: '', limit: 150 };
  const albumHave = () => { const cards = Store.get().cards; return album().filter((w) => cards[w.id] && SRS.level(cards[w.id]) === 5).length; };

  function renderAlbum() {
    const cards = Store.get().cards;
    const all = album();
    const q = alb.q.trim().toLowerCase();
    const list = all.filter((w) => {
      const have = cards[w.id] && SRS.level(cards[w.id]) === 5;
      if (alb.level !== 'all' && w.level !== alb.level) return false;
      if (alb.got !== 'all' && (alb.got === 'got') !== !!have) return false;
      if (q && w.word.toLowerCase().indexOf(q) < 0 && w.vi.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const n = albumHave();
    const lv = ['all'].concat(Data.LEVELS.map((l) => l.key));
    const items = list.slice(0, alb.limit).map((w) => {
      const have = cards[w.id] && SRS.level(cards[w.id]) === 5;
      return `<button class="aw ${have ? 'got' : ''}" data-w="${esc(w.id)}" title="${have ? esc(w.word + ' · ' + w.vi) : 'Đưa từ này lên cấp 5 để mở khóa'}">
        <span class="aw-i" aria-hidden="true">${w.emoji}</span><small>${esc(w.word)}</small></button>`;
    }).join('');
    view.innerHTML = `
      <a class="back" href="#stickers">‹ Sổ sticker</a>
      <section class="page-h row"><div class="dango-wrap sm">${dango(n ? 'cheer' : 'think', 72)}</div><div><h1>Album từ vựng</h1><p class="muted"><span data-count="${n}">${n}</span>/${all.length} hình. Đưa từ lên cấp 5 (thuộc lòng) để từ đó thành sticker.</p></div></section>
      <div class="progress"><i style="width:${all.length ? (n / all.length) * 100 : 0}%"></i></div>
      <section class="card filters">
        <input id="alb-q" class="input" type="search" placeholder="Tìm từ trong album…" value="${esc(alb.q)}" aria-label="Tìm trong album">
        <div class="chips">${lv.map((k) => `<button class="chip" data-al="${k}" aria-pressed="${alb.level === k}">${k === 'all' ? 'Mọi cấp' : k}</button>`).join('')}
          ${[['all', 'Tất cả'], ['got', 'Đã có'], ['no', 'Chưa có']].map(([v, l]) => `<button class="chip" data-ag="${v}" aria-pressed="${alb.got === v}">${l}</button>`).join('')}</div></section>
      <p class="muted">Hiển thị ${Math.min(list.length, alb.limit)} trên ${list.length} hình</p>
      <div class="album">${items || '<div class="empty card">Không có hình nào khớp.</div>'}</div>
      ${list.length > alb.limit ? '<div class="center"><button class="btn" id="alb-more">Xem thêm</button></div>' : ''}`;
    FX.countUp(view);
    view.oninput = (e) => { if (e.target.id === 'alb-q') { alb.q = e.target.value; alb.limit = 150; const pos = e.target.selectionStart; renderAlbum(); const el = $('#alb-q'); el.focus(); el.setSelectionRange(pos, pos); } };
    view.onclick = (e) => {
      const l = e.target.closest('[data-al]');
      if (l) { alb.level = l.dataset.al; alb.limit = 150; return renderAlbum(); }
      const g = e.target.closest('[data-ag]');
      if (g) { alb.got = g.dataset.ag; alb.limit = 150; return renderAlbum(); }
      if (e.target.closest('#alb-more')) { alb.limit += 150; return renderAlbum(); }
      const w = e.target.closest('[data-w]');
      if (w) {
        const word = Data.byId.get(w.dataset.w);
        if (!word) return;
        if (w.classList.contains('got')) { FX.sparkle(w, { count: 5 }); A.openSheet(word.word); } else toast('Đưa từ “' + word.word + '” lên cấp 5 để mở khóa hình này.');
      }
    };
  }

  /* ===== Trang Hôm nay: sticker đã ghim, Dango nhột (chạm 10 lần) ===== */
  A.slots.today.push(() => {
    const pins = (Store.settings.pinStickers || []).map(byId).filter(Boolean);
    if (!pins.length) return '';
    return `<section class="card pinned"><div class="card-h"><h2>Sticker của tôi</h2><a href="#stickers" class="muted">Xem sổ ›</a></div>
      <div class="pinrow">${pins.map((s) => `<button class="pin r-${s.rarity}" data-st="${esc(s.id)}" style="--rot:${rot(s.id)}deg" aria-label="${esc(s.name)}"><span class="sticker-i">${art(s, 56)}</span></button>`).join('')}</div></section>`;
  });
  let taps = 0, tapTimer = 0;
  A.clicks.push((e) => {
    const st = e.target.closest('[data-st]');
    if (st) { openSticker(st.dataset.st); return true; }
    const w = e.target.closest('.hero .dango-wrap');
    if (!w) return false;
    taps += 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 4000);
    FX.anim(w, 'jelly');
    FX.sparkle(w, { count: 3, glyphs: ['💗', '✨'] });
    FX.sound('tap');
    if (taps >= 10) { taps = 0; check(['secret-tap']); }
    return true;
  });

  A.routes.stickers = renderStickers;
  A.routes.album = renderAlbum;
  A.NAV_OF.stickers = 'more';
  A.NAV_OF.album = 'more';
  A.stickers = { check, counts, art, byId, catalog, dango, equipped, open: openSticker, RARITY, albumHave, albumTotal: () => album().length, activeSeasons, owned, shareData };
});
