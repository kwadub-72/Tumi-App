import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Modal,
    Alert, Animated, Dimensions, ScrollView, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { Colors } from '@/src/shared/theme/Colors';

const { width } = Dimensions.get('window');

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'meals' | 'workouts' | 'macros' | 'maps';
const TABS: { id: TabId; icon: string; label: string; iconLib: 'mci' | 'ion' }[] = [
    { id: 'meals',    icon: 'fire',        label: 'meals',    iconLib: 'mci' },
    { id: 'workouts', icon: 'dumbbell',    label: 'workouts', iconLib: 'mci' },
    { id: 'macros',   icon: 'stats-chart', label: 'macros',   iconLib: 'ion' },
    { id: 'maps',     icon: 'map-legend',  label: 'maps',     iconLib: 'mci' },
];
const TAB_IDS: TabId[] = TABS.map(t => t.id);

const INITIAL_DAYS = 7;
const LOAD_MORE_DAYS = 3;

function filterForTab(posts: FeedPost[], tab: TabId): FeedPost[] {
    switch (tab) {
        case 'meals':    return posts.filter(p => !!p.meal);
        case 'workouts': return posts.filter(p => !!p.workout);
        case 'macros':   return posts.filter(p => !!(p.macroUpdate || p.snapshot));
        case 'maps':     return posts.filter(p => p.postType === 'map_publish' || p.postType === 'map_subscribe');
        default:         return [];
    }
}

export default function TribeProfileScreen({ tribeId }: { tribeId: string }) {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialTab = params.initialTab as string;
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

    const { isMember, isRequested, isChief, joinTribe, leaveTribe } = useUserTribeStore();
    const { selectedTribeIds, setSelectedTribeIds } = useOnboardingStore();

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
    const [showChiefTooltip, setShowChiefTooltip] = useState(false);

    // Horizontal pager
    const pagerRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Vertical scroll (collapsible header)
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabScrollOffsets = useRef<Record<TabId, number>>({ meals: 0, workouts: 0, macros: 0, maps: 0 });

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
        const effectiveUserId = currentUserId || '00000000-0000-0000-0000-000000000000';
        const data = await SupabaseTribeService.getTribeFeed(effectiveUserId, tribeId, days);
        setPosts(data);
    }, [tribeId, currentUserId]);

    useEffect(() => {
        fetchTribe();
    }, [fetchTribe]);

    useEffect(() => {
        fetchPosts(daysBack);
    }, [fetchPosts, daysBack]);

    useEffect(() => {
        if (!tribe) return; // Wait until data loads and Pager is mounted

        if (initialTab && TAB_IDS.includes(initialTab as TabId)) {
            const tabIndex = TABS.findIndex(t => t.id === initialTab);
            if (tabIndex !== -1) {
                setTimeout(() => switchTab(initialTab as TabId, tabIndex), 100); 
            }
        } else if (initialTab === 'feed') {
            setTimeout(() => switchTab('meals', 0), 100);
        }
    }, [initialTab, tribe]);

    // ── Check for Concluded Competition Winner Celebration ────────────────────
    useEffect(() => {
        if (!tribeId || !tribe) {
            console.log("[WinnerCheck] Skip: tribeId or tribe is missing", { tribeId, tribe: !!tribe });
            return;
        }

        const checkCompetitionWinner = async () => {
            try {
                console.log("[WinnerCheck] Querying completed competitions for tribeId:", resolvedTribeId);
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

                const cacheKey = `TUMI_TRIBES_WINNER_OVERLAY_DISMISSED_${resolvedTribeId}`;
                const dismissed = await AsyncStorage.getItem(cacheKey);
                console.log("[WinnerCheck] Dismissed cache key value:", dismissed);
                if (dismissed === 'true') {
                    console.log("[WinnerCheck] Overlay already dismissed for this competition. Skipping.");
                    return;
                }

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

                    members.forEach((m: any) => {
                        const normH = normalizeHandle(m.handle || '');
                        const seedPts = FAKE_INITIAL_POINTS_BY_HANDLE[normH] ?? 0;
                        const cachedPts = cachedPointsMap[m.id];
                        dbPointsMap[m.id] = cachedPts ?? seedPts;
                    });

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
                        
                        const championData = {
                            name: champion.name || 'Anonymous User',
                            handle: champion.handle || '@anonymous',
                            avatar: champion.avatar_url || null,
                            points: score
                        };

                        setWinnerData(championData);
                        setWinnerOverlayVisible(true);
                    }
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

        const uniqueChannelId = `tribe-likes-${tribeId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(uniqueChannelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'likes' },
                async () => {
                    const effectiveUserId = currentUserId || '00000000-0000-0000-0000-000000000000';
                    const fresh = await SupabaseTribeService.getTribeFeed(effectiveUserId, tribeId, daysBack);
                    setPosts(fresh);
                }
            );

        channel.subscribe();

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

    const isUserChief     = tribe ? (!!currentUserId && (isChief(tribe.id) || currentUserId === tribe.chief?.id)) : false;
    const isUserMember    = tribe ? (currentUserId ? isMember(tribe.id) : (tribe.privacy === 'public' && selectedTribeIds.includes(tribe.id))) : false;
    const isUserRequested = tribe ? (currentUserId ? isRequested(tribe.id) : (tribe.privacy === 'private' && selectedTribeIds.includes(tribe.id))) : false;
    const isPrivate       = tribe ? tribe.privacy === 'private' : false;
    const canView         = !isPrivate || isUserMember || isUserChief;

    // ── Interaction handlers ──────────────────────────────────────────────────
    const handleLike = useCallback(async (post: FeedPost) => {
        if (!currentUserId) return;
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
        if (!tribe) return;

        if (!currentUserId) {
            if (selectedTribeIds.includes(tribe.id)) {
                setSelectedTribeIds(selectedTribeIds.filter(id => id !== tribe.id));
            } else {
                setSelectedTribeIds([...selectedTribeIds, tribe.id]);
                if (tribe.privacy === 'private') {
                    Alert.alert('Requested', 'Your join request has been saved for when you complete setup.');
                }
            }
            return;
        }

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
    }, [currentUserId, isUserMember, isUserRequested, isPrivate, tribe, joinTribe, leaveTribe, fetchTribe, selectedTribeIds, setSelectedTribeIds]);

    const switchTab = (tab: TabId, index: number) => {
        setActiveTab(tab);
        pagerRef.current?.scrollTo({ x: index * width, animated: true });
        scrollY.setValue(Math.max(0, tabScrollOffsets.current[tab]));
    };

    if (!tribe) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={Colors.theme.harvestGold} size="large" />
            </View>
        );
    }

    const openModal = (config: any) => {
        setModalConfig(config);
        setModalVisible(true);
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
                <MaterialCommunityIcons name={iconName} size={20} color={Colors.theme.dust} />
            </TouchableOpacity>
        );
    };

    const renderNaturalStatusIcon = () => {
        if (tribe.naturalStatus === null || tribe.naturalStatus === undefined) return null;
        
        const isNatural = tribe.naturalStatus === true;
        const title = isNatural ? 'Natural' : 'Enhanced';
        const description = isNatural ? 'This tribe is 100% natural.' : 'This tribe is enhanced.';
        const iconName = isNatural ? 'leaf' : 'lightning-bolt';
        const color = isNatural ? Colors.natural : Colors.theme.burntSienna;

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
                    <MaterialCommunityIcons name={iconName as any} size={20} color={Colors.theme.dust} />
                    {isBulk && <Text style={styles.activitySymbol}>+</Text>}
                    {isCut && <Text style={styles.activitySymbol}>–</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    const renderMemberButton = () => {
        if (isUserChief) {
            return (
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/create-tribe', params: { mode: 'edit', tribeId: tribe.id } } as any)}
                >
                    <Ionicons name="pencil" size={14} color={Colors.theme.harvestGold} style={{ marginRight: 4 }} />
                    <Text style={styles.actionButtonText} numberOfLines={1}>Edit</Text>
                </TouchableOpacity>
            );
        }
        if (isUserMember) {
            return (
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonActive]} onPress={handleJoinPress}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.theme.matteBlack} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionButtonText, { color: Colors.theme.matteBlack }]}>Member</Text>
                </TouchableOpacity>
            );
        }
        if (isUserRequested) {
            return (
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonRequested]} onPress={handleJoinPress}>
                    <Text style={[styles.actionButtonText, { color: Colors.theme.matteBlack }]}>Requested</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity style={styles.actionButton} onPress={handleJoinPress}>
                <Text style={styles.actionButtonText}>{isPrivate ? 'Request' : 'Join'}</Text>
            </TouchableOpacity>
        );
    };

    const renderTabIcon = (tab: typeof TABS[number], isActive: boolean) => {
        const color = isActive ? Colors.theme.harvestGold : Colors.theme.softWhite;
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
                    <Ionicons name="arrow-back" size={26} color={Colors.theme.dust} />
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
                        color={Colors.theme.dust} 
                    />
                </TouchableOpacity>
            </View>

            {/* Chief handle + chief's natural/activity icons */}
            <TouchableOpacity
                style={[styles.chiefRow, { position: 'relative' }]}
                onPress={() => {
                    if (tribe.chief?.handle) {
                        router.push({ pathname: '/user/[handle]', params: { handle: tribe.chief.handle } } as any);
                    }
                }}
            >
                <Pressable
                    onPress={(e) => {
                        e.stopPropagation();
                        setShowChiefTooltip(!showChiefTooltip);
                    }}
                    style={{ paddingRight: 4 }}
                >
                    <MaterialCommunityIcons name="crown" size={18} color={Colors.theme.harvestGold} />
                </Pressable>
                <Text style={styles.chiefHandle}>{tribe.chief?.handle ?? '@unknown'}</Text>
                {tribe.chief?.status === 'natural' && (
                    <MaterialCommunityIcons name="leaf" size={16} color={Colors.natural} style={{ marginLeft: 4 }} />
                )}
                {tribe.chief?.activityIcon && (
                    <MaterialCommunityIcons name={tribe.chief.activityIcon as any} size={14} color={Colors.theme.dust} style={{ marginLeft: 2 }} />
                )}

            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { flex: 1 }]}
                    onPress={() => router.push(`/tribe/${tribe.id}/chat` as any)}
                >
                    <Text style={styles.actionButtonText}>
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
                {/* Tab icons + counts */}
                <View style={styles.tabIconsRow}>
                    {TABS.map((tab, index) => {
                        const isActive = activeTab === tab.id;
                        const count = tab.id === 'maps' ? filterForTab(posts, 'maps').length : (tribe?.stats?.[tab.id] ?? 0);
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[
                                    styles.tabItem,
                                    {
                                        borderTopWidth: StyleSheet.hairlineWidth,
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderColor: Colors.theme.harvestGold,
                                    }
                                ]}
                                onPress={() => switchTab(tab.id, index)}
                            >
                                {isActive && <View style={styles.activeTabIndicatorTop} />}
                                {isActive && <View style={styles.activeTabIndicatorBottom} />}
                                {renderTabIcon(tab, isActive)}
                                <Text style={[styles.tabStatVal, { color: isActive ? Colors.theme.harvestGold : Colors.theme.softWhite }]}>
                                    {count}
                                </Text>
                                <Text style={[styles.tabStatLabel, { color: isActive ? Colors.theme.harvestGold : Colors.theme.softWhite }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
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
                    ? <ActivityIndicator color={Colors.theme.harvestGold} size="small" />
                    : <Text style={styles.loadMoreText}>Load older posts (+3 days)</Text>
                }
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {canView ? (
                <>
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
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {renderHeader()}
                    <View style={styles.privateLock}>
                        <MaterialCommunityIcons name="lock" size={60} color={Colors.theme.dust} />
                        <Text style={styles.lockText}>Join this tribe to view its feed</Text>
                        <TouchableOpacity style={[styles.actionButton, { marginTop: 20, paddingHorizontal: 32 }]} onPress={handleJoinPress}>
                            <Text style={styles.actionButtonText}>{isUserRequested ? 'Request Sent' : 'Request to Join'}</Text>
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

            <Modal
                visible={showChiefTooltip}
                transparent
                animationType="fade"
                onRequestClose={() => setShowChiefTooltip(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setShowChiefTooltip(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.capsule}>
                            <Text style={styles.activityText}>Tribe Chief</Text>
                            <MaterialCommunityIcons
                                name="crown"
                                size={28}
                                color={Colors.theme.harvestGold}
                            />
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header:    { paddingHorizontal: 6, zIndex: 20 },

    // ── Floating header container ─────────────────────────────────────────────
    headerContainer: {
        backgroundColor: Colors.background,
        paddingBottom: 8,
    },

    // ── Profile section ───────────────────────────────────────────────────────
    profileSection: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },

    avatar: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 3, borderColor: Colors.theme.dust,
        marginBottom: 12, alignSelf: 'center',
    },
    tribeName: {
        fontSize: 24, fontWeight: 'bold', color: Colors.theme.softWhite,
        textAlign: 'center', marginBottom: 2,
    },
    iconRow:  { flexDirection: 'row', gap: 14, marginBottom: 6, alignItems: 'center' },
    chiefRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    chiefHandle: { color: Colors.theme.dust, fontSize: 16, fontWeight: '600' },

    // ── Action Buttons ────────────────────────────────────────────────────────
    buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonActive: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    actionButtonRequested: {
        backgroundColor: Colors.theme.dust,
        borderColor: Colors.theme.dust,
    },
    actionButtonText: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // ── Members ───────────────────────────────────────────────────────────────
    memberCount: { fontSize: 40, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
    memberLabel: { color: Colors.theme.dust, fontSize: 14, textAlign: 'center' },

    // ── Tab selector ──────────────────────────────────────────────────────────
    tabContainer:   { width: '100%', marginTop: 6, marginBottom: 4 },
    tabIconsRow:    { 
        flexDirection: 'row', 
        width: '100%', 
    },
    tabItem:        { 
        flex: 1, 
        alignItems: 'center', 
        gap: 2, 
        paddingVertical: 10,
        position: 'relative',
    },
    activeTabIndicatorTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.theme.harvestGold,
        zIndex: 10,
    },
    activeTabIndicatorBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: Colors.theme.harvestGold,
        zIndex: 10,
    },
    tabStatVal:     { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
    tabStatLabel:   { fontSize: 11 },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        alignItems: 'center',
    },
    capsule: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderRadius: 100,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    activityText: {
        color: Colors.theme.softWhite,
        fontSize: 26,
        fontWeight: '600',
        fontStyle: 'italic',
    },

    // ── Feed ──────────────────────────────────────────────────────────────────
    postWrapper:  { paddingHorizontal: 16, marginBottom: 12 },
    emptyState:   { alignItems: 'center', marginTop: 60, opacity: 0.6, paddingHorizontal: 32 },
    emptyText:    { color: Colors.theme.dust, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
    loadMoreBtn:  { alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { color: Colors.theme.harvestGold, fontSize: 14, fontWeight: '600' },

    // ── Private lock ──────────────────────────────────────────────────────────
    privateLock: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    lockText:    { color: Colors.theme.dust, fontSize: 17, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
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
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
