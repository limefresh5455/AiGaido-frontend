import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { BASE_URL, TIMEOUT } from '../constants';
import type { ApiResponse } from './types';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Global error handling
    if (error.response?.status === 401) {
      console.error('Unauthorized');
    }
    return Promise.reject(error);
  }
);

export const getRequest = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await api.get<ApiResponse<T>>(url);
    return response.data.data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
};

export default api;
