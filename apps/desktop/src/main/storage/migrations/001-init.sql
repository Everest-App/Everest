-- History table for storing all request/response pairs
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
CREATE INDEX IF NOT EXISTS idx_history_method ON history(method);
