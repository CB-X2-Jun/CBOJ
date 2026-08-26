import { getProblems, getProblem, createProblem, updateProblem, deleteProblem, searchProblems } from '../db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleProblems(env: any) {
  try {
    const result = await getProblems(env);
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

export async function handleSearchProblems(request: Request, env: any) {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('q') || '';
    if (!keyword) {
      return await handleProblems(env);
    }
    const result = await searchProblems(keyword, env);
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

export async function handleProblem(id: string, env: any) {
  try {
    const problem = await getProblem(id, env);
    if (!problem) {
      return new Response(JSON.stringify({ error: 'Problem not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    return new Response(JSON.stringify(problem), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleCreateProblem(request: Request, env: any) {
  try {
    const body = await request.json();
    const { id, title, description, time_limit, memory_limit, test_cases, difficulty, total_score } = body;
    if (!id || !title || !description || test_cases === undefined) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    await createProblem(
      id, 
      title, 
      description, 
      time_limit || 1000, 
      memory_limit || 256, 
      JSON.stringify(test_cases),
      difficulty || '入门',
      total_score || 100,
      env
    );
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

export async function handleUpdateProblem(request: Request, id: string, env: any) {
  try {
    const body = await request.json();
    const { title, description, time_limit, memory_limit, test_cases, difficulty, total_score } = body;
    await updateProblem(
      id, 
      title, 
      description, 
      time_limit || 1000, 
      memory_limit || 256, 
      JSON.stringify(test_cases),
      difficulty || '入门',
      total_score || 100,
      env
    );
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

export async function handleDeleteProblem(id: string, env: any) {
  try {
    await deleteProblem(id, env);
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