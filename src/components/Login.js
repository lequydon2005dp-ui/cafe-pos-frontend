import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/client/Login/login.css';

// Dùng localhost để ổn định. Nếu cần test điện thoại mới đổi sang IP 192.168...
const API_URL = 'http://172.20.10.2:8080/api/employees/login';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate cơ bản
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu!');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: username.trim(),
                    password: password.trim()
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // 1. CHẶN ADMIN (Admin phải sang trang /admin/login)
                if (data.role === 'ADMIN') {
                    alert("Tài khoản Quản trị vui lòng đăng nhập tại trang Admin Portal!");
                    setIsLoading(false);
                    return;
                }

                // 2. LƯU VÀO LOCALSTORAGE VỚI TÊN RIÊNG (Namespace Client)
                // Dùng "client..." để không bị trùng với "admin..."
                localStorage.setItem('clientToken', data.token);
                localStorage.setItem('clientId', data.id);
                localStorage.setItem('clientRole', data.role);
                localStorage.setItem('clientIsLoggedIn', 'true');

                // 3. Chuyển hướng vào trang Nhân viên
                // Truyền state employeeId để Dashboard load dữ liệu ngay
                navigate('/pos', { state: { employeeId: data.id } });
            } else {
                // Xử lý lỗi 401 (Sai pass) hoặc lỗi khác
                setError('Sai tài khoản hoặc mật khẩu!');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi kết nối đến máy chủ (Backend chưa chạy?)');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="card-decoration"></div>

                <div className="brand-section">
                    <div className="logo-circle">DNO</div>
                    <h1 className="brand-title">DNO COFFEE</h1>
                    <p className="brand-subtitle">Hệ thống quản lý & Chấm công</p>
                </div>

                <form onSubmit={handleLogin} style={{ width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>

                    {error && (
                        <div style={{
                            color: '#d32f2f',
                            backgroundColor: '#ffebee',
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            fontSize: '14px',
                            textAlign: 'center',
                            border: '1px solid #ffcdd2'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#5D4037', fontSize: '14px' }}>
                            TÀI KHOẢN / MÃ NHÂN VIÊN
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Nhập mã nhân viên..."
                                style={{
                                    width: '100%',
                                    padding: '14px 14px 14px 45px',
                                    borderRadius: '12px',
                                    border: '2px solid #E0E0E0',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#FF7043'}
                                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                            />
                            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>👤</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#5D4037', fontSize: '14px' }}>
                            MẬT KHẨU
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                                style={{
                                    width: '100%',
                                    padding: '14px 14px 14px 45px',
                                    borderRadius: '12px',
                                    border: '2px solid #E0E0E0',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#FF7043'}
                                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                            />
                            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔒</span>
                        </div>
                    </div>

                    <div className="action-group">
                        <button
                            type="submit"
                            className="btn-main btn-submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                marginTop: '0',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1
                            }}
                        >
                            {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
                        </button>
                    </div>
                </form>

                <div className="footer-text" style={{ marginTop: '30px' }}>
                    © 2025 DNO Coffee POS System<br />
                    Đồ án tốt nghiệp - Nhóm sinh viên
                </div>
            </div>
        </div>
    );
};

export default Login;