import { supabase } from '@/src/shared/services/supabase';
import { SimilarUser, PopularUser } from '../types';
import { User } from '@/src/shared/models/types';
import { ACTIVITIES } from '@/src/shared/constants/Activities';

export const ExploreService = {
  /**
   * Fetches profiles most similar to a *specific target user* (used by
   * the "Similar Profiles" screen triggered from another user's profile).
   * Delegates to the same `get_most_similar` RPC but uses the target's id
   * as the reference anchor instead of the authenticated user's id.
   */
  async getSimilarToUser(targetUserId: string): Promise<SimilarUser[]> {
    const { data, error } = await supabase.rpc('get_most_similar', {
      p_user_id: targetUserId
    });

    if (error) {
      console.error('[ExploreService.getSimilarToUser]', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...this.mapDbProfileToUser(row),
      similarityScore: parseFloat(row.similarity_score || 0)
    }));
  },

  async getMostSimilar(currentUserId: string): Promise<SimilarUser[]> {
    const { data, error } = await supabase.rpc('get_most_similar', {
      p_user_id: currentUserId
    });

    if (error) {
      console.error('[ExploreService.getMostSimilar]', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...this.mapDbProfileToUser(row),
      similarityScore: parseFloat(row.similarity_score || 0)
    }));
  },

  async getMostPopular(limit: number = 5): Promise<PopularUser[]> {
    const { data, error } = await supabase.rpc('get_most_popular', {
      p_limit: limit
    });

    if (error) {
      console.error('[ExploreService.getMostPopular]', error.message);
      return [];
    }

    return (data || []).map((row: any, index: number) => ({
      ...this.mapDbProfileToUser(row),
      engagementScore: parseFloat(row.engagement_score || 0),
      rank: index + 1
    }));
  },

  async searchUsers(query: string): Promise<User[]> {
    const { data, error } = await supabase.rpc('search_explore', {
      search_query: query,
      search_type: 'users',
      result_limit: 25
    });

    if (error) {
      console.error('[ExploreService.searchUsers]', error.message);
      return [];
    }

    return (data || []).map((row: any) => this.mapDbProfileToUser(row));
  },

  async searchTribes(query: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('search_explore', {
      search_query: query,
      search_type: 'tribes',
      result_limit: 25
    });

    if (error) {
      console.error('[ExploreService.searchTribes]', error.message);
      return [];
    }

    return data || [];
  },

  mapDbProfileToUser(row: any): User {
    let activity: string | undefined = row.activity ?? undefined;
    let activityIcon: string | undefined = row.activity_icon ?? undefined;

    if (activity) {
      // Find the exact match in the canonical activity list
      const canonicalActivity = ACTIVITIES.find(a => a.name === activity);

      if (canonicalActivity) {
        // Activity is valid — enforce the canonical icon regardless of what's stored
        activityIcon = canonicalActivity.icon;
      } else {
        // Activity is NOT in the canonical list — apply best-effort normalization
        const actLower = activity.toLowerCase();
        if (actLower.includes('bodybuild')) {
          const isCut = actLower.includes('cut');
          activity = isCut ? 'Bodybuilder (Cut)' : 'Bodybuilder (Bulk)';
        } else if (actLower.includes('powerlift')) {
          activity = 'Powerlifting';
        } else if (actLower.includes('yoga') || actLower.includes('pilates')) {
          activity = 'Yoga / Pilates';
        } else if (actLower.includes('crossfit') || actLower.includes('functional') || actLower.includes('calisthenics')) {
          activity = 'Functional';
        } else if (actLower.includes('run')) {
          activity = 'Distance Runner';
        } else if (actLower.includes('cycling') || actLower.includes('bike')) {
          activity = 'Cycling';
        } else if (actLower.includes('hike') || actLower.includes('hiking')) {
          activity = 'Hiking';
        } else if (actLower.includes('box') || actLower.includes('mma') || actLower.includes('martial') || actLower.includes('bjj') || actLower.includes('wrestl')) {
          activity = 'Combat Athlete (MMA / Boxing / BJJ / Wrestling)';
        } else if (actLower.includes('gymnast') || actLower.includes('cheer')) {
          activity = 'Gymnastics';
        } else {
          // Final fallback for truly unknown activities
          activity = 'Bodybuilder (Bulk)';
        }
        // Re-look up the canonical icon for the normalized activity
        const normalizedCanonical = ACTIVITIES.find(a => a.name === activity);
        activityIcon = normalizedCanonical?.icon ?? 'hammer';
      }
    }

    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      avatar: row.avatar_url,
      status: row.status,
      activity: activity,
      activityIcon: activityIcon,
      height: row.height,
      weight: row.live_weight_lbs != null
        ? Math.round(parseFloat(row.live_weight_lbs))
        : row.weight_lbs,
      bfs: row.body_fat_pct,
      isFollowing: false,
      isRequested: false,
      isPrivate: false,
      stats: {
        meals: parseInt(row.meal_count) || 0,
        workouts: parseInt(row.workout_count) || 0,
        updates: parseInt(row.update_count) || 0
      }
    } as User;
  }
};
