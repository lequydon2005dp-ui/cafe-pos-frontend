import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../../styles/admin/Employee.css';

// Nên dùng 172.20.10.2 để đồng bộ với lúc đăng nhập
const API_URL = 'http://172.20.10.2:8080/api';

function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form state
  const [form, setForm] = useState({ id: '', name: '', role: 'part-time', password: '' });

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // --- 1. HÀM LẤY HEADER (QUAN TRỌNG: Dùng adminToken) ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken'); // <--- SỬA TẠI ĐÂY
    if (!token) return {};
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // --- 2. KIỂM TRA TOKEN KHI VÀO TRANG ---
  useEffect(() => {
    const token = localStorage.getItem('adminToken'); // <--- SỬA TẠI ĐÂY
    if (!token) {
      alert("Bạn chưa đăng nhập Admin! Vui lòng đăng nhập.");
      navigate('/admin/login');
    } else {
      loadEmployees();
    }
    // eslint-disable-next-line
  }, []);

  // --- 3. TẢI DANH SÁCH NHÂN VIÊN ---
  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const config = getAuthHeaders();
      // Nếu không có header (mất token), tự throw lỗi để xuống catch
      if (!config.headers) throw { response: { status: 401 } };

      const res = await axios.get(`${API_URL}/employees`, config);
      setEmployees(res.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. XỬ LÝ LỖI (Chỉ xóa phiên Admin) ---
  const handleApiError = (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      alert("Phiên làm việc Admin đã hết hạn. Vui lòng đăng nhập lại!");

      // CHỈ XÓA KEY CỦA ADMIN
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminIsLoggedIn');

      navigate('/admin/login');
    } else {
      console.error(err);
      // alert("Lỗi kết nối server");
    }
  };

  // --- 5. CÁC HÀM CRUD (Giữ nguyên logic) ---
  const openModal = (emp = null) => {
    setSelectedEmp(emp);
    if (emp) {
      // Khi Sửa
      setForm({ id: emp.id, name: emp.name, role: emp.role, password: '' });
    } else {
      // Khi Tạo mới
      setForm({ id: '', name: '', role: 'part-time', password: '' });
    }
    setShowModal(true);
  };

  const saveEmployee = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      alert("Vui lòng nhập Mã và Tên nhân viên!");
      return;
    }

    if (!selectedEmp && !form.password.trim()) {
      alert("Vui lòng nhập mật khẩu khởi tạo!");
      return;
    }

    try {
      const config = getAuthHeaders();
      if (selectedEmp) {
        // UPDATE
        await axios.put(`${API_URL}/employees/${form.id}`, {
          name: form.name,
          role: form.role,
          password: form.password
        }, config);
        alert("Cập nhật thành công!");
      } else {
        // CREATE
        await axios.post(`${API_URL}/employees`, form, config);
        alert("Thêm mới thành công!");
      }

      loadEmployees();
      setShowModal(false);
    } catch (err) {
      const msg = err.response?.data || "Lỗi khi lưu dữ liệu (Trùng mã NV?)";
      handleApiError(err); // Check xem có phải lỗi 401 không trước khi alert
      if (err.response?.status !== 401) alert(`❌ ${msg}`);
    }
  };

  const deleteEmployee = async (id) => {
    if (!window.confirm(`Xóa nhân viên [${id}]?`)) return;

    // Lấy ID admin đang đăng nhập để so sánh
    const currentAdminId = localStorage.getItem('adminId');
    if (id === currentAdminId) {
      alert("Không thể xóa tài khoản đang đăng nhập!");
      return;
    }

    try {
      await axios.delete(`${API_URL}/employees/${id}`, getAuthHeaders());
      alert("Đã xóa thành công!");
      loadEmployees();
    } catch (err) {
      handleApiError(err);
    }
  };

  return (
    <div className="employee-page">
      <header className="page-header">
        <h1 className="page-title">QUẢN LÝ NHÂN SỰ</h1>
        <button className="btn btn-add" onClick={() => openModal()}>
          <span>+ Thêm Nhân Viên</span>
        </button>
      </header>

      <div className="content-container">
        <div className="table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Vai Trò</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>Đang tải...</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.id}</strong></td>
                  <td>{emp.name}</td>
                  <td>
                    <span className={`role-badge ${emp.role === 'ADMIN' ? 'role-admin' :
                      emp.role === 'full-time' ? 'role-full' : 'role-part'
                      }`}>
                      {emp.role === 'ADMIN' ? 'QUẢN TRỊ' :
                        emp.role === 'full-time' ? 'Full-Time' : 'Part-Time'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-edit" onClick={() => openModal(emp)}>Sửa</button>
                    <button className="btn btn-delete" onClick={() => deleteEmployee(emp.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL POPUP */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {selectedEmp ? `CẬP NHẬT: ${selectedEmp.name}` : 'THÊM NHÂN VIÊN'}
            </h2>

            <div className="form-group">
              <label>Mã Nhân Viên</label>
              <input
                className="form-input"
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })}
                disabled={!!selectedEmp}
                placeholder="VD: NV01"
              />
            </div>

            <div className="form-group">
              <label>Họ và Tên</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nhập tên..."
              />
            </div>

            <div className="form-group">
              <label>
                Mật Khẩu
                {selectedEmp
                  ? <small style={{ color: '#888', fontWeight: 'normal' }}> (Để trống nếu không đổi)</small>
                  : <span style={{ color: 'red' }}> *</span>}
              </label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder={selectedEmp ? "Nhập mật khẩu mới..." : "Nhập mật khẩu..."}
              />
            </div>

            <div className="form-group">
              <label>Vai Trò / Hợp Đồng</label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="part-time">Part-time (Bán thời gian)</option>
                <option value="full-time">Full-time (Toàn thời gian)</option>
                <option value="ADMIN" style={{ color: 'red', fontWeight: 'bold' }}>Quản trị viên (ADMIN)</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-save" onClick={saveEmployee}>Lưu Lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeePage;