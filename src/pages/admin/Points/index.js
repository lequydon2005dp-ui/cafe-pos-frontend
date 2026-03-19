// src/components/CustomerPointsTable.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../styles/client/Points/index.css'; // QUAN TRỌNG: Import file CSS vừa tạo ở trên

// --- ICONS (SVG giữ nguyên để nhẹ) ---
const SearchIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RefreshIcon = ({ loading }) => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={{
      width: '16px',
      height: '16px',
      animation: loading ? 'spin 1s linear infinite' : 'none'
    }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const UserIcon = () => (
  <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const API_BASE_URL = 'http://172.20.10.2:8080';

const CustomerPointsTable = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('clientToken');
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchCustomers = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      setError('Vui lòng đăng nhập để xem danh sách');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/customers/all`, headers);
      setCustomers(response.data || []);
    } catch (err) {
      console.error('Lỗi:', err);
      setError('Không thể tải dữ liệu. Kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.phoneNumber?.toLowerCase().includes(searchPhone.toLowerCase().trim())
  );

  const getStatusClass = (points) => {
    if (points > 5000) return 'badge badge-vip';
    if (points > 1000) return 'badge badge-loyal';
    return 'badge badge-normal';
  };

  const getStatusText = (points) => {
    if (points > 5000) return '👑 VIP Gold';
    if (points > 1000) return '💎 Thân thiết';
    return 'Thành viên';
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card">

        {/* HEADER */}
        <div className="card-header">
          <div className="header-title">
            <h2>Hệ thống Tích điểm</h2>
            <p>Quản lý danh sách khách hàng & xếp hạng</p>
          </div>
          <button onClick={fetchCustomers} className="btn-refresh">
            <RefreshIcon loading={loading} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="table-toolbar">
          <div className="search-box">
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="search-input"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Nhập số điện thoại..."
            />
          </div>

          {!loading && !error && (
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Hiển thị: <b>{filteredCustomers.length}</b> khách hàng
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="table-responsive">
          {loading ? (
            <div className="state-container">
              <div className="spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="state-container" style={{ color: '#dc2626' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{error}</p>
              <button onClick={fetchCustomers} style={{ marginTop: '10px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Thử lại
              </button>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Điểm tích lũy</th>
                  <th style={{ textAlign: 'center' }}>Hạng</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                      Không tìm thấy dữ liệu phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <tr key={customer.phoneNumber || index}>
                      <td>
                        <div className="user-info">
                          <div className="avatar-circle">
                            <UserIcon />
                          </div>
                          <div className="user-details">
                            <h4>{customer.name || 'Chưa cập nhật'}</h4>
                            <span className="user-id">#{index + 1}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="phone-badge">{customer.phoneNumber}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#1f2937' }}>{customer.points?.toLocaleString('vi-VN') || 0}</strong>
                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>điểm</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={getStatusClass(customer.points)}>
                          {getStatusText(customer.points)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPointsTable;