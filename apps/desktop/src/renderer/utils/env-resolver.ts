/**
 * Resolves environment variables from the active environment and globals.
 * Returns variable info for tooltip display.
 */
import { useEnvironmentStore } from '../store/environment-store';
import { Variable } from '@api-platform/core';

export interface ResolvedVariable {
    name: string;
    value: string;
    found: boolean;
    scope: 'environment' | 'global';
    environmentName: string;
}

export interface UrlToken {
    type: 'text' | 'variable';
    value: string;               // raw text or variable name (without braces)
    raw: string;                 // original text including {{ }}
    startIndex: number;
    endIndex: number;
}

/**
 * Tokenize a URL string into text and variable segments.
 * Variables are detected by the {{variableName}} pattern.
 */
export function tokenizeUrl(url: string): UrlToken[] {
    const tokens: UrlToken[] = [];
    const regex = /\{\{([^{}]+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(url)) !== null) {
        // Add text before this variable
        if (match.index > lastIndex) {
            tokens.push({
                type: 'text',
                value: url.slice(lastIndex, match.index),
                raw: url.slice(lastIndex, match.index),
                startIndex: lastIndex,
                endIndex: match.index,
            });
        }

        // Add variable token
        tokens.push({
            type: 'variable',
            value: match[1].trim(),
            raw: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < url.length) {
        tokens.push({
            type: 'text',
            value: url.slice(lastIndex),
            raw: url.slice(lastIndex),
            startIndex: lastIndex,
            endIndex: url.length,
        });
    }

    return tokens;
}

/**
 * Resolve a variable name against the current environment and global variables.
 */
export function resolveVariable(varName: string): ResolvedVariable {
    const store = useEnvironmentStore.getState();
    const { environments, activeEnvironmentId, globalVariables } = store;

    // First check active environment
    if (activeEnvironmentId) {
        const activeEnv = environments.find(e => e.id === activeEnvironmentId);
        if (activeEnv) {
            const variable = activeEnv.variables.find(
                v => v.key === varName && v.enabled
            );
            if (variable) {
                return {
                    name: varName,
                    value: variable.value,
                    found: true,
                    scope: 'environment',
                    environmentName: activeEnv.name,
                };
            }
        }
    }

    // Then check global variables
    const globalVar = globalVariables.find(v => v.key === varName && v.enabled);
    if (globalVar) {
        return {
            name: varName,
            value: globalVar.value,
            found: true,
            scope: 'global',
            environmentName: 'Global',
        };
    }

    // Not found
    return {
        name: varName,
        value: '',
        found: false,
        scope: 'environment',
        environmentName: activeEnvironmentId
            ? environments.find(e => e.id === activeEnvironmentId)?.name || 'None'
            : 'None',
    };
}

/**
 * Find the variable ID and environment ID for navigation.
 * Returns null if the variable doesn't exist.
 */
export function findVariableLocation(varName: string): {
    environmentId: string | null;
    variableId: string;
    isGlobal: boolean;
} | null {
    const store = useEnvironmentStore.getState();
    const { environments, activeEnvironmentId, globalVariables } = store;

    // Check active environment first
    if (activeEnvironmentId) {
        const activeEnv = environments.find(e => e.id === activeEnvironmentId);
        if (activeEnv) {
            const variable = activeEnv.variables.find(v => v.key === varName);
            if (variable) {
                return {
                    environmentId: activeEnvironmentId,
                    variableId: variable.id,
                    isGlobal: false,
                };
            }
        }
    }

    // Check globals
    const globalVar = globalVariables.find(v => v.key === varName);
    if (globalVar) {
        return {
            environmentId: null,
            variableId: globalVar.id,
            isGlobal: true,
        };
    }

    return null;
}
