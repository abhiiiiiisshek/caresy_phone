import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import { Button, Card, ChipRow, Chip, Overline, Screen, Stagger, Txt } from '../components/ui';
import { color, radius, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';
const SUPPORT_TEL = '+919717500225';
const SUPPORT_EMAIL = 'support@caresy.co.in';

const FAQS = [
  { q: 'What does a Caresy companion do?', a: 'Stays with the patient through the whole hospital visit — queues, consultation, paperwork, pharmacy and safe return. Not a medical service, a trusted human companion.', cat: 'Service' },
  { q: 'Which areas do you cover?', a: 'Noida, Greater Noida, Greater Noida West / Noida Extension. Enter pincode at booking — we check live if we serve it. If unsure, chat with us.', cat: 'Coverage' },
  { q: 'How is pricing calculated?', a: 'By companion time on the day, not a flat fee. The booking shows an estimate; final amount is metered and you pay after the visit (cash/UPI). Evening visits add a small surcharge.', cat: 'Pricing' },
  { q: 'Can I book for tomorrow or next week?', a: 'Yes — use “Book a companion” and pick date & slot. For today, use “Need help urgently” for fastest assignment.', cat: 'Booking' },
  { q: 'Will I get live location?', a: 'Yes, once the companion starts the trip. Before that the tracking screen says “Location will be shared when trip starts.” No fake map before start.', cat: 'Tracking' },
  { q: 'How do I cancel or reschedule?', a: 'Open My Bookings → Cancel. Reschedule is coming soon — for now cancel and rebook, or message support and we’ll help.', cat: 'Booking' },
  { q: 'Is my data safe?', a: 'Supabase RLS protects your bookings. We never sell data. Delete account is available via support and will be in-app before store submission.', cat: 'Privacy' },
];

const CATS = ['All', 'Service', 'Booking', 'Pricing', 'Coverage', 'Tracking'] as const;

export default function Support() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [open, setOpen] = useState<string | null>(FAQS[0].q);
  const shown = cat === 'All' ? FAQS : FAQS.filter((f) => f.cat === cat);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Get help' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Stagger index={0} style={s.intro}>
          <Overline>Get help</Overline>
          <Txt variant="h1" color={color.greenDeep}>How can we help?</Txt>
          <Txt variant="body" color={color.muted}>Answers first — WhatsApp only if you need a human.</Txt>
        </Stagger>

        <Stagger index={1}>
          <ChipRow>
            {CATS.map((c) => (
              <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
            ))}
          </ChipRow>
        </Stagger>

        {shown.map((f, i) => {
          const isOpen = open === f.q;
          return (
            <Stagger key={f.q} index={i + 2}>
              <Card onPress={() => setOpen(isOpen ? null : f.q)} style={s.faq}>
                <View style={s.faqHead}>
                  <Txt variant="title" color={color.ink} style={s.flex1}>{f.q}</Txt>
                  <Txt variant="title" color={color.faint}>{isOpen ? '−' : '+'}</Txt>
                </View>
                {isOpen ? <Txt variant="body" color={color.muted}>{f.a}</Txt> : null}
                <View style={s.catBadge}><Txt variant="caption" color={color.faint}>{f.cat}</Txt></View>
              </Card>
            </Stagger>
          );
        })}

        <Stagger index={shown.length + 2}>
          <Card style={s.escalate}>
            <Txt variant="title" color={color.ink}>Still need a human?</Txt>
            <Txt variant="body" color={color.muted}>We reply fastest on WhatsApp, usually in minutes.</Txt>
            <Button title="Chat on WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('Hello Caresy Support, I need help with: ')}`)} style={s.btn} />
            <View style={s.row}>
              <Button title="Call us" variant="secondary" onPress={() => Linking.openURL(`tel:${SUPPORT_TEL}`)} style={s.rowBtn} />
              <Button title="Email" variant="secondary" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={s.rowBtn} />
            </View>
          </Card>
        </Stagger>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  intro: { gap: space.xs },
  flex1: { flex: 1 },
  faq: { gap: space.sm },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  catBadge: { alignSelf: 'flex-start', backgroundColor: color.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  escalate: { gap: space.sm, marginTop: space.md },
  btn: { marginTop: space.xs },
  row: { flexDirection: 'row', gap: space.md },
  rowBtn: { flex: 1 },
});
