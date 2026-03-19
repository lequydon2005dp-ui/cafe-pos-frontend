import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://172.20.10.2:8080/api';

const CategoryPage = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const [form, setForm] = useState({ id: '', name: '' });

    // --- 1. HÀM LẤY HEADER (Dùng adminToken) ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken'); // <-- SỬA: Lấy token Admin
        if (!token) return {};
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    // --- 2. KIỂM TRA TOKEN KHI VÀO TRANG ---
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert("Bạn chưa đăng nhập Admin! Vui lòng đăng nhập.");
            navigate('/admin/login');
        } else {
            fetchCategories();
        }
        // eslint-disable-next-line
    }, []);

    // --- 3. XỬ LÝ LỖI API (Chỉ xóa phiên Admin) ---
    const handleApiError = (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            alert("Phiên làm việc Admin đã hết hạn!");

            // CHỈ XÓA KEY CỦA ADMIN
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminIsLoggedIn');

            navigate('/admin/login');
        } else {
            console.error("Lỗi API:", error);
        }
    };

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const config = getAuthHeaders();
            if (!config.headers) throw { response: { status: 401 } };

            const res = await axios.get(`${API_URL}/categories`, config);
            setCategories(res.data);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CRUD OPERATIONS ---
    const openModal = (category = null) => {
        if (category) {
            setIsEdit(true);
            setForm({ id: category.id, name: category.name });
        } else {
            setIsEdit(false);
            setForm({ id: '', name: '' });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            alert("Vui lòng nhập tên danh mục!");
            return;
        }

        try {
            const config = getAuthHeaders();
            if (isEdit) {
                // SỬA
                await axios.put(`${API_URL}/categories/${form.id}`, { name: form.name }, config);
                alert("Cập nhật thành công!");
            } else {
                // THÊM
                await axios.post(`${API_URL}/categories`, { name: form.name }, config);
                alert("Thêm mới thành công!");
            }
            setShowModal(false);
            fetchCategories();
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc muốn xóa danh mục này? (Các sản phẩm thuộc danh mục này có thể bị lỗi)")) {
            try {
                const config = getAuthHeaders();
                await axios.delete(`${API_URL}/categories/${id}`, config);
                fetchCategories();
            } catch (error) {
                handleApiError(error);
                alert("Không thể xóa (Có thể danh mục đang chứa sản phẩm)");
            }
        }
    };

    // --- RENDER ---
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>QUẢN LÝ DANH MỤC</h2>
                <button
                    onClick={() => openModal()}
                    style={styles.btnAdd}
                >
                    + Thêm Danh Mục
                </button>
            </div>

            {/* Table */}
            <div style={styles.tableCard}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#343a40', color: 'white' }}>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Tên Danh Mục</th>
                            <th style={{ ...styles.th, textAlign: 'center' }}>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>Chưa có danh mục nào.</td></tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={styles.td}><strong>{cat.id}</strong></td>
                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{cat.name}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <button onClick={() => openModal(cat)} style={styles.btnEdit}>Sửa</button>
                                        <button onClick={() => handleDelete(cat.id)} style={styles.btnDelete}>Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
                            {isEdit ? 'CẬP NHẬT DANH MỤC' : 'THÊM DANH MỤC MỚI'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên Danh Mục:</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    style={styles.input}
                                    placeholder="Ví dụ: Cà phê, Trà sữa..."
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={styles.btnCancel}>Hủy</button>
                                <button type="submit" style={styles.btnSave}>Lưu Lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const styles = {
    btnAdd: { padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    tableCard: { background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' },
    th: { padding: '12px 15px', textAlign: 'left', fontWeight: '600' },
    td: { padding: '10px 15px' },
    btnEdit: { padding: '6px 12px', marginRight: '5px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000' },
    btnDelete: { padding: '6px 12px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
    input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
    btnCancel: { flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnSave: { flex: 1, padding: '10px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

export default CategoryPage;