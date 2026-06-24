import { create } from 'zustand';
import { RunnerConfig, RunnerResult, RunnerItemResult, CsvParseResult } from '@api-platform/core';

interface RunnerStore {
    // State
    isRunning: boolean;
    isOpen: boolean;
    collectionId: string | null;
    folderId: string | null;
    folderName: string | null;
    config: RunnerConfig;
    progress: { current: number; total: number; itemName: string } | null;
    result: RunnerResult | null;
    liveResults: RunnerItemResult[];
    expandedItems: Set<number>;

    // Enhanced results state
    selectedItemIndex: number | null;
    resultFilter: 'all' | 'passed' | 'failed';
    responseSearchQuery: string;

    // CSV state
    csvFileName: string | null;
    csvFileSize: number | null;
    csvRawContent: string | null;
    csvData: CsvParseResult | null;
    csvError: string | null;

    // Actions
    openRunner: (collectionId?: string, folderId?: string, folderName?: string) => void;
    closeRunner: () => void;
    updateConfig: (partial: Partial<RunnerConfig>) => void;
    setRunning: (running: boolean) => void;
    setProgress: (p: { current: number; total: number; itemName: string } | null) => void;
    setResult: (r: RunnerResult | null) => void;
    addLiveResult: (item: RunnerItemResult) => void;
    toggleItem: (idx: number) => void;
    expandAll: () => void;
    collapseAll: () => void;
    reset: () => void;

    // Enhanced results actions
    setSelectedItem: (idx: number | null) => void;
    setResultFilter: (filter: 'all' | 'passed' | 'failed') => void;
    setResponseSearchQuery: (query: string) => void;

    // CSV actions
    setCsvFile: (fileName: string, fileSize: number, rawContent: string, parsed: CsvParseResult) => void;
    setCsvError: (error: string) => void;
    clearCsv: () => void;
}

// Maximum number of live results to keep in memory to prevent unbounded growth.
// Each result contains full request+response data, so this caps memory usage.
const MAX_LIVE_RESULTS = 500;

const defaultConfig: RunnerConfig = {
    collectionId: '',
    iterations: 1,
    delayMs: 0,
    stopOnError: false,
};

export const useRunnerStore = create<RunnerStore>((set, get) => ({
    isRunning: false,
    isOpen: false,
    collectionId: null,
    folderId: null,
    folderName: null,
    config: { ...defaultConfig },
    progress: null,
    result: null,
    liveResults: [],
    expandedItems: new Set<number>(),

    // Enhanced results state
    selectedItemIndex: null,
    resultFilter: 'all' as const,
    responseSearchQuery: '',

    // CSV state
    csvFileName: null,
    csvFileSize: null,
    csvRawContent: null,
    csvData: null,
    csvError: null,

    openRunner: (collectionId?: string, folderId?: string, folderName?: string) => {
        set({
            isOpen: true,
            collectionId: collectionId || null,
            folderId: folderId || null,
            folderName: folderName || null,
            config: {
                ...defaultConfig,
                collectionId: collectionId || '',
                folderId: folderId || undefined,
            },
            result: null,
            liveResults: [],
            progress: null,
            isRunning: false,
            expandedItems: new Set(),
            // Reset CSV state
            csvFileName: null,
            csvFileSize: null,
            csvRawContent: null,
            csvData: null,
            csvError: null,
        });
    },

    closeRunner: () => {
        set({
            isOpen: false,
            isRunning: false,
            result: null,
            liveResults: [],
            progress: null,
            expandedItems: new Set(),
            folderId: null,
            folderName: null,
            csvFileName: null,
            csvFileSize: null,
            csvRawContent: null,
            csvData: null,
            csvError: null,
        });
    },

    updateConfig: (partial) => {
        const { config } = get();
        set({ config: { ...config, ...partial } });
    },

    setRunning: (running) => {
        if (running) {
            set({ isRunning: true, result: null, liveResults: [], expandedItems: new Set() });
        } else {
            set({ isRunning: false });
        }
    },

    setProgress: (p) => set({ progress: p }),

    setResult: (r) => set({ result: r, isRunning: false, progress: null }),

    addLiveResult: (item) => {
        set((state) => {
            const updated = [...state.liveResults, item];
            // Cap live results to prevent unbounded memory growth
            return {
                liveResults: updated.length > MAX_LIVE_RESULTS
                    ? updated.slice(updated.length - MAX_LIVE_RESULTS)
                    : updated,
            };
        });
    },

    toggleItem: (idx) => {
        set((state) => {
            const next = new Set(state.expandedItems);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return { expandedItems: next };
        });
    },

    expandAll: () => {
        const { result, liveResults } = get();
        const items = result?.results || liveResults;
        const all = new Set(items.map((_, i) => i));
        set({ expandedItems: all });
    },

    collapseAll: () => {
        set({ expandedItems: new Set() });
    },

    setSelectedItem: (idx) => set({ selectedItemIndex: idx }),
    setResultFilter: (filter) => set({ resultFilter: filter }),
    setResponseSearchQuery: (query) => set({ responseSearchQuery: query }),

    reset: () => {
        set({
            result: null,
            liveResults: [],
            progress: null,
            isRunning: false,
            expandedItems: new Set(),
            selectedItemIndex: null,
            resultFilter: 'all' as const,
            responseSearchQuery: '',
        });
    },

    // ── CSV Actions ──

    setCsvFile: (fileName, fileSize, rawContent, parsed) => {
        const { config } = get();
        set({
            csvFileName: fileName,
            csvFileSize: fileSize,
            csvRawContent: rawContent,
            csvData: parsed,
            csvError: null,
            // Auto-set iterations to CSV row count
            config: {
                ...config,
                iterations: parsed.totalRows,
                csvData: rawContent,
            },
        });
    },

    setCsvError: (error) => {
        set({
            csvError: error,
            csvData: null,
            csvRawContent: null,
        });
    },

    clearCsv: () => {
        const { config } = get();
        set({
            csvFileName: null,
            csvFileSize: null,
            csvRawContent: null,
            csvData: null,
            csvError: null,
            config: {
                ...config,
                iterations: 1,
                csvData: undefined,
            },
        });
    },
}));
