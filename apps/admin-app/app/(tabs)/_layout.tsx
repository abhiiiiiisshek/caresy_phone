import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';

import { useAuth } from '../../lib/auth';
import { color } from '../../lib/theme';
import { SignIn } from '../../components/SignIn';
import { TabBar } from '../../components/TabBar';

// The whole signed-in app lives under this gate, so a new tab cannot be added
// outside it by accident. The UI gate is a courtesy — every write underneath is
// an admin-guarded RPC or an RLS-protected table.

export default function TabsLayout() {
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }
  if (!session) return <SignIn />;
  if (!isAdmin) return <SignIn notAdmin />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Desk' }} />
      <Tabs.Screen name="live" options={{ title: 'Live' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="team" options={{ title: 'Team' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
});
