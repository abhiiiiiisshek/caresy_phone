import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/auth';
import { color } from '../lib/theme';

export default function RootLayout() {
  // Tapping a dispatch alert opens that booking. send-push puts booking_id in
  // the payload for every booking-derived event.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.content.data?.booking_id;
      if (typeof id === 'string' && id) router.push(`/booking/${id}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
            animation: 'slide_from_right',
            animationDuration: 300,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
