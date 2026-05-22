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
    wins: number;
    losses: number;
    rank: number;
    previousRank: number;
    rankChange: number;
}

// Initial points seeded for high fidelity, premium competitive feel
export const FAKE_INITIAL_POINTS_BY_HANDLE: Record<string, number> = {
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

export const FAKE_INITIAL_WINS_BY_HANDLE: Record<string, number> = {
    'rcooper': 8,
    'swhite': 7,
    'preed': 6,
    'amiller': 5,
    'kwadub': 5,
    'cjones': 4,
    'qtaylor': 3,
    'arivera': 3,
    'hsolo': 2,
    'lorgana': 1,
    'lskywalker': 1,
    'mbailey': 0,
    'pscott': 0,
};

export const FAKE_INITIAL_LOSSES_BY_HANDLE: Record<string, number> = {
    'rcooper': 0,
    'swhite': 1,
    'preed': 2,
    'amiller': 3,
    'kwadub': 3,
    'cjones': 4,
    'qtaylor': 5,
    'arivera': 5,
    'hsolo': 6,
    'lorgana': 7,
    'lskywalker': 7,
    'mbailey': 8,
    'pscott': 8,
};

export const normalizeHandle = (handle: string): string => {
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
    wins?: Record<string, number>;
    losses?: Record<string, number>;
    yesterdayRankings: Record<string, number>;
    yesterdayPoints: Record<string, number>;
    lastOpenDate: string; // YYYY-MM-DD
}

export function useTribeScoreboard(tribeId?: string) {
    const { session } = useAuthStore();
    const currentUserId = session?.user?.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ScoreboardMember[]>([]);
    const [header, setHeader] = useState<{
        line1: string;
        line2: string;
        line3: string | null;
        is_competitive: boolean;
    } | null>(null);
    const [competition, setCompetition] = useState<{
        id: string;
        status: 'active' | 'completed';
        style: 'premier' | 'faceoff';
        metric: string;
    } | null>(null);
    
    // Internal cache state references
    const pointsMapRef = useRef<Record<string, number>>({});
    const winsMapRef = useRef<Record<string, number>>({});
    const lossesMapRef = useRef<Record<string, number>>({});
    const yesterdayRanksRef = useRef<Record<string, number>>({});
    const yesterdayPointsRef = useRef<Record<string, number>>({});
    const rawMembersRef = useRef<any[]>([]);
    const tiebreakersRef = useRef<Record<string, {
        max_streak: number;
        pct_2_5: number;
        pct_10: number;
        pct_15: number;
        pct_workout: number;
    }>>({});

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

        // Fetch dynamic metadata header from database RPC
        const { data: headerData, error: headerErr } = await supabase
            .rpc('get_tribe_scoreboard_header', { 
                p_tribe_id: targetTribeId,
                p_user_id: currentUserId || null
            });

        if (!headerErr && headerData) {
            setHeader(headerData);
        }

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

            // Retrieve dynamic database points from active or completed competition ledger
            const { data: comp } = await supabase
                .from('competitions')
                .select('id, status, style, metric')
                .eq('tribe_id', targetTribeId)
                .in('status', ['active', 'completed'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (comp) {
                setCompetition({
                    id: comp.id,
                    status: comp.status as 'active' | 'completed',
                    style: comp.style as 'premier' | 'faceoff',
                    metric: comp.metric
                });
            } else {
                setCompetition(null);
            }

            const dbPointsMap: Record<string, number> = {};
            const tiebreakersMap: Record<string, {
                max_streak: number;
                pct_2_5: number;
                pct_10: number;
                pct_15: number;
                pct_workout: number;
            }> = {};

            if (comp?.id) {
                const { data: tiebreakerRows } = await supabase
                    .rpc('get_competition_scoreboard_tiebreakers', { p_competition_id: comp.id });
                
                if (tiebreakerRows) {
                    tiebreakerRows.forEach((row: any) => {
                        dbPointsMap[row.user_id] = Number(row.total_points);
                        tiebreakersMap[row.user_id] = {
                            max_streak: Number(row.max_streak),
                            pct_2_5: Number(row.pct_2_5),
                            pct_10: Number(row.pct_10),
                            pct_15: Number(row.pct_15),
                            pct_workout: Number(row.pct_workout)
                        };
                    });
                }
            }
            tiebreakersRef.current = tiebreakersMap;

            // 2. Initialize points from DB, cache, or fake seeds
            const updatedPointsMap: Record<string, number> = {};
            const updatedWinsMap: Record<string, number> = {};
            const updatedLossesMap: Record<string, number> = {};
            const initialYesterdayPoints: Record<string, number> = {};
            
            members.forEach((m: any, index: number) => {
                const normH = normalizeHandle(m.handle || '');
                const seedPts = FAKE_INITIAL_POINTS_BY_HANDLE[normH] ?? 0;
                const seedWins = FAKE_INITIAL_WINS_BY_HANDLE[normH] ?? 0;
                const seedLosses = FAKE_INITIAL_LOSSES_BY_HANDLE[normH] ?? 0;
                
                const dbPoints = dbPointsMap[m.id];
                const cachedPoints = cachedState?.points?.[m.id];
                updatedPointsMap[m.id] = dbPoints ?? cachedPoints ?? seedPts;

                const cachedWins = cachedState?.wins?.[m.id];
                updatedWinsMap[m.id] = cachedWins ?? seedWins;

                const cachedLosses = cachedState?.losses?.[m.id];
                updatedLossesMap[m.id] = cachedLosses ?? seedLosses;

                // Yesterday's points are used to show yesterday's values during first-open transitions
                initialYesterdayPoints[m.id] = cachedState?.yesterdayPoints?.[m.id] ?? dbPoints ?? cachedPoints ?? seedPts;
            });

            pointsMapRef.current = updatedPointsMap;
            winsMapRef.current = updatedWinsMap;
            lossesMapRef.current = updatedLossesMap;
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
                    wins: 0,
                    losses: 0,
                    rank: 0,
                    previousRank: 0,
                    rankChange: 0,
                };
            });

            // Rank today's list
            const rankedToday = sortAndRankList(baseMapped, updatedPointsMap, updatedWinsMap, updatedLossesMap, cachedState?.yesterdayRankings || {}, comp?.style as 'premier' | 'faceoff');

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
                const rankedYesterday = sortAndRankList(baseMapped, yesterdayPointsRef.current, updatedWinsMap, updatedLossesMap, yesterdayRanksRef.current, comp?.style as 'premier' | 'faceoff');
                setData(rankedYesterday);

                // Save today's values in storage so subsequent opens are not "first open"
                const nextCache: CachedScoreboardState = {
                    points: updatedPointsMap,
                    wins: updatedWinsMap,
                    losses: updatedLossesMap,
                    yesterdayRankings: yesterdayRanksRef.current, // Keep yesterday's ranks preserved until crossover completes
                    yesterdayPoints: initialYesterdayPoints,
                    lastOpenDate: todayStr,
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache));

                // Glide to today's state after 600ms
                setTimeout(() => {
                    // Update rankings based on today's values
                    const rankedTodayState = sortAndRankList(baseMapped, updatedPointsMap, updatedWinsMap, updatedLossesMap, yesterdayRanksRef.current, comp?.style as 'premier' | 'faceoff');
                    setData(rankedTodayState);

                    // Commit today's ranks as the new "yesterday" ranks for tomorrow's run
                    const nextFinalCache: CachedScoreboardState = {
                        points: updatedPointsMap,
                        wins: updatedWinsMap,
                        losses: updatedLossesMap,
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
                    wins: updatedWinsMap,
                    losses: updatedLossesMap,
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
        winsMap: Record<string, number>,
        lossesMap: Record<string, number>,
        yesterdayRanks: Record<string, number>,
        compStyle?: 'premier' | 'faceoff'
    ): ScoreboardMember[] => {
        const mapped = membersList.map(m => ({
            ...m,
            points: pointsMap[m.id] ?? 0,
            wins: winsMap[m.id] ?? 0,
            losses: lossesMap[m.id] ?? 0,
        }));

        mapped.sort((a, b) => {
            // Faceoff style sorts first by Wins count descending, then Losses count ascending
            if (compStyle === 'faceoff') {
                if (b.wins !== a.wins) {
                    return b.wins - a.wins;
                }
                if (a.losses !== b.losses) {
                    return a.losses - b.losses;
                }
            }

            // Priority 1 / Tier 1: Aggregate Cumulative Points
            if (b.points !== a.points) {
                return b.points - a.points;
            }

            const tbA = tiebreakersRef.current[a.id];
            const tbB = tiebreakersRef.current[b.id];

            if (tbA && tbB) {
                // Priority 2 / Tier 2: Total Daily Exercise Bonuses (pct_workout)
                if (tbB.pct_workout !== tbA.pct_workout) {
                    return tbB.pct_workout - tbA.pct_workout;
                }
                // Priority 3 / Tier 3: Longest In-Season Logging Streak (max_streak)
                if (tbB.max_streak !== tbA.max_streak) {
                    return tbB.max_streak - tbA.max_streak;
                }
                // Priority 4: Higher % of completed daily macros within 2.5g of target
                if (tbB.pct_2_5 !== tbA.pct_2_5) {
                    return tbB.pct_2_5 - tbA.pct_2_5;
                }
                // Priority 5: Higher % of completed daily macros within 10g of target
                if (tbB.pct_10 !== tbA.pct_10) {
                    return tbB.pct_10 - tbA.pct_10;
                }
                // Priority 6: Higher % of completed daily macros within 15g of target
                if (tbB.pct_15 !== tbA.pct_15) {
                    return tbB.pct_15 - tbA.pct_15;
                }
            }

            // Priority 7: Alphabetical A-Z
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
        if (competition?.status === 'completed') {
            console.log('Leaderboard is frozen - competition is completed');
            return;
        }

        // Perform instant optimistic UI update for high-fidelity animations
        setData(prevData => {
            const oldRanksMap = prevData.reduce((acc, m) => {
                acc[m.id] = m.rank;
                return acc;
            }, {} as Record<string, number>);

            const myOldRank = prevData.find(m => m.id === currentUserId)?.rank;

            const updatedPointsMap = {
                ...pointsMapRef.current,
                [targetUserId]: Math.max(0, (pointsMapRef.current[targetUserId] ?? 0) + delta)
            };
            pointsMapRef.current = updatedPointsMap;

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
                    wins: winsMapRef.current[m.id] ?? 0,
                    losses: lossesMapRef.current[m.id] ?? 0,
                    rank: 0,
                    previousRank: 0,
                    rankChange: 0,
                };
            });

            const newRankedList = sortAndRankList(baseMembers, updatedPointsMap, winsMapRef.current, lossesMapRef.current, yesterdayRanksRef.current, competition?.style);
            const myNewRank = newRankedList.find(m => m.id === currentUserId)?.rank;
            
            if (myOldRank && myNewRank && myOldRank !== myNewRank) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 100);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const nextCache: CachedScoreboardState = {
                points: updatedPointsMap,
                wins: winsMapRef.current,
                losses: lossesMapRef.current,
                yesterdayRankings: yesterdayRanksRef.current,
                yesterdayPoints: yesterdayPointsRef.current,
                lastOpenDate: todayStr,
            };
            AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache)).catch(console.error);

            return newRankedList;
        });

        // Fire database commit async in background
        (async () => {
            const { data: comp } = await supabase
                .from('competitions')
                .select('id')
                .eq('tribe_id', targetTribeId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (comp?.id) {
                const todayStr = new Date().toISOString().split('T')[0];
                const { error: insertErr } = await supabase
                    .from('competition_scores_ledger')
                    .insert({
                        competition_id: comp.id,
                        user_id: targetUserId,
                        date: todayStr,
                        points_awarded: delta,
                        metadata: { qa_simulated: true, delta }
                    });

                if (insertErr && insertErr.code === '23505') {
                    const randomOffset = Math.floor(Math.random() * 30) + 1;
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - randomOffset);
                    const pastDateStr = pastDate.toISOString().split('T')[0];

                    await supabase
                        .from('competition_scores_ledger')
                        .insert({
                            competition_id: comp.id,
                            user_id: targetUserId,
                            date: pastDateStr,
                            points_awarded: delta,
                            metadata: { qa_simulated: true, delta }
                        });
                }
            }
        })().catch(console.error);

    }, [targetTribeId, cacheKey, currentUserId, competition]);

    // Record Mutation State Engine
    const mutateRecord = useCallback(async (targetUserId: string, winsDelta: number, lossesDelta: number) => {
        if (!targetTribeId) return;
        if (competition?.status === 'completed') {
            console.log('Leaderboard is frozen - competition is completed');
            return;
        }

        // Perform instant optimistic UI update for high-fidelity animations
        setData(prevData => {
            const myOldRank = prevData.find(m => m.id === currentUserId)?.rank;

            const updatedWinsMap = {
                ...winsMapRef.current,
                [targetUserId]: Math.max(0, (winsMapRef.current[targetUserId] ?? 0) + winsDelta)
            };
            const updatedLossesMap = {
                ...lossesMapRef.current,
                [targetUserId]: Math.max(0, (lossesMapRef.current[targetUserId] ?? 0) + lossesDelta)
            };
            winsMapRef.current = updatedWinsMap;
            lossesMapRef.current = updatedLossesMap;

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
                    points: pointsMapRef.current[m.id] ?? 0,
                    wins: updatedWinsMap[m.id] ?? 0,
                    losses: updatedLossesMap[m.id] ?? 0,
                    rank: 0,
                    previousRank: 0,
                    rankChange: 0,
                };
            });

            const newRankedList = sortAndRankList(baseMembers, pointsMapRef.current, updatedWinsMap, updatedLossesMap, yesterdayRanksRef.current, competition?.style);
            const myNewRank = newRankedList.find(m => m.id === currentUserId)?.rank;
            
            if (myOldRank && myNewRank && myOldRank !== myNewRank) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 100);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const nextCache: CachedScoreboardState = {
                points: pointsMapRef.current,
                wins: updatedWinsMap,
                losses: updatedLossesMap,
                yesterdayRankings: yesterdayRanksRef.current,
                yesterdayPoints: yesterdayPointsRef.current,
                lastOpenDate: todayStr,
            };
            AsyncStorage.setItem(cacheKey, JSON.stringify(nextCache)).catch(console.error);

            return newRankedList;
        });
    }, [targetTribeId, cacheKey, currentUserId, competition]);

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
                    wins: winsMapRef.current,
                    losses: lossesMapRef.current,
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

    // Simulate Triple Tie competitive standing resolved by logging streak (Tier 3)
    const simulateTripleTie = useCallback(() => {
        const mockTiebreakers: Record<string, {
            max_streak: number;
            pct_2_5: number;
            pct_10: number;
            pct_15: number;
            pct_workout: number;
        }> = {
            'user-a': { max_streak: 12, pct_2_5: 90, pct_10: 95, pct_15: 98, pct_workout: 80 },
            'user-b': { max_streak: 5,  pct_2_5: 90, pct_10: 95, pct_15: 98, pct_workout: 80 },
            'user-c': { max_streak: 15, pct_2_5: 90, pct_10: 95, pct_15: 98, pct_workout: 80 }
        };
        
        tiebreakersRef.current = mockTiebreakers;
        
        const mockedMembers: ScoreboardMember[] = [
            {
                id: 'user-b',
                name: 'Peyton Reed (B)',
                handle: '@preed',
                avatar: 'https://i.pravatar.cc/100?img=47',
                status: 'natural',
                activity: 'Powerlifting',
                logged: true,
                streak: 5,
                targetType: 'Protein',
                progress: { percentage: 0.8, label: '160g / 200g' },
                points: 500,
                wins: 8,
                losses: 1,
                rank: 1,
                previousRank: 1,
                rankChange: 0
            },
            {
                id: 'user-c',
                name: 'Sam White (C)',
                handle: '@swhite',
                avatar: 'https://i.pravatar.cc/100?img=11',
                status: 'natural',
                activity: 'Crossfit',
                logged: true,
                streak: 15,
                targetType: 'Protein',
                progress: { percentage: 0.8, label: '160g / 200g' },
                points: 500,
                wins: 8,
                losses: 1,
                rank: 1,
                previousRank: 1,
                rankChange: 0
            },
            {
                id: 'user-a',
                name: 'Riley Cooper (A)',
                handle: '@rcooper',
                avatar: 'https://i.pravatar.cc/100?img=12',
                status: 'natural',
                activity: 'Bodybuilding',
                logged: true,
                streak: 12,
                targetType: 'Protein',
                progress: { percentage: 0.8, label: '160g / 200g' },
                points: 500,
                wins: 8,
                losses: 1,
                rank: 1,
                previousRank: 1,
                rankChange: 0
            }
        ];
        
        // Sort using the tier rules:
        const sorted = sortAndRankList(
            mockedMembers,
            { 'user-a': 500, 'user-b': 500, 'user-c': 500 },
            { 'user-a': 8, 'user-b': 8, 'user-c': 8 },
            { 'user-a': 1, 'user-b': 1, 'user-c': 1 },
            {},
            'faceoff'
        );
        
        setData(sorted);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [targetTribeId, sortAndRankList]);

    // Realtime Postgres Sync (combines database modifications with local points logic)
    useEffect(() => {
        if (!targetTribeId) return;

        const channelId = Math.random().toString(36).substring(7);
        const channel = supabase
            .channel(`tribe-scoreboard-realtime-competitive-${targetTribeId}-${channelId}`)
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
                        return sortAndRankList(updatedMembers, pointsMapRef.current, winsMapRef.current, lossesMapRef.current, yesterdayRanksRef.current, competition?.style);
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'competition_scores_ledger',
                },
                () => {
                    // Pull fresh ledger totals when a score commit is written
                    fetchScoreboard();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [targetTribeId, fetchScoreboard]);

    return {
        loading,
        data,
        header,
        competition,
        mutatePoints,
        mutateRecord,
        simulateDailyReset,
        simulateTripleTie,
        refresh: fetchScoreboard
    };
}
