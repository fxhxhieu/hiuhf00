/* Hội thoại cho 6 chủ đề tình huống (nhà hàng, khách sạn, sân bay, đi khám, hỏi đường, gọi điện).
 * Nạp sau texts.js và quiz.js. Dùng chung cho Shadowing, Dịch bài và Nghe hiểu hội thoại. */
window.TEXTS = window.TEXTS || [];
window.QUIZ = window.QUIZ || {};
window.TEXTS.push(
  {
    id: 'a2-sit-restaurant', level: 'A2', kind: 'Hội thoại', title: 'At the restaurant', titleVi: 'Ở nhà hàng',
    sentences: [
      ['Waiter: Good evening. Do you have a reservation?', 'Phục vụ: Chào buổi tối. Bạn đã đặt bàn chưa ạ?'],
      ['Lan: No, but a table for two, please.', 'Lan: Chưa, nhưng cho tôi một bàn hai người.'],
      ['Waiter: Of course. Here is the menu.', 'Phục vụ: Vâng ạ. Đây là thực đơn.'],
      ['Lan: What do you recommend?', 'Lan: Anh gợi ý món nào?'],
      ['Waiter: The chicken soup is very good today.', 'Phục vụ: Hôm nay món súp gà rất ngon.'],
      ['Lan: Great. I would like the chicken soup and a glass of water.', 'Lan: Tuyệt. Cho tôi súp gà và một ly nước.'],
      ['Waiter: Anything else?', 'Phục vụ: Bạn dùng thêm gì nữa không?'],
      ['Lan: No, thank you. This soup is delicious!', 'Lan: Không, cảm ơn. Món súp này ngon quá!'],
      ['Lan: The bill, please. Can I pay by card?', 'Lan: Cho tôi tính tiền. Tôi trả bằng thẻ được không?'],
      ['Waiter: Yes, of course.', 'Phục vụ: Dạ được ạ.']
    ]
  },
  {
    id: 'a2-sit-hotel', level: 'A2', kind: 'Hội thoại', title: 'At the hotel', titleVi: 'Ở khách sạn',
    sentences: [
      ['Receptionist: Good afternoon. How can I help you?', 'Lễ tân: Chào buổi chiều. Tôi giúp gì được cho bạn ạ?'],
      ['Tom: I have a reservation under the name Tom Lee.', 'Tom: Tôi đã đặt phòng tên Tom Lee.'],
      ['Receptionist: One moment, please. Yes, a double room for two nights.', 'Lễ tân: Xin chờ một chút. Vâng, một phòng đôi hai đêm.'],
      ['Tom: Is breakfast included?', 'Tom: Có bao gồm bữa sáng không?'],
      ['Receptionist: Yes, breakfast is from six to ten.', 'Lễ tân: Có, bữa sáng từ sáu đến mười giờ.'],
      ['Tom: What time is check out?', 'Tom: Mấy giờ phải trả phòng?'],
      ['Receptionist: Check out is at twelve. Here is your key.', 'Lễ tân: Trả phòng lúc mười hai giờ. Đây là chìa khóa của bạn.'],
      ['Tom: Can I have the wifi password, please?', 'Tom: Cho tôi xin mật khẩu wifi.'],
      ['Receptionist: Of course. It is on the card.', 'Lễ tân: Vâng. Nó ở trên tấm thẻ.'],
      ['Tom: Thank you very much.', 'Tom: Cảm ơn bạn rất nhiều.']
    ]
  },
  {
    id: 'a2-sit-airport', level: 'A2', kind: 'Hội thoại', title: 'At the airport', titleVi: 'Ở sân bay',
    sentences: [
      ['Agent: Good morning. Passport, please.', 'Nhân viên: Chào buổi sáng. Xin cho xem hộ chiếu.'],
      ['Mai: Here is my passport and my ticket.', 'Mai: Đây là hộ chiếu và vé của tôi.'],
      ['Agent: Window seat or aisle seat?', 'Nhân viên: Ghế cạnh cửa sổ hay lối đi?'],
      ['Mai: A window seat, please.', 'Mai: Cho tôi ghế cạnh cửa sổ.'],
      ['Agent: How many bags do you have?', 'Nhân viên: Bạn có mấy túi hành lý?'],
      ['Mai: One bag, and this is my carry on bag.', 'Mai: Một túi, còn đây là hành lý xách tay.'],
      ['Agent: Your gate is number twelve. Boarding is at ten thirty.', 'Nhân viên: Cổng của bạn là số mười hai. Lên máy bay lúc mười giờ ba mươi.'],
      ['Mai: Thank you. Is the flight on time?', 'Mai: Cảm ơn. Chuyến bay có đúng giờ không?'],
      ['Agent: Yes, there is no delay. Have a nice flight!', 'Nhân viên: Có, không bị hoãn. Chúc bạn chuyến bay vui vẻ!']
    ]
  },
  {
    id: 'a2-sit-doctor', level: 'A2', kind: 'Hội thoại', title: 'Seeing the doctor', titleVi: 'Đi khám bệnh',
    sentences: [
      ['Doctor: Hello. What is the problem?', 'Bác sĩ: Chào bạn. Bạn bị sao?'],
      ['Nam: I do not feel well. I have a headache and a fever.', 'Nam: Tôi thấy không khỏe. Tôi đau đầu và bị sốt.'],
      ['Doctor: How long have you had these symptoms?', 'Bác sĩ: Bạn bị những triệu chứng này bao lâu rồi?'],
      ['Nam: Since yesterday evening.', 'Nam: Từ tối hôm qua.'],
      ['Doctor: Do you have a sore throat?', 'Bác sĩ: Bạn có đau họng không?'],
      ['Nam: Yes, a little.', 'Nam: Có, một chút.'],
      ['Doctor: You need to rest and drink a lot of water.', 'Bác sĩ: Bạn cần nghỉ ngơi và uống thật nhiều nước.'],
      ['Doctor: Take this medicine twice a day after meals.', 'Bác sĩ: Uống thuốc này hai lần một ngày sau bữa ăn.'],
      ['Nam: Thank you, doctor. Where is the nearest pharmacy?', 'Nam: Cảm ơn bác sĩ. Hiệu thuốc gần nhất ở đâu ạ?'],
      ['Doctor: It is next to the bank, on the corner.', 'Bác sĩ: Nó ở cạnh ngân hàng, ở góc đường.']
    ]
  },
  {
    id: 'a2-sit-directions', level: 'A2', kind: 'Hội thoại', title: 'Asking for directions', titleVi: 'Hỏi đường',
    sentences: [
      ['Tourist: Excuse me, how do I get to the station?', 'Du khách: Xin lỗi, tôi đến nhà ga bằng cách nào?'],
      ['Local: Go straight ahead for two blocks.', 'Người địa phương: Đi thẳng hai dãy nhà.'],
      ['Tourist: Is it far from here?', 'Du khách: Có xa đây không?'],
      ['Local: No, it is about ten minutes on foot.', 'Người địa phương: Không, đi bộ khoảng mười phút.'],
      ['Local: Then turn left at the traffic light.', 'Người địa phương: Sau đó rẽ trái ở đèn giao thông.'],
      ['Tourist: Turn left at the traffic light. Got it.', 'Du khách: Rẽ trái ở đèn giao thông. Tôi hiểu rồi.'],
      ['Local: Yes. The station is opposite the park.', 'Người địa phương: Đúng. Nhà ga ở đối diện công viên.'],
      ['Tourist: Can you show me on the map?', 'Du khách: Bạn chỉ giúp tôi trên bản đồ được không?'],
      ['Local: Sure. We are here, and the station is there.', 'Người địa phương: Được chứ. Chúng ta ở đây, còn nhà ga ở kia.'],
      ['Tourist: Thank you so much!', 'Du khách: Cảm ơn bạn rất nhiều!']
    ]
  },
  {
    id: 'a2-sit-phone', level: 'A2', kind: 'Hội thoại', title: 'On the phone', titleVi: 'Gọi điện thoại',
    sentences: [
      ['Lan: Hello, this is Lan speaking.', 'Lan: Alo, Lan đang nghe máy.'],
      ['Ben: Hi Lan, it is Ben. Can I speak to Mr Nam?', 'Ben: Chào Lan, Ben đây. Cho tôi nói chuyện với anh Nam được không?'],
      ['Lan: I am sorry, he is not here right now.', 'Lan: Xin lỗi, anh ấy hiện không có ở đây.'],
      ['Lan: Can I take a message?', 'Lan: Tôi nhắn lại giúp được không?'],
      ['Ben: Yes, please call me back after five.', 'Ben: Vâng, xin anh ấy gọi lại cho tôi sau năm giờ.'],
      ['Lan: After five. I will tell him.', 'Lan: Sau năm giờ. Tôi sẽ nói với anh ấy.'],
      ['Ben: Sorry, I cannot hear you very well.', 'Ben: Xin lỗi, tôi nghe không rõ lắm.'],
      ['Lan: Is it better now?', 'Lan: Giờ nghe rõ hơn chưa?'],
      ['Ben: Yes, thank you. My battery is low, so I will call you later.', 'Ben: Rồi, cảm ơn. Điện thoại tôi sắp hết pin, nên tôi sẽ gọi lại sau.'],
      ['Lan: No problem. Goodbye!', 'Lan: Không sao. Tạm biệt!']
    ]
  }
);

