import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background message handler BEFORE AppRegistry
// react-native-firebase handles notification display natively.
// This handler is required to prevent "No background message handler set" warnings.
if (Platform.OS === 'android') {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] Background message received:', remoteMessage.messageId);
  });
}

AppRegistry.registerComponent(appName, () => App);
