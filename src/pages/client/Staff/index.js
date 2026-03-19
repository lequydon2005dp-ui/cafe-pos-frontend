import React, { useEffect, useState, useMemo } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://172.20.10.2:8080';

const parseDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (Array.isArray(dateInput)) {
        return new Date(dateInput[0], dateInput[1] - 1, dateInput[2], dateInput[3] || 0, dateInput[4] || 0, dateInput[5] || 0);
    }
    return new Date(dateInput);
};

const formatTime = (dateInput) => {
    const date = parseDate(dateInput);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const isToday = (dateInput) => {
    const date = parseDate(dateInput);
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

const StaffDashboard = () => {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('ACTIVE');
    const [loading, setLoading] = useState(true);

    const [isEditingTable, setIsEditingTable] = useState(false);
    const [tempTableNumber, setTempTableNumber] = useState('');
    const [checkedItems, setCheckedItems] = useState({});

    const getAuthHeaders = () => {
        const token = localStorage.getItem('clientToken') || localStorage.getItem('adminToken');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    };

    useEffect(() => {
        const token = localStorage.getItem('clientToken') || localStorage.getItem('adminToken');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchOrders();

        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const stompClient = Stomp.over(socket);
        stompClient.debug = () => { };

        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/orders', (message) => {
                if (message.body) {
                    const newOrder = JSON.parse(message.body);
                    console.log('Socket received:', newOrder);
                    setOrders(prev => {
                        const exists = prev.find(o => o.id === newOrder.id);
                        if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
                        return [newOrder, ...prev];
                    });
                    if (selectedOrder?.id === newOrder.id) setSelectedOrder(newOrder);
                }
            });
        }, (err) => console.error("Socket Error:", err));

        return () => {
            if (stompClient && stompClient.connected) stompClient.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedOrder?.id) {
            const saved = localStorage.getItem(`checklist_order_${selectedOrder.id}`);
            setCheckedItems(saved ? JSON.parse(saved) : {});
            setTempTableNumber(selectedOrder.tableNumber || '');
            setIsEditingTable(false);
        }
    }, [selectedOrder?.id]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/orders/all`, getAuthHeaders());
            // console.log('API response:', res.data);
            setOrders(res.data.sort((a, b) => b.id - a.id));
        } catch (error) {
            console.error('Lỗi fetch:', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!selectedOrder) return;

        if (newStatus === 'COMPLETED') {
            const items = selectedOrder.orderDetails || [];
            const doneCount = Object.values(checkedItems).filter(Boolean).length;
            if (doneCount < items.length) {
                if (!window.confirm(`⚠️ Mới xong ${doneCount}/${items.length} món. Xác nhận HOÀN THÀNH?`)) return;
            }
        }

        try {
            await axios.put(`${API_BASE_URL}/api/orders/${selectedOrder.id}/status`, null, {
                ...getAuthHeaders(),
                params: { status: newStatus }
            });

            const updatedOrder = { ...selectedOrder, status: newStatus };
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setSelectedOrder(updatedOrder);

            if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
                localStorage.removeItem(`checklist_order_${selectedOrder.id}`);
            }
        } catch (error) {
            alert("Lỗi cập nhật trạng thái!");
        }
    };

    const handleUpdateTable = async () => {
        try {
            const payload = { ...selectedOrder, tableNumber: tempTableNumber };
            await axios.put(`${API_BASE_URL}/api/orders/${selectedOrder.id}`, payload, getAuthHeaders());
            const updated = { ...selectedOrder, tableNumber: tempTableNumber };
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            setSelectedOrder(updated);
            setIsEditingTable(false);
        } catch (e) {
            alert("Lỗi cập nhật bàn!");
        }
    };

    const toggleCheckItem = (idx) => {
        if (selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED') return;
        setCheckedItems(prev => {
            const next = { ...prev, [idx]: !prev[idx] };
            localStorage.setItem(`checklist_order_${selectedOrder.id}`, JSON.stringify(next));
            return next;
        });
    };

    const displayedOrders = useMemo(() => {
        if (activeTab === 'ACTIVE') {
            return orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'CLOSED');
        }
        if (activeTab === 'ALL') {
            return orders.filter(o => {
                const isDone = o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'CLOSED';
                return isDone && isToday(o.createdAt);
            });
        }
        return [];
    }, [orders, activeTab]);

    const getItems = (order) => order.orderDetails || [];

    const countActive = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'CLOSED').length;
    const countHistory = orders.filter(o => (o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'CLOSED') && isToday(o.createdAt)).length;

    const RenderModalItem = ({ item, idx, isOrderCompleted }) => {
        const isItemDone = isOrderCompleted || !!checkedItems[idx];

        return (
            <div
                key={idx}
                onClick={() => toggleCheckItem(idx)}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    border: '1px solid #eee',
                    cursor: isOrderCompleted ? 'default' : 'pointer',
                    opacity: isItemDone ? 0.7 : 1,
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ marginRight: '15px', paddingTop: '2px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isItemDone ? '#2ecc71' : 'white',
                        border: isItemDone ? 'none' : '2px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}>
                        {isItemDone && '✓'}
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{
                            fontWeight: 'bold',
                            fontSize: '16px',
                            color: isItemDone ? '#888' : '#333',
                            textDecoration: isItemDone ? 'line-through' : 'none'
                        }}>
                            {item.productName || 'Tên món'}
                        </span>
                        <span style={{
                            background: '#ffebee',
                            color: '#c62828',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            marginLeft: '10px'
                        }}>
                            x{item.quantity}
                        </span>
                    </div>

                    {item.toppingNames && (
                        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                            + {item.toppingNames}
                        </div>
                    )}

                    {item.note && (
                        <div style={{ marginTop: '5px', fontSize: '13px', color: '#e67e22', fontWeight: '600' }}>
                            📝 Note: {item.note}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
            <div style={{ background: 'white', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={() => navigate('/pos')} style={{ padding: '8px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>&larr; POS</button>
                        <h2 style={{ margin: 0, color: '#2c3e50' }}>KITCHEN DISPLAY</h2>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#555' }}>📅 {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f0f0f0' }}>
                    <TabButton label={`🔥 Đang thực hiện (${countActive})`} isActive={activeTab === 'ACTIVE'} onClick={() => setActiveTab('ACTIVE')} color="#3498db" />
                    <TabButton label={`🕒 Lịch sử hôm nay (${countHistory})`} isActive={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')} color="#27ae60" />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>Đang tải đơn hàng...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                    {displayedOrders.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', padding: '40px' }}>
                            <i>{activeTab === 'ACTIVE' ? "Tuyệt vời! Không còn đơn nào đang chờ." : "Chưa có đơn hàng nào trong lịch sử hôm nay."}</i>
                        </div>
                    ) : (
                        displayedOrders.map(order => {
                            const items = getItems(order);
                            const isDone = order.status === 'COMPLETED' || order.status === 'CANCELLED';
                            return (
                                <div key={order.id} style={{
                                    background: 'white',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    border: '1px solid #eee',
                                    opacity: isDone ? 0.7 : 1,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <div style={{ padding: '12px', background: order.tableNumber ? '#e3f2fd' : '#e8f5e9', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '18px', color: '#333' }}>#{order.id}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{formatTime(order.createdAt)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', color: order.tableNumber ? '#1565c0' : '#2e7d32' }}>
                                                {order.tableNumber ? `Bàn ${order.tableNumber}` : 'Tại Quầy'}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: isDone ? '#27ae60' : '#d35400',
                                                background: isDone ? '#e8f5e9' : '#fce4ec',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                marginTop: '4px',
                                                display: 'inline-block'
                                            }}>
                                                {order.status}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '15px', flex: 1 }}>
                                        {items.length > 0 ? (
                                            items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} style={{ marginBottom: '10px', borderBottom: '1px dashed #eee', paddingBottom: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                                            {item.productName || 'Tên món'}
                                                        </span>
                                                        <span style={{
                                                            background: '#ffebee',
                                                            color: '#c62828',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: 'bold',
                                                            fontSize: '13px'
                                                        }}>
                                                            x{item.quantity}
                                                        </span>
                                                    </div>
                                                    {item.toppingNames && (
                                                        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                                                            + {item.toppingNames}
                                                        </div>
                                                    )}
                                                    {item.note && (
                                                        <div style={{ fontSize: '13px', color: '#e67e22', fontWeight: '600' }}>
                                                            📝 {item.note}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#888' }}>Không có món</div>
                                        )}
                                        {items.length > 4 && (
                                            <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                                                ... và {items.length - 4} món khác
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '10px', background: '#fafafa', borderTop: '1px solid #eee' }}>
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: isDone ? '#95a5a6' : '#3498db',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isDone ? 'XEM LẠI' : 'XỬ LÝ ĐƠN'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {selectedOrder && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backdropFilter: 'blur(2px)'
                    }}
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        style={{
                            background: 'white',
                            width: '600px',
                            maxWidth: '95%',
                            maxHeight: '90vh',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#2c3e50' }}>
                                Đơn #{selectedOrder.id} - {selectedOrder.tableNumber ? `Bàn ${selectedOrder.tableNumber}` : 'Mang về'}
                            </h3>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>&times;</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {getItems(selectedOrder).length > 0 ? (
                                getItems(selectedOrder).map((item, idx) => (
                                    <RenderModalItem
                                        key={idx}
                                        item={item}
                                        idx={idx}
                                        isOrderCompleted={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED'}
                                    />
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Không có món trong đơn này</div>
                            )}
                        </div>

                        <div style={{ padding: '20px', background: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', gap: '15px' }}>
                            <select
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                                value={selectedOrder.status}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                            >
                                <option value="PENDING">🕒 Đang chờ</option>
                                <option value="PREPARING">🔥 Đang chế biến</option>
                                <option value="COMPLETED">✅ Hoàn thành</option>
                                <option value="CANCELLED">❌ Đã hủy</option>
                            </select>
                            <button
                                onClick={() => handleUpdateStatus('COMPLETED')}
                                disabled={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED'}
                                style={{
                                    flex: 2,
                                    background: '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    opacity: (selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED') ? 0.5 : 1
                                }}
                            >
                                HOÀN TẤT ĐƠN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ label, isActive, onClick, color }) => (
    <button
        onClick={onClick}
        style={{
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
            color: isActive ? color : '#777',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '15px',
            transition: 'all 0.2s'
        }}
    >
        {label}
    </button>
);

export default StaffDashboard;