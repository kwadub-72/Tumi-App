import { supabase } from './supabase';
import { FeedPost, Comment, Ingredient } from '../models/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedType = 'following' | 'diary' | 'tribe' | 'profile';

export interface GetFeedOptions {
    userId: string;          // the authenticated user's id
    feedType: FeedType;
    date?: Date;             // selected date (diary: any date; following/tribe: max 7d back)
    tribeId?: string;        // required for tribe feed
    limit?: number;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToFeedPost(row: any, currentUserId: string): FeedPost {
    const payload = row.payload ?? {};
    return {
        id: row.id,
        caption: row.caption || undefined,
        user: {
            id: row.author_id,
            name: row.author_name,
            handle: row.author_handle,
            avatar: row.author_avatar ?? 'https://i.pravatar.cc/150?u=default',
            status: row.author_status ?? 'none',
            verified: true,
            activity: row.author_activity,
            activityIcon: row.author_activity_icon,
            macroTargets: row.author_macro_targets,
        },
        timeAgo: formatTimeAgo(row.created_at),
        meal: payload.meal ?? undefined,
        workout: payload.workout ?? undefined,
        macroUpdate: payload.macroUpdate ?? undefined,
        snapshot: payload.snapshot ?? undefined,
        mediaUrl: row.media_url ?? undefined,
        mediaType: row.media_type ?? undefined,
        stats: {
            likes: Number(row.like_count ?? 0),
            comments: Number(row.comment_count ?? 0),
            shares: Number(row.copy_count ?? 0),
            saves: Number(row.bookmark_count ?? 0),
        },
        // These are set by the interaction queries below
        isLiked: row.viewer_liked ?? false,
        isSaved: row.viewer_saved ?? false,
        isShared: false,
        hasCommented: false,
        comments: [],
    };
}

export function formatTimeAgo(isoString: string): string {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SupabasePostService = {

    /**
     * Fetch the feed for a given type.
     * - 'following': posts by followed users within 7 days of the selected date
     * - 'tribe': posts by tribe members within 7 days of the selected date
     * - 'profile': all posts by the current user (unlimited date range)
     */
    async getFeed(opts: GetFeedOptions): Promise<FeedPost[]> {
        const { userId, feedType, date = new Date(), tribeId, limit = 50 } = opts;

        // Build date window
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        let query = supabase
            .from('posts_with_counts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (feedType === 'diary') {
            // Diary: own posts on the selected date (any date, unlimited)
            query = query
                .eq('author_id', userId)
                .gte('created_at', dayStart.toISOString())
                .lte('created_at', dayEnd.toISOString());

        } else if (feedType === 'following') {
            // Following: posts from followed users within 7 days back from selected date
            const weekBack = new Date(date);
            weekBack.setDate(weekBack.getDate() - 7);

            // Get followed user IDs
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId);

            const followedIds = (follows ?? []).map((f: any) => f.following_id);
            followedIds.push(userId); // Include current user's posts
            if (followedIds.length === 0) return [];

            query = query
                .in('author_id', followedIds)
                .gte('created_at', weekBack.toISOString())
                .lte('created_at', dayEnd.toISOString());

        } else if (feedType === 'tribe') {
            if (!tribeId) return [];

            const weekBack = new Date(date);
            weekBack.setDate(weekBack.getDate() - 7);

            // Get tribe member IDs
            const { data: members } = await supabase
                .from('tribe_members')
                .select('user_id')
                .eq('tribe_id', tribeId);

            const memberIds = (members ?? []).map((m: any) => m.user_id);
            if (memberIds.length === 0) return [];

            query = query
                .in('author_id', memberIds)
                .gte('created_at', weekBack.toISOString())
                .lte('created_at', dayEnd.toISOString());
        } else if (feedType === 'profile') {
            // Profile: all posts by targeted user (or current user)
            query = query.eq('author_id', userId);
        }

        try {
            const { data, error } = await query;
            if (error) {
                console.error('[SupabasePostService.getFeed] Supabase Error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    feedType,
                    userId
                });
                return [];
            }

            const posts = (data ?? []).map((row: any) => rowToFeedPost(row, userId));

            // Batch-fetch what the current user has liked / bookmarked
            const postIds = posts.map(p => p.id);
            if (postIds.length > 0) {
                try {
                    const [likesRes, bookmarksRes] = await Promise.all([
                        supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
                        supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
                    ]);
                    const likedSet = new Set((likesRes.data ?? []).map((l: any) => l.post_id));
                    const savedSet = new Set((bookmarksRes.data ?? []).map((b: any) => b.post_id));
                    posts.forEach(p => {
                        p.isLiked = likedSet.has(p.id);
                        p.isSaved = savedSet.has(p.id);
                    });
                } catch (enrichErr) {
                    console.warn('[SupabasePostService.getFeed] Interaction enrichment failed:', enrichErr);
                }
            }

            return posts;
        } catch (err: any) {
            console.error('[SupabasePostService.getFeed] Fatal Fetch Error:', {
                name: err.name,
                message: err.message,
                feedType,
                userId,
                isNetworkError: err.message === 'Network request failed'
            });
            return [];
        }
    },


