import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { DiscoveryMap } from '@/src/features/macromaps/store/useMarketplaceStore';

interface ProfileState {
    activeProfileMaps: DiscoveryMap[];
    isFetchingProfileMaps: boolean;
    fetchProfileMaps: (targetUserId: string, currentUserId: string) => Promise<void>;
    savedProfileMaps: any[];
    fetchSavedMaps: (userId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
    activeProfileMaps: [],
    isFetchingProfileMaps: false,
    savedProfileMaps: [],

    fetchProfileMaps: async (targetUserId: string, currentUserId: string) => {
        set({ isFetchingProfileMaps: true });
        try {
            let query = supabase
                .from('public_discovery_maps')
                .select('*')
                .eq('creator_id', targetUserId);

            // Privacy Rule: If it's NOT the current user's profile, only fetch published maps
            if (targetUserId !== currentUserId) {
                query = query.eq('is_published', true);
            }

            // Execute query and order
            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            set({ activeProfileMaps: data || [] });
        } catch (error) {
            console.error('[useProfileStore] Error fetching profile maps:', error);
            set({ activeProfileMaps: [] });
        } finally {
            set({ isFetchingProfileMaps: false });
        }
    },

    fetchSavedMaps: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('saved_macro_maps')
                .select('*, macro_maps(*)')
                .eq('user_id', userId);

            if (error) throw error;

            const maps = (data || [])
                .map((row: any) => row.macro_maps)
                .filter((m: any) => m !== null);

            set({ savedProfileMaps: maps });
        } catch (error) {
            console.error('[useProfileStore] Error fetching saved maps:', error);
            set({ savedProfileMaps: [] });
        }
    }
}));


