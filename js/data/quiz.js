/* Câu hỏi nghe hiểu cho từng bài. Khóa là id bài ở texts.js / texts-a0.js.
 * q: câu hỏi (tiếng Anh), v: gợi ý tiếng Việt, o: các đáp án, a: vị trí đáp án đúng (bắt đầu từ 0). */
window.QUIZ = {
  'a0-hello': [
    { q: 'What is the girl\'s name?', v: 'Tên cô gái là gì?', o: ['Anna', 'Ben', 'Mai'], a: 0 },
    { q: 'How is Ben today?', v: 'Hôm nay Ben thế nào?', o: ['He is sad.', 'He is fine.', 'He is tired.'], a: 1 },
    { q: 'What does Anna say at the end?', v: 'Cuối cùng Anna nói gì?', o: ['Good night!', 'Thank you!', 'See you later!'], a: 2 }
  ],
  'a0-age': [
    { q: 'How old is Mai?', v: 'Mai bao nhiêu tuổi?', o: ['Thirteen', 'Fourteen', 'Sixteen'], a: 0 },
    { q: 'How old is Tom?', v: 'Tom bao nhiêu tuổi?', o: ['Thirteen', 'Fourteen', 'Fifteen'], a: 1 },
    { q: 'Where is Tom from?', v: 'Tom đến từ đâu?', o: ['Vietnam', 'America', 'Canada'], a: 2 }
  ],
  'a0-family': [
    { q: 'What is the mom\'s job?', v: 'Mẹ làm nghề gì?', o: ['Teacher', 'Doctor', 'Student'], a: 0 },
    { q: 'How old is the brother?', v: 'Anh trai bao nhiêu tuổi?', o: ['Ten', 'Sixteen', 'Sixty'], a: 1 },
    { q: 'How many brothers and sisters does the speaker have?', v: 'Người nói có mấy anh chị em?', o: ['One', 'Three', 'Two'], a: 2 }
  ],
  'a0-classroom': [
    { q: 'What does the teacher say first?', v: 'Cô giáo nói gì đầu tiên?', o: ['Good morning, class.', 'Close your books.', 'Go home.'], a: 0 },
    { q: 'What is this?', v: 'Cái này là gì?', o: ['A bag', 'A pen', 'A book'], a: 1 },
    { q: 'What color is the bag?', v: 'Cái cặp màu gì?', o: ['Red', 'Green', 'Blue'], a: 2 }
  ],
  'a0-time': [
    { q: 'What time is it?', v: 'Bây giờ là mấy giờ?', o: ['3:15', '3:50', '4:15'], a: 0 },
    { q: 'When is the class?', v: 'Lớp học lúc mấy giờ?', o: ['At three', 'At four', 'At five'], a: 1 },
    { q: 'How does Sam get to school?', v: 'Sam đến trường bằng cách nào?', o: ['Turn right and go straight.', 'Take a bus.', 'Go straight and turn left.'], a: 2 }
  ],
  'a0-lunch': [
    { q: 'What does Hoa want to eat?', v: 'Hoa muốn ăn gì?', o: ['Rice', 'Chicken', 'An apple'], a: 0 },
    { q: 'What does Hoa not like?', v: 'Hoa không thích gì?', o: ['Fish', 'Eggs', 'Rice'], a: 1 },
    { q: 'What does Hoa ask for?', v: 'Hoa xin gì?', o: ['Some rice', 'Some milk', 'Some water'], a: 2 }
  ],
  'a1-introduce': [
    { q: 'Where does Lan live?', v: 'Lan sống ở đâu?', o: ['In Hanoi', 'In Hue', 'In Da Nang'], a: 0 },
    { q: 'How old is Lan?', v: 'Lan bao nhiêu tuổi?', o: ['Eighteen', 'Twenty', 'Twenty-two'], a: 1 },
    { q: 'Who is in Lan\'s family?', v: 'Gia đình Lan có ai?', o: ['A sister and a dog', 'A grandmother only', 'A mother, a father and a little brother'], a: 2 }
  ],
  'a1-cafe': [
    { q: 'What does Tom drink?', v: 'Tom uống gì?', o: ['Coffee with milk', 'Tea with sugar', 'Juice'], a: 0 },
    { q: 'What does Tom eat?', v: 'Tom ăn gì?', o: ['A burger', 'A cheese sandwich', 'A cake'], a: 1 },
    { q: 'How much does Tom pay?', v: 'Tom trả bao nhiêu?', o: ['Three dollars', 'Four dollars', 'Five dollars'], a: 2 }
  ],
  'a1-routine': [
    { q: 'When does the speaker wake up?', v: 'Người nói thức dậy lúc nào?', o: ['At six', 'At seven', 'At eight'], a: 0 },
    { q: 'How does the speaker go to school?', v: 'Người nói đi học bằng gì?', o: ['By bus', 'By bike', 'On foot'], a: 1 },
    { q: 'When does the speaker go to bed?', v: 'Người nói đi ngủ lúc nào?', o: ['At nine', 'At eleven', 'At ten'], a: 2 }
  ],
  'a1-weather': [
    { q: 'What day is it today?', v: 'Hôm nay là thứ mấy?', o: ['Saturday', 'Sunday', 'Friday'], a: 0 },
    { q: 'What do they do in the park?', v: 'Họ làm gì ở công viên?', o: ['Swim', 'Play football and eat ice cream', 'Read books'], a: 1 },
    { q: 'What will the weather be like tomorrow?', v: 'Ngày mai thời tiết thế nào?', o: ['Sunny', 'Cold', 'Rainy'], a: 2 }
  ],
  'a2-beach': [
    { q: 'How did they go to the beach?', v: 'Họ đến biển bằng gì?', o: ['By bus', 'By train', 'By car'], a: 0 },
    { q: 'How long was the journey?', v: 'Chuyến đi mất bao lâu?', o: ['About two hours', 'About three hours', 'About five hours'], a: 1 },
    { q: 'What did they eat for lunch?', v: 'Họ ăn gì vào bữa trưa?', o: ['Chicken', 'Pizza', 'Fresh fish'], a: 2 }
  ],
  'a2-doctor': [
    { q: 'What problem does Anna have?', v: 'Anna bị sao?', o: ['A sore throat and a fever', 'A broken leg', 'A headache only'], a: 0 },
    { q: 'How long has she felt ill?', v: 'Cô ấy bị bao lâu rồi?', o: ['Since Sunday', 'Since Monday', 'Since last year'], a: 1 },
    { q: 'How often should she take the medicine?', v: 'Cô ấy nên uống thuốc mấy lần?', o: ['Once a day', 'Three times a day', 'Twice a day'], a: 2 }
  ],
  'a2-shopping': [
    { q: 'What does Mai want to buy?', v: 'Mai muốn mua gì?', o: ['A jacket', 'A dress', 'Shoes'], a: 0 },
    { q: 'What is the problem with the first jacket?', v: 'Cái áo đầu tiên có vấn đề gì?', o: ['It is too long.', 'It is a little tight.', 'It is too expensive.'], a: 1 },
    { q: 'What does Mai decide to do?', v: 'Mai quyết định làm gì?', o: ['Go home', 'Look at shoes', 'Buy the bigger jacket'], a: 2 }
  ],
  'a2-friend': [
    { q: 'What is the friend\'s name?', v: 'Người bạn tên là gì?', o: ['Minh', 'Nam', 'Long'], a: 0 },
    { q: 'What do they do every Sunday?', v: 'Họ làm gì vào mỗi Chủ nhật?', o: ['Go swimming', 'Play football', 'Watch films'], a: 1 },
    { q: 'How do they stay in touch now?', v: 'Giờ họ giữ liên lạc thế nào?', o: ['They write letters.', 'They never talk.', 'They talk every week.'], a: 2 }
  ],
  'b1-remote': [
    { q: 'What is one advantage of working from home?', v: 'Một lợi thế của làm việc tại nhà là gì?', o: ['No commuting time', 'A higher salary', 'More meetings'], a: 0 },
    { q: 'Why do some people feel lonely?', v: 'Vì sao một số người cảm thấy cô đơn?', o: ['They work too much.', 'They rarely meet colleagues.', 'They have no computer.'], a: 1 },
    { q: 'What do many companies offer now?', v: 'Nhiều công ty hiện nay cho phép gì?', o: ['Only home days', 'Only office days', 'A mix of office days and home days'], a: 2 }
  ],
  'b1-sleep': [
    { q: 'How many hours do experts recommend for adults?', v: 'Chuyên gia khuyên người lớn ngủ mấy tiếng?', o: ['Seven to nine hours', 'Four to six hours', 'Ten to twelve hours'], a: 0 },
    { q: 'What does the body do during sleep?', v: 'Cơ thể làm gì khi ngủ?', o: ['It stops working.', 'It repairs itself.', 'It gets tired.'], a: 1 },
    { q: 'What should you avoid before bed?', v: 'Bạn nên tránh gì trước khi đi ngủ?', o: ['Water', 'Reading', 'Screens'], a: 2 }
  ],
  'b1-interview': [
    { q: 'What did Linh study?', v: 'Linh học ngành gì?', o: ['Marketing', 'Medicine', 'Law'], a: 0 },
    { q: 'Why does Linh want a new job?', v: 'Vì sao Linh muốn đổi việc?', o: ['She dislikes her team.', 'She wants more responsibility.', 'She wants a shorter day.'], a: 1 },
    { q: 'When can Linh start?', v: 'Khi nào Linh có thể bắt đầu?', o: ['Tomorrow', 'Next week', 'In a month'], a: 2 }
  ],
  'b1-language': [
    { q: 'What is more effective?', v: 'Điều gì hiệu quả hơn?', o: ['Twenty minutes every day', 'Five hours once a week', 'One hour once a month'], a: 0 },
    { q: 'What can help your understanding?', v: 'Điều gì giúp bạn hiểu tốt hơn?', o: ['Reading only grammar', 'Listening to songs and watching films', 'Avoiding people'], a: 1 },
    { q: 'What should you not be afraid of?', v: 'Bạn không nên sợ điều gì?', o: ['Speaking slowly', 'Asking questions', 'Making mistakes'], a: 2 }
  ]
};
