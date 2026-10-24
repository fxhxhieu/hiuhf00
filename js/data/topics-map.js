/* hiuhf0 — phân loại lại chủ đề để hiển thị (xem js/data.js).
 * Bài của Lộ trình vẫn chia theo chủ đề gốc nên tiến độ cũ không bị ảnh hưởng.
 *   =chủ-đề|từ1, từ2    chuyển từ sang chủ đề đó
 *   +chủ-đề|từ1, từ2    thêm nhãn chủ đề phụ (một từ thuộc nhiều chủ đề)
 *   từ~loại             chỉ rõ một loại từ khi cần */
window.TOPICMAP_RAW = `
=animals|animal, dog, cat, bird, horse, cow, pig, duck, rabbit, monkey, elephant, tiger, lion, bear, snake, mouse, insect, butterfly, bee, spider, sheep, goat, wolf, frog, whale, wing, feather, species, wildlife, habitat, extinct
+animals|fish
+feelings|miss
=weather|weather, weather forecast, temperature, sunshine, storm, thunder, lightning, fog, ice, flood, snow, rain, wind, cloud, sunny, cloudy, windy, rainy, foggy, freeze, melt, shine, climate, global warming, drought
+weather|hot~adj, cold~adj, sun, sky, umbrella
=numbers|pair, twice, once, count, percent, zero, one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, hundred, thousand, million, first, second~adj, third, fourth, fifth, half, quarter
=calendar|Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, January, February, March, April, May, June, July, August, September, October, November, December, spring, summer, autumn, winter, today, tomorrow, yesterday, morning, noon, afternoon, evening, night, day, week, month, year, hour, minute, second~n, time, weekend, birthday, o'clock, century, daily, weekly, date, calendar, ago, past, future, recently, soon, later, during, until, since, already, yet, still, suddenly, last, next
=sports|goal, gym, stadium, medal, champion, kick, sport, football, basketball, tennis, swimming, volleyball, badminton, cycling, hiking, jogging, match, player, winner, prize, score, win, coach, athlete, referee, championship, tournament, compete, swim, run
+sports|exercise, team, lose, throw, catch
=jobs|journalist, soldier, shop assistant, teacher, doctor, nurse, driver, farmer, cook, boss, singer, actor, artist, engineer, lawyer, director, manager, secretary, colleague, pilot, captain, guide, worker, staff, employee, employer, job, career, salary, candidate, expert, volunteer, dentist, police
=vehicles|car, bus, train~n, plane, bike, bicycle, motorbike, taxi, boat, ship, subway, traffic, petrol
=routine|pajamas, wake up, sleep, alarm, shower~n, shower~v, breakfast, lunch, dinner, go to bed, soap, towel, wash, clean~v
=feelings|happy, sad, angry, scared, unhappy, glad, mad, hungry, thirsty, tired, smile, laugh, cry, lonely
`;
