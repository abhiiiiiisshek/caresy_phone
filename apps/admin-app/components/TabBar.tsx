import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../lib/supabase';
import { color, radius, shadow, space, type } from '../lib/theme';
import { Touchable } from './ui';

// A floating bar rather than a docked one: the board behind it keeps scrolling
// under glass-white, and the active tab is the only ink-filled thing on screen,
// which is the same rule the primary button follows.
//
// Labels, not icons: this app has no icon font, and five hand-drawn glyphs
// would be five chances to draw something ambiguous. A word is never ambiguous.

// Structural subset of @react-navigation's BottomTabBarProps — enough to render
// a bar, without taking a type dependency on a transitive package.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const LABELS: Record<string, string> = {
  index: 'Desk',
  live: 'Live',
  alerts: 'Alerts',
  team: 'Team',
  more: 'More',
};

const ORDER = ['index', 'live', 'alerts', 'team', 'more'];

/**
 * Two numbers worth interrupting someone for: requests with nobody on them, and
 * customer messages still waiting to be sent. Both are cheap head+count reads,
 * and both are the reason this is an app rather than a bookmark.
 */
function useTabCounts() {
  const [counts, setCounts] = useState<{ desk: number; alerts: number }>({ desk: 0, alerts: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const head = { count: 'exact' as const, head: true };
      const [unstaffed, queued] = await Promise.all([
        supabase.from('bookings').select('id', head)
          .is('companion_user_id', null)
          .in('status', ['DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED']),
        supabase.from('notifications').select('id', head).eq('status', 'QUEUED'),
      ]);
      if (!alive) return;
      setCounts({ desk: unstaffed.count ?? 0, alerts: queued.count ?? 0 });
    };
    load();
    const timer = setInterval(load, 45_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  return counts;
}

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const counts = useTabCounts();
  const activeName = state.routes[state.index]?.name;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {ORDER.filter((name) => state.routes.some((r) => r.name === name)).map((name) => {
          const active = name === activeName;
          const badge = name === 'index' ? counts.desk : name === 'alerts' ? counts.alerts : 0;
          return (
            <Touchable
              key={name}
              haptic={null}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(name);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={badge > 0 ? `${LABELS[name]}, ${badge} waiting` : LABELS[name]}
              style={[styles.item, active && styles.itemOn]}
            >
              <Text
                style={[type.caption, { color: active ? color.onInk : color.muted, fontWeight: '700' }]}
                numberOfLines={1}
              >
                {LABELS[name]}
              </Text>
              {/* Inline, not floating. The badge used to be absolutely placed
                  at `right: '50%'` with a hand-tuned offset, which sat in a
                  different spot on every label length. In the flow it cannot
                  drift. */}
              {badge > 0 ? (
                <View style={[styles.badge, active && styles.badgeOn]}>
                  <Text style={[styles.badgeText, active && { color: color.ink }]}>
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              ) : null}
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: space.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    padding: 6,
    ...shadow.float,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
  },
  itemOn: { backgroundColor: color.ink },
  badge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: color.critical,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: { backgroundColor: color.onInk },
  badgeText: { color: color.onInk, fontSize: 10, lineHeight: 13, fontWeight: '800' },
});
