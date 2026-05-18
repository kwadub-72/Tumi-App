import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/AuthStore';
import { supabase } from '@/src/shared/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export interface ScoreboardMember {
    id: string;
    name: string;
    handle: string;
    avatar: string | null;
    status: 'none' | 'natural' | 'enhanced';
    activity?: string;
    activityIcon?: string;
    logged: boolean;
    streak: number;
    targetType: string;
    progress: {
        percentage: number;
        label: string;
    };
    // Competitive Metadata
    points: number;
    rank: number;
    previousRank: number;
    rankChange: number;
}

// Initial points seeded for high fidelity, premium competitive feel
const FAKE_INITIAL_POINTS_BY_HANDLE: Record<string, number> = {
    'rcooper': 420,
    'swhite': 380,
    'preed': 310,
    'amiller': 290,
    'kwadub': 250, // Kwaku starts in 5th place
    'cjones': 210,
    'qtaylor': 180,
    'arivera': 150,
    'hsolo': 120,
    'lorgana': 90,
    'lskywalker': 60,
    'mbailey': 40,
    'pscott': 10,
};

const normalizeHandle = (handle: string): string => {
    return handle.replace(/^@/, '').toLowerCase().trim();
};

const getPlaceholderProgress = (index: number) => {
    const progressOptions = [
        {
            targetType: 'Protein',
            progress: { percentage: 0.85, label: '187g / 220g' }
        },
        {
            targetType: 'Calories',
            progress: { percentage: 0.92, label: '2,480 / 2,700 kcal' }
        },
        {
            targetType: 'Carbs',
            progress: { percentage: 0.64, label: '210g / 330g' }
        },
        {
            targetType: 'Fats',
            progress: { percentage: 0.78, label: '62g / 80g' }
        }
    ];
    return progressOptions[index % progressOptions.length];
};

interface CachedScoreboardState {
    points: Record<string, number>;
    yesterdayRankings: Record<string, number>;
    yesterdayPoints: Record<string, number>;
    lastOpenDate: string; // YYYY-MM-DD
}

