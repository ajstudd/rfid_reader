import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rfid_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rfid_token');
      localStorage.removeItem('rfid_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: { name: string; email: string; role?: string; cardUID?: string }) =>
    api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Cards
export const cardsAPI = {
  register: (uid: string, userId: string) =>
    api.post('/cards/register', { uid, userId }),
  unregister: (userId: string) =>
    api.delete(`/cards/unregister/${userId}`),
};

// Access Logs
export const logsAPI = {
  getAll: (params?: { page?: number; limit?: number; uid?: string; status?: string }) =>
    api.get('/logs', { params }),
  getStats: () => api.get('/logs/stats'),
};

// Devices
export const devicesAPI = {
  getAll: () => api.get('/devices'),
  update: (id: string, data: { name?: string; location?: string }) =>
    api.put(`/devices/${id}`, data),
};

export default api;
