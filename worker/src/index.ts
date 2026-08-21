import { handleAuth, handleRegister, handleLogin } from './routes/auth';
import { handleProblems, handleProblem, handleCreateProblem, handleUpdateProblem, handleDeleteProblem } from './routes/problems';
import { handleSubmit, handleSubmission, handleSubmissions, handleCallback } from './routes/submissions';
import { handleRank } from './routes/rank';
import { handleContests, handleContest, handleCreateContest, handleUpdateContest, handleDeleteContest, handleJoinContest } from './routes/contests';
import { verifyToken, isAdmin } from './auth';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_UID_LIST: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  SITE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // 公开路由（不需要登录）
    if (path === '/api/auth/register' && method === 'POST') return await handleRegister(request, env);
    if (path === '/api/auth/login' && method === 'POST') return await handleLogin(request, env);
    if (path === '/api/problems' && method === 'GET') return await handleProblems(env);
    if (path === '/api/rank' && method === 'GET') return await handleRank(env);
    if (path === '/api/contests' && method === 'GET') return await handleContests(env);

    // 需要登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const uid = payload.uid;
    const isAdminUser = isAdmin(uid, env.ADMIN_UID_LIST);

    // 题目相关
    if (path === '/api/problem/:id' && method === 'GET') {
      const id = path.split('/')[3];
      return await handleProblem(id, env);
    }
    if (path === '/api/problem' && method === 'POST') {
      if (!isAdminUser) return forbidden();
      return await handleCreateProblem(request, env);
    }
    if (path === '/api/problem/:id' && method === 'PUT') {
      if (!isAdminUser) return forbidden();
      const id = path.split('/')[3];
      return await handleUpdateProblem(request, id, env);
    }
    if (path === '/api/problem/:id' && method === 'DELETE') {
      if (!isAdminUser) return forbidden();
      const id = path.split('/')[3];
      return await handleDeleteProblem(id, env);
    }

    // 提交相关
    if (path === '/api/submit' && method === 'POST') {
      return await handleSubmit(request, uid, env);
    }
    if (path === '/api/submissions' && method === 'GET') {
      return await handleSubmissions(url, uid, env);
    }
    if (path === '/api/submission/:id' && method === 'GET') {
      const id = path.split('/')[3];
      return await handleSubmission(id, uid, isAdminUser, env);
    }
    if (path === '/api/callback' && method === 'POST') {
      return await handleCallback(request, env);
    }
    if (path === '/api/submission/:id/cancel' && method === 'POST') {
      if (!isAdminUser) return forbidden();
      const id = path.split('/')[3];
      return await handleCancelSubmission(id, env);
    }

    // 比赛相关
    if (path === '/api/contest/:id' && method === 'GET') {
      const id = path.split('/')[3];
      return await handleContest(id, env);
    }
    if (path === '/api/contest' && method === 'POST') {
      if (!isAdminUser) return forbidden();
      return await handleCreateContest(request, env);
    }
    if (path === '/api/contest/:id' && method === 'PUT') {
      if (!isAdminUser) return forbidden();
      const id = path.split('/')[3];
      return await handleUpdateContest(request, id, env);
    }
    if (path === '/api/contest/:id' && method === 'DELETE') {
      if (!isAdminUser) return forbidden();
      const id = path.split('/')[3];
      return await handleDeleteContest(id, env);
    }
    if (path === '/api/contest/:id/join' && method === 'POST') {
      const id = path.split('/')[3];
      return await handleJoinContest(id, uid, env);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  },
};

function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
}
