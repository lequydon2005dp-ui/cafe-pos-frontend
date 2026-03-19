import axiosClient from "../api/axiosClient";

const productService = {
  getAll: () => axiosClient.get("/product"),
  getById: (id) => axiosClient.get(`/product/${id}`),

  // Thêm sản phẩm (FormData)
  create: (formData) =>
    axiosClient.post("/product", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Cập nhật sản phẩm (FormData)
  update: (id, formData) =>
    axiosClient.put(`/product/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id) => axiosClient.delete(`/product/${id}`),


  searchByName: (keyword) =>
    axiosClient.get(`/product/search?keyword=${keyword}`),

  filterByPrice: (min, max) =>
    axiosClient.get(`/product/filter/price?min=${min}&max=${max}`),

  getByCategory: (id) =>
    axiosClient.get(`/product/category/${id}`),
};

export default productService;
