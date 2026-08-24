import { createSubmission, getMaxRid, getSubmissions, getSubmission, updateSubmissionStatus, cancelSubmission, getProblem } from '../db';
import { triggerGitHubActions } from '../utils/github';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleSubmit(request: Request, uid: number, env: any) {
  // ✅ 检查 uid 是否有效
  if (uid === undefined || uid === null || isNaN(uid)) {
    return new Response(JSON.stringify({ error: 'Invalid user ID (uid is undefined)' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await request.json() as { problemId: string; language: string; code: string };
    if (!body.problemId || !body.language || !body.code) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const problem = await getProblem(body.problemId, env);
    if (!problem) {
      return new Response(JSON.stringify({ error: 'Problem not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const rid = (await getMaxRid(env)) + 1;
    await createSubmission(rid, uid, body.problemId, body.language, body.code, env);
    
    // 在触发 GitHub Actions 之前，将 code 和 testCases 转义为 JSON 字符串
	const testCasesStr = JSON.stringify(JSON.parse(problem.test_cases));
	const codeStr = JSON.stringify(body.code);  // 转义代码中的特殊字符

	const result = await triggerGitHubActions(env, {
	  rid,
	  problemId: body.problemId,
	  language: body.language,
	  code: codeStr,           // 转义后的代码
	  timeLimit: problem.time_limit,
	  memoryLimit: problem.memory_limit,
	  testCases: testCasesStr, // 转义后的测试用例数组字符串
	});

    if (!result.success) {
      await updateSubmissionStatus(rid, 'system_error', `Failed to trigger judge: ${result.error}`, null, null, env);
      return new Response(JSON.stringify({ rid, status: 'system_error', error: result.error }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ rid, status: 'pending' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Submit error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// 其他函数（已添加 CORS）
export async function handleSubmissions(url: URL, uid: number, env: any) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const result = await getSubmissions(env, limit, offset);
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleSubmission(rid: number, uid: number, isAdmin: boolean, env: any) {
  try {
    const sub = await getSubmission(rid, env);
    if (!sub) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (!isAdmin && sub.uid !== uid) {
      sub.code = null;
    }
    return new Response(JSON.stringify(sub), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleCallback(request: Request, env: any) {
  try {
    const body = await request.json() as { rid: number; status: string; result?: string; time_used?: number; memory_used?: number };
    const { rid, status, result, time_used, memory_used } = body;
    await updateSubmissionStatus(rid, status, result || null, time_used || null, memory_used || null, env);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleCancelSubmission(rid: number, env: any) {
  try {
    await cancelSubmission(rid, env);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}