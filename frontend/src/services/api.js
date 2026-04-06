// src/services/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Instancia principal de axios
const api = axios.create({ baseURL: BASE_URL });

// ============================================================
// INTERCEPTORS
// ============================================================

// Request: Agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: Manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// API OBJECTS - Estructura directa sin slug
// ============================================================

/**
 * API de Autenticación
 */
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me')
};

/**
 * API de Configuración
 */
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
  getAll: () => api.get('/config/all')
};

/**
 * API de Productos
 */
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

/**
 * API de Categorías
 */
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

/**
 * API de Ventas
 */
export const salesAPI = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`)
};

/**
 * API de Stock
 */
export const stockAPI = {
  adjust: (data) => api.post('/stock/adjust', data),
  getMovements: () => api.get('/stock/movements')
};

/**
 * API de Cierre Diario
 */
export const cierreAPI = {
  getToday: () => api.get('/cierre/today'),
  close: (data) => api.post('/cierre/close', data),
  getHistory: () => api.get('/cierre/history')
};

/**
 * API de Dashboard
 */
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChart: (params) => api.get('/dashboard/chart', { params }),
  getTopProducts: () => api.get('/dashboard/top-products')
};

/**
 * API de Usuarios
 */
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

/**
 * API de Roles
 */
export const rolesAPI = {
  getAll: () => api.get('/roles')
};

// Exportar instancia principal por si se necesita
export default api;
