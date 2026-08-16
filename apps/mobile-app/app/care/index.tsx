import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useState } from 'react';
import { Platform } from 'react-native';
import { CARE_GUIDES } from '@caresy/utils/careGuides';
import { Card, Chip, ChipRow, Overline, Screen, Txt } from '../../components/ui';
import { color, radius, space } from '../../lib/theme';

// Curated by need — not a flat list. Audience: older adults, teens, young adults.
const GUIDE_META: Record<string, { cat: string; audience: string; icon: string; tint: string }> = {
  'post-surgery': { cat: 'Urgent', audience: 'Recovery', icon: '✦', tint: color.greenTint },
  'fever-at-home': { cat: 'Urgent', audience: 'Quick help', icon: '◉', tint: color.urgentBg },
  'leaving-hospital': { cat: 'Urgent', audience: 'Recovery', icon: '→', tint: color.greenTint },
  'preventing-falls': { cat: 'Safety', audience: 'Older adults', icon: '▮', tint: '#FFF3E0' },
  'bed-rest-skin': { cat: 'Safety', audience: 'Older adults', icon: '▮', tint: '#FFF3E0' },
  'dementia-day': { cat: 'Daily care', audience: 'Older adults', icon: '☾', tint: '#F3E5F5' },
  'hydration': { cat: 'Daily care', audience: 'Everyone', icon: '◎', tint: '#E0F2F1' },
  'medicines': { cat: 'Daily care', audience: 'Everyone', icon: '✚', tint: '#E8F5E9' },
  'diabetes-feet': { cat: 'Daily care', audience: 'Everyone', icon: '✚', tint: '#E8F5E9' },
  'eating-to-recover': { cat: 'Daily care', audience: 'Everyone', icon: '◎', tint: '#E0F2F1' },
  'sleep-and-breathing': { cat: 'Daily care', audience: 'Everyone', icon: '☾', tint: '#F3E5F5' },
  'blood-pressure-at-home': { cat: 'Daily care', audience: 'Everyone', icon: '♡', tint: '#FFE0E0' },
};

const CATS = ['All', 'Urgent', 'Daily care', 'Safety'] as const;
const AUD = ['All', 'Everyone', 'Older adults'] as const;

export default function CareGuides() {
  const router = useRouter();
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [aud, setAud] = useState<(typeof AUD)[number]>('All');

  const shown = CARE_GUIDES.filter((g) => {
    const m = GUIDE_META[g.slug];
    if (cat !== 'All' && m?.cat !== cat) return false;
    // "Everyone"/"Recovery"/"Quick help" guides are time-critical or general
    // enough to show under any audience tab; only a guide tagged for a specific
    // audience gets excluded when a different audience is selected.
    const exempt = m?.audience === 'Everyone' || m?.audience === 'Recovery' || m?.audience === 'Quick help';
    if (aud !== 'All' && !exempt && m?.audience !== aud) return false;
    return true;
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Care guides' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.intro}>
          <Overline>Care guides</Overline>
          <Txt variant="h1" color={color.greenDeep}>Guides by need</Txt>
          <Txt variant="body" color={color.muted}>
            Not a wall of text — pick what matters right now. Grouped by urgency and who it's for.
          </Txt>
        </View>

        <View style={s.filters}>
          <ChipRow>
            {CATS.map((c) => <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />)}
          </ChipRow>
          <ChipRow>
            {AUD.map((a) => <Chip key={a} label={a} selected={aud === a} onPress={() => setAud(a)} />)}
          </ChipRow>
        </View>

        {shown.map((g) => {
          const m = GUIDE_META[g.slug] || { cat: 'Daily care', audience: 'Everyone', icon: '·', tint: color.card };
          return (
            <Card key={g.slug} onPress={() => router.push({ pathname: '/care/[slug]', params: { slug: g.slug } })} style={[s.card, Platform.OS === 'ios' ? s.cardIos : s.cardAndroid]}>
              <View style={[s.cardAccent, { backgroundColor: m.tint }]} />
              <View style={s.cardTop}>
                <View style={[s.iconBadge, { backgroundColor: m.tint }]}><Txt variant="label" color={color.ink}>{m.icon}</Txt></View>
                <View style={s.cardMeta}>
                  <Txt variant="caption" color={color.faint}>{m.cat} · {m.audience}</Txt>
                  <Txt variant="caption" color={color.faint}>{g.minutes} min</Txt>
                </View>
              </View>
              <Txt variant="title" color={color.ink}>{g.title}</Txt>
              <Txt variant="body" color={color.muted}>{g.summary}</Txt>
            </Card>
          );
        })}
        {shown.length === 0 ? <Txt variant="body" color={color.muted}>No guides match those filters.</Txt> : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  intro: { gap: space.xs, marginBottom: space.sm },
  filters: { gap: space.sm },
  card: { gap: space.sm, overflow: 'hidden' },
  cardAccent: { height: 5, marginHorizontal: -space.lg, marginTop: -space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBadge: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIos: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.92)' },
  cardAndroid: { borderWidth: 1, borderColor: color.line },
});
