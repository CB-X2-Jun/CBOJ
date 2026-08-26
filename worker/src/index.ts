import { handleRegister, handleLogin } from './routes/auth';
import { handleProblems, handleProblem, handleCreateProblem, handleUpdateProblem, handleDeleteProblem, handleSearchProblems } from './routes/problems';
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

    // ---------- 辅助：获取用户身份（优先从 token，无则未登录） ----------
    async function getUserFromRequest(request: Request) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { uid: 0, isAdmin: false };
      }
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, env.JWT_SECRET);
      if (!payload) {
        return { uid: 0, isAdmin: false };
      }
      return { uid: payload.uid, isAdmin: payload.admin || false };
    }

    try {
      // ========== 公开路由（无需登录） ==========
      if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, env);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/problems' && method === 'GET') {
        const q = url.searchParams.get('q');
        if (q) {
          return await handleSearchProblems(request, env);
        }
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

      // ---------- 题目详情（未登录可看） ----------
      if (path.startsWith('/api/problem/') && method === 'GET') {
        const id = path.split('/')[3];
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleProblem(id, env);
      }
      
      // ========== 获取题目测试用例（供 GitHub Actions 使用） ==========
      if (path.startsWith('/api/problem/') && path.endsWith('/testcases') && method === 'GET') {
        const parts = path.split('/');
        const problemId = parts[3]; // /api/problem/C1000/testcases
        if (!problemId) return json({ error: 'Missing problem id' }, 400);
        const problem = await getProblem(problemId, env);
        if (!problem) return json({ error: 'Problem not found' }, 404);
        try {
          const testCases = JSON.parse(problem.test_cases);
          return new Response(JSON.stringify(testCases), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        } catch (e) {
          return json({ error: 'Invalid test_cases format' }, 500);
        }
      }

      // ---------- 提交记录列表（未登录可看，但通过 token 识别身份） ----------
      if (path === '/api/submissions' && method === 'GET') {
        const { uid } = await getUserFromRequest(request);
        return await handleSubmissions(url, uid, env);
      }

      // ---------- 单条提交详情（未登录可看，但通过 token 识别身份） ----------
      if (path.startsWith('/api/submission/') && method === 'GET') {
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid submission id' }, 400);
        const { uid, isAdmin } = await getUserFromRequest(request);
        return await handleSubmission(id, uid, isAdmin, env);
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

      // ---------- 题目管理（仅管理员） ----------
      if (path === '/api/problem' && method === 'POST') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        return await handleCreateProblem(request, env);
      }

      if (path.startsWith('/api/problem/') && method === 'PUT') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = path.split('/')[3];
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleUpdateProblem(request, id, env);
      }

      if (path.startsWith('/api/problem/') && method === 'DELETE') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = path.split('/')[3];
        if (!id) return json({ error: 'Missing problem id' }, 400);
        return await handleDeleteProblem(id, env);
      }

      // ---------- 提交相关（需要登录） ----------
      if (path === '/api/submit' && method === 'POST') {
        return await handleSubmit(request, uid, env);
      }

      if (path.startsWith('/api/submission/') && method === 'POST' && path.endsWith('/cancel')) {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const parts = path.split('/');
        const id = parseInt(parts[3]);
        if (isNaN(id)) return json({ error: 'Invalid submission id' }, 400);
        return await handleCancelSubmission(id, env);
      }

      if (path.startsWith('/api/submission/') && method === 'POST') {
        return json({ error: 'Not Found' }, 404);
      }

      // ---------- 比赛相关 ----------
      if (path === '/api/contest' && method === 'POST') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        return await handleCreateContest(request, env);
      }

      if (path.startsWith('/api/contest/') && method === 'PUT') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleUpdateContest(request, id, env);
      }

      if (path.startsWith('/api/contest/') && method === 'DELETE') {
        if (!isAdminUser) return json({ error: 'Forbidden' }, 403);
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleDeleteContest(id, env);
      }

      if (path.startsWith('/api/contest/') && path.endsWith('/join') && method === 'POST') {
        const parts = path.split('/');
        const id = parseInt(parts[3]);
        if (isNaN(id)) return json({ error: 'Invalid contest id' }, 400);
        return await handleJoinContest(id, uid, env);
      }

      return json({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return json({ error: 'Internal Server Error: ' + String(error) }, 500);
    }
  },
};