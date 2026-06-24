import { getAllCollections } from '../services/collection-service';
import { getDb, saveDatabase } from '../storage/database';
import { Variable } from '@api-platform/core';

export class CollectionVariableManager {
    private collectionId: string;
    private variables: Record<string, string> = {};
    private isModified: boolean = false;
    private persistVariables: boolean = false;

    constructor(collectionId: string, persistVariables: boolean = false) {
        this.collectionId = collectionId;
        this.persistVariables = persistVariables;
        
        // Find collection variables
        const collection = getAllCollections().find(c => c.id === collectionId);
        if (collection && collection.variables) {
            for (const v of collection.variables) {
                if (v.enabled) {
                    this.variables[v.key] = v.value;
                }
            }
        }
    }

    public getVariables(): Record<string, string> {
        return this.variables;
    }

    public set(key: string, value: string) {
        this.variables[key] = value;
        this.isModified = true;
    }

    public unset(key: string) {
        if (key in this.variables) {
            delete this.variables[key];
            this.isModified = true;
        }
    }

    public async flushToDatabase() {
        if (!this.isModified || !this.persistVariables) return;

        const db = getDb();
        const collectionRows = db.exec('SELECT variables_json FROM collections WHERE id = ?', [this.collectionId]);
        
        if (collectionRows.length === 0 || collectionRows[0].values.length === 0) return;
        
        const existingVars: Variable[] = JSON.parse((collectionRows[0].values[0][0] as string) || '[]');
        
        const mergedVariables: Variable[] = [];
        const seenKeys = new Set<string>();

        // Update existing ones
        for (const v of existingVars) {
            if (v.enabled && v.key in this.variables) {
                mergedVariables.push({ ...v, value: this.variables[v.key] });
            } else if (v.enabled && !(v.key in this.variables)) {
                // It was unset during run
            } else {
                // Keep disabled ones
                mergedVariables.push(v);
            }
            seenKeys.add(v.key);
        }

        // Add newly created ones
        for (const [key, value] of Object.entries(this.variables)) {
            if (!seenKeys.has(key)) {
                mergedVariables.push({
                    id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    key,
                    value,
                    enabled: true
                });
            }
        }

        db.run('UPDATE collections SET variables_json = ?, updated_at = ? WHERE id = ?', [
            JSON.stringify(mergedVariables),
            Date.now(),
            this.collectionId
        ]);
        
        saveDatabase();
        this.isModified = false;
    }
}
