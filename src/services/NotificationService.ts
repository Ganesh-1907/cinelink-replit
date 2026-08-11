import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
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
    if (data.contestId) return { screen: 'ContestDetail', params: { contestId: data.contestId } };
    return { screen: 'Main', params: { screen: 'Contests' } };
  }
  if (type === 'message' && data.chatId) {
    return { screen: 'ChatScreen', params: { chat: { id: data.chatId, participants: [] } } };
  }
  if (['casting_request', 'new_casting_request'].includes(type)) {
    return { screen: 'AdminReports', params: undefined };
  }
  if (['casting_approved', 'casting_rejected'].includes(type)) {
    return { screen: 'MyAuditions', params: undefined };
  }
  if (['request_accepted', 'request_rejected'].includes(type)) {
    return { screen: 'MyApplications', params: undefined };
  }
  if (['new_audition', 'shortlisted', 'selected', 'rejected', 'application'].includes(type)) {
    if (data.auditionId) return { screen: 'AuditionDetail', params: { auditionId: data.auditionId } };
  }
  if (['new_follower', 'connect_request', 'connect_accepted'].includes(type)) {
    if (data.senderId) return { screen: 'PublicProfile', params: { userId: data.senderId } };
  }
  if (['project_invite', 'project_apply', 'project_accepted', 'project_rejected'].includes(type)) {
    if (data.projectId) return { screen: 'ProjectDetail', params: { projectId: data.projectId } };
  }
  if (['comment', 'like'].includes(type)) {
    if (data.auditionId) return { screen: 'AuditionDetail', params: { auditionId: data.auditionId } };
  }
  if (type === 'reel_like') {
    return { screen: 'ReelsScreen', params: undefined };
  }
  return null;
};

const handleNotificationTap = (remoteMessage: any) => {
  const data = remoteMessage?.data || {};
  const route = resolveNavigation(data);
  if (route) {
    // Small delay to ensure navigator is ready
    setTimeout(() => navigateTo(route.screen, route.params), 500);
  }
};

export async function requestUserPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      'android.permission.POST_NOTIFICATIONS' as any,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('[FCM] Notification permission denied');
    return false;
  }

  return true;
}

export async function getAndSaveFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    if (token) {
      await saveFCMToken(token);
      return token;
    }
  } catch (e) {
    console.log('[FCM] getToken error:', e);
  }
  return null;
}

export const saveFCMToken = async (token: string) => {
  try {
    await api.put('/users/profile', { fcmToken: token, platform: Platform.OS });
    console.log('[FCM] Token saved:', token.slice(0, 12) + '...');
  } catch (e) {
    console.log('[FCM] Token save error:', e);
  }
};

export const registerForegroundHandler = () => {
  return messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (notification?.title && notification?.body) {
      // Let the OS notification channel handle display on Android,
      // but on iOS we show an alert since there's no system banner in foreground
      if (Platform.OS === 'ios') {
        Alert.alert(
          notification.title,
          notification.body,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View',
              onPress: () => handleNotificationTap(remoteMessage),
            },
          ],
        );
      }
    }
  });
};

export const registerBackgroundHandler = () => {
  // Called when app is in background (not quit)
  messaging().onNotificationOpenedApp((remoteMessage) => {
    handleNotificationTap(remoteMessage);
  });

  // Called when app was quit and user taps notification to open
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        handleNotificationTap(remoteMessage);
      }
    });

  // Handle FCM token refresh
  messaging().onTokenRefresh((token) => {
    console.log('[FCM] Token refreshed');
    saveFCMToken(token);
  });
};

export const initNotifications = async () => {
  try {
    const permitted = await requestUserPermission();
    if (!permitted) return;

    registerBackgroundHandler();

    // iOS: register for remote notification APNs token
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    await getAndSaveFCMToken();
  } catch (e) {
    console.log('[FCM] initNotifications error:', e);
  }
};
