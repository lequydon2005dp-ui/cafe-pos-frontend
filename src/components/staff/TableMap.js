// ============== FILE: TableMap.jsx (THANH TOÁN TIỀN MẶT + DỌN BÀN) ==============
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

// --- CẤU HÌNH ---
const API_BASE_URL = 'http://172.20.10.2:8080'; // Giữ IP của Code B
const TOTAL_TABLES = 20;
const TABLES = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1);

// --- UTILS ---
const parseDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (Array.isArray(dateInput)) {
    return new Date(dateInput[0], dateInput[1] - 1, dateInput[2], dateInput[3] || 0, dateInput[4] || 0, dateInput[5] || 0);
  }
  return new Date(dateInput);
};

const isToday = (dateInput) => {
  if (!dateInput) return true;
  const date = parseDate(dateInput);
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const roundToThousand = (value) => (!value ? 0 : Math.round(value / 1000) * 1000);

const TableMap = () => {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState([]);
  const [tablesStatus, setTablesStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho Modal Thanh toán
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [paymentMode, setPaymentMode] = useState('NONE');
  const [customerPaidAmount, setCustomerPaidAmount] = useState('');

  const stompClientRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('clientToken') || localStorage.getItem('adminToken');
    if (!token) return null;
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers) {
      alert("Vui lòng đăng nhập!");
      navigate('/login');
      return;
    }

    Promise.all([fetchActiveOrders(), fetchTableStatuses()])
      .then(() => setLoading(false))
      .catch(() => setLoading(false));

    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);
    client.debug = () => { };

    client.connect({}, () => {
      client.subscribe('/topic/orders', () => fetchActiveOrders());
      client.subscribe('/topic/tables', (message) => {
        const updatedTable = JSON.parse(message.body);
        updateTableStateLocally(updatedTable);
      });
    }, (err) => console.error("Socket Error:", err));

    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current?.connected) stompClientRef.current.disconnect();
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/all`, getAuthHeaders());
      const active = res.data.filter(o => {
        if (!isToday(o.createdAt)) return false;
        const status = (o.status || '').toUpperCase();
        const hasTable = o.tableNumber && o.tableNumber !== 'null';
        // Giữ lại COMPLETED để hiển thị cho đến khi bàn được dọn
        return hasTable && !['CANCELLED', 'CLOSED'].includes(status);
      });
      setActiveOrders(active);
    } catch (error) {
      console.error("Lỗi fetch orders:", error);
    }
  };

  const fetchTableStatuses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tables`, getAuthHeaders());
      setTablesStatus(res.data);
    } catch (error) {
      console.error("Lỗi fetch table status:", error);
    }
  };

  const updateTableStateLocally = (updatedTable) => {
    setTablesStatus(prev => {
      const index = prev.findIndex(t => t.tableNumber === updatedTable.tableNumber);
      if (index !== -1) {
        const newList = [...prev];
        newList[index] = updatedTable;
        return newList;
      }
      return [...prev, updatedTable];
    });
  };

  const handleTableClick = (tableNum, orders) => {
    if (orders.length > 0) {
      setSelectedTableId(tableNum);
      setPaymentMode('NONE');
      setCustomerPaidAmount('');
    }
  };

  const closeModal = () => {
    setSelectedTableId(null);
    setPaymentMode('NONE');
    setCustomerPaidAmount('');
  };

  // --- LOGIC MỚI: XỬ LÝ DỌN BÀN & KHÁCH VỀ (TỪ CODE A) ---
  const handleCustomerLeft = async (e, tableNum, ordersOnThisTable, isAllCompleted) => {
    e.stopPropagation(); // Ngăn mở modal chi tiết

    // Kiểm tra món ăn
    if (!isAllCompleted) {
      alert("Vẫn còn món chưa hoàn thành! Vui lòng đợi bếp làm xong hoặc hủy món.");
      return;
    }

    // Kiểm tra thanh toán (Optional: tùy bạn có muốn bắt buộc TT trước khi dọn không)
    const hasPaid = isPaid(ordersOnThisTable);
    if (!hasPaid) {
      if (!window.confirm(`⚠️ Bàn này CHƯA THANH TOÁN!\nBạn có chắc chắn khách đã về và muốn dọn bàn không?`)) return;
    } else {
      if (!window.confirm(`Xác nhận khách bàn ${tableNum} đã về & Bắt đầu dọn dẹp?`)) return;
    }

    try {
      // 1. Chuyển trạng thái bàn sang CLEANING
      await axios.post(`${API_BASE_URL}/api/tables/${tableNum}/status`, { status: 'CLEANING' }, getAuthHeaders());

      // 2. Đóng tất cả đơn hàng (Chuyển sang CLOSED)
      const closePromises = ordersOnThisTable.map(order =>
        axios.put(`${API_BASE_URL}/api/orders/${order.id}/status`, null, { ...getAuthHeaders(), params: { status: 'CLOSED' } })
      );
      await Promise.all(closePromises);

      fetchActiveOrders();
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  // --- LOGIC MỚI: XÁC NHẬN DỌN XONG (TỪ CODE A) ---
  const markAsEmpty = async (e, tableNum) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_BASE_URL}/api/tables/${tableNum}/status`, { status: 'EMPTY' }, getAuthHeaders());
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  // --- LOGIC THANH TOÁN TIỀN MẶT (TỪ CODE B) ---
  const handleCashPayment = async () => {
    const paid = Number(customerPaidAmount.replace(/[^0-9]/g, ''));
    if (paid < totalAmount) {
      alert("Số tiền khách đưa chưa đủ!");
      return;
    }

    if (!window.confirm(`Xác nhận thanh toán TIỀN MẶT cho Bàn ${selectedTableId}?\nTiền thối: ${(paid - totalAmount).toLocaleString()} đ`)) return;

    try {
      const updates = selectedTableOrders.map(order =>
        axios.put(`${API_BASE_URL}/api/orders/${order.id}/payment`, {}, getAuthHeaders())
      );

      await Promise.all(updates);
      alert(`✅ Thanh toán thành công!\nTiền thối lại: ${(paid - totalAmount).toLocaleString()} đ`);
      fetchActiveOrders();
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi thanh toán! Vui lòng kiểm tra quyền hoặc liên hệ quản trị viên.");
    }
  };

  // --- HELPER FUNCTIONS ---
  const getDuration = (startTime) => {
    if (!startTime) return 'Vừa tới';
    const diff = Math.floor((new Date() - new Date(startTime)) / 60000);
    if (diff < 60) return `${diff} phút`;
    return `${Math.floor(diff / 60)}h ${diff % 60}p`;
  };

  const getDishName = (item) => item.product?.name || item.productName || item.name || "Món không tên";

  const renderToppings = (item) => {
    if (item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0) {
      return <div className="item-topping">+ {item.toppings.map(t => t.name || t.productName).join(', ')}</div>;
    }
    return null;
  };

  const getItemStatusBadge = (itemStatus, orderStatus) => {
    const s = (itemStatus || orderStatus || '').toUpperCase();
    if (['COMPLETED', 'SERVED', 'DONE', 'PAID', 'SUCCESS', 'READY', 'COOKED'].includes(s)) {
      return <span className="item-status-badge badge-done">Đã lên</span>;
    }
    if (s === 'CANCELLED') {
      return <span className="item-status-badge badge-cancel">Đã hủy</span>;
    }
    return <span className="item-status-badge badge-pending">Đang làm</span>;
  };

  const isPaid = (orders) => {
    if (!orders || orders.length === 0) return false;
    return orders.some(o => o.status === 'PAID' || o.paymentMethod);
  };

  // --- VARIABLES FOR RENDER ---
  const selectedTableOrders = selectedTableId
    ? activeOrders.filter(o => String(o.tableNumber).trim() === String(selectedTableId))
    : [];

  const totalAmount = selectedTableOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const customerPaid = Number(customerPaidAmount.replace(/[^0-9]/g, '')) || 0;
  const changeAmount = customerPaid - totalAmount;

  // --- CSS STYLES ---
  const styles = `
    .table-container { padding: 30px; background: #f4f6f8; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .page-title { margin: 0; color: #2c3e50; font-size: 24px; font-weight: 700; }
    .legend { display: flex; gap: 20px; font-size: 14px; font-weight: 600; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    
    .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 20px; }
    
    .table-card { 
        background: white; border-radius: 16px; height: 160px; 
        display: flex; flex-direction: column; justify-content: space-between; 
        padding: 15px; transition: all 0.3s; 
        border: 2px solid transparent; box-shadow: 0 4px 10px rgba(0,0,0,0.03); 
        position: relative; overflow: hidden; 
    }
    .table-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    
    .status-empty { border-color: #27ae60; }
    .status-empty .table-icon { color: #27ae60; background: #e8f8f5; }
    
    .status-occupied { border-color: #e74c3c; background: #fff5f5; cursor: pointer; }
    .status-occupied .table-icon { color: #e74c3c; background: #ffebee; }
    
    .status-cleaning { border-color: #f39c12; background: #fef9e7; }
    .status-cleaning .table-icon { color: #f39c12; background: #fffdf0; }
    
    .table-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .table-name { font-size: 18px; font-weight: 800; color: #2c3e50; }
    .table-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    
    .order-info { margin-top: auto; }
    .info-row { font-size: 13px; color: #7f8c8d; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
    .price-tag { font-weight: 800; color: #e74c3c; font-size: 16px; }
    .time-badge { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    
    .btn-back { padding: 10px 20px; border-radius: 8px; border: none; background: #95a5a6; color: white; font-weight: 600; cursor: pointer; }
    
    /* BUTTONS ON CARD */
    .btn-action { 
        position: absolute; bottom: 10px; right: 10px; 
        background: white; border: 1px solid #ddd; 
        width: 36px; height: 36px; border-radius: 50%; 
        display: flex; align-items: center; justify-content: center; 
        cursor: pointer; font-size: 18px; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
        z-index: 10; transition: all 0.2s; 
    }
    .btn-action:hover:not(:disabled) { transform: scale(1.1); }
    .btn-action:disabled { opacity: 0.4; cursor: not-allowed; background: #ecf0f1; }
    
    .btn-cleaning { color: #f39c12; border-color: #f39c12; }
    .btn-cleaning:hover:not(:disabled) { background: #f39c12; color: white; }
    
    .btn-done { background: #27ae60; color: white; border-color: #27ae60; }
    .btn-done:hover:not(:disabled) { background: #219150; }
    
    /* MODAL */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(3px); }
    .modal-content { background: white; width: 90%; max-width: 550px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; background: #f8f9fa; }
    .modal-title { font-size: 20px; font-weight: 800; color: #2c3e50; }
    .btn-close { border: none; background: #e0e0e0; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; color: #555; display: flex; align-items: center; justify-content: center; }
    .btn-close:hover { background: #e74c3c; color: white; }
    .items-scroll { overflow-y: auto; flex: 1; padding: 24px; }
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 15px 0; border-bottom: 1px dashed #eee; }
    .item-info { display: flex; flex-direction: column; gap: 6px; flex: 1; padding-right: 10px; }
    .item-name { font-weight: 700; color: #2c3e50; font-size: 16px; line-height: 1.4; }
    .item-meta { font-size: 14px; color: #7f8c8d; display: flex; gap: 10px; align-items: center; }
    .item-topping { font-size: 12px; color: #666; font-style: italic; background: #f9f9f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; }
    .item-status-badge { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
    .badge-done { background: #e8f8f5; color: #27ae60; border: 1px solid #27ae60; }
    .badge-pending { background: #fff5f5; color: #e74c3c; border: 1px solid #e74c3c; }
    .badge-cancel { background: #f2f2f2; color: #999; text-decoration: line-through; }
    
    /* PAYMENT SECTION */
    .modal-footer { padding: 20px 24px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 15px; }
    .payment-actions { display: flex; gap: 12px; width: 100%; }
    .btn-pay { flex: 1; padding: 16px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none; font-size: 16px; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 10px; }
    .btn-pay-cash { background: #27ae60; color: white; }
    .btn-pay-cash:hover { background: #219150; }
    .cash-input-section { margin-top: 10px; padding: 15px; background: #f8fff8; border-radius: 12px; border: 1px solid #27ae60; }
    .cash-input { width: 100%; padding: 12px; font-size: 18px; text-align: right; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; }
    .change-display { font-size: 20px; font-weight: 800; color: #27ae60; text-align: center; margin: 10px 0; }
    .btn-confirm-cash { width: 100%; padding: 14px; background: #27ae60; color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; }
    .btn-confirm-cash:disabled { background: #95a5a6; cursor: not-allowed; }
  `;

  return (
    <div className="table-container">
      <style>{styles}</style>

      <div className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button className="btn-back" onClick={() => navigate('/pos')}>&larr; Về POS</button>
          <h1 className="page-title">Sơ Đồ Bàn</h1>
        </div>
        <div className="legend">
          <div className="legend-item"><div className="dot" style={{ background: '#27ae60' }}></div> Trống</div>
          <div className="legend-item"><div className="dot" style={{ background: '#e74c3c' }}></div> Có khách</div>
          <div className="legend-item"><div className="dot" style={{ background: '#f39c12' }}></div> Đang dọn</div>
        </div>
      </div>

      {loading ? <p style={{ textAlign: 'center' }}>Đang đồng bộ...</p> : (
        <div className="grid-layout">
          {TABLES.map(tableNum => {
            const ordersOnTable = activeOrders.filter(o => String(o.tableNumber).trim() === String(tableNum));
            const isOccupied = ordersOnTable.length > 0;
            const tableData = tablesStatus.find(t => t.tableNumber === tableNum);
            const dbStatus = tableData?.status || 'EMPTY';
            const isCleaning = !isOccupied && dbStatus === 'CLEANING';

            let cardClass = 'status-empty';
            let icon = '🪑';
            if (isOccupied) { cardClass = 'status-occupied'; icon = '👥'; }
            else if (isCleaning) { cardClass = 'status-cleaning'; icon = '🧹'; }

            const totalOnTable = ordersOnTable.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
            const sortedOrders = [...ordersOnTable].sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt));
            const startTime = sortedOrders[0]?.createdAt || null;

            const hasPaid = isPaid(ordersOnTable);

            // Logic kiểm tra xem tất cả món đã xong chưa (để hiện nút chổi)
            const isAllCompleted = ordersOnTable.length > 0 && ordersOnTable.every(o => {
              const s = (o.status || '').toUpperCase();
              return ['COMPLETED', 'SERVED', 'SUCCESS', 'READY', 'COOKED', 'PAID'].includes(s);
            });

            return (
              <div key={tableNum} className={`table-card ${cardClass}`} onClick={() => handleTableClick(tableNum, ordersOnTable)}>
                <div className="table-header">
                  <span className="table-name">Bàn {tableNum}</span>
                  <div className="table-icon">{icon}</div>
                </div>

                {isOccupied ? (
                  <>
                    <div className="order-info">
                      <div className="info-row">
                        <span className="time-badge">⏱ {getDuration(startTime)}</span>
                        <span>• {ordersOnTable.length} đơn</span>
                      </div>
                      <div className="price-tag">{roundToThousand(totalOnTable).toLocaleString()} đ</div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', fontWeight: '600' }}>
                        {hasPaid ? <span style={{ color: '#27ae60' }}>Đã TT</span> : <span style={{ color: '#e67e22' }}>Chưa TT</span>}
                        {' - '}
                        {isAllCompleted ? <span style={{ color: '#2980b9' }}>Đủ món</span> : <span style={{ color: '#c0392b' }}>Đang làm</span>}
                      </div>
                    </div>
                    {/* NÚT DỌN BÀN (CHỈ HIỆN KHI ĐỦ MÓN) */}
                    <button
                      className="btn-action btn-cleaning"
                      disabled={!isAllCompleted}
                      onClick={(e) => handleCustomerLeft(e, tableNum, ordersOnTable, isAllCompleted)}
                    >
                      🧹
                    </button>
                  </>
                ) : isCleaning ? (
                  <>
                    <div className="order-info">
                      <div className="price-tag" style={{ color: '#d35400', fontSize: 14 }}>ĐANG DỌN DẸP...</div>
                    </div>
                    {/* NÚT XÁC NHẬN ĐÃ DỌN XONG */}
                    <button className="btn-action btn-done" onClick={(e) => markAsEmpty(e, tableNum)}>✓</button>
                  </>
                ) : (
                  <div className="order-info" style={{ opacity: 0.5 }}>
                    <div className="info-row">Sẵn sàng</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT BÀN - CHỈ THANH TOÁN TIỀN MẶT */}
      {selectedTableId && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Chi tiết Bàn {selectedTableId}</span>
              <button className="btn-close" onClick={closeModal}>✕</button>
            </div>

            <div className="items-scroll">
              {selectedTableOrders.map((order, index) => {
                const items = order.orderDetails || order.orderItems || [];
                return (
                  <div key={order.id || index} style={{ marginBottom: 15 }}>
                    <div style={{
                      background: '#f8f9fa',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#555',
                      border: '1px solid #eee',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Đơn #{order.id} - {parseDate(order.createdAt).toLocaleTimeString()}</span>
                      <span style={{ color: ['COMPLETED', 'PAID', 'READY', 'COOKED'].includes((order.status || '').toUpperCase()) ? '#27ae60' : '#e67e22' }}>
                        {['COMPLETED', 'PAID', 'READY', 'COOKED'].includes((order.status || '').toUpperCase()) ? 'ĐÃ XONG' : 'ĐANG LÀM'}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Không có món nào</div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={idx} className="item-row">
                          <div className="item-info">
                            <div className="item-name">{getDishName(item)}</div>
                            {renderToppings(item)}
                            <div className="item-meta">
                              <span>SL: <b>{item.quantity}</b></span>
                              <span>•</span>
                              <span>{(item.price || 0).toLocaleString()}đ</span>
                            </div>
                          </div>
                          {getItemStatusBadge(item.status, order.status)}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#7f8c8d' }}>Tổng thanh toán:</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#e74c3c' }}>
                  {roundToThousand(totalAmount).toLocaleString()} đ
                </span>
              </div>

              {!isPaid(selectedTableOrders) ? (
                <>
                  {paymentMode === 'NONE' && (
                    <div className="payment-actions">
                      <button className="btn-pay btn-pay-cash" onClick={() => setPaymentMode('CASH')}>
                        Thanh toán tiền mặt
                      </button>
                    </div>
                  )}

                  {paymentMode === 'CASH' && (
                    <div className="cash-input-section">
                      <button style={{ alignSelf: 'flex-end', marginBottom: '10px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }} onClick={() => setPaymentMode('NONE')}>
                        ← Quay lại
                      </button>
                      <input
                        type="text"
                        className="cash-input"
                        placeholder="Nhập tiền khách đưa..."
                        value={customerPaidAmount}
                        onChange={(e) => setCustomerPaidAmount(e.target.value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                      />
                      <div className="change-display">
                        Tiền thối: <strong>{changeAmount >= 0 ? roundToThousand(changeAmount).toLocaleString() : 0} đ</strong>
                      </div>
                      <button
                        className="btn-confirm-cash"
                        onClick={handleCashPayment}
                        disabled={customerPaid < totalAmount}
                      >
                        Xác nhận thanh toán tiền mặt
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '18px',
                  background: '#e8f8f5',
                  borderRadius: '12px',
                  fontSize: '19px',
                  fontWeight: '700',
                  color: '#27ae60',
                  marginTop: '10px',
                  border: '2px solid #27ae60'
                }}>
                  Bàn này đã thanh toán
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableMap;