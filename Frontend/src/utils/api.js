import axios from 'axios';

// const API_URL = import.meta.env.VITE_API_URL || 'https://constuctionbackend-production.up.railway.app/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://construction-production-b18f.up.railway.app/api';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const BASE_URL = API_URL.replace('/api', '');

const api = axios.create({
    baseURL: API_URL,
});

// Add interceptor to include JWT token in requests
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const getServerUrl = (path) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
    }
    let clean = path.replace(/\\/g, '/');
    if (clean.includes('uploads/')) {
        clean = '/uploads/' + clean.split('uploads/')[1];
    }
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

export default api;
