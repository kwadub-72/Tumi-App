import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeightEntry {
    date: string; // YYYY-MM-DD format
    weight: number;
    timestamp: number;
}

const STORAGE_KEY = 'forge_weights';

type Listener = (weights: WeightEntry[]) => void;
let listeners: Listener[] = [];

export const WeightStore = {
    async loadWeights(): Promise<WeightEntry[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load weights', e);
            return [];
        }
    },

    async saveWeights(weights: WeightEntry[]): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
        listeners.forEach(l => l(weights));
    },

    async addWeight(entry: WeightEntry): Promise<void> {
        const weights = await this.loadWeights();
        // Remove existing entry for the same date if any
        const filtered = weights.filter(w => w.date !== entry.date);
        const updated = [...filtered, entry].sort((a, b) => a.timestamp - b.timestamp);
        await this.saveWeights(updated);
    },

    async clearWeights(): Promise<void> {
        await this.saveWeights([]);
    },

    async deleteWeight(date: string): Promise<void> {
        const weights = await this.loadWeights();
        const updated = weights.filter(w => w.date !== date);
        await this.saveWeights(updated);
    },

    subscribe(listener: Listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};
