-- 用户表
CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 题目表
CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    time_limit INTEGER DEFAULT 1000,
    memory_limit INTEGER DEFAULT 256,
    test_cases TEXT NOT NULL,  -- JSON: [{"input":"...","output":"..."}]
    created_at TEXT DEFAULT (datetime('now'))
);

-- 提交记录表
CREATE TABLE IF NOT EXISTS submissions (
    rid INTEGER PRIMARY KEY AUTOINCREMENT,
    uid INTEGER NOT NULL,
    problem_id TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,  -- pending, compiling, running, compile_error, wrong_answer, time_limit_exceeded, memory_limit_exceeded, accepted, system_error, cancelled
    result TEXT,
    time_used INTEGER,
    memory_used INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT,
    FOREIGN KEY (uid) REFERENCES users(uid),
    FOREIGN KEY (problem_id) REFERENCES problems(id)
);

-- 比赛表
CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    problems TEXT NOT NULL,  -- JSON: ["problem_id1", "problem_id2"]
    created_at TEXT DEFAULT (datetime('now'))
);

-- 比赛参赛用户
CREATE TABLE IF NOT EXISTS contest_participants (
    contest_id INTEGER,
    uid INTEGER,
    PRIMARY KEY (contest_id, uid),
    FOREIGN KEY (contest_id) REFERENCES contests(id),
    FOREIGN KEY (uid) REFERENCES users(uid)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_submissions_uid ON submissions(uid);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);
