import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
    ActionSheetIOS,
    Alert,
    Animated
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
import { SupabaseNetworkService } from '@/src/shared/services/SupabaseNetworkService';
import { FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '../../store/UserStore';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { WeightStore } from '@/store/WeightStore';

const { width, height } = Dimensions.get('window');

type TabType = 'meals' | 'workouts' | 'likes' | 'macros';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const userInfo = useUserStore();
    const session = useAuthStore((state) => state.session);
    const { units } = userInfo;

    // State
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('meals');
    const [refreshing, setRefreshing] = useState(false);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);
    
    // User Tribe Store
    const { myTribes, selectedTribe, selectTribe, init: initTribes } = useUserTribeStore();

    // Animation & Pager Refs
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const pagerRef = React.useRef<ScrollView>(null);
    const tabs: TabType[] = ['meals', 'workouts', 'likes', 'macros'];

    // Collapsible header
    const [headerHeight, setHeaderHeight] = useState(0);
    // Store each tab's scroll offset so we can restore it on switch
    const tabScrollOffsets = React.useRef<Record<TabType, number>>({ meals: 0, workouts: 0, likes: 0, macros: 0 });
    const activeTabRef = React.useRef<TabType>('meals');

    // Derived: translate the header up as user scrolls
    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [0, -headerHeight],
        extrapolate: 'clamp',
    });

    const handleScroll = (tab: TabType) => (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        tabScrollOffsets.current[tab] = y;
        // Drive shared scrollY (JS thread is fine here — only affects header transform)
        scrollY.setValue(Math.max(0, y));
    };

    const handleTabSwitch = (tab: TabType, index: number) => {
        activeTabRef.current = tab;
        setActiveTab(tab);
        pagerRef.current?.scrollTo({ x: index * width, animated: true });
        // Restore this tab's previously saved scroll position for the header
        const savedY = tabScrollOffsets.current[tab];
        scrollY.setValue(Math.max(0, savedY));
    };

    // Helper to get posts for a given tab
    const getTabPosts = (tab: TabType) => posts.filter(p => {
        if (tab === 'likes') return p.isLiked;
        if (tab === 'meals') return p.meal && p.user.handle === userInfo.handle;
        if (tab === 'workouts') return p.workout && p.user.handle === userInfo.handle;
        if (tab === 'macros') return (p.macroUpdate || p.snapshot) && p.user.handle === userInfo.handle;
        return false;
    });
    const loadData = async (silent = false) => {
        if (!session?.user?.id) return;
        if (!silent) setRefreshing(true);
        
        const [profilePosts, counts, { data: profileData }, estimatedWeight] = await Promise.all([
            SupabasePostService.getFeed({
                userId: session.user.id,
                feedType: 'profile'
            }),
            SupabaseNetworkService.getFollowCounts(session.user.id),
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            WeightStore.getEstimatedWeight()
        ]);

        setPosts(profilePosts);
        if (profileData) {
            userInfo.setProfile({
                name: profileData.name,
                handle: profileData.handle,
                avatar: profileData.avatar_url,
                status: profileData.status,
                activity: profileData.activity,
                activityIcon: profileData.activity_icon,
                followers: counts.followers,
                following: counts.following,
                height: profileData.height,
                weight: estimatedWeight ?? profileData.weight_lbs,
                bfs: profileData.body_fat_pct,
                // tribe: profileData.tribe, // Prevent wiping until tribes are implemented in backend
                bio: profileData.bio,
                instagramLink: profileData.instagram_link ?? '',
                tiktokLink: profileData.tiktok_link ?? '',
            });
        }
        if (!silent) setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, [session?.user?.id]);

    useEffect(() => {
        if (session?.user?.id) {
            initTribes(session.user.id);
        }
    }, [session?.user?.id]);

    // Also reload on focus to catch changes from Edit Profile if subscription missed it
    useFocusEffect(
        React.useCallback(() => {
            loadData(true); // Load silently to prevent scroll jumping
        }, [])
    );

    // Derived Data
    const displayWeight = units === 'imperial'
        ? `${Math.round(userInfo.weight)} lbs`
        : `${Math.round(userInfo.weight * 0.453592)} kg`;

    const displayHeight = units === 'imperial'
        ? userInfo.height // e.g. "6'3"
        : `${Math.round((6 * 12 + 3) * 2.54)} cm`; // Mock conversion

    const mealsCount = posts.filter(p => (p.meal && (p.user.handle === userInfo.handle))).length;
    const workoutsCount = posts.filter(p => (p.workout && (p.user.handle === userInfo.handle))).length;
    const likesCount = posts.filter(p => p.isLiked).length;
    const macroUpdatesCount = posts.filter(p => ((p.macroUpdate || p.snapshot) && (p.user.handle === userInfo.handle))).length;

    // No longer using getFilteredPosts directly as it's handled per-tab in the horizontal pager.

    const handleOptions = (post: FeedPost) => {
        const isOwnPost = post.user.handle === userInfo.handle;

        if (Platform.OS === 'ios') {
            if (isOwnPost) {
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options: ['Cancel', 'Delete'],
                        destructiveButtonIndex: 1,
                        cancelButtonIndex: 0,
                        userInterfaceStyle: 'dark',
                    },
                    async (buttonIndex) => {
                        if (buttonIndex === 1) {
                            await SupabasePostService.deletePost(post.id);
                            loadData(); // Reload
                        }
                    }
                );
            } else {
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options: ['Cancel', 'Unfollow', 'Report'],
                        destructiveButtonIndex: 2,
                        cancelButtonIndex: 0,
                        userInterfaceStyle: 'dark',
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 1) {
                            // Unfollow logic
                        } else if (buttonIndex === 2) {
                            // Report logic
                        }
                    }
                );
            }
        } else {
            // Android Fallback
            if (isOwnPost) {
                Alert.alert('Options', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        await SupabasePostService.deletePost(post.id);
                        loadData();
                    }}
                ]);
            } else {
                Alert.alert('Options', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Unfollow' },
                    { text: 'Report', style: 'destructive' }
                ]);
            }
        }
    };

    const handleCommentPress = (post: FeedPost) => {
        setActivePost(post);
        setCommentSheetVisible(true);
    };

    const toggleLike = async (post: FeedPost) => {
        if (!session?.user?.id) return;
        await SupabasePostService.toggleLike(post.id, session.user.id, !!post.isLiked);
        loadData();
    };

    // Split renderHeader to allow dynamic padding injection
    const renderHeaderContent = () => (
        <>
            {/* Top Bar (Hamburger) */}
            <View style={styles.topBar}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="menu" size={32} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <Image
                        source={userInfo.avatar && (userInfo.avatar.startsWith && userInfo.avatar.startsWith('http')) ? { uri: userInfo.avatar } : (typeof userInfo.avatar === 'string' ? { uri: userInfo.avatar } : userInfo.avatar)}
                        style={styles.avatar}
                    />
                </View>

                {/* Text Info */}
                <View style={styles.textInfo}>
                    <Text style={styles.name}>{userInfo.name}</Text>

                    <View style={styles.handleRow}>
                        <Text style={styles.handle}>{userInfo.handle}</Text>
                        {(userInfo.status === 'enhanced' || userInfo.status === 'natural') && (
                            <TouchableOpacity onPress={() => setVerifiedModalVisible(true)}>
                                {userInfo.status === 'enhanced' ? (
                                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFD700" style={{ marginLeft: 4 }} />
                                ) : (
                                    <Ionicons name="leaf" size={18} color={Colors.success} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setHammerModalVisible(true)}>
                            <ActivityIcon 
                                activity={userInfo.activity} 
                                icon={userInfo.activityIcon} 
                                size={18} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <Text style={styles.statsText}>
                        {displayHeight} • {displayWeight} • {(userInfo.bfs?.toString() ?? '--').replace('%', '')}% BF
                    </Text>

                    {/* Tribe */}
                    {selectedTribe && (
                        <View style={styles.tribeRow}>
                            <Text style={[styles.tribeText, { color: selectedTribe.themeColor }]}>
                                {selectedTribe.name}
                            </Text>
                        </View>
                    )}

                    {/* Socials */}
                    <View style={[styles.socialsRow, !selectedTribe && { marginTop: -4 }]}>
                        <TouchableOpacity
                            onPress={() => {
                                if (userInfo.instagramLink) Linking.openURL(userInfo.instagramLink);
                            }}
                            style={[styles.socialIconBtn, !userInfo.instagramLink && styles.socialIconInactive]}
                        >
                            <MaterialCommunityIcons name="instagram" size={24} color={userInfo.instagramLink ? Colors.primary : '#C0C0C0'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (userInfo.tiktokLink) Linking.openURL(userInfo.tiktokLink);
                            }}
                            style={[styles.socialIconBtn, !userInfo.tiktokLink && styles.socialIconInactive]}
                        >
                            <Ionicons name="logo-tiktok" size={22} color={userInfo.tiktokLink ? Colors.primary : '#C0C0C0'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>



            {/* Bio Row (Full Width) */}
            {userInfo.bio ? (
                <View style={styles.bioContainer}>
                    <Text style={styles.bioText} numberOfLines={1} ellipsizeMode="tail">
                        {userInfo.bio}
                    </Text>
                </View>
            ) : null}

            {/* Buttons & Follow Stats */}
            <View style={styles.middleSection}>
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/edit-profile')}>
                        <Text style={styles.actionButtonText}>Edit profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
                        <Text style={styles.actionButtonText}>Share profile</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.followStatsRow}>
                    <TouchableOpacity 
                        style={styles.followStat}
                        onPress={() => router.push({ pathname: '/network/[handle]', params: { handle: userInfo.handle, initialTab: 'followers' } as any })}
                    >
                        <Text style={styles.followValue}>{userInfo.followers}</Text>
                        <Text style={styles.followLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.followStat}
                        onPress={() => router.push({ pathname: '/network/[handle]', params: { handle: userInfo.handle, initialTab: 'following' } as any })}
                    >
                        <Text style={styles.followValue}>{userInfo.following}</Text>
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
                                name={tab === 'likes' ? 'heart' : 'stats-chart'} 
                                size={32} 
                                color={activeTab === tab ? Colors.primary : '#D4D4D4'} 
                            />
                        )}
                        <Text style={styles.tabLabel}>{
                            tab === 'meals' ? mealsCount : (tab === 'workouts' ? workoutsCount : (tab === 'likes' ? likesCount : macroUpdatesCount))
                        }{'\n'}{tab === 'macros' ? 'macros' : tab}</Text>
                    </TouchableOpacity>
                ))}
                
                {/* Animated Indicator */}
                <Animated.View 
                    style={[
                        styles.activeIndicator, 
                        { 
                            width: (width - 40) / 4 * 0.8,
                            left: 20 + (width - 40) / 4 * 0.1,
                            transform: [{
                                translateX: scrollX.interpolate({
                                    inputRange: [0, width * (tabs.length - 1)],
                                    outputRange: [0, (width - 40) / 4 * (tabs.length - 1)]
                                })
                            }]
                        }
                    ]} 
                />
            </View>
            <View style={styles.thickDivider} />
        </>
    );

    // Empty State
    const renderEmptyState = (type: TabType) => {
        let message = '';
        let icon = null;

        switch (type) {
            case 'meals':
                message = 'Log a meal to see it here';
                icon = <MaterialCommunityIcons name="fire" size={80} color="#D4D4D4" />;
                break;
            case 'workouts':
                message = 'Log a workout to see it here';
                icon = <MaterialCommunityIcons name="dumbbell" size={80} color="#D4D4D4" />;
                break;
            case 'likes':
                message = 'Like a post to see it here';
                icon = <Ionicons name="heart" size={80} color="#D4D4D4" />;
                break;
            case 'macros':
                message = 'Post macros to see it here';
                icon = <Ionicons name="stats-chart" size={80} color="#D4D4D4" />;
                break;
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

    // Posts are rendered directly inside each tab's FlatList.
    // This alias keeps renderEmptyState calls readable at the call site.
    const getEmptyStateForTab = (type: TabType) => renderEmptyState(type);


    return (
        <View style={styles.container}>
            <VerifiedModal visible={isVerifiedModalVisible} onClose={() => setVerifiedModalVisible(false)} status={userInfo.status} />
            <HammerModal
                visible={isHammerModalVisible}
                onClose={() => setHammerModalVisible(false)}
                activityName={userInfo.activity}
                activityIcon={userInfo.activityIcon}
            />
            <CommentSheet
                visible={isCommentSheetVisible}
                onClose={() => {
                    setCommentSheetVisible(false);
                    setActivePost(null);
                }}
                comments={activePost?.comments || []}
            />

            {/*
             * Horizontal pager fills the ENTIRE container from top=0.
             * Each FlatList has paddingTop=headerHeight so the first item
             * starts below the floating header. As the user scrolls, the
             * header translates upward (see below), reclaiming that space.
             */}
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
                    // Restore the header position for this tab
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
                            ListEmptyComponent={getEmptyStateForTab(tab)}
                            scrollEnabled={!isEmpty}
                            bounces={!isEmpty}
                            showsVerticalScrollIndicator={false}
                            // paddingTop reserves space under the floating header
                            contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 32 }}
                            onScroll={handleScroll(tab)}
                            scrollEventThrottle={16}
                            refreshControl={
                                !isEmpty ? (
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={loadData}
                                        tintColor={Colors.primary}
                                    />
                                ) : undefined
                            }
                        />
                    );
                })}
            </Animated.ScrollView>

            {/* Floating header — sits on top, translates up as user scrolls */}
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
        backgroundColor: Colors.background, // Beige
    },
    listContent: {
        paddingTop: 0,
        paddingBottom: 40, // Reduced from 100 to prevent excessive bottom scroll
    },
    headerContainer: {
        backgroundColor: Colors.background,
        paddingBottom: 20,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    profileInfo: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        alignItems: 'center',
        marginTop: 10,
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
        color: Colors.primary, // Dark Green
        marginBottom: 2,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    handle: {
        fontSize: 16,
        color: '#999', // Grey
        fontWeight: '600',
    },
    tribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    tribeText: {
        fontSize: 16,
        color: '#8B0000', // Dark Red/Brown
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginRight: 6,
    },
    tribeIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ccc',
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
    socialIcon: {
        color: Colors.primary,
    },
    socialIconBtn: {
        padding: 4,
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
        gap: 15,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#E8F0E5', // Very light green/white
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 1, // Optional definition
        borderColor: 'rgba(255,255,255,0.5)',
    },
    actionButtonText: {
        fontSize: 16,
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
        flex: 1, // Use flex instead of magic width to ensure centering and fit
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
    activeTab: {
        // Active styling handled by conditional rendering of indicator and color
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
        minHeight: 250, // Reduced to prevent forcing a scroll
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 30, // Move icon/text even higher
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
