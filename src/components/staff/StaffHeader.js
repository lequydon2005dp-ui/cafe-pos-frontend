import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

// CSS riêng cho Header
const headerStyles = `
    .top-nav { 
        height: 60px; 
        background: #2c3e50; 
        color: white; 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        padding: 0 20px; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
        z-index: 200; 
        flex-shrink: 0; 
        width: 100%;
    } 
    
    .nav-brand { 
        font-size: 1.2rem; 
        font-weight: 700; 
        color: #ecf0f1; 
        display: flex; 
        align-items: center; 
        gap: 10px; 
        cursor: pointer; 
        user-select: none;
    } 
    
    .nav-menu { 
        display: flex; 
        gap: 8px; 
    } 
    
    .nav-btn { 
        padding: 8px 12px; 
        border: none; 
        border-radius: 6px; 
        font-size: 0.9rem; 
        font-weight: 600; 
        cursor: pointer; 
        background: rgba(255,255,255,0.1); 
        color: #ecf0f1; 
        transition: all 0.2s; 
        white-space: nowrap; 
    } 
    
    .nav-btn:hover { 
        background: rgba(255,255,255,0.2); 
    } 

    .nav-btn.active {
        background: #f39c12; /* Màu cam nổi bật cho trang hiện tại */
        color: #fff;
    }
    
    .btn-logout { 
        background: #e74c3c; 
    } 
    .btn-logout:hover {
        background: #c0392b;
    }

    .btn-login { 
        background: #27ae60; 
    }
`;

const StaffHeader = () => {
    const navigate = useNavigate();
    const location = useLocation(); // Dùng để biết đang ở trang nào để highlight nút
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkLogin = localStorage.getItem('clientIsLoggedIn');
        setIsLoggedIn(checkLogin === 'true');
    }, []);

    const handleLogout = () => {
        if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            localStorage.removeItem('clientToken');
            localStorage.removeItem('clientIsLoggedIn');
            setIsLoggedIn(false);
            navigate('/login');
        }
    };

    // Hàm kiểm tra active
    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <>
            <style>{headerStyles}</style>
            <div className="top-nav">
                <div className="nav-brand" onClick={() => navigate('/')}>
                    ☕ POS SYSTEM
                </div>
                <div className="nav-menu">
                    <button 
                        className={`nav-btn ${isActive('/staff')}`} 
                        onClick={() => navigate('/staff')}
                    >
                        Pha chế
                    </button>
                    <button 
                        className={`nav-btn ${isActive('/tables')}`} 
                        onClick={() => navigate('/tables')}
                    >
                        Sơ đồ bàn
                    </button>
                    
                    <button 
                        className={`nav-btn ${isActive('/dangkyca')}`} 
                        onClick={() => navigate('/dangkyca')}
                    >
                        Đăng ký ca
                    </button>
                    
                    <button 
                        className={`nav-btn ${isActive('/quanlyca')}`} 
                        onClick={() => navigate('/quanlyca')}
                    >
                        Chấm công
                    </button>

                    {isLoggedIn ? (
                        <button className="nav-btn btn-logout" onClick={handleLogout}>
                            Đăng xuất
                        </button>
                    ) : (
                        <button className="nav-btn btn-login" onClick={() => navigate('/login')}>
                            Đăng nhập
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default StaffHeader;