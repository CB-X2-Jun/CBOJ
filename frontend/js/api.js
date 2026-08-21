const API_BASE = 'https://ojapi.x2cb.cc.cd/api';

// 存储 token
export function setToken(token) {
  localStorage.setItem('token', token);
}
export function getToken() {
  return localStorage.getItem('token');
}
export function removeToken() {
  localStorage.removeItem('token');
}
export function getUserInfo() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { uid: payload.uid, username: payload.username };
  } catch { return null; }
}

// 通用 fetch
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || resp.statusText);
  }
  return resp.json();
}

// 用户
export async function register(username, password, nickname) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) });
}
export async function login(username, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  if (data.token) setToken(data.token);
  return data;
}
export function logout() { removeToken(); }

// 题目
export async function getProblems() {
  return apiFetch('/problems');
}
export async function getProblem(id) {
  return apiFetch(`/problem/${id}`);
}
export async function createProblem(problem) {
  return apiFetch('/problem', { method: 'POST', body: JSON.stringify(problem) });
}
export async function updateProblem(id, problem) {
  return apiFetch(`/problem/${id}`, { method: 'PUT', body: JSON.stringify(problem) });
}
export async function deleteProblem(id) {
  return apiFetch(`/problem/${id}`, { method: 'DELETE' });
}

// 提交
export async function submit(problemId, language, code) {
  return apiFetch('/submit', { method: 'POST', body: JSON.stringify({ problemId, language, code }) });
}
export async function getSubmissions(limit = 50, offset = 0) {
  return apiFetch(`/submissions?limit=${limit}&offset=${offset}`);
}
export async function getSubmission(rid) {
  return apiFetch(`/submission/${rid}`);
}
export async function cancelSubmission(rid) {
  return apiFetch(`/submission/${rid}/cancel`, { method: 'POST' });
}

// 排行榜
export async function getRank() {
  return apiFetch('/rank');
}

// 比赛
export async function getContests() {
  return apiFetch('/contests');
}
export async function getContest(id) {
  return apiFetch(`/contest/${id}`);
}
export async function createContest(contest) {
  return apiFetch('/contest', { method: 'POST', body: JSON.stringify(contest) });
}
export async function updateContest(id, contest) {
  return apiFetch(`/contest/${id}`, { method: 'PUT', body: JSON.stringify(contest) });
}
export async function deleteContest(id) {
  return apiFetch(`/contest/${id}`, { method: 'DELETE' });
}
export async function joinContest(id) {
  return apiFetch(`/contest/${id}/join`, { method: 'POST' });
}
