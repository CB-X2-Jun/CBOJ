import { handleRegister, handleLogin } from './routes/auth';
import { handleProblems, handleProblem, handleCreateProblem, handleUpdateProblem, handleDeleteProblem } from './routes/problems';
import { handleSubmit, handleSubmission, handleSubmissions, handleCallback, handleCancelSubmission } from './routes/submissions';
import { handleRank } from './routes/rank';
import { handleContests, handleContest, handleCreateContest, handleUpdateContest, handleDeleteContest, handleJoinContest } from './routes/contests';
import { verifyToken } from './auth';

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

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    };

    try {
      // ========== 公开路由 ==========
      if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, env);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/problems' && method === 'GET') {
        return await handleProblems(env);
      }
      if (path === '/api/rank' && method === 'GET') {
        return await handleRank(env);
      }
      if (path === '/api/contests' && method === 'GET') {
        return await handleContests(env);
      }
      if (path === '/api/callback' && method === 'POST') {
        return await handleCallback(request, env);
      }

      // ========== 需要登录 ==========
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, env.JWT_SECRET);
      if (!payload) {
        return json({ error: 'Invalid token' }, 401);
      }
      const uid = payload.uid;
      const isAdminUser = payload.admin || false;

      // ========== 题目相关 ==========
      // 获取单个题目：GET /api/problem/xxx
      if (path.startsWith('/api/problem/') && method === 'GET') {
        const id = path.split('/')[3]; // 如 /api/problem/C1000 → ['', 'api', 'problem', 'C1000']
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleProblem(id, env);
      }

      // 创建题目：POST /api/problem
      if (path === '/api/problem' && method === 'POST') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        return await handleCreateProblem(request, env);
      }

      // 更新题目：PUT /api/problem/xxx
      if (path.startsWith('/api/problem/') && method === 'PUT') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = path.split('/')[3];
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleUpdateProblem(request, id, env);
      }

      // 删除题目：DELETE /api/problem/xxx
      if (path.startsWith('/api/problem/') && method === 'DELETE') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = path.split('/')[3];
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleDeleteProblem(id, env);
      }

      // ========== 提交相关 ==========
      if (path === '/api/submit' && method === 'POST') {
        return await handleSubmit(request, uid, env);
      }
      if (path === '/api/submissions' && method === 'GET') {
        return await handleSubmissions(url, uid, env);
      }
      if (path.startsWith('/api/submission/') && method === 'GET') {
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid submission id' }, 400);
        return await handleSubmission(id, uid, isAdminUser, env);
      }
      if (path.startsWith('/api/submission/') && method === 'POST') {
        // 注意：取消提交的路由是 /api/submission/:id/cancel
        if (path.endsWith('/cancel')) {
          if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
          const parts = path.split('/');
          const id = parseInt(parts[3]);
          if (isNaN(id)) return json({ error: 'Invalid submission id' }, 400);
          return await handleCancelSubmission(id, env);
        }
        // 其他 POST 到 /api/submission/xxx 暂不支持
        return json({ error: 'Not Found' }, 404);
      }

      // ========== 比赛相关 ==========
      // 获取比赛列表
      if (path === '/api/contests' && method === 'GET') {
        return await handleContests(env);
      }
      // 获取单个比赛
      if (path.startsWith('/api/contest/') && method === 'GET') {
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleContest(id, env);
      }
      // 创建比赛
      if (path === '/api/contest' && method === 'POST') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        return await handleCreateContest(request, env);
      }
      // 更新比赛
      if (path.startsWith('/api/contest/') && method === 'PUT') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleUpdateContest(request, id, env);
      }
      // 删除比赛
      if (path.startsWith('/api/contest/') && method === 'DELETE') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleDeleteContest(id, env);
      }
      // 参加比赛
      if (path.startsWith('/api/contest/') && path.endsWith('/join') && method === 'POST') {
        const parts = path.split('/');
        const id = parseInt(parts[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleJoinContest(id, uid, env);
      }

      // 404
      return json({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return json({ error: 'Internal Server Error: ' + String(error) }, 500);
    }
  },
};