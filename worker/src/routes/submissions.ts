import { createSubmission, getMaxRid, getSubmissions, getSubmission, updateSubmissionStatus, cancelSubmission, getProblem, saveSubmissionDetails, updateSubmissionScore, getSubmissionDetails, getSubmissionsWithFilter } from '../db';
import { triggerGitHubActions } from '../utils/github';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 计算每个测试点的分数（整数分配，大分数优先给后面的测试点）
function calculateScores(totalScore: number, numTests: number): number[] {
  if (numTests === 0) return [];
  if (numTests === 1) return [totalScore];
  
  const base = Math.floor(totalScore / numTests);
  const remainder = totalScore - base * numTests;
  // 大分数优先给后面的测试点
  const scores = Array(numTests).fill(base);
  for (let i = 0; i < remainder; i++) {
    scores[numTests - 1 - i] += 1;
  }
  return scores;
}

export async function handleSubmit(request: Request, uid: number, env: any) {
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
    
    const testCasesStr = JSON.stringify(JSON.parse(problem.test_cases));
    const codeStr = JSON.stringify(body.code);

    const result = await triggerGitHubActions(env, {
      rid,
      problemId: body.problemId,
      language: body.language,
      code: codeStr,
      timeLimit: problem.time_limit,
      memoryLimit: problem.memory_limit,
      testCases: testCasesStr,
      totalScore: problem.total_score || 100,
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

export async function handleCallback(request: Request, env: any) {
  try {
    const body = await request.json() as { 
      rid: number; 
      status: string; 
      result?: string; 
      time_used?: number; 
      memory_used?: number;
      details?: Array<{
        status: string;
        time_used: number;
        memory_used: number;
      }>;
      total_score?: number;
    };
    
    const { rid, status, result, time_used, memory_used, details, total_score } = body;

    // 更新提交状态
    await updateSubmissionStatus(rid, status, result || null, time_used || null, memory_used || null, env);

    // 如果有详情数据，保存到 submission_details
    if (details && details.length > 0) {
      // 计算每个测试点的分数
      const numTests = details.length;
      const totalScore = total_score || 100;
      const scores = calculateScores(totalScore, numTests);
      
      const detailsWithScore = details.map((d, index) => ({
        ...d,
        score: scores[index] || 0
      }));
      
      await saveSubmissionDetails(rid, detailsWithScore, env);
      
      // 计算总分（只计 AC 的分数）
      const totalAcScore = detailsWithScore.reduce((sum, d) => sum + (d.status === 'accepted' ? d.score : 0), 0);
      await updateSubmissionScore(rid, totalAcScore, env);
    } else {
      // 没有详情数据，使用旧逻辑（只更新总分）
      // 对于旧格式，使用 max_score 作为总分
      const sub = await getSubmission(rid, env);
      if (sub && status === 'accepted') {
        await updateSubmissionScore(rid, sub.max_score || 100, env);
      } else {
        await updateSubmissionScore(rid, 0, env);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleSubmissions(url: URL, uid: number, env: any) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const user = url.searchParams.get('user') || undefined;
    const language = url.searchParams.get('language') || undefined;
    const problem = url.searchParams.get('problem') || undefined;
    const status = url.searchParams.get('status') || undefined;

    let result;
    if (user || language || problem || status) {
      result = await getSubmissionsWithFilter(env, limit, offset, { user, language, problem, status });
    } else {
      result = await getSubmissions(env, limit, offset);
    }
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

    // 获取测试点详情
    const detailsResult = await getSubmissionDetails(rid, env);
    sub.details = detailsResult.results || [];

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