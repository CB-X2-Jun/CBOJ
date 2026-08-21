import { Env } from './index';
import { authenticate } from './auth';
import { register, login, getMe } from './api/users';
import { listProblems, getProblem, createProblem, updateProblem, deleteProblem } from './api/problems';
import { submitCode, getSubmission, listSubmissions, cancelSubmission } from './api/submissions';
import { callback } from './api/callback';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 公开路由
  if (path === '/api/register' && method === 'POST') return register(request, env);
  if (path === '/api/login' && method === 'POST') return login(request, env);

  // 需要认证的路由
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const user = auth;

  // 用户信息
  if (path === '/api/me' && method === 'GET') return getMe(user);

  // 题目相关
  if (path === '/api/problems' && method === 'GET') return listProblems(env);
  if (path === '/api/problems' && method === 'POST') {
    // 仅管理员
    if (!user.is_admin) return forbidden();
    return createProblem(request, env);
  }
  if (path === '/api/problems/:id' && method === 'GET') {
    const id = url.pathname.split('/')[3];
    return getProblem(id, env);
  }
  if (path === '/api/problems/:id' && method === 'PUT') {
    if (!user.is_admin) return forbidden();
    const id = url.pathname.split('/')[3];
    return updateProblem(request, id, env);
  }
  if (path === '/api/problems/:id' && method === 'DELETE') {
    if (!user.is_admin) return forbidden();
    const id = url.pathname.split('/')[3];
    return deleteProblem(id, env);
  }

  // 提交相关
  if (path === '/api/submit' && method === 'POST') return submitCode(request, user, env);
  if (path === '/api/submissions' && method === 'GET') {
    // 可传 ?user_id= 或 ?problem_id= 筛选
    return listSubmissions(url, env);
  }
  if (path === '/api/submissions/:id' && method === 'GET') {
    const id = url.pathname.split('/')[3];
    return getSubmission(id, env);
  }
  if (path === '/api/submissions/:id/cancel' && method === 'POST') {
    if (!user.is_admin) return forbidden();
    const id = url.pathname.split('/')[3];
    return cancelSubmission(id, env);
  }

  // 回调接口（供 GitHub Actions 调用，用固定 token 认证）
  if (path === '/api/callback' && method === 'POST') {
    return callback(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
}

function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
