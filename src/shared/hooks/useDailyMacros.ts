import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/AuthStore';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { NutritionService } from '@/src/shared/services/NutritionService';
import { MacroNutrients } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';

export interface DailyMacroState {
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
    loading: boolean;
}

export function useDailyMacros(date: Date = new Date()): DailyMacroState {
    const { session, profile } = useAuthStore();
    const [consumed, setConsumed] = useState({ calories: 0, p: 0, c: 0, f: 0 });
    const [loading, setLoading] = useState(true);

    const fetchMacros = useCallback(async () => {
        if (!session?.user?.id) return;
        
        setLoading(true);
        try {
            const posts = await SupabasePostService.getFeed({
                userId: session.user.id,
                feedType: 'diary',
                date: date,
                limit: 100
            });

            const meals = posts.map(p => p.meal).filter(Boolean);
            const totals = NutritionService.sumMacros(meals as any);

            setConsumed({
                calories: totals.cals,
                p: totals.macros.p,
                c: totals.macros.c,
                f: totals.macros.f,
            });
        } catch (error) {
            console.error('[useDailyMacros] Error fetching macros:', error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, date]);

    useEffect(() => {
        fetchMacros();

        // Subscribe to changes in the posts table
        if (!session?.user?.id) return;

        const channel = supabase
            .channel(`daily-macros-${session.user.id}-${date.toISOString().split('T')[0]}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `author_id=eq.${session.user.id}`,
            }, () => {
                // Re-fetch when any post changes (could be optimized to check date)
                fetchMacros();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, date, fetchMacros]);

    const rawTargets = profile?.macro_targets || {
        calories: 2000,
        p: 150,
        c: 200,
        f: 60
    };

    const targets = {
        ...rawTargets,
        calories: (rawTargets.p * 4) + (rawTargets.c * 4) + (rawTargets.f * 9)
    };

    return {
        consumed,
        targets,
        loading
    };
}
