export async function triggerGitHubActions(env: any, payload: any) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CBOJ-Worker',
      },
      body: JSON.stringify({
        event_type: 'judge',
        client_payload: {
          rid: payload.rid,
          problemId: payload.problemId,
          language: payload.language,
          code: payload.code,
          timeLimit: payload.timeLimit,
          memoryLimit: payload.memoryLimit,
          testCases: payload.testCases,
          callbackUrl: `${env.SITE_URL}/api/callback`,
        },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `GitHub API error: ${resp.status} - ${text}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
