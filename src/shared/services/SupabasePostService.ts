import { supabase } from './supabase';
import { FeedPost, Comment, Ingredient } from '../models/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedType = 'following' | 'diary' | 'tribe';

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
        caption: row.caption ?? undefined,
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

function formatTimeAgo(isoString: string): string {
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
     * - 'diary': all posts by the current user, filtered to the selected date
     * - 'following': posts by followed users within 7 days of the selected date
     * - 'tribe': posts by tribe members within 7 days of the selected date
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
        }

        const { data, error } = await query;
        if (error) {
            console.error('[SupabasePostService.getFeed]', error.message);
            return [];
        }

        const posts = (data ?? []).map((row: any) => rowToFeedPost(row, userId));

        // Batch-fetch what the current user has liked / bookmarked
        const postIds = posts.map(p => p.id);
        if (postIds.length > 0) {
            const [likesRes, bookmarksRes] = await Promise.all([
                supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
                supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
            ]);
            const likedSet = new Set((likesRes.data ?? []).map((l: any) => l.post_id));
            const savedSet = new Set((bookmarksRes.data ?? []).map((b: any) => b.post_id));
            posts.forEach(p => {
                p.isLiked = likedSet.has(p.id);
                p.isSaved = savedSet.has(p.id);
            });
        }

        return posts;
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
            await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
            await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId });
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

    // ── Comments ────────────────────────────────────────────────────────────

    async getComments(postId: string): Promise<Comment[]> {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                id,
                body,
                created_at,
                author_id,
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

        return (data ?? []).map((row: any) => ({
            id: row.id,
            text: row.body,
            timestamp: new Date(row.created_at).getTime(),
            likes: 0,
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
    },

    async addComment(postId: string, authorId: string, text: string): Promise<Comment | null> {
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, author_id: authorId, body: text })
            .select(`
                id,
                body,
                created_at,
                profiles!comments_author_id_fkey (
                    id, handle, name, avatar_url, status
                )
            `)
            .single();

        if (error) {
            console.error('[SupabasePostService.addComment]', error.message);
            return null;
        }

        return {
            id: data.id,
            text: data.body,
            timestamp: new Date(data.created_at).getTime(),
            likes: 0,
            isLiked: false,
            user: {
                id: data.profiles.id,
                handle: data.profiles.handle,
                name: data.profiles.name,
                avatar: data.profiles.avatar_url ?? 'https://i.pravatar.cc/150?u=default',
                status: data.profiles.status ?? 'none',
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
};
