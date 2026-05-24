import { GoalType } from '../models/database.types';

export interface HistoricalLog {
    id?: string;
    created_at: string;
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    weight: number | null;
}

export interface TrackSummary {
    goalType: GoalType;
    durationWeeks: number;
    averageDelta: {
        proteinPct: number;
        carbsPct: number;
        fatsPct: number;
        caloriesPct: number;
    };
}

export class AdaptiveProtocolParser {
    /**
     * Computes the overall track summary for an experiential array of logs.
     * Evaluates trajectory, duration, and percentage delta across macros.
     */
    static calculate_experiential_track_summary(logs: HistoricalLog[]): TrackSummary | null {
        if (!logs || logs.length === 0) return null;

        const sortedLogs = [...logs].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const startLog = sortedLogs[0];
        const endLog = sortedLogs[sortedLogs.length - 1];

        // 1. Evaluate Trajectory
        let goalType: GoalType = 'MAINTENANCE';
        
        const startWeightLog = sortedLogs.find(l => l.weight !== null && l.weight > 0);
        const endWeightLog = [...sortedLogs].reverse().find(l => l.weight !== null && l.weight > 0);

        if (startWeightLog && endWeightLog && startWeightLog.weight && endWeightLog.weight) {
            const weightDelta = endWeightLog.weight - startWeightLog.weight;
            // Classify based on a 1.0 lb threshold for stable maintenance
            if (weightDelta <= -1.0) {
                goalType = 'CUT';
            } else if (weightDelta >= 1.0) {
                goalType = 'BULK';
            } else {
                goalType = 'MAINTENANCE';
            }
        }

        // 2. Calculate Duration Weeks
        const startTime = new Date(startLog.created_at).getTime();
        const endTime = new Date(endLog.created_at).getTime();
        const durationWeeks = Math.max(1, Math.round((endTime - startTime) / (1000 * 3600 * 24 * 7)));

        // 3. Compute the overall trajectory performance metric (% Δ)
        const calcPct = (start: number, end: number) => {
            if (start === 0 && end === 0) return 0;
            if (start === 0) return 100;
            return ((end - start) / start) * 100;
        };

        return {
            goalType,
            durationWeeks,
            averageDelta: {
                proteinPct: calcPct(startLog.protein, endLog.protein),
                carbsPct: calcPct(startLog.carbs, endLog.carbs),
                fatsPct: calcPct(startLog.fats, endLog.fats),
                caloriesPct: calcPct(startLog.calories, endLog.calories)
            }
        };
    }

    /**
     * Computational pipeline worker scanning timeline prior to compiling.
     * Evaluates sequential changes inside rolling 5-day windows.
     * - Caloric difference < 7.5%: Flatten into one checkpoint.
     * - Caloric difference >= 7.5%: Suspend flattening, output as distinct standalone checkpoints.
     * 
     * @param logs Array of raw historical logs.
     * @returns Array of parsed/collapsed checkpoints.
     */
    static parseExperientialLogs(logs: HistoricalLog[]): HistoricalLog[] {
        if (!logs || logs.length === 0) return [];

        const sortedLogs = [...logs].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const checkpoints: HistoricalLog[] = [];
        let currentWindowStart = sortedLogs[0];
        let lastLog = sortedLogs[0];

        for (let i = 1; i < sortedLogs.length; i++) {
            const currentLog = sortedLogs[i];

            const prevCals = lastLog.calories > 0 ? lastLog.calories : 1;
            const variance = Math.abs(currentLog.calories - lastLog.calories) / prevCals;
            
            const daysSinceWindowStart = (new Date(currentLog.created_at).getTime() - new Date(currentWindowStart.created_at).getTime()) / (1000 * 3600 * 24);

            if (variance < 0.075 && daysSinceWindowStart <= 5) {
                // Collapse: update the last log but don't break the window
                lastLog = currentLog;
            } else {
                // Break: save the last log as a checkpoint, start new window
                checkpoints.push(lastLog);
                currentWindowStart = currentLog;
                lastLog = currentLog;
            }
        }

        // Commit the final active window
        if (checkpoints.length === 0 || checkpoints[checkpoints.length - 1] !== lastLog) {
            checkpoints.push(lastLog);
        }

        return checkpoints;
    }
}
