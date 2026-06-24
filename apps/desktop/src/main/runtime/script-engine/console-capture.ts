import { ConsoleEntry } from '@api-platform/core';

export class ConsoleCapture {
    private entries: ConsoleEntry[] = [];

    public getEntries(): ConsoleEntry[] {
        return this.entries;
    }

    public clear(): void {
        this.entries = [];
    }

    public createSandboxConsole() {
        const capture = (level: ConsoleEntry['level'], args: any[]) => {
            this.entries.push({
                level,
                args: args.map(this.formatArg),
                timestamp: Date.now()
            });
            
            // Also log to the main process console for debugging the app itself
            if (process.env.DEBUG_SCRIPTS) {
                console[level](`[Sandbox ${level.toUpperCase()}]`, ...args);
            }
        };

        return {
            log: (...args: any[]) => capture('log', args),
            info: (...args: any[]) => capture('info', args),
            warn: (...args: any[]) => capture('warn', args),
            error: (...args: any[]) => capture('error', args),
            clear: () => this.clear()
        };
    }

    private formatArg(arg: any): string {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
            try { 
                return JSON.stringify(arg, null, 2); 
            } catch { 
                return String(arg); 
            }
        }
        return String(arg);
    }
}
