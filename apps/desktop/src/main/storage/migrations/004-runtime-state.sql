-- 004-runtime-state.sql

CREATE TABLE IF NOT EXISTS runner_sessions (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    config_json TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'idle',
    progress_json TEXT,
    variable_snapshot_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
