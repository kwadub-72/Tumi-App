import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';

export interface FaceoffMatchup {
    matchup_id: string;
    tribe_id: string;
    competition_id: string;
    week_number: number;

    user_1_id: string;
    user_1_display_name: string;
    user_1_username: string;
    user_1_pfp_url: string | null;
    user_1_natural_status: 'none' | 'natural' | 'enhanced' | 'natural-pending';
    user_1_activity_type: string | null;
    user_1_activity_icon: string | null;
    user_1_weekly_points: number;

    user_2_id: string;
    user_2_display_name: string;
    user_2_username: string;
    user_2_pfp_url: string | null;
    user_2_natural_status: 'none' | 'natural' | 'enhanced' | 'natural-pending';
    user_2_activity_type: string | null;
    user_2_activity_icon: string | null;
    user_2_weekly_points: number;
}

export const useFaceoffMatchups = (tribeId?: string, weekNumber?: number) => {
    const { session } = useAuthStore();
    const currentUserId = session?.user?.id;

    const [matchups, setMatchups] = useState<FaceoffMatchup[]>([]);
    const [userMatchup, setUserMatchup] = useState<FaceoffMatchup | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ID mapping for local short IDs
    let targetTribeId = tribeId;
    if (targetTribeId && targetTribeId.startsWith('t')) {
        const mockMap: Record<string, string> = {
            't1': 'b0000000-0000-0000-0000-000000000001', // Harvard
            't2': 'b0000000-0000-0000-0000-000000000002', // Iron Brotherhood
            't3': 'b0000000-0000-0000-0000-000000000003', // Team Flex
            't4': 'b0000000-0000-0000-0000-000000000004'  // Cut Squad
        };
        targetTribeId = mockMap[targetTribeId] || targetTribeId;
    }

    const fetchMatchups = useCallback(async () => {
        if (!targetTribeId || !weekNumber) return;
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchErr } = await supabase
                .from('v_faceoff_matchups')
                .select('*')
                .eq('tribe_id', targetTribeId)
                .eq('week_number', weekNumber);

            if (fetchErr) {
                console.error('Error fetching faceoff matchups view:', fetchErr);
                setError(fetchErr.message);
                return;
            }

            if (data) {
                const typedData = data as FaceoffMatchup[];
                setMatchups(typedData);

                // Find matchup for the current user
                if (currentUserId) {
                    const found = typedData.find(
                        (m) => m.user_1_id === currentUserId || m.user_2_id === currentUserId
                    );
                    setUserMatchup(found || null);
                } else {
                    setUserMatchup(null);
                }
            }
        } catch (err: any) {
            console.error('Failed to query faceoff matchups:', err);
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [targetTribeId, weekNumber, currentUserId]);

    useEffect(() => {
        fetchMatchups();
    }, [fetchMatchups]);

    // Realtime postgres updates on faceoff_matchups
    useEffect(() => {
        if (!targetTribeId) return;

        const channel = supabase
            .channel(`faceoff-matchups-realtime-${targetTribeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'faceoff_matchups',
                    filter: `tribe_id=eq.${targetTribeId}`,
                },
                () => {
                    // Refetch view data to get populated profile fields
                    fetchMatchups();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [targetTribeId, fetchMatchups]);

    return {
        matchups,
        userMatchup,
        loading,
        error,
        refetch: fetchMatchups,
    };
};
