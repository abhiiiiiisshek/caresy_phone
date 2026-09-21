import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { ApprovalStatus } from '@caresy/types';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { initials, pretty, relTime } from '../../lib/dispatch';
import {
  LIVE_JOB_STATUSES, canClearDriving, licenceExpired, statusLabel,
  type CompanionDoc, type CompanionRow,
} from '../../lib/companions';
import { color, radius, shadow, space, type } from '../../lib/theme';
import { Avatar, BackLink, Btn, Card, Chevron, Chip, Row, SectionTitle, Touchable } from '../../components/ui';

// Reviewing one applicant. Every state change writes reviewed_by/reviewed_at,
// and a rejection carries the reason the companion will be shown.
//
// Documents live in the private `companion-docs` bucket and are opened through
// a short-lived signed URL — the file is never copied onto the device.

const DOC_URL_TTL = 600; // seconds

export default function CompanionReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [c, setC] = useState<CompanionRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [docs, setDocs] = useState<(CompanionDoc & { signedUrl?: string })[] | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  // Suspending or rejecting someone mid-visit strands that visit, so the
  // confirmation names the bookings rather than asking "are you sure".
  const [strand, setStrand] = useState<{ status: ApprovalStatus; refs: string; count: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    let stale = false;
    (async () => {
      const { data, error } = await supabase.from('companions').select('*').eq('id', id).single();
      if (stale) return;
      if (error || !data) { setNotFound(true); return; }
      setC(data as CompanionRow);

      const { data: docRows } = await supabase
        .from('companion_documents')
        .select('id, doc_type, file_path, status')
        .eq('companion_id', id);
      const list = (docRows as CompanionDoc[]) ?? [];
      const withUrls = await Promise.all(list.map(async (d) => {
        const { data: signed } = await supabase.storage
          .from('companion-docs').createSignedUrl(d.file_path, DOC_URL_TTL);
        return { ...d, signedUrl: signed?.signedUrl };
      }));
      if (!stale) setDocs(withUrls);
    })();
    return () => { stale = true; };
  }, [id]);

  const applyStatus = useCallback(async (status: ApprovalStatus, rejection?: string) => {
    if (!c) return;
    setBusy(true);
    const patch = {
      approval_status: status,
      rejection_reason: rejection ?? null,
      reviewed_by: session?.user?.id,
      reviewed_at: new Date().toISOString(),
      // Anyone not approved goes offline: an online-but-suspended companion is
      // still visible to the matcher.
      ...(status !== 'APPROVED' ? { is_online: false } : {}),
    };
    const { error } = await supabase.from('companions').update(patch).eq('id', c.id);
    setBusy(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setMessage({ text: error.message, ok: false });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setC({ ...c, ...patch, is_online: status === 'APPROVED' ? c.is_online : false } as CompanionRow);
    setRejecting(false);
    setReason('');
    const verb = status === 'APPROVED'
      ? (c.approval_status === 'SUSPENDED' ? 'reinstated' : 'approved')
      : status === 'REJECTED' ? 'rejected'
      : status === 'SUSPENDED' ? 'suspended' : 'moved back to pending';
    setMessage({ text: `${c.full_name} ${verb}.`, ok: true });
  }, [c, session?.user?.id]);

  const requestStatus = useCallback(async (status: ApprovalStatus, rejection?: string) => {
    if (!c) return;
    if (status === 'SUSPENDED' || status === 'REJECTED') {
      const { data: liveJobs } = await supabase
        .from('bookings')
        .select('id, reference_code, status')
        .eq('companion_user_id', c.id)
        .in('status', LIVE_JOB_STATUSES)
        .is('deleted_at', null)
        .limit(10);
      if (liveJobs && liveJobs.length > 0) {
        const refs = liveJobs
          .map((j: { reference_code: string | null; id: string }) => j.reference_code || j.id.slice(0, 8))
          .join(', ');
        setStrand({ status, refs, count: liveJobs.length });
        return;
      }
    }
    await applyStatus(status, rejection);
  }, [c, applyStatus]);

  if (notFound) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={[type.h1, { color: color.ink }]}>Companion not found</Text>
        <Btn label="Back to team" tone="ghost" onPress={() => router.back()} style={{ marginTop: space.lg }} />
      </View>
    );
  }
  if (!c) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BackLink label="Team" onPress={() => router.back()} />

        <View style={styles.identity}>
          <Avatar text={initials(c.full_name)} size={56} tone={c.approval_status === 'APPROVED' ? 'good' : 'neutral'} />
          <View style={{ flex: 1 }}>
            <Text style={[type.h1, { color: color.ink }]} numberOfLines={2}>{c.full_name}</Text>
            <Text style={[type.body, { color: color.muted }]} numberOfLines={1}>{c.email ?? ''}</Text>
          </View>
        </View>

        <View style={styles.chips}>
          <Chip label={statusLabel(c.approval_status)} tone={c.approval_status === 'APPROVED' ? 'good' : c.approval_status === 'REJECTED' ? 'critical' : 'info'} />
          {c.can_drive ? <Chip label="Cleared to drive" tone="brand" /> : null}
          {c.is_online ? <Chip label="Online" tone="good" dot /> : null}
        </View>

        {c.phone ? (
          <Btn
            label={`Call  ${c.phone}`}
            onPress={() => Linking.openURL(`tel:${c.phone!.replace(/[^\d+]/g, '')}`)}
            full
            style={{ marginTop: space.lg }}
          />
        ) : null}

        <Card style={styles.block}>
          <Row label="Phone" value={c.phone ?? ''} />
          <Row label="Gender" value={c.gender ? pretty(c.gender) : ''} />
          <Row label="Date of birth" value={c.date_of_birth ?? ''} />
          <Row label="Experience" value={c.years_experience != null ? `${c.years_experience} years` : ''} />
          <Row label="Pincodes" value={c.service_pincodes?.join(', ') ?? ''} />
          <Row label="Languages" value={c.languages?.join(', ') ?? ''} />
          <Row label="Specialties" value={c.specialties?.join(', ') ?? ''} />
          <Row label="Applied" value={relTime(c.created_at)} />
        </Card>

        {c.bio ? (
          <Card style={styles.block}>
            <Text style={[type.overline, { color: color.muted }]}>About</Text>
            <Text style={[type.body, { color: color.ink, marginTop: space.sm }]}>{c.bio}</Text>
          </Card>
        ) : null}

        {c.rejection_reason && c.approval_status === 'REJECTED' ? (
          <Card style={[styles.block, { backgroundColor: color.criticalTint }]}>
            <Text style={[type.overline, { color: color.critical }]}>Rejected because</Text>
            <Text style={[type.body, { color: color.ink, marginTop: space.sm }]}>{c.rejection_reason}</Text>
          </Card>
        ) : null}

        <View style={styles.sectionGap}><SectionTitle title="Documents" count={docs?.length} /></View>
        {docs === null ? (
          <ActivityIndicator color={color.ink} />
        ) : docs.length === 0 ? (
          <Card style={styles.block}>
            <Text style={[type.body, { color: color.muted }]}>Nothing uploaded yet.</Text>
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {docs.map((d) => (
              <Touchable
                key={d.id}
                onPress={() => d.signedUrl && Linking.openURL(d.signedUrl)}
                disabled={!d.signedUrl}
                accessibilityRole="button"
                accessibilityLabel={`Open ${d.doc_type}`}
                style={styles.doc}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[type.h2, { color: color.ink }]}>{pretty(d.doc_type)}</Text>
                  <Text style={[type.caption, { color: color.muted }]}>
                    {d.signedUrl ? 'Opens in your browser · link expires in 10 minutes' : 'File unavailable'}
                  </Text>
                </View>
                <Chevron />
              </Touchable>
            ))}
          </View>
        )}

        <View style={styles.sectionGap}><SectionTitle title="Driving licence" /></View>
        <DrivingPanel companion={c} onSaved={(patch) => setC({ ...c, ...patch })} onMessage={setMessage} />

        <View style={styles.sectionGap}><SectionTitle title="Decision" /></View>
        {strand ? (
          <Card style={[styles.block, { backgroundColor: color.warnTint, marginTop: 0 }]}>
            <Text style={[type.h2, { color: color.ink }]}>
              {strand.count} active {strand.count === 1 ? 'visit' : 'visits'} will lose their companion
            </Text>
            <Text style={[type.body, { color: color.inkSoft, marginTop: 4 }]}>
              {c.full_name} is on {strand.refs}. Those visits will have nobody assigned until you re-dispatch them.
            </Text>
            <View style={styles.actions}>
              <Btn
                label={strand.status === 'SUSPENDED' ? 'Suspend anyway' : 'Reject anyway'}
                tone="danger"
                size="sm"
                onPress={() => { const s = strand; setStrand(null); applyStatus(s.status, s.status === 'REJECTED' ? reason.trim() : undefined); }}
                style={styles.grow}
              />
              <Btn label="Cancel" tone="ghost" size="sm" onPress={() => setStrand(null)} style={styles.grow} />
            </View>
          </Card>
        ) : rejecting ? (
          <Card style={[styles.block, { marginTop: 0 }]}>
            <Text style={[type.overline, { color: color.muted }]}>Reason, shared with the companion</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="What was missing or wrong?"
              placeholderTextColor={color.faint}
              multiline
              accessibilityLabel="Reason for rejection"
            />
            <View style={styles.actions}>
              <Btn
                label="Confirm rejection"
                tone="danger"
                size="sm"
                disabled={!reason.trim() || busy}
                onPress={() => requestStatus('REJECTED', reason.trim())}
                style={styles.grow}
              />
              <Btn label="Cancel" tone="ghost" size="sm" onPress={() => setRejecting(false)} style={styles.grow} />
            </View>
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {c.approval_status !== 'APPROVED' ? (
              <Btn
                label={c.approval_status === 'SUSPENDED' ? 'Reinstate' : 'Approve'}
                disabled={busy}
                onPress={() => requestStatus('APPROVED')}
                full
              />
            ) : null}
            {c.approval_status !== 'REJECTED' ? (
              <Btn label="Reject" tone="ghost" disabled={busy} onPress={() => setRejecting(true)} full />
            ) : null}
            {c.approval_status === 'APPROVED' ? (
              <Btn label="Suspend" tone="danger" disabled={busy} onPress={() => requestStatus('SUSPENDED')} full />
            ) : null}
            {c.approval_status === 'REJECTED' ? (
              <Btn label="Move back to pending" tone="ghost" disabled={busy} onPress={() => requestStatus('PENDING_REVIEW')} full />
            ) : null}
          </View>
        )}

        {message ? (
          <Text style={[type.body, { color: message.ok ? color.good : color.critical, marginTop: space.lg }]}>
            {message.text}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Driving verification — the gate that had no door.
 *
 * `companions.can_drive` defaults FALSE and a trigger refuses to assign a
 * CUSTOMER_VEHICLE booking to anyone it is false for. Until this panel existed
 * on the phone, a desk away from a laptop could not clear anyone, and those
 * bookings simply could not be dispatched.
 */
function DrivingPanel({
  companion, onSaved, onMessage,
}: {
  companion: CompanionRow;
  onSaved: (patch: Partial<CompanionRow>) => void;
  onMessage: (m: { text: string; ok: boolean }) => void;
}) {
  const { session } = useAuth();
  const [number, setNumber] = useState(companion.driving_licence_number ?? '');
  const [expiry, setExpiry] = useState(companion.driving_licence_expiry ?? '');
  const [cls, setCls] = useState(companion.driving_licence_class ?? '');
  const [saving, setSaving] = useState(false);

  const expired = licenceExpired(expiry);
  const mayClear = canClearDriving(companion, { number, expiry });

  const write = async (canDrive: boolean) => {
    setSaving(true);
    const patch = {
      driving_licence_number: number.trim() || null,
      driving_licence_expiry: expiry || null,
      driving_licence_class: cls.trim() || null,
      can_drive: canDrive,
      drive_verified_by: canDrive ? session?.user?.id ?? null : null,
      drive_verified_at: canDrive ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('companions').update(patch).eq('id', companion.id);
    setSaving(false);
    if (error) { onMessage({ text: error.message, ok: false }); return; }
    onSaved(patch as Partial<CompanionRow>);
    onMessage({
      text: canDrive ? `${companion.full_name} cleared for driving jobs.` : 'Driving clearance removed.',
      ok: true,
    });
  };

  return (
    <Card style={{ padding: space.lg }}>
      <Text style={[type.body, { color: color.muted }]}>
        Only for bookings where the companion drives the customer&rsquo;s own car. Check the uploaded
        licence against these fields — an invalid licence can void the customer&rsquo;s own-damage claim.
      </Text>

      {companion.can_drive ? (
        <Chip
          label={`Cleared${companion.drive_verified_at ? ` · ${relTime(companion.drive_verified_at)}` : ''}`}
          tone="good"
          dot
          style={{ marginTop: space.md }}
        />
      ) : null}

      <Text style={[type.overline, styles.fieldLabel]}>Licence number</Text>
      <TextInput
        style={styles.input}
        value={number}
        onChangeText={setNumber}
        placeholder="UP16 2019 0001234"
        placeholderTextColor={color.faint}
        autoCapitalize="characters"
        accessibilityLabel="Licence number"
      />

      <Text style={[type.overline, styles.fieldLabel]}>Expiry (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, expired && { borderColor: color.critical }]}
        value={expiry}
        onChangeText={setExpiry}
        placeholder="2030-04-18"
        placeholderTextColor={color.faint}
        inputMode="numeric"
        accessibilityLabel="Licence expiry date"
      />
      {expired ? (
        <Text style={[type.caption, { color: color.critical, marginTop: 4 }]}>
          Expired — the database will refuse the assignment.
        </Text>
      ) : null}

      <Text style={[type.overline, styles.fieldLabel]}>Class</Text>
      <TextInput
        style={styles.input}
        value={cls}
        onChangeText={setCls}
        placeholder="LMV"
        placeholderTextColor={color.faint}
        autoCapitalize="characters"
        accessibilityLabel="Licence class"
      />

      {companion.can_drive ? (
        <Btn label="Remove driving clearance" tone="danger" disabled={saving} onPress={() => write(false)} full style={{ marginTop: space.lg }} />
      ) : (
        <Btn
          label={saving ? 'Saving…' : 'Clear for driving jobs'}
          disabled={saving || !mayClear}
          onPress={() => write(true)}
          full
          style={{ marginTop: space.lg }}
        />
      )}
      {companion.approval_status !== 'APPROVED' && !companion.can_drive ? (
        <Text style={[type.caption, { color: color.muted, marginTop: space.sm }]}>
          Approve the companion first — driving clearance requires an approved account.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  block: { marginTop: space.lg, padding: space.lg },
  sectionGap: { marginTop: space.xl },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.lg,
    minHeight: 64,
    ...shadow.card,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  grow: { flex: 1 },
  fieldLabel: { color: color.muted, marginTop: space.lg },
  input: {
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    marginTop: space.sm,
    color: color.ink,
    fontSize: 16,
    minHeight: 48,
  },
});
