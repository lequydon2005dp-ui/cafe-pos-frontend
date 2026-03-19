import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://172.20.10.2:8080/api",
  withCredentials: true,
});
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosClient;
