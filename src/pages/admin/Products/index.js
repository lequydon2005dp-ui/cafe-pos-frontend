import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// IP của máy chủ Backend (Giữ nguyên theo code bạn gửi)
const API_URL = 'http://172.20.10.2:8080/api';

const ProductPage = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // State cho Modal
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    // State Form
    const [form, setForm] = useState({
        id: '',
        name: '',
        price: '',
        description: '',
        image: '',
        categoryId: '',
        active: true
    });

    // --- 1. HÀM LẤY HEADER (SỬA: Dùng adminToken) ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken'); // <-- QUAN TRỌNG: Lấy đúng token Admin
        if (!token) {
            return {};
        }
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    // --- 2. KIỂM TRA TOKEN KHI VÀO TRANG ---
    useEffect(() => {
        const token = localStorage.getItem('adminToken'); // <-- SỬA

        if (!token) {
            alert("Bạn chưa đăng nhập Admin! Vui lòng đăng nhập.");
            navigate('/admin/login');
        } else {
            fetchData();
        }
        // eslint-disable-next-line
    }, []);

    // --- 3. XỬ LÝ LỖI PHIÊN HẾT HẠN ---
    const handleApiError = (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error("Lỗi xác thực:", error.response.status);
            alert("Phiên làm việc của Admin đã hết hạn. Vui lòng đăng nhập lại!");

            // CHỈ XÓA THÔNG TIN ADMIN (Không ảnh hưởng nhân viên)
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminIsLoggedIn');

            navigate('/admin/login');
        } else {
            console.error("Lỗi API khác:", error);
            // alert("Lỗi kết nối server");
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const config = getAuthHeaders();

            // Nếu không có header, dừng lại để tránh lỗi
            if (!config.headers) throw { response: { status: 401 } };

            const [resProducts, resCats] = await Promise.all([
                axios.get(`${API_URL}/products`, config),
                axios.get(`${API_URL}/categories`, config)
            ]);

            setProducts(resProducts.data);
            setCategories(resCats.data);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CÁC HÀM CRUD (Giữ nguyên logic) ---
    const openModal = (product = null) => {
        if (product) {
            setIsEdit(true);
            setForm({
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description || '',
                image: product.image || '',
                categoryId: product.category ? product.category.id : (categories[0]?.id || ''),
                active: product.active
            });
        } else {
            setIsEdit(false);
            setForm({
                id: '',
                name: '',
                price: '',
                description: '',
                image: '',
                categoryId: categories.length > 0 ? categories[0].id : '',
                active: true
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!form.name || !form.price || !form.categoryId) {
            alert("Vui lòng nhập Tên, Giá và chọn Danh mục!");
            return;
        }

        try {
            const payload = {
                name: form.name,
                price: parseFloat(form.price),
                description: form.description,
                image: form.image,
                categoryId: form.categoryId,
                active: form.active
            };

            const config = getAuthHeaders();

            if (isEdit) {
                await axios.put(`${API_URL}/products/${form.id}`, payload, config);
                alert("Cập nhật thành công!");
            } else {
                await axios.post(`${API_URL}/products`, payload, config);
                alert("Thêm món mới thành công!");
            }

            setShowModal(false);
            fetchData();
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa món này?")) {
            try {
                const config = getAuthHeaders();
                await axios.delete(`${API_URL}/products/${id}`, config);
                fetchData();
            } catch (error) {
                handleApiError(error);
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>QUẢN LÝ SẢN PHẨM</h2>
                <button
                    onClick={() => openModal()}
                    style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Thêm Món Mới
                </button>
            </div>

            {/* TABLE */}
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#343a40', color: 'white' }}>
                        <tr>
                            <th style={styles.th}>Ảnh</th>
                            <th style={styles.th}>Tên Món</th>
                            <th style={styles.th}>Giá</th>
                            <th style={styles.th}>Danh Mục</th>
                            <th style={styles.th}>Trạng Thái</th>
                            <th style={{ ...styles.th, textAlign: 'center' }}>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Đang tải dữ liệu...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Chưa có sản phẩm nào.</td></tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={styles.td}>
                                        <img src={p.image || 'https://via.placeholder.com/50'} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </td>
                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{p.name}</td>
                                    <td style={{ ...styles.td, color: '#d32f2f' }}>{p.price.toLocaleString()} đ</td>
                                    <td style={styles.td}>
                                        <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                            {p.category ? p.category.name : 'Khác'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        {p.active ? <span style={{ color: 'green', fontWeight: 'bold' }}>● Đang bán</span> : <span style={{ color: 'gray' }}>● Ngừng bán</span>}
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <button onClick={() => openModal(p)} style={styles.btnEdit}>Sửa</button>
                                        <button onClick={() => handleDelete(p.id)} style={styles.btnDelete}>Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>{isEdit ? 'CẬP NHẬT' : 'THÊM MỚI'}</h3>
                        <form onSubmit={handleSave}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Tên món:</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={styles.input} required />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, ...styles.formGroup }}>
                                    <label style={styles.label}>Giá bán:</label>
                                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={styles.input} required />
                                </div>
                                <div style={{ flex: 1, ...styles.formGroup }}>
                                    <label style={styles.label}>Danh mục:</label>
                                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} style={styles.input} required>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Link ảnh:</label>
                                <input type="text" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Mô tả:</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...styles.input, height: '60px' }} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                                    Đang kinh doanh
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={styles.btnCancel}>Hủy bỏ</button>
                                <button type="submit" style={styles.btnSave}>Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// CSS STYLES
const styles = {
    th: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' },
    td: { padding: '10px 15px', fontSize: '14px', verticalAlign: 'middle' },
    btnEdit: { padding: '6px 12px', marginRight: '5px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000' },
    btnDelete: { padding: '6px 12px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' },
    input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
    btnCancel: { flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnSave: { flex: 1, padding: '10px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

export default ProductPage;