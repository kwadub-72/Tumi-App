import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeeklyMetric {
    weekStartDate: string; // YYYY-MM-DD (Sunday)
    entryCount: number;
    averageWeight: number;
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
}

const STORAGE_KEY = 'tumi_weekly_metrics';

type Listener = (metrics: WeeklyMetric[]) => void;
let listeners: Listener[] = [];

// Seed data generation
const generateSeedData = (): WeeklyMetric[] => {
    const metrics: WeeklyMetric[] = [];
    // Current week: April 12, 2026 (Sunday)
    const baseDate = new Date('2026-04-12');

    for (let i = 0; i < 7; i++) { // Increased to 7 weeks total
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - (i * 7));
        const dateStr = date.toISOString().split('T')[0];

        // 235.0 lbs at i=0 (April 12), +2 for each week back
        const weight = 235.0 + (i * 2);
        // 200g carbs at i=0 (April 12), +25 for each week back
        const carbs = 200 + (i * 25);
        const protein = 240;
        const fat = 70;
        const calories = (protein * 4) + (carbs * 4) + (fat * 9);

        metrics.push({
            weekStartDate: dateStr,
            entryCount: i === 0 ? 3 : 7, // Current week has fewer entries
            averageWeight: weight,
            averageCalories: calories,
            averageProtein: protein,
            averageCarbs: carbs,
            averageFat: fat,
        });
    }

    return metrics.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
};

export const WeeklyMetricsStore = {
    async loadMetrics(): Promise<WeeklyMetric[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (!json) {
                const seed = generateSeedData();
                await this.saveMetrics(seed);
                return seed;
            }
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to load metrics', e);
            return [];
        }
    },

    async saveMetrics(metrics: WeeklyMetric[]): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
        listeners.forEach(l => l(metrics));
    },

    async addMetric(metric: WeeklyMetric): Promise<void> {
        const metrics = await this.loadMetrics();
        const filtered = metrics.filter(m => m.weekStartDate !== metric.weekStartDate);
        const updated = [...filtered, metric].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
        await this.saveMetrics(updated);
    },

    subscribe(listener: Listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};
