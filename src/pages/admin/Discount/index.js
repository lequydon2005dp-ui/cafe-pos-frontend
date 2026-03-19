import axios from 'axios';
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';

// Cấu hình URL API
const API_BASE_URL = 'http://172.20.10.2:8080/api/discounts';
const PRODUCTS_API_URL = 'http://172.20.10.2:8080/api/products';

const DiscountAdmin = () => {
    const navigate = useNavigate();

    // --- State dữ liệu ---
    const [discounts, setDiscounts] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE NOTIFICATION MODAL (QUAN TRỌNG) ---
    const [notification, setNotification] = useState({
        isOpen: false,
        type: 'success', // 'success' | 'error'
        title: '',
        message: ''
    });

    // --- State Form ---
    const [codeForm, setCodeForm] = useState({ code: '', discountPercentage: '', expiryDate: '' });
    const [productForm, setProductForm] = useState({ selectedProducts: [], discountPercentage: '', expiryDate: '', selectedCategory: '' });

    // --- EFFECT: TỰ ĐỘNG TẮT MODAL THÀNH CÔNG ---
    useEffect(() => {
        let timer;
        if (notification.isOpen && notification.type === 'success') {
            // Tự động tắt sau 5 giây (5000ms)
            timer = setTimeout(() => {
                closeNotification();
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [notification]);

    // --- HELPER: QUẢN LÝ MODAL ---
    const showSuccess = (msg) => {
        setNotification({
            isOpen: true,
            type: 'success',
            title: 'Thành Công!',
            message: msg
        });
    };

    const showError = (title, msg) => {
        setNotification({
            isOpen: true,
            type: 'error', // Loại 'error' sẽ không có timer tự tắt
            title: title || 'Thất Bại',
            message: msg
        });
    };

    const closeNotification = () => {
        setNotification({ ...notification, isOpen: false });
    };

    // --- AUTH HEADERS ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    };

    // --- XỬ LÝ LỖI API ---
    const handleApiError = (err) => {
        // 1. Lỗi hết hạn Token
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            alert("Phiên đăng nhập hết hạn!");
            localStorage.removeItem('adminToken');
            navigate('/admin/login');
            return;
        }

        console.error("API Error:", err);

        // 2. Lấy nội dung lỗi từ Backend
        let msg = "Đã xảy ra lỗi không xác định.";
        if (err.response && err.response.data) {
            // Nếu backend trả về String: "Mã giảm giá đã tồn tại"
            // Nếu backend trả về JSON: { message: "..." }
            msg = typeof err.response.data === 'string'
                ? err.response.data
                : (err.response.data.message || JSON.stringify(err.response.data));
        }

        // 3. Kiểm tra lỗi trùng lặp (Duplicate)
        if (msg.includes("Duplicate entry") || msg.toLowerCase().includes("tồn tại")) {
            showError("Lỗi Trùng Lặp", `Mã giảm giá này đã tồn tại trong hệ thống. Vui lòng chọn tên khác!`);
        } else {
            showError("Lỗi Hệ Thống", msg);
        }
    };

    // --- FETCH DATA ---
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) navigate('/admin/login');
        else { fetchProducts(); fetchDiscounts(); }
        // eslint-disable-next-line
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(PRODUCTS_API_URL, getAuthHeaders());
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
    };

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_BASE_URL, getAuthHeaders());
            setDiscounts(Array.isArray(res.data) ? res.data.sort((a, b) => b.id - a.id) : []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // --- CREATE CODE DISCOUNT ---
    const handleCreateCodeDiscount = async () => {
        if (!codeForm.code || !codeForm.discountPercentage || !codeForm.expiryDate) {
            showError("Thiếu thông tin", "Vui lòng nhập đầy đủ mã, phần trăm và ngày hết hạn.");
            return;
        }
        const percent = parseFloat(codeForm.discountPercentage);
        if (percent <= 0 || percent > 100) {
            showError("Lỗi dữ liệu", "Phần trăm giảm phải từ 1 đến 100.");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/create`, {
                code: codeForm.code.toUpperCase(),
                discountPercentage: percent / 100,
                expiryDate: new Date(codeForm.expiryDate).toISOString(),
                active: true
            }, getAuthHeaders());

            showSuccess(`Mã giảm giá ${codeForm.code} đã được tạo thành công!`);
            setCodeForm({ code: '', discountPercentage: '', expiryDate: '' });
            fetchDiscounts();
        } catch (err) {
            handleApiError(err);
        }
    };

    // --- CREATE PRODUCT DISCOUNT ---
    const handleCreateProductDiscount = async () => {
        if (productForm.selectedProducts.length === 0 || !productForm.discountPercentage || !productForm.expiryDate) {
            showError("Thiếu thông tin", "Vui lòng chọn sản phẩm và điền đầy đủ thông tin.");
            return;
        }
        const percent = parseFloat(productForm.discountPercentage);
        if (percent <= 0 || percent > 100) {
            showError("Lỗi dữ liệu", "Phần trăm giảm phải từ 1 đến 100.");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/create`, {
                code: null,
                productIds: productForm.selectedProducts,
                discountPercentage: percent / 100,
                expiryDate: new Date(productForm.expiryDate).toISOString(),
                active: true
            }, getAuthHeaders());

            showSuccess(`Đã áp dụng giảm giá cho ${productForm.selectedProducts.length} sản phẩm thành công!`);
            setProductForm({ selectedProducts: [], discountPercentage: '', expiryDate: '', selectedCategory: '' });
            fetchDiscounts();
        } catch (err) {
            handleApiError(err);
        }
    };

    // --- DELETE ---
    const handleDeleteDiscount = async (id) => {
        if (!window.confirm("Xác nhận xóa mã này?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/${id}`, getAuthHeaders());
            showSuccess("Đã xóa mã giảm giá thành công!");
            fetchDiscounts();
        } catch (err) {
            handleApiError(err);
        }
    };

    // --- Helpers UI ---
    const handleProductChange = (id) => {
        setProductForm(prev => ({
            ...prev,
            selectedProducts: prev.selectedProducts.includes(id)
                ? prev.selectedProducts.filter(pid => pid !== id)
                : [...prev.selectedProducts, id]
        }));
    };
    const isDiscountValid = (d) => {
        if (!d.active) return false;
        if (!d.expiryDate) return true;
        return new Date(d.expiryDate).setHours(23, 59, 59, 999) >= new Date().getTime();
    };
    const uniqueCategories = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    const filteredProducts = productForm.selectedCategory
        ? products.filter(p => p.category?.name === productForm.selectedCategory)
        : products;

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>

            {/* --- CSS ANIMATION INLINE --- */}
            <style>{`
                @keyframes scaleIn { from {transform: scale(0); opacity: 0;} to {transform: scale(1); opacity: 1;} }
                @keyframes drawCheck { 0% {stroke-dashoffset: 100;} 100% {stroke-dashoffset: 0;} }
                @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-5px);} 75% {transform: translateX(5px);} }
                @keyframes progress { from {width: 100%;} to {width: 0%;} }
                
                .modal-overlay-custom { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(3px); }
                .modal-box-custom { background: white; padding: 30px; border-radius: 20px; text-align: center; width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; }
                
                /* Success Icon */
                .icon-circle-success { width: 80px; height: 80px; border-radius: 50%; background: #d4edda; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 4px solid #c3e6cb; }
                .checkmark { width: 40px; height: 40px; stroke: #155724; stroke-width: 4; fill: none; stroke-dasharray: 100; stroke-dashoffset: 0; animation: drawCheck 1s ease forwards; }
                .progress-bar { height: 4px; background: #e9ecef; margin-top: 20px; border-radius: 2px; overflow: hidden; }
                .progress-fill { height: 100%; background: #28a745; width: 0%; animation: progress 5s linear forwards; }

                /* Error Icon */
                .icon-circle-error { width: 80px; height: 80px; border-radius: 50%; background: #f8d7da; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 4px solid #f5c6cb; animation: shake 0.5s ease; }
                .cross-icon { font-size: 40px; color: #721c24; font-weight: bold; }
                
                .modal-close-btn { position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 24px; cursor: pointer; color: #aaa; transition: 0.2s; }
                .modal-close-btn:hover { color: #333; }
            `}</style>

            <h2 style={{ color: '#4e54c8', marginBottom: '30px' }}>🏷️ Quản Lý Giảm Giá</h2>

            {/* FORM 1: MÃ CODE */}
            <div style={styles.card}>
                <h3 style={{ marginTop: 0 }}>Tạo Mã Giảm Giá (Code)</h3>
                <div style={styles.grid}>
                    <div><label style={styles.label}>Mã giảm giá</label><input type="text" placeholder="SALE2025" value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })} style={styles.input} /></div>
                    <div><label style={styles.label}>Giảm (%)</label><input type="number" value={codeForm.discountPercentage} onChange={(e) => setCodeForm({ ...codeForm, discountPercentage: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Hết hạn</label><div style={{ width: '100%' }}><DatePicker selected={codeForm.expiryDate} onChange={(date) => setCodeForm({ ...codeForm, expiryDate: date })} dateFormat="dd/MM/yyyy" minDate={new Date()} customInput={<input style={styles.input} />} /></div></div>
                </div>
                <button onClick={handleCreateCodeDiscount} disabled={loading} style={styles.button}>{loading ? '...' : 'Tạo Mã Code'}</button>
            </div>

            {/* FORM 2: GIẢM GIÁ SẢN PHẨM */}
            <div style={styles.card}>
                <h3 style={{ marginTop: 0 }}>Thêm Giảm Giá Sản Phẩm</h3>
                <div style={styles.grid}>
                    <div><label style={styles.label}>Category</label><select value={productForm.selectedCategory} onChange={(e) => setProductForm({ ...productForm, selectedCategory: e.target.value })} style={styles.input}><option value="">Tất cả</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={styles.label}>Giảm (%)</label><input type="number" value={productForm.discountPercentage} onChange={(e) => setProductForm({ ...productForm, discountPercentage: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Hết hạn</label><div style={{ width: '100%' }}><DatePicker selected={productForm.expiryDate} onChange={(date) => setProductForm({ ...productForm, expiryDate: date })} dateFormat="dd/MM/yyyy" minDate={new Date()} customInput={<input style={styles.input} />} /></div></div>
                </div>
                <div style={{ marginTop: 20 }}>
                    <div style={styles.productList}>
                        {filteredProducts.length === 0 ? <p style={{ color: '#999' }}>Trống</p> : filteredProducts.map(p => (
                            <label key={p.id} style={{ display: 'block', marginBottom: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={productForm.selectedProducts.includes(p.id)} onChange={() => handleProductChange(p.id)} style={{ marginRight: 10 }} />
                                {p.name} {p.category?.name && `(${p.category.name})`}
                            </label>
                        ))}
                    </div>
                </div>
                <button onClick={handleCreateProductDiscount} disabled={loading} style={styles.button}>{loading ? '...' : 'Áp Dụng'}</button>
            </div>

            {/* LIST */}
            <div style={styles.card}>
                <h3>Danh Sách</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8f9fa', textAlign: 'left' }}><th style={styles.th}>Loại</th><th style={styles.th}>Chi tiết</th><th style={styles.th}>%</th><th style={styles.th}>Hết hạn</th><th style={styles.th}>Trạng thái</th><th style={styles.th}>Xóa</th></tr></thead>
                    <tbody>
                        {discounts.map(d => {
                            const valid = isDiscountValid(d);
                            return (
                                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={styles.td}>{d.code ? 'Code' : 'Product'}</td>
                                    <td style={styles.td}>{d.code || `${d.productIds?.length || 0} SP`}</td>
                                    <td style={styles.td}>{(d.discountPercentage * 100).toFixed(0)}%</td>
                                    <td style={styles.td}>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString('vi') : 'Vĩnh viễn'}</td>
                                    <td style={styles.td}><span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold', background: valid ? '#d4edda' : '#e2e3e5', color: valid ? '#155724' : '#383d41' }}>{valid ? 'Hoạt động' : 'Hết hạn'}</span></td>
                                    <td style={styles.td}><button onClick={() => handleDeleteDiscount(d.id)} style={styles.deleteBtn}>Xóa</button></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* 🔥🔥🔥 MODAL THÔNG BÁO CHUNG 🔥🔥🔥 */}
            {notification.isOpen && (
                <div className="modal-overlay-custom">
                    <div className="modal-box-custom">
                        {/* Nút đóng (X) ở góc trên */}
                        <button className="modal-close-btn" onClick={closeNotification}>&times;</button>

                        {notification.type === 'success' ? (
                            <>
                                <div className="icon-circle-success">
                                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                        <path fill="none" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                                    </svg>
                                </div>
                                <h3 style={{ color: '#155724', margin: '0 0 10px 0' }}>{notification.title}</h3>
                                <p style={{ color: '#555', fontSize: '15px', marginBottom: 0 }}>{notification.message}</p>
                                {/* Thanh thời gian tự đóng */}
                                <div className="progress-bar"><div className="progress-fill"></div></div>
                            </>
                        ) : (
                            <>
                                <div className="icon-circle-error">
                                    <span className="cross-icon">✕</span>
                                </div>
                                <h3 style={{ color: '#721c24', margin: '0 0 10px 0' }}>{notification.title}</h3>
                                <p style={{ color: '#555', fontSize: '15px' }}>{notification.message}</p>
                                <button onClick={closeNotification} style={{ marginTop: 20, padding: '10px 30px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Đóng lại</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    button: { marginTop: '20px', padding: '10px 25px', background: '#4e54c8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    productList: { maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '15px', background: '#fcfcfc' },
    th: { padding: '12px', borderBottom: '2px solid #eee', color: '#555' },
    td: { padding: '12px', color: '#333' },
    deleteBtn: { padding: '5px 12px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};

export default DiscountAdmin;