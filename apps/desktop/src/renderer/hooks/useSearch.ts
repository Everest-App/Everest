/**
 * Search hooks with debounce and memoization.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Collection, Variable } from '@api-platform/core';
import {
    searchCollections,
    searchVariables,
    MatchedCollection,
    MatchedVariable,
} from '../utils/search-utils';

// ─── Debounced Value Hook ───────────────────────────────────────
export function useDebouncedValue<T>(value: T, delay: number = 200): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ─── Collection Search Hook ─────────────────────────────────────
export function useCollectionSearch(collections: Collection[], query: string) {
    const debouncedQuery = useDebouncedValue(query, 200);

    const results = useMemo(
        () => searchCollections(collections, debouncedQuery),
        [collections, debouncedQuery]
    );

    const isSearching = debouncedQuery.trim().length > 0;

    return { results, isSearching, debouncedQuery };
}

// ─── Variable Search Hook ───────────────────────────────────────
export function useVariableSearch(variables: Variable[], query: string) {
    const debouncedQuery = useDebouncedValue(query, 200);

    const results = useMemo(
        () => searchVariables(variables, debouncedQuery),
        [variables, debouncedQuery]
    );

    const isSearching = debouncedQuery.trim().length > 0;

    return { results, isSearching, debouncedQuery };
}
