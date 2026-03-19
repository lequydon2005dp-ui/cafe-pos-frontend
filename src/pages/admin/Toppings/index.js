import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Sử dụng IP giống file Login của bạn để đồng bộ
const API_URL = 'http://172.20.10.2:8080/api/toppings';

const ToppingManagement = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [toppings, setToppings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        id: null,
        name: '',
        price: '',
        active: true
    });

    const [isEditing, setIsEditing] = useState(false);
    const [notification, setNotification] = useState(null);

    // --- 1. CHECK QUYỀN & LOAD DATA ---
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert("Bạn chưa đăng nhập Admin!");
            navigate('/admin/login'); // Chuyển hướng nếu chưa login
            return;
        }
        fetchToppings();
    }, []);

    // Tự tắt thông báo sau 3s
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- HELPER: LẤY HEADER AUTH ---
    // Đây là chìa khóa để sửa lỗi 403
    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
    };

    // --- API FUNCTIONS ---
    const fetchToppings = async () => {
        setIsLoading(true);
        try {
            // GET thường public, nhưng gửi kèm token cũng không sao (hoặc tùy config security)
            // Nếu SecurityConfig cho phép GET public thì không cần header, nhưng thêm vào cho chắc
            const res = await axios.get(API_URL, getAuthHeaders());

            const sorted = res.data.sort((a, b) => b.id - a.id);
            setToppings(sorted);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        if (!form.name.trim()) {
            showNotify('error', 'Tên topping không được để trống');
            return;
        }
        if (Number(form.price) < 0) {
            showNotify('error', 'Giá không được âm');
            return;
        }

        try {
            const payload = {
                name: form.name,
                price: Number(form.price),
                active: form.active
            };

            if (isEditing) {
                // UPDATE (PUT) - Cần Token
                await axios.put(`${API_URL}/${form.id}`, payload, getAuthHeaders());
                showNotify('success', 'Cập nhật thành công!');
            } else {
                // CREATE (POST) - Cần Token
                await axios.post(API_URL, payload, getAuthHeaders());
                showNotify('success', 'Thêm mới thành công!');
            }

            resetForm();
            fetchToppings();
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa topping này không?")) return;

        try {
            // DELETE - Cần Token
            await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
            showNotify('success', 'Đã xóa topping thành công!');
            fetchToppings();
            if (form.id === id) resetForm();
        } catch (error) {
            handleApiError(error);
        }
    };

    // Xử lý lỗi chung
    const handleApiError = (error) => {
        console.error(error);
        if (error.response && error.response.status === 403) {
            showNotify('error', 'Lỗi 403: Phiên đăng nhập hết hạn hoặc không có quyền!');
            // Có thể logout user nếu muốn
            // localStorage.removeItem('adminToken');
            // navigate('/admin/login');
        } else {
            showNotify('error', 'Có lỗi xảy ra kết nối Server!');
        }
    };

    // --- FORM HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditClick = (topping) => {
        setForm({
            id: topping.id,
            name: topping.name,
            price: topping.price,
            active: topping.active
        });
        setIsEditing(true);
        // Scroll lên đầu trang mobile để thấy form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setForm({ id: null, name: '', price: '', active: true });
        setIsEditing(false);
    };

    const showNotify = (type, message) => {
        setNotification({ type, message });
    };

    // --- STYLES ---
    const styles = {
        container: { padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Segoe UI, sans-serif', background: '#f4f6f9', minHeight: '100vh' },
        header: { marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dde2e6', paddingBottom: '15px' },
        headerTitle: { margin: 0, color: '#343a40' },

        layout: { display: 'flex', gap: '30px', flexWrap: 'wrap' },

        // Cột Trái
        leftCol: { flex: '1', minWidth: '320px', background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: 'fit-content' },
        formTitle: { marginTop: 0, marginBottom: '20px', color: '#0d6efd', fontSize: '18px', fontWeight: '600', textTransform: 'uppercase' },
        formGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' },
        input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box' },
        checkboxContainer: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: '#e9ecef', borderRadius: '4px' },

        // Cột Phải
        rightCol: { flex: '2', minWidth: '400px' },
        tableWrapper: { background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { background: '#343a40', color: '#fff', padding: '12px 15px', textAlign: 'left', fontSize: '14px' },
        td: { padding: '12px 15px', borderBottom: '1px solid #dee2e6', color: '#495057', verticalAlign: 'middle', fontSize: '14px' },

        // Buttons
        btnSubmit: { width: '100%', padding: '12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
        btnCancel: { width: '100%', padding: '10px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
        actionBtn: (color) => ({ padding: '6px 12px', marginRight: '5px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: color, color: '#fff', fontSize: '12px' }),

        // Badge & Toast
        badge: (active) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: active ? '#d1e7dd' : '#f8d7da', color: active ? '#0f5132' : '#842029' }),
        toast: (type) => ({ position: 'fixed', top: '20px', right: '20px', background: type === 'success' ? '#198754' : '#dc3545', color: '#fff', padding: '15px 20px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, animation: 'fadeIn 0.3s' })
    };

    return (
        <div style={styles.container}>
            {notification && (
                <div style={styles.toast(notification.type)}>
                    {notification.type === 'success' ? '✅ ' : '⚠️ '} {notification.message}
                </div>
            )}

            <div style={styles.header}>
                <div>
                    <h2 style={styles.headerTitle}>QUẢN LÝ TOPPING</h2>
                    <small style={{ color: '#6c757d' }}>Dành cho Quản trị viên</small>
                </div>
                <button onClick={() => navigate('/admin/dashboard')} style={{ ...styles.btnCancel, width: 'auto', marginTop: 0 }}>
                    ← Về Dashboard
                </button>
            </div>

            <div style={styles.layout}>
                {/* FORM */}
                <div style={styles.leftCol}>
                    <h3 style={styles.formTitle}>{isEditing ? 'Cập nhật Topping' : 'Thêm Topping mới'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Tên Topping</label>
                            <input name="name" value={form.name} onChange={handleInputChange} placeholder="VD: Trân châu trắng" autoComplete="off" style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Giá bán thêm</label>
                            <input type="number" name="price" value={form.price} onChange={handleInputChange} placeholder="VD: 5000" style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.checkboxContainer}>
                                <input type="checkbox" name="active" checked={form.active} onChange={handleInputChange} />
                                <span>Đang kinh doanh (Active)</span>
                            </label>
                        </div>
                        <button type="submit" style={styles.btnSubmit}>
                            {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM MỚI'}
                        </button>
                        {isEditing && <button type="button" style={styles.btnCancel} onClick={resetForm}>HỦY BỎ</button>}
                    </form>
                </div>

                {/* TABLE */}
                <div style={styles.rightCol}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Tên</th>
                                    <th style={styles.th}>Giá</th>
                                    <th style={styles.th}>Trạng thái</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="5" style={{ ...styles.td, textAlign: 'center' }}>Đang tải...</td></tr>
                                ) : toppings.length === 0 ? (
                                    <tr><td colSpan="5" style={{ ...styles.td, textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                                ) : (
                                    toppings.map((t) => (
                                        <tr key={t.id}>
                                            <td style={styles.td}>#{t.id}</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{t.name}</td>
                                            <td style={{ ...styles.td, color: '#d63384' }}>{t.price.toLocaleString()} đ</td>
                                            <td style={styles.td}>
                                                <span style={styles.badge(t.active)}>{t.active ? 'Active' : 'Hidden'}</span>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button style={styles.actionBtn('#0dcaf0')} onClick={() => handleEditClick(t)}>Sửa</button>
                                                <button style={styles.actionBtn('#dc3545')} onClick={() => handleDelete(t.id)}>Xóa</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToppingManagement;