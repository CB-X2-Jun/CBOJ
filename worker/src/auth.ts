import * as jwt from '@tsndr/cloudflare-worker-jwt';

export async function verifyToken(token: string, secret: string): Promise<{ uid: number; admin: boolean } | null> {
  try {
    const valid = await jwt.verify(token, secret);
    if (!valid) return null;
    const decoded = jwt.decode(token);
    // ✅ 注意：decoded 的结构是 { header, payload }
    const payload = decoded.payload;
    return { 
      uid: payload.uid as number,
      admin: payload.admin as boolean || false 
    };
  } catch (error) {
    console.error('Verify token error:', error);
    return null;
  }
}

export function isAdmin(uid: number, adminList: string): boolean {
  if (!adminList) return false;
  return adminList.split(',').map(s => s.trim()).includes(String(uid));
}

export function generateToken(uid: number, username: string, isAdmin: boolean, secret: string): Promise<string> {
  return jwt.sign(
    {
      uid,
      username,
      admin: isAdmin,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    secret
  );
}