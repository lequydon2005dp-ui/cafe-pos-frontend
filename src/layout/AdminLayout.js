import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

// --- STYLES (Premium Dashboard Sidebar) ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8f9fa; }

  .layout-container {
    display: flex;
    min-height: 100vh;
  }

  /* --- SIDEBAR --- */
  .sidebar {
    width: 280px;
    /* Gradient tối giản, sang trọng (Midnight Blue) */
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); 
    color: #94a3b8; /* Màu text xám nhẹ, dễ đọc trên nền tối */
    display: flex;
    flex-direction: column;
    padding: 24px;
    box-shadow: 4px 0 24px rgba(0,0,0,0.05);
    position: sticky;
    top: 0;
    height: 100vh;
    box-sizing: border-box;
    transition: all 0.3s ease;
    z-index: 100;
    border-right: 1px solid rgba(255,255,255,0.05);
  }

  .sidebar-header {
    padding-bottom: 30px;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .brand-text {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: white;
    text-align: center;
    text-transform: uppercase;
    align-items: center;
    gap: 12px;
  }
  
  .brand-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }

  /* Navigation */
  .nav-menu {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }
  
  /* Scrollbar ẩn cho đẹp */
  .nav-menu::-webkit-scrollbar { width: 4px; }
  .nav-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  .nav-link {
    display: flex;
    align-items: center;
    padding: 16px 16px;
    color: #94a3b8;
    text-decoration: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    position: relative;
    overflow: hidden;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.27);
    color: white;
  }

  /* Active State - Hiệu ứng phát sáng */
  .nav-link.active {
    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  .nav-icon {
    margin-right: 12px;
    font-size: 18px;
    width: 24px;
    text-align: center;
    opacity: 0.8;
    transition: 0.2s;
  }
  
  .nav-link.active .nav-icon { opacity: 1; }

  /* Logout Section */
  .sidebar-footer {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .user-info {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    padding: 10px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
  }
  .user-avatar {
    width: 32px; height: 32px; background: #475569; border-radius: 50%; 
    display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 14px; color: white;
  }
  .user-details div { font-size: 13px; color: white; font-weight: 600; }
  .user-details span { font-size: 11px; color: #64748b; }

  .btn-logout {
    width: 100%;
    padding: 12px;
    background: transparent;
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-logout:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }

  .btn-login {
    width: 100%;
    padding: 12px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 600;
    transition: 0.2s;
    font-size: 14px;
  }
  .btn-login:hover { background: #2563eb; transform: translateY(-2px); }

  /* --- MAIN CONTENT --- */
  .main-content {
    flex: 1;
    background-color: #f1f5f9; /* Màu nền xám sáng hiện đại */
    padding: 30px 40px;
    overflow-y: auto;
    height: 100vh;
    box-sizing: border-box;
  }
`;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminId, setAdminId] = useState('');

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const checkLogin = localStorage.getItem('adminIsLoggedIn');
    const id = localStorage.getItem('adminId');
    setIsLoggedIn(checkLogin === 'true');
    if (id) setAdminId(id);
  }, []);

  // Xử lý đăng xuất
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất Admin không?')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminIsLoggedIn');
      setIsLoggedIn(false);
      navigate('/admin/login');
    }
  };

  // Helper để active class
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="layout-container">
      <style>{styles}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-text">
            ADMIN
          </div>
        </div>

        <nav className="nav-menu">
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' || location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </Link>

          <div style={{ margin: '10px 0 5px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Quản lý cửa hàng</div>

          <Link to="/admin/products" className={`nav-link ${isActive('/admin/products')}`}>
            <span className="nav-icon">☕</span> Sản phẩm
          </Link>

          <Link to="/admin/category" className={`nav-link ${isActive('/admin/category')}`}>
            <span className="nav-icon">📂</span> Danh mục
          </Link>

          <Link to="/admin/toppings" className={`nav-link ${isActive('/admin/toppings')}`}>
            <span className="nav-icon">🍒</span> Toppings
          </Link>

          <Link to="/admin/sizes" className={`nav-link ${isActive('/admin/sizes')}`}>
            <span className="nav-icon">📏</span> Sizes
          </Link>
          <Link to="/admin/discounts" className={`nav-link ${isActive('/admin/discounts')}`}>
            <span className="nav-icon">🏷️</span> Mã giảm giá
          </Link>

          <Link to="/admin/orders" className={`nav-link ${isActive('/admin/orders')}`}>
            <span className="nav-icon">🧾</span> Đơn hàng
          </Link>

          <Link to="/admin/qr" className={`nav-link ${isActive('/admin/qr')}`}>
            <span className="nav-icon">🔳</span> Mã QR Bàn
          </Link>

          <div style={{ margin: '15px 0 5px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Nhân sự</div>

          <Link to="/admin/employee" className={`nav-link ${isActive('/admin/employee')}`}>
            <span className="nav-icon">👥</span> Nhân Viên
          </Link>

          <Link to="/admin/shift" className={`nav-link ${isActive('/admin/shift')}`}>
            <span className="nav-icon">🕒</span> Ca làm việc
          </Link>
          <Link to="/admin/salary" className={`nav-link ${isActive('/admin/salary')}`}>
            <span className="nav-icon">💰</span> Lương Nhân Viên
          </Link>
          <Link to="/admin/points" className={`nav-link ${isActive('/admin/points')}`}>
            <span className="nav-icon">🎁</span> Tích Điểm
          </Link>
        </nav>

        <div className="sidebar-footer">
          {isLoggedIn ? (
            <>
              <div className="user-info">
                <div className="user-avatar">{adminId.charAt(0)}</div>
                <div className="user-details">
                  <div>{adminId}</div>
                  <span>Administrator</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                <span>🚪</span> Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="btn-login">
              <span>🔑</span> Đăng nhập
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;