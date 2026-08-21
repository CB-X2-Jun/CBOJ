import * as jwt from '@tsndr/cloudflare-worker-jwt';

export async function verifyToken(token: string, secret: string): Promise<{ uid: number } | null> {
  try {
    const valid = await jwt.verify(token, secret);
    if (!valid) return null;
    const payload = jwt.decode(token);
    return { uid: payload.uid as number };
  } catch {
    return null;
  }
}

export function isAdmin(uid: number, adminList: string): boolean {
  if (!adminList) return false;
  return adminList.split(',').map(s => s.trim()).includes(String(uid));
}

export function generateToken(uid: number, secret: string): Promise<string> {
  return jwt.sign({ uid, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret);
}
