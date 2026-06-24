import { getAllEnvironments, updateEnvironment } from '../services/environment-service';
import { Variable } from '@api-platform/core';

export class EnvironmentManager {
    private envId: string | null;
    private variables: Record<string, string> = {};
    private isModified: boolean = false;
    private persistVariables: boolean = false;

    constructor(envId: string | null, persistVariables: boolean = false) {
        this.envId = envId;
        this.persistVariables = persistVariables;
        
        if (envId) {
            const env = getAllEnvironments().find(e => e.id === envId);
            if (env) {
                // Convert array of Variables to a dictionary
                for (const v of env.variables) {
                    if (v.enabled) {
                        this.variables[v.key] = v.value;
                    }
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
        if (!this.envId || !this.isModified || !this.persistVariables) return;

        const env = getAllEnvironments().find(e => e.id === this.envId);
        if (!env) return;

        // Merge runtime modifications with existing variables
        // We preserve existing disabled variables, but update values of enabled ones
        const mergedVariables: Variable[] = [];
        const seenKeys = new Set<string>();

        // Update existing ones
        for (const v of env.variables) {
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

        updateEnvironment({ ...env, variables: mergedVariables });
        this.isModified = false;
    }
}
