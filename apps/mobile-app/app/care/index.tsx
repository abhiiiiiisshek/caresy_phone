import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { CARE_GUIDES } from '@caresy/utils/careGuides';
import { Card, Overline, Screen, Txt } from '../../components/ui';
import { color, space } from '../../lib/theme';

// Static editorial content, shared with apps/website/src/app/guides — see
// packages/utils/src/careGuides.ts. No Supabase read, no auth required.
export default function CareGuides() {
  const router = useRouter();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Care guides' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.intro}>
          <Overline>Care guides</Overline>
          <Txt variant="body" color={color.muted}>
            Short, practical reads for looking after someone at home — not medical advice.
          </Txt>
        </View>

        {CARE_GUIDES.map((g) => (
          <Card key={g.slug} onPress={() => router.push({ pathname: '/care/[slug]', params: { slug: g.slug } })} style={s.card}>
            <Txt variant="title" color={color.ink}>{g.title}</Txt>
            <Txt variant="body" color={color.muted}>{g.summary}</Txt>
            <Txt variant="caption" color={color.faint}>{g.minutes} min read</Txt>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  intro: { gap: space.xs, marginBottom: space.sm },
  card: { gap: 4 },
});
