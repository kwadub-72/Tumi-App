import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
    FlatList,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Alert,
    Animated,
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VerifiedModal from '../../components/VerifiedModal';
import HammerModal from '../../components/HammerModal';
import CommentSheet from '@/components/CommentSheet';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';
import { supabase } from '@/src/shared/services/supabase';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { useAuthStore } from '@/store/AuthStore';
import { SupabaseWeightService } from '@/src/shared/services/SupabaseWeightService';
import { SupabaseNetworkService } from '@/src/shared/services/SupabaseNetworkService';
import { FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '../../store/UserStore'; // For units
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useNetworkStore } from '@/src/store/NetworkStore';

const { width, height } = Dimensions.get('window');

type TabType = 'meals' | 'workouts' | 'macros';

export default function OtherUserProfileScreen() {
    const { handle } = useLocalSearchParams<{ handle: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const session = useAuthStore((state) => state.session);
    const userInfo = useUserStore();
    const { units } = userInfo;

    // State
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('meals');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // UI Modals
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);

    // Target User Data
    const [targetProfile, setTargetProfile] = useState<any>(null);
    const [targetFollowers, setTargetFollowers] = useState(0);
    const [targetFollowing, setTargetFollowing] = useState(0);
    
    // Relationship from NetworkStore
    const networkStore = useNetworkStore();
    const isFollowing = networkStore.isFollowing(targetProfile?.id);
    const isRequested = networkStore.isRequested(targetProfile?.id);
    const followState: 'none' | 'requested' | 'following' = isFollowing ? 'following' : (isRequested ? 'requested' : 'none');
    
    // Tribe & Privacy Logic
    const { myTribes, init: initTribes } = useUserTribeStore();
    const [sharedTribeSettings, setSharedTribeSettings] = useState<any>(null);
    const [targetTribe, setTargetTribe] = useState<any>(null);

    // Animation & Pager Refs
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const pagerRef = React.useRef<ScrollView>(null);
    const tabs: TabType[] = ['meals', 'workouts', 'macros'];

    // Collapsible header
    const [headerHeight, setHeaderHeight] = useState(0);
    const tabScrollOffsets = React.useRef<Record<TabType, number>>({ meals: 0, workouts: 0, macros: 0 });
    const activeTabRef = React.useRef<TabType>('meals');

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [0, -headerHeight],
        extrapolate: 'clamp',
    });

    const handleScroll = (tab: TabType) => (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        tabScrollOffsets.current[tab] = y;
        scrollY.setValue(Math.max(0, y));
    };

    const handleTabSwitch = (tab: TabType, index: number) => {
        activeTabRef.current = tab;
        setActiveTab(tab);
        pagerRef.current?.scrollTo({ x: index * width, animated: true });
        const savedY = tabScrollOffsets.current[tab];
        scrollY.setValue(Math.max(0, savedY));
    };

    const loadData = async (silent = false) => {
        if (!handle || !session?.user?.id) return;
        if (!silent) setRefreshing(true);
        
        try {
            const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
            
            // 1. Fetch targeted profile
            const { data: profileData, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('handle', formattedHandle)
                .single();
                
            if (profileErr || !profileData) {
                console.error("Profile not found");
                if (!silent) setLoading(false);
                return;
            }

            // Self-guard: if this profile belongs to the authenticated user, redirect
            // to their own Profile tab. This is the authoritative check — done after
            // the DB fetch so it can't be bypassed by stale store state or timing.
            if (profileData.id === session.user.id) {
                router.replace('/(tabs)/profile' as any);
                return;
            }
            
            setTargetProfile(profileData);
            
            const [counts, followingList, requests, estimatedWeight] = await Promise.all([
                SupabaseNetworkService.getFollowCounts(profileData.id),
                SupabaseNetworkService.getFollowing(session.user.id),
                SupabaseNetworkService.getFollowRequests(session.user.id),
                SupabaseWeightService.getEstimatedWeight(profileData.id)
            ]);
            
            if (estimatedWeight !== null) {
                setTargetProfile((prev: any) => prev ? ({ ...prev, weight_lbs: estimatedWeight }) : null);
            }
            
            setTargetFollowers(counts.followers);
            setTargetFollowing(counts.following);
            
            // Sync network store if needed
            if (!networkStore.initialized) {
                await networkStore.init(session.user.id);
            }

            // 3. Determine if they share a tribe to grab overriding visibility settings
            let sharedSettings = null;
            if (myTribes.length > 0) {
                const { data: theirTribes } = await supabase
                    .from('tribe_members')
                    .select('tribe_id')
                    .eq('user_id', profileData.id);
                
                const theirTribeIds = (theirTribes || []).map(t => t.tribe_id);
                const sharedIds = myTribes.filter(t => theirTribeIds.includes(t.id)).map(t => t.id);
                
                if (sharedIds.length > 0) {
                    // Fetch tribe rules for the first shared tribe
                    const { data: sharedTribeData } = await supabase
                        .from('tribes')
                        .select('*')
                        .eq('id', sharedIds[0])
                        .single();
                    if (sharedTribeData) {
                        sharedSettings = sharedTribeData;
                    }
                }
            }
            setSharedTribeSettings(sharedSettings);

            // 4. Fetch Posts
            const profilePosts = await SupabasePostService.getFeed({
                userId: profileData.id,
                feedType: 'profile'
            });
            setPosts(profilePosts);

            // 5. Fetch target user's tribe specifically
            const { data: tribeMemberData } = await supabase
                .from('tribe_members')
                .select('tribe:tribes(*)')
                .eq('user_id', profileData.id);
            
            if (tribeMemberData && tribeMemberData.length > 0) {
                setTargetTribe(tribeMemberData[0].tribe);
            } else {
                setTargetTribe(null);
            }
            
        } catch (e) {
            console.error(e);
        } finally {
            if (!silent) {
                setRefreshing(false);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [handle, session?.user?.id, myTribes]);

    useEffect(() => {
        if (session?.user?.id) {
            initTribes(session.user.id);
        }
    }, [session?.user?.id]);


    // Derived UI visibility flags
    const isSameTribe = !!sharedTribeSettings;
    const isPrivate = targetProfile?.is_private ?? false;
    
    // Strict Privacy Logic: 
    // 1. If same tribe, follow tribe visibility rules
    // 2. If FOLLOWING or NOT private, show content
    // 3. Otherwise (PRIVATE and NOT following and NOT same tribe), hide EVERYTHING
    const canSeeStats = isSameTribe ? sharedTribeSettings?.allow_measurements : (isFollowing || !isPrivate);
    const canSeeMeals = isSameTribe ? sharedTribeSettings?.allow_meals : (isFollowing || !isPrivate);
    const canSeeWorkouts = isSameTribe ? sharedTribeSettings?.allow_workouts : (isFollowing || !isPrivate);
    const canSeeMacros = isSameTribe ? sharedTribeSettings?.allow_macros : (isFollowing || !isPrivate);
        
    const isTabAllowed = (tab: TabType) => {
        if (tab === 'meals') return canSeeMeals;
        if (tab === 'workouts') return canSeeWorkouts;
        if (tab === 'macros') return canSeeMacros;
        return true;
    };


    const getTabPosts = (tab: TabType) => {
        if (!isTabAllowed(tab)) return []; // Enforce privacy
        return posts.filter(p => {
            if (tab === 'meals') return p.meal;
            if (tab === 'workouts') return p.workout;
            if (tab === 'macros') return p.macroUpdate || p.snapshot;
            return false;
        });
    };

    const handleToggleFollow = async () => {
        if (!targetProfile || !session?.user?.id) return;
        
        if (followState === 'following' && targetProfile.is_private) {
            Alert.alert(
                "Unfollow Private User?",
                "Are you sure you want to unfollow? You will need to request to follow them again.",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Unfollow", 
                        style: "destructive",
                        onPress: executeFollowToggle
                    }
                ]
            );
        } else {
            executeFollowToggle();
        }
    };
    
    const executeFollowToggle = async () => {
        if (!targetProfile || !session?.user?.id) return;
        const currentIsFollowing = isFollowing;
        
        const { success, newState } = await networkStore.toggleFollow(
            session.user.id,
            targetProfile.id,
            targetProfile.is_private || false
        );

        if (success) {
            // Adjust follower count locally for immediate feedback
            if (currentIsFollowing && newState === 'none') {
                setTargetFollowers(prev => Math.max(0, prev - 1));
            } else if (!currentIsFollowing && newState === 'following') {
                setTargetFollowers(prev => prev + 1);
            }
            // No need to setFollowState as it's derived from store
            loadData(true); 
        }
    };


    if (loading || !targetProfile) {
         return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center'}]}>
                 <ActivityIndicator size="large" color={Colors.primary} />
             </View>
         );
    }

    const displayWeight = units === 'imperial'
        ? `${Math.round(targetProfile.weight_lbs ?? 0)} lbs`
        : `${Math.round((targetProfile.weight_lbs ?? 0) * 0.453592)} kg`;

    const displayHeight = targetProfile.height ?? '--';
    const displayName = targetProfile.name ?? '--';

    const handleOptions = (post: FeedPost) => {
        // Option modal for viewing other user's post
        Alert.alert('Options', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Report', style: 'destructive' }
        ]);
    };

    const handleCommentPress = (post: FeedPost) => {
        setActivePost(post);
        setCommentSheetVisible(true);
    };

    const toggleLike = async (post: FeedPost) => {
        if (!session?.user?.id) return;
        await SupabasePostService.toggleLike(post.id, session.user.id, !!post.isLiked);
        loadData(true);
    };

    const renderHeaderContent = () => (
        <>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={{ padding: 8 }}>
                    <Ionicons name="ellipsis-horizontal" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={targetProfile.avatar_url ? { uri: targetProfile.avatar_url } as any : { uri: 'https://i.pravatar.cc/150?u=default' } as any}
                        style={styles.avatar}
                    />
                </View>

                <View style={styles.textInfo}>
                    <Text style={styles.name}>{displayName}</Text>

                    <View style={styles.handleRow}>
                        <Text style={styles.handle}>{targetProfile.handle}</Text>
                        {(targetProfile.status === 'enhanced' || targetProfile.status === 'natural') && (
                            <TouchableOpacity onPress={() => setVerifiedModalVisible(true)}>
                                {targetProfile.status === 'enhanced' ? (
                                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFD700" style={{ marginLeft: 4 }} />
                                ) : (
                                    <Ionicons name="leaf" size={18} color={Colors.success} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        )}
                        {!!targetProfile.activity && (
                            <TouchableOpacity onPress={() => setHammerModalVisible(true)}>
                                <ActivityIcon 
                                    activity={targetProfile.activity} 
                                    icon={targetProfile.activity_icon} 
                                    size={18} 
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Stats */}
                    {canSeeStats && (targetProfile.height || targetProfile.weight_lbs || targetProfile.body_fat_pct) && (
                        <Text style={styles.statsText}>
                            {displayHeight} • {displayWeight} • {(targetProfile.body_fat_pct?.toString() ?? '--').replace('%', '')}% BF
                        </Text>
                    )}

                    {/* Tribe */}
                    {targetTribe && (
                        <View style={styles.tribeRow}>
                            <Text style={[styles.tribeText, { color: targetTribe.theme_color ?? '#8B0000' }]}>
                                {targetTribe.name}
                            </Text>
                        </View>
                    )}

                    {/* Socials */}
                    <View style={[styles.socialsRow, !targetTribe && { marginTop: -4 }]}>
                        <TouchableOpacity
                            onPress={() => {
                                if (targetProfile.instagram_link) Linking.openURL(targetProfile.instagram_link);
                            }}
                            style={[styles.socialIconBtn, !targetProfile.instagram_link && styles.socialIconInactive]}
                        >
                            <MaterialCommunityIcons name="instagram" size={24} color={targetProfile.instagram_link ? Colors.primary : '#C0C0C0'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (targetProfile.tiktok_link) Linking.openURL(targetProfile.tiktok_link);
                            }}
                            style={[styles.socialIconBtn, !targetProfile.tiktok_link && styles.socialIconInactive]}
                        >
                            <Ionicons name="logo-tiktok" size={22} color={targetProfile.tiktok_link ? Colors.primary : '#C0C0C0'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Bio Row */}
            {targetProfile.bio ? (
                <View style={styles.bioContainer}>
                    <Text style={styles.bioText} numberOfLines={1} ellipsizeMode="tail">
                        {targetProfile.bio}
                    </Text>
                </View>
            ) : null}

            {/* Action Buttons & Follow Stats */}
            <View style={styles.middleSection}>
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/messages/${targetProfile.id}` as any)}>
                        <Text style={styles.actionButtonText}>Message</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[
                            styles.actionButton, 
                            followState === 'following' ? styles.actionButtonActive : 
                            (followState === 'requested' ? styles.actionButtonRequested : undefined)
                        ]} 
                        onPress={handleToggleFollow}
                    >
                        <Text style={[
                            styles.actionButtonText, 
                            (followState === 'following' || followState === 'requested') && { color: 'white' }
                        ]}>
                            {followState === 'following' ? 'Following' : (followState === 'requested' ? 'Requested' : 'Follow')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { flex: 0.5 }]}
                        onPress={() =>
                            router.push({
                                pathname: '/user/similar/[targetId]',
                                params: {
                                    targetId: targetProfile.id,
                                    targetName: targetProfile.name ?? '',
                                },
                            } as any)
                        }
                    >
                        <Text style={styles.actionButtonText}>Similar</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.followStatsRow}>
                    <TouchableOpacity 
                        style={styles.followStat}
                        onPress={() => router.push({ pathname: '/network/[handle]', params: { handle: targetProfile.handle, initialTab: 'followers' } as any })}
                    >
                        <Text style={styles.followValue}>{targetFollowers}</Text>
                        <Text style={styles.followLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.followStat}
                        onPress={() => router.push({ pathname: '/network/[handle]', params: { handle: targetProfile.handle, initialTab: 'following' } as any })}
                    >
                        <Text style={styles.followValue}>{targetFollowing}</Text>
                        <Text style={styles.followLabel}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {tabs.map((tab, index) => (
                    <TouchableOpacity 
                        key={tab}
                        style={[styles.tabItem]} 
                        onPress={() => {
                            handleTabSwitch(tab, index);
                        }}
                    >
                        {tab === 'meals' || tab === 'workouts' ? (
                            <MaterialCommunityIcons 
                                name={tab === 'meals' ? 'fire' : 'dumbbell'} 
                                size={32} 
                                color={activeTab === tab ? Colors.primary : '#D4D4D4'} 
                            />
                        ) : (
                            <Ionicons 
                                name={'stats-chart'} 
                                size={32} 
                                color={activeTab === tab ? Colors.primary : '#D4D4D4'} 
                            />
                        )}
                        <Text style={styles.tabLabel}>{
                            tab === 'meals' ? getTabPosts('meals').length : (tab === 'workouts' ? getTabPosts('workouts').length : getTabPosts('macros').length)
                        }{'\n'}{tab === 'macros' ? 'macros' : tab}</Text>
                    </TouchableOpacity>
                ))}
                
                {/* Animated Indicator */}
                <Animated.View 
                    style={[
                        styles.activeIndicator, 
                        { 
                            width: (width - 40) / 3 * 0.8,
                            left: 20 + (width - 40) / 3 * 0.1,
                            transform: [{
                                translateX: scrollX.interpolate({
                                    inputRange: [0, width * (tabs.length - 1)],
                                    outputRange: [0, (width - 40) / 3 * (tabs.length - 1)]
                                })
                            }]
                        }
                    ]} 
                />
            </View>
            <View style={styles.thickDivider} />
        </>
    );

    // Empty State (Dynamic based on privacy and content)
    const renderEmptyState = (type: TabType) => {
        const allowed = isTabAllowed(type);
        let message = '';
        let icon = null;

        if (!allowed) {
            message = 'This account is private.';
            icon = <Ionicons name="lock-closed" size={70} color="#D4D4D4" />;
        } else {
            const firstWordCap = type.charAt(0).toUpperCase() + type.slice(1);
            const typeStr = type === 'macros' ? 'macros' : type;
            message = `${displayName} has no ${typeStr} posted.`;
            
            switch (type) {
                case 'meals':
                    icon = <MaterialCommunityIcons name="fire" size={80} color="#D4D4D4" />;
                    break;
                case 'workouts':
                    icon = <MaterialCommunityIcons name="dumbbell" size={80} color="#D4D4D4" />;
                    break;
                case 'macros':
                    icon = <Ionicons name="stats-chart" size={80} color="#D4D4D4" />;
                    break;
            }
        }

        return (
            <View style={[styles.emptyState, { width: width }]}>
                <View style={styles.emptyStateIconContainer}>
                    {icon}
                </View>
                <Text style={styles.emptyStateText}>{message}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <VerifiedModal visible={isVerifiedModalVisible} onClose={() => setVerifiedModalVisible(false)} status={targetProfile.status} />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={targetProfile.activity}
                activityIcon={targetProfile.activity_icon}
            />
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => {
                    setCommentSheetVisible(false);
                    setActivePost(null);
                }}
                comments={activePost?.comments || []}
            />

            <Animated.ScrollView
                ref={pagerRef as any}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    const newTab = tabs[index];
                    activeTabRef.current = newTab;
                    setActiveTab(newTab);
                    scrollY.setValue(Math.max(0, tabScrollOffsets.current[newTab]));
                }}
                scrollEventThrottle={16}
                style={StyleSheet.absoluteFillObject}
            >
                {tabs.map((tab) => {
                    const tabPosts = getTabPosts(tab);
                    const isEmpty = tabPosts.length === 0;
                    return (
                        <FlatList
                            key={tab}
                            style={{ width }}
                            data={tabPosts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
                                    <FeedItem
                                        post={item}
                                        onPressOptions={() => handleOptions(item)}
                                        onPressComment={() => handleCommentPress(item)}
                                        onPressLike={() => toggleLike(item)}
                                        onPressVerified={() => setVerifiedModalVisible(true)}
                                        onPressHammer={() => setHammerModalVisible(true)}
                                        sharedTransitionTag={`post-${item.id}`}
                                    />
                                </View>
                            )}
                            ListEmptyComponent={renderEmptyState(tab)}
                            scrollEnabled={!isEmpty}
                            bounces={!isEmpty}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 32 }}
                            onScroll={handleScroll(tab)}
                            scrollEventThrottle={16}
                            refreshControl={
                                !isEmpty ? (
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={() => loadData(false)}
                                        tintColor={Colors.primary}
                                    />
                                ) : undefined
                            }
                        />
                    );
                })}
            </Animated.ScrollView>

            <Animated.View
                style={[
                    styles.headerContainer,
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        paddingTop: insets.top,
                        transform: [{ translateY: headerTranslateY }],
                        zIndex: 10,
                    }
                ]}
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
            >
                {renderHeaderContent()}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    headerContainer: {
        backgroundColor: Colors.background,
        paddingBottom: 20,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    profileInfo: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        alignItems: 'center',
        marginTop: 5,
    },
    avatarContainer: {
        marginRight: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    textInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 2,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    handle: {
        fontSize: 16,
        color: '#999',
        fontWeight: '600',
    },
    tribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    tribeText: {
        fontSize: 16,
        color: '#8B0000',
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginRight: 6,
    },
    statsText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
        marginBottom: 6,
    },
    socialsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialIconBtn: {
        padding: 4,
        paddingLeft: 0,
    },
    socialIconInactive: {
        opacity: 0.4,
    },
    middleSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#E8F0E5',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    actionButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    actionButtonRequested: {
        backgroundColor: 'gray',
        borderColor: 'gray',
    },
    actionButtonText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: 'bold',
    },
    followStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    followStat: {
        alignItems: 'center',
    },
    followValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    followLabel: {
        fontSize: 14,
        color: '#888',
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    tabItem: {
        alignItems: 'center',
        paddingBottom: 15,
        flex: 1,
    },
    bioContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    bioText: {
        fontSize: 14,
        color: Colors.primary,
    },
    tabLabel: {
        fontSize: 10,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    thickDivider: {
        height: 2,
    },
    emptyState: {
        minHeight: 250,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 30,
        paddingHorizontal: 40,
    },
    emptyStateIconContainer: {
        marginBottom: 5,
        opacity: 0.8,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#A0A0A0',
        marginTop: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
});
