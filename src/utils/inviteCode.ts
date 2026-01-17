import crypto from 'crypto';

export function generateInviteCode(length: number = 18): string {
  return crypto.randomBytes(length).toString('base64url');
}
