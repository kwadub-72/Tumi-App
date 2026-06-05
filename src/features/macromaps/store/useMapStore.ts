import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';
import { ActiveMapProgress } from '@/src/shared/models/types';

export interface MapState {
    activeMapProgress: ActiveMapProgress | null;
    fetchMapProgress: (mapId: string) => Promise<void>;
    jumpToCheckpoint: (mapId: string, targetCheckpointId: string) => Promise<void>;
    markCheckpointComplete: (mapId: string, checkpointId: string) => Promise<void>;
}

export const useMapStore = create<MapState>((set, get) => ({
    activeMapProgress: null,

    fetchMapProgress: async (mapId: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('user_map_progress')
                .select('current_checkpoint_id, completed_checkpoint_ids')
                .eq('user_id', userId)
                .eq('map_id', mapId)
                .maybeSingle();

            if (error) {
                console.error('[useMapStore] Error fetching map progress:', error);
                return;
            }

            if (data) {
                set({
                    activeMapProgress: {
                        current_checkpoint_id: data.current_checkpoint_id,
                        completed_checkpoint_ids: data.completed_checkpoint_ids || [],
                    }
                });
            } else {
                // Initialize progress with the first checkpoint in sequence
                const { data: checkpoints, error: cpError } = await supabase
                    .from('macro_map_checkpoints')
                    .select('id')
                    .eq('map_id', mapId)
                    .order('sequence_index', { ascending: true })
                    .limit(1);

                if (cpError) {
                    console.error('[useMapStore] Error fetching checkpoints to initialize progress:', cpError);
                    return;
                }

                const firstCheckpointId = checkpoints && checkpoints.length > 0 ? checkpoints[0].id : null;

                const { data: newProgress, error: insertError } = await supabase
                    .from('user_map_progress')
                    .insert({
                        user_id: userId,
                        map_id: mapId,
                        current_checkpoint_id: firstCheckpointId,
                        completed_checkpoint_ids: []
                    })
                    .select('current_checkpoint_id, completed_checkpoint_ids')
                    .single();

                if (insertError) {
                    console.error('[useMapStore] Error inserting initial progress row:', insertError);
                    return;
                }

                if (newProgress) {
                    set({
                        activeMapProgress: {
                            current_checkpoint_id: newProgress.current_checkpoint_id,
                            completed_checkpoint_ids: newProgress.completed_checkpoint_ids || [],
                        }
                    });
                }
            }
        } catch (err) {
            console.error('[useMapStore] Exception in fetchMapProgress:', err);
        }
    },

    jumpToCheckpoint: async (mapId: string, targetCheckpointId: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        // Instantly update local UI state
        const currentProgress = get().activeMapProgress;
        const completed = currentProgress ? currentProgress.completed_checkpoint_ids : [];
        set({
            activeMapProgress: {
                current_checkpoint_id: targetCheckpointId,
                completed_checkpoint_ids: completed
            }
        });

        // Silently update Supabase in the background
        try {
            const { error } = await supabase
                .from('user_map_progress')
                .update({
                    current_checkpoint_id: targetCheckpointId,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('map_id', mapId);

            if (error) {
                console.error('[useMapStore] Background save failed in jumpToCheckpoint:', error);
            }
        } catch (err) {
            console.error('[useMapStore] Background exception in jumpToCheckpoint:', err);
        }
    },

    markCheckpointComplete: async (mapId: string, checkpointId: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            const currentProgress = get().activeMapProgress;
            let completed = currentProgress ? [...currentProgress.completed_checkpoint_ids] : [];

            if (!completed.includes(checkpointId)) {
                completed.push(checkpointId);
            }

            // Determine next checkpoint in sequence
            const { data: checkpoints, error: cpError } = await supabase
                .from('macro_map_checkpoints')
                .select('id')
                .eq('map_id', mapId)
                .order('sequence_index', { ascending: true });

            if (cpError || !checkpoints) {
                console.error('[useMapStore] Failed to fetch checkpoints sequence:', cpError);
                return;
            }

            const currentIndex = checkpoints.findIndex(cp => cp.id === checkpointId);
            let nextCheckpointId: string | null = null;
            if (currentIndex !== -1 && currentIndex + 1 < checkpoints.length) {
                nextCheckpointId = checkpoints[currentIndex + 1].id;
            } else {
                nextCheckpointId = checkpointId;
            }

            // Instantly update local UI state
            set({
                activeMapProgress: {
                    current_checkpoint_id: nextCheckpointId,
                    completed_checkpoint_ids: completed
                }
            });

            // Persist progress update in Supabase
            const { error: updateError } = await supabase
                .from('user_map_progress')
                .update({
                    completed_checkpoint_ids: completed,
                    current_checkpoint_id: nextCheckpointId,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('map_id', mapId);

            if (updateError) {
                console.error('[useMapStore] Error updating completed checkpoints in Supabase:', updateError);
            }
        } catch (err) {
            console.error('[useMapStore] Exception in markCheckpointComplete:', err);
        }
    }
}));
