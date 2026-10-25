/* hiuhf0 — chủ đề nhật ký tiếng Anh.
 * Mỗi chủ đề: icon, tên tiếng Việt, cấp gợi ý, các chủ đề từ vựng liên quan (vocab), gợi ý đề (prompts),
 * câu mở đầu (starters) và một mẫu điền chỗ trống (template). Mọi cặp là [tiếng Anh, tiếng Việt]. */
window.JOURNAL_MOODS = [
  ['😄', 'Rất vui'], ['😊', 'Vui'], ['🥰', 'Yêu đời'], ['🤩', 'Hào hứng'], ['😐', 'Bình thường'],
  ['😴', 'Mệt'], ['😰', 'Lo lắng'], ['😢', 'Buồn'], ['😠', 'Bực']
];

window.JOURNAL_TOPICS = [
  {
    key: 'today', icon: '📝', vi: 'Hôm nay của mình', level: 'A1', vocab: ['routine', 'calendar'],
    prompts: [['What did you do today?', 'Hôm nay bạn đã làm gì?'], ['What was the best part of your day?', 'Điều tuyệt nhất trong ngày của bạn là gì?'], ['What was difficult today?', 'Điều gì khó khăn hôm nay?']],
    starters: [['Today I ...', 'Hôm nay mình ...'], ['In the morning, I ...', 'Buổi sáng, mình ...'], ['In the afternoon, I ...', 'Buổi chiều, mình ...'], ['In the evening, I ...', 'Buổi tối, mình ...'], ['The best part of my day was ...', 'Điều tuyệt nhất trong ngày là ...'], ['I felt ... because ...', 'Mình cảm thấy ... vì ...']],
    template: ['Today is ___. The weather is ___. In the morning, I ___. In the afternoon, I ___. I feel ___ because ___.', 'Hôm nay là ___. Thời tiết ___. Buổi sáng mình ___. Buổi chiều mình ___. Mình thấy ___ vì ___.']
  },
  {
    key: 'gratitude', icon: '🙏', vi: 'Biết ơn', level: 'A1', vocab: ['feelings', 'people'],
    prompts: [['Write three things you are thankful for.', 'Viết ba điều bạn biết ơn.'], ['Who helped you recently? How?', 'Gần đây ai đã giúp bạn? Giúp thế nào?'], ['What small thing made you smile today?', 'Điều nhỏ nào khiến bạn mỉm cười hôm nay?']],
    starters: [['I am thankful for ...', 'Mình biết ơn vì ...'], ['I am lucky to have ...', 'Mình may mắn khi có ...'], ['Thank you to ... because ...', 'Cảm ơn ... vì ...'], ['Something small that made me smile was ...', 'Một điều nhỏ làm mình cười là ...']],
    template: ['I am thankful for 1) ___ 2) ___ 3) ___. I feel ___.', 'Mình biết ơn vì 1) ___ 2) ___ 3) ___. Mình thấy ___.']
  },
  {
    key: 'dream', icon: '🌟', vi: 'Ước mơ và mục tiêu', level: 'A2', vocab: ['jobs', 'school', 'abstract'],
    prompts: [['What is your dream job? Why?', 'Công việc mơ ước của bạn là gì? Vì sao?'], ['Where do you want to be in ten years?', 'Mười năm nữa bạn muốn ở đâu?'], ['What do you want to learn this year?', 'Năm nay bạn muốn học điều gì?']],
    starters: [['I want to be ...', 'Mình muốn trở thành ...'], ['My dream is to ...', 'Ước mơ của mình là ...'], ['In ten years, I will ...', 'Mười năm nữa, mình sẽ ...'], ['To reach my goal, I need to ...', 'Để đạt mục tiêu, mình cần ...'], ['One day, I hope to ...', 'Một ngày nào đó, mình hy vọng sẽ ...']],
    template: ['My dream is to ___. I want to ___ because ___. To reach my goal, I need to ___. One day I will ___.', 'Ước mơ của mình là ___. Mình muốn ___ vì ___. Để đạt mục tiêu mình cần ___. Một ngày nào đó mình sẽ ___.']
  },
  {
    key: 'food', icon: '🍜', vi: 'Ăn uống', level: 'A1', vocab: ['food', 'sit-restaurant'],
    prompts: [['What did you eat today?', 'Hôm nay bạn đã ăn gì?'], ['Describe your favorite dish.', 'Hãy tả món ăn bạn thích nhất.'], ['Write how to cook one simple dish.', 'Viết cách nấu một món đơn giản.']],
    starters: [['For breakfast, I had ...', 'Bữa sáng mình ăn ...'], ['My favorite food is ... because ...', 'Món mình thích nhất là ... vì ...'], ['It tastes ...', 'Nó có vị ...'], ['First, ... Then, ... Finally, ...', 'Đầu tiên ... Sau đó ... Cuối cùng ...']],
    template: ['For breakfast, I had ___. For lunch, I ate ___. My favorite food is ___ because it tastes ___.', 'Bữa sáng mình ăn ___. Bữa trưa mình ăn ___. Món mình thích nhất là ___ vì nó có vị ___.']
  },
  {
    key: 'family', icon: '👪', vi: 'Gia đình', level: 'A1', vocab: ['people', 'home'],
    prompts: [['Tell me about one person in your family.', 'Hãy kể về một người trong gia đình bạn.'], ['What do you do with your family on weekends?', 'Cuối tuần bạn làm gì cùng gia đình?'], ['Describe your home.', 'Hãy tả ngôi nhà của bạn.']],
    starters: [['My ... is ...', 'Người thân của mình là ...'], ['He/She likes to ...', 'Anh/Cô ấy thích ...'], ['We often ... together.', 'Chúng mình thường ... cùng nhau.'], ['I love my family because ...', 'Mình yêu gia đình vì ...']],
    template: ['My ___ is ___ years old. He/She is ___. He/She likes to ___. We often ___ together.', 'Người thân của mình ___ tuổi. Người ấy ___. Người ấy thích ___. Chúng mình thường ___ cùng nhau.']
  },
  {
    key: 'friends', icon: '🤝', vi: 'Bạn bè', level: 'A1', vocab: ['people', 'feelings'],
    prompts: [['Describe your best friend.', 'Hãy tả người bạn thân nhất của bạn.'], ['What do you and your friends do for fun?', 'Bạn và bạn bè làm gì để vui?'], ['What makes a good friend?', 'Thế nào là một người bạn tốt?']],
    starters: [['My best friend is ...', 'Bạn thân nhất của mình là ...'], ['We met at ...', 'Chúng mình gặp nhau ở ...'], ['A good friend is someone who ...', 'Một người bạn tốt là người ...'], ['Last weekend, we ...', 'Cuối tuần trước, chúng mình ...']],
    template: ['My best friend is ___. We met at ___. He/She is ___ and ___. We like to ___ together.', 'Bạn thân nhất của mình là ___. Chúng mình gặp nhau ở ___. Bạn ấy ___ và ___. Chúng mình thích ___ cùng nhau.']
  },
  {
    key: 'study-work', icon: '💼', vi: 'Học tập và công việc', level: 'A2', vocab: ['school', 'work', 'jobs'],
    prompts: [['What did you learn today?', 'Hôm nay bạn đã học được gì?'], ['Describe your job or your school.', 'Hãy tả công việc hoặc trường học của bạn.'], ['What is the hardest part of your work or study?', 'Phần khó nhất trong công việc hoặc việc học của bạn là gì?']],
    starters: [['At work, I ...', 'Ở chỗ làm, mình ...'], ['At school, we ...', 'Ở trường, chúng mình ...'], ['Today I learned that ...', 'Hôm nay mình học được rằng ...'], ['My teacher/boss told me to ...', 'Thầy/sếp bảo mình ...'], ['I have to finish ... by ...', 'Mình phải xong ... trước ...']],
    template: ['I work/study at ___. Today I had to ___. The hardest part was ___. I learned that ___.', 'Mình làm/học ở ___. Hôm nay mình phải ___. Phần khó nhất là ___. Mình học được rằng ___.']
  },
  {
    key: 'travel', icon: '✈️', vi: 'Du lịch', level: 'A2', vocab: ['travel', 'vehicles', 'sit-hotel', 'sit-airport'],
    prompts: [['Describe a place you want to visit.', 'Hãy tả một nơi bạn muốn đến.'], ['Write about your best trip.', 'Viết về chuyến đi tuyệt nhất của bạn.'], ['How do you like to travel? Why?', 'Bạn thích đi du lịch thế nào? Vì sao?']],
    starters: [['I want to visit ... because ...', 'Mình muốn đến ... vì ...'], ['Last year, I went to ...', 'Năm ngoái, mình đã đến ...'], ['We stayed in a ... for ... days.', 'Chúng mình ở ... trong ... ngày.'], ['The best thing about the trip was ...', 'Điều tuyệt nhất của chuyến đi là ...']],
    template: ['Last year, I went to ___ with ___. We traveled by ___. We stayed in a ___ for ___ days. The best thing was ___.', 'Năm ngoái mình đến ___ cùng ___. Chúng mình đi bằng ___. Chúng mình ở ___ trong ___ ngày. Điều tuyệt nhất là ___.']
  },
  {
    key: 'weather', icon: '⛅', vi: 'Thời tiết', level: 'A1', vocab: ['weather', 'clothes'],
    prompts: [['How is the weather today?', 'Hôm nay thời tiết thế nào?'], ['What do you do on a rainy day?', 'Bạn làm gì vào ngày mưa?'], ['What is your favorite season? Why?', 'Mùa bạn thích nhất là gì? Vì sao?']],
    starters: [['Today it is ...', 'Hôm nay trời ...'], ['It is ... and ...', 'Trời ... và ...'], ['On rainy days, I ...', 'Vào ngày mưa, mình ...'], ['My favorite season is ... because ...', 'Mùa mình thích nhất là ... vì ...']],
    template: ['Today it is ___ and ___. I wear ___. On days like this, I like to ___. My favorite season is ___ because ___.', 'Hôm nay trời ___ và ___. Mình mặc ___. Những ngày như vậy mình thích ___. Mùa mình thích nhất là ___ vì ___.']
  },
  {
    key: 'hobbies', icon: '🎧', vi: 'Sở thích', level: 'A1', vocab: ['leisure', 'sports'],
    prompts: [['What do you do in your free time?', 'Lúc rảnh bạn làm gì?'], ['Tell me about a hobby you want to try.', 'Kể về một sở thích bạn muốn thử.'], ['What music do you like?', 'Bạn thích nghe nhạc gì?']],
    starters: [['In my free time, I ...', 'Lúc rảnh, mình ...'], ['I like ... because it is ...', 'Mình thích ... vì nó ...'], ['I started ... when I was ...', 'Mình bắt đầu ... khi mình ...'], ['I want to try ...', 'Mình muốn thử ...']],
    template: ['In my free time, I like to ___. I started when I was ___. It makes me feel ___. I want to try ___.', 'Lúc rảnh mình thích ___. Mình bắt đầu khi mình ___ tuổi. Nó làm mình thấy ___. Mình muốn thử ___.']
  },
  {
    key: 'week-plan', icon: '🗓️', vi: 'Kế hoạch tuần này', level: 'A2', vocab: ['calendar', 'routine'],
    prompts: [['What will you do this week?', 'Tuần này bạn sẽ làm gì?'], ['What are your plans for the weekend?', 'Kế hoạch cuối tuần của bạn là gì?'], ['What do you hope to finish this week?', 'Bạn hy vọng xong điều gì trong tuần này?']],
    starters: [['This week, I will ...', 'Tuần này, mình sẽ ...'], ['On Monday, I am going to ...', 'Thứ Hai, mình định ...'], ['I hope to finish ...', 'Mình hy vọng xong ...'], ['On the weekend, I want to ...', 'Cuối tuần, mình muốn ...']],
    template: ['This week, I will ___. On Monday, I am going to ___. On Friday, I have ___. On the weekend, I want to ___.', 'Tuần này mình sẽ ___. Thứ Hai mình định ___. Thứ Sáu mình có ___. Cuối tuần mình muốn ___.']
  },
  {
    key: 'memory', icon: '📸', vi: 'Kỷ niệm', level: 'A2', vocab: ['feelings', 'people'],
    prompts: [['Write about a happy memory.', 'Viết về một kỷ niệm vui.'], ['What do you remember about your first day at school?', 'Bạn nhớ gì về ngày đầu đi học?'], ['Write about a day you will never forget.', 'Viết về một ngày bạn không bao giờ quên.']],
    starters: [['I remember ...', 'Mình nhớ ...'], ['When I was ... years old, I ...', 'Khi mình ... tuổi, mình ...'], ['It was ...', 'Hôm đó ...'], ['I will never forget ...', 'Mình sẽ không bao giờ quên ...']],
    template: ['I remember the day when ___. I was ___ years old. It was ___. We ___. I felt ___. I will never forget ___.', 'Mình nhớ ngày ___. Khi đó mình ___ tuổi. Hôm đó ___. Chúng mình ___. Mình thấy ___. Mình sẽ không quên ___.']
  },
  {
    key: 'ideal-day', icon: '🌈', vi: 'Một ngày lý tưởng', level: 'A2', vocab: ['routine', 'leisure'],
    prompts: [['Describe your perfect day.', 'Hãy tả một ngày hoàn hảo của bạn.'], ['If you had a free day, what would you do?', 'Nếu có một ngày rảnh, bạn sẽ làm gì?']],
    starters: [['My perfect day starts with ...', 'Ngày hoàn hảo của mình bắt đầu bằng ...'], ['I would ...', 'Mình sẽ ...'], ['After that, I would ...', 'Sau đó, mình sẽ ...'], ['At night, I would ...', 'Buổi tối, mình sẽ ...']],
    template: ['My perfect day starts with ___. Then I would ___. For lunch, I would eat ___. In the evening, I would ___.', 'Ngày hoàn hảo của mình bắt đầu bằng ___. Rồi mình sẽ ___. Bữa trưa mình sẽ ăn ___. Buổi tối mình sẽ ___.']
  },
  {
    key: 'feelings', icon: '💛', vi: 'Cảm xúc', level: 'A1', vocab: ['feelings', 'body'],
    prompts: [['How do you feel today? Why?', 'Hôm nay bạn thấy thế nào? Vì sao?'], ['What makes you happy?', 'Điều gì làm bạn vui?'], ['What do you do when you feel sad or tired?', 'Bạn làm gì khi buồn hoặc mệt?']],
    starters: [['I feel ... because ...', 'Mình thấy ... vì ...'], ['I was ... when ...', 'Mình đã ... khi ...'], ['It makes me happy when ...', 'Mình vui khi ...'], ['When I am sad, I ...', 'Khi buồn, mình ...']],
    template: ['Today I feel ___ because ___. It makes me happy when ___. When I feel sad, I ___.', 'Hôm nay mình thấy ___ vì ___. Mình vui khi ___. Khi buồn, mình ___.']
  },
  {
    key: 'media', icon: '🎬', vi: 'Phim và sách', level: 'A2', vocab: ['leisure'],
    prompts: [['What movie or book do you like? Why?', 'Bạn thích phim hoặc sách nào? Vì sao?'], ['Tell the story of a film in five sentences.', 'Kể một bộ phim trong năm câu.'], ['Who is your favorite character?', 'Nhân vật bạn thích nhất là ai?']],
    starters: [['I watched/read ... last week.', 'Tuần trước mình đã xem/đọc ...'], ['It is about ...', 'Nó nói về ...'], ['My favorite character is ... because ...', 'Nhân vật mình thích là ... vì ...'], ['I recommend it because ...', 'Mình giới thiệu nó vì ...']],
    template: ['I watched/read ___ last week. It is about ___. My favorite character is ___ because ___. I recommend it because ___.', 'Tuần trước mình xem/đọc ___. Nó nói về ___. Nhân vật mình thích là ___ vì ___. Mình giới thiệu vì ___.']
  },
  {
    key: 'city', icon: '🏙️', vi: 'Nơi mình sống', level: 'A2', vocab: ['places', 'sit-directions', 'vehicles'],
    prompts: [['Describe the place where you live.', 'Hãy tả nơi bạn sống.'], ['What do you like and dislike about your city?', 'Bạn thích và không thích gì ở thành phố của bạn?'], ['How do you go to school or work?', 'Bạn đi học hoặc đi làm bằng gì?']],
    starters: [['I live in ...', 'Mình sống ở ...'], ['There is/are ... near my house.', 'Gần nhà mình có ...'], ['I like my city because ...', 'Mình thích thành phố của mình vì ...'], ['I go to ... by ...', 'Mình đi đến ... bằng ...']],
    template: ['I live in ___. It is a ___ place. Near my house, there is ___. I go to ___ by ___. I like it because ___.', 'Mình sống ở ___. Đó là nơi ___. Gần nhà có ___. Mình đến ___ bằng ___. Mình thích vì ___.']
  },
  {
    key: 'health', icon: '💪', vi: 'Sức khỏe và thể thao', level: 'A2', vocab: ['body', 'sports', 'sit-doctor'],
    prompts: [['How do you stay healthy?', 'Bạn giữ sức khỏe thế nào?'], ['What sport do you like?', 'Bạn thích môn thể thao nào?'], ['Write about the last time you were sick.', 'Viết về lần gần nhất bạn bị ốm.']],
    starters: [['To stay healthy, I ...', 'Để khỏe mạnh, mình ...'], ['I play/do ... every ...', 'Mình chơi/tập ... mỗi ...'], ['I had a ... so I ...', 'Mình bị ... nên mình ...'], ['I should ... more often.', 'Mình nên ... thường xuyên hơn.']],
    template: ['To stay healthy, I ___ and ___. I do/play ___ every ___. I sleep ___ hours. I should ___ more often.', 'Để khỏe mạnh mình ___ và ___. Mình tập/chơi ___ mỗi ___. Mình ngủ ___ tiếng. Mình nên ___ thường xuyên hơn.']
  },
  {
    key: 'shopping', icon: '🛍️', vi: 'Mua sắm', level: 'A1', vocab: ['shopping', 'clothes'],
    prompts: [['What did you buy recently?', 'Gần đây bạn đã mua gì?'], ['Do you like shopping? Why or why not?', 'Bạn có thích mua sắm không? Vì sao?'], ['What do you want to buy next?', 'Bạn muốn mua gì tiếp theo?']],
    starters: [['I bought ... at ...', 'Mình đã mua ... ở ...'], ['It cost ...', 'Nó giá ...'], ['I want to buy ... because ...', 'Mình muốn mua ... vì ...'], ['I like/do not like shopping because ...', 'Mình thích/không thích mua sắm vì ...']],
    template: ['I bought ___ at ___. It cost ___. It is ___ and ___. I want to buy ___ next because ___.', 'Mình mua ___ ở ___. Nó giá ___. Nó ___ và ___. Mình muốn mua ___ tiếp theo vì ___.']
  },
  {
    key: 'learned', icon: '💡', vi: 'Điều mới học được', level: 'A1', vocab: [], special: 'learned',
    prompts: [['Write three sentences with the new words you learned today.', 'Viết ba câu dùng những từ mới bạn học hôm nay.'], ['What new thing did you learn? Explain it in simple English.', 'Bạn học được điều gì mới? Giải thích bằng tiếng Anh đơn giản.']],
    starters: [['Today I learned the word ...', 'Hôm nay mình học từ ...'], ['It means ...', 'Nó có nghĩa là ...'], ['I can use it like this: ...', 'Mình dùng nó như thế này: ...'], ['A new thing I learned is ...', 'Một điều mới mình học là ...']],
    template: ['Today I learned the words ___, ___ and ___. ___ means ___. I can say: "___".', 'Hôm nay mình học các từ ___, ___ và ___. ___ nghĩa là ___. Mình có thể nói: "___".']
  },
  {
    key: 'routine', icon: '🌅', vi: 'Thói quen hằng ngày', level: 'A1', vocab: ['routine', 'calendar'],
    prompts: [['Describe your morning routine.', 'Hãy tả thói quen buổi sáng của bạn.'], ['What time do you go to bed? What do you do before sleep?', 'Mấy giờ bạn đi ngủ? Bạn làm gì trước khi ngủ?']],
    starters: [['I get up at ...', 'Mình thức dậy lúc ...'], ['Then I brush my teeth and ...', 'Sau đó mình đánh răng và ...'], ['I usually ... after ...', 'Mình thường ... sau khi ...'], ['Before bed, I always ...', 'Trước khi ngủ, mình luôn ...']],
    template: ['I get up at ___. Then I ___ and ___. I have breakfast at ___. I go to ___ at ___. Before bed, I always ___.', 'Mình thức dậy lúc ___. Sau đó mình ___ và ___. Mình ăn sáng lúc ___. Mình đi ___ lúc ___. Trước khi ngủ mình luôn ___.']
  },
  {
    key: 'animals', icon: '🐶', vi: 'Thú cưng và động vật', level: 'A1', vocab: ['animals', 'nature'],
    prompts: [['Do you have a pet? Describe it.', 'Bạn có thú cưng không? Hãy tả nó.'], ['What is your favorite animal? Why?', 'Con vật bạn thích nhất là gì? Vì sao?']],
    starters: [['I have a ... called ...', 'Mình có một ... tên là ...'], ['It is ... and ...', 'Nó ... và ...'], ['My favorite animal is ... because ...', 'Con vật mình thích nhất là ... vì ...'], ['It likes to ...', 'Nó thích ...']],
    template: ['I have a ___ called ___. It is ___ and ___. It likes to ___. My favorite animal is ___ because ___.', 'Mình có một ___ tên ___. Nó ___ và ___. Nó thích ___. Con vật mình thích nhất là ___ vì ___.']
  },
  {
    key: 'tomorrow', icon: '☀️', vi: 'Ngày mai', level: 'A2', vocab: ['calendar', 'routine'],
    prompts: [['What will you do tomorrow?', 'Ngày mai bạn sẽ làm gì?'], ['What do you want to do better tomorrow?', 'Ngày mai bạn muốn làm tốt hơn điều gì?']],
    starters: [['Tomorrow, I will ...', 'Ngày mai, mình sẽ ...'], ['I am going to ...', 'Mình định ...'], ['I need to ... before ...', 'Mình cần ... trước khi ...'], ['I hope tomorrow will be ...', 'Mình hy vọng ngày mai sẽ ...']],
    template: ['Tomorrow, I will wake up at ___. I am going to ___ and ___. I need to ___. I hope tomorrow will be ___.', 'Ngày mai mình sẽ dậy lúc ___. Mình định ___ và ___. Mình cần ___. Mình hy vọng ngày mai sẽ ___.']
  },
  {
    key: 'free', icon: '✍️', vi: 'Viết tự do', level: 'B1', vocab: [],
    prompts: [['Write anything you want today.', 'Hôm nay bạn muốn viết gì cũng được.'], ['Describe the last thing you thought about.', 'Hãy tả điều cuối cùng bạn nghĩ đến.']],
    starters: [['I have been thinking about ...', 'Dạo này mình hay nghĩ về ...'], ['Honestly, ...', 'Thành thật mà nói, ...'], ['Sometimes I wonder ...', 'Đôi khi mình tự hỏi ...']],
    template: ['___', '___']
  }
];

