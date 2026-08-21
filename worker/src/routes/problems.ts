import { getProblems, getProblem, createProblem, updateProblem, deleteProblem } from '../db';

export async function handleProblems(env: any) {
  const result = await getProblems(env);
  return new Response(JSON.stringify(result.results || []));
}

export async function handleProblem(id: string, env: any) {
  const problem = await getProblem(id, env);
  if (!problem) {
    return new Response(JSON.stringify({ error: 'Problem not found' }), { status: 404 });
  }
  return new Response(JSON.stringify(problem));
}

export async function handleCreateProblem(request: Request, env: any) {
  const body = await request.json();
  const { id, title, description, time_limit, memory_limit, test_cases } = body;
  if (!id || !title || !description || test_cases === undefined) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }
  await createProblem(id, title, description, time_limit || 1000, memory_limit || 256, JSON.stringify(test_cases), env);
  return new Response(JSON.stringify({ success: true }));
}

export async function handleUpdateProblem(request: Request, id: string, env: any) {
  const body = await request.json();
  const { title, description, time_limit, memory_limit, test_cases } = body;
  await updateProblem(id, title, description, time_limit || 1000, memory_limit || 256, JSON.stringify(test_cases), env);
  return new Response(JSON.stringify({ success: true }));
}

export async function handleDeleteProblem(id: string, env: any) {
  await deleteProblem(id, env);
  return new Response(JSON.stringify({ success: true }));
}
