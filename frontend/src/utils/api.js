import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 413:
          toast.error('File too large. Please choose a smaller file.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          if (error.response.data?.error) {
            toast.error(error.response.data.error);
          }
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (email) => api.post('/api/auth/send-otp', { email }),
  verifyOTP: (email, otp) => api.post('/api/auth/verify-otp', { email, otp }),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
  checkAuth: () => api.get('/api/auth/check'),
};

export const filesAPI = {
  // File operations
  uploadFile: (formData) => api.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  listFiles: (params) => api.get('/api/files/list', { params }),
  
  downloadFile: (fileId, userId) => 
    api.get(`/api/files/download/${fileId}?user_id=${userId}`, {
      responseType: 'blob',
    }),
  
  deleteFile: (fileId, userId, permanent = false) => 
    api.delete(`/api/files/delete/${fileId}?user_id=${userId}&permanent=${permanent}`),
  
  restoreFile: (fileId, userId) => 
    api.post(`/api/files/restore/${fileId}?user_id=${userId}`),
  
  moveFile: (fileId, userId, targetParentId) => 
    api.post('/api/files/move', { file_id: fileId, user_id: userId, target_parent_id: targetParentId }),
  
  renameFile: (fileId, userId, newName) => 
    api.put(`/api/files/rename/${fileId}`, { file_id: fileId, user_id: userId, new_name: newName }),
  
  // Folder operations
  createFolder: (userId, name, parentId = null) => 
    api.post('/api/files/create-folder', { user_id: userId, name, parent_id: parentId }),
  
  // Search
  searchFiles: (userId, query) => 
    api.get('/api/files/search', { params: { user_id: userId, q: query } }),
  
  // Recent files
  getRecentFiles: (userId, limit = 20) => 
    api.get('/api/files/recent', { params: { user_id: userId, limit } }),
};

export default api;