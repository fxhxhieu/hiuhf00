# hiuhf0

Web học từ vựng tiếng Anh, chạy hoàn toàn trên trình duyệt (HTML, CSS, JavaScript thuần), không cần server hay bước build. Đẩy lên GitHub Pages là dùng được.

## Tính năng

- **Học kiểu Mochi, hệ thống tự xếp cấp**: không cần chọn bộ thẻ. Từ mới đi qua ba bước: lật thẻ, Nghe & chọn, Nghe & viết. Mỗi từ tự được xếp vào cấp 0 đến 5 (Mới, Mới gặp, Nhận ra, Nhớ được, Vững, Thuộc lòng) theo kết quả bài tập.
- **Trang chính**: nút **Ôn tập ngay**, **Học từ mới**, **Học thêm 10 từ mới**, biểu đồ phân bố cấp thuộc. Sau mỗi thẻ có hai nút: **Tiếp tục** và **Đã nhớ rõ từ** (nhảy thẳng lên cấp 5, phím tắt 1 và 2).
- **Lặp lại ngắt quãng (SRS)**: biến thể SM-2. Bước học 1 phút và 10 phút, sau đó tính bằng ngày. Làm sai thì từ xuống cấp và quay lại sớm, khoảng cách giảm một nửa.
- **1.594 từ vựng** chia theo cấp độ A1 (602 từ), A2 (518 từ), B1 (474 từ) và 20 chủ đề. Mỗi từ có loại từ, nghĩa tiếng Việt, định nghĩa Anh–Anh và câu ví dụ.
- **Thư viện từ**: tìm theo tiếng Anh hoặc tiếng Việt, lọc theo cấp độ CEFR, chủ đề, cấp thuộc; ưu tiên học một từ hoặc đánh dấu "đã nhớ rõ".
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
js/
  app.js       giao diện và các màn hình
  srs.js       thuật toán lặp lại ngắt quãng
  store.js     lưu tiến độ vào localStorage, xuất/nhập JSON
  tts.js       đọc to bằng Web Speech API
  data.js      đọc và lập chỉ mục dữ liệu từ vựng
  data/
    vocab-a1-1.js … vocab-b1-2.js   từ vựng
    texts.js                         bài shadowing / dịch bài
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
