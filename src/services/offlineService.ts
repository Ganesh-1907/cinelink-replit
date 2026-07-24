// CineLink Offline Support — uses backend health check

import api from '../api/client';

export function enableOfflinePersistence() {
  // No Firestore needed — app uses REST APIs through MongoDB backend
  console.log('[Offline] No Firestore persistence — using REST APIs');
}

export async function isOnline(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}
