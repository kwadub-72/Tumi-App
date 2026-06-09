import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Tabs } from 'react-native-collapsible-tab-view';
import React, { useEffect, useState, useMemo } from 'react';
import {
    FlatList,
    Image,
    Linking,
    Platform,
    Pressable,
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
import TribeShareModal from '@/src/features/feed/components/TribeShareModal';
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
import { useProfileStore } from '@/src/store/useProfileStore';
import { DiscoveryMapCard } from '@/src/features/macromaps/components/DiscoveryMapCard';

const { width, height } = Dimensions.get('window');

type TabType = 'meals' | 'workouts' | 'macros' | 'maps';

export default function OtherUserProfileScreen() {
    const { handle, initialTab } = useLocalSearchParams<{ handle: string, initialTab?: TabType }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const session = useAuthStore((state) => state.session);
    const userInfo = useUserStore();
    const { units } = userInfo;
    const { activeProfileMaps, fetchProfileMaps } = useProfileStore();

    const tabs: TabType[] = ['meals', 'workouts', 'macros', 'maps'];

    // State
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>(initialTab && tabs.includes(initialTab) ? initialTab : 'meals');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // UI Modals
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    const [isShareModalVisible, setShareModalVisible] = useState(false);
    const [shareTargetPost, setShareTargetPost] = useState<FeedPost | null>(null);

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
    // No manual animated sliding tab index is used to ensure maximum performance

    const loadData = async (silent = false) => {
        if (!handle || !session?.user?.id) return;
        if (!silent) setRefreshing(true);
        
        try {
            const decodedHandle = decodeURIComponent(handle as string);
            const cleanHandle = decodedHandle.replace(/^@/, '');
            
            // 1. Fetch targeted profile
            const { data: profileData, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .or(`handle.eq.${cleanHandle},handle.eq.@${cleanHandle}`)
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

            // 6. Fetch target user's published maps
            if (session.user.id && profileData.id) {
                fetchProfileMaps(profileData.id, session.user.id);
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

    useEffect(() => {
        if (!loading && initialTab && tabs.includes(initialTab)) {
            setActiveTab(initialTab);
        }
    }, [loading, initialTab]);


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
        if (tab === 'maps') return true; // Maps are public
        return true;
    };


    const getTabPosts = (tab: TabType) => {
        if (!isTabAllowed(tab)) return []; // Enforce privacy
        return posts.filter(p => {
            if (tab === 'meals') return p.meal;
            if (tab === 'workouts') return p.workout;
            if (tab === 'macros') return p.macroUpdate || p.snapshot;
            if (tab === 'maps') return p.macroMap || p.postType?.includes('map');
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
        const options: any[] = [
            { text: 'Cancel', style: 'cancel' }
        ];
        if (post.macroMap) {
            options.push({
                text: 'Save to Map book',
                onPress: async () => {
                    if (session?.user?.id) {
                        await SupabasePostService.toggleSaveMap(session.user.id, post.macroMap!.id);
                        Alert.alert("Success", "Map saved to your Map book!");
                    }
                }
            });
        }
        options.push({ text: 'Report', style: 'destructive' });
        Alert.alert('Options', undefined, options);
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
        <View pointerEvents="box-none" style={{ backgroundColor: Colors.theme.matteBlack, paddingTop: insets.top }}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.softWhite} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={{ padding: 8 }}>
                    <Ionicons name="ellipsis-horizontal" size={28} color={Colors.theme.softWhite} />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                    {targetProfile.avatar_url ? (
                        <Image
                            source={{ uri: targetProfile.avatar_url } as any}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Ionicons name="person" size={50} color={Colors.theme.dust} />
                        </View>
                    )}
                </View>

                <View style={styles.textInfo}>
                    <Text style={styles.name}>{displayName}</Text>

                    <View style={styles.handleRow}>
                        <Text style={styles.handle}>@{targetProfile.handle.replace(/^@/, '')}</Text>
                        {(targetProfile.status === 'enhanced' || targetProfile.status === 'natural') && (
                            <TouchableOpacity onPress={() => setVerifiedModalVisible(true)}>
                                {targetProfile.status === 'enhanced' ? (
                                    <MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.theme.burntSienna} style={{ marginLeft: 4 }} />
                                ) : (
                                    <Ionicons name="leaf" size={18} color={Colors.natural} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        )}
                        {!!targetProfile.activity && (
                            <TouchableOpacity onPress={() => setHammerModalVisible(true)}>
                                <ActivityIcon 
                                    activity={targetProfile.activity} 
                                    icon={targetProfile.activity_icon} 
                                    size={18} 
                                    color={Colors.theme.harvestGold}
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
                            <MaterialCommunityIcons name="instagram" size={24} color={targetProfile.instagram_link ? Colors.theme.softWhite : '#C0C0C0'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (targetProfile.tiktok_link) Linking.openURL(targetProfile.tiktok_link);
                            }}
                            style={[styles.socialIconBtn, !targetProfile.tiktok_link && styles.socialIconInactive]}
                        >
                            <Ionicons name="logo-tiktok" size={22} color={targetProfile.tiktok_link ? Colors.theme.softWhite : '#C0C0C0'} />
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
                            (followState === 'following' || followState === 'requested') && { color: Colors.theme.matteBlack }
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
        </View>
    );

    const renderTabBar = (props: any) => (
        <View style={{ backgroundColor: Colors.theme.matteBlack }}>
            <View style={styles.tabsContainer}>
                {tabs.map((tab, index) => (
                    <Pressable 
                        key={tab}
                        style={[
                            styles.tabItem,
                            {
                                flex: 1,
                                alignItems: 'center',
                            }
                        ]} 
                        onPress={() => {
                            props.onTabPress(tab);
                        }}
                    >
                        {activeTab === tab && (<View style={styles.activeTabIndicatorTop} />)}
                        {activeTab === tab && (<View style={styles.activeTabIndicatorBottom} />)}
                        {tab === 'meals' ? (
                            <MaterialCommunityIcons name="fire" size={32} color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} />
                        ) : tab === 'workouts' ? (
                            <MaterialCommunityIcons name="dumbbell" size={32} color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} />
                        ) : tab === 'maps' ? (
                            <MaterialCommunityIcons name="map-legend" size={32} color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} />
                        ) : (
                            <Ionicons name="stats-chart" size={32} color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} />
                        )}
                        <Text style={[
                            styles.tabLabel,
                            { color: activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite }
                        ]}>{
                            tab === 'meals' ? getTabPosts('meals').length : (tab === 'workouts' ? getTabPosts('workouts').length : (tab === 'maps' ? activeProfileMaps.length : getTabPosts('macros').length))
                        }{'\n'}{tab === 'macros' ? 'macros' : tab}</Text>
                    </Pressable>
                ))}
            </View>
            <View style={styles.thickDivider} />
        </View>
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
                case 'maps':
                    icon = <MaterialCommunityIcons name="map-legend" size={80} color="#D4D4D4" />;
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

            <TribeShareModal
                visible={isShareModalVisible}
                onClose={() => { setShareModalVisible(false); setShareTargetPost(null); }}
                post={shareTargetPost}
            />

            <Tabs.Container
                renderHeader={renderHeaderContent}
                renderTabBar={renderTabBar}
                headerContainerStyle={{ backgroundColor: Colors.theme.matteBlack, shadowOpacity: 0, elevation: 0 }}
                initialTabName={initialTab && tabs.includes(initialTab) ? initialTab : 'meals'}
                onIndexChange={(index) => {
                    setActiveTab(tabs[index]);
                }}
            >
                {tabs.map((tab) => {
                    if (tab === 'maps') {
                        const isEmpty = activeProfileMaps.length === 0;
                        return (
                            <Tabs.Tab name={tab} key={tab}>
                                <Tabs.FlatList
                                    data={activeProfileMaps}
                                    keyExtractor={(item: any) => item.id}
                                    renderItem={({ item }: { item: any }) => {
                                        const mockPost: FeedPost = {
                                            id: item.id,
                                            postType: 'map_silent',
                                            caption: item.map_name || item.name || '',
                                            macroMap: item,
                                            user: {
                                                id: targetProfile.id,
                                                name: targetProfile.name || '',
                                                handle: targetProfile.handle || '',
                                                avatar: targetProfile.avatar_url,
                                                status: targetProfile.status || 'none',
                                                activity: targetProfile.activity || '',
                                                activityIcon: targetProfile.activity_icon || '',
                                            },
                                            timeAgo: new Date(item.created_at).toLocaleDateString(),
                                            stats: {
                                                likes: 0,
                                                comments: 0,
                                                shares: 0,
                                                saves: 0,
                                            },
                                            isLiked: false,
                                            isSaved: false,
                                            hasCommented: false,
                                            comments: [],
                                        };
                                        return (
                                            <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
                                                <FeedItem
                                                    post={mockPost}
                                                    onPressOptions={() => handleOptions(mockPost)}
                                                    onPressComment={() => handleCommentPress(mockPost)}
                                                    onPressLike={() => toggleLike(mockPost)}
                                                    onPressVerified={() => setVerifiedModalVisible(true)}
                                                    onPressHammer={() => setHammerModalVisible(true)}
                                                    onPressShare={() => {
                                                        setShareTargetPost(mockPost);
                                                        setShareModalVisible(true);
                                                    }}
                                                    sharedTransitionTag={`post-${item.id}`}
                                                />
                                            </View>
                                        );
                                    }}
                                    ListEmptyComponent={renderEmptyState(tab)}
                                    scrollEnabled={!isEmpty}
                                    bounces={!isEmpty}
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={
                                        !isEmpty ? (
                                            <RefreshControl
                                                refreshing={refreshing}
                                                onRefresh={() => loadData(false)}
                                                tintColor={Colors.theme.harvestGold}
                                            />
                                        ) : undefined
                                    }
                                />
                            </Tabs.Tab>
                        );
                    }

                    const tabPosts = getTabPosts(tab);
                    const isEmpty = tabPosts.length === 0;
                    return (
                        <Tabs.Tab name={tab} key={tab}>
                            <Tabs.FlatList
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
                                            onPressShare={() => {
                                                setShareTargetPost(item);
                                                setShareModalVisible(true);
                                            }}
                                            sharedTransitionTag={`post-${item.id}`}
                                        />
                                    </View>
                                )}
                                ListEmptyComponent={renderEmptyState(tab)}
                                scrollEnabled={!isEmpty}
                                bounces={!isEmpty}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    !isEmpty ? (
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={() => loadData(false)}
                                            tintColor={Colors.theme.harvestGold}
                                        />
                                    ) : undefined
                                }
                            />
                        </Tabs.Tab>
                    );
                })}
            </Tabs.Container>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    headerContainer: {
        backgroundColor: Colors.theme.matteBlack,
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
        borderWidth: 2,
        borderColor: Colors.theme.dust,
    },
    placeholderAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    textInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 2,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    handle: {
        fontSize: 16,
        color: Colors.theme.dust,
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
        color: Colors.theme.dust,
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
        backgroundColor: Colors.theme.charcoal,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
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
        fontSize: 14,
        color: Colors.theme.harvestGold,
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
        color: Colors.theme.harvestGold,
    },
    followLabel: {
        fontSize: 14,
        color: Colors.theme.dust,
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    tabItem: {
        alignItems: 'center',
        paddingBottom: 15,
        flex: 1,
        position: 'relative',
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.theme.harvestGold,
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
    bioContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    bioText: {
        fontSize: 14,
        color: Colors.theme.dust,
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
