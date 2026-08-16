import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { color, radius, space } from '../lib/theme';

type FamilyMember = {
  id: string;
  full_name: string;
  age: number | null;
  blood_group: string | null;
  allergies: string | null;
  relation: string | null;
};

export default function FamilyScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyMember | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [relation, setRelation] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, age, blood_group, allergies')
      .eq('customer_user_id', session.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50);
    setMembers((data as FamilyMember[]) || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditTarget(null); setFullName(''); setAge(''); setBloodGroup(''); setAllergies(''); setRelation('');
    setShowAdd(true);
  };
  const openEdit = (m: FamilyMember) => {
    setEditTarget(m); setFullName(m.full_name); setAge(m.age != null ? String(m.age) : ''); setBloodGroup(m.blood_group || ''); setAllergies(m.allergies || ''); setRelation(m.relation || '');
    setShowAdd(true);
  };

  const save = async () => {
    if (!session) return;
    if (!fullName.trim()) { Alert.alert('Name required', 'Enter family member name'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase.from('patients').update({
          full_name: fullName.trim(),
          age: age ? Number(age) : null,
          blood_group: bloodGroup.trim() || null,
          allergies: allergies.trim() || null,
        }).eq('id', editTarget.id).eq('customer_user_id', session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('patients').insert({
          customer_user_id: session.user.id,
          full_name: fullName.trim(),
          age: age ? Number(age) : null,
          blood_group: bloodGroup.trim() || null,
          allergies: allergies.trim() || null,
        });
        if (error) throw error;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false); fetch();
    } catch (e: any) { Alert.alert('Could not save', e.message); }
    finally { setSaving(false); }
  };

  const remove = (m: FamilyMember) => {
    Alert.alert('Remove family member?', `${m.full_name} will be hidden from bookings.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('patients').update({ deleted_at: new Date().toISOString() }).eq('id', m.id).eq('customer_user_id', session!.user.id);
        if (error) { Alert.alert('Could not remove', error.message); return; }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); fetch();
      }},
    ]);
  };

  if (loading) return <Screen><Stack.Screen options={{ headerShown: true, title: 'Family' }} /><LoadingState label="Loading family…" /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Family' }} />
      <View style={s.topBar}>
        <Txt variant="body" color={color.muted} style={s.flex1}>Add parents, spouse, children — select them in one tap during booking.</Txt>
        <Button title="+ Add member" onPress={openAdd} style={s.addBtn} />
      </View>

      {showAdd && (
        <Card style={s.formCard}>
          <Overline>{editTarget ? 'Edit member' : 'Add family member'}</Overline>
          <Field label="Full name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Sunita Sharma" />
          <Field label="Age" value={age} onChangeText={setAge} placeholder="e.g. 68" keyboardType="number-pad" />
          <Field label="Blood group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. B+" />
          <Field label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin" />
          <Field label="Relation" value={relation} onChangeText={setRelation} placeholder="e.g. Mother" />
          <View style={s.editRow}>
            <Button title="Cancel" variant="secondary" onPress={() => setShowAdd(false)} style={s.flex1} />
            <Button title={editTarget ? 'Save' : 'Add'} loading={saving} onPress={save} style={s.flex1} />
          </View>
        </Card>
      )}

      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={members.length ? s.list : s.listEmpty}
        ListEmptyComponent={<Card style={s.empty}><Txt variant="body" color={color.muted}>No family members yet. Add one to book in one tap.</Txt></Card>}
        renderItem={({ item }) => (
          <Card style={s.row}>
            <Pressable onPress={() => openEdit(item)} style={s.rowMain}>
              <View style={s.avatar}><Txt variant="title" color={color.onGreen}>{item.full_name.charAt(0).toUpperCase()}</Txt></View>
              <View style={s.flex1}>
                <Txt variant="title" color={color.ink}>{item.full_name}</Txt>
                <Txt variant="caption" color={color.faint}>{[item.age ? `${item.age}y` : null, item.blood_group, item.allergies ? `Allergy: ${item.allergies}` : null].filter(Boolean).join(' · ') || 'Tap to edit'}</Txt>
              </View>
            </Pressable>
            <Pressable onPress={() => remove(item)} hitSlop={12} style={s.removeHit}><Txt variant="caption" color={color.terracotta}>Remove</Txt></Pressable>
          </Card>
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  topBar: { padding: space.lg, gap: space.sm },
  addBtn: { alignSelf: 'flex-start' },
  formCard: { marginHorizontal: space.lg, gap: space.md, marginBottom: space.md },
  editRow: { flexDirection: 'row', gap: space.md },
  list: { padding: space.lg, gap: space.sm },
  listEmpty: { padding: space.lg },
  empty: { alignItems: 'center', padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center' },
  removeHit: { padding: space.sm },
});
