import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Đổi lại 172.20.10.2 để ổn định, hoặc dùng IP nếu cần test mạng LAN
const API_URL = 'http://172.20.10.2:8080/api/employees/login';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

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

                // 1. Kiểm tra quyền Admin
                if (data.role !== 'ADMIN') {
                    setError('Tài khoản này không có quyền truy cập trang Quản trị!');
                    setIsLoading(false);
                    return;
                }

                // 2. LƯU VÀO LOCALSTORAGE VỚI TÊN RIÊNG (Namespace Admin)
                // Để không đụng hàng với session của nhân viên
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminId', data.id);
                localStorage.setItem('adminRole', data.role);
                localStorage.setItem('adminIsLoggedIn', 'true');

                // 3. Chuyển hướng vào trang Admin
                navigate('/admin/dashboard'); // Hoặc /admin tùy cấu hình route của bạn
            } else {
                setError('Sai thông tin đăng nhập!');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi kết nối server!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>ADMIN PORTAL</h2>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleAdminLogin}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#adb5bd', fontSize: '14px' }}>Username</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập mã quản trị..."
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ color: '#adb5bd', fontSize: '14px' }}>Password</label>
                        <input
                            type="password"
                            style={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu..."
                        />
                    </div>
                    <button type="submit" style={styles.button} disabled={isLoading}>
                        {isLoading ? 'Checking...' : 'ACCESS DASHBOARD'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// CSS nội bộ cho trang Admin (Giao diện tối)
const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#212529', // Nền đen xám
    },
    card: {
        width: '350px',
        padding: '40px',
        backgroundColor: '#343a40', // Card màu tối
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    },
    input: {
        width: '100%',
        padding: '10px',
        marginTop: '5px',
        borderRadius: '4px',
        border: '1px solid #495057',
        backgroundColor: '#495057',
        color: 'white',
        outline: 'none',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#0d6efd', // Màu xanh Admin
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '10px',
        opacity: 1,
        transition: 'opacity 0.2s'
    },
    error: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '15px',
        fontSize: '14px',
        textAlign: 'center'
    }
};

export default AdminLogin;