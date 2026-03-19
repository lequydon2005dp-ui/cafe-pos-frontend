import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- CẤU HÌNH API ---
// Lưu ý: Đảm bảo IP này đúng với máy chạy Spring Boot của bạn
const API_URL = 'http://172.20.10.2:8080/api/sizes';

// --- STYLES ---
const styles = `
  .admin-container { max-width: 1000px; margin: 0 auto; padding: 30px 20px; font-family: 'Poppins', sans-serif; }
  
  .page-header { display: flex; justify-content: space-between; alignItems: center; margin-bottom: 30px; }
  .page-title { font-size: 28px; color: #2d3436; font-weight: 700; margin: 0; }
  
  /* Form Card */
  .form-card {
    background: white; padding: 25px; border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 30px;
    display: flex; gap: 15px; align-items: flex-end;
  }
  
  .form-group { flex: 1; }
  .form-label { display: block; margin-bottom: 8px; font-weight: 600; color: #636e72; font-size: 14px; }
  .form-input { 
    width: 100%; padding: 12px 15px; border: 2px solid #dfe6e9; 
    border-radius: 10px; font-size: 15px; outline: none; transition: 0.2s; box-sizing: border-box;
  }
  .form-input:focus { border-color: #6c5ce7; }

  .btn-save {
    padding: 12px 25px; background: #6c5ce7; color: white; border: none;
    border-radius: 10px; font-weight: 600; cursor: pointer; height: 46px;
    transition: 0.2s; white-space: nowrap;
  }
  .btn-save:hover { background: #5a4bcf; transform: translateY(-2px); }
  .btn-cancel { background: #b2bec3; margin-left: 10px; }

  /* Table */
  .table-container { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.03); overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8f9fa; text-align: left; padding: 18px; font-weight: 600; color: #2d3436; font-size: 14px; border-bottom: 2px solid #eee; }
  td { padding: 18px; border-bottom: 1px solid #f1f2f6; color: #2d3436; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background: #fcfcfc; }

  .price-tag { font-weight: bold; color: #00b894; background: #e3fcef; padding: 4px 10px; border-radius: 6px; font-size: 14px; }
  .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .active { background: #d4edda; color: #155724; }
  .inactive { background: #f8d7da; color: #721c24; }

  .action-btn { border: none; background: none; cursor: pointer; font-size: 18px; padding: 5px; transition: 0.2s; }
  .btn-edit { color: #0984e3; }
  .btn-delete { color: #d63031; margin-left: 10px; }
  .btn-edit:hover, .btn-delete:hover { transform: scale(1.2); }
`;

