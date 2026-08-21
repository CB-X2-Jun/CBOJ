-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,   -- 0=普通, 1=管理员
    created_at TEXT NOT NULL
);

-- 题目表
CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    input_desc TEXT,
    output_desc TEXT,
    time_limit INTEGER DEFAULT 1000,   -- 毫秒
    memory_limit INTEGER DEFAULT 256,  -- MB
    test_cases TEXT NOT NULL,          -- JSON: [{"input":"...","output":"..."}]
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 提交记录表
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,          -- pending, compiling, compile_error, running, system_error, wrong_answer, time_limit_exceeded, memory_limit_exceeded, accepted, cancelled
    result TEXT,                   -- 额外信息（如错误详情）
    time_used INTEGER,             -- 毫秒
    memory_used INTEGER,           -- KB
    error_msg TEXT,
    created_at TEXT NOT NULL,
    finished_at TEXT,
    FOREIGN KEY (problem_id) REFERENCES problems(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
