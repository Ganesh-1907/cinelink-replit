import {Platform, Alert} from 'react-native';
import api from '../api/client';

let _navigator: any = null;
export const setNavigator = (ref: any) => {
  _navigator = ref;
};

const navigateTo = (screen: string, params?: any) => {
  if (_navigator?.isReady?.()) {
    _navigator.navigate(screen, params);
  }
};

const resolveNavigation = (data: any) => {
  const type = data?.type;
  if (!type) return null;

  if (
    ['contest_entry', 'contest_created', 'new_contest',
     'contest_deadline', 'contest_winner'].includes(type)
  ) {
    if (data.contestId) return {screen: 'ContestDetail', params: {contestId: data.contestId}};
    return {screen: 'Main', params: {screen: 'Contests'}};
  }
  if (type === 'message' && data.chatId) {
    return {screen: 'ChatScreen', params: {chat: {id: data.chatId, participants: []}}};
  }
  if (['casting_request', 'new_casting_request'].includes(type)) {
    return {screen: 'AdminReports', params: undefined};
  }
  if (['casting_approved', 'casting_rejected'].includes(type)) {
    return {screen: 'DirectorDashboard', params: undefined};
  }
  if (['request_accepted', 'request_rejected'].includes(type)) {
    return {screen: 'MyApplications', params: undefined};
  }
  if (['new_audition', 'shortlisted', 'selected', 'rejected', 'application'].includes(type)) {
    if (data.auditionId) return {screen: 'AuditionDetail', params: {auditionId: data.auditionId}};
  }
  if (['new_follower', 'connect_request', 'connect_accepted'].includes(type)) {
    if (data.senderId) return {screen: 'PublicProfile', params: {userId: data.senderId}};
  }
  return null;
};

export const registerBackgroundHandler = () => {
  // No-op: FCM background handler removed (Firebase removed).
  // Background push will be handled natively in android/app & ios/.
};

export const initNotifications = async () => {
  // No-op: FCM messaging removed.
  // Register device token for push via REST API if available
  try {
    // Device token registration should be handled natively
  } catch (e) {
    console.log('Notification init skipped (Firebase removed):', e);
  }
};

export const saveFCMToken = async (token: string) => {
  try {
    await api.put('/users/profile', {fcmToken: token, platform: Platform.OS});
  } catch (e) {
    console.log('FCM token save error:', e);
  }
};