Object.assign(window.QUIZ, {
  'a2-sit-restaurant': [
    { q: 'How many people is the table for?', v: 'Bàn dành cho mấy người?', o: ['One', 'Two', 'Four'], a: 1 },
    { q: 'What does Lan order?', v: 'Lan gọi món gì?', o: ['Fish soup', 'Chicken soup', 'Noodles'], a: 1 },
    { q: 'How does Lan pay?', v: 'Lan trả tiền bằng cách nào?', o: ['By card', 'With cash', 'She does not pay'], a: 0 }
  ],
  'a2-sit-hotel': [
    { q: 'How many nights does Tom stay?', v: 'Tom ở mấy đêm?', o: ['One', 'Two', 'Three'], a: 1 },
    { q: 'What time is breakfast?', v: 'Bữa sáng lúc mấy giờ?', o: ['Six to ten', 'Seven to nine', 'Nine to twelve'], a: 0 },
    { q: 'What time is check out?', v: 'Mấy giờ phải trả phòng?', o: ['Ten', 'Eleven', 'Twelve'], a: 2 }
  ],
  'a2-sit-airport': [
    { q: 'Which seat does Mai want?', v: 'Mai muốn ngồi ghế nào?', o: ['Aisle seat', 'Window seat', 'Middle seat'], a: 1 },
    { q: 'What is the gate number?', v: 'Cổng lên máy bay là số mấy?', o: ['Ten', 'Twelve', 'Fifteen'], a: 1 },
    { q: 'How is the flight?', v: 'Chuyến bay thế nào?', o: ['Delayed', 'Cancelled', 'On time'], a: 2 }
  ],
  'a2-sit-doctor': [
    { q: 'What problem does Nam have?', v: 'Nam bị làm sao?', o: ['A cough and a cold', 'A headache and a fever', 'A stomachache'], a: 1 },
    { q: 'Since when does he feel ill?', v: 'Anh ấy thấy ốm từ khi nào?', o: ['Since yesterday evening', 'Since last week', 'Since this morning'], a: 0 },
    { q: 'How often should he take the medicine?', v: 'Anh ấy nên uống thuốc bao nhiêu lần?', o: ['Once a day', 'Twice a day', 'Three times a day'], a: 1 }
  ],
  'a2-sit-directions': [
    { q: 'How far is the station?', v: 'Nhà ga cách bao xa?', o: ['Ten minutes on foot', 'One hour by bus', 'Five minutes by taxi'], a: 0 },
    { q: 'Where should the tourist turn left?', v: 'Du khách nên rẽ trái ở đâu?', o: ['At the bank', 'At the traffic light', 'At the park'], a: 1 },
    { q: 'Where is the station?', v: 'Nhà ga ở đâu?', o: ['Next to the bank', 'Opposite the park', 'On the corner'], a: 1 }
  ],
  'a2-sit-phone': [
    { q: 'Who does Ben want to talk to?', v: 'Ben muốn nói chuyện với ai?', o: ['Lan', 'Mr Nam', 'Mr Tom'], a: 1 },
    { q: 'When should Mr Nam call back?', v: 'Khi nào anh Nam nên gọi lại?', o: ['Before five', 'After five', 'Tomorrow'], a: 1 },
    { q: 'Why will Ben call later?', v: 'Vì sao Ben sẽ gọi lại sau?', o: ['His battery is low', 'He is very busy', 'The line is busy'], a: 0 }
  ]
});
