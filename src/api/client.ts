import {storageService} from '../services/storageService';
import {DEV_API_URL, PROD_API_URL} from './config';

const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  response?: {
    status: number;
    data: {
      error?: string;
      [key: string]: any;
    };
  };

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.response = {
      status,
      data: data || { error: message },
    };
  }
}

async function request<T = ApiResponse>(
  method: string,
  path: string,
  body?: any,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  if (__DEV__) {
    console.log(`[CineLink API Client] 📡 Sending ${method} to: ${url}`);
  }
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

    const responseText = await response.text();
    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      if (__DEV__) {
        console.error(
          `[CineLink API Client] 🚨 Failed to parse JSON response. Status: ${response.status}. Raw response:`,
          responseText,
        );
      }
      throw new ApiError(
        `Server error (${response.status}): The server returned an invalid response structure.`,
        response.status,
      );
    }

    if (!response.ok) {
      if (response.status === 401 && !options?.skipAuth) {
        await storageService.clearAll();
      }
      throw new ApiError(data?.error || `API Error ${response.status}`, response.status, data);
    }
    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
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
