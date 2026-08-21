import * as bcrypt from 'bcryptjs';
import { createUser, getUserByUsername } from '../db';
import { generateToken } from '../auth';

export async function handleRegister(request: Request, env: any) {
  const body = await request.json() as { username: string; password: string; nickname: string };
  if (!body.username || !body.password) {
    return new Response(JSON.stringify({ error: 'Missing username/password' }), { status: 400 });
  }
  const existing = await getUserByUsername(body.username, env);
  if (existing) {
    return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400 });
  }
  const hash = await bcrypt.hash(body.password, 10);
  const uid = await createUser(body.username, hash, body.nickname || body.username, env);
  const token = await generateToken(uid, env.JWT_SECRET);
  return new Response(JSON.stringify({ token, uid, username: body.username }));
}

export async function handleLogin(request: Request, env: any) {
  const body = await request.json() as { username: string; password: string };
  const user = await getUserByUsername(body.username, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }
  const valid = await bcrypt.compare(body.password, user.password_hash);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401 });
  }
  const token = await generateToken(user.uid, env.JWT_SECRET);
  return new Response(JSON.stringify({ token, uid: user.uid, username: user.username, nickname: user.nickname }));
}
