import { create } from 'zustand';
import { supabase } from '../shared/services/supabase';
import { SupabaseNetworkService } from '../shared/services/SupabaseNetworkService';

interface NetworkState {
    followingIds: Set<string>;
    requestedIds: Set<string>;
    initialized: boolean;

    // Actions
    init: (userId: string) => Promise<void>;
    isFollowing: (userId: string) => boolean;
    isRequested: (userId: string) => boolean;
    toggleFollow: (followerId: string, followingId: string, isPrivate: boolean) => Promise<{ success: boolean; newState: 'following' | 'none' | 'requested' }>;
    clear: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
    followingIds: new Set(),
    requestedIds: new Set(),
    initialized: false,

    init: async (userId: string) => {
        if (!userId) return;
        
        try {
            const [following, requests] = await Promise.all([
                SupabaseNetworkService.getFollowing(userId),
                SupabaseNetworkService.getFollowRequests(userId)
            ]);

            set({
                followingIds: new Set(following.map(f => f.id)),
                requestedIds: new Set(requests),
                initialized: true
            });
        } catch (error) {
            console.error('[NetworkStore.init]', error);
        }
    },

    isFollowing: (userId: string) => {
        return get().followingIds.has(userId);
    },

    isRequested: (userId: string) => {
        return get().requestedIds.has(userId);
    },

    toggleFollow: async (followerId: string, followingId: string, isPrivate: boolean) => {
        const currentlyFollowing = get().followingIds.has(followingId);
        
        const { success, newState } = await SupabaseNetworkService.toggleFollow(
            followerId,
            followingId,
            currentlyFollowing,
            isPrivate
        );

        if (success) {
            set((state) => {
                const nextFollowing = new Set(state.followingIds);
                const nextRequested = new Set(state.requestedIds);

                if (newState === 'following') {
                    nextFollowing.add(followingId);
                    nextRequested.delete(followingId);
                } else if (newState === 'requested') {
                    nextRequested.add(followingId);
                    nextFollowing.delete(followingId);
                } else {
                    nextFollowing.delete(followingId);
                    nextRequested.delete(followingId);
                }

                return {
                    followingIds: nextFollowing,
                    requestedIds: nextRequested
                };
            });
        }

        return { success, newState };
    },

    clear: () => {
        set({
            followingIds: new Set(),
            requestedIds: new Set(),
            initialized: false
        });
    }
}));
