import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://172.20.10.2:8080/api/orders';

// --- CSS STYLES (GIỮ NGUYÊN GIAO DIỆN ĐẸP) ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root { 
      --bg-color: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      --card-bg: #ffffff;
      --primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --primary-solid: #667eea;
      --success: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
      --success-solid: #56ab2f;
      --warning: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --warning-solid: #f093fb;
      --danger: #ef4444;
      --text-main: #1f2937; 
      --text-light: #6b7280;
      --border-color: #e5e7eb;
      --shadow-light: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-card: 0 8px 25px -8px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05);
  }

  body { 
      font-family: 'Inter', sans-serif; 
      background: var(--bg-color); 
      margin: 0; 
      min-height: 100vh; 
      color: var(--text-main); 
      background-attachment: fixed;
  }
  .admin-container { 
      max-width: 1400px; 
      margin: 0 auto; 
      padding: 30px; 
      animation: fadeIn 0.5s ease-in-out;
  }

  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }

  /* --- HEADER --- */
  .header-bar { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      background: var(--card-bg); 
      padding: 25px 35px; 
      border-radius: 20px; 
      margin-bottom: 35px; 
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      transition: transform 0.3s ease;
  }
  .header-bar:hover { transform: translateY(-2px); }
  .header-title h2 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 700; 
      background: var(--primary); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent; 
      background-clip: text;
  }
  .header-subtitle { 
      font-size: 16px; 
      color: var(--text-light); 
      margin-top: 8px; 
      font-weight: 500;
  }
  .total-badge { 
      background: var(--primary); 
      color: white; 
      padding: 8px 16px; 
      border-radius: 25px; 
      font-weight: 600; 
      font-size: 15px; 
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      animation: pulse 2s infinite;
  }

  @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
  }

  /* --- TABS --- */
  .tabs-container { 
      margin-bottom: 30px; 
      display: flex; 
      gap: 15px; 
      justify-content: center;
  }
  .tab-btn { 
      padding: 12px 24px; 
      border: 2px solid transparent; 
      border-radius: 15px; 
      font-weight: 600; 
      cursor: pointer; 
      background: var(--card-bg); 
      color: var(--text-light); 
      transition: all 0.3s ease; 
      font-size: 15px;
      box-shadow: var(--shadow-light);
      position: relative;
      overflow: hidden;
  }
  .tab-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
  }
  .tab-btn:hover::before { left: 100%; }
  .tab-btn:hover { 
      border-color: var(--primary-solid); 
      color: var(--primary-solid); 
      transform: translateY(-2px);
  }
  .tab-btn.active { 
      background: var(--primary); 
      color: white; 
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
  }

  /* --- GRID --- */
  .orders-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
      gap: 30px; 
  }
  
  /* --- CARD --- */
  .order-card { 
      background: var(--card-bg); 
      border-radius: 20px; 
      padding: 28px; 
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 8px solid #ccc; 
      display: flex; 
      flex-direction: column; 
      transition: all 0.4s ease;
      position: relative; 
      overflow: hidden;
      backdrop-filter: blur(10px);
  }
  .order-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-solid), var(--success-solid));
      opacity: 0;
      transition: opacity 0.3s;
  }
  .order-card:hover { 
      transform: translateY(-8px); 
      box-shadow: var(--shadow-hover);
  }
  .order-card:hover::before { opacity: 1; }

  .status-PENDING { border-left-color: var(--warning-solid); } 
  .status-COMPLETED { border-left-color: var(--success-solid); } 
  .status-CLOSED { border-left-color: var(--text-main); opacity: 0.85; }

  /* Card Header */
  .card-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 18px; 
      padding-bottom: 18px; 
      border-bottom: 2px dashed var(--border-color);
      position: relative;
  }
  .table-title { 
      font-size: 20px; 
      font-weight: 700; 
      color: var(--text-main);
      background: linear-gradient(135deg, var(--text-main), var(--primary-solid));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
  }
  .order-time { 
      font-size: 14px; 
      color: var(--text-light); 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      margin-top: 6px;
      font-weight: 500;
  }
  
  .status-pill { 
      font-size: 12px; 
      padding: 6px 14px; 
      border-radius: 25px; 
      font-weight: 700; 
      text-transform: uppercase; 
      letter-spacing: 0.8px;
      box-shadow: var(--shadow-light);
  }
  .pill-PENDING { 
      background: var(--warning); 
      color: white; 
      border: 1px solid rgba(245, 101, 101, 0.3);
  }
  .pill-COMPLETED { 
      background: var(--success); 
      color: white; 
      border: 1px solid rgba(34, 197, 94, 0.3);
  }
  .pill-CLOSED { 
      background: linear-gradient(135deg, #9ca3af, #6b7280); 
      color: white; 
      border: 1px solid rgba(107, 114, 128, 0.3);
  }

  /* Items */
  .items-list { 
      margin-bottom: 22px; 
      max-height: 300px; 
      overflow-y: auto; 
      padding-right: 8px;
      scrollbar-width: thin;
      scrollbar-color: var(--primary-solid) #f1f1f1;
  }
  .items-list::-webkit-scrollbar { width: 6px; }
  .items-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
  .items-list::-webkit-scrollbar-thumb { background: var(--primary-solid); border-radius: 10px; }

  .item-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 14px 0; 
      border-bottom: 1px solid #f3f4f6;
      transition: background 0.2s;
      border-radius: 8px;
      margin-bottom: 4px;
  }
  .item-row:hover { background: rgba(102, 126, 234, 0.05); }
  .item-row:last-child { border-bottom: none; }
  
  .item-qty { 
      background: var(--primary); 
      width: 36px; 
      height: 36px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 12px; 
      font-size: 15px; 
      font-weight: 700; 
      color: white;
      margin-right: 14px; 
      flex-shrink: 0;
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  
  .item-name { 
      font-weight: 600; 
      font-size: 16px; 
      color: var(--text-main); 
      line-height: 1.4;
  }
  .item-extras { 
      margin-top: 8px; 
      font-size: 14px; 
      color: var(--text-light);
  }
  .extra-tag { 
      display: inline-block; 
      background: linear-gradient(135deg, #fef3c7, #fde68a); 
      border: 1px solid #f59e0b; 
      padding: 4px 10px; 
      border-radius: 8px; 
      margin-right: 6px; 
      margin-bottom: 6px; 
      font-size: 13px;
      font-weight: 500;
      color: #92400e;
  }
  .item-note { 
      color: var(--danger); 
      font-style: italic; 
      font-size: 13px; 
      margin-top: 6px; 
      display: flex; 
      align-items: center; 
      gap: 6px;
      background: rgba(239, 68, 68, 0.1);
      padding: 4px 8px;
      border-radius: 6px;
  }

  /* Footer */
  .payment-box { 
      background: linear-gradient(135deg, #f9fafb, #f3f4f6); 
      padding: 18px; 
      border-radius: 15px; 
      margin-top: auto; 
      border: 1px solid #e5e7eb;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  .payment-row { 
      display: flex; 
      justify-content: space-between; 
      font-size: 14px; 
      color: var(--text-light); 
      margin-bottom: 8px;
      font-weight: 500;
  }
  .payment-row.highlight { color: #be123c; font-weight: 600; }
  .payment-row.highlight-points { color: #d97706; font-weight: 600; }

  .total-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-top: 12px; 
      padding-top: 12px; 
      border-top: 2px dashed #d1d5db;
  }
  .total-label { 
      font-weight: 600; 
      color: var(--text-main); 
      font-size: 16px;
  }
  .total-value { 
      font-size: 22px; 
      font-weight: 800; 
      background: var(--primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
  }

  /* Voucher */
  .voucher-box { 
      margin-top: 15px; 
      background: linear-gradient(135deg, #fff7ed, #fed7aa); 
      border: 1px solid #fdba74; 
      color: #c2410c; 
      padding: 12px; 
      border-radius: 10px; 
      font-size: 14px; 
      display: flex; 
      align-items: flex-start; 
      gap: 10px;
      box-shadow: 0 2px 8px rgba(253, 186, 116, 0.3);
      font-weight: 500;
  }

  /* Actions */
  .card-actions { 
      display: flex; 
      gap: 15px; 
      margin-top: 24px;
  }
  .btn-action { 
      flex: 1; 
      padding: 14px; 
      border: none; 
      border-radius: 12px; 
      font-weight: 600; 
      cursor: pointer; 
      transition: all 0.3s ease; 
      font-size: 15px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 8px;
      position: relative;
      overflow: hidden;
  }
  .btn-action::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
  }
  .btn-action:hover::before { left: 100%; }
  .btn-done { 
      background: var(--success); 
      color: white; 
      box-shadow: 0 6px 15px rgba(86, 171, 47, 0.4);
  }
  .btn-done:hover { 
      background: var(--success-solid); 
      transform: translateY(-3px); 
      box-shadow: 0 8px 20px rgba(86, 171, 47, 0.5);
  }
  .btn-close { 
      background: linear-gradient(135deg, #374151, #1f2937); 
      color: white;
      box-shadow: 0 6px 15px rgba(55, 65, 81, 0.4);
  }
  .btn-close:hover { 
      background: linear-gradient(135deg, #1f2937, #111827); 
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(31, 41, 55, 0.5);
  }

  /* Responsive */
  @media (max-width: 768px) {
      .admin-container { padding: 20px; }
      .orders-grid { grid-template-columns: 1fr; gap: 20px; }
      .header-bar { flex-direction: column; gap: 15px; text-align: center; }
      .tabs-container { flex-wrap: wrap; }
      .tab-btn { flex: 1; min-width: 120px; }
  }
`;

const OrderAdmin = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    };

    const fetchOrders = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/all`, getAuthHeaders());
            // Sắp xếp ID giảm dần (đơn mới nhất lên đầu)
            setOrders(res.data.sort((a, b) => b.id - a.id));
            setLoading(false);
        } catch (error) {
            console.error("Lỗi tải đơn hàng:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Polling mỗi 5 giây
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (id, status) => {
        const confirmMsg = status === 'COMPLETED'
            ? "Xác nhận Bếp đã làm xong món?"
            : "Xác nhận khách đã thanh toán và rời đi (Đóng đơn)?";

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.put(`${API_BASE_URL}/${id}/status`, null, {
                ...getAuthHeaders(),
                params: { status }
            });
            fetchOrders();
        } catch (e) {
            alert("Lỗi cập nhật trạng thái!");
        }
    };

    const filteredOrders = orders.filter(o => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return ['PENDING', 'PREPARING'].includes(o.status);
        if (filter === 'COMPLETED') return o.status === 'COMPLETED';
        if (filter === 'CLOSED') return o.status === 'PAID' || o.status === 'CLOSED'; // Handle PAID status if exists
        return false;
    });

    // Helper render topping an toàn
    const renderToppingNames = (toppingNames) => {
        if (!toppingNames) return null;
        const displayString = Array.isArray(toppingNames) ? toppingNames.join(', ') : toppingNames;
        if (!displayString) return null;
        return <div className="extra-tag" style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>🔸 {displayString}</div>;
    };

    return (
        <div className="admin-container">
            <style>{styles}</style>

            <div className="header-bar">
                <div>
                    <div className="header-title">
                        <h2>🚀 Bếp & Quản Lý Đơn</h2>
                    </div>
                    <div className="header-subtitle">Theo dõi trạng thái đơn hàng thời gian thực</div>
                </div>
                <div className="total-badge">
                    Tổng đơn: {orders.length}
                </div>
            </div>

            <div className="tabs-container">
                <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>📋 Tất cả</button>
                <button className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>👨‍🍳 Bếp đang làm</button>
                <button className={`tab-btn ${filter === 'CLOSED' ? 'active' : ''}`} onClick={() => setFilter('CLOSED')}>✅ Đã xong/Đóng</button>
            </div>

            <div className="orders-grid">
                {filteredOrders.map(order => {
                    // === LOGIC TÍNH TOÁN HIỂN THỊ GIÁ ===
                    const subTotal = order.orderDetails
                        ? order.orderDetails.reduce((acc, item) => acc + (item.price * item.quantity), 0)
                        : 0;

                    const voucherDiscount = order.discountAmount || 0;
                    const pointsDiscount = order.pointsDiscount || 0;

                    // Nếu totalAmount từ DB bằng đúng subTotal (chưa trừ) trong khi có điểm/voucher
                    // Thì ta tự tính lại để hiển thị cho đúng. 
                    // Ngược lại nếu totalAmount khác subTotal thì tin tưởng totalAmount từ backend.
                    let displayTotal = order.totalAmount;
                    if (displayTotal === subTotal && (voucherDiscount > 0 || pointsDiscount > 0)) {
                        displayTotal = Math.max(0, subTotal - voucherDiscount - pointsDiscount);
                    }

                    return (
                        <div key={order.id} className={`order-card status-${order.status || 'PENDING'}`}>

                            {/* Header */}
                            <div className="card-header">
                                <div>
                                    <div className="table-title">{order.tableNumber ? `Bàn ${order.tableNumber}` : 'Mang đi'}</div>
                                    <div className="order-time">
                                        <span>#{order.id}</span>
                                        <span>•</span>
                                        <span>{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <span className={`status-pill pill-${order.status || 'PENDING'}`}>
                                    {order.status === 'PENDING' ? '⏳ Chờ làm' : order.status === 'COMPLETED' ? '✅ Xong' : '🏁 Đã đóng'}
                                </span>
                            </div>

                            {/* Items */}
                            <div className="items-list">
                                {order.orderDetails && order.orderDetails.map((item, idx) => (
                                    <div key={idx} className="item-row">
                                        <div className="item-qty">{item.quantity}</div>
                                        <div style={{ flex: 1 }}>
                                            <span className="item-name">{item.productName}</span>
                                            <div className="item-extras">
                                                {item.sizeName && <span className="extra-tag">Size: {item.sizeName}</span>}
                                                {renderToppingNames(item.toppingNames)}
                                                {item.note && <div className="item-note">📝 {item.note}</div>}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                                            {(item.price * item.quantity).toLocaleString()}đ
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer - SỬA LẠI ĐỂ HIỂN THỊ CHI TIẾT TRỪ TIỀN */}
                            <div className="payment-box">
                                <div className="payment-row">
                                    <span>Tạm tính:</span>
                                    <span>{subTotal.toLocaleString()} đ</span>
                                </div>

                                {voucherDiscount > 0 && (
                                    <div className="payment-row highlight">
                                        <span>Voucher:</span>
                                        <span>-{voucherDiscount.toLocaleString()} đ</span>
                                    </div>
                                )}

                                {pointsDiscount > 0 && (
                                    <div className="payment-row highlight-points">
                                        <span>Tiêu điểm:</span>
                                        <span>-{pointsDiscount.toLocaleString()} đ</span>
                                    </div>
                                )}

                                <div className="payment-row">
                                    <span>Thanh toán:</span>
                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                        {order.paymentMethod === 'CASH' ? '💵 Tiền mặt' : order.paymentMethod === 'BANK' ? '🏦 Chuyển khoản' : order.paymentMethod === 'VNPAY' ? '📱 VNPay' : 'CHƯA THANH TOÁN'}
                                    </span>
                                </div>

                                <div className="total-row">
                                    <span className="total-label">Tổng cộng:</span>
                                    <span className="total-value">{displayTotal.toLocaleString()} đ</span>
                                </div>

                                {order.note && order.note.toLowerCase().includes("voucher") && (
                                    <div className="voucher-box">
                                        <span>🏷️</span>
                                        <span>{order.note}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {order.status !== 'CLOSED' && order.status !== 'PAID' && (
                                <div className="card-actions">
                                    {order.status === 'PENDING' && (
                                        <button className="btn-action btn-done" onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}>
                                            ✅ Báo xong
                                        </button>
                                    )}
                                    {order.status === 'COMPLETED' && (
                                        <button className="btn-action btn-close" onClick={() => handleUpdateStatus(order.id, 'CLOSED')}>
                                            🏁 Đóng đơn
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderAdmin;