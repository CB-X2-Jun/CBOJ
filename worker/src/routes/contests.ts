import {
  getContests,
  getContest,
  createContest,
  updateContest,
  deleteContest,
} from '../db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handleContests(env: any) {
  try {
    const result = await getContests(env);
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

export async function handleContest(id: number, env: any) {
  try {
    const contest = await getContest(id, env);
    if (!contest) {
      return new Response(JSON.stringify({ error: 'Contest not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    return new Response(JSON.stringify(contest), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleCreateContest(request: Request, env: any) {
  try {
    const body = await request.json() as {
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
      problems: string[];
    };
    const { title, description, start_time, end_time, problems } = body;

    if (!title || !start_time || !end_time || !problems) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const maxResult = await env.DB.prepare('SELECT MAX(id) as max FROM contests').first() as { max: number };
    const id = (maxResult?.max || 0) + 1;

    await createContest(
      id,
      title,
      description || '',
      start_time,
      end_time,
      JSON.stringify(problems),
      env
    );

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function handleUpdateContest(request: Request, id: number, env: any) {
  try {
    const body = await request.json() as {
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
      problems: string[];
    };
    const { title, description, start_time, end_time, problems } = body;

    await updateContest(
      id,
      title,
      description || '',
      start_time,
      end_time,
      JSON.stringify(problems),
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

export async function handleDeleteContest(id: number, env: any) {
  try {
    await deleteContest(id, env);
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

export async function handleJoinContest(id: number, uid: number, env: any) {
  try {
    const contest = await getContest(id, env);
    if (!contest) {
      return new Response(JSON.stringify({ error: 'Contest not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM contest_participants WHERE contest_id = ? AND uid = ?'
    ).bind(id, uid).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Already joined' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    await env.DB.prepare(
      'INSERT INTO contest_participants (contest_id, uid) VALUES (?, ?)'
    ).bind(id, uid).run();

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