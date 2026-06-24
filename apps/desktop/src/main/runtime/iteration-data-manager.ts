import { parseCsv } from '@api-platform/core';
import * as fs from 'fs';

export class IterationDataManager {
    private data: Record<string, any>[] = [];
    private currentIndex: number = 0;

    constructor() {
        // Initialize empty
    }

    public loadFromCsv(csvContent: string): void {
        const parsed = parseCsv(csvContent);
        if (parsed.errors && parsed.errors.length > 0 && parsed.rows.length === 0) {
            throw new Error(`Failed to parse CSV data: ${parsed.errors[0].message}`);
        }
        this.data = parsed.rows;
        this.currentIndex = 0;
    }

    public loadFromJson(jsonContent: string): void {
        try {
            const parsed = JSON.parse(jsonContent);
            if (!Array.isArray(parsed)) {
                throw new Error('JSON data source must be an array of objects');
            }
            this.data = parsed;
            this.currentIndex = 0;
        } catch (e: any) {
            throw new Error(`Failed to parse JSON data: ${e.message}`);
        }
    }

    public loadFromFile(filePath: string): void {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (filePath.toLowerCase().endsWith('.json')) {
            this.loadFromJson(content);
        } else {
            this.loadFromCsv(content);
        }
    }

    public setIteration(index: number): void {
        if (index >= 0 && index < this.data.length) {
            this.currentIndex = index;
        } else if (this.data.length === 0) {
            this.currentIndex = 0;
        } else {
            throw new Error(`Iteration index ${index} out of bounds`);
        }
    }

    public getCurrentRow(): Record<string, any> {
        if (this.data.length === 0) return {};
        return this.data[this.currentIndex] || {};
    }

    public getTotalRows(): number {
        return Math.max(1, this.data.length); // At least 1 iteration even if no data
    }
}
