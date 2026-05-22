import { supabase } from './supabase';
import { Tribe, FeedPost, User } from '../models/types';
import { SupabasePostService } from './SupabasePostService';

// Competition configuration passed during tribe creation
export interface NewCompetitionConfig {
    style: 'premier' | 'faceoff';
    metric: 'habits' | 'weight_change';
    totalWeeks: number;
    ptsTier1?: number;
    ptsTier2?: number;
    ptsTier3?: number;
    ptsExerciseBonus?: number;
    ptsPenaltyMiss?: number;
    ptsPenaltyNoLog?: number;
}

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

    async leaveTribe(userId: string, tribeId: string): Promise<void> {
        // 1. Check if the leaving user is the chief of this tribe
        const { data: tribe, error: tribeError } = await supabase
            .from('tribes')
            .select('chief_id')
            .eq('id', tribeId)
            .single();

        if (tribeError) {
            console.error('[SupabaseTribeService.leaveTribe] Failed to fetch tribe:', tribeError.message);
            throw tribeError;
        }

        const isChief = tribe?.chief_id === userId;

        // 2. Fetch all other active members (exclude the leaving user, role is 'member' or 'chief')
        const { data: otherMembers, error: membersError } = await supabase
            .from('tribe_members')
            .select('user_id, joined_at')
            .eq('tribe_id', tribeId)
            .neq('user_id', userId)
            .in('role', ['member', 'chief'])
            .order('joined_at', { ascending: true });

        if (membersError) {
            console.error('[SupabaseTribeService.leaveTribe] Failed to fetch other members:', membersError.message);
            throw membersError;
        }

        if (isChief) {
            if (otherMembers && otherMembers.length > 0) {
                // Transfer Chief role to the longest-tenured member (earliest joined_at)
                const newChiefId = otherMembers[0].user_id;

                // Update the new chief's role in tribe_members
                const { error: updateMemberError } = await supabase
                    .from('tribe_members')
                    .update({ role: 'chief' })
                    .eq('tribe_id', tribeId)
                    .eq('user_id', newChiefId);

                if (updateMemberError) {
                    console.error('[SupabaseTribeService.leaveTribe] Failed to promote new chief:', updateMemberError.message);
                    throw updateMemberError;
                }

                // Update the chief_id in tribes
                const { error: updateTribeError } = await supabase
                    .from('tribes')
                    .update({ chief_id: newChiefId })
                    .eq('id', tribeId);

                if (updateTribeError) {
                    console.error('[SupabaseTribeService.leaveTribe] Failed to transfer chief_id:', updateTribeError.message);
                    throw updateTribeError;
                }

                // Remove the leaving chief from tribe_members
                const { error: deleteMemberError } = await supabase
                    .from('tribe_members')
                    .delete()
                    .eq('tribe_id', tribeId)
                    .eq('user_id', userId);

                if (deleteMemberError) {
                    console.error('[SupabaseTribeService.leaveTribe] Failed to remove leaving chief:', deleteMemberError.message);
                    throw deleteMemberError;
                }

                // Decrement the member count on the tribe
                const { data: currentTribe } = await supabase
                    .from('tribes')
                    .select('member_count')
                    .eq('id', tribeId)
                    .single();
                if (currentTribe) {
                    await supabase
                        .from('tribes')
                        .update({ member_count: Math.max(0, (currentTribe.member_count ?? 1) - 1) })
                        .eq('id', tribeId);
                }
            } else {
                // 0 members remain, delete the tribe from the database
                // First delete members to satisfy foreign keys if they don't cascade
                await supabase
                    .from('tribe_members')
                    .delete()
                    .eq('tribe_id', tribeId);

                const { error: deleteTribeError } = await supabase
                    .from('tribes')
                    .delete()
                    .eq('id', tribeId);

                if (deleteTribeError) {
                    console.error('[SupabaseTribeService.leaveTribe] Failed to delete tribe:', deleteTribeError.message);
                    throw deleteTribeError;
                }
            }
        } else {
            // Not the chief, just call normal leave or delete from tribe_members
            const { error: deleteMemberError } = await supabase
                .from('tribe_members')
                .delete()
                .eq('tribe_id', tribeId)
                .eq('user_id', userId);

            if (deleteMemberError) {
                console.error('[SupabaseTribeService.leaveTribe] Failed to leave tribe:', deleteMemberError.message);
                throw deleteMemberError;
            }

            // Decrement the member count on the tribe
            const { data: currentTribe } = await supabase
                .from('tribes')
                .select('member_count')
                .eq('id', tribeId)
                .single();
            if (currentTribe) {
                await supabase
                    .from('tribes')
                    .update({ member_count: Math.max(0, (currentTribe.member_count ?? 1) - 1) })
                    .eq('id', tribeId);
            }
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

    /**
     * Creates a new tribe in Supabase, adds the creator as chief, and
     * optionally creates a competition (which auto-seeds round-robin matchups
     * via the DB trigger for faceoff-style competitions).
     *
     * Returns the created Tribe record (with the real DB-assigned ID), or null on failure.
     */
    async createAndPersistTribe(args: {
        userId: string;
        name: string;
        avatarUrl?: string | null;
        themeColor?: string;
        tribeType: 'accountability' | 'head-to-head' | 'tribe-vs-tribe';
        privacy: 'public' | 'private';
        description?: string;
        activityType?: string;
        activityIcon?: string;
        naturalStatus?: boolean;
        competition?: NewCompetitionConfig;
    }): Promise<Tribe | null> {
        // 1. Insert the tribe
        const { data: tribeRow, error: tribeErr } = await supabase
            .from('tribes')
            .insert({
                name: args.name,
                avatar_url: args.avatarUrl ?? null,
                theme_color: args.themeColor ?? '#262525',
                tribe_type: args.tribeType,
                privacy: args.privacy,
                description: args.description ?? '',
                activity_type: args.activityType ?? null,
                activity_icon: args.activityIcon ?? null,
                natural_status: args.naturalStatus ?? null,
                chief_id: args.userId,
                member_count: 0,
            })
            .select('id')
            .single();

        if (tribeErr || !tribeRow) {
            console.error('[SupabaseTribeService.createAndPersistTribe] tribe insert', tribeErr?.message);
            return null;
        }

        const tribeId = tribeRow.id as string;

        // 2. Add creator as chief (join_tribe handles role assignment)
        const { error: joinErr } = await supabase.rpc('join_tribe', {
            p_user_id: args.userId,
            p_tribe_id: tribeId,
        });
        if (joinErr) {
            console.error('[SupabaseTribeService.createAndPersistTribe] join_tribe', joinErr.message);
        }

        // 3. Promote to chief role explicitly (join_tribe defaults to 'member')
        await supabase
            .from('tribe_members')
            .update({ role: 'chief' })
            .eq('tribe_id', tribeId)
            .eq('user_id', args.userId);

        // 4. Create competition if configured — the DB trigger auto-generates matchups for faceoff style
        if (args.competition) {
            await SupabaseTribeService.createCompetition({
                tribeId,
                ...args.competition,
            });
        }

        // 5. Return the full Tribe record
        return SupabaseTribeService.getTribe(tribeId);
    },

    /**
     * Updates an existing tribe in Supabase.
     */
    async updateTribe(args: {
        tribeId: string;
        name: string;
        avatarUrl?: string | null;
        privacy: 'public' | 'private';
        description?: string;
        activityType?: string;
        activityIcon?: string;
        naturalStatus?: boolean;
        tribeType?: 'accountability' | 'head-to-head' | 'tribe-vs-tribe';
        competition?: NewCompetitionConfig;
    }): Promise<Tribe | null> {
        const { error } = await supabase
            .from('tribes')
            .update({
                name: args.name,
                avatar_url: args.avatarUrl !== undefined ? args.avatarUrl : undefined,
                privacy: args.privacy,
                description: args.description ?? '',
                activity_type: args.activityType ?? null,
                activity_icon: args.activityIcon ?? null,
                natural_status: args.naturalStatus ?? null,
                tribe_type: args.tribeType !== undefined ? args.tribeType : undefined,
            })
            .eq('id', args.tribeId);

        if (error) {
            console.error('[SupabaseTribeService.updateTribe]', error.message);
            return null;
        }

        // Handle resetting scoreboards and setting up new competition cycles
        if (args.tribeType === 'accountability') {
            await supabase
                .from('competitions')
                .update({ status: 'completed' })
                .eq('tribe_id', args.tribeId)
                .eq('status', 'active');
        } else if (args.competition) {
            await supabase
                .from('competitions')
                .update({ status: 'completed' })
                .eq('tribe_id', args.tribeId)
                .eq('status', 'active');

            await SupabaseTribeService.createCompetition({
                tribeId: args.tribeId,
                ...args.competition,
            });
        }

        return SupabaseTribeService.getTribe(args.tribeId);
    },

    /**
     * Checks if a tribe's members list is fully compatible with natural status
     */
    async checkTribeNaturalEligibility(tribeId: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('check_tribe_natural_eligibility', {
            p_tribe_id: tribeId,
        });

        if (error) {
            console.error('[SupabaseTribeService.checkTribeNaturalEligibility]', error.message);
            return false;
        }

        return !!data;
    },

    /**
     * Creates a new competition for a faceoff tribe.
     * For 'faceoff' style competitions the DB trigger automatically calls
     * generate_tribe_matchups() to seed the full round-robin schedule.
     *
     * Returns the newly created competition ID, or null on failure.
     */
    async createCompetition(args: {
        tribeId: string;
        style: 'premier' | 'faceoff';
        metric: 'habits' | 'weight_change';
        totalWeeks: number;
        ptsTier1?: number;
        ptsTier2?: number;
        ptsTier3?: number;
        ptsExerciseBonus?: number;
        ptsPenaltyMiss?: number;
        ptsPenaltyNoLog?: number;
    }): Promise<string | null> {
        const { data, error } = await supabase
            .from('competitions')
            .insert({
                tribe_id: args.tribeId,
                style: args.style,
                metric: args.metric,
                total_weeks: args.totalWeeks,
                status: 'active',
                start_date: new Date().toISOString(),
                pts_tier_1: args.ptsTier1 ?? 20,
                pts_tier_2: args.ptsTier2 ?? 10,
                pts_tier_3: args.ptsTier3 ?? 5,
                pts_exercise_bonus: args.ptsExerciseBonus ?? 10,
                pts_penalty_miss: args.ptsPenaltyMiss ?? -15,
                pts_penalty_no_log: args.ptsPenaltyNoLog ?? -60,
            })
            .select('id')
            .single();

        if (error || !data) {
            console.error('[SupabaseTribeService.createCompetition]', error?.message);
            return null;
        }

        return data.id as string;
    },

    /**
     * Manually regenerates round-robin matchups for an existing faceoff competition.
     * Use this if tribe membership changes after the competition has started,
     * or to reseed stale/incorrect matchup data.
     */
    async regenerateMatchups(args: {
        tribeId: string;
        competitionId: string;
        totalWeeks: number;
    }): Promise<void> {
        const { error } = await supabase.rpc('generate_tribe_matchups', {
            p_tribe_id: args.tribeId,
            p_competition_id: args.competitionId,
            p_total_weeks: args.totalWeeks,
        });

        if (error) {
            console.error('[SupabaseTribeService.regenerateMatchups]', error.message);
            throw error;
        }
    },

    async getActiveCompetition(tribeId: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('tribe_id', tribeId)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[SupabaseTribeService.getActiveCompetition]', error.message);
            return null;
        }
        return data;
    },
};