const SizeManagement = () => {
    const navigate = useNavigate();
    const [sizes, setSizes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({ id: null, name: '', extraPrice: 0, active: true });
    const [isEditing, setIsEditing] = useState(false);

    // --- AUTH HEADERS ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return {};
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    // --- LOAD DATA ---
    const fetchSizes = async () => {
        try {
            // Sử dụng endpoint /admin/all để lấy cả size ẩn và hiện
            const res = await axios.get(`${API_URL}/admin/all`, getAuthHeaders());
            setSizes(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Lỗi tải size:", error);
            if (error.response && error.response.status === 403) {
                alert("Bạn không có quyền truy cập (Cần quyền ADMIN). Vui lòng đăng nhập lại.");
                navigate('/admin/login');
            } else {
                alert("Không thể kết nối đến Server!");
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!localStorage.getItem('adminToken')) {
            navigate('/admin/login');
            return;
        }
        fetchSizes();
    }, []);

    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            alert("Vui lòng nhập tên Size!");
            return;
        }

        // Chuẩn hóa dữ liệu trước khi gửi (đảm bảo extraPrice là số)
        const payload = {
            ...formData,
            extraPrice: parseFloat(formData.extraPrice) || 0
        };

        try {
            if (isEditing) {
                // Update: PUT /api/sizes/{id}
                await axios.put(`${API_URL}/${formData.id}`, payload, getAuthHeaders());
                alert("Cập nhật thành công!");
            } else {
                // Create: POST /api/sizes
                await axios.post(API_URL, payload, getAuthHeaders());
                alert("Thêm mới thành công!");
            }

            // Reset form & reload list
            setFormData({ id: null, name: '', extraPrice: 0, active: true });
            setIsEditing(false);
            fetchSizes();
        } catch (error) {
            console.error(error);
            alert("Lỗi khi lưu dữ liệu! Kiểm tra quyền Admin.");
        }
    };

    const handleEdit = (size) => {
        setFormData(size);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa Size này?")) return;
        try {
            // Delete: DELETE /api/sizes/{id}
            await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
            fetchSizes();
        } catch (error) {
            console.error(error);
            alert("Không thể xóa! (Có thể size này đang được sử dụng trong đơn hàng cũ). Hãy thử tắt trạng thái 'Hiện'.");
        }
    };

    const handleToggleActive = async (size) => {
        // Cập nhật nhanh trạng thái Active
        try {
            const updatedSize = { ...size, active: !size.active };
            await axios.put(`${API_URL}/${size.id}`, updatedSize, getAuthHeaders());
            fetchSizes();
        } catch (error) {
            console.error(error);
            alert("Lỗi cập nhật trạng thái!");
        }
    };

    return (
        <div className="admin-container">
            <style>{styles}</style>

            <div className="page-header">
                <h1 className="page-title">📏 Quản Lý Kích Cỡ (Size)</h1>
                <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>
                    Quay lại
                </button>
            </div>

            {/* FORM THÊM / SỬA */}
            <form className="form-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Tên Size</label>
                    <input
                        type="text"
                        name="name"
                        className="form-input"
                        placeholder="VD: Size L, Size Vừa..."
                        value={formData.name}
                        onChange={handleInputChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Giá thêm (VNĐ)</label>
                    <input
                        type="number"
                        name="extraPrice"
                        className="form-input"
                        placeholder="0"
                        value={formData.extraPrice}
                        onChange={handleInputChange}
                    />
                </div>

                <div className="form-group" style={{ maxWidth: '100px', display: 'flex', alignItems: 'center', height: '46px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                        <input
                            type="checkbox"
                            name="active"
                            checked={formData.active}
                            onChange={handleInputChange}
                            style={{ width: '20px', height: '20px', marginRight: '8px' }}
                        />
                        Hiện
                    </label>
                </div>

                <div style={{ display: 'flex' }}>
                    <button type="submit" className="btn-save">
                        {isEditing ? 'Cập Nhật' : 'Thêm Mới'}
                    </button>
                    {isEditing && (
                        <button
                            type="button"
                            className="btn-save btn-cancel"
                            onClick={() => {
                                setIsEditing(false);
                                setFormData({ id: null, name: '', extraPrice: 0, active: true });
                            }}
                        >
                            Hủy
                        </button>
                    )}
                </div>
            </form>

            {/* DANH SÁCH SIZE */}
            <div className="table-container">
                {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>⏳ Đang tải dữ liệu...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên Size</th>
                                <th>Giá cộng thêm</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sizes.map((size) => (
                                <tr key={size.id} style={{ opacity: size.active ? 1 : 0.6 }}>
                                    <td>#{size.id}</td>
                                    <td><b style={{ fontSize: '16px' }}>{size.name}</b></td>
                                    <td>
                                        <span className="price-tag">+{size.extraPrice.toLocaleString()} đ</span>
                                    </td>
                                    <td>
                                        <span
                                            className={`status-badge ${size.active ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggleActive(size)}
                                            style={{ cursor: 'pointer' }}
                                            title="Nhấn để đổi trạng thái"
                                        >
                                            {size.active ? 'Đang hiện' : 'Đã ẩn'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="action-btn btn-edit" onClick={() => handleEdit(size)}>✏️</button>
                                        <button className="action-btn btn-delete" onClick={() => handleDelete(size.id)}>🗑</button>
                                    </td>
                                </tr>
                            ))}
                            {sizes.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Chưa có size nào được tạo.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SizeManagement;