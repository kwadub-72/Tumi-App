import { SupabaseWeightService } from '../src/shared/services/SupabaseWeightService';
import { supabase } from '../src/shared/services/supabase';

export interface WeightEntry {
    date: string; // YYYY-MM-DD format
    weight: number;
    timestamp: number;
}

type Listener = (weights: WeightEntry[]) => void;
let listeners: Listener[] = [];

export const WeightStore = {
    async loadWeights(): Promise<WeightEntry[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return [];
        
        const weights = await SupabaseWeightService.getWeights(session.user.id);
        return weights.map(w => ({
            date: w.date,
            weight: w.weight,
            timestamp: new Date(w.date + 'T12:00:00').getTime()
        }));
    },

    async addWeight(entry: WeightEntry): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        await SupabaseWeightService.addWeight(session.user.id, entry.weight, entry.date);
        const weights = await this.loadWeights();
        listeners.forEach(l => l(weights));
    },

    async clearWeights(): Promise<void> {
        // We typically don't want to clear all weights from DB accidentally, 
        // but if needed, we'd need a delete-all method. 
        // For now, we'll just skip this or implement if requested.
    },

    async deleteWeight(date: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        await SupabaseWeightService.deleteWeight(session.user.id, date);
        const weights = await this.loadWeights();
        listeners.forEach(l => l(weights));
    },

    async getEstimatedWeight(): Promise<number | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return null;
        return SupabaseWeightService.getEstimatedWeight(session.user.id);
    },

    subscribe(listener: Listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};
