import Module from 'module';
import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let testDb: Database | null = null;

export async function initTestDb() {
    const SQL = await initSqlJs();
    testDb = new SQL.Database();
    
    // Run migrations manually in the mock
    const migrationsDir = path.join(process.cwd(), 'src/main/storage/migrations');
    
    if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        
        testDb.run(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')));`);
        
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            testDb.run(sql);
        }
    }
}

export function getTestDb() {
    if (!testDb) throw new Error("Test DB not initialized");
    return testDb;
}

// Monkey-patch require to intercept database and electron imports
const originalRequire = Module.prototype.require;

(Module.prototype as any).require = function (id: string) {
    if (id === 'electron') {
        return { 
            app: { 
                getPath: () => '', 
                getAppPath: () => process.cwd(), 
                on: () => {} 
            } 
        };
    }
    
    // Intercept any require that ends with storage/database
    if (id.endsWith('/storage/database') || id.endsWith('\\storage\\database')) {
        return {
            getDb: () => {
                if (!testDb) throw new Error("Test DB not initialized (called getDb)");
                return testDb;
            },
            saveDatabase: () => {},
            markDirty: () => {},
            closeDatabase: () => {},
            initDatabase: async () => {}
        };
    }
    
    return originalRequire.apply(this, arguments as any);
};
