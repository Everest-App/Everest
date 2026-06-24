/**
 * Postman Script Extraction & Merging Utilities
 *
 * Handles parsing of Postman `event` arrays and merging scripts
 * for hierarchical execution (collection → folder → request).
 */

export interface ExtractedScripts {
    preRequestScript: string;
    testScript: string;
}

/**
 * Extract pre-request and test scripts from a Postman `event` array.
 *
 * Each event has the shape:
 * ```json
 * {
 *   "listen": "prerequest" | "test",
 *   "script": { "exec": ["line1", "line2", ...] }
 * }
 * ```
 *
 * Multiple events with the same `listen` type are merged.
 * Empty `exec` arrays and missing fields are safely handled.
 */
export function extractScriptsFromEvents(events: any[] | undefined | null): ExtractedScripts {
    const result: ExtractedScripts = {
        preRequestScript: '',
        testScript: '',
    };

    if (!events || !Array.isArray(events)) return result;

    const preRequestParts: string[] = [];
    const testParts: string[] = [];

    for (const event of events) {
        if (!event || typeof event !== 'object') continue;

        const listen = event.listen;
        const exec = event.script?.exec;

        // exec can be a string array or sometimes a single string
        let scriptText = '';
        if (Array.isArray(exec)) {
            // Filter out null/undefined entries and join
            scriptText = exec.filter((line: any) => line != null).join('\n');
        } else if (typeof exec === 'string') {
            scriptText = exec;
        }

        if (!scriptText) continue;

        if (listen === 'prerequest') {
            preRequestParts.push(scriptText);
        } else if (listen === 'test') {
            testParts.push(scriptText);
        }
    }
    // Wrap each part in an IIFE to prevent variable collisions when multiple
    // events of the same type exist (e.g., two "test" events in a Postman export).
    const wrapParts = (parts: string[]): string => {
        const nonEmpty = parts.filter(p => p.trim().length > 0);
        if (nonEmpty.length === 0) return '';
        if (nonEmpty.length === 1) return nonEmpty[0];
        return nonEmpty.map(p => `(function(){\n${p}\n})();`).join('\n\n');
    };

    result.preRequestScript = wrapParts(preRequestParts);
    result.testScript = wrapParts(testParts);

    return result;
}

/**
 * Merge multiple script strings into a single script.
 * Used to compose hierarchical scripts (e.g. collection + folder + request).
 *
 * Each script segment is wrapped in an IIFE (Immediately Invoked Function
 * Expression) so that `const` / `let` declarations in one segment do NOT
 * leak into or collide with declarations in another segment.  The outer
 * VM sandbox globals (`pm`, `console`, `JSON`, …) are still visible because
 * they live on the context object, not in any function scope.
 *
 * - Empty/falsy strings are skipped.
 * - Non-empty scripts are wrapped and separated by double newlines.
 */
export function mergeScripts(...scripts: (string | undefined | null)[]): string {
    return scripts
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map(s => `(function(){\n${s}\n})();`)
        .join('\n\n');
}

/**
 * Convert a script string back to Postman `exec` array format.
 * Used during export.
 */
export function scriptToExecArray(script: string): string[] {
    if (!script) return [];
    return script.split('\n');
}

/**
 * Build Postman `event` array from pre-request and test scripts.
 * Used during export to reconstruct the Postman format.
 */
export function buildPostmanEvents(preRequestScript?: string, testScript?: string): any[] | undefined {
    const events: any[] = [];

    if (preRequestScript && preRequestScript.trim()) {
        events.push({
            listen: 'prerequest',
            script: {
                type: 'text/javascript',
                exec: scriptToExecArray(preRequestScript),
            },
        });
    }

    if (testScript && testScript.trim()) {
        events.push({
            listen: 'test',
            script: {
                type: 'text/javascript',
                exec: scriptToExecArray(testScript),
            },
        });
    }

    return events.length > 0 ? events : undefined;
}
