import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/AuthProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { color } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.bg },
              headerStyle: { backgroundColor: color.bg },
              headerTintColor: color.greenDeep,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
