/**
 * CineLink API Service — uses JWT from AsyncStorage instead of Firebase.
 */
import {storageService} from '../services/storageService';

const API_BASE_URL = __DEV__
  ? 'http://192.168.29.187:3001/api'
  : 'https://cinelink-api.onrender.com/api';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function request<T = ApiResponse>(
  method: string,
  path: string,
  body?: any,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (!options?.skipAuth) {
    const token = await storageService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) return {} as T;
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || `API Error ${response.status}`);
    return data as T;
  } catch (error: any) {
    if (error.message?.includes('Network request failed')) {
      throw new Error('Network error: Unable to connect to server. Check your internet connection.');
    }
    throw error;
  }
}

const api = {
  get: <T = ApiResponse>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T = ApiResponse>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

export default api;
export {API_BASE_URL};
