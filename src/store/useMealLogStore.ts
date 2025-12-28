import { create } from 'zustand';
import { Ingredient } from '../shared/models/types';

interface MealLogState {
    cartItems: Ingredient[];
    addItem: (item: Ingredient) => void;
    removeItem: (id: string) => void;
    clear: () => void;
}

export const useMealLogStore = create<MealLogState>((set) => ({
    cartItems: [],
    addItem: (item) => set((state) => ({ cartItems: [...state.cartItems, item] })),
    removeItem: (id) => set((state) => ({ cartItems: state.cartItems.filter((i) => i.id !== id) })),
    clear: () => set({ cartItems: [] }),
}));
