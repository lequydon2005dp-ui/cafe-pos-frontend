// src/services/categoryService.js
import axiosClient from "../api/axiosClient";

const categoryService = {
  // Lấy toàn bộ danh mục
  getAll: () => axiosClient.get("/category"),

  // Lấy danh mục theo ID
  getById: (id) => axiosClient.get(`/category/${id}`),

  // Tạo mới danh mục
  create: (data) => axiosClient.post("/category", data),

  // Cập nhật danh mục
  update: (id, data) => axiosClient.put(`/category/${id}`, data),

  // Xóa danh mục
  delete: (id) => axiosClient.delete(`/category/${id}`),

  // Tìm kiếm danh mục theo tên (nếu backend hỗ trợ)
  searchByName: (keyword) => axiosClient.get(`/category/search?keyword=${keyword}`),
};

export default categoryService;
