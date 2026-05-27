export interface DailyWeightLog {
    local_date: string; // e.g., "2026-05-17"
    weight: number;
}

/**
 * Calculates the average weekly weight based on an array of daily logs.
 * The Math: SUM(logged_weights) / COUNT(logged_days)
 * Note: Does not blindly divide by 7. Missing days are naturally skipped.
 * 
 * @param logs Array of daily weight logs
 * @param weekStartLocal Sunday date string in local timezone (YYYY-MM-DD)
 * @param weekEndLocal Saturday date string in local timezone (YYYY-MM-DD)
 * @returns Average weight rounded to 2 decimals, or null if no logs exist for the week.
 */
export function calculate_weekly_weight(logs: DailyWeightLog[], weekStartLocal: string, weekEndLocal: string): number | null {
    // Filter logs strictly within the Sunday-Saturday boundary (inclusive)
    const weekLogs = logs.filter(log => 
        log.local_date >= weekStartLocal && 
        log.local_date <= weekEndLocal && 
        log.weight > 0
    );

    if (weekLogs.length === 0) return null;

    // Sum and count only the logged days
    const sum = weekLogs.reduce((acc, curr) => acc + curr.weight, 0);
    const avg = sum / weekLogs.length;

    return Number(avg.toFixed(2));
}
