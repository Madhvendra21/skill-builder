import axios from 'axios';

// Use relative path for API calls (works in both development and production)
const API_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
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

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me')
};

// Users API
export const usersAPI = {
  getEmployees: () => api.get('/users/employees'),
  getManagers: () => api.get('/users/managers'),
  getUserById: (id) => api.get(`/users/${id}`),
  addUserSkill: (id, data) => api.post(`/users/${id}/skills`, data),
  removeUserSkill: (id, skillId) => api.delete(`/users/${id}/skills/${skillId}`),
  getEmployeesBySkill: (skillId) => api.get(`/users/skill/${skillId}`)
};

// Skills API
export const skillsAPI = {
  getAll: () => api.get('/skills'),
  getById: (id) => api.get(`/skills/${id}`),
  getByCategory: () => api.get('/skills/categories'),
  create: (data) => api.post('/skills', data),
  update: (id, data) => api.put(`/skills/${id}`, data),
  delete: (id) => api.delete(`/skills/${id}`)
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  assignEmployee: (projectId, employeeId) => 
    api.post(`/projects/${projectId}/assign`, { employee_id: employeeId }),
  removeEmployee: (projectId, employeeId) => 
    api.delete(`/projects/${projectId}/assign/${employeeId}`),
  addSkill: (projectId, data) => api.post(`/projects/${projectId}/skills`, data),
  removeSkill: (projectId, skillId) => 
    api.delete(`/projects/${projectId}/skills/${skillId}`)
};

// Tasks API
export const tasksAPI = {
  getMy: () => api.get('/tasks/my'),
  getStats: () => api.get('/tasks/stats'),
  getById: (id) => api.get(`/tasks/${id}`),
  complete: (id) => api.put(`/tasks/${id}/complete`),
  getByProject: (projectId) => api.get(`/tasks/project/${projectId}`),
  getProjectProgress: (projectId) => api.get(`/tasks/project/${projectId}/progress`)
};

// Skill Gaps API
export const skillGapsAPI = {
  getAll: () => api.get('/skill-gaps'),
  getMy: () => api.get('/skill-gaps/my')
};

// Trainings API
export const trainingsAPI = {
  getAll: () => api.get('/trainings'),
  getBySkill: (skillId) => api.get(`/trainings/skill/${skillId}`),
  create: (data) => api.post('/trainings', data)
};

// Training Progress API
export const trainingProgressAPI = {
  getAll: () => api.get('/training-progress'),
  getMy: () => api.get('/training-progress/my'),
  create: (data) => api.post('/training-progress', data),
  start: (id) => api.put(`/training-progress/${id}/start`),
  complete: (id) => api.put(`/training-progress/${id}/complete`)
};

// Dashboard API
export const dashboardAPI = {
  getEmployeeDashboard: () => api.get('/dashboard/employee'),
  getManagerDashboard: () => api.get('/dashboard/manager')
};

// Notifications API
export const notificationsAPI = {
  getAll: (unreadOnly = false) => 
    api.get(`/notifications?unread_only=${unreadOnly}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

// Database initialization (for development)
export const initDatabase = () => api.post('/init-db');
export const seedDatabase = () => api.post('/seed-db');

export default api;