File: /Users/1234/Desktop/Caresy phone/caresy_m3_worktree/apps/mobile-app/app/account-delete.tsx

Two mechanical changes only. Do NOT touch any other line or file.

## 1. Add the import
Line 6 currently:
import { Button, Card, Field, Screen, Txt } from '../components/ui';

Change to:
import { Button, Card, Field, Screen, Stagger, Txt } from '../components/ui';

## 2. Wrap the confirm-form body in Stagger
Line 77-86 currently:
      <View style={s.body}>
        <Card style={s.warn}>
          <Txt variant="title" color={color.terracottaDeep}>This is permanent</Txt>
          <Txt variant="body" color={color.muted}>Deleting {session.user.email} removes profile, patients, saved locations, bookings and care logs. Cannot be undone.</Txt>
        </Card>
        <Txt variant="body" color={color.muted}>Type <Txt variant="title" color={color.terracottaDeep}>DELETE</Txt> to confirm.</Txt>
        <Field label="Confirmation" value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="none" />
        <Button title="Permanently delete my account" variant="danger" onPress={handleDelete} loading={busy} disabled={!canDelete} />
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={busy} />
      </View>

Change the wrapping tag only — keep every line inside exactly as-is:
      <Stagger index={0} style={s.body}>
        <Card style={s.warn}>
          <Txt variant="title" color={color.terracottaDeep}>This is permanent</Txt>
          <Txt variant="body" color={color.muted}>Deleting {session.user.email} removes profile, patients, saved locations, bookings and care logs. Cannot be undone.</Txt>
        </Card>
        <Txt variant="body" color={color.muted}>Type <Txt variant="title" color={color.terracottaDeep}>DELETE</Txt> to confirm.</Txt>
        <Field label="Confirmation" value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="none" />
        <Button title="Permanently delete my account" variant="danger" onPress={handleDelete} loading={busy} disabled={!canDelete} />
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={busy} />
      </Stagger>

Do NOT touch the other two return blocks in this file (the "Sign in required" View at line 20, the "Account deleted" View at line 32) — leave those exactly as they are, no Stagger there.

## After the edit
Run from /Users/1234/Desktop/Caresy phone/caresy_m3_worktree/apps/mobile-app:
npx tsc --noEmit

Confirm 0 errors. Report the diff and the tsc result.

---
STATUS: executed by cavecrew-builder subagent, this session — both edits landed, `tsc 0` confirmed by orchestrator. Kept here as the record of what was dispatched.
