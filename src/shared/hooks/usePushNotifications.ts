import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuthStore } from '@/store/AuthStore';

export function usePushNotifications() {
  const { session, profile, updateProfile } = useAuthStore();

  useEffect(() => {
    // Only request a token if a user session exists
    if (!session?.user?.id) return;

    async function registerForPushNotificationsAsync() {
      // 1. Simulators can't handle physical push configurations
      if (!Device.isDevice) {
        console.log('[PushNotifications] Must use physical device for Push Notifications');
        return;
      }

      // 2. Configure default channel behaviors for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // 3. Request permissions from the OS
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[PushNotifications] Failed to get push token for push notification!');
        return;
      }

      // 4. Fetch the unique Expo Push Token bound to your project
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: undefined // Expo Router automatically reads your projectId from app.json/eas.json
        });
        
        const token = tokenData.data;

        // 5. If the current stored database token doesn't match, sync it up!
        if (profile && profile.expo_push_token !== token) {
          console.log('[PushNotifications] Syncing new token to database profile:', token);
          await updateProfile({ expo_push_token: token });
        }
      } catch (error) {
        console.error('[PushNotifications] Error fetching Expo Push Token:', error);
      }
    }

    registerForPushNotificationsAsync();
  }, [session?.user?.id, profile?.id]);
}
