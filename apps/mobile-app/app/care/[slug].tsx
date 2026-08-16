import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { guideBySlug } from '@caresy/utils/careGuides';
import { Card, EmptyState, Overline, Screen, Txt } from '../../components/ui';
import { color, radius, space } from '../../lib/theme';

export default function CareGuideDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = guideBySlug(slug ?? null);

  if (!guide) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Care guides' }} />
        <EmptyState title="Guide not found" body="It may have been renamed — go back and pick another." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: guide.title }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Card style={s.hero}>
          <View style={s.heroBar} />
          <Txt variant="h1" color={color.greenDeep}>{guide.title}</Txt>
          <Txt variant="caption" color={color.faint}>{guide.minutes} min read</Txt>
        </Card>

        {guide.sections.map((sec, i) => (
          <View key={i} style={s.section}>
            {sec.heading ? <Overline>{sec.heading}</Overline> : null}
            {sec.paragraphs?.map((p, j) => (
              <Txt key={j} variant="body" color={color.ink} style={s.paragraph}>{p}</Txt>
            ))}
            {sec.bullets?.map((b, j) => (
              <View key={j} style={s.bulletRow}>
                <Txt variant="body" color={color.green}>{'•'}</Txt>
                <Txt variant="body" color={color.ink} style={s.bulletText}>{b}</Txt>
              </View>
            ))}
          </View>
        ))}

        <Txt variant="caption" color={color.faint} style={s.disclaimer}>
          General wellbeing guidance, not medical instruction. For anything urgent, call your hospital directly.
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  intro: { gap: space.xs, marginBottom: space.sm },
  hero: { gap: space.xs, overflow: 'hidden' },
  heroBar: { height: 6, marginHorizontal: -space.lg, marginTop: -space.lg, marginBottom: space.sm, backgroundColor: color.green, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  section: { gap: space.sm },
  paragraph: { lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: space.sm, paddingRight: space.md },
  bulletText: { flex: 1, lineHeight: 22 },
  disclaimer: { marginTop: space.md, textAlign: 'center' },
});
