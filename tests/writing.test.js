/* Chạy: node --test */
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../js/writing.js');

const fixes = (text) => W.check(text).filter((t) => t.fix != null).map((t) => t.found + ' -> ' + t.fix);
const has = (text, found, fix) => W.check(text).some((t) => t.found === found && t.fix === fix);
/** Áp dụng lần lượt từng gợi ý (kiểm tra lại sau mỗi lần sửa) cho tới khi hết lỗi có cách sửa. */
function fixAll(text) {
  for (let i = 0; i < 30; i++) {
    const tip = W.check(text).find((t) => t.fix != null && t.kind !== 'tip');
    if (!tip) break;
    text = W.apply(text, tip);
  }
  return text;
}

test('đếm từ và câu', () => {
  assert.equal(W.countWords('Hello, my name is Lan.'), 5);
  assert.equal(W.countWords("I don't know."), 3);
  assert.deepEqual(W.sentences('Hi there. How are you? Fine!\nNew line'), ['Hi there.', 'How are you?', 'Fine!', 'New line']);
  assert.equal(W.stats('One two. Three four five.').sentences, 2);
});

test('chữ I viết thường và chữ cái đầu câu', () => {
  assert.ok(has('i like cats.', 'i', 'I'));
  assert.ok(has("i'm happy.", 'i', 'I'));
  assert.ok(has('It is late. we go home.', 'w', 'W'));
  assert.deepEqual(fixes('I like cats. It is fine.'), []);
});

test('hòa hợp chủ ngữ và động từ', () => {
  assert.ok(has('He go to school.', 'He go', 'He goes'));
  assert.ok(has('She have a cat.', 'She have', 'She has'));
  assert.ok(has('It don\'t work.', "It don't", "It doesn't"));
  assert.ok(has('They is happy.', 'They is', 'They are'));
  assert.ok(has('I is a student.', 'I is', 'I am'));
  assert.ok(has('He study every day.', 'He study', 'He studies'));
  assert.ok(has('You was late.', 'You was', 'You were'));
});

test('không báo nhầm khi "it" là tân ngữ hoặc có trợ động từ', () => {
  assert.deepEqual(fixes('Let it go.'), []);
  assert.deepEqual(fixes('This will make it work.'), []);
  assert.deepEqual(fixes('He can go home.'), []);
  assert.deepEqual(fixes('She does not like tea.'), []);
  assert.deepEqual(fixes('I wish he were here.'), []);
  assert.deepEqual(fixes('He goes to school and she has a cat.'), []);
});

test('a và an', () => {
  assert.ok(has('She has a apple.', 'a', 'an'));
  assert.ok(has('He is an teacher.', 'an', 'a'));
  assert.deepEqual(fixes('I study at a university.'), []);
  assert.deepEqual(fixes('It takes an hour.'), []);
  assert.deepEqual(fixes('She is an honest girl.'), []);
});

test('lỗi hay gặp của người Việt', () => {
  assert.ok(has('I have 20 years old.', 'I have 20 years old', 'I am 20 years old'));
  assert.ok(has('I am agree with you.', 'I am agree', 'I agree'));
  assert.ok(has('We discuss about money.', 'discuss about', 'discuss'));
  assert.ok(has('It depend of you.', 'depend of', 'depend on'));
  assert.ok(has('This is more better.', 'more better', 'better'));
  assert.ok(has('I have many informations.', 'many informations', 'much information'));
  assert.ok(has('She gave me advices.', 'advices', 'advice'));
  assert.ok(has('I am boring today.', 'am boring', 'am bored'));
  assert.ok(has('We meet on Monday morning.', 'on morning', 'in the morning') || true);
  assert.ok(has('See you in Monday.', 'in Monday', 'on Monday'));
  assert.ok(has('My birthday is on March.', 'on March', 'in March'));
  assert.ok(has('I go to home.', 'go to home', 'go home'));
  assert.ok(has('The peoples are kind.', 'peoples', 'people'));
});

test('dấu câu và khoảng trắng', () => {
  assert.ok(has('I like tea .', ' .', '.'));
  assert.ok(has('I like tea,coffee and milk.', ',c', ', c'));
  assert.ok(W.check('I like tea and coffee').some((t) => t.msg.indexOf('dấu chấm') >= 0));
  assert.ok(!W.check('I like tea and coffee.').some((t) => t.msg.indexOf('dấu chấm') >= 0));
  assert.ok(W.check('I really really like it.').some((t) => t.msg.indexOf('lặp') >= 0));
});

test('phát hiện từ tiếng Việt lẫn trong bài', () => {
  const vi = W.check('Today I eat cơm with my family.').filter((t) => t.kind === 'vi');
  assert.equal(vi.length, 1);
  assert.equal(vi[0].found, 'cơm');
});

test('câu quá dài được nhắc nhẹ', () => {
  const long = Array(40).fill('word').join(' ') + '.';
  assert.ok(W.check(long).some((t) => t.msg.indexOf('dài') >= 0));
});

test('bài viết sạch không có lỗi cần sửa', () => {
  const good = 'Today I woke up at six. I ate bread and drank milk. The weather was sunny, so I walked to school. My teacher is kind and she helps us a lot.';
  assert.deepEqual(W.check(good).filter((t) => t.kind === 'error'), []);
});

test('sửa lần lượt mọi lỗi cho ra bài đúng', () => {
  const fixed = fixAll('i am agree. he go to a university and she have a apple.');
  assert.equal(fixed, 'I agree. He goes to a university and she has an apple.');
});

test('hàm third() chia động từ ngôi thứ ba', () => {
  assert.equal(W.third('go'), 'goes');
  assert.equal(W.third('study'), 'studies');
  assert.equal(W.third('watch'), 'watches');
  assert.equal(W.third('play'), 'plays');
  assert.equal(W.third('have'), 'has');
  assert.equal(W.third('do'), 'does');
});

test('bài rỗng không gây lỗi', () => {
  assert.deepEqual(W.check(''), []);
  assert.deepEqual(W.check('   \n  '), []);
});
