import { create } from 'zustand';
import { HistoryEntry } from '@api-platform/core';

interface HistoryStore {
    entries: HistoryEntry[];
    loading: boolean;
    searchQuery: string;

    fetchHistory: () => Promise<void>;
    searchHistory: (query: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    deleteEntry: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
    entries: [],
    loading: false,
    searchQuery: '',

    fetchHistory: async () => {
        set({ loading: true });
        try {
            const entries = await window.api.getHistory();
            set({ entries, loading: false });
        } catch (error) {
            console.error('Failed to fetch history:', error);
            set({ loading: false });
        }
    },

    searchHistory: async (query: string) => {
        set({ loading: true, searchQuery: query });
        try {
            const entries = query
                ? await window.api.searchHistory(query)
                : await window.api.getHistory();
            set({ entries, loading: false });
        } catch (error) {
            console.error('Failed to search history:', error);
            set({ loading: false });
        }
    },

    setSearchQuery: (query: string) => {
        set({ searchQuery: query });
    },

    deleteEntry: async (id: string) => {
        try {
            await window.api.deleteHistoryEntry(id);
            set((state) => ({
                entries: state.entries.filter((e) => e.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete history entry:', error);
        }
    },

    clearAll: async () => {
        try {
            await window.api.clearHistory();
            set({ entries: [] });
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    },
}));
