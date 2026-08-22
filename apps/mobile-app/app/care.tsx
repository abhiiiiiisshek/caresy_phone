import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Card, Screen, Txt, Overline } from '../components/ui';
import { color, space, radius } from '../lib/theme';

const GUIDES = [
  { title: 'Before the visit', body: 'Keep ID, previous prescriptions, and insurance card in one folder. Note current medicines and allergies to share with the companion.' },
  { title: 'At the hospital', body: 'Your companion handles queues, paperwork and pharmacy runs. For medical decisions, the doctor speaks to you or your family — the companion facilitates, never decides.' },
  { title: 'After the visit', body: 'Check medicines, follow-up date and discharge summary before leaving. Your companion helps verify nothing is missed.' },
  { title: 'Medicine pickup', body: 'Share the prescription photo via chat. Companion collects and delivers, with a bill for reimbursement.' },
  { title: 'When we bill', body: '₹299 for the first hour, then ₹4/min. A full day is ₹1,599 (whichever is less). The companion taps Complete & bill when the visit ends — you pay the final metered amount.' },
  { title: 'Need help?', body: 'WhatsApp us any time. We respond faster there than on calls during a visit.' },
];

export default function Care() {
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Care guides' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Overline>Know what to expect</Overline>
        <Txt variant="h1" color={color.greenDeep}>Care guides</Txt>
        <Txt variant="body" color={color.muted}>Short, practical guides for hospital companionship — what to prepare and how it works.</Txt>

        {GUIDES.map((g) => (
          <Card key={g.title} style={s.card}>
            <Txt variant="title" color={color.ink}>{g.title}</Txt>
            <Txt variant="body" color={color.muted}>{g.body}</Txt>
          </Card>
        ))}

        <View style={s.foot}>
          <Txt variant="caption" color={color.faint}>Source: Caresy service guide · learn more at </Txt>
          <Txt variant="label" color={color.greenDeep} onPress={() => Linking.openURL('https://caresy.co.in/care')}>caresy.co.in/care</Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  card: { gap: space.sm },
  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: space.md, gap: 4 },
});
