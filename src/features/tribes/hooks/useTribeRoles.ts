import { useState, useEffect } from 'react';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';

export function useIsChief(tribeId?: string) {
    const { session } = useAuthStore();
    const userId = session?.user?.id;
    const [isChief, setIsChief] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tribeId || !userId) {
            setIsChief(false);
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            const { data } = await supabase
                .from('tribes')
                .select('chief_id')
                .eq('id', tribeId)
                .single();
            
            setIsChief(data?.chief_id === userId);
            setLoading(false);
        };
        fetchRole();
    }, [tribeId, userId]);

    return { isChief, loading };
}

export function useIsSpectator(tribeId?: string) {
    const { session } = useAuthStore();
    const userId = session?.user?.id;
    const [isSpectator, setIsSpectator] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tribeId || !userId) {
            setIsSpectator(false);
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            // Get user join date
            const { data: memberData } = await supabase
                .from('tribe_members')
                .select('created_at')
                .eq('tribe_id', tribeId)
                .eq('user_id', userId)
                .single();

            // Get competition start date
            const { data: compData } = await supabase
                .from('competitions')
                .select('created_at, started_at')
                .eq('tribe_id', tribeId)
                .in('status', ['active', 'completed'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (memberData && compData) {
                const joinDate = new Date(memberData.created_at).getTime();
                const compStart = new Date(compData.started_at || compData.created_at).getTime();
                setIsSpectator(joinDate > compStart);
            } else {
                setIsSpectator(false);
            }
            setLoading(false);
        };
        fetchRole();
    }, [tribeId, userId]);

    return { isSpectator, loading };
}
