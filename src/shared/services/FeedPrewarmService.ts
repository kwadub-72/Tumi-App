import { supabase } from '@/src/shared/services/supabase';

export interface PrewarmedPost {
    id: string;
    author_id: string;
    post_type: string;
    payload: any;
    caption: string | null;
    media_url: string | null;
    media_type: string | null;
    created_at: string;
}

export class FeedPrewarmService {
    /**
     * Pre-warms the feed during onboarding so the index isn't empty upon first launch.
     * Fetches the 2 most recent posts/logs from each of the sequentially followed users.
     * 
     * @param followedUserIds Array of user UUIDs the user just followed
     * @returns Promise resolving to the pre-warmed posts array, ordered sequentially (newest first)
     */
    static async prewarmUserFeed(followedUserIds: string[]): Promise<PrewarmedPost[]> {
        if (!followedUserIds || followedUserIds.length === 0) {
            return [];
        }

        try {
            // Concurrent fetching to maximize speed during onboarding transition
            const fetchPromises = followedUserIds.map(async (userId) => {
                const { data, error } = await supabase
                    .from('posts')
                    .select('id, author_id, post_type, payload, caption, media_url, media_type, created_at')
                    .eq('author_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(2);
                
                if (error) {
                    console.error(`[FeedPrewarmService] Error fetching posts for user ${userId}:`, error.message);
                    return [];
                }
                return (data || []) as PrewarmedPost[];
            });

            const results = await Promise.all(fetchPromises);
            
            // Flatten and sort the consolidated timeline by descending date
            const allPosts = results.flat();
            allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return allPosts;
        } catch (error) {
            console.error('[FeedPrewarmService] Exception during feed pre-warming:', error);
            return [];
        }
    }
}
