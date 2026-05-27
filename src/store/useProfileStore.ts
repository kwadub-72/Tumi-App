import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { DiscoveryMap } from '@/src/features/macromaps/store/useMarketplaceStore';

interface ProfileState {
    activeProfileMaps: DiscoveryMap[];
    isFetchingProfileMaps: boolean;
    fetchProfileMaps: (targetUserId: string, currentUserId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
    activeProfileMaps: [],
    isFetchingProfileMaps: false,

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
    }
}));
