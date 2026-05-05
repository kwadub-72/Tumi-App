import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface MacrobookEntry {
    id: string;
    label: string;
    calories: number;
    p: number;
    c: number;
    f: number;
    savedAt: string;
}

interface MacrobookState {
    entries: MacrobookEntry[];
    addEntry: (entry: Omit<MacrobookEntry, 'id' | 'savedAt'>) => void;
    removeEntry: (id: string) => void;
}

export const useMacrobookStore = create<MacrobookState>()(
    persist(
        (set, get) => ({
            entries: [],

            addEntry: (data) => {
                const entry: MacrobookEntry = {
                    ...data,
                    id: Math.random().toString(36).substring(7),
                    savedAt: new Date().toISOString(),
                };
                set((s) => ({ entries: [entry, ...s.entries] }));
            },

            removeEntry: (id) =>
                set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
        }),
        {
            name: 'macrobook-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
