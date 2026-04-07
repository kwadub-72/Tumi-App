import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { USDAFoodItem } from '../shared/services/USDAFoodService';

export interface MealbookEntry extends USDAFoodItem {
    /** ISO timestamp of when this item was saved / logged */
    savedAt: string;
}

interface MealbookState {
    /** Bookmarked foods (from bookmark button on posts) */
    bookmarks: MealbookEntry[];
    /** Recently logged foods — most recent first */
    recents: MealbookEntry[];

    addBookmark: (food: USDAFoodItem) => void;
    removeBookmark: (fdcId: number) => void;
    isBookmarked: (fdcId: number) => boolean;

    addRecent: (food: USDAFoodItem) => void;
    clearRecents: () => void;
}

const MAX_RECENTS = 30;

export const useMealbookStore = create<MealbookState>()(
    persist(
        (set, get) => ({
            bookmarks: [],
            recents: [],

            addBookmark: (food) => {
                const existing = get().bookmarks.find((b) => b.fdcId === food.fdcId);
                if (existing) return; // already saved
                const entry: MealbookEntry = { ...food, savedAt: new Date().toISOString() };
                set((s) => ({ bookmarks: [entry, ...s.bookmarks] }));
            },

            removeBookmark: (fdcId) =>
                set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.fdcId !== fdcId) })),

            isBookmarked: (fdcId) => get().bookmarks.some((b) => b.fdcId === fdcId),

            addRecent: (food) => {
                const entry: MealbookEntry = { ...food, savedAt: new Date().toISOString() };
                set((s) => {
                    // Remove duplicate if already in recents, then prepend
                    const filtered = s.recents.filter((r) => r.fdcId !== food.fdcId);
                    return { recents: [entry, ...filtered].slice(0, MAX_RECENTS) };
                });
            },

            clearRecents: () => set({ recents: [] }),
        }),
        {
            name: 'mealbook-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
