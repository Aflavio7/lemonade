import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Settings API
export const settingsAPI = {
    getAll: () => api.get('/settings'),
    get: (key) => api.get(`/settings/${key}`),
    update: (settings) => api.put('/settings', settings),
    updateOne: (key, value) => api.put(`/settings/${key}`, { value }),
    testImap: (config) => api.post('/settings/test-imap', config)
};

// Logs API
export const logsAPI = {
    getAll: (page = 1, limit = 20) => api.get(`/logs?page=${page}&limit=${limit}`),
    get: (id) => api.get(`/logs/${id}`),
    getStats: () => api.get('/logs/stats/summary'),
    clear: () => api.delete('/logs/clear')
};

// Auth API
export const authAPI = {
    getGoogleAuthUrl: () => api.get('/auth/google'),
    getStatus: () => api.get('/auth/status'),
    disconnect: () => api.post('/auth/disconnect')
};

// Health check
export const healthAPI = {
    check: () => api.get('/health')
};

export default api;
