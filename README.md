# Coffee & Milk Tea POS System ☕🧋

Một hệ thống Quản lý điểm bán hàng (POS - Point of Sale) dành cho quán cafe và trà sữa, giúp tối ưu hóa quy trình gọi món, quản lý hóa đơn và tính tiền một cách nhanh chóng. 

Dự án được xây dựng với kiến trúc Fullstack, tách biệt hoàn toàn giữa Frontend và Backend.

## 🚀 Công nghệ sử dụng

**Frontend:**
* ReactJS
* Các thư viện khác: axios, react-router-dom, qrcode.react, @stomp/stompjs, sockjs-client, recharts, react-big-calendar, react-datepicker,...

**Backend:**
* Java Spring Boot
* Spring Data JPA
* Spring Security
* JSON Web Token (JWT)
* MySQL Connector
* Spring WebSocket
* Spring HATEOAS
...

**Database:**
* MySQL / SQL Server

## ✨ Tính năng nổi bật:

* **Quản lý thực đơn:** Hiển thị danh sách đồ uống phân theo danh mục (Cafe, Trà sữa, Topping...).
* **Xử lý đơn hàng (Order):** Thêm/bớt món, chọn size, thêm topping trực tiếp trên giao diện.
* **Thanh toán:** Tính tổng tiền tự động tiền mặt hoăc VNPay.
* **Quản lý danh mục:** Thêm, sửa, xóa sản phẩm và danh mục từ phía Admin.
* **Chức năng tích Điểm:** Tích điểm bằng số điện thoại của khách hàng.
* **Menu Tại bàn:** Khách hàng có thể quét mã QR tại bàn để gọi món.
* **Mã giảm giá:** Khách hàng có thể sử dụng mã giảm giá để thanh toán.
* **Đăng ký ca làm việc:** Nhân viên tự đăng ký ca làm việc và Chủ của hàng sẽ duyệt.
....

## 📸 Ảnh chụp màn hình
* Ảnh Menu Khách Hàng
<img width="1873" height="877" alt="screenshot_1773895330" src="https://github.com/user-attachments/assets/12eec6a9-084d-46b8-bf32-01e7afe8615a" />

* Ảnh Menu Nhân Viên:
<img width="1896" height="892" alt="screenshot_1773896398" src="https://github.com/user-attachments/assets/508b77e0-27ab-4f2d-8bbd-297e3eb87ae4" />

* Ảnh DashBroad Admin
<img width="1898" height="905" alt="screenshot_1773895643" src="https://github.com/user-attachments/assets/826840cd-e34c-436b-b108-857d20817dfe" />

## 🛠️ Hướng dẫn cài đặt 

Để chạy dự án này trên máy cá nhân, hãy làm theo các bước sau:

### 1. Cài đặt Database
* Mở hệ quản trị CSDL của bạn (ví dụ: MySQL hoặc SQL Server).
* Tạo một database mới tên là `coffee_app`.
* (Tùy chọn) Import file `database.sql` có sẵn trong thư mục dự án `backend` trong `db` file `coffee_app.sql` để có dữ liệu mẫu.

### 2. Chạy Backend (Spring Boot)
1. Mở thư mục `backend` bằng IntelliJ IDEA, VS Code hoặc Eclipse.
2. Cấu hình lại kết nối database trong file `application.properties`
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/coffee_app
   spring.datasource.username=root
   spring.datasource.password=
3. Đổi lại địa chỉ Ip trong các file sau: `WebConfig`, `AttendanceController`, `CategoryController`,`EmployeeController`,`LiveCartController` thành Ip của máy bạn.
4. Trong IntelliJ IDEA, VS Code hoặc Eclipse mở file `DemoApplication.java` và chạy `Run Java`.
### 3. Chạy Frontend (React JS)
1. Mở thư mục `fontend` bằng IntelliJ IDEA, VS Code hoặc Eclipse.
2. Đổi lại địa chỉ Ip trong các file thành Ip của máy bạn bằng công cụ `Search`.
3. Mở thư mục file `fontend` mở cmd file lên Chạy `npm start`.
