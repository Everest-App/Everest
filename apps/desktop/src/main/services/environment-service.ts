import { randomUUID as uuidv4 } from 'crypto';
import { getDb, saveDatabase } from '../storage/database';
import { Environment, Variable } from '@api-platform/core';

// ─── Environments CRUD ───────────────────────────────────────────

export function getAllEnvironments(): Environment[] {
    const db = getDb();
    const result = db.exec('SELECT id, name, variables_json, created_at, updated_at FROM environments ORDER BY name');

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        name: row[1] as string,
        variables: JSON.parse((row[2] as string) || '[]'),
        createdAt: row[3] as number,
        updatedAt: row[4] as number,
    }));
}

export function createEnvironment(name: string): Environment {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    db.run(
        'INSERT INTO environments (id, name, variables_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, name, '[]', now, now]
    );

    saveDatabase();

    return {
        id,
        name,
        variables: [],
        createdAt: now,
        updatedAt: now,
    };
}

export function updateEnvironment(env: Environment): void {
    const db = getDb();
    db.run(
        'UPDATE environments SET name = ?, variables_json = ?, updated_at = ? WHERE id = ?',
        [env.name, JSON.stringify(env.variables), Date.now(), env.id]
    );
    saveDatabase();
}

export function deleteEnvironment(id: string): void {
    const db = getDb();
    db.run('DELETE FROM environments WHERE id = ?', [id]);
    saveDatabase();
}

// ─── Global Variables ────────────────────────────────────────────

export function getGlobalVariables(): Variable[] {
    const db = getDb();
    const result = db.exec('SELECT variables_json FROM global_variables WHERE id = 1');
    if (result.length === 0) return [];
    return JSON.parse(result[0].values[0][0] as string);
}

export function setGlobalVariables(vars: Variable[]): void {
    const db = getDb();
    db.run('UPDATE global_variables SET variables_json = ? WHERE id = 1', [JSON.stringify(vars)]);
    saveDatabase();
}

/**
 * Apply variable updates emitted by the script sandbox (`__env_` or `__global_` prefixes)
 * to the persistent database.
 */
export function applyVariableUpdates(
    updatedVariables: Record<string, string>,
    activeEnv?: Environment
): void {
    if (!updatedVariables) return;

    let envChanged = false;
    let globalChanged = false;

    let envVars = activeEnv ? [...activeEnv.variables] : [];
    let globalVars = getGlobalVariables();

    for (const [key, value] of Object.entries(updatedVariables)) {
        if (key.startsWith('__env_') && activeEnv) {
            const actualKey = key.substring(6);
            const existingIdx = envVars.findIndex(v => v.key === actualKey);
            if (existingIdx >= 0) {
                envVars[existingIdx] = { ...envVars[existingIdx], value };
            } else {
                envVars.push({ id: uuidv4(), key: actualKey, value, enabled: true });
            }
            envChanged = true;
        } else if (key.startsWith('__global_')) {
            const actualKey = key.substring(9);
            const existingIdx = globalVars.findIndex(v => v.key === actualKey);
            if (existingIdx >= 0) {
                globalVars[existingIdx] = { ...globalVars[existingIdx], value };
            } else {
                globalVars.push({ id: uuidv4(), key: actualKey, value, enabled: true });
            }
            globalChanged = true;
        }
    }

    if (envChanged && activeEnv) {
        updateEnvironment({ ...activeEnv, variables: envVars });
        // Update the activeEnv object in place for immediate subsequent interpolations
        activeEnv.variables = envVars; 
    }

    if (globalChanged) {
        setGlobalVariables(globalVars);
    }
}
