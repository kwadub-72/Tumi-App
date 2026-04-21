import { supabase } from './supabase';
import { User, Tribe } from '../models/types';

export const SupabaseNetworkService = {
    async getFollowers(userId: string): Promise<User[]> {
        const { data, error } = await supabase
            .from('follows')
            .select(`
                follower:profiles!follows_follower_id_fkey (
                    id, name, handle, avatar_url, status, activity, activity_icon, height, weight_lbs, body_fat_pct, is_private
                )
            `)
            .eq('following_id', userId);

        if (error) {
            console.error('[SupabaseNetworkService.getFollowers]', error.message);
            return [];
        }

        return data.map((row: any) => this.mapProfileToUser(row.follower));
    },

    async getFollowing(userId: string): Promise<User[]> {
        const { data, error } = await supabase
            .from('follows')
            .select(`
                following:profiles!follows_following_id_fkey (
                    id, name, handle, avatar_url, status, activity, activity_icon, height, weight_lbs, body_fat_pct, is_private
                )
            `)
            .eq('follower_id', userId);

        if (error) {
            console.error('[SupabaseNetworkService.getFollowing]', error.message);
            return [];
        }

        return data.map((row: any) => this.mapProfileToUser(row.following));
    },

    async getFollowRequests(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('follow_requests')
            .select('following_id')
            .eq('follower_id', userId);

        if (error) {
            console.error('[SupabaseNetworkService.getFollowRequests]', error.message);
            return [];
        }

        return data.map((row: any) => row.following_id);
    },

    async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
        const [followersResult, followingResult] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
        ]);

        return {
            followers: followersResult.count || 0,
            following: followingResult.count || 0
        };
    },

    async toggleFollow(followerId: string, followingId: string, isCurrentlyFollowing: boolean, isPrivate: boolean): Promise<{ success: boolean; newState: 'following' | 'none' | 'requested' }> {
        if (isCurrentlyFollowing) {
            // Unfollow
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);

            return { success: !error, newState: 'none' };
        } else {
            if (isPrivate) {
                // Check if already requested
                const { data: existingRequest } = await supabase
                    .from('follow_requests')
                    .select('*')
                    .eq('follower_id', followerId)
                    .eq('following_id', followingId)
                    .single();

                if (existingRequest) {
                    // Cancel request
                    const { error } = await supabase
                        .from('follow_requests')
                        .delete()
                        .eq('follower_id', followerId)
                        .eq('following_id', followingId);
                    return { success: !error, newState: 'none' };
                } else {
                    // Send request
                    const { error } = await supabase
                        .from('follow_requests')
                        .insert({ follower_id: followerId, following_id: followingId });
                    return { success: !error, newState: 'requested' };
                }
            } else {
                // Direct follow
                const { error } = await supabase
                    .from('follows')
                    .insert({ follower_id: followerId, following_id: followingId });
                return { success: !error, newState: 'following' };
            }
        }
    },

    mapProfileToUser(profile: any): User {
        return {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatar: profile.avatar_url,
            status: profile.status,
            activity: profile.activity,
            activityIcon: profile.activity_icon,
            height: profile.height,
            weight: profile.weight_lbs,
            bfs: profile.body_fat_pct,
            isPrivate: profile.is_private,
        } as User;
    },

    async getMyTribes(userId: string): Promise<Tribe[]> {
        const { data, error } = await supabase
            .from('tribe_members')
            .select(`
                tribe:tribes (
                    id, name, avatar_url, theme_color, tribe_type, privacy, description
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error('[SupabaseNetworkService.getMyTribes]', error.message);
            return [];
        }

        return (data ?? []).map((row: any) => {
            const t = row.tribe;
            return {
                id: t.id,
                name: t.name,
                avatar: t.avatar_url,
                themeColor: t.theme_color,
                type: t.tribe_type,
                privacy: t.privacy,
                memberCount: 0,
                description: t.description,
                joinStatus: 'joined',
                chief: { id: '', name: '', handle: '', avatar: '' } as User
            } as Tribe;
        });
    }
};