export function useTribeScoreboard(tribeId?: string) {
    const { session } = useAuthStore();
    const currentUserId = session?.user?.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ScoreboardMember[]>([]);
    
    // Internal cache state references
    const pointsMapRef = useRef<Record<string, number>>({});
    const yesterdayRanksRef = useRef<Record<string, number>>({});
    const yesterdayPointsRef = useRef<Record<string, number>>({});
    const rawMembersRef = useRef<any[]>([]);

    // Resolve mock IDs to real database UUIDs if mock is used (t1, t2, t3, t4)
    let targetTribeId = tribeId;
    if (targetTribeId && targetTribeId.startsWith('t')) {
        const mockMap: Record<string, string> = {
            't1': 'b0000000-0000-0000-0000-000000000001', // Harvard
            't2': 'b0000000-0000-0000-0000-000000000002', // Iron Brotherhood
            't3': 'b0000000-0000-0000-0000-000000000003', // Team Flex
            't4': 'b0000000-0000-0000-0000-000000000004'  // Cut Squad
        };
        targetTribeId = mockMap[targetTribeId] || targetTribeId;
    }

    const cacheKey = `TUMI_TRIBES_SCOREBOARD_STATE_V2_${targetTribeId}`;

    // Load scoreboard and points from cache and remote DB
    const fetchScoreboard = useCallback(async () => {
        if (!targetTribeId) return;
        setLoading(true);

        const { data: members, error } = await supabase
            .rpc('get_scoreboard_members', { target_tribe_id: targetTribeId });

        if (error) {
            console.error('Error fetching tribe scoreboard members:', error);
            setLoading(false);
            return;
        }

        if (members) {
            rawMembersRef.current = members;

            // 1. Read points and rankings from AsyncStorage cache
            let cachedState: CachedScoreboardState | null = null;
            try {
                const rawCached = await AsyncStorage.getItem(cacheKey);
                if (rawCached) {
                    cachedState = JSON.parse(rawCached);
                }
            } catch (e) {
                console.error('Failed to load scoreboard cache:', e);
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const isFirstOpenOfTheDay = cachedState ? cachedState.lastOpenDate !== todayStr : true;

            // 2. Initialize points from cache or fake seeds
            const updatedPointsMap: Record<string, number> = {};
            const initialYesterdayPoints: Record<string, number> = {};
            
            members.forEach((m: any, index: number) => {
                const normH = normalizeHandle(m.handle || '');
                const seedPts = FAKE_INITIAL_POINTS_BY_HANDLE[normH] ?? 0;
                
                // If we have cached points, keep them, otherwise seed them
                const cachedPoints = cachedState?.points?.[m.id];
                updatedPointsMap[m.id] = cachedPoints ?? seedPts;

                // Yesterday's points are used to show yesterday's values during first-open transitions
                initialYesterdayPoints[m.id] = cachedState?.yesterdayPoints?.[m.id] ?? cachedPoints ?? seedPts;
            });

            pointsMapRef.current = updatedPointsMap;
            yesterdayPointsRef.current = initialYesterdayPoints;

            // 3. Compute rankings for "Today" and "Yesterday"
            const baseMapped: ScoreboardMember[] = members.map((m: any, index: number) => {
                const placeholder = getPlaceholderProgress(index);
                return {
                    id: m.id,
                    name: m.name || 'Anonymous User',
                    handle: m.handle || '@anonymous',
                    avatar: m.avatar_url,
                    status: (m.status as any) || 'none',
                    activity: m.activity || undefined,
                    activityIcon: m.activity_icon || undefined,
                    logged: !!m.logged,
                    streak: m.streak || 0,
                    targetType: placeholder.targetType,
                    progress: placeholder.progress,
                    points: 0,
                    rank: 0,
                    previousRank: 0,
                    rankChange: 0,
                };
            });

            // Rank today's list
            const rankedToday = sortAndRankList(baseMapped, updatedPointsMap, cachedState?.yesterdayRankings || {});

            // Collect today's ranks as tomorrow's yesterday ranks
            const todayRanksMap: Record<string, number> = {};
            rankedToday.forEach(m => {
                todayRanksMap[m.id] = m.rank;
            });

            // Set up yesterday ranks for the trend calculation
            if (cachedState?.yesterdayRankings) {
                yesterdayRanksRef.current = cachedState.yesterdayRankings;
            } else {
                // First open ever: initialize yesterday's ranks as today's
                yesterdayRanksRef.current = todayRanksMap;
            }

            // 4. Handle "First-Open Realization" Crossover Animation Logic
            if (isFirstOpenOfTheDay && cachedState?.yesterdayRankings) {
                // Render yesterday's rankings and points initially
                const rankedYesterday = sortAndRankList(baseMapped, yesterdayPointsRef.current, yesterdayRanksRef.current);
                setData(rankedYesterday);

                // Save today's values in storage so subsequent opens are not "first open"
                const nextCache: CachedScoreboardState = {
                    points: updatedPointsMap,
                    yesterdayRankings: yesterdayRanksRef.current, // Keep yesterday's ranks preserved until crossover completes
                    yesterdayPoints: initialYesterdayPoints,
                    lastOpenDate: todayStr,
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache));

                // Glide to today's state after 600ms
                setTimeout(() => {
                    // Update rankings based on today's values
                    const rankedTodayState = sortAndRankList(baseMapped, updatedPointsMap, yesterdayRanksRef.current);
                    setData(rankedTodayState);

                    // Commit today's ranks as the new "yesterday" ranks for tomorrow's run
                    const nextFinalCache: CachedScoreboardState = {
                        points: updatedPointsMap,
                        yesterdayRankings: todayRanksMap,
                        yesterdayPoints: updatedPointsMap,
                        lastOpenDate: todayStr,
                    };
                    AsyncStorage.setItem(cacheKey, JSON.stringify(nextFinalCache)).catch(console.error);
                    yesterdayRanksRef.current = todayRanksMap;
                    yesterdayPointsRef.current = updatedPointsMap;
                }, 600);

            } else {
                // Regular open: render today's sorted ranks directly
                setData(rankedToday);

                // Update cache with today's ranks for tomorrow's use
                const nextCache: CachedScoreboardState = {
                    points: updatedPointsMap,
                    yesterdayRankings: todayRanksMap,
                    yesterdayPoints: updatedPointsMap,
                    lastOpenDate: todayStr,
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache));
                yesterdayRanksRef.current = todayRanksMap;
                yesterdayPointsRef.current = updatedPointsMap;
            }
        }
        setLoading(false);
    }, [targetTribeId, cacheKey]);

    useEffect(() => {
        fetchScoreboard();
    }, [fetchScoreboard]);

    // Perform H2H sorting and ranking: tie-breaker checks points descending, then A-Z display name
    const sortAndRankList = (
        membersList: ScoreboardMember[],
        pointsMap: Record<string, number>,
        yesterdayRanks: Record<string, number>
    ): ScoreboardMember[] => {
        const mapped = membersList.map(m => ({
            ...m,
            points: pointsMap[m.id] ?? 0,
        }));

        mapped.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            return a.name.localeCompare(b.name);
        });

        return mapped.map((m, idx) => {
            const currentRank = idx + 1;
            const prevRank = yesterdayRanks[m.id] ?? currentRank;
            return {
                ...m,
                rank: currentRank,
                previousRank: prevRank,
                rankChange: prevRank - currentRank,
            };
        });
    };

    // Point Mutation State Engine
    const mutatePoints = useCallback(async (targetUserId: string, delta: number) => {
        if (!targetTribeId) return;

        setData(prevData => {
            // Find ranks before mutation
            const targetMember = prevData.find(m => m.id === targetUserId);
            if (!targetMember) return prevData;

            const oldRanksMap = prevData.reduce((acc, m) => {
                acc[m.id] = m.rank;
                return acc;
            }, {} as Record<string, number>);

            // Save old user rank
            const myOldRank = prevData.find(m => m.id === currentUserId)?.rank;

            // Apply points mutation
            const updatedPointsMap = {
                ...pointsMapRef.current,
                [targetUserId]: Math.max(0, (pointsMapRef.current[targetUserId] ?? 0) + delta)
            };
            pointsMapRef.current = updatedPointsMap;

            // Re-map with new points
            const baseMembers = rawMembersRef.current.map((m: any, index: number) => {
                const placeholder = getPlaceholderProgress(index);
                const existing = prevData.find(pd => pd.id === m.id);
                return {
                    id: m.id,
                    name: m.name || 'Anonymous User',
                    handle: m.handle || '@anonymous',
                    avatar: m.avatar_url,
                    status: (m.status as any) || 'none',
                    activity: m.activity || undefined,
                    activityIcon: m.activity_icon || undefined,
                    logged: existing ? existing.logged : !!m.logged,
                    streak: existing ? existing.streak : (m.streak || 0),
                    targetType: placeholder.targetType,
                    progress: placeholder.progress,
                    points: updatedPointsMap[m.id] ?? 0,
                    rank: 0,
                    previousRank: 0,
                    rankChange: 0,
                };
            });

            // Re-sort and rank the new list
            const newRankedList = sortAndRankList(baseMembers, updatedPointsMap, yesterdayRanksRef.current);

            // Check for crossovers involving the logged-in user!
            const myNewRank = newRankedList.find(m => m.id === currentUserId)?.rank;
            
            if (myOldRank && myNewRank && myOldRank !== myNewRank) {
                // Intense double haptic pulse (100ms spacing)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 100);
            } else {
                // Soft light feedback for standard point edits
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            // Sync mutated points to AsyncStorage
            const todayStr = new Date().toISOString().split('T')[0];
            
            const nextCache: CachedScoreboardState = {
                points: updatedPointsMap,
                yesterdayRankings: yesterdayRanksRef.current,
                yesterdayPoints: yesterdayPointsRef.current,
                lastOpenDate: todayStr,
            };
            AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache)).catch(console.error);

            return newRankedList;
        });
    }, [targetTribeId, cacheKey, currentUserId]);

    // Simulate Daily Reset (Clears open date to trigger the daily rank swap animation)
    const simulateDailyReset = useCallback(async () => {
        if (!targetTribeId) return;
        try {
            // Read current cache
            const rawCached = await AsyncStorage.getItem(cacheKey);
            if (rawCached) {
                const cachedState = JSON.parse(rawCached) as CachedScoreboardState;
                
                // Clear the lastOpenDate and set yesterday rankings to the current ranks
                const updatedYesterdayRanks: Record<string, number> = {};
                data.forEach(m => {
                    updatedYesterdayRanks[m.id] = m.rank;
                });

                // Yesterday points = current points
                const updatedYesterdayPoints = { ...pointsMapRef.current };

                const nextCache: CachedScoreboardState = {
                    points: pointsMapRef.current,
                    yesterdayRankings: updatedYesterdayRanks,
                    yesterdayPoints: updatedYesterdayPoints,
                    lastOpenDate: '2020-01-01', // old date to trigger first-open logic
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.error('Failed to simulate daily reset:', e);
        }
    }, [targetTribeId, cacheKey, data]);

    // Realtime Postgres Sync (combines database modifications with local points logic)
    useEffect(() => {
        if (!targetTribeId) return;

        const channel = supabase
            .channel(`tribe-scoreboard-realtime-competitive-${targetTribeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                },
                (payload) => {
                    const updatedProfile = payload.new as any;

                    setData((prevData) => {
                        const memberIndex = prevData.findIndex((m) => m.id === updatedProfile.id);
                        if (memberIndex === -1) return prevData;

                        // Calculate user's local today date format: YYYY-MM-DD
                        let todayStr = new Date().toISOString().split('T')[0];
                        try {
                            const userTz = updatedProfile.timezone || 'UTC';
                            todayStr = new Date().toLocaleDateString('en-CA', { timeZone: userTz });
                        } catch (e) {
                            console.warn('Failed to calculate local today using timezone:', updatedProfile.timezone, e);
                        }
                        const isLoggedToday = updatedProfile.last_logged_date === todayStr;

                        const updatedMembers = [...prevData];
                        updatedMembers[memberIndex] = {
                            ...updatedMembers[memberIndex],
                            status: updatedProfile.status || 'none',
                            activity: updatedProfile.activity || undefined,
                            activityIcon: updatedProfile.activity_icon || undefined,
                            logged: isLoggedToday,
                            streak: updatedProfile.current_streak || 0,
                        };

                        // Re-sort list in case streaks changed
                        return sortAndRankList(updatedMembers, pointsMapRef.current, yesterdayRanksRef.current);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [targetTribeId]);

    return {
        loading,
        data,
        mutatePoints,
        simulateDailyReset,
        refresh: fetchScoreboard
    };
}
