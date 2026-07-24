import api from '../api/client';
import {storageService} from './storageService';
import {User, AuthResponse} from '../types';
const BASE = '/auth';

export const authService = {
  async signup(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>(`${BASE}/signup`, {email, password, fullName}, {skipAuth: true});
    await storageService.setToken(res.token);
    await storageService.setUserData(res.user);
    return res;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>(`${BASE}/login`, {email, password}, {skipAuth: true});
    await storageService.setToken(res.token);
    await storageService.setUserData(res.user);
    return res;
  },

  async googleSignIn(idToken: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>(`${BASE}/google`, {idToken}, {skipAuth: true});
    await storageService.setToken(res.token);
    await storageService.setUserData(res.user);
    return res;
  },

  async sendOtp(email: string): Promise<void> {
    await api.post(`${BASE}/send-otp`, {email}, {skipAuth: true});
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>(`${BASE}/verify-otp`, {email, otp}, {skipAuth: true});
    await storageService.setToken(res.token);
    await storageService.setUserData(res.user);
    return res;
  },

  async logout(): Promise<void> {
    await storageService.clearAll();
  },

  async isLoggedIn(): Promise<boolean> {
    return !!(await storageService.getToken());
  },

  async restoreSession(): Promise<{token: string; user: User} | null> {
    const token = await storageService.getToken();
    if (!token) return null;
    try {
      const res = await api.get<{user: User}>('/users/profile');
      if (res.user) {
        await storageService.setUserData(res.user);
        return {token, user: res.user};
      }
      return null;
    } catch (e) {
      await storageService.clearAll();
      return null;
    }
  },

  async fetchProfile(): Promise<User> {
    const res = await api.get<{user: User}>('/users/profile');
    if (res.user) await storageService.setUserData(res.user);
    return res.user;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const res = await api.put<{user: User}>('/users/profile', data);
    if (res.user) await storageService.setUserData(res.user);
    return res.user;
  },
};
