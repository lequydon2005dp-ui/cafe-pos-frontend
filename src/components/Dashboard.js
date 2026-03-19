import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

// --- CẤU HÌNH API ---
const API_URL = 'http://172.20.10.2:8080/api';

// --- CẤU HÌNH GIỜ CA (QUAN TRỌNG) ---
// Định nghĩa giờ bắt đầu của từng ca để tính toán
const SHIFT_TIMES = {
    morning: { start: 6, label: 'Ca Sáng (06:00 - 14:00)' },
    afternoon: { start: 14, label: 'Ca Chiều (14:00 - 22:00)' },
    evening: { start: 18, label: 'Ca Tối (18:00 - 24:00)' }
};

// --- CSS STYLES ---
const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

    :root {
        --success-gradient: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        --danger-solid: linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%);
        --warning-gradient: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        --card-bg: rgba(255, 255, 255, 0.95);
        --text-main: #2d3436;
        --text-sub: #636e72;
        --shadow-soft: 0 10px 40px -10px rgba(0,0,0,0.1);
    }

    body { 
        font-family: 'Poppins', sans-serif; 
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        margin: 0; min-height: 100vh; color: var(--text-main);
    }
    
    .dashboard-container {
        display: flex; justify-content: center; align-items: center; 
        min-height: 100vh; padding: 20px; box-sizing: border-box;
    }
    
    .dashboard-card {
        background: var(--card-bg); width: 100%; max-width: 420px; 
        border-radius: 24px; box-shadow: var(--shadow-soft); overflow: hidden; 
        padding: 40px 30px; display: flex; flex-direction: column; gap: 25px;
    }

    /* Header */
    .header-section { text-align: center; }
    .app-title { margin: 0; color: var(--text-sub); font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
    .real-time-clock { 
        font-size: 48px; font-weight: 700; color: #2d3436;
        margin: 5px 0; font-variant-numeric: tabular-nums; line-height: 1.1;
    }
    .date-display { 
        display: inline-block; padding: 6px 16px; background: #f1f2f6; 
        border-radius: 20px; color: var(--text-sub); font-size: 14px; font-weight: 500; 
    }

    /* Shift Display Box */
    .shift-display-box {
        background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 16px;
        padding: 15px; text-align: center;
    }
    .shift-label { font-size: 13px; color: #636e72; font-weight: 600; margin-bottom: 5px; text-transform: uppercase; }
    .shift-value { font-size: 18px; color: #2d3436; font-weight: 700; }
    .shift-status { font-size: 13px; margin-top: 5px; font-weight: 600; }
    
    .status-ok { color: #2ecc71; }
    .status-wait { color: #f1c40f; }
    .status-late { color: #e74c3c; }

    /* Employee Section */
    .employee-badge { text-align: center; padding: 20px 0; border-top: 1px dashed #dfe6e9; border-bottom: 1px dashed #dfe6e9; }
    .avatar-wrapper { position: relative; width: 90px; height: 90px; margin: 0 auto 15px; }
    .avatar-placeholder { 
        width: 100%; height: 100%; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
        color: white; font-size: 40px; font-weight: 600; border-radius: 50%; 
        display: flex; align-items: center; justify-content: center; 
        box-shadow: 0 8px 20px rgba(37, 117, 252, 0.4); border: 4px solid white;
    }
    .status-dot { 
        position: absolute; bottom: 5px; right: 5px; width: 18px; height: 18px; 
        background: #ccc; border-radius: 50%; border: 3px solid white; 
    }
    .status-dot.active { background: #2ecc71; box-shadow: 0 0 10px #2ecc71; }
    .badge-name { margin: 0; color: var(--text-main); font-size: 22px; font-weight: 700; }
    .welcome-text { font-size: 13px; color: var(--text-sub); margin-top: 4px; }

    /* Controls */
    .controls-section { display: flex; flex-direction: column; gap: 15px; }
    .btn-action { 
        width: 100%; padding: 16px; border: none; border-radius: 16px; 
        font-size: 16px; font-weight: 600; cursor: pointer; color: white; 
        transition: all 0.3s; display: flex; align-items: center; justify-content: center; 
        text-transform: uppercase;
    }
    .btn-action:hover:not(:disabled) { transform: translateY(-3px); box-shadow: var(--shadow-soft); }
    .btn-action:active:not(:disabled) { transform: scale(0.98); }
    
    .btn-checkin { background-image: var(--success-gradient); color: #1e3c72; }
    .btn-checkout { background-image: var(--danger-solid); }
    .btn-payroll { background-image: var(--warning-gradient); color: #d35400; }
    
    .btn-disabled { background: #dfe6e9; color: #b2bec3; cursor: not-allowed; box-shadow: none; }

    .message-box { padding: 16px; border-radius: 12px; text-align: center; font-weight: 500; font-size: 14px; margin-top: 10px; }
    .message-box.success { background: #e3f9e5; color: #1e8e3e; }
    .message-box.error { background: #ffebee; color: #d32f2f; }
    .message-box.warning { background: #fff8e1; color: #f57c00; }

    /* Footer */
    .footer-bar { display: flex; gap: 15px; margin-top: 10px; }
    .btn-sub { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-sub); transition: 0.2s; }
    .btn-sub:hover { background: #f1f2f6; color: var(--text-main); }
    
    /* Modal styles omitted for brevity, same as before */
`;

const Dashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const employeeId = location.state?.employeeId || localStorage.getItem('clientId');

    const [employeeName, setEmployeeName] = useState('');
    const [todayShift, setTodayShift] = useState(null); // Lưu thông tin ca hôm nay
    const [attendanceId, setAttendanceId] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // State tính toán trạng thái check-in
    const [checkInStatus, setCheckInStatus] = useState({ allowed: false, text: 'Đang tải...' });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('clientToken');
        if (!token) return {};
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    // 1. ĐỒNG HỒ & TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI NÚT BẤM
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            if (todayShift) {
                updateCheckInStatus(now, todayShift);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [todayShift]);

    // 2. LOAD THÔNG TIN NHÂN VIÊN & LỊCH LÀM VIỆC HÔM NAY
    useEffect(() => {
        const token = localStorage.getItem('clientToken');
        if (!token || !employeeId) { navigate('/login'); return; }

        const fetchData = async () => {
            try {
                // A. Lấy thông tin nhân viên
                const empRes = await axios.get(`${API_URL}/employees/${employeeId}`, getAuthHeaders());
                setEmployeeName(empRes.data.name || 'Nhân viên');

                // B. Lấy danh sách ca làm việc để tìm ca hôm nay
                const shiftRes = await axios.get(`${API_URL}/shifts`, getAuthHeaders());

                // Format ngày hiện tại thành YYYY-MM-DD để so sánh
                const todayStr = new Date().toLocaleDateString('en-CA'); // Trả về YYYY-MM-DD theo múi giờ local

                // Tìm ca của TÔI, vào ngày HÔM NAY và đã được DUYỆT
                const myShift = shiftRes.data.find(s =>
                    String(s.employeeId) === String(employeeId) &&
                    s.date === todayStr &&
                    s.status === 'APPROVED'
                );

                if (myShift) {
                    setTodayShift(myShift);
                    updateCheckInStatus(new Date(), myShift);
                } else {
                    setTodayShift(null);
                    setCheckInStatus({ allowed: false, text: '🚫 Không có lịch làm việc hôm nay' });
                }

            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: 'Lỗi tải dữ liệu!' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Khôi phục check-in
        const savedAttendanceId = localStorage.getItem('activeAttendanceId');
        if (savedAttendanceId) {
            setAttendanceId(savedAttendanceId);
            setMessage({ type: 'success', text: 'ℹ Bạn đang trong ca làm việc.' });
        }
    }, [employeeId, navigate]);

    // 3. HÀM KIỂM TRA LOGIC THỜI GIAN (QUAN TRỌNG)
    const updateCheckInStatus = (now, shiftData) => {
        if (!shiftData) return;

        // Lấy giờ bắt đầu ca từ config (VD: 'morning' -> 6)
        const shiftConfig = SHIFT_TIMES[shiftData.shift];
        if (!shiftConfig) return;

        const startHour = shiftConfig.start;

        // Tạo đối tượng Date cho giờ bắt đầu ca hôm nay
        const startTime = new Date(now);
        startTime.setHours(startHour, 0, 0, 0); // VD: 06:00:00

        // Tính cửa sổ thời gian
        // Sớm nhất: Start - 15p
        const minTime = new Date(startTime.getTime() - 15 * 60000);
        // Trễ nhất: Start + 15p
        const maxTime = new Date(startTime.getTime() + 15 * 60000);

        if (now < minTime) {
            // Chưa đến giờ (VD: 5:30)
            const minutesWait = Math.ceil((minTime - now) / 60000);
            setCheckInStatus({ allowed: false, text: `⏳ Chưa đến giờ (Chờ ${minutesWait}p)` });
        } else if (now > maxTime) {
            // Quá giờ (VD: 6:16) -> Hủy
            setCheckInStatus({ allowed: false, text: '❌ Ca bị hủy (Quá giờ check-in)' });
        } else {
            // Trong khoảng cho phép (5:45 - 6:15)
            setCheckInStatus({ allowed: true, text: '✅ Đang trong thời gian Check-in' });
        }
    };

    // 4. CHECK-IN
    const handleCheckIn = async () => {
        if (!todayShift) return;

        // Kiểm tra lại lần cuối cho chắc chắn
        if (!checkInStatus.allowed) {
            alert(checkInStatus.text);
            return;
        }

        try {
            const cleanShift = todayShift.shift.toUpperCase();
            const res = await axios.post(`${API_URL}/attendance/checkin`, null, {
                ...getAuthHeaders(),
                params: { shift: cleanShift }
            });

            const newAttendanceId = res.data.id;
            setAttendanceId(newAttendanceId);
            localStorage.setItem('activeAttendanceId', newAttendanceId);
            localStorage.setItem('attendanceUser', employeeId);
            setMessage({ type: 'success', text: `Check-in thành công ${SHIFT_TIMES[todayShift.shift].label}!` });
        } catch (error) {
            const msg = error.response?.data || "Lỗi check-in";
            setMessage({ type: 'error', text: msg });
        }
    };

    // 5. CHECK-OUT
    const handleCheckOut = async () => {
        if (!attendanceId || !window.confirm("Kết thúc ca làm việc?")) return;

        try {
            const res = await axios.post(`${API_URL}/attendance/checkout/${attendanceId}`, {}, getAuthHeaders());
            const { hoursWorked, otHours } = res.data;

            setMessage({
                type: 'success',
                text: `Kết ca thành công! Làm: ${hoursWorked}h ${otHours > 0 ? `(OT: ${otHours}h)` : ''}`
            });

            setAttendanceId(null);
            localStorage.removeItem('activeAttendanceId');
            localStorage.removeItem('attendanceUser');
        } catch (err) {
            setMessage({ type: 'error', text: 'Lỗi check-out!' });
        }
    };

    const handleLogout = () => {
        if (window.confirm("Đăng xuất?")) {
            localStorage.clear();
            navigate('/login');
        }
    };

    if (loading) return <div className="dashboard-container"><h2>⏳ Đang tải...</h2></div>;

    return (
        <div className="dashboard-container">
            <style>{styles}</style>

            <div className="dashboard-card">
                {/* Header */}
                <div className="header-section">
                    <h3 className="app-title">Hệ Thống Chấm Công</h3>
                    <div className="real-time-clock">
                        {currentTime.toLocaleTimeString('vi-VN', { hour12: false })}
                    </div>
                    <div className="date-display">
                        {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                </div>

                {/* Employee Info */}
                <div className="employee-badge">
                    <div className="avatar-wrapper">
                        <div className="avatar-placeholder">{employeeName.charAt(0)}</div>
                        <div className={`status-dot ${!!attendanceId ? 'active' : ''}`}></div>
                    </div>
                    <h2 className="badge-name">{employeeName}</h2>
                    <div className="welcome-text">Mã NV: {employeeId}</div>
                </div>

                {/* THÔNG TIN CA LÀM (THAY THẾ DROPDOWN) */}
                <div className="shift-display-box">
                    <div className="shift-label">Ca làm việc hôm nay</div>
                    {todayShift ? (
                        <>
                            <div className="shift-value">
                                {SHIFT_TIMES[todayShift.shift]?.label}
                            </div>
                            {/* Hiển thị trạng thái logic */}
                            <div className={`shift-status ${checkInStatus.allowed ? 'status-ok' : (checkInStatus.text.includes('hủy') ? 'status-late' : 'status-wait')}`}>
                                {checkInStatus.text}
                            </div>
                        </>
                    ) : (
                        <div className="shift-value" style={{ color: '#999', fontSize: 16 }}>
                            🚫 Không có lịch
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="controls-section">
                    <div style={{ display: 'flex', gap: 15 }}>
                        {/* Nút Check In */}
                        <button
                            onClick={handleCheckIn}
                            // Disabled nếu: Đã checkin RỒI, hoặc Không có lịch, hoặc Không đúng giờ
                            disabled={!!attendanceId || !todayShift || !checkInStatus.allowed}
                            className={`btn-action ${!!attendanceId || !todayShift || !checkInStatus.allowed ? 'btn-disabled' : 'btn-checkin'}`}
                        >
                            <span>Vào Ca</span>
                        </button>

                        {/* Nút Check Out */}
                        <button
                            onClick={handleCheckOut}
                            disabled={!attendanceId}
                            className={`btn-action ${!attendanceId ? 'btn-disabled' : 'btn-checkout'}`}
                        >
                            <span>Kết Ca</span>
                        </button>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`message-box ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Footer */}
                <div className="footer-bar">
                    <button className="btn-sub" onClick={() => navigate('/dangkyca')}>
                        Đăng ký ca
                    </button>
                    <button className="btn-sub" onClick={() => navigate('/pos')}>
                        Bán Hàng
                    </button>
                    <button className="btn-sub" onClick={handleLogout} style={{ color: '#e74c3c' }}>
                        Đăng Xuất
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;