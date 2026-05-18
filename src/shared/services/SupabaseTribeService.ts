import { supabase } from './supabase';
import { Tribe, FeedPost, User } from '../models/types';
import { SupabasePostService } from './SupabasePostService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TribeMembership {
    tribeId: string;
    role: 'chief' | 'member' | 'pending';
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRowToTribe(row: any): Tribe {
    const chief = row.chief ?? null;
    return {
        id: row.id,
        name: row.name,
        avatar: row.avatar_url ?? null,
        themeColor: row.theme_color ?? '#262525',
        type: row.tribe_type,
        privacy: row.privacy ?? 'public',
        memberCount: Number(row.member_count ?? 0),
        description: row.description ?? '',
        joinStatus: 'none',
        tags: row.tags ?? [],
        activityType: row.activity_type ?? undefined,
        activityIcon: row.activity_icon ?? undefined,
        naturalStatus: row.natural_status ?? null,
        focusType: row.focus_type ?? row.tribe_type,
        chief: chief
            ? mapProfileToUser(chief)
            : { id: '', name: 'Unknown', handle: '@unknown', avatar: null },
    };
}

function mapProfileToUser(profile: any): User {
    return {
        id: profile.id,
        name: profile.name ?? 'Unknown',
        handle: profile.handle ?? '@unknown',
        avatar: profile.avatar_url ?? null,
        status: profile.status ?? 'none',
        activity: profile.activity ?? undefined,
        activityIcon: profile.activity_icon ?? undefined,
    };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SupabaseTribeService = {

    /**
     * Fetch a single tribe by ID with its chief's profile, live member count,
     * and all metadata fields.
     */
    async getTribe(tribeId: string): Promise<Tribe | null> {
        const { data, error } = await supabase
            .from('tribes')
            .select(`
                *,
                chief:profiles!chief_id (
                    id, handle, name, avatar_url, status, activity, activity_icon
                )
            `)
            .eq('id', tribeId)
            .single();

        if (error || !data) {
            console.error('[SupabaseTribeService.getTribe]', error?.message);
            return null;
        }

        // Prefer live member count over stale column
        const { count: liveCount } = await supabase
            .from('tribe_members')
            .select('*', { count: 'exact', head: true })
            .eq('tribe_id', tribeId)
            .in('role', ['chief', 'member']);

        // Get all members of the tribe to count their posts
        const { data: members } = await supabase
            .from('tribe_members')
            .select('user_id')
            .eq('tribe_id', tribeId)
            .in('role', ['chief', 'member']);

        const memberIds = (members ?? []).map((m: any) => m.user_id);
        
        let mealsCount = 0, workoutsCount = 0, macrosCount = 0;
        
        if (memberIds.length > 0) {
            const [meals, workouts, macros] = await Promise.all([
                supabase.from('posts').select('*', { count: 'exact', head: true }).in('author_id', memberIds).eq('post_type', 'meal'),
                supabase.from('posts').select('*', { count: 'exact', head: true }).in('author_id', memberIds).eq('post_type', 'workout'),
                supabase.from('posts').select('*', { count: 'exact', head: true }).in('author_id', memberIds).in('post_type', ['macro_update', 'snapshot']),
            ]);
            mealsCount = meals.count ?? 0;
            workoutsCount = workouts.count ?? 0;
            macrosCount = macros.count ?? 0;
        }

        return { 
            ...mapRowToTribe(data), 
            memberCount: liveCount ?? data.member_count ?? 0,
            stats: {
                meals: mealsCount,
                workouts: workoutsCount,
                macros: macrosCount,
            }
        };
    },

    /**
     * Returns all tribe memberships for a given user (chief + member + pending).
     */
    async getMyMemberships(userId: string): Promise<TribeMembership[]> {
        const { data, error } = await supabase
            .from('tribe_members')
            .select('tribe_id, role')
            .eq('user_id', userId);

        if (error) {
            console.error('[SupabaseTribeService.getMyMemberships]', error.message);
            return [];
        }

        return (data ?? []).map((row: any) => ({
            tribeId: row.tribe_id,
            role: row.role as 'chief' | 'member' | 'pending',
        }));
    },

    /**
     * Returns the full Tribe records for all tribes the user is a member of
     * (chief or member, not pending).
     */
    async getMyTribes(userId: string): Promise<Tribe[]> {
        const { data, error } = await supabase
            .from('tribe_members')
            .select(`
                role,
                tribe:tribes (
                    *,
                    chief:profiles!chief_id (
                        id, handle, name, avatar_url, status, activity, activity_icon
                    )
                )
            `)
            .eq('user_id', userId)
            .in('role', ['chief', 'member']);

        if (error) {
            console.error('[SupabaseTribeService.getMyTribes]', error.message);
            return [];
        }

        return (data ?? []).map((row: any) => ({
            ...mapRowToTribe(row.tribe),
            joinStatus: row.role === 'chief' ? 'joined' : 'joined',
        }));
    },

    /**
     * Join a tribe. Uses the DB RPC which handles private/public logic atomically
     * and updates member_count via trigger.
     * Returns 'joined' for public tribes, 'requested' for private.
     */
    async joinTribe(userId: string, tribeId: string): Promise<'joined' | 'requested'> {
        const { data, error } = await supabase.rpc('join_tribe', {
            p_user_id: userId,
            p_tribe_id: tribeId,
        });

        if (error) {
            console.error('[SupabaseTribeService.joinTribe]', error.message);
            throw error;
        }

        return (data as 'joined' | 'requested') ?? 'joined';
    },

    /**
     * Leave or cancel a pending request for a tribe.
     * member_count is decremented atomically via the DB trigger.
     */
    async leaveTribe(userId: string, tribeId: string): Promise<void> {
        const { error } = await supabase.rpc('leave_tribe', {
            p_user_id: userId,
            p_tribe_id: tribeId,
        });

        if (error) {
            console.error('[SupabaseTribeService.leaveTribe]', error.message);
            throw error;
        }
    },

    /**
     * Fetch tribe feed posts using the shared SupabasePostService.
     * - Initial load: last `daysBack` days (default 7)
     * - Callers can call again with a larger daysBack to paginate further back
     */
    async getTribeFeed(
        userId: string,
        tribeId: string,
        daysBack: number = 7,
    ): Promise<FeedPost[]> {
        return SupabasePostService.getFeed({
            userId,
            feedType: 'tribe',
            tribeId,
            date: new Date(),
            daysBack,
        });
    },
};
