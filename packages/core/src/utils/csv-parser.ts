/**
 * Lightweight CSV parser — zero external dependencies.
 * Handles:
 *   - Quoted fields (RFC 4180)
 *   - Commas inside quotes
 *   - Escaped quotes ("")
 *   - BOM stripping (UTF-8 / UTF-16)
 *   - Empty rows
 *   - Inconsistent column counts
 *   - Clear user-friendly error messages
 */

export interface CsvParseResult {
    /** Column names from the header row */
    headers: string[];
    /** Each row as a key-value map (header → value) */
    rows: Record<string, string>[];
    /** Total number of data rows (excluding header) */
    totalRows: number;
    /** Parse errors / warnings */
    errors: CsvParseError[];
}

export interface CsvParseError {
    /** 1-based row number (0 = header) */
    row: number;
    /** Human-readable error description */
    message: string;
}

/**
 * Parse a raw CSV string into structured data.
 *
 * @param content  Raw CSV file content (string)
 * @returns        Parsed result with headers, rows, and any errors
 */
export function parseCsv(content: string): CsvParseResult {
    const errors: CsvParseError[] = [];

    if (!content || typeof content !== 'string') {
        errors.push({ row: 0, message: 'CSV file is empty or unreadable' });
        return { headers: [], rows: [], totalRows: 0, errors };
    }

    // Strip BOM (UTF-8: EF BB BF, UTF-16 LE: FF FE, UTF-16 BE: FE FF)
    let cleaned = content;
    if (cleaned.charCodeAt(0) === 0xFEFF) {
        cleaned = cleaned.slice(1);
    }

    // Normalize line endings → \n
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Parse all rows (respecting quoted fields)
    const allRows = parseRows(cleaned);

    if (allRows.length === 0) {
        errors.push({ row: 0, message: 'CSV file is empty' });
        return { headers: [], rows: [], totalRows: 0, errors };
    }

    // First row = headers
    const headers = allRows[0].map(h => h.trim());

    if (headers.length === 0 || headers.every(h => h === '')) {
        errors.push({ row: 0, message: 'CSV file is missing header row' });
        return { headers: [], rows: [], totalRows: 0, errors };
    }

    // Check for duplicate headers
    const seen = new Set<string>();
    for (const h of headers) {
        if (h && seen.has(h)) {
            errors.push({ row: 0, message: `Duplicate column header: "${h}"` });
        }
        seen.add(h);
    }

    // Parse data rows
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < allRows.length; i++) {
        const fields = allRows[i];

        // Skip completely empty rows
        if (fields.length === 1 && fields[0].trim() === '') {
            continue;
        }

        // Warn about inconsistent column count
        if (fields.length !== headers.length) {
            errors.push({
                row: i,
                message: `Row ${i} has ${fields.length} columns, expected ${headers.length}`,
            });
        }

        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            if (key) {
                row[key] = j < fields.length ? fields[j] : '';
            }
        }
        rows.push(row);
    }

    if (rows.length === 0) {
        errors.push({ row: 0, message: 'CSV file contains no data rows' });
    }

    return {
        headers: headers.filter(h => h !== ''),
        rows,
        totalRows: rows.length,
        errors,
    };
}

/**
 * Parse CSV content into a 2D array of strings, correctly handling
 * quoted fields per RFC 4180.
 *
 * This processes the file character-by-character for reliability
 * and to avoid catastrophic backtracking in regex approaches.
 */
function parseRows(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                // Peek next character
                if (i + 1 < len && text[i + 1] === '"') {
                    // Escaped quote ""
                    currentField += '"';
                    i += 2;
                } else {
                    // End of quoted field
                    inQuotes = false;
                    i++;
                }
            } else {
                currentField += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                // Start of quoted field (only valid at start of field or after comma)
                inQuotes = true;
                i++;
            } else if (ch === ',') {
                // Field separator
                currentRow.push(currentField);
                currentField = '';
                i++;
            } else if (ch === '\n') {
                // Row separator
                currentRow.push(currentField);
                currentField = '';
                rows.push(currentRow);
                currentRow = [];
                i++;
            } else {
                currentField += ch;
                i++;
            }
        }
    }

    // Push the last field/row if there is content
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
}
