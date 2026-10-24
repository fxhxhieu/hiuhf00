# hiuhf0

Web học từ vựng tiếng Anh, chạy hoàn toàn trên trình duyệt (HTML, CSS, JavaScript thuần), không cần server hay bước build. Đẩy lên GitHub Pages là dùng được.

## Tính năng

- **Giao diện "mochi dango"**: nền kem ấm, nút nổi kiểu chunky, font Nunito (tải sẵn trong repo, dùng được offline). Linh vật **Dango** (xiên bánh mochi hồng, trắng, xanh) có 7 biểu cảm, chào bạn mỗi ngày, đổi mặt theo từng câu trả lời và ăn mừng khi xong phiên. Ba giao diện màu **Matcha, Sakura, Bầu trời**, mỗi cái có chế độ sáng và tối.
- **Hiệu ứng vui mắt** (Cài đặt, mục "Hiệu ứng": Đầy đủ, Nhẹ, Tắt): thẻ nảy kiểu thạch khi đúng, rung nhẹ khi sai, lấp lánh, pháo giấy, chip lên cấp, sao cuối phiên, họa tiết nền trôi chậm. Tự tắt khi hệ điều hành bật "giảm chuyển động". **Âm thanh** (Web Audio, không cần file) và **rung** trên điện thoại mặc định tắt, bật trong Cài đặt.
- **Trang Hôm nay**: Dango, thanh tiến độ ngày và ba việc nhỏ (ôn thẻ, học từ mới, một lượt nghe). Xong cả ba nhận sticker "Ngày trọn vẹn". Trang **Tiến độ** có thống kê, lịch ôn, biểu đồ 14 ngày; trang **Luyện** gom Nghe, Nói, Phát âm, Shadowing; trang **Thêm** gom Dịch bài, Tiến độ, Sổ sticker, Xếp trình độ, Cài đặt (thanh điều hướng còn 5 mục).
- **Sổ sticker**: 23 sticker thành tích (một số là Dango tạo dáng) cùng 2 sticker cho mỗi chủ đề (khám phá khi học 90% từ, vững khi 80% từ lên cấp 4 trở lên). Nhận sticker thì sticker bật ra giữa màn hình kèm pháo giấy.
- **Chủ đề**: màn hình lưới chủ đề có % đã học; bấm vào để **học cả chủ đề** (10 từ mới mỗi lượt) hoặc ôn các thẻ đến hạn của chủ đề. Một từ có thể thuộc nhiều chủ đề (ví dụ *fish* vừa là Ăn uống vừa là Động vật). Thẻ chưa có emoji riêng dùng biểu tượng chủ đề làm sticker.
- **Chủ đề mới và 198 từ mới**: Động vật, Thời tiết, Số đếm, Lịch, Thể thao, Nghề nghiệp, Phương tiện, Thói quen hằng ngày, và 6 chủ đề **tình huống giao tiếp** (nhà hàng, khách sạn, sân bay, đi khám, hỏi đường, gọi điện) gồm 73 câu ngắn dùng được ngay.
- **Học kiểu Mochi, hệ thống tự xếp cấp**: không cần chọn bộ thẻ. Từ mới đi qua ba bước: lật thẻ, Nghe & chọn, Nghe & viết. Mỗi từ tự được xếp vào cấp 0 đến 5 (Mới, Mới gặp, Nhận ra, Nhớ được, Vững, Thuộc lòng). Cấp 2 là "đã qua bài trong phiên, chờ ôn lại sau ít nhất 1 ngày"; chỉ khi nhớ đúng lúc ôn lại mới lên cấp 3 trở lên. Từ cấp 4 trở lên phải gõ ra khi ôn, cấp 5 cần khoảng cách từ 21 ngày và ôn đúng 2 lần liên tiếp.
- **Học và ôn**: các nút Ôn tập ngay, Học từ mới, Học thêm 10 từ mới nằm ở trang Hôm nay. Sau mỗi thẻ có hai nút: **Tiếp tục** và **Đã nhớ rõ từ** (phím tắt 1 và 2). Với từ chưa học, "Đã nhớ rõ từ" phải qua một câu nghe và gõ lại thì mới lên thẳng cấp 5. Cuối phiên có danh sách từ cần chú ý.
- **Lặp lại ngắt quãng (SRS)**: biến thể SM-2. Bước học 1 phút và 10 phút, sau đó tính bằng ngày. Khoảng cách tính theo số ngày thực tế: ôn sớm mà đúng thì không đổi lịch, ôn trễ được cộng nửa số ngày trễ. Đúng nhờ trắc nghiệm thì khoảng cách tăng chậm hơn gõ đúng. Quên thì khoảng cách còn 25% (tối đa 14 ngày). Gõ sai đúng một ký tự (từ từ 5 chữ cái) được gõ lại một lần, và chấp nhận chính tả Anh–Mỹ lẫn Anh–Anh. Sai ở bài Nghe, Nói hoặc Kiểm tra cuối bài cũng kéo lịch ôn của từ đã thuộc lại gần hơn (tối đa một lần mỗi ngày).
- **Mục tiêu và xếp trình độ**: lần đầu mở app có màn chào mừng để chọn mục tiêu (giao tiếp, IELTS, TOEIC) và số từ mới mỗi ngày, rồi làm bài xếp trình độ tối đa 20 câu để bỏ qua các cấp đã biết. "Học từ mới" đi theo đúng thứ tự bài trong Lộ trình; mục tiêu IELTS hoặc TOEIC ưu tiên từ của kỳ thi sau phần nền tảng A0 và A1.
- **Lịch ôn sắp tới**: trang Tiến độ dự báo số thẻ đến hạn hôm nay, ngày mai, 2 đến 7 ngày tới, và tỉ lệ nhớ đúng khi ôn trong 14 ngày qua (hiện sau 10 lượt ôn). Thanh cấp thuộc tính trên số từ đã học.
- **Từ của tôi**: thêm từ gặp ngoài đời ở Thư viện, hoặc bấm vào từ lạ trong Dịch bài. Từ được học sớm nhất và nằm trong sao lưu.
- **Nhắc sao lưu**: trang chính nhắc khi đã quá 7 ngày chưa xuất file sao lưu.
- **2.369 từ vựng** chia theo cấp độ A0 Nhập môn (100 từ: đại từ, mạo từ, to be, trợ động từ, số, mẫu câu chào hỏi), A1, A2, B1 và 37 chủ đề, gồm hai chủ đề thi: IELTS (từ học thuật) và TOEIC (công sở, kinh doanh). Mỗi từ có loại từ, nghĩa tiếng Việt, định nghĩa Anh–Anh, câu ví dụ, IPA; hơn 600 từ có thêm emoji minh họa.
- **Thư viện từ**: tìm theo tiếng Anh hoặc tiếng Việt, lọc theo cấp độ CEFR, chủ đề, cấp thuộc; ưu tiên học một từ hoặc đánh dấu "đã nhớ rõ".
- **Phiên âm IPA (Anh–Mỹ)** cho cả 2.369 từ, hiện trên thẻ, bài tập, thư viện và bảng tra từ; tắt/bật trong Cài đặt. Dữ liệu ở `js/data/ipa.js`, lấy từ open-dict-data/ipa-dict (MIT) và chỉnh tay các từ đồng tự khác âm (read, live, use…).
- **Lộ trình** gồm 249 bài nhỏ (khoảng 10 từ mỗi bài). Mỗi bài có 4 bước: học từ, luyện nghe, luyện nói, kiểm tra cuối (đạt từ 70% thì mở bài tiếp theo). Bài đã biết thì bấm "Mình đã biết hết, kiểm tra ngay" (đạt từ 70% là qua), hoặc làm bài xếp trình độ, hoặc mở khóa toàn bộ trong Cài đặt.
- **Luyện nói**: đọc to từng từ, trình duyệt (Chrome, Edge) tự chấm; mỗi từ kèm gợi ý đặt lưỡi, môi cho các âm khó (th, r, l, sh, ch, ng, âm cuối, nguyên âm ngắn dài). Nhóm luyện theo âm hoặc theo từ khó của bạn.
- **Từ khó** tự cập nhật: từ làm sai ở bài nghe hoặc bài nói được thêm vào, làm đúng lại thì được bỏ ra.
- **Nghe** (8 chế độ, thêm Nghe và chọn hình, mỗi lượt 10 câu, chọn cấp A0 đến B1 và tốc độ): nghe và chọn nghĩa, nghe và viết từ, nghe số và giá tiền (phân biệt 13/30, số điện thoại), nghe giờ (chọn đồng hồ), nghe và sắp xếp câu, nghe và chép câu (chấm từng từ), nghe hiểu hội thoại (2 giọng, có câu hỏi cho 18 bài). Có nghe chậm, phím tắt, thống kê từng chế độ.
- **Phát âm**: 13 nhóm cặp âm dễ nhầm (ship/sheep, light/right, think/sink…) kèm IPA, nghe từng từ và bài **Luyện tai** (nghe rồi chọn từ đúng).
- **Từ khó**: tự gom những từ bạn từng quên, luyện riêng 20 từ mỗi lượt; có bộ lọc “Từ khó” và lọc theo loại từ trong thư viện.
- **Mục tiêu hôm nay** hiện ngay ở trang chính.
- **Dùng offline / cài như ứng dụng (PWA)** khi mở qua https (GitHub Pages).
- **Shadowing**: 12 bài (hội thoại và đoạn văn). Nghe câu mẫu, ghi âm giọng bạn, nghe lại để so sánh, chế độ tự động "nghe rồi nhại", chấm điểm phát âm tham khảo (Chrome, Edge).
- **Dịch bài**: bấm vào từ để tra nghĩa, hiện bản dịch từng câu, hoặc tự dịch rồi đối chiếu. Bản nháp được lưu.
- Chế độ sáng/tối, phím tắt (Space để lật, 1 để Tiếp tục, 2 để Đã nhớ rõ từ, 1 đến 4 chọn đáp án, P để nghe), xuất/nhập file sao lưu tiến độ.

