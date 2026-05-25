import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';

export interface CreatorMapState {
    activeBroadcastMapId: string | null;
    toggleLiveBroadcast: (mapId: string, makeLive: boolean) => Promise<void>;
    setActiveBroadcastMapId: (mapId: string | null) => void;
    fetchActiveBroadcastMap: (creatorId: string) => Promise<void>;
}

export const useCreatorMapStore = create<CreatorMapState>((set, get) => ({
    activeBroadcastMapId: null,

    setActiveBroadcastMapId: (mapId) => set({ activeBroadcastMapId: mapId }),

    fetchActiveBroadcastMap: async (creatorId: string) => {
        try {
            const { data, error } = await supabase
                .from('macro_maps')
                .select('id')
                .eq('creator_id', creatorId)
                .eq('is_live', true)
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[fetchActiveBroadcastMap] Error fetching active broadcast map:', error);
                return;
            }

            if (data) {
                set({ activeBroadcastMapId: data.id });
            } else {
                set({ activeBroadcastMapId: null });
            }
        } catch (err) {
            console.error('[fetchActiveBroadcastMap] Exception:', err);
        }
    },

    toggleLiveBroadcast: async (mapId: string, makeLive: boolean) => {
        try {
            const { error } = await supabase
                .from('macro_maps')
                .update({ is_live: makeLive })
                .eq('id', mapId);

            if (error) {
                console.error('[toggleLiveBroadcast] Failed to update map broadcast status:', error);
                throw error;
            }

            // Update local state instantly so UI reacts
            if (makeLive) {
                set({ activeBroadcastMapId: mapId });
            } else {
                const currentActive = get().activeBroadcastMapId;
                if (currentActive === mapId) {
                    set({ activeBroadcastMapId: null });
                }
            }
        } catch (err) {
            console.error('[toggleLiveBroadcast] Exception:', err);
            throw err;
        }
    }
}));
