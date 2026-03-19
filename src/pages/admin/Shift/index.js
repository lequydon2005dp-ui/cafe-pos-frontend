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

function ShiftPages() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');

  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    shift: 'morning',
    date: moment().format('YYYY-MM-DD'),
    note: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return {};
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  useEffect(() => {
    loadEmployees();
    loadShifts();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/employees`, getAuthHeaders());
      setEmployees(res.data);
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

        // Icon trạng thái cho Admin dễ nhìn
        let prefix = '';
        if (s.status === 'PENDING') prefix = '⏳ ';
        else if (s.status === 'REJECTED') prefix = '❌ ';

        return {
          id: s.id,
          title: `${prefix}${s.employeeName} (${shiftConfig[s.shift].name})`,
          start: start,
          end: end,
          resource: s
        };
      });
      setEvents(formatted);
    } catch (err) { console.error(err); }
  };

  // --- XỬ LÝ DUYỆT / TỪ CHỐI ---
  const handleApprove = async () => {
    if (!selectedEvent) return;
    try {
      const updatedShift = { ...selectedEvent.resource, status: 'APPROVED' };
      await axios.put(`${API_URL}/shifts/${selectedEvent.resource.id}`, updatedShift, getAuthHeaders());
      alert("✅ Đã duyệt ca làm!");
      loadShifts();
      setShowModal(false);
    } catch (err) { alert("Lỗi khi duyệt!"); }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("Từ chối đăng ký này?")) return;
    try {
      const updatedShift = { ...selectedEvent.resource, status: 'REJECTED' };
      await axios.put(`${API_URL}/shifts/${selectedEvent.resource.id}`, updatedShift, getAuthHeaders());
      alert("Đã từ chối!");
      loadShifts();
      setShowModal(false);
    } catch (err) { alert("Lỗi khi từ chối!"); }
  };

  const saveShift = async () => {
    if (!form.employeeId) { alert("Chọn nhân viên!"); return; }

    const payload = {
      employeeId: form.employeeId,
      employeeName: employees.find(e => e.id === form.employeeId)?.name || form.employeeName,
      date: form.date,
      shift: form.shift,
      note: form.note,
      // Nếu Admin tự tạo -> Mặc định là APPROVED
      status: selectedEvent ? selectedEvent.resource.status : 'APPROVED'
    };

    try {
      if (selectedEvent) {
        await axios.put(`${API_URL}/shifts/${selectedEvent.resource.id}`, payload, getAuthHeaders());
        alert("Cập nhật thành công!");
      } else {
        await axios.post(`${API_URL}/shifts`, payload, getAuthHeaders());
        alert("Thêm lịch (Đã duyệt) thành công!");
      }
      loadShifts();
      setShowModal(false);
    } catch (err) { alert("Lỗi lưu dữ liệu"); }
  };

  const deleteShift = async () => {
    if (!selectedEvent || !window.confirm("Xóa ca này?")) return;
    try {
      await axios.delete(`${API_URL}/shifts/${selectedEvent.resource.id}`, getAuthHeaders());
      loadShifts();
      setShowModal(false);
    } catch (err) { console.error(err); }
  };

  // Màu sắc sự kiện phía Admin
  const eventStyleGetter = (event) => {
    const status = event.resource.status;
    let bgColor = '#E3F2FD'; // Mặc định xanh dương nhạt
    let borderColor = '#2196F3';

    if (status === 'PENDING') {
      bgColor = '#FFF3E0'; // Cam - Cần chú ý
      borderColor = '#FF9800';
    } else if (status === 'REJECTED') {
      bgColor = '#FFEBEE'; // Đỏ - Đã hủy
      borderColor = '#EF5350';
    } else if (status === 'APPROVED') {
      bgColor = '#E8F5E9'; // Xanh lá - OK
      borderColor = '#4CAF50';
    }

    return {
      style: {
        backgroundColor: bgColor,
        borderLeft: `5px solid ${borderColor}`,
        color: '#333',
        fontSize: '13px',
        fontWeight: 'bold',
        borderRadius: '4px'
      }
    };
  };

  const openModal = (slotInfo = null, event = null) => {
    if (event) {
      setSelectedEvent(event);
      setForm({
        employeeId: event.resource.employeeId,
        employeeName: event.resource.employeeName,
        shift: event.resource.shift,
        date: moment(event.start).format('YYYY-MM-DD'),
        note: event.resource.note || ''
      });
    } else if (slotInfo) {
      setSelectedEvent(null);
      setForm({
        employeeId: '',
        employeeName: '',
        shift: 'morning',
        date: moment(slotInfo.start).format('YYYY-MM-DD'),
        note: ''
      });
    }
    setShowModal(true);
  };

  return (
    <div className="shift-page1">
      <header className="page-header1">
        <h1 className="page-title1">📅 Quản Lý Ca Làm Việc</h1>
        <div style={{ fontSize: 14, marginTop: 5 }}>
          <span style={{ marginRight: 10 }}>🔴: Từ chối</span>
          <span style={{ marginRight: 10 }}>🟠: Chờ duyệt (Cần xử lý)</span>
          <span>🟢: Đã duyệt</span>
        </div>
      </header>

      <div className="calendar-container1">
        <div className="calendar-card1">
          <Calendar
            localizer={localizer}
            events={events}
            date={date} view={view}
            onNavigate={setDate} onView={setView}
            selectable
            onSelectSlot={(slot) => openModal(slot)}
            onSelectEvent={(event) => openModal(null, event)}
            eventPropGetter={eventStyleGetter}
            defaultView="month"
          />
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay1" onClick={() => setShowModal(false)}>
          <div className="modal-content1" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title1">
              {selectedEvent ? (selectedEvent.resource.status === 'PENDING' ? 'Duyệt Ca Làm' : 'Sửa Ca Làm') : 'Thêm Ca Mới'}
            </h2>

            {selectedEvent && selectedEvent.resource.status === 'PENDING' && (
              <div style={{ background: '#FFF3E0', padding: 10, borderRadius: 5, marginBottom: 15, border: '1px solid #FFB74D', color: '#E65100' }}>
                <strong>Chờ duyệt!</strong><br />
                Ghi chú của NV: {form.note || "Không có"}
              </div>
            )}

            <div className="form-group1">
              <label className="form-label1">Nhân Viên</label>
              {selectedEvent ? (
                <div style={{ padding: '12px', background: '#f9f9f9', border: '1px solid #ccc', borderRadius: '6px', fontWeight: '500' }}>
                  {form.employeeName || 'Không có thông tin'}
                </div>
              ) : (
                <select
                  className="form-select1"
                  value={form.employeeId}
                  onChange={(e) => {
                    const emp = employees.find(x => x.id == e.target.value);
                    setForm({
                      ...form,
                      employeeId: e.target.value,
                      employeeName: emp?.name || ''
                    });
                  }}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group1">
              <label className="form-label1">Ngày & Ca</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <select className="form-select1" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                  {Object.entries(shiftConfig).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group1">
              <label className="form-label1">Ghi chú</label>
              <input className="form-input1" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>

            <div className="modal-actions1" style={{ justifyContent: 'space-between', marginTop: 20 }}>
              {selectedEvent && selectedEvent.resource.status === 'PENDING' ? (
                <>
                  <button className="btn" style={{ background: '#EF5350', color: 'white' }} onClick={handleReject}>❌ Từ chối</button>
                  <button className="btn" style={{ background: '#4CAF50', color: 'white' }} onClick={handleApprove}>✅ Duyệt</button>
                </>
              ) : (
                <>
                  {selectedEvent && <button className="btn btn-delete1" onClick={deleteShift}>Xóa</button>}
                  <button className="btn btn-save1" onClick={saveShift}>Lưu</button>
                </>
              )}
              <button className="btn btn-cancel1" onClick={() => setShowModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftPages;