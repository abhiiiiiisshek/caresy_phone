import { StyleSheet, Text, View } from 'react-native';
import { getStatusInfo, type StatusClass } from '@caresy/utils/bookingStatus';
import { color, radius, space, type } from '../lib/theme';

// Semantic status class → pill colors, on the brand palette. One definition,
// used by Home and My Bookings (web maps the same class to CSS tokens).
const PALETTE: Record<StatusClass, { bg: string; fg: string; dot: string }> = {
  pending: { bg: '#FBEFD9', fg: '#7A5312', dot: color.warning },
  review: { bg: color.terracottaSoft, fg: color.terracottaDeep, dot: color.terracotta },
  assigned: { bg: color.successSoft, fg: color.greenDeep, dot: color.success },
  active: { bg: color.successSoft, fg: color.greenDeep, dot: color.success },
  completed: { bg: 'rgba(64,73,69,0.12)', fg: color.muted, dot: color.muted },
};

export function StatusPill({ status }: { status: string }) {
  const info = getStatusInfo(status);
  const c = PALETTE[info.cls];
  return (
    <View style={[s.pill, { backgroundColor: c.bg }]}>
      <View style={[s.dot, { backgroundColor: c.dot }]} />
      <Text style={[type.caption, { color: c.fg, fontWeight: '700' }]}>{info.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
});
