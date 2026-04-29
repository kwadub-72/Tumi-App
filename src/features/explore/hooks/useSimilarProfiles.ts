import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { ExploreService } from '../services/exploreService';
import { SimilarUser } from '../types';

/**
 * Fetches the top-5 profiles most similar to `targetUserId`.
 * The reference anchor is the *target user*, not the currently
 * authenticated user — matching the "Similar Profiles" screen intent.
 */
export function useSimilarProfiles(targetUserId: string | undefined) {
  const [profiles, setProfiles] = useState<SimilarUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await ExploreService.getSimilarToUser(targetUserId);
      // Pre-sort by similarity score (highest first) and hard-cap at 5
      const sorted = [...results]
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 5);
      setProfiles(sorted);
    } catch (err: any) {
      console.error('[useSimilarProfiles]', err);
      setError('Failed to load similar profiles.');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useFocusEffect(
    useCallback(() => {
      fetch();
    }, [fetch])
  );

  return { profiles, isLoading, error, refresh: fetch };
}
