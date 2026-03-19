import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- LAYOUTS ---
import AdminLayout from './layout/AdminLayout';

// --- PAGES / COMPONENTS ---
import Login from './components/Login'; // Login Nhân viên
import AdminLogin from './components/Admin/AdminLogin'; // Login Admin

// --- ADMIN PAGES ---
import Dashboard1 from './pages/admin/Dashboard';
import ProductPage from './pages/admin/Products';
import CategoryPage from './pages/admin/Category';
import QrGenerator from './pages/admin/Qr';
import AdminOrdersPage from './pages/admin/Orders';
import ShiftPages from './pages/admin/Shift';
import EmployeePage from './pages/admin/Employee';
import ToppingManagement from './pages/admin/Toppings';
import SizeManagement from './pages/admin/Size';
import DiscountAdmin from './pages/admin/Discount';
import SalaryCalculator from './pages/admin/SalaryCalculator';
import CustomerPointsTable from './pages/admin/Points';

// --- CLIENT / STAFF PAGES ---
import CustomerOrder from './pages/client/Menu';
import StaffDashboard from './pages/client/Staff'; // Trang Bếp (Kitchen)
import OrderPage from './pages/client/Order';
import CashierPOS from './pages/client/CashierPOS';
import Dashboard from './components/Dashboard'; // Dashboard Chấm công của nhân viên
import ShiftRegistration from './pages/client/Shift';
import TableMap from './components/staff/TableMap';

// =========================================================
// 1. COMPONENT BẢO VỆ ADMIN (AdminRoute)
// =========================================================
const AdminRoute = ({ children }) => {
  const isAuth = localStorage.getItem('adminIsLoggedIn') === 'true';
  const role = localStorage.getItem('adminRole');

  if (!isAuth || role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

// =========================================================
// 2. COMPONENT BẢO VỆ NHÂN VIÊN (StaffRoute)
// =========================================================
const StaffRoute = ({ children }) => {
  const isAuth = localStorage.getItem('clientIsLoggedIn') === 'true';

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>

          {/* ==============================
              1. PUBLIC ROUTES (Khách hàng)
             ============================== */}
          <Route path="/" element={<CustomerOrder />} />
          <Route path="/orders" element={<OrderPage />} />

          {/* Trang Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ==============================
              2. KHU VỰC NHÂN VIÊN (STAFF)
              (Tất cả các trang nghiệp vụ nên được bảo vệ)
             ============================== */}

          {/* Màn hình Thu ngân (POS) */}
          <Route path="/pos" element={
            <StaffRoute>
              <CashierPOS />
            </StaffRoute>
          } />

          {/* Màn hình Bếp (Pha chế) */}
          <Route path="/staff" element={
            <StaffRoute>
              <StaffDashboard />
            </StaffRoute>
          } />

          {/* Sơ đồ bàn */}
          <Route path="/tables" element={
            <StaffRoute>
              <TableMap />
            </StaffRoute>
          } />

          {/* Quản lý ca làm việc (Chấm công) */}
          <Route path="/quanlyca" element={
            <StaffRoute>
              <Dashboard />
            </StaffRoute>
          } />

          {/* Đăng ký ca */}
          <Route path="/dangkyca" element={
            <StaffRoute>
              <ShiftRegistration />
            </StaffRoute>
          } />


          {/* ==============================
              3. KHU VỰC QUẢN TRỊ (ADMIN) 
             ============================== */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<Dashboard1 />} />
            <Route path="dashboard" element={<Dashboard1 />} />
            <Route path="products" element={<ProductPage />} />
            <Route path="category" element={<CategoryPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="qr" element={<QrGenerator />} />
            <Route path="shift" element={<ShiftPages />} />
            <Route path="employee" element={<EmployeePage />} />
            <Route path="toppings" element={<ToppingManagement />} />
            <Route path="sizes" element={<SizeManagement />} />
            <Route path="discounts" element={<DiscountAdmin />} />
            <Route path="salary" element={<SalaryCalculator />} />
            <Route path="points" element={<CustomerPointsTable />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<div style={{ padding: 50, textAlign: 'center' }}><h1>404 - Không tìm thấy trang</h1></div>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;