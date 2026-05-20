import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    Alert, Animated, Dimensions, ScrollView, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedPost, Tribe } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';
import { SupabaseTribeService } from '@/src/shared/services/SupabaseTribeService';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { CalendarIcon, ShieldVSIcon, TrophyTribeIcon, PrivacyIcon } from '../components/TribeIcons';
import TribeInfoModal from '../components/TribeInfoModal';
import CompetitionWinnerOverlay from '../components/CompetitionWinnerOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useAuthStore } from '@/store/AuthStore';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const { width } = Dimensions.get('window');

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
    bg: '#1A1A1A',
    gold: '#DAA520',
    dust: '#EDE8D5',
    sienna: '#8B4513',
    charcoalGray: '#787878',
    white: '#FFFFFF',
    natural: '#1BB607',
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'meals' | 'workouts' | 'macros';
const TABS: { id: TabId; icon: string; label: string; iconLib: 'mci' | 'ion' }[] = [
    { id: 'meals',    icon: 'fire',        label: 'meals',    iconLib: 'mci' },
    { id: 'workouts', icon: 'dumbbell',    label: 'workouts', iconLib: 'mci' },
    { id: 'macros',   icon: 'stats-chart', label: 'macros',   iconLib: 'ion' },
];
const TAB_IDS: TabId[] = TABS.map(t => t.id);

const INITIAL_DAYS = 7;
const LOAD_MORE_DAYS = 3;

function filterForTab(posts: FeedPost[], tab: TabId): FeedPost[] {
    switch (tab) {
        case 'meals':    return posts.filter(p => !!p.meal);
        case 'workouts': return posts.filter(p => !!p.workout);
        case 'macros':   return posts.filter(p => !!(p.macroUpdate || p.snapshot));
        default:         return [];
    }
}

