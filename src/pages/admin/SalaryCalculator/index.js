import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://172.20.10.2:8080';

const SalaryCalculator = () => {
  const [allMonthlyData, setAllMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Năm hiện tại
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i); // Từ 2020 đến năm sau

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' = cả năm, '01' đến '12' = tháng cụ thể

  // MỨC LƯƠNG
  const HOURLY_RATE = 20000;
  const OVERTIME_RATE = 30000;

  const fetchSalary = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('clientToken') || localStorage.getItem('adminToken');
      if (!token) {
        setError('Bạn chưa đăng nhập! Vui lòng đăng nhập bằng tài khoản ADMIN.');
        setLoading(false);
        return;
      }

      let url;
      if (selectedMonth === 'all') {
        // Gọi nhiều lần cho 12 tháng rồi tổng hợp (vì backend chưa có API cả năm)
        const promises = Array.from({ length: 12 }, (_, i) => {
          const monthStr = String(i + 1).padStart(2, '0');
          return axios.get(
            `${API_BASE_URL}/api/attendance/salary/all-monthly?month=${selectedYear}-${monthStr}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
        });

        const responses = await Promise.all(promises);
        const combined = {};

        responses.forEach(res => {
          const data = res.data;
          for (const [emp, salary] of Object.entries(data)) {
            combined[emp] = (combined[emp] || 0) + salary;
          }
        });

        setAllMonthlyData(combined);
      } else {
        // Chỉ 1 tháng
        url = `${API_BASE_URL}/api/attendance/salary/all-monthly?month=${selectedYear}-${selectedMonth}`;
        const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setAllMonthlyData(response.data);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền xem lương! Chỉ ADMIN mới được truy cập.');
      } else {
        setError('Lỗi kết nối: ' + (err.response?.data || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = allMonthlyData
    ? Object.values(allMonthlyData).reduce((a, b) => a + b, 0)
    : 0;

  const displayTitle = selectedMonth === 'all'
    ? `TỔNG LƯƠNG CẢ NĂM ${selectedYear}`
    : `TỔNG LƯƠNG THÁNG ${selectedMonth}/${selectedYear}`;

  return (
    <div className="salary-container">
      <h1>TÍNH LƯƠNG NHÂN VIÊN</h1>

      <div className="form-group">
        <div className="select-group">
          <label>Chọn năm:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label>Chọn tháng:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="all">Cả năm</option>
            <option value="01">Tháng 1</option>
            <option value="02">Tháng 2</option>
            <option value="03">Tháng 3</option>
            <option value="04">Tháng 4</option>
            <option value="05">Tháng 5</option>
            <option value="06">Tháng 6</option>
            <option value="07">Tháng 7</option>
            <option value="08">Tháng 8</option>
            <option value="09">Tháng 9</option>
            <option value="10">Tháng 10</option>
            <option value="11">Tháng 11</option>
            <option value="12">Tháng 12</option>
          </select>
        </div>

        <button onClick={fetchSalary}>Xem Lương</button>
      </div>

      {loading && <div className="loading">Đang tải dữ liệu lương...</div>}
      {error && <div className="error">{error}</div>}

      {allMonthlyData && Object.keys(allMonthlyData).length > 0 && (
        <div className="summary">
          <h2>{displayTitle}</h2>
          <div className="employee-list">
            {Object.entries(allMonthlyData).map(([emp, salary]) => (
              <div key={emp} className="employee-card">
                <h3>{emp}</h3>
                <p className="amount">{salary.toLocaleString('vi-VN')} đ</p>
              </div>
            ))}
          </div>

          <div className="grand-total">
            <h3>TỔNG QUỸ LƯƠNG</h3>
            <p>{grandTotal.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
      )}

      {allMonthlyData && Object.keys(allMonthlyData).length === 0 && (
        <div className="no-data">
          Không có dữ liệu chấm công trong {selectedMonth === 'all' ? `năm ${selectedYear}` : `tháng ${selectedMonth}/${selectedYear}`}.
        </div>
      )}

      <div className="note">
        Lương giờ thường: {HOURLY_RATE.toLocaleString('vi-VN')} đ/giờ |
        Tăng ca: {OVERTIME_RATE.toLocaleString('vi-VN')} đ/giờ
      </div>

      <style>{`
        .salary-container {
          padding: 30px;
          background: #f4f6f9;
          min-height: 100vh;
          font-family: 'Segoe UI', sans-serif;
        }
        h1 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 40px;
        }
        .form-group {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .select-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .select-group label {
          font-weight: bold;
          color: #34495e;
        }
        .select-group select {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background: white;
        }
        .form-group button {
          padding: 12px 30px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }
        .form-group button:hover {
          background: #2980b9;
        }
        .loading {
          text-align: center;
          font-size: 18px;
          color: #3498db;
          padding: 50px;
        }
        .error {
          text-align: center;
          color: red;
          background: #ffebee;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .no-data {
          text-align: center;
          color: #7f8c8d;
          font-style: italic;
          padding: 40px;
          font-size: 18px;
        }
        .summary {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h2 {
          text-align: center;
          color: #3498db;
          margin-bottom: 30px;
          font-size: 28px;
        }
        .employee-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
        }
        .employee-card {
          background: #e8f8f5;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          border: 3px solid #27ae60;
          box-shadow: 0 6px 15px rgba(39, 174, 96, 0.15);
        }
        .employee-card h3 {
          margin: 0 0 15px 0;
          color: #27ae60;
          font-size: 22px;
        }
        .amount {
          font-size: 30px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0;
        }
        .grand-total {
          margin-top: 50px;
          padding: 35px;
          background: #2c3e50;
          color: white;
          border-radius: 12px;
          text-align: center;
        }
        .grand-total h3 {
          margin: 0 0 15px 0;
          font-size: 24px;
        }
        .grand-total p {
          font-size: 40px;
          font-weight: bold;
          margin: 0;
          color: #f1c40f;
        }
        .note {
          text-align: center;
          margin-top: 50px;
          color: #7f8c8d;
          font-size: 15px;
        }
      `}</style>
    </div>
  );
};

export default SalaryCalculator;