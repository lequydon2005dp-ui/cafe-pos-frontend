import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../../styles/admin/Shift.css';

import 'moment/locale/vi';
moment.locale('vi');

const localizer = momentLocalizer(moment);
const API_URL = 'http://172.20.10.2:8080/api';

const shiftConfig = {
  morning: { name: 'Ca Sáng', time: '06:00 - 14:00' },
  afternoon: { name: 'Ca Chiều', time: '14:00 - 22:00' },
  evening: { name: 'Ca Tối', time: '18:00 - 24:00' }
};

const ShiftRegistration = () => {
  const navigate = useNavigate();
  const currentEmployeeId = localStorage.getItem('clientId');
  const token = localStorage.getItem('clientToken');

  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');

  const [form, setForm] = useState({
    shift: 'morning',
    date: moment().format('YYYY-MM-DD'),
    note: ''
  });

  const getAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${token}` } });

  useEffect(() => {
    if (!token || !currentEmployeeId) {
      alert("Vui lòng đăng nhập trước!");
      navigate('/login');
      return;
    }
    fetchEmployeeInfo();
    loadShifts();
  }, []);

  const fetchEmployeeInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/employees/${currentEmployeeId}`, getAuthHeaders());
      setEmployeeInfo(res.data);
    } catch (err) { console.error(err); }
  };

  const loadShifts = async () => {
    try {
      const res = await axios.get(`${API_URL}/shifts`, getAuthHeaders());
      const formatted = res.data.map(s => {
        const shiftDate = moment(s.date).toDate();
        let startHour = 6, endHour = 14;
        if (s.shift === 'afternoon') { startHour = 14; endHour = 22; }
        if (s.shift === 'evening') { startHour = 18; endHour = 24; }

        const start = new Date(shiftDate); start.setHours(startHour, 0, 0);
        const end = new Date(shiftDate); end.setHours(endHour, 0, 0);

        // Logic hiển thị tiêu đề dựa trên trạng thái
        let statusIcon = '';
        if (s.status === 'PENDING') statusIcon = '⏳ Chờ duyệt';
        else if (s.status === 'APPROVED') statusIcon = '✅ Đã duyệt';
        else if (s.status === 'REJECTED') statusIcon = '❌ Từ chối';

        const isMe = s.employeeId === currentEmployeeId;
        const title = isMe
          ? `${statusIcon} - ${shiftConfig[s.shift].name}`
          : `🔒 ${s.employeeName}`;

        return {
          id: s.id,
          title: title,
          start: start,
          end: end,
          resource: s
        };
      });
      setEvents(formatted);
    } catch (err) { console.error(err); }
  };

  const handleSelectSlot = (slotInfo) => {
    if (moment(slotInfo.start).isBefore(moment(), 'day')) {
      alert("Không thể đăng ký ngày quá khứ!");
      return;
    }
    setForm({
      shift: 'morning',
      date: moment(slotInfo.start).format('YYYY-MM-DD'),
      note: ''
    });
    setShowModal(true);
  };

  const handleRegister = async () => {
    const isDuplicate = events.some(evt => {
      const isSameDate = moment(evt.start).format('YYYY-MM-DD') === form.date;
      const isSameShift = evt.resource.shift === form.shift;
      const isMe = evt.resource.employeeId === currentEmployeeId;
      // Nếu bị từ chối thì được phép đăng ký lại
      const isNotRejected = evt.resource.status !== 'REJECTED';
      return isSameDate && isSameShift && isMe && isNotRejected;
    });

    if (isDuplicate) {
      alert(`❌ Bạn đã đăng ký ca này rồi (Đang chờ hoặc Đã duyệt)!`);
      return;
    }

    const payload = {
      employeeId: currentEmployeeId,
      employeeName: employeeInfo ? employeeInfo.name : 'Nhân viên',
      date: form.date,
      shift: form.shift,
      note: form.note,
      status: 'PENDING' // <--- QUAN TRỌNG: Mặc định là Chờ duyệt
    };

    try {
      await axios.post(`${API_URL}/shifts`, payload, getAuthHeaders());
      alert("🎉 Đã gửi yêu cầu đăng ký! Vui lòng chờ Admin duyệt.");
      loadShifts();
      setShowModal(false);
    } catch (err) {
      alert("Lỗi đăng ký!");
    }
  };

  // --- STYLE MÀU SẮC THEO TRẠNG THÁI ---
  const eventStyleGetter = (event) => {
    const isMine = event.resource.employeeId === currentEmployeeId;
    const status = event.resource.status || 'APPROVED'; // Mặc định cũ là Approved nếu không có field

    let backgroundColor = '#f5f5f5';
    let borderColor = '#e0e0e0';
    let color = '#9e9e9e';

    if (isMine) {
      if (status === 'PENDING') {
        backgroundColor = '#FFF3E0'; // Cam nhạt
        color = '#E65100';
        borderColor = '#FF9800';
      } else if (status === 'APPROVED') {
        backgroundColor = '#E8F5E9'; // Xanh lá nhạt
        color = '#2E7D32';
        borderColor = '#4CAF50';
      } else if (status === 'REJECTED') {
        backgroundColor = '#FFEBEE'; // Đỏ nhạt
        color = '#C62828';
        borderColor = '#EF5350';
      }
    }

    return {
      style: {
        backgroundColor,
        color,
        borderLeft: `5px solid ${borderColor}`,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        opacity: isMine ? 1 : 0.6
      }
    };
  };

  return (
    <div className="shift-page1" style={{ padding: '20px' }}>
      <header className="page-header1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h1 style={{ color: '#2196F3' }}>✍️ Đăng Ký Ca Làm</h1>
          <button onClick={() => navigate('/pos')} style={{ padding: '10px', background: '#607d8b', color: 'white', border: 'none', borderRadius: 5 }}>Quay lại</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <span style={{ marginRight: 15 }}>📌 Chú thích:</span>
          <span style={{ background: '#FFF3E0', color: '#E65100', padding: '2px 8px', borderRadius: 4, marginRight: 10 }}>⏳ Chờ duyệt</span>
          <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '2px 8px', borderRadius: 4, marginRight: 10 }}>✅ Đã duyệt</span>
          <span style={{ background: '#FFEBEE', color: '#C62828', padding: '2px 8px', borderRadius: 4 }}>❌ Bị từ chối</span>
        </div>
      </header>

      <div className="calendar-card1" style={{ background: 'white', padding: 10, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Calendar
          localizer={localizer}
          events={events}
          date={date} view={view}
          onNavigate={setDate} onView={setView}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(event) => {
            if (event.resource.employeeId === currentEmployeeId) {
              alert(`Thông tin ca:\n- Trạng thái: ${event.resource.status}\n- Ghi chú: ${event.resource.note}`);
            }
          }}
          eventPropGetter={eventStyleGetter}
          defaultView="month"
          style={{ height: 600 }}
        />
      </div>

      {showModal && (
        <div className="modal-overlay1" onClick={() => setShowModal(false)}>
          <div className="modal-content1" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ textAlign: 'center', color: '#2196F3' }}>Đăng Ký Ca</h2>
            <div style={{ marginBottom: 15, textAlign: 'center' }}>Ngày: <strong>{moment(form.date).format('DD/MM/YYYY')}</strong></div>

            <label style={{ display: 'block', marginBottom: 5 }}>Chọn ca:</label>
            <select className="form-select1" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
              {Object.entries(shiftConfig).map(([k, v]) => <option key={k} value={k}>{v.name} ({v.time})</option>)}
            </select>

            <label style={{ display: 'block', marginBottom: 5, marginTop: 10 }}>Ghi chú:</label>
            <input className="form-input1" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="VD: Xin về sớm..." />

            <div className="modal-actions1" style={{ marginTop: 20 }}>
              <button className="btn btn-cancel1" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-save1" onClick={handleRegister}>Gửi yêu cầu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftRegistration;