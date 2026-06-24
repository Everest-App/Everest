-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    variables_json TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Collection items (requests & folders)
CREATE TABLE IF NOT EXISTS collection_items (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('folder', 'request')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    request_json TEXT,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_items_parent ON collection_items(parent_id);

-- Environments table
CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    variables_json TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Global variables (single row)
CREATE TABLE IF NOT EXISTS global_variables (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    variables_json TEXT DEFAULT '[]'
);

INSERT OR IGNORE INTO global_variables (id, variables_json) VALUES (1, '[]');
