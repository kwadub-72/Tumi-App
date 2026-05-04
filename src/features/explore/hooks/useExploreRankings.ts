import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/src/shared/services/supabase';
import { ExploreService } from '../services/exploreService';
import { SimilarUser, PopularUser } from '../types';

export function useExploreRankings(filters?: any) {
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [popularUsers, setPopularUsers] = useState<PopularUser[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [errorSimilar, setErrorSimilar] = useState<string | null>(null);
  const [errorPopular, setErrorPopular] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    setIsLoadingSimilar(true);
    setIsLoadingPopular(true);
    setErrorSimilar(null);
    setErrorPopular(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        setIsLoadingSimilar(false);
        setIsLoadingPopular(false);
        return;
      }

      const { bestMatches, mostPopular } = await ExploreService.getExploreDiscovery(currentUserId, filters || {});

      setSimilarUsers(bestMatches);
      setPopularUsers(mostPopular);
    } catch (err: any) {
      console.error('[useExploreRankings]', err);
      setErrorSimilar('Failed to load similar users');
      setErrorPopular('Failed to load popular users');
    } finally {
      setIsLoadingSimilar(false);
      setIsLoadingPopular(false);
    }
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      fetchRankings();
    }, [fetchRankings])
  );

  return {
    similarUsers,
    popularUsers,
    isLoadingSimilar,
    isLoadingPopular,
    errorSimilar,
    errorPopular,
    refresh: fetchRankings
  };
}
