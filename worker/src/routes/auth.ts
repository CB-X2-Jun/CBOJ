import { createUser, getUserByUsername } from '../db';
import { generateToken, isAdmin } from '../auth';
import * as bcrypt from 'bcryptjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleRegister(request: Request, env: any) {
  try {
    const body = await request.json() as { username: string; password: string; nickname: string };
    if (!body.username || !body.password) {
      return new Response(JSON.stringify({ error: 'Missing username/password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const existing = await getUserByUsername(body.username, env);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Username already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const hash = await bcrypt.hash(body.password, 10);
    const uid = await createUser(body.username, hash, body.nickname || body.username, env);
    // 新注册用户默认非管理员
    const isAdminUser = false;
    const token = await generateToken(uid, body.username, isAdminUser, env.JWT_SECRET);
    return new Response(JSON.stringify({ token, uid, username: body.username }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleLogin(request: Request, env: any) {
  try {
    const body = await request.json() as { username: string; password: string };
    const user = await getUserByUsername(body.username, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    // 根据环境变量判断是否为管理员
    const isAdminUser = isAdmin(user.uid, env.ADMIN_UID_LIST);
    const token = await generateToken(user.uid, user.username, isAdminUser, env.JWT_SECRET);
    return new Response(JSON.stringify({ token, uid: user.uid, username: user.username, nickname: user.nickname }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}