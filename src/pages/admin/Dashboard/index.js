import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';

// --- CẤU HÌNH API ---
const API_BASE = 'http://172.20.10.2:8080/api';

// --- STYLES ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

  .dashboard-wrapper {
      max-width: 1500px;
      margin: 0 auto;
      padding: 20px;
      background: #f4f6f8;
      min-height: 100vh;
      font-family: 'DM Sans', sans-serif;
      overflow: hidden; 
      display: flex;
      flex-direction: column;
  }
  
  .main-content {
      flex: 1;
      overflow-y: auto; 
  }

  /* Stats Cards */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
  .stat-card {
      background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s;
  }
  .stat-card:hover { transform: translateY(-5px); }
  .stat-title { font-size: 14px; color: #64748b; margin-bottom: 10px; font-weight: 600; }
  .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
  .stat-icon { font-size: 30px; margin-bottom: 10px; }
  .stat-trend { font-size: 12px; margin-top: 5px; }
  .trend-up { color: #10b981; }

  /* Charts Section */
  .chart-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px; }
  .chart-section { background: white; padding: 18px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); height: 100%; }
  .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
  .chart-title { font-size: 18px; font-weight: 700; color: #334155; margin: 0; }

  /* Filter Buttons */
  .filter-group { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; gap: 4px; }
  .filter-btn {
      border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
      background: transparent; color: #64748b;
  }
  .filter-btn.active { background: white; color: #4e54c8; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

  /* Year Selector */
  .year-select {
      padding: 6px 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px; font-weight: 600; color: #334155; outline: none;
  }

  /* Data Tables */
  .table-container { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .styled-table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .styled-table th { padding: 15px; text-align: left; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
  .styled-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px; }
  
  .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-active { background: #dcfce7; color: #166534; }
  .action-btn { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; margin-right: 5px; }
  .btn-edit { background: #e0f2fe; color: #0369a1; }
  .btn-delete { background: #fee2e2; color: #b91c1c; }

  @media (max-width: 1200px) { .chart-row { grid-template-columns: 1fr; } }
`;

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('TỔNG QUAN');
    const [loading, setLoading] = useState(false);

    // Data States
    const [rawOrders, setRawOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [toppings, setToppings] = useState([]);

    // Stats States
    const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0 });
    const [revenueChartData, setRevenueChartData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Employee Stats State
    const [employeeStats, setEmployeeStats] = useState([]);
    const [employeeFilter, setEmployeeFilter] = useState('HÔM NAY');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    };

    const parseDate = (dateInput) => {
        if (!dateInput) return null;
        if (Array.isArray(dateInput)) {
            return new Date(dateInput[0], dateInput[1] - 1, dateInput[2], dateInput[3] || 0, dateInput[4] || 0);
        }
        return new Date(dateInput);
    };

    const formatCurrency = (val) => val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ';

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [prodRes, catRes, orderRes] = await Promise.all([
                    axios.get(`${API_BASE}/products`, getAuthHeaders()),
                    axios.get(`${API_BASE}/categories`, getAuthHeaders()),
                    axios.get(`${API_BASE}/orders/all`, getAuthHeaders())
                ]);

                setProducts(prodRes.data);
                setCategories(catRes.data);

                const orders = orderRes.data;
                const validOrders = orders.filter(o => ['CLOSED', 'COMPLETED', 'PAID'].includes(o.status));
                setRawOrders(validOrders);

                const totalRev = validOrders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
                setStats({
                    revenue: totalRev,
                    orders: validOrders.length,
                    products: prodRes.data.length
                });

                try {
                    const topRes = await axios.get(`${API_BASE}/toppings`, getAuthHeaders());
                    setToppings(topRes.data);
                } catch (e) { console.warn("Topping API skipped"); }

            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. XỬ LÝ DỮ LIỆU BIỂU ĐỒ DOANH THU ---
    useEffect(() => {
        if (rawOrders.length === 0) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let maxMonthToShow = 11;
        if (selectedYear === currentYear) {
            maxMonthToShow = currentMonth;
        } else if (selectedYear > currentYear) {
            maxMonthToShow = -1;
        }

        const monthlyData = [];

        // --- THÊM ĐIỂM BẮT ĐẦU = 0 ---
        // Để biểu đồ luôn bắt đầu từ 0 và đi lên, ta thêm một điểm dữ liệu giả vào đầu
        monthlyData.push({
            name: '', // Tên rỗng để không hiện chữ ở trục X
            revenue: 0,
            orders: 0
        });

        // Tạo khung dữ liệu cho các tháng
        for (let i = 0; i <= maxMonthToShow; i++) {
            monthlyData.push({
                name: `Tháng ${i + 1}`,
                revenue: 0,
                orders: 0
            });
        }

        // Đổ dữ liệu vào
        rawOrders.forEach(order => {
            const date = parseDate(order.createdAt);
            if (date && date.getFullYear() === selectedYear) {
                const month = date.getMonth();
                if (month <= maxMonthToShow) {
                    // +1 vì index 0 bây giờ là điểm giả (start point)
                    monthlyData[month + 1].revenue += (order.totalAmount || 0);
                    monthlyData[month + 1].orders += 1;
                }
            }
        });

        setRevenueChartData(monthlyData);
    }, [rawOrders, selectedYear]);

    // --- 3. XỬ LÝ TOP NHÂN VIÊN ---
    useEffect(() => {
        if (rawOrders.length === 0) return;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentDay = now.getDate();

        const filteredOrders = rawOrders.filter(order => {
            const date = parseDate(order.createdAt);
            if (!date) return false;

            if (employeeFilter === 'HÔM NAY') {
                return date.getDate() === currentDay && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            } else if (employeeFilter === 'THÁNG NÀY') {
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            } else if (employeeFilter === 'NĂM NAY') {
                return date.getFullYear() === currentYear;
            }
            return false;
        });

        const employeeMap = {};

        filteredOrders.forEach(order => {
            const empName = order.createdByName || "Admin/Khác";
            if (!employeeMap[empName]) {
                employeeMap[empName] = { name: empName, revenue: 0, count: 0 };
            }
            employeeMap[empName].revenue += (order.totalAmount || 0);
            employeeMap[empName].count += 1;
        });

        const result = Object.values(employeeMap).sort((a, b) => b.revenue - a.revenue);
        setEmployeeStats(result);

    }, [rawOrders, employeeFilter]);

    // --- UI COMPONENTS ---
    const OverviewSection = () => (
        <>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div>
                        <div className="stat-title">Doanh Thu Toàn Thời Gian</div>
                        <div className="stat-value" style={{ color: '#4e54c8' }}>{formatCurrency(stats.revenue)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📃</div>
                    <div>
                        <div className="stat-title">Tổng Đơn Hàng</div>
                        <div className="stat-value">{stats.orders}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">☕</div>
                    <div>
                        <div className="stat-title">Tổng Món Ăn</div>
                        <div className="stat-value">{stats.products}</div>
                    </div>
                </div>
            </div>

            <div className="chart-row">
                <div className="chart-section">
                    <div className="chart-header">
                        <h3 className="chart-title">📈 Xu Hướng Doanh Thu</h3>
                        <select
                            className="year-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <option key={year} value={year}>Năm {year}</option>
                            })}
                        </select>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4e54c8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4e54c8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#4e54c8" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-section">
                    <div className="chart-header">
                        <h3 className="chart-title">Top Nhân Viên</h3>
                        <div className="filter-group">
                            <button
                                className={`filter-btn ${employeeFilter === 'HÔM NAY' ? 'active' : ''}`}
                                onClick={() => setEmployeeFilter('HÔM NAY')}
                            >
                                Hôm nay
                            </button>
                            <button
                                className={`filter-btn ${employeeFilter === 'THÁNG NÀY' ? 'active' : ''}`}
                                onClick={() => setEmployeeFilter('THÁNG NÀY')}
                            >
                                Tháng này
                            </button>
                            <button
                                className={`filter-btn ${employeeFilter === 'NĂM NAY' ? 'active' : ''}`}
                                onClick={() => setEmployeeFilter('NĂM NAY')}
                            >
                                Năm nay
                            </button>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 300 }}>
                        {employeeStats.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={employeeStats} layout="vertical" margin={{ left: 0, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        formatter={(value, name) => [
                                            name === 'revenue' ? formatCurrency(value) : value,
                                            name === 'revenue' ? 'Doanh thu' : 'Số đơn'
                                        ]}
                                    />
                                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                                        {employeeStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#4e54c8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
                                Chưa có dữ liệu doanh thu trong khoảng thời gian này
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="dashboard-wrapper">
            <style>{styles}</style>
            <div className="main-content">
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>
                        {activeTab === 'TỔNG QUAN' && 'Tổng Quan Kinh Doanh'}
                    </h2>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['TỔNG QUAN'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: activeTab === tab ? '#4e54c8' : 'white',
                                    color: activeTab === tab ? 'white' : '#64748b',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <div style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>⏳ Đang tải dữ liệu...</div> : (
                    <>
                        {activeTab === 'TỔNG QUAN' && <OverviewSection />}
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;