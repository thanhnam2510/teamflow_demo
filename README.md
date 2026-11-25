# TeamFlow Demo

## Mở bản demo

Mở `index.html` trong trình duyệt. Có thể đứng trong thư mục này và chạy `python3 -m http.server 8080`, rồi mở [localhost:8080](http://localhost:8080). Tài nguyên được đóng gói cùng bản demo. Không cần cài thư viện, build hoặc cấu hình máy chủ TeamFlow.

Bản demo mở với tài khoản Admin mẫu. Vào **Tài khoản → Chuyển tài khoản demo** để thử vai trò khác, hoặc vào **Đăng xuất** để xem màn hình đăng nhập. Biểu mẫu đăng nhập dùng mật khẩu mẫu `TeamFlow123`. Các email trong demo dùng miền `example.test`. Chọn **Đặt lại dữ liệu demo** để khôi phục dữ liệu ban đầu.

Bản ghi được lưu trong `localStorage`. Tệp đính kèm dự án và tin nhắn lưu trong IndexedDB nếu trình duyệt hỗ trợ. Bản sao lưu ZIP lưu dữ liệu mẫu và metadata tệp. Các tệp nhị phân trong IndexedDB thuộc bộ nhớ của trình duyệt đang dùng.

## Đối chiếu hướng dẫn sử dụng

Tham chiếu tệp `docs/HUONG-DAN-SU-DUNG.docx` trong workspace TeamFlow gốc, cùng template, SCSS, chuỗi dịch và quy tắc nghiệp vụ từ mã nguồn hiện tại. Số ảnh dưới đây theo thứ tự trong tài liệu Word. Ảnh minh họa của tài liệu dùng để kiểm tra bố cục và thao tác.

| Mục và ảnh                                       | Route tĩnh                                                                                           | Luồng hiện có                                                                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bắt đầu, ảnh 1–14                                | `/login`, `/register`, `/forgot-password`, `/set-password`, `/welcome`, `/notifications`, `/profile` | Màn hình xác thực mẫu, chọn tài khoản, link mời mẫu, menu theo vai trò, tìm kiếm bằng phím, giao diện sáng/tối, thông báo theo ngày, sửa hồ sơ và ảnh đại diện                      |
| Cá nhân, ảnh 15–20                               | `/my-work`, `/weekly`, `/leaves`, `/my-assets`                                                       | Công việc cá nhân, bảng kế hoạch tuần nhập được và Capacity, tạo/hủy đơn nghỉ, quản lý phép và xuất Excel, xác nhận nhận tài sản                                                    |
| Workspace, dự án và tài liệu, ảnh 21–28          | `/workspaces`, `/workspaces/:id`, `/projects/:id`                                                    | Vai trò workspace, tạo/sửa/xóa dự án và công việc, danh sách và Kanban, checklist và tự tính tiến độ, lịch lặp, bình luận/tệp, lịch sử, link task và tài liệu dạng lưới/danh sách   |
| Lịch, phòng họp, tin nhắn và diễn đàn, ảnh 29–40 | `/calendar`, `/meetings/:id/room`, `/messages`, `/calls/:id`, `/feed`                                | Tuần/tháng, kiểm tra trùng lịch, phản hồi lời mời, phòng chờ và phòng họp mô phỏng, chat riêng/nhóm, trả lời/sửa/thu hồi, cảm xúc, cuộc gọi mẫu, bài viết và bình luận              |
| Yêu cầu, ảnh 41–45                               | `/requests`, `/requests/:id`                                                                         | Mẫu theo phòng ban có trường tệp, mức ưu tiên, tiếp nhận, giao người xử lý, từ chối, tạo task, bàn giao tài sản và hoàn thành                                                       |
| Quản lý và báo cáo, ảnh 46–58                    | `/departments`, `/timeline`, `/worklogs`, `/approvals`, `/workload`                                  | Cây phòng ban, chuyển người, mời nhân viên mẫu, Gantt kéo và dùng phím, log nhiều định dạng thời lượng, duyệt hàng loạt, Timesheet hai sheet Excel, báo cáo CSV, Workload theo tuần |
| Tài sản, ảnh 59–68                               | `/assets`, `/assets/:id`, `/assets/audits/:id`, `/my-assets`                                         | Kho, bàn giao/thu hồi, bảo trì, thất lạc/thanh lý, mã QR và tem in, nhập mã kiểm kê, ghi và áp dụng kết quả, danh mục                                                               |
| Đánh giá, ảnh 69–78                              | `/performance`, `/performance/cycles/:id`, `/performance/reviews/:id`                                | Mẫu trọng số, vòng đời kỳ, bản nháp, chấm theo tiêu chí, mục tiêu/KR, kế hoạch phát triển, góp ý 360°, chốt/trả lại và báo cáo                                                      |
| Đào tạo, ảnh 79–91                               | `/training`, `/training/sessions/:id`, `/training/people/:id`                                        | Khóa và lớp, ghi danh, điểm danh/kết quả, chứng chỉ, thư viện và ma trận năng lực, xếp nhu cầu vào lớp, báo cáo CSV                                                                 |
| Nghỉ việc, ảnh 92–105                            | `/offboarding`, `/offboarding/:id`, `/profile`                                                       | Xin nghỉ, duyệt theo vai, bàn giao, kiểm tra tài sản, xác nhận biên bản, in hoặc lưu PDF từ trình duyệt, đóng hồ sơ hoặc khóa ngay                                                  |
| Quản trị, ảnh 106–115                            | `/admin/users`, `/budgets`, `/admin/cost-rates`, `/admin/security`, `/admin/backups`, `/system`      | Quản trị tài khoản và lời mời mẫu, ngân sách và báo cáo chi phí, đơn giá theo ngày hiệu lực, nhật ký, sao lưu/khôi phục bản ghi demo và kiểm tra trạng thái                         |

## Phạm vi của bản tĩnh

Màn hình dùng dữ liệu mẫu, tài khoản mẫu và thao tác cục bộ. SMTP, Google OAuth, LiveKit, SignalR, ghi hình, trạng thái MySQL và các tác vụ nền được mô phỏng. Các lịch nhắc tự động cần hệ thống có máy chủ. Kiểm kê nhận mã hoặc liên kết QR bằng tay. Quét bằng camera dùng khả năng đọc mã QR của trình duyệt. Biên bản nghỉ việc dùng hộp thoại in của trình duyệt để lưu PDF. Menu và nhiều nhãn dùng bộ dịch Angular. Một số biểu mẫu và thông báo riêng của demo vẫn bằng tiếng Việt.

Bản này đã kiểm thử các luồng chính trên Chrome và kiểm tra một số màn hình ở chiều rộng 320 px. Việc đối chiếu từng trạng thái, biểu mẫu, vai trò và chi tiết hiển thị của toàn bộ 115 ảnh vẫn còn phạm vi cần kiểm chứng. Bảng trên ghi các luồng hiện có để phân biệt với hướng dẫn của hệ thống chạy trên máy chủ.

## GitHub Pages

Chép **nội dung** thư mục này vào thư mục gốc của nhánh xuất bản. Trong **Settings → Pages → Build and deployment**, chọn **Deploy from a branch**, chọn nhánh và thư mục `/ (root)` hoặc `/docs`, sau đó lưu. Liên kết dùng hash và tài nguyên dùng đường dẫn tương đối, phù hợp khi chạy dưới đường dẫn con của repository. [Tài liệu GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