/* Thử thách 7 ngày: mỗi ngày một đề, hoàn thành cả 7 để nhận sticker. */
window.JOURNAL_CHALLENGE = [
  { day: 1, topic: 'free', icon: '👋', vi: 'Giới thiệu bản thân', prompt: ['Introduce yourself: your name, age, where you live and what you like.', 'Giới thiệu bản thân: tên, tuổi, nơi sống và điều bạn thích.'], template: ['My name is ___. I am ___ years old. I live in ___. I like ___ and ___.', 'Tên mình là ___. Mình ___ tuổi. Mình sống ở ___. Mình thích ___ và ___.'] },
  { day: 2, topic: 'routine', icon: '🌅', vi: 'Một ngày của bạn', prompt: ['Describe your normal day from morning to night.', 'Tả một ngày bình thường của bạn từ sáng đến tối.'], template: ['I get up at ___. I ___. At noon, I ___. In the evening, I ___. I go to bed at ___.', 'Mình dậy lúc ___. Mình ___. Buổi trưa mình ___. Buổi tối mình ___. Mình đi ngủ lúc ___.'] },
  { day: 3, topic: 'food', icon: '🍜', vi: 'Món ăn yêu thích', prompt: ['Write about your favorite food and who you eat it with.', 'Viết về món ăn bạn thích và bạn thường ăn cùng ai.'], template: ['My favorite food is ___. It tastes ___. I often eat it with ___. I eat it at ___.', 'Món mình thích nhất là ___. Nó có vị ___. Mình thường ăn cùng ___. Mình ăn ở ___.'] },
  { day: 4, topic: 'friends', icon: '🤝', vi: 'Người bạn quan trọng', prompt: ['Describe someone important to you.', 'Hãy tả một người quan trọng với bạn.'], template: ['___ is important to me. He/She is ___ and ___. We often ___ together. I am thankful because ___.', '___ rất quan trọng với mình. Người ấy ___ và ___. Chúng mình thường ___ cùng nhau. Mình biết ơn vì ___.'] },
  { day: 5, topic: 'city', icon: '🏙️', vi: 'Nơi bạn yêu thích', prompt: ['Write about a place you love and why.', 'Viết về một nơi bạn yêu và lý do.'], template: ['I love ___. It is ___ and ___. I go there ___. When I am there, I feel ___.', 'Mình yêu ___. Nơi đó ___ và ___. Mình đến đó ___. Khi ở đó mình thấy ___.'] },
  { day: 6, topic: 'memory', icon: '📸', vi: 'Hôm qua', prompt: ['What did you do yesterday? Use the past tense.', 'Hôm qua bạn đã làm gì? Hãy dùng thì quá khứ.'], template: ['Yesterday, I ___. Then I ___. In the evening, I ___. It was ___. I felt ___.', 'Hôm qua mình ___. Sau đó mình ___. Buổi tối mình ___. Hôm đó ___. Mình thấy ___.'] },
  { day: 7, topic: 'dream', icon: '🌟', vi: 'Kế hoạch và ước mơ', prompt: ['Write about your plans for next month and one big dream.', 'Viết về kế hoạch tháng sau và một ước mơ lớn.'], template: ['Next month, I will ___. I am going to ___. My big dream is to ___. I will start by ___.', 'Tháng sau mình sẽ ___. Mình định ___. Ước mơ lớn của mình là ___. Mình sẽ bắt đầu bằng ___.'] }
];
