import { createSubmission, getMaxRid, getSubmissions, getSubmission, updateSubmissionStatus, cancelSubmission, getProblem } from '../db';
import { triggerGitHubActions } from '../utils/github';

export async function handleSubmit(request: Request, uid: number, env: any) {
  const body = await request.json() as { problemId: string; language: string; code: string };
  if (!body.problemId || !body.language || !body.code) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  // 检查题目是否存在
  const problem = await getProblem(body.problemId, env);
  if (!problem) {
    return new Response(JSON.stringify({ error: 'Problem not found' }), { status: 404 });
  }

  const rid = (await getMaxRid(env)) + 1;
  await createSubmission(rid, uid, body.problemId, body.language, body.code, env);

  // 触发 GitHub Actions（异步）
  const result = await triggerGitHubActions(env, {
    rid,
    problemId: body.problemId,
    language: body.language,
    code: body.code,
    timeLimit: problem.time_limit,
    memoryLimit: problem.memory_limit,
    testCases: JSON.parse(problem.test_cases),
  });

  if (!result.success) {
    await updateSubmissionStatus(rid, 'system_error', `Failed to trigger judge: ${result.error}`, null, null, env);
    return new Response(JSON.stringify({ rid, status: 'system_error', error: result.error }));
  }

  return new Response(JSON.stringify({ rid, status: 'pending' }));
}

export async function handleSubmissions(url: URL, uid: number, env: any) {
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const result = await getSubmissions(env, limit, offset);
  return new Response(JSON.stringify(result.results || []));
}

export async function handleSubmission(rid: number, uid: number, isAdmin: boolean, env: any) {
  const sub = await getSubmission(rid, env);
  if (!sub) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });
  }
  // 非管理员且不是自己的提交，隐藏代码
  if (!isAdmin && sub.uid !== uid) {
    sub.code = null;
  }
  return new Response(JSON.stringify(sub));
}

export async function handleCallback(request: Request, env: any) {
  const body = await request.json() as { rid: number; status: string; result?: string; time_used?: number; memory_used?: number };
  const { rid, status, result, time_used, memory_used } = body;
  
  // 验证来源（可选：增加 token 验证）
  await updateSubmissionStatus(rid, status, result || null, time_used || null, memory_used || null, env);
  return new Response(JSON.stringify({ success: true }));
}

export async function handleCancelSubmission(rid: number, env: any) {
  await cancelSubmission(rid, env);
  return new Response(JSON.stringify({ success: true }));
}