    async getPostDetails(postId: string, userId: string, commentOffset: number = 0, commentLimit: number = 20): Promise<{ post: FeedPost | null, comments: Comment[] }> {
        // Optimized parallel fetching to simulate a single complex query due to view limitations
        const [postRes, commentsRes, likesRes, bookmarksRes] = await Promise.all([
            supabase.from('posts_with_counts').select('*').eq('id', postId).single(),
            supabase.from('comments')
                .select(`
                    id, body, created_at, author_id, like_count,
                    profiles!comments_author_id_fkey (id, handle, name, avatar_url, status, activity_icon)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false }) // newest comments first? Or true for oldest first. Let's use false to get newest.
                .range(commentOffset, commentOffset + commentLimit - 1),
            supabase.from('likes').select('post_id').eq('user_id', userId).eq('post_id', postId),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).eq('post_id', postId),
        ]);

        if (postRes.error || !postRes.data) {
            console.error('[SupabasePostService.getPostDetails] Post error', postRes.error?.message);
            return { post: null, comments: [] };
        }

        const post = rowToFeedPost(postRes.data, userId);
        post.isLiked = (likesRes.data ?? []).length > 0;
        post.isSaved = (bookmarksRes.data ?? []).length > 0;

        const commentsData = commentsRes.data ?? [];
        const comments = commentsData.map((row: any) => ({
            id: row.id,
            text: row.body,
            timestamp: new Date(row.created_at).getTime(),
            likes: Number(row.like_count ?? 0),
            isLiked: false,
            user: {
                id: row.profiles.id,
                handle: row.profiles.handle,
                name: row.profiles.name,
                avatar: row.profiles.avatar_url ?? 'https://i.pravatar.cc/150?u=default',
                status: row.profiles.status ?? 'none',
                verified: true,
                activityIcon: row.profiles.activity_icon,
            },
        }));

        if (userId && comments.length > 0) {
            const commentIds = comments.map(c => c.id);
            const { data: commentLikes } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .eq('user_id', userId)
                .in('comment_id', commentIds);
            
            const likedSet = new Set((commentLikes ?? []).map((l: any) => l.comment_id));
            comments.forEach(c => {
                c.isLiked = likedSet.has(c.id);
            });
        }

        return { post, comments };
    },

    async addPost(post: {
        authorId: string;
        postType: 'meal' | 'workout' | 'macro_update' | 'snapshot';
        payload: object;
        caption?: string;
        mediaUrl?: string;
        mediaType?: 'image' | 'video';
        tribeId?: string;
    }): Promise<FeedPost | null> {
        const { data, error } = await supabase
            .from('posts')
            .insert({
                author_id: post.authorId,
                post_type: post.postType,
                payload: post.payload,
                caption: post.caption ?? null,
                media_url: post.mediaUrl ?? null,
                media_type: post.mediaType ?? null,
                tribe_id: post.tribeId ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error('[SupabasePostService.addPost]', error.message);
            return null;
        }
        return data;
    },

    async deletePost(postId: string): Promise<void> {
        await supabase.from('posts').delete().eq('id', postId);
    },

    // ── Likes ────────────────────────────────────────────────────────────────

    async toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<void> {
        if (currentlyLiked) {
            await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
            await supabase.from('likes').upsert({ post_id: postId, user_id: userId });
        }
    },

    // ── Bookmarks ────────────────────────────────────────────────────────────

    async toggleBookmark(postId: string, userId: string, currentlySaved: boolean): Promise<void> {
        if (currentlySaved) {
            await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
            await supabase.from('post_bookmarks').upsert({ post_id: postId, user_id: userId });
        }
    },

    // ── Copies ──────────────────────────────────────────────────────────────

    async recordCopy(postId: string, userId: string, copyType: 'standard' | 'tribe' = 'standard'): Promise<void> {
        await supabase.from('post_copies').insert({ post_id: postId, user_id: userId, copy_type: copyType });
    },

    /**
     * Calls the tribe_copy_food RPC to compute proportionally scaled
     * ingredients for User B based on User A's macro targets at post time.
     * Returns the scaled ingredient array, or null on error.
     */
    async tribeCopyFood(
        postId: string,
        copierId: string,
    ): Promise<Ingredient[] | null> {
        const { data, error } = await supabase.rpc('tribe_copy_food', {
            p_post_id:   postId,
            p_copier_id: copierId,
        });

        if (error) {
            console.error('[SupabasePostService.tribeCopyFood]', error.message);
            return null;
        }

        return (data as any[]) ?? [];
    },

    // ── Comments ────────────────────────────────────────────────────────────

    async getComments(postId: string, userId?: string): Promise<Comment[]> {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                id,
                body,
                created_at,
                author_id,
                like_count,
                profiles!comments_author_id_fkey (
                    id, handle, name, avatar_url, status, activity_icon
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[SupabasePostService.getComments]', error.message);
            return [];
        }

        const comments = (data ?? []).map((row: any) => ({
            id: row.id,
            text: row.body,
            timestamp: new Date(row.created_at).getTime(),
            likes: Number(row.like_count ?? 0),
            isLiked: false,
            user: {
                id: row.profiles.id,
                handle: row.profiles.handle,
                name: row.profiles.name,
                avatar: row.profiles.avatar_url ?? 'https://i.pravatar.cc/150?u=default',
                status: row.profiles.status ?? 'none',
                verified: true,
            },
        }));

        if (userId && comments.length > 0) {
            const commentIds = comments.map(c => c.id);
            const { data: likes } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .eq('user_id', userId)
                .in('comment_id', commentIds);
            
            const likedSet = new Set((likes ?? []).map((l: any) => l.comment_id));
            comments.forEach(c => {
                c.isLiked = likedSet.has(c.id);
            });
        }

        return comments;
    },

    async addComment(postId: string, authorId: string, text: string): Promise<Comment | null> {
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, author_id: authorId, body: text })
            .select(`
                id,
                body,
                created_at,
                like_count,
                profiles!comments_author_id_fkey (
                    id, handle, name, avatar_url, status
                )
            `)
            .single();

        if (error) {
            console.error('[SupabasePostService.addComment]', error.message);
            return null;
        }

        const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

        return {
            id: data.id,
            text: data.body,
            timestamp: new Date(data.created_at).getTime(),
            likes: Number(data.like_count ?? 0),
            isLiked: false,
            user: {
                id: profile.id,
                handle: profile.handle,
                name: profile.name,
                avatar: profile.avatar_url ?? 'https://i.pravatar.cc/150?u=default',
                status: profile.status ?? 'none',
                verified: true,
            },
        };
    },

    async deleteComment(commentId: string): Promise<void> {
        await supabase.from('comments').delete().eq('id', commentId);
    },

    async toggleCommentLike(commentId: string, userId: string, currentlyLiked: boolean): Promise<void> {
        if (currentlyLiked) {
            await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
        } else {
            await supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: userId });
        }
    },

    // ── Meal Log ────────────────────────────────────────────────────────────

    async addToMealLog(userId: string, item: {
        item_name: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        portion_size: string;
        original_post_id: string;
    }): Promise<void> {
        const { error } = await supabase.from('meal_log').insert({
            user_id: userId,
            ...item
        });

        if (error) {
            console.error('[SupabasePostService.addToMealLog]', error.message);
            throw error;
        }
    },

    async getMealBook(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('meal_log')
            .select(`
                *,
                posts!original_post_id (
                    author_id,
                    profiles!author_id (
                        id,
                        handle,
                        name,
                        avatar_url,
                        status,
                        activity_icon,
                        activity
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[SupabasePostService.getMealBook]', error.message);
            return [];
        }

        const postIds = data.map((item: any) => item.original_post_id).filter(Boolean);
        let copyCounts: Record<string, number> = {};
        if (postIds.length > 0) {
            const { data: copies } = await supabase
                .from('post_copies')
                .select('post_id')
                .in('post_id', postIds);
            
            if (copies) {
                copies.forEach((c: any) => {
                    copyCounts[c.post_id] = (copyCounts[c.post_id] || 0) + 1;
                });
            }
        }

        return data.map((item: any) => ({
            ...item,
            copy_count: copyCounts[item.original_post_id] || 0,
            original_author: item.posts?.profiles
        }));
    },

    // ── Lift book ───────────────────────────────────────────────────────────

    /**
     * Copy exercises from a workout post into the user's private Lift book.
     * Supports both bulk copy (if exerciseIds is null) and selective copy.
     */
    async copyToLiftBook(userId: string, postId: string, exerciseIds?: string[]): Promise<void> {
        const { error } = await supabase.rpc('copy_exercises_to_lift_book', {
            p_user_id: userId,
            p_post_id: postId,
            p_exercise_ids: exerciseIds || null
        });

        if (error) {
            console.error('[SupabasePostService.copyToLiftBook]', error.message);
            throw error;
        }
    },

    async getLiftBook(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('lift_book')
            .select(`
                *,
                posts!original_post_id (
                    author_id,
                    payload,
                    profiles!author_id (
                        handle,
                        name,
                        avatar_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[SupabasePostService.getLiftBook]', error.message);
            return [];
        }

        const postIds = data.map((item: any) => item.original_post_id).filter(Boolean);
        let copyCounts: Record<string, number> = {};
        if (postIds.length > 0) {
            const { data: copies } = await supabase
                .from('post_copies')
                .select('post_id')
                .in('post_id', postIds);
            
            if (copies) {
                copies.forEach((c: any) => {
                    copyCounts[c.post_id] = (copyCounts[c.post_id] || 0) + 1;
                });
            }
        }

        return data.map((item: any) => ({
            ...item,
            copy_count: copyCounts[item.original_post_id] || 0,
            original_author: item.posts?.profiles
        }));
    },

    // ── Macro Book ─────────────────────────────────────────────────────────

    async addToMacroBook(userId: string, postId: string, selectionType: 'old' | 'new' | 'targets' | 'delta'): Promise<void> {
        console.log('[addToMacroBook]', { userId, postId, selectionType });
        const { error } = await supabase.rpc('copy_to_macro_book', {
            p_user_id: userId,
            p_post_id: postId,
            p_selection_type: selectionType
        });

        if (error) {
            console.error('[SupabasePostService.addToMacroBook]', error.message);
            throw error;
        }
    },

    async getMacroBook(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('macro_book')
            .select(`
                *,
                posts!original_post_id (
                    author_id,
                    profiles!author_id (
                        handle,
                        name,
                        avatar_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[SupabasePostService.getMacroBook]', error.message);
            return [];
        }

        const postIds = data.map((item: any) => item.original_post_id).filter(Boolean);
        let copyCounts: Record<string, number> = {};
        if (postIds.length > 0) {
            const { data: copies } = await supabase
                .from('post_copies')
                .select('post_id')
                .in('post_id', postIds);
            
            if (copies) {
                copies.forEach((c: any) => {
                    copyCounts[c.post_id] = (copyCounts[c.post_id] || 0) + 1;
                });
            }
        }

        return data.map((item: any) => ({
            ...item,
            copy_count: copyCounts[item.original_post_id] || 0,
            original_author: item.posts?.profiles
        }));
    },

    async deleteFromMacroBook(entryId: string): Promise<void> {
        const { error } = await supabase.from('macro_book').delete().eq('id', entryId);
        if (error) {
            console.error('[SupabasePostService.deleteFromMacroBook]', error.message);
            throw error;
        }
    },

    async updateMacroTargetsWithPost(userId: string, newTargets: object, caption?: string, mediaUrl?: string, mediaType?: string): Promise<void> {
        const { error } = await supabase.rpc('update_macro_targets_with_post', {
            p_user_id: userId,
            p_new_targets: newTargets,
            p_caption: caption || null,
            p_media_url: mediaUrl || null,
            p_media_type: mediaType || null
        });

        if (error) {
            console.error('[SupabasePostService.updateMacroTargetsWithPost]', error.message);
            throw error;
        }
    },

    async getLatestMacroHistory(userId: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('macro_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[SupabasePostService.getLatestMacroHistory]', error.message);
            return null;
        }
        return data && data.length > 0 ? data[0] : null;
    },
};
