CREATE TABLE IF NOT EXISTS submission_details (
    rid INTEGER NOT NULL,
    test_index INTEGER NOT NULL,
    status TEXT NOT NULL,
    time_used INTEGER,
    memory_used INTEGER,
    score INTEGER,
    PRIMARY KEY (rid, test_index),
    FOREIGN KEY (rid) REFERENCES submissions(rid)
);