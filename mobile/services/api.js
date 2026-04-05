import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach JWT
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('aquaflow_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const base = error.config?.baseURL || '';
    const url = error.config?.url || '';
    const status = error.response?.status || 'NO_STATUS';
    console.warn(`[API ${status}] ${method} ${base}${url}`);

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['aquaflow_token', 'aquaflow_user']);
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updatePushToken: (push_token) => api.put('/auth/push-token', { push_token }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
  dashboard: () => api.get('/users/dashboard'),
};

// ─── Drivers ─────────────────────────────────────────────────────────────────
export const driversAPI = {
  list: (params) => api.get('/drivers', { params }),
  getOne: (id) => api.get(`/drivers/${id}`),
  updateProfile: (data) => api.put('/drivers/profile', data),
  setAvailability: (slots) => api.post('/drivers/availability', { slots }),
  getMyAvailability: () => api.get('/drivers/availability/my'),
};

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  list: (params) => api.get('/bookings', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
  review: (id, data) => api.post(`/bookings/${id}/review`, data),
};

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptionsAPI = {
  create: (data) => api.post('/subscriptions', data),
  list: (params) => api.get('/subscriptions', { params }),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