## Đưa lên GitHub Pages

```bash
cd hiuhf0
git init
git add .
git commit -m "Thêm hiuhf0"
git branch -M main
git remote add origin https://github.com/<ten-ban>/hiuhf0.git
git push -u origin main
```

Sau đó vào repo trên GitHub, chọn **Settings → Pages → Build and deployment**, đặt Source là **Deploy from a branch**, chọn nhánh `main`, thư mục `/ (root)`. Vài phút sau trang sẽ có tại `https://<ten-ban>.github.io/hiuhf0/`.

Chạy thử trên máy: mở thư mục bằng một server tĩnh bất kỳ, ví dụ `python3 -m http.server 8000` rồi vào `http://localhost:8000`. Micro (Shadowing) chỉ hoạt động trên `https` hoặc `localhost`, nên GitHub Pages dùng được còn mở thẳng file `index.html` thì có thể bị chặn micro.

## Cấu trúc

```
index.html
css/style.css
fonts/        font Nunito (OFL) tải sẵn để chạy offline
tests/        kiểm thử bằng node --test (srs.test.js, data.test.js)
js/
  app.js       giao diện và các màn hình
  srs.js       thuật toán lặp lại ngắt quãng và cách xếp cấp thuộc
  store.js     lưu tiến độ vào localStorage, xuất/nhập JSON
  tts.js       đọc to bằng Web Speech API
  mascot.js    Dango bằng SVG nhúng (7 biểu cảm)
  fx.js        hiệu ứng, âm thanh, rung, sticker bật ra
  (sw.js, manifest.webmanifest, icons/ ở thư mục gốc: PWA dùng offline)
  data.js      đọc và lập chỉ mục dữ liệu từ vựng
  data/
    vocab-a1-1.js … vocab-b1-2.js   từ vựng
    vocab-a0.js                      từ nhập môn A0
    vocab-a2-3.js, vocab-b1-3.js     từ bổ sung A2, B1
    vocab-exam.js                    từ IELTS và TOEIC
    vocab-extra.js                   từ bổ sung theo chủ đề mới và các tình huống giao tiếp
    topics-map.js                    phân loại lại chủ đề để hiển thị (=chuyển, +thêm nhãn)
    emoji.js                         emoji minh họa (từ|emoji)
    texts.js, texts-a0.js            bài shadowing / dịch bài
    quiz.js                          câu hỏi nghe hiểu cho từng bài
    ipa.js                           phiên âm IPA từng từ (từ|IPA)
    pairs.js                         cặp âm dễ nhầm
```

