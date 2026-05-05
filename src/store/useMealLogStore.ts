import { create } from 'zustand';
import { Ingredient } from '../shared/models/types';

interface MealLogState {
    cartItems: Ingredient[];
    capturedMedia: { uri: string; type: 'image' | 'video' } | null;
    addItem: (item: Ingredient) => void;
    updateItem: (id: string, updates: Partial<Ingredient>) => void;
    removeItem: (id: string) => void;
    setCapturedMedia: (media: { uri: string; type: 'image' | 'video' } | null) => void;
    clear: () => void;
}

export const useMealLogStore = create<MealLogState>((set) => ({
    cartItems: [],
    capturedMedia: null,
    addItem: (item) => set((state) => ({ cartItems: [...state.cartItems, item] })),
    updateItem: (id, updates) => set((state) => ({
        cartItems: state.cartItems.map((i) => i.id === id ? { ...i, ...updates } : i)
    })),
    removeItem: (id) => set((state) => ({ cartItems: state.cartItems.filter((i) => i.id !== id) })),
    setCapturedMedia: (media) => set({ capturedMedia: media }),
    clear: () => set({ cartItems: [], capturedMedia: null }),
}));
