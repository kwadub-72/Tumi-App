import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/shared/services/supabase';

export interface UserDailyMacroState {
    consumed: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
    targets: {
        calories: number;
        p: number;
        c: number;
        f: number;
    };
    hasMeals: boolean;
    hasWorkout: boolean;
    loading: boolean;
    refetch: () => Promise<void>;
}

export function useUserDailyMacros(userId?: string, date: Date = new Date()): UserDailyMacroState {
    const [consumed, setConsumed] = useState({ calories: 0, p: 0, c: 0, f: 0 });
    const [targets, setTargets] = useState({ calories: 2000, p: 150, c: 200, f: 60 });
    const [hasMeals, setHasMeals] = useState(false);
    const [hasWorkout, setHasWorkout] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUserMacrosAndTargets = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        try {
            // 1. Fetch user's profile targets and timezone
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('macro_targets, timezone')
                .eq('id', userId)
                .maybeSingle();

            if (profileErr) {
                console.error('[useUserDailyMacros] Profile fetch error:', profileErr);
            }

            let userTimezone = 'UTC';
            if (profile) {
                if (profile.timezone) {
                    userTimezone = profile.timezone;
                }
                if (profile.macro_targets) {
                    const rawTargets = profile.macro_targets as any;
                    const p = Number(rawTargets.p) || 150;
                    const c = Number(rawTargets.c) || 200;
                    const f = Number(rawTargets.f) || 60;
                    // Enforce the standard formula: (p*4) + (c*4) + (f*9)
                    const calories = (p * 4) + (c * 4) + (f * 9);
                    setTargets({ calories, p, c, f });
                }
            }

            // 2. Build local day bounds in UTC based on user timezone
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Generate range matching the day in user's timezone
            // Note: Since we want to match the AT TIME ZONE query in DB exactly,
            // we can calculate the UTC start and end bounds corresponding to that date Str.
            // E.g., for Date Str '2026-05-20' and Timezone 'UTC-5',
            // Day starts at '2026-05-20 00:00:00-05' = '2026-05-20T05:00:00Z'
            // and ends at '2026-05-20 23:59:59-05' = '2026-05-21T04:59:59Z'.
            // To be robust and simple, we construct start and end moments using standard timezone offset parsing:
            const tzOffsetExpr = new Intl.DateTimeFormat('en-US', {
                timeZone: userTimezone,
                timeZoneName: 'longOffset'
            }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value || 'GMT';
            
            // Format offset expression e.g. "GMT-5" or "GMT+5:30" or "GMT" to standard offset +/-hh:mm
            let offsetSign = '+';
            let offsetHours = 0;
            let offsetMinutes = 0;
            const match = tzOffsetExpr.match(/GMT([+-])(\d+)(?::(\d+))?/);
            if (match) {
                offsetSign = match[1];
                offsetHours = parseInt(match[2], 10);
                offsetMinutes = parseInt(match[3] || '0', 10);
            }
            
            const offsetStr = match ? `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}` : 'Z';
            
            const startISO = `${dateStr}T00:00:00${offsetStr === 'Z' ? 'Z' : offsetStr}`;
            const endISO = `${dateStr}T23:59:59.999${offsetStr === 'Z' ? 'Z' : offsetStr}`;

            // 3. Fetch consumed macros from meal_log
            const { data: mealLogs, error: mealErr } = await supabase
                .from('meal_log')
                .select('protein, carbs, fats, calories')
                .eq('user_id', userId)
                .gte('created_at', startISO)
                .lte('created_at', endISO);

            if (mealErr) {
                console.error('[useUserDailyMacros] meal_log fetch error:', mealErr);
            }

            let totals = { calories: 0, p: 0, c: 0, f: 0 };
            const hasMealsLogged = !!(mealLogs && mealLogs.length > 0);
            
            if (mealLogs) {
                mealLogs.forEach((log: any) => {
                    totals.p += Number(log.protein) || 0;
                    totals.c += Number(log.carbs) || 0;
                    totals.f += Number(log.fats) || 0;
                });
                // Enforce the standard formula: (p*4) + (c*4) + (f*9)
                totals.calories = Math.round(totals.p * 4 + totals.c * 4 + totals.f * 9);
            }

            setConsumed(totals);
            setHasMeals(hasMealsLogged);

            // 4. Fetch workout logs from posts where post_type = 'workout'
            const { data: workouts, error: workoutErr } = await supabase
                .from('posts')
                .select('id')
                .eq('author_id', userId)
                .eq('post_type', 'workout')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .limit(1);

            if (workoutErr) {
                console.error('[useUserDailyMacros] workout fetch error:', workoutErr);
            }

            setHasWorkout(!!(workouts && workouts.length > 0));

        } catch (err) {
            console.error('[useUserDailyMacros] Error in fetchUserMacrosAndTargets:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, date]);

    useEffect(() => {
        fetchUserMacrosAndTargets();

        if (!userId) return;

        // Set up real-time listener for meal_log and posts changes
        const dateStr = date.toISOString().split('T')[0];
        const channelId = Math.random().toString(36).substring(7);
        const channel = supabase
            .channel(`user-macros-sync-${userId}-${dateStr}-${channelId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'meal_log',
                filter: `user_id=eq.${userId}`,
            }, () => {
                fetchUserMacrosAndTargets();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `author_id=eq.${userId}`,
            }, () => {
                fetchUserMacrosAndTargets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, date, fetchUserMacrosAndTargets]);

    return {
        consumed,
        targets,
        hasMeals,
        hasWorkout,
        loading,
        refetch: fetchUserMacrosAndTargets
    };
}
