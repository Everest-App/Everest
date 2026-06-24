import { randomUUID as uuidv4 } from 'crypto';
import { getDb, saveDatabase } from '../storage/database';
import { HistoryEntry, RequestConfig, ResponseData } from '@api-platform/core';

// Maximum number of history entries to retain in the database.
// Each entry contains full request+response JSON, so this prevents unbounded DB growth.
const MAX_HISTORY_ENTRIES = 1000;

/**
 * Save a request/response pair to history.
 */
export function saveToHistory(request: RequestConfig, response: ResponseData): HistoryEntry {
    const db = getDb();
    const entry: HistoryEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        request,
        response,
    };

    db.run(
        `INSERT INTO history (id, timestamp, method, url, request_json, response_json, status, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            entry.id,
            entry.timestamp,
            request.method,
            request.url,
            JSON.stringify(request),
            JSON.stringify(response),
            response.status,
            response.time,
        ]
    );

    // Auto-cleanup: remove oldest entries beyond the retention limit
    db.run(
        `DELETE FROM history WHERE id NOT IN (
            SELECT id FROM history ORDER BY timestamp DESC LIMIT ?
        )`,
        [MAX_HISTORY_ENTRIES]
    );

    saveDatabase();
    return entry;
}

/**
 * Retrieve all history entries, most recent first.
 */
export function getAllHistory(): HistoryEntry[] {
    const db = getDb();
    const result = db.exec(`
    SELECT id, timestamp, request_json, response_json
    FROM history
    ORDER BY timestamp DESC
    LIMIT 500
  `);

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        timestamp: row[1] as number,
        request: JSON.parse(row[2] as string),
        response: JSON.parse(row[3] as string),
    }));
}

/**
 * Search history by URL or method.
 */
export function searchHistory(query: string): HistoryEntry[] {
    const db = getDb();
    const searchTerm = `%${query}%`;

    const stmt = db.prepare(`
    SELECT id, timestamp, request_json, response_json
    FROM history
    WHERE url LIKE ? OR method LIKE ?
    ORDER BY timestamp DESC
    LIMIT 100
  `);

    stmt.bind([searchTerm, searchTerm]);

    const entries: HistoryEntry[] = [];
    while (stmt.step()) {
        const row = stmt.get();
        entries.push({
            id: row[0] as string,
            timestamp: row[1] as number,
            request: JSON.parse(row[2] as string),
            response: JSON.parse(row[3] as string),
        });
    }
    stmt.free();

    return entries;
}

/**
 * Delete a single history entry.
 */
export function deleteHistoryEntry(id: string): void {
    const db = getDb();
    db.run('DELETE FROM history WHERE id = ?', [id]);
    saveDatabase();
}

/**
 * Clear all history.
 */
export function clearAllHistory(): void {
    const db = getDb();
    db.run('DELETE FROM history');
    saveDatabase();
}
