import axios from 'axios';

const clientAxiosClient = axios.create({
  baseURL: 'http://172.20.10.2:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});


export default clientAxiosClient;