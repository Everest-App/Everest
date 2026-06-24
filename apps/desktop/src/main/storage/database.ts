import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

let db: SqlJsDatabase;
let dbPath: string;
let autoSaveIntervalId: ReturnType<typeof setInterval> | null = null;
let isDirty = false;

export function getDb(): SqlJsDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Save the in-memory database to disk immediately.
 * Called by services after data mutations.
 */
export function saveDatabase(): void {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        isDirty = false;
    }
}

/**
 * Auto-save handler: only writes if data has been modified since last save.
 * Used by the periodic interval to avoid unnecessary I/O.
 */
function autoSave(): void {
    if (db && isDirty) {
        saveDatabase();
    }
}

/**
 * Mark the database as having unsaved changes.
 * The auto-save interval will pick this up.
 */
export function markDirty(): void {
    isDirty = true;
}

/**
 * Close the database and clean up resources.
 * Call this on app quit.
 */
export function closeDatabase(): void {
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = null;
    }
    // Force a final save regardless of dirty flag
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        db.close();
    }
}

export async function initDatabase(): Promise<void> {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    dbPath = path.join(dbDir, 'api-platform.db');

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Run migrations
    runMigrations();

    // Auto-save every 30 seconds (only if dirty)
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
    }
    autoSaveIntervalId = setInterval(autoSave, 30000);

    // Save on app quit
    app.on('before-quit', () => {
        closeDatabase();
    });
}

function runMigrations(): void {
    // Create migrations tracking table
    db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

    const appRoot = app.getAppPath();
    const possibleDirs = [
        path.join(appRoot, 'dist', 'migrations'),
        path.join(appRoot, 'src', 'main', 'storage', 'migrations'),
        path.join(__dirname, 'migrations'),
        path.join(__dirname, '..', 'storage', 'migrations'),
    ];

    let migrationFiles: string[] = [];
    let resolvedDir = '';

    for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
            migrationFiles = fs.readdirSync(dir)
                .filter(f => f.endsWith('.sql'))
                .sort();
            resolvedDir = dir;
            break;
        }
    }

    // Get already applied migrations
    const appliedRows = db.exec('SELECT name FROM _migrations');
    const applied = new Set<string>();
    if (appliedRows.length > 0) {
        for (const row of appliedRows[0].values) {
            applied.add(row[0] as string);
        }
    }

    for (const file of migrationFiles) {
        if (!applied.has(file)) {
            const sql = fs.readFileSync(path.join(resolvedDir, file), 'utf-8');
            db.run(sql);
            db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
            console.log(`[DB] Applied migration: ${file}`);
        }
    }

    saveDatabase();
}
