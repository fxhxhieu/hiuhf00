/* Bài đọc dùng chung cho phần Shadowing và Dịch bài.
 * Mỗi câu: [tiếng Anh, bản dịch tiếng Việt]. */
window.TEXTS = [
  {
    id: 'a1-introduce', level: 'A1', kind: 'Đoạn văn', title: 'Introducing myself', titleVi: 'Giới thiệu bản thân',
    sentences: [
      ['My name is Lan.', 'Tên mình là Lan.'],
      ['I am twenty years old.', 'Mình hai mươi tuổi.'],
      ['I am from Vietnam.', 'Mình đến từ Việt Nam.'],
      ['I live in Hanoi with my family.', 'Mình sống ở Hà Nội cùng gia đình.'],
      ['I have a mother, a father and a little brother.', 'Mình có mẹ, bố và một em trai.'],
      ['I am a student at a big university.', 'Mình là sinh viên của một trường đại học lớn.'],
      ['I like music, books and cooking.', 'Mình thích âm nhạc, sách và nấu ăn.'],
      ['Nice to meet you!', 'Rất vui được gặp bạn!']
    ]
  },
  {
    id: 'a1-cafe', level: 'A1', kind: 'Hội thoại', title: 'At the cafe', titleVi: 'Ở quán cà phê',
    sentences: [
      ['Waiter: Good morning. What would you like?', 'Phục vụ: Chào buổi sáng. Bạn muốn dùng gì ạ?'],
      ['Tom: A cup of coffee, please.', 'Tom: Cho tôi một tách cà phê.'],
      ['Waiter: Do you want milk or sugar?', 'Phục vụ: Bạn muốn thêm sữa hay đường?'],
      ['Tom: Milk, please, but no sugar.', 'Tom: Cho tôi sữa, nhưng không đường.'],
      ['Waiter: Do you want something to eat?', 'Phục vụ: Bạn có muốn ăn gì không?'],
      ['Tom: Yes, I would like a cheese sandwich.', 'Tom: Có, tôi muốn một cái bánh sandwich phô mai.'],
      ['Waiter: That is five dollars, please.', 'Phục vụ: Của bạn là năm đô la.'],
      ['Tom: Here you are. Thank you!', 'Tom: Của bạn đây. Cảm ơn!']
    ]
  },
  {
    id: 'a1-routine', level: 'A1', kind: 'Đoạn văn', title: 'My daily routine', titleVi: 'Thói quen hằng ngày của tôi',
    sentences: [
      ['I wake up at six o\'clock every day.', 'Mỗi ngày mình thức dậy lúc sáu giờ.'],
      ['I wash my face and brush my teeth.', 'Mình rửa mặt và đánh răng.'],
      ['Then I eat breakfast with my family.', 'Sau đó mình ăn sáng cùng gia đình.'],
      ['I go to school by bike.', 'Mình đi học bằng xe đạp.'],
      ['School starts at seven thirty.', 'Trường học bắt đầu lúc bảy giờ ba mươi.'],
      ['In the afternoon I do my homework.', 'Buổi chiều mình làm bài tập về nhà.'],
      ['In the evening we watch TV and talk.', 'Buổi tối cả nhà xem ti vi và trò chuyện.'],
      ['I go to bed at ten.', 'Mình đi ngủ lúc mười giờ.']
    ]
  },
  {
    id: 'a1-weather', level: 'A1', kind: 'Đoạn văn', title: 'The weather today', titleVi: 'Thời tiết hôm nay',
    sentences: [
      ['Today is Saturday.', 'Hôm nay là thứ Bảy.'],
      ['The weather is nice and warm.', 'Thời tiết đẹp và ấm áp.'],
      ['The sky is blue and there are no clouds.', 'Bầu trời xanh và không có mây.'],
      ['My brother and I go to the park.', 'Anh trai mình và mình đi công viên.'],
      ['We play football and eat ice cream.', 'Chúng mình chơi bóng đá và ăn kem.'],
      ['Tomorrow it will rain, so we stay at home.', 'Ngày mai trời sẽ mưa nên chúng mình ở nhà.']
    ]
  },
  {
    id: 'a2-beach', level: 'A2', kind: 'Đoạn văn', title: 'A weekend at the beach', titleVi: 'Cuối tuần ở bãi biển',
    sentences: [
      ['Last weekend, my friends and I went to the beach.', 'Cuối tuần trước, tôi và bạn bè đã đi biển.'],
      ['We left the city early in the morning by bus.', 'Chúng tôi rời thành phố từ sáng sớm bằng xe buýt.'],
      ['The journey took about three hours.', 'Chuyến đi mất khoảng ba tiếng.'],
      ['When we arrived, the weather was sunny and the sea was calm.', 'Khi đến nơi, trời nắng và biển lặng.'],
      ['We swam, played volleyball and took many photos.', 'Chúng tôi bơi, chơi bóng chuyền và chụp rất nhiều ảnh.'],
      ['For lunch, we ate fresh fish at a small restaurant.', 'Bữa trưa, chúng tôi ăn cá tươi ở một nhà hàng nhỏ.'],
      ['In the evening, we watched the sun go down.', 'Buổi tối, chúng tôi ngắm mặt trời lặn.'],
      ['It was a wonderful trip, and I want to go again soon.', 'Đó là một chuyến đi tuyệt vời và tôi muốn sớm đi lần nữa.']
    ]
  },
  {
    id: 'a2-doctor', level: 'A2', kind: 'Hội thoại', title: 'At the doctor\'s', titleVi: 'Ở phòng khám',
    sentences: [
      ['Doctor: Good afternoon. What is the problem?', 'Bác sĩ: Chào bạn. Bạn bị làm sao?'],
      ['Anna: I have a sore throat and a fever.', 'Anna: Tôi bị đau họng và sốt.'],
      ['Doctor: How long have you felt like this?', 'Bác sĩ: Bạn thấy như vậy bao lâu rồi?'],
      ['Anna: Since Monday. I also have a bad cough.', 'Anna: Từ thứ Hai. Tôi còn bị ho nặng nữa.'],
      ['Doctor: Open your mouth, please. Yes, it is red.', 'Bác sĩ: Làm ơn há miệng ra. Vâng, họng bạn bị đỏ.'],
      ['Doctor: You have the flu. You should rest and drink a lot of water.', 'Bác sĩ: Bạn bị cúm. Bạn nên nghỉ ngơi và uống nhiều nước.'],
      ['Doctor: Take this medicine twice a day.', 'Bác sĩ: Hãy uống thuốc này hai lần một ngày.'],
      ['Anna: Thank you, doctor. I hope I feel better soon.', 'Anna: Cảm ơn bác sĩ. Tôi hy vọng sẽ sớm khỏe hơn.']
    ]
  },
  {
    id: 'a2-shopping', level: 'A2', kind: 'Hội thoại', title: 'Shopping for clothes', titleVi: 'Mua quần áo',
    sentences: [
      ['Assistant: Can I help you?', 'Nhân viên: Tôi có thể giúp gì cho bạn?'],
      ['Mai: Yes, I am looking for a jacket.', 'Mai: Vâng, tôi đang tìm một cái áo khoác.'],
      ['Assistant: What size do you wear?', 'Nhân viên: Bạn mặc cỡ nào?'],
      ['Mai: Medium. Can I try this one on?', 'Mai: Cỡ vừa. Tôi mặc thử cái này được không?'],
      ['Assistant: Of course. The fitting rooms are over there.', 'Nhân viên: Dĩ nhiên rồi. Phòng thử đồ ở đằng kia.'],
      ['Mai: It is a little tight. Do you have a bigger size?', 'Mai: Nó hơi chật. Bạn có cỡ lớn hơn không?'],
      ['Assistant: Yes. This one is on sale today.', 'Nhân viên: Có. Cái này hôm nay đang giảm giá.'],
      ['Mai: Great! I will take it.', 'Mai: Tuyệt! Tôi sẽ mua cái này.']
    ]
  },
  {
    id: 'a2-friend', level: 'A2', kind: 'Đoạn văn', title: 'My best friend', titleVi: 'Người bạn thân nhất của tôi',
    sentences: [
      ['My best friend is called Minh.', 'Người bạn thân nhất của tôi tên là Minh.'],
      ['We have known each other since primary school.', 'Chúng tôi biết nhau từ hồi tiểu học.'],
      ['He is funny, kind and always ready to help.', 'Cậu ấy hài hước, tốt bụng và luôn sẵn sàng giúp đỡ.'],
      ['We both love football, and we play every Sunday.', 'Cả hai chúng tôi đều yêu bóng đá và chơi vào mỗi Chủ nhật.'],
      ['When I am worried, he listens to me carefully.', 'Khi tôi lo lắng, cậu ấy lắng nghe tôi rất cẩn thận.'],
      ['Last year he moved to another city, but we still talk every week.', 'Năm ngoái cậu ấy chuyển sang thành phố khác nhưng chúng tôi vẫn trò chuyện mỗi tuần.'],
      ['I miss him, and I hope to visit him this summer.', 'Tôi nhớ cậu ấy và hy vọng sẽ đến thăm cậu ấy vào mùa hè này.']
    ]
  },
  {
    id: 'b1-remote', level: 'B1', kind: 'Đoạn văn', title: 'Working from home', titleVi: 'Làm việc tại nhà',
    sentences: [
      ['More and more people are working from home these days.', 'Ngày nay ngày càng có nhiều người làm việc tại nhà.'],
      ['One advantage is that you do not have to spend time commuting.', 'Một lợi thế là bạn không phải mất thời gian đi lại.'],
      ['You can also organize your schedule in a more flexible way.', 'Bạn cũng có thể sắp xếp lịch trình linh hoạt hơn.'],
      ['However, some people find it difficult to concentrate at home.', 'Tuy nhiên, một số người thấy khó tập trung khi ở nhà.'],
      ['Others feel lonely because they rarely meet their colleagues.', 'Những người khác cảm thấy cô đơn vì hiếm khi gặp đồng nghiệp.'],
      ['To stay productive, it helps to have a quiet workspace and a clear routine.', 'Để làm việc hiệu quả, nên có một không gian làm việc yên tĩnh và thói quen rõ ràng.'],
      ['Many companies now offer a mix of office days and home days.', 'Nhiều công ty hiện nay cho phép kết hợp ngày làm ở văn phòng và ngày làm ở nhà.'],
      ['In my opinion, this is the best solution for most workers.', 'Theo tôi, đây là giải pháp tốt nhất cho hầu hết người lao động.']
    ]
  },
  {
    id: 'b1-sleep', level: 'B1', kind: 'Đoạn văn', title: 'Why sleep matters', titleVi: 'Vì sao giấc ngủ quan trọng',
    sentences: [
      ['Many adults do not get enough sleep, and this can affect their health.', 'Nhiều người lớn không ngủ đủ giấc và điều này có thể ảnh hưởng đến sức khỏe.'],
      ['When we sleep, our body repairs itself and our brain stores new information.', 'Khi ngủ, cơ thể tự phục hồi và não bộ lưu trữ thông tin mới.'],
      ['A lack of sleep can cause stress, headaches and difficulty concentrating.', 'Thiếu ngủ có thể gây căng thẳng, đau đầu và khó tập trung.'],
      ['Experts recommend that adults sleep between seven and nine hours a night.', 'Các chuyên gia khuyên người lớn nên ngủ từ bảy đến chín tiếng mỗi đêm.'],
      ['To sleep better, try to go to bed at the same time every day.', 'Để ngủ ngon hơn, hãy cố gắng đi ngủ vào cùng một giờ mỗi ngày.'],
      ['It is also a good idea to avoid screens for an hour before bed.', 'Cũng nên tránh màn hình điện thoại trong một giờ trước khi đi ngủ.'],
      ['Small changes in your habits can make a big difference.', 'Những thay đổi nhỏ trong thói quen có thể tạo nên khác biệt lớn.']
    ]
  },
  {
    id: 'b1-interview', level: 'B1', kind: 'Hội thoại', title: 'A job interview', titleVi: 'Buổi phỏng vấn xin việc',
    sentences: [
      ['Interviewer: Thank you for coming. Please tell me about yourself.', 'Người phỏng vấn: Cảm ơn bạn đã đến. Hãy giới thiệu về bản thân nhé.'],
      ['Linh: I graduated in marketing two years ago, and I have worked for a small company since then.', 'Linh: Tôi tốt nghiệp ngành marketing hai năm trước và làm cho một công ty nhỏ kể từ đó.'],
      ['Interviewer: Why do you want to leave your current job?', 'Người phỏng vấn: Vì sao bạn muốn rời công việc hiện tại?'],
      ['Linh: I would like more responsibility and the chance to develop new skills.', 'Linh: Tôi muốn có thêm trách nhiệm và cơ hội phát triển kỹ năng mới.'],
      ['Interviewer: What is your greatest strength?', 'Người phỏng vấn: Điểm mạnh lớn nhất của bạn là gì?'],
      ['Linh: I am reliable, and I work well in a team.', 'Linh: Tôi đáng tin cậy và làm việc nhóm tốt.'],
      ['Interviewer: When would you be able to start?', 'Người phỏng vấn: Khi nào bạn có thể bắt đầu đi làm?'],
      ['Linh: I can start in a month, after I finish my current project.', 'Linh: Tôi có thể bắt đầu sau một tháng, khi hoàn thành dự án hiện tại.']
    ]
  },
  {
    id: 'b1-language', level: 'B1', kind: 'Đoạn văn', title: 'Learning a new language', titleVi: 'Học một ngôn ngữ mới',
    sentences: [
      ['Learning a new language takes time, patience and regular practice.', 'Học một ngôn ngữ mới cần thời gian, sự kiên nhẫn và luyện tập đều đặn.'],
      ['Many learners make the mistake of studying for hours once a week.', 'Nhiều người học mắc sai lầm là học hàng giờ chỉ một lần mỗi tuần.'],
      ['It is much more effective to study for twenty minutes every day.', 'Học hai mươi phút mỗi ngày hiệu quả hơn nhiều.'],
      ['Listening to songs and watching films can improve your understanding.', 'Nghe nhạc và xem phim có thể giúp bạn hiểu tốt hơn.'],
      ['Do not be afraid of making mistakes, because they are part of the process.', 'Đừng sợ mắc lỗi vì đó là một phần của quá trình học.'],
      ['Try to speak with other people as often as possible.', 'Hãy cố gắng nói chuyện với người khác thường xuyên nhất có thể.'],
      ['After a few months, you will notice real progress.', 'Sau vài tháng, bạn sẽ nhận thấy sự tiến bộ thật sự.']
    ]
  }
];
