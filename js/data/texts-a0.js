/* Bài nhập môn A0 (câu rất ngắn, từ rất cơ bản). Nạp sau texts.js và đặt lên đầu danh sách. */
window.TEXTS = window.TEXTS || [];
window.TEXTS.unshift(
  {
    id: 'a0-hello', level: 'A0', kind: 'Hội thoại', title: 'Hello!', titleVi: 'Xin chào!',
    sentences: [
      ['Anna: Hello! My name is Anna.', 'Anna: Xin chào! Tên mình là Anna.'],
      ['Ben: Hi, Anna. I am Ben.', 'Ben: Chào Anna. Mình là Ben.'],
      ['Anna: Nice to meet you, Ben.', 'Anna: Rất vui được gặp bạn, Ben.'],
      ['Ben: Nice to meet you, too.', 'Ben: Mình cũng rất vui được gặp bạn.'],
      ['Anna: How are you today?', 'Anna: Hôm nay bạn khỏe không?'],
      ['Ben: I am fine, thank you. And you?', 'Ben: Mình khỏe, cảm ơn. Còn bạn?'],
      ['Anna: I am fine, too. See you later!', 'Anna: Mình cũng khỏe. Hẹn gặp lại!'],
      ['Ben: Bye, Anna!', 'Ben: Tạm biệt Anna!']
    ]
  },
  {
    id: 'a0-age', level: 'A0', kind: 'Hội thoại', title: 'How old are you?', titleVi: 'Bạn bao nhiêu tuổi?',
    sentences: [
      ['Tom: What is your name?', 'Tom: Bạn tên là gì?'],
      ['Mai: My name is Mai. What is your name?', 'Mai: Mình tên là Mai. Còn bạn tên gì?'],
      ['Tom: I am Tom. How old are you, Mai?', 'Tom: Mình là Tom. Bạn bao nhiêu tuổi, Mai?'],
      ['Mai: I am thirteen. How old are you?', 'Mai: Mình mười ba tuổi. Còn bạn bao nhiêu tuổi?'],
      ['Tom: I am fourteen.', 'Tom: Mình mười bốn tuổi.'],
      ['Mai: Where are you from, Tom?', 'Mai: Bạn đến từ đâu, Tom?'],
      ['Tom: I am from Canada. And you?', 'Tom: Mình đến từ Canada. Còn bạn?'],
      ['Mai: I am from Vietnam.', 'Mai: Mình đến từ Việt Nam.']
    ]
  },
  {
    id: 'a0-family', level: 'A0', kind: 'Đoạn văn', title: 'This is my family', titleVi: 'Đây là gia đình mình',
    sentences: [
      ['This is my family.', 'Đây là gia đình mình.'],
      ['This is my mom. She is a teacher.', 'Đây là mẹ mình. Mẹ là giáo viên.'],
      ['This is my dad. He is a doctor.', 'Đây là bố mình. Bố là bác sĩ.'],
      ['I have one brother and one sister.', 'Mình có một anh trai và một chị gái.'],
      ['My brother is sixteen. He is tall.', 'Anh trai mình mười sáu tuổi. Anh ấy cao.'],
      ['My sister is ten. She is small.', 'Em gái mình mười tuổi. Em ấy nhỏ.'],
      ['We are very happy.', 'Chúng mình rất hạnh phúc.']
    ]
  },
  {
    id: 'a0-classroom', level: 'A0', kind: 'Hội thoại', title: 'In the classroom', titleVi: 'Trong lớp học',
    sentences: [
      ['Teacher: Good morning, class.', 'Cô giáo: Chào buổi sáng cả lớp.'],
      ['Students: Good morning, teacher.', 'Học sinh: Chào cô ạ.'],
      ['Teacher: Open your books, please.', 'Cô giáo: Các em mở sách ra nhé.'],
      ['Teacher: What is this?', 'Cô giáo: Đây là cái gì?'],
      ['Lan: It is a pen.', 'Lan: Đó là một cái bút.'],
      ['Teacher: And what is that?', 'Cô giáo: Còn kia là cái gì?'],
      ['Lan: That is a bag. It is blue.', 'Lan: Kia là một cái cặp. Nó màu xanh dương.'],
      ['Teacher: Very good!', 'Cô giáo: Rất tốt!']
    ]
  },
  {
    id: 'a0-time', level: 'A0', kind: 'Hội thoại', title: 'What time is it?', titleVi: 'Mấy giờ rồi?',
    sentences: [
      ['Sam: Excuse me, what time is it?', 'Sam: Xin lỗi, mấy giờ rồi ạ?'],
      ['Lisa: It is a quarter past three.', 'Lisa: Ba giờ mười lăm phút.'],
      ['Sam: Thank you. The class is at four.', 'Sam: Cảm ơn bạn. Lớp học lúc bốn giờ.'],
      ['Lisa: You can go now. You have time.', 'Lisa: Bạn có thể đi bây giờ. Bạn còn thời gian.'],
      ['Sam: Is the school near?', 'Sam: Trường có gần không?'],
      ['Lisa: Yes, go straight and turn left.', 'Lisa: Có, đi thẳng rồi rẽ trái.'],
      ['Sam: Thanks a lot. Bye!', 'Sam: Cảm ơn bạn nhiều. Tạm biệt!']
    ]
  },
  {
    id: 'a0-lunch', level: 'A0', kind: 'Hội thoại', title: 'What do you like to eat?', titleVi: 'Bạn thích ăn gì?',
    sentences: [
      ['Nam: I am hungry. Are you hungry?', 'Nam: Mình đói rồi. Bạn có đói không?'],
      ['Hoa: Yes, I am. I want some rice.', 'Hoa: Có, mình đói. Mình muốn ăn cơm.'],
      ['Nam: Do you like fish?', 'Nam: Bạn có thích cá không?'],
      ['Hoa: Yes, I like fish, but I do not like eggs.', 'Hoa: Có, mình thích cá nhưng không thích trứng.'],
      ['Nam: I like chicken and an apple.', 'Nam: Mình thích thịt gà và một quả táo.'],
      ['Hoa: Can I have some water, please?', 'Hoa: Cho mình xin ít nước được không?'],
      ['Nam: Of course. Here you are.', 'Nam: Tất nhiên rồi. Của bạn đây.']
    ]
  }
);
