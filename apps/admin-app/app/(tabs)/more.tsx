import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/auth';
import { TAB_BAR_SPACE, color, space, type } from '../../lib/theme';
import { Avatar, Btn, Card, Chip, LinkRow, ScreenHeader, SectionTitle } from '../../components/ui';

// Everything the desk needs occasionally. Four tabs carry the work that is
// time-critical; this carries the rest, so the bar never grows a sixth item
// nobody can name.

export default function More() {
  const { session, pushState, enablePush, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const email = session?.user?.email ?? '';
  const name = email.split('@')[0] || 'Ops';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + TAB_BAR_SPACE,
      }}
    >
      <ScreenHeader title="More" />

      <Card style={styles.account}>
        <Avatar text={name.slice(0, 2).toUpperCase()} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={[type.h2, { color: color.ink }]} numberOfLines={1}>{name}</Text>
          <Text style={[type.caption, { color: color.muted }]} numberOfLines={1}>{email}</Text>
        </View>
      </Card>

      <View style={styles.sectionGap}><SectionTitle title="Reports" /></View>
      <View style={{ gap: space.sm }}>
        <LinkRow label="Payments" value="Owed & collected" onPress={() => router.push('/payments')} />
        <LinkRow label="Analytics" value="Demand & supply" onPress={() => router.push('/analytics')} />
      </View>

      <View style={styles.sectionGap}><SectionTitle title="This device" /></View>
      <Card style={styles.block}>
        <View style={styles.pushRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.h2, { color: color.ink }]}>Dispatch alerts</Text>
            <Text style={[type.body, { color: color.muted, marginTop: 2 }]}>
              {pushState === 'on'
                ? 'This phone rings when a new request comes in.'
                : pushState === 'off'
                  ? 'Switched off — new requests arrive only when you open the app.'
                  : 'Unavailable in this build (simulator or Expo Go).'}
            </Text>
          </View>
          {/* A bare em-dash in a pill reads as a rendering fault. When the
              state is not known, say so in a word and drop the status dot. */}
          <Chip
            label={pushState === 'on' ? 'On' : pushState === 'off' ? 'Off' : 'Unavailable'}
            tone={pushState === 'on' ? 'good' : pushState === 'off' ? 'critical' : 'neutral'}
            dot={pushState === 'on' || pushState === 'off'}
          />
        </View>
        {pushState === 'off' ? (
          <Btn label="Turn on alerts" size="sm" onPress={enablePush} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
        ) : null}
      </Card>

      <Btn label="Sign out" tone="ghost" onPress={() => signOut()} full style={{ marginTop: space.xl }} />

      <Text style={[type.caption, { color: color.faint, textAlign: 'center', marginTop: space.lg }]}>
        Service areas, users and timeout settings stay on the admin website.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  block: { padding: space.lg },
  pushRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionGap: { marginTop: space.xl },
});
