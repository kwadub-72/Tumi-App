/**
 * useExerciseSearch.ts
 * React hook that drives the exercise search screen.
 * Debounces input, paginates results, and exposes loading / error states.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ExerciseSearchResult,
    ExerciseSearchService,
    exerciseSearchService,
} from '../exerciseSearchService';

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 10; // fixed by API

export interface UseExerciseSearchReturn {
    results: ExerciseSearchResult[];
    isLoading: boolean;
    error: string | null;
    /** Call when the user changes the search query */
    setQuery: (q: string) => void;
    query: string;
}

export function useExerciseSearch(
    service: ExerciseSearchService = exerciseSearchService
): UseExerciseSearchReturn {
    const [query, setQueryState] = useState('');
    const [results, setResults] = useState<ExerciseSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentQuery = useRef('');

    const executeSearch = useCallback(
        async (q: string) => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await service.search({
                    name: q.trim() || undefined,
                });

                // Guard against stale responses
                if (q !== currentQuery.current) return;

                setResults(data);
            } catch (err: unknown) {
                if (q !== currentQuery.current) return;
                const msg = err instanceof Error ? err.message : 'Search failed';
                setError(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [service]
    );

    const setQuery = useCallback(
        (q: string) => {
            setQueryState(q);
            currentQuery.current = q;

            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            debounceTimer.current = setTimeout(() => {
                executeSearch(q);
            }, DEBOUNCE_MS);
        },
        [executeSearch]
    );

    // Initial load — show all exercises when screen opens
    useEffect(() => {
        executeSearch('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        results,
        isLoading,
        error,
        setQuery,
        query,
    };
}
