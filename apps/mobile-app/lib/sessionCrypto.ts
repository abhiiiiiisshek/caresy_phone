// Moved to packages/native so the admin app shares it. Re-exported here because
// the customer app's existing imports point at this path.
export { encryptSession, decryptSession } from '@caresy/native/sessionCrypto';
