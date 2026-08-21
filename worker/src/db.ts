export interface Env {
  DB: D1Database;
}

// 用户
export async function getUserByUsername(username: string, env: Env) {
  return await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
}

export async function getUserByUid(uid: number, env: Env) {
  return await env.DB.prepare('SELECT uid, username, nickname, admin FROM users WHERE uid = ?').bind(uid).first();
}

export async function createUser(username: string, passwordHash: string, nickname: string, env: Env) {
  const maxUid = await env.DB.prepare('SELECT MAX(uid) as max FROM users').first() as { max: number };
  const uid = (maxUid?.max || 0) + 1;
  await env.DB.prepare('INSERT INTO users (uid, username, password_hash, nickname) VALUES (?, ?, ?, ?)')
    .bind(uid, username, passwordHash, nickname).run();
  return uid;
}

// 题目
export async function getProblems(env: Env) {
  return await env.DB.prepare('SELECT id, title, difficulty, time_limit, memory_limit FROM problems ORDER BY id').all();
}

export async function getProblem(id: string, env: Env) {
  return await env.DB.prepare('SELECT * FROM problems WHERE id = ?').bind(id).first();
}

export async function createProblem(id: string, title: string, description: string, timeLimit: number, memoryLimit: number, testCases: string, env: Env) {
  await env.DB.prepare('INSERT INTO problems (id, title, description, time_limit, memory_limit, test_cases) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, title, description, timeLimit, memoryLimit, testCases).run();
}

export async function updateProblem(id: string, title: string, description: string, timeLimit: number, memoryLimit: number, testCases: string, env: Env) {
  await env.DB.prepare('UPDATE problems SET title = ?, description = ?, time_limit = ?, memory_limit = ?, test_cases = ? WHERE id = ?')
    .bind(title, description, timeLimit, memoryLimit, testCases, id).run();
}

export async function deleteProblem(id: string, env: Env) {
  await env.DB.prepare('DELETE FROM problems WHERE id = ?').bind(id).run();
}

// 提交
export async function createSubmission(rid: number, uid: number, problemId: string, language: string, code: string, env: Env) {
  await env.DB.prepare('INSERT INTO submissions (rid, uid, problem_id, language, code, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(rid, uid, problemId, language, code, 'pending').run();
  return rid;
}

export async function getMaxRid(env: Env) {
  const result = await env.DB.prepare('SELECT MAX(rid) as max FROM submissions').first() as { max: number };
  return result?.max || 0;
}

export async function getSubmissions(env: Env, limit: number, offset: number) {
  return await env.DB.prepare(
    `SELECT s.rid, s.uid, u.username, s.problem_id, s.language, s.status, s.time_used, s.memory_used, s.created_at
     FROM submissions s LEFT JOIN users u ON s.uid = u.uid
     ORDER BY s.rid DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
}

export async function getSubmission(rid: number, env: Env) {
  return await env.DB.prepare(
    `SELECT s.*, u.username, u.nickname, p.title as problem_title
     FROM submissions s
     LEFT JOIN users u ON s.uid = u.uid
     LEFT JOIN problems p ON s.problem_id = p.id
     WHERE s.rid = ?`
  ).bind(rid).first();
}

export async function updateSubmissionStatus(rid: number, status: string, result: string | null, timeUsed: number | null, memoryUsed: number | null, env: Env) {
  await env.DB.prepare(
    `UPDATE submissions SET status = ?, result = ?, time_used = ?, memory_used = ?, finished_at = datetime('now')
     WHERE rid = ?`
  ).bind(status, result, timeUsed, memoryUsed, rid).run();
}

export async function cancelSubmission(rid: number, env: Env) {
  await env.DB.prepare('UPDATE submissions SET status = ? WHERE rid = ?').bind('cancelled', rid).run();
}

export async function getSubmissionsByUser(uid: number, env: Env) {
  return await env.DB.prepare(
    `SELECT rid, problem_id, language, status, time_used, memory_used, created_at
     FROM submissions WHERE uid = ? ORDER BY rid DESC`
  ).bind(uid).all();
}

export async function getSubmissionsByProblem(problemId: string, env: Env) {
  return await env.DB.prepare(
    `SELECT rid, uid, language, status, time_used, memory_used, created_at
     FROM submissions WHERE problem_id = ? ORDER BY rid DESC`
  ).bind(problemId).all();
}

// 排行榜
export async function getRank(env: Env) {
  return await env.DB.prepare(
    `SELECT u.uid, u.username, u.nickname,
      COUNT(CASE WHEN s.status = 'accepted' THEN 1 END) as ac_count,
      COUNT(s.rid) as total_submissions
     FROM users u
     LEFT JOIN submissions s ON u.uid = s.uid
     GROUP BY u.uid
     ORDER BY ac_count DESC, total_submissions ASC
     LIMIT 100`
  ).all();
}

// 比赛
export async function getContests(env: Env) {
  return await env.DB.prepare('SELECT id, title, start_time, end_time FROM contests ORDER BY id').all();
}

export async function getContest(id: number, env: Env) {
  return await env.DB.prepare('SELECT * FROM contests WHERE id = ?').bind(id).first();
}

export async function createContest(id: number, title: string, description: string, startTime: string, endTime: string, problems: string, env: Env) {
  await env.DB.prepare('INSERT INTO contests (id, title, description, start_time, end_time, problems) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, title, description, startTime, endTime, problems).run();
}

export async function updateContest(id: number, title: string, description: string, startTime: string, endTime: string, problems: string, env: Env) {
  await env.DB.prepare('UPDATE contests SET title = ?, description = ?, start_time = ?, end_time = ?, problems = ? WHERE id = ?')
    .bind(title, description, startTime, endTime, problems, id).run();
}

export async function deleteContest(id: number, env: Env) {
  await env.DB.prepare('DELETE FROM contests WHERE id = ?').bind(id).run();
}

export async function getContestSubmissions(contestId: number, env: Env) {
  return await env.DB.prepare(
    `SELECT s.*, u.username FROM submissions s
     JOIN users u ON s.uid = u.uid
     WHERE s.contest_id = ? ORDER BY s.rid`
  ).bind(contestId).all();
}
