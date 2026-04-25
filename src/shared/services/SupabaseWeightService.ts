import { supabase } from './supabase';

export interface WeightEntry {
  id?: string;
  user_id: string;
  weight: number;
  date: string; // YYYY-MM-DD
  created_at?: string;
}

export class SupabaseWeightService {
  static async getWeights(userId: string): Promise<WeightEntry[]> {
    const { data, error } = await supabase
      .from('weights')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching weights:', error);
      return [];
    }

    return data || [];
  }

  static async addWeight(userId: string, weight: number, date: string): Promise<void> {
    const { error } = await supabase
      .from('weights')
      .upsert({
        user_id: userId,
        weight,
        date
      }, { onConflict: 'user_id,date' });

    if (error) {
      console.error('Error adding weight:', error);
      throw error;
    }
  }

  static async deleteWeight(userId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('weights')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error deleting weight:', error);
      throw error;
    }
  }

  /**
   * Calculates the estimated weight for a user.
   * Logic: Average of the current week (Sun to now). 
   * If none, check previous week (Sun to Sat), and so on.
   */
  static async getEstimatedWeight(userId: string): Promise<number | null> {
    const weights = await this.getWeights(userId);
    if (weights.length === 0) return null;

    const today = new Date();
    // Normalize to start of today in local time
    today.setHours(0, 0, 0, 0);

    // Get the most recent Sunday
    let currentSun = new Date(today);
    currentSun.setDate(today.getDate() - today.getDay());

    // We search backwards week by week
    while (true) {
        const weekEnd = new Date(currentSun);
        weekEnd.setDate(currentSun.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Filter weights in this range [currentSun, weekEnd]
        // Note: weights are already sorted descending by date
        const weekWeights = weights.filter(w => {
            const d = new Date(w.date + 'T00:00:00'); // Ensure local date parsing
            return d >= currentSun && d <= weekEnd;
        });

        if (weekWeights.length > 0) {
            const sum = weekWeights.reduce((acc, curr) => acc + curr.weight, 0);
            return parseFloat((sum / weekWeights.length).toFixed(1));
        }

        // If we reach a date before the oldest entry, stop
        const oldestEntry = new Date(weights[weights.length - 1].date + 'T00:00:00');
        if (currentSun < oldestEntry) break;

        // Move to previous Sunday
        currentSun.setDate(currentSun.getDate() - 7);
    }

    return null;
  }
}
