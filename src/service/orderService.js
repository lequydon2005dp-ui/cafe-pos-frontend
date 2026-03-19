import axios from "axios";

const API_URL = "http://172.20.10.2:8080/api/orders";

const getAuthToken = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    // Giả định user object có chứa trường 'token'
    return user ? user.token : null;
};

const orderService = {
    /**
     * Lấy danh sách đơn hàng của người dùng hiện tại.
     * Endpoint: GET /api/orders/my-orders
     * Yêu cầu JWT Token trong Header.
     */
    getOrders: () => {
        const token = getAuthToken();
        if (!token) {
            // Nếu không có token, thì trả về lỗi
            throw new Error("User not authenticated.");
        }

        return axios.get(`${API_URL}/my-orders`, {
            headers: {
                // Thêm JWT Token vào Authorization Header
                Authorization: `Bearer ${token}`,
            },
        });
    },
};

export default orderService;