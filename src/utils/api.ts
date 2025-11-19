import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  } else {
    return `${window.location.protocol}//${window.location.hostname}/api`;
  }
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

export default api;