export default function TribeProfileScreen({ tribeId }: { tribeId: string }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const session = useAuthStore(state => state.session);
    const currentUserId = session?.user?.id ?? '';

    const resolvedTribeId = React.useMemo(() => {
        if (tribeId && tribeId.startsWith('t')) {
            const mockMap: Record<string, string> = {
                't1': 'b0000000-0000-0000-0000-000000000001',
                't2': 'b0000000-0000-0000-0000-000000000002',
                't3': 'b0000000-0000-0000-0000-000000000003',
                't4': 'b0000000-0000-0000-0000-000000000004'
            };
            return mockMap[tribeId] || tribeId;
        }
        return tribeId;
    }, [tribeId]);

    const { isMember, isRequested, joinTribe, leaveTribe, refreshMyTribes } = useUserTribeStore();

    const [tribe, setTribe] = useState<Tribe | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('meals');
    const [headerHeight, setHeaderHeight] = useState(0);
    const [daysBack, setDaysBack] = useState(INITIAL_DAYS);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<any>({});
    const [winnerOverlayVisible, setWinnerOverlayVisible] = useState(false);
    const [winnerData, setWinnerData] = useState<any>(null);

    // Horizontal pager
    const pagerRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Vertical scroll (collapsible header)
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabScrollOffsets = useRef<Record<TabId, number>>({ meals: 0, workouts: 0, macros: 0 });

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, Math.max(headerHeight, 1)],
        outputRange: [0, -headerHeight],
        extrapolate: 'clamp',
    });

    const handleScroll = (tab: TabId) => (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        tabScrollOffsets.current[tab] = y;
        scrollY.setValue(Math.max(0, y));
    };

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchTribe = useCallback(async () => {
        const data = await SupabaseTribeService.getTribe(tribeId);
        if (data) setTribe(data);
    }, [tribeId]);

    const fetchPosts = useCallback(async (days: number) => {
        if (!currentUserId) return;
        const data = await SupabaseTribeService.getTribeFeed(currentUserId, tribeId, days);
        setPosts(data);
    }, [tribeId, currentUserId]);

    useEffect(() => {
        fetchTribe();
    }, [fetchTribe]);

    useEffect(() => {
        fetchPosts(daysBack);
    }, [fetchPosts, daysBack]);

    // ── Check for Concluded Competition Winner Celebration ────────────────────
    useEffect(() => {
        if (!tribeId || !tribe) {
            console.log("[WinnerCheck] Skip: tribeId or tribe is missing", { tribeId, tribe: !!tribe });
            return;
        }

        const checkCompetitionWinner = async () => {
            try {
                console.log("[WinnerCheck] Querying completed competitions for tribeId:", resolvedTribeId);
                // Fetch completed competition for this tribe
                const { data: compData, error: compErr } = await supabase
                    .from('competitions')
                    .select('*')
                    .eq('tribe_id', resolvedTribeId)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (compErr) {
                    console.error("[WinnerCheck] Error querying completed competitions:", compErr);
                    return;
                }

                if (!compData || compData.length === 0) {
                    console.log("[WinnerCheck] No completed competitions found.");
                    return;
                }

                const competition = compData[0];
                console.log("[WinnerCheck] Found completed competition:", competition.id);

                // Check if user has already dismissed this overlay
                const cacheKey = `TUMI_TRIBES_WINNER_OVERLAY_DISMISSED_${resolvedTribeId}`;
                const dismissed = await AsyncStorage.getItem(cacheKey);
                console.log("[WinnerCheck] Dismissed cache key value:", dismissed);
                if (dismissed === 'true') {
                    console.log("[WinnerCheck] Overlay already dismissed for this competition. Skipping.");
                    return;
                }


                // Fetch scoreboard cache to check latest live scores
                let cachedPointsMap: Record<string, number> = {};
                try {
                    const cacheKeyScoreboard = `TUMI_TRIBES_SCOREBOARD_STATE_V2_${resolvedTribeId}`;
                    const cachedStr = await AsyncStorage.getItem(cacheKeyScoreboard);
                    if (cachedStr) {
                        const parsed = JSON.parse(cachedStr);
                        if (parsed && parsed.points) {
                            cachedPointsMap = parsed.points;
                        }
                    }
                } catch (cacheErr) {
                    console.log("[WinnerCheck] Error reading cached points:", cacheErr);
                }

                // Call scoreboard RPCs to fetch and sort the winning champion member
                console.log("[WinnerCheck] Fetching scoreboard members and tiebreakers...");
                const { data: members, error: memErr } = await supabase
                    .rpc('get_scoreboard_members', { target_tribe_id: resolvedTribeId });
                const { data: tiebreakerRows, error: tieErr } = await supabase
                    .rpc('get_competition_scoreboard_tiebreakers', { p_competition_id: competition.id });

                if (memErr || tieErr) {
                    console.error("[WinnerCheck] RPC Errors:", { memErr, tieErr });
                }

                if (members && members.length > 0) {
                    const dbPointsMap: Record<string, number> = {};
                    const tiebreakersMap: Record<string, any> = {};

                    const FAKE_INITIAL_POINTS_BY_HANDLE: Record<string, number> = {
                        'rcooper': 420,
                        'swhite': 380,
                        'preed': 310,
                        'amiller': 290,
                        'kwadub': 250,
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

                    // First populate with cached points or fake seed points to ensure we never have 0 pts
                    console.log("[WinnerCheck] cachedPointsMap keys & values:", Object.keys(cachedPointsMap), cachedPointsMap);
                    members.forEach((m: any) => {
                        const normH = normalizeHandle(m.handle || '');
                        const seedPts = FAKE_INITIAL_POINTS_BY_HANDLE[normH] ?? 0;
                        const cachedPts = cachedPointsMap[m.id];
                        dbPointsMap[m.id] = cachedPts ?? seedPts;
                        console.log(`[WinnerCheck] Member: ${m.name} (${m.handle}) [ID: ${m.id}] | cachedPts: ${cachedPts} | seedPts: ${seedPts} | final: ${dbPointsMap[m.id]}`);
                    });

                    // Overwrite with actual DB ledger points if available
                    if (tiebreakerRows && tiebreakerRows.length > 0) {
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

                    // Sort exactly according to useTribeScoreboard high-fidelity tiebreaker rules
                    const sorted = [...members].sort((a, b) => {
                        const ptsA = dbPointsMap[a.id] || 0;
                        const ptsB = dbPointsMap[b.id] || 0;
                        if (ptsB !== ptsA) {
                            return ptsB - ptsA;
                        }

                        const tbA = tiebreakersMap[a.id];
                        const tbB = tiebreakersMap[b.id];

                        if (tbA && tbB) {
                            if (tbB.max_streak !== tbA.max_streak) return tbB.max_streak - tbA.max_streak;
                            if (tbB.pct_2_5 !== tbA.pct_2_5) return tbB.pct_2_5 - tbA.pct_2_5;
                            if (tbB.pct_10 !== tbA.pct_10) return tbB.pct_10 - tbA.pct_10;
                            if (tbB.pct_15 !== tbA.pct_15) return tbB.pct_15 - tbA.pct_15;
                            if (tbB.pct_workout !== tbA.pct_workout) return tbB.pct_workout - tbA.pct_workout;
                        }

                        return (a.name || '').localeCompare(b.name || '');
                    });

                    if (sorted.length > 0) {
                        const champion = sorted[0];
                        const score = dbPointsMap[champion.id] || 0;
                        console.log("[WinnerCheck] Found champion:", champion.name, "with points:", score);
                        
                        const championData = {
                            name: champion.name || 'Anonymous User',
                            handle: champion.handle || '@anonymous',
                            avatar: champion.avatar_url || null,
                            points: score
                        };


                        setWinnerData(championData);
                        setWinnerOverlayVisible(true);
                    } else {
                        console.log("[WinnerCheck] No sorted members found.");
                    }
                } else {
                    console.log("[WinnerCheck] Members list is empty or null");
                }
            } catch (err) {
                console.error('[WinnerCheck] Error checking competition winner:', err);
            }
        };

        checkCompetitionWinner();
    }, [tribeId, tribe, currentUserId]);

    // ── Realtime: keep like counts live for all tribe posts ───────────────────
    useEffect(() => {
        if (!tribeId) return;

        const channel = supabase
            .channel(`tribe-likes-${tribeId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'likes' },
                async () => {
                    // Re-fetch posts to get updated like counts
                    // In production this could be an atomic increment, but a targeted
                    // re-fetch keeps the code simple and correct.
                    const fresh = await SupabaseTribeService.getTribeFeed(currentUserId, tribeId, daysBack);
                    setPosts(fresh);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tribeId, currentUserId, daysBack]);

    // ── Load more (scroll to end = +3 days) ──────────────────────────────────
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        const newDays = daysBack + LOAD_MORE_DAYS;
        setDaysBack(newDays);
        await fetchPosts(newDays);
        setIsLoadingMore(false);
    }, [isLoadingMore, daysBack, fetchPosts]);

    const isUserMember   = tribe ? isMember(tribe.id) : false;
    const isUserRequested = tribe ? isRequested(tribe.id) : false;
    const isPrivate      = tribe ? tribe.privacy === 'private' : false;
    const canView        = !isPrivate || isUserMember;

    // ── Interaction handlers ──────────────────────────────────────────────────
    const handleLike = useCallback(async (post: FeedPost) => {
        if (!currentUserId) return;
        // Optimistic update
        setPosts(prev => prev.map(p =>
            p.id === post.id
                ? {
                    ...p,
                    isLiked: !p.isLiked,
                    stats: { ...p.stats, likes: p.isLiked ? p.stats.likes - 1 : p.stats.likes + 1 },
                  }
                : p
        ));
        await SupabasePostService.toggleLike(post.id, currentUserId, post.isLiked ?? false);
    }, [currentUserId]);

    const handleJoinPress = useCallback(async () => {
        if (!currentUserId || !tribe) return;
        if (isUserMember) {
            Alert.alert('Leave Tribe', 'Are you sure you want to leave this tribe?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave', style: 'destructive',
                    onPress: async () => {
                        await leaveTribe(currentUserId, tribe.id);
                        await fetchTribe();
                    },
                },
            ]);
            return;
        }
        if (isUserRequested) {
            Alert.alert('Cancel Request', 'Do you want to cancel your join request?', [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes', style: 'destructive',
                    onPress: async () => {
                        await leaveTribe(currentUserId, tribe.id);
                        await fetchTribe();
                    },
                },
            ]);
            return;
        }
        await joinTribe(currentUserId, tribe);
        await fetchTribe();
        if (isPrivate) Alert.alert('Requested', 'Your join request has been sent.');
    }, [currentUserId, isUserMember, isUserRequested, isPrivate, tribe, joinTribe, leaveTribe, fetchTribe]);

    if (!tribe) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={C.gold} size="large" />
            </View>
        );
    }

    const openModal = (config: any) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const switchTab = (tab: TabId, index: number) => {
        setActiveTab(tab);
        pagerRef.current?.scrollTo({ x: index * width, animated: true });
        scrollY.setValue(Math.max(0, tabScrollOffsets.current[tab]));
    };

    // ── Sub-renders ───────────────────────────────────────────────────────────
    const renderTypeIcon = () => {
        const type = tribe.type ?? tribe.focusType;
        const descriptions: Record<string, string> = {
            'accountability': 'Members hold each other accountable to their fitness goals.',
            'head-to-head':   'Tribe members compete directly against one another.',
            'tribe-vs-tribe': 'Your tribe battles other tribes for supremacy.',
        };
        const labels: Record<string, string> = {
            'accountability': 'Accountability',
            'head-to-head':   'Head-to-Head',
            'tribe-vs-tribe': 'Tribe Battle',
        };
        const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
            'accountability': 'calendar-check',
            'head-to-head':   'trophy-outline',
            'tribe-vs-tribe': 'sword-cross',
        };
        
        const iconName = icons[type] ?? 'calendar-check';
        const title = labels[type] ?? 'Accountability';
        const description = descriptions[type] ?? '';

        return (
            <TouchableOpacity onPress={() => openModal({ title, description, iconName })}>
                <MaterialCommunityIcons name={iconName} size={20} color={C.dust} />
            </TouchableOpacity>
        );
    };

    const renderNaturalStatusIcon = () => {
        if (tribe.naturalStatus === null || tribe.naturalStatus === undefined) return null;
        
        const isNatural = tribe.naturalStatus === true;
        const title = isNatural ? 'Natural' : 'Enhanced';
        const description = isNatural ? 'This tribe is 100% natural.' : 'This tribe is enhanced.';
        const iconName = isNatural ? 'leaf' : 'lightning-bolt';
        const color = isNatural ? C.natural : C.gold;

        return (
            <TouchableOpacity onPress={() => openModal({ title, description, iconName })}>
                <MaterialCommunityIcons name={iconName} size={20} color={color} />
            </TouchableOpacity>
        );
    };

    const renderActivityIcon = () => {
        const iconName = resolveActivityIcon(tribe.activityType, tribe.activityIcon);
        const title = tribe.activityType || 'Activity';
        
        const isBulk = tribe.activityType?.toLowerCase().includes('bulk');
        const isCut = tribe.activityType?.toLowerCase().includes('cut');

        return (
            <TouchableOpacity onPress={() => openModal({ 
                title, 
                description: '', 
                iconName,
                modifier: isBulk ? '+' : isCut ? '–' : undefined
            })}>
                <View style={styles.activityIconWrapper}>
                    <MaterialCommunityIcons name={iconName as any} size={20} color={C.dust} />
                    {isBulk && <Text style={styles.activitySymbol}>+</Text>}
                    {isCut && <Text style={styles.activitySymbol}>–</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    const renderMemberButton = () => {
        if (isUserMember) {
            return (
                <TouchableOpacity style={styles.goldButton} onPress={handleJoinPress}>
                    <Ionicons name="checkmark-circle" size={16} color={C.dust} style={{ marginRight: 6 }} />
                    <Text style={styles.goldButtonText}>Member</Text>
                </TouchableOpacity>
            );
        }
        if (isUserRequested) {
            return (
                <TouchableOpacity style={[styles.goldButton, { backgroundColor: C.charcoalGray, borderColor: C.charcoalGray }]} onPress={handleJoinPress}>
                    <Text style={styles.goldButtonText}>Requested</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity style={styles.goldButton} onPress={handleJoinPress}>
                <Text style={styles.goldButtonText}>{isPrivate ? 'Request' : 'Join'}</Text>
            </TouchableOpacity>
        );
    };

    const renderTabIcon = (tab: typeof TABS[number], isActive: boolean) => {
        const color = isActive ? C.gold : C.dust;
        if (tab.iconLib === 'ion') {
            return <Ionicons name={tab.icon as any} size={28} color={color} />;
        }
        return <MaterialCommunityIcons name={tab.icon as any} size={28} color={color} />;
    };

    // ── Profile header ────────────────────────────────────────────────────────
    const renderHeader = () => (
        <View style={[styles.profileSection, { paddingTop: Math.max(12, insets.top) }]}>
            {/* Back button */}
            <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Ionicons name="arrow-back" size={26} color={C.dust} />
                </TouchableOpacity>
            </View>

            {/* Avatar */}
            {tribe.avatar ? (
                <Image
                    source={{ uri: tribe.avatar }}
                    style={styles.avatar}
                />
            ) : (
                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E1E' }]}>
                    <TabonoLogo size={60} color="rgba(218,165,32,0.3)" />
                </View>
            )}

            {/* Tribe Name */}
            <Text style={styles.tribeName}>{tribe.name}</Text>

            {/* Characteristic icons row: Natural → Activity → Type → Privacy */}
            <View style={styles.iconRow}>
                {renderNaturalStatusIcon()}
                {renderActivityIcon()}
                {renderTypeIcon()}
                <TouchableOpacity onPress={() => openModal({
                    title: tribe.privacy === 'private' ? 'Private' : 'Public',
                    description: tribe.privacy === 'private' ? 'You must request to join this tribe.' : 'Anyone can join this tribe.',
                    iconName: tribe.privacy === 'private' ? 'lock-outline' : 'earth'
                })}>
                    <MaterialCommunityIcons 
                        name={tribe.privacy === 'private' ? 'lock-outline' : 'earth'} 
                        size={20} 
                        color={C.dust} 
                    />
                </TouchableOpacity>
            </View>

            {/* Chief handle + chief's natural/activity icons */}
            <TouchableOpacity
                style={styles.chiefRow}
                onPress={() => {
                    if (tribe.chief?.handle) {
                        router.push({ pathname: '/user/[handle]', params: { handle: tribe.chief.handle } } as any);
                    }
                }}
            >
                <Text style={styles.chiefHandle}>{tribe.chief?.handle ?? '@unknown'}</Text>
                {tribe.chief?.status === 'natural' && (
                    <MaterialCommunityIcons name="leaf" size={16} color={C.natural} style={{ marginLeft: 4 }} />
                )}
                {tribe.chief?.activityIcon && (
                    <MaterialCommunityIcons name={tribe.chief.activityIcon as any} size={14} color={C.dust} style={{ marginLeft: 2 }} />
                )}
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.goldButton, { flex: 1 }]}
                    onPress={() => router.push(`/tribe/${tribe.id}/chat` as any)}
                >
                    <Text style={styles.goldButtonText}>
                        {tribe.privacy === 'public' && (tribe.memberCount ?? 0) > 100 
                            ? 'Tribe Announcements' 
                            : 'Tribe chat'}
                    </Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>{renderMemberButton()}</View>
            </View>

            {/* Member count */}
            <TouchableOpacity
                style={{ alignItems: 'center', marginBottom: 16 }}
                onPress={() => {
                    if (canView) router.push(`/tribe/${tribe.id}/members` as any);
                    else Alert.alert('Private Tribe', 'Join the tribe to view its members.');
                }}
            >
                <Text style={styles.memberCount}>{tribe.memberCount ?? 0}</Text>
                <Text style={styles.memberLabel}>Members</Text>
            </TouchableOpacity>

            {/* Tab selector */}
            <View style={styles.tabContainer}>
                {/* Top accent lines */}
                <View style={styles.tabLineContainer}>
                    {TABS.map((tab) => (
                        <View key={tab.id} style={styles.tabLineSegment}>
                            <View style={[styles.tabLine, { backgroundColor: activeTab === tab.id ? C.gold : C.dust }]} />
                        </View>
                    ))}
                </View>

                {/* Tab icons + counts */}
                <View style={styles.tabIconsRow}>
                    {TABS.map((tab, index) => {
                        const isActive = activeTab === tab.id;
                        const count = tribe?.stats?.[tab.id] ?? 0;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={styles.tabItem}
                                onPress={() => switchTab(tab.id, index)}
                            >
                                {renderTabIcon(tab, isActive)}
                                <Text style={[styles.tabStatVal, { color: isActive ? C.white : C.charcoalGray }]}>
                                    {count}
                                </Text>
                                <Text style={[styles.tabStatLabel, { color: isActive ? C.white : C.charcoalGray }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bottom accent lines */}
                <View style={styles.tabLineContainer}>
                    {TABS.map((tab) => (
                        <View key={tab.id} style={styles.tabLineSegment}>
                            <View style={[styles.tabLine, { backgroundColor: activeTab === tab.id ? C.gold : C.dust }]} />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderLoadMoreFooter = () => {
        const totalPostsInTab = tribe?.stats?.[activeTab] ?? 0;
        const loadedPostsInTab = filterForTab(posts, activeTab).length;
        const hasMore = loadedPostsInTab < totalPostsInTab;

        if (!hasMore) {
            return (
                <View style={styles.endOfPostsContainer}>
                    <Text style={styles.endOfPostsText}>End of posts</Text>
                </View>
            );
        }

        return (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore
                    ? <ActivityIndicator color={C.gold} size="small" />
                    : <Text style={styles.loadMoreText}>Load older posts (+3 days)</Text>
                }
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {canView ? (
                <>
                    {/* Horizontal swipe pager — one full-width page per tab */}
                    <Animated.ScrollView
                        ref={pagerRef as any}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            const newTab = TAB_IDS[index];
                            setActiveTab(newTab);
                            scrollY.setValue(Math.max(0, tabScrollOffsets.current[newTab]));
                        }}
                        style={StyleSheet.absoluteFillObject}
                    >
                        {TABS.map((tab) => {
                            const tabPosts = filterForTab(posts, tab.id);
                            return (
                                <FlatList
                                    key={tab.id}
                                    style={{ width }}
                                    data={tabPosts}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 60 }}
                                    showsVerticalScrollIndicator={false}
                                    onScroll={handleScroll(tab.id)}
                                    scrollEventThrottle={16}
                                    onEndReached={handleLoadMore}
                                    onEndReachedThreshold={0.3}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            {renderTabIcon(tab, false)}
                                            <Text style={styles.emptyText}>No {tab.label} posts in the last {daysBack} days</Text>
                                        </View>
                                    }
                                    ListFooterComponent={tabPosts.length > 0 ? renderLoadMoreFooter : null}
                                    renderItem={({ item }) => (
                                        <View style={styles.postWrapper}>
                                            <FeedItem
                                                post={item}
                                                onPressLike={() => handleLike(item)}
                                                onPressComment={() => {
                                                    // Navigate to the full post detail (same as home feed tap)
                                                    router.push({ pathname: '/post/[id]', params: { id: item.id } } as any);
                                                }}
                                                onPressShare={() => {}}
                                                onPressOptions={() => {
                                                    Alert.alert(
                                                        'Post Options',
                                                        '',
                                                        [
                                                            { text: 'View Post', onPress: () => router.push({ pathname: '/post/[id]', params: { id: item.id } } as any) },
                                                            ...(item.user.id === currentUserId
                                                                ? [{ text: 'Delete Post', style: 'destructive' as const, onPress: async () => {
                                                                    await SupabasePostService.deletePost(item.id);
                                                                    setPosts(prev => prev.filter(p => p.id !== item.id));
                                                                }}]
                                                                : []
                                                            ),
                                                            { text: 'Cancel', style: 'cancel' },
                                                        ]
                                                    );
                                                }}
                                            />
                                        </View>
                                    )}
                                />
                            );
                        })}
                    </Animated.ScrollView>

                    {/* Floating header — profile info + tabs — sits on top of pager */}
                    <Animated.View
                        style={[
                            styles.headerContainer, 
                            { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, transform: [{ translateY: headerTranslateY }] }
                        ]}
                        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
                        pointerEvents="box-none"
                    >
                        {renderHeader()}
                    </Animated.View>
                </>
            ) : (
                /* Private tribe — show profile + lock */
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {renderHeader()}
                    <View style={styles.privateLock}>
                        <MaterialCommunityIcons name="lock" size={60} color={C.dust} />
                        <Text style={styles.lockText}>Join this tribe to view its feed</Text>
                        <TouchableOpacity style={[styles.goldButton, { marginTop: 20, paddingHorizontal: 32 }]} onPress={handleJoinPress}>
                            <Text style={styles.goldButtonText}>{isUserRequested ? 'Request Sent' : 'Request to Join'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            <TribeInfoModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />

            <CompetitionWinnerOverlay
                visible={winnerOverlayVisible}
                onClose={() => setWinnerOverlayVisible(false)}
                tribeId={resolvedTribeId || tribeId}
                tribeName={tribe?.name ?? ''}
                winner={winnerData}
                themeColor={tribe?.themeColor}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header:    { paddingHorizontal: 6, zIndex: 20 },

    // ── Floating header container ─────────────────────────────────────────────
    headerContainer: {
        backgroundColor: C.bg,
        paddingBottom: 8,
    },

    // ── Profile section ───────────────────────────────────────────────────────
    profileSection: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },

    avatar: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 3, borderColor: C.gold,
        marginBottom: 12, alignSelf: 'center',
    },
    tribeName: {
        fontSize: 30, fontWeight: 'bold', color: C.gold,
        textAlign: 'center', marginBottom: 6,
    },
    iconRow:  { flexDirection: 'row', gap: 14, marginBottom: 6, alignItems: 'center' },
    chiefRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    chiefHandle: { color: C.sienna, fontSize: 17, fontWeight: 'bold' },

    // ── Buttons ───────────────────────────────────────────────────────────────
    buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
    goldButton: {
        flex: 1,
        backgroundColor: C.gold, borderWidth: 1.5, borderColor: C.gold,
        paddingVertical: 12, borderRadius: 24,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    goldButtonText: { color: C.dust, fontWeight: 'bold', fontSize: 15 },

    // ── Members ───────────────────────────────────────────────────────────────
    memberCount: { fontSize: 40, fontWeight: 'bold', color: C.white, textAlign: 'center' },
    memberLabel: { color: C.charcoalGray, fontSize: 14, textAlign: 'center' },

    // ── Tab selector ──────────────────────────────────────────────────────────
    tabContainer:   { width: '100%', marginTop: 6, marginBottom: 4 },
    tabLineContainer: { flexDirection: 'row', width: '100%' },
    tabLineSegment: { flex: 1, paddingHorizontal: 2 },
    tabLine:        { height: 2, borderRadius: 1 },
    tabIconsRow:    { flexDirection: 'row', width: '100%', paddingVertical: 10 },
    tabItem:        { flex: 1, alignItems: 'center', gap: 2 },
    tabStatVal:     { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
    tabStatLabel:   { fontSize: 11 },

    // ── Feed ──────────────────────────────────────────────────────────────────
    postWrapper:  { paddingHorizontal: 16, marginBottom: 12 },
    emptyState:   { alignItems: 'center', marginTop: 60, opacity: 0.6, paddingHorizontal: 32 },
    emptyText:    { color: C.dust, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
    loadMoreBtn:  { alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { color: C.gold, fontSize: 14, fontWeight: '600' },

    // ── Private lock ──────────────────────────────────────────────────────────
    privateLock: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    lockText:    { color: C.dust, fontSize: 17, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
    activityIconWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    activitySymbol: {
        color: '#EDE8D5',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -2,
    },

    // ── End of posts ──────────────────────────────────────────────────────────
    endOfPostsContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endOfPostsText: {
        color: C.charcoalGray,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
