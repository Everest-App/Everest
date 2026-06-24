/**
 * Search utilities for collections and environments.
 * All search functions are pure and designed for memoization.
 */
import { Collection, CollectionItem, Variable } from '@api-platform/core';

// ─── Match Metadata ──────────────────────────────────────────────
export interface TextSegment {
    text: string;
    highlight: boolean;
}

export interface SearchMatch {
    field: string;   // which field matched (name, url, key, value, etc.)
    segments: TextSegment[];
}

export interface MatchedCollectionItem extends CollectionItem {
    matches: SearchMatch[];
    matchedChildren?: MatchedCollectionItem[];
}

export interface MatchedCollection {
    collection: Collection;
    matches: SearchMatch[];           // matches on collection name itself
    matchedItems: MatchedCollectionItem[];
}

export interface MatchedVariable extends Variable {
    matches: SearchMatch[];
}

// ─── Highlight Text ─────────────────────────────────────────────
/**
 * Split text into segments with highlight markers.
 * Case-insensitive matching.
 */
export function highlightText(text: string, query: string): TextSegment[] {
    if (!query || !text) return [{ text, highlight: false }];

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const segments: TextSegment[] = [];
    let lastIndex = 0;

    let idx = lowerText.indexOf(lowerQuery, lastIndex);
    while (idx !== -1) {
        if (idx > lastIndex) {
            segments.push({ text: text.slice(lastIndex, idx), highlight: false });
        }
        segments.push({ text: text.slice(idx, idx + query.length), highlight: true });
        lastIndex = idx + query.length;
        idx = lowerText.indexOf(lowerQuery, lastIndex);
    }

    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), highlight: false });
    }

    return segments.length > 0 ? segments : [{ text, highlight: false }];
}

// ─── Text Match Check ───────────────────────────────────────────
function matchesQuery(text: string | undefined, query: string): boolean {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
}

// ─── Search Collection Item ─────────────────────────────────────
function searchItem(item: CollectionItem, query: string): MatchedCollectionItem | null {
    const matches: SearchMatch[] = [];

    // Match item name
    if (matchesQuery(item.name, query)) {
        matches.push({ field: 'name', segments: highlightText(item.name, query) });
    }

    // Match request URL
    if (item.type === 'request' && item.request?.url && matchesQuery(item.request.url, query)) {
        matches.push({ field: 'url', segments: highlightText(item.request.url, query) });
    }

    // Match request method
    if (item.type === 'request' && item.request?.method && matchesQuery(item.request.method, query)) {
        matches.push({ field: 'method', segments: highlightText(item.request.method, query) });
    }

    // Match param names
    if (item.type === 'request' && item.request?.params) {
        for (const p of item.request.params) {
            if (matchesQuery(p.key, query)) {
                matches.push({ field: 'param', segments: highlightText(p.key, query) });
                break; // one match is enough
            }
        }
    }

    // Recurse into children for folders
    let matchedChildren: MatchedCollectionItem[] = [];
    if (item.children && item.children.length > 0) {
        matchedChildren = item.children
            .map(child => searchItem(child, query))
            .filter((c): c is MatchedCollectionItem => c !== null);
    }

    // Include item if it matches directly or has matching children
    if (matches.length > 0 || matchedChildren.length > 0) {
        return {
            ...item,
            matches,
            matchedChildren: matchedChildren.length > 0 ? matchedChildren : undefined,
            children: matchedChildren.length > 0
                ? matchedChildren
                : item.children,
        };
    }

    return null;
}

// ─── Search Collections ─────────────────────────────────────────
/**
 * Filter and annotate collections matching the query.
 * Returns only collections/items that match, with highlight metadata.
 */
export function searchCollections(collections: Collection[], query: string): MatchedCollection[] {
    if (!query.trim()) return [];

    const q = query.trim();
    const results: MatchedCollection[] = [];

    for (const col of collections) {
        const collectionMatches: SearchMatch[] = [];

        // Match collection name
        if (matchesQuery(col.name, q)) {
            collectionMatches.push({ field: 'name', segments: highlightText(col.name, q) });
        }

        // Match collection description
        if (matchesQuery(col.description, q)) {
            collectionMatches.push({ field: 'description', segments: highlightText(col.description || '', q) });
        }

        // Build tree first, then search
        const tree = buildTree(col.items);
        const matchedItems = tree
            .map(item => searchItem(item, q))
            .filter((i): i is MatchedCollectionItem => i !== null);

        if (collectionMatches.length > 0 || matchedItems.length > 0) {
            results.push({
                collection: col,
                matches: collectionMatches,
                matchedItems,
            });
        }
    }

    return results;
}

// ─── Build Tree (reusable) ──────────────────────────────────────
export function buildTree(items: CollectionItem[]): CollectionItem[] {
    const map = new Map<string, CollectionItem>();
    const roots: CollectionItem[] = [];
    for (const item of items) map.set(item.id, { ...item, children: [] });
    for (const item of items) {
        const node = map.get(item.id)!;
        if (item.parentId && map.has(item.parentId)) {
            map.get(item.parentId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

// ─── Search Variables ───────────────────────────────────────────
/**
 * Filter variables matching the query in key or value.
 */
export function searchVariables(variables: Variable[], query: string): MatchedVariable[] {
    if (!query.trim()) return [];

    const q = query.trim();
    return variables
        .filter(v => matchesQuery(v.key, q) || matchesQuery(v.value, q))
        .map(v => ({
            ...v,
            matches: [
                ...(matchesQuery(v.key, q)
                    ? [{ field: 'key', segments: highlightText(v.key, q) }]
                    : []),
                ...(matchesQuery(v.value, q)
                    ? [{ field: 'value', segments: highlightText(v.value, q) }]
                    : []),
            ],
        }));
}
