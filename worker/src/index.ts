import { handleRequest } from './router';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKER_URL: string;  // 用于回调
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