## Kiểm thử

Thuật toán SRS (`js/srs.js`) có bộ kiểm thử chạy bằng Node, không cần cài thêm gì:

```bash
node --test
```

## Thêm từ vựng

Mở một file trong `js/data/` (hoặc tạo file mới rồi thêm thẻ `<script>` vào `index.html`, đặt trước `js/data.js`). Mỗi từ là một dòng, các trường cách nhau bằng dấu `|`:

```
từ|loại từ|nghĩa tiếng Việt|định nghĩa tiếng Anh|câu ví dụ
```

Dòng bắt đầu bằng `#` đặt chủ đề cho các từ phía dưới, ví dụ `# food`. Các khóa chủ đề hợp lệ nằm trong `js/data.js` (mảng `TOPICS`). Từ trùng cả chữ lẫn loại từ sẽ bị bỏ qua. Mở Console của trình duyệt để xem cảnh báo nếu có dòng sai định dạng.

## Thêm bài đọc

Thêm một đối tượng vào mảng trong `js/data/texts.js`:

```js
{ id: 'ten-bai', level: 'A2', kind: 'Đoạn văn', title: 'Tiêu đề', titleVi: 'Tiêu đề tiếng Việt',
  sentences: [['English sentence.', 'Câu tiếng Việt.']] }
```

## Lưu ý

- Tiến độ lưu trong `localStorage` của từng trình duyệt. Đổi máy hoặc xóa dữ liệu duyệt web sẽ mất, nên hãy dùng **Cài đặt → Xuất file sao lưu** định kỳ.
- Giọng đọc phụ thuộc vào giọng tiếng Anh có sẵn trong hệ điều hành/trình duyệt. Có thể chọn giọng khác trong Cài đặt.
- Thuật toán SRS là biến thể của SM-2 do mình tự cài đặt, không phải bản sao thuật toán nội bộ của Mochi.
- Cấp độ A1 đến B1 được xếp tương đối theo khung CEFR, không phải danh sách chính thức.
