import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Tabs } from 'react-native-collapsible-tab-view';
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
import TribeShareModal from '@/src/features/feed/components/TribeShareModal';
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
import { useProfileStore } from '@/src/store/useProfileStore';
import { DiscoveryMapCard } from '@/src/features/macromaps/components/DiscoveryMapCard';
import { MetricNormalizer } from '@/src/shared/utils/MetricNormalizer';

const { width, height } = Dimensions.get('window');

const TEST_COLORS = {
    background: Colors.theme.matteBlack,
    text: Colors.theme.softWhite,
    accent1: Colors.theme.harvestGold,
    accent2: Colors.theme.burntSienna,
    accent3: Colors.theme.oliveDrab,
    surface: Colors.theme.dust,
};

type TabType = 'meals' | 'workouts' | 'macros' | 'maps' | 'likes';

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
    const [isShareModalVisible, setShareModalVisible] = useState(false);
    const [shareTargetPost, setShareTargetPost] = useState<FeedPost | null>(null);
    
    // User Tribe Store
    const { myTribes, selectedTribe, selectTribe, init: initTribes } = useUserTribeStore();

    // Animation & Pager Refs
    const tabs: TabType[] = ['meals', 'workouts', 'macros', 'maps', 'likes'];
    
    // Maps state
    const { activeProfileMaps, fetchProfileMaps } = useProfileStore();

    // Helper to get posts for a given tab
    const getTabPosts = (tab: TabType) => posts.filter(p => {
        if (tab === 'likes') return p.isLiked;
        if (tab === 'meals') return p.meal && p.user.handle === userInfo.handle;
        if (tab === 'workouts') return p.workout && p.user.handle === userInfo.handle;
        if (tab === 'macros') return (p.macroUpdate || p.snapshot) && p.user.handle === userInfo.handle;
        if (tab === 'maps') return (p.postType === 'map_subscribe' || p.postType === 'map_publish' || p.postType === 'map_silent') && p.user.handle === userInfo.handle;
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

        fetchProfileMaps(session.user.id, session.user.id);

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
                height: profileData.height_cm ? String(profileData.height_cm) : '',
                weight: profileData.weight_lbs ?? estimatedWeight ?? 0,
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

    const heightCm = parseFloat(userInfo.height) || 0;
    const displayHeight = heightCm > 0
        ? (units === 'imperial'
            ? (() => {
                const { feet, inches } = MetricNormalizer.cmToImperial(heightCm);
                return `${feet}'${inches}`;
              })()
            : `${Math.round(heightCm)} cm`)
        : '--';

    const mealsCount = posts.filter(p => (p.meal && (p.user.handle === userInfo.handle))).length;
    const workoutsCount = posts.filter(p => (p.workout && (p.user.handle === userInfo.handle))).length;
    const likesCount = posts.filter(p => p.isLiked).length;
    const macroUpdatesCount = posts.filter(p => ((p.macroUpdate || p.snapshot) && (p.user.handle === userInfo.handle))).length;
    const mapsCount = posts.filter(p => ((p.postType === 'map_subscribe' || p.postType === 'map_publish' || p.postType === 'map_silent') && (p.user.handle === userInfo.handle))).length;

    // No longer using getFilteredPosts directly as it's handled per-tab in the horizontal pager.

    const handleOptions = (post: FeedPost) => {
        const isOwnPost = post.user.handle === userInfo.handle;
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

        if (isOwnPost) {
            options.push({
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await SupabasePostService.deletePost(post.id);
                    loadData(); // Reload
                }
            });
        } else {
            options.push({ text: 'Report', style: 'destructive' });
        }

        Alert.alert('Options', undefined, options);
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

    const getAvatarSource = () => {
        if (!userInfo.avatar) {
            return require('../../assets/images/kwadub.jpg');
        }
        if (typeof userInfo.avatar === 'string') {
            if (userInfo.avatar.startsWith('http') || userInfo.avatar.startsWith('file') || userInfo.avatar.startsWith('ph://') || userInfo.avatar.startsWith('assets-library://')) {
                return { uri: userInfo.avatar };
            }
        }
        return userInfo.avatar;
    };

    // Split renderHeader to allow dynamic padding injection
    const renderHeaderContent = () => (
        <View pointerEvents="box-none" style={{ backgroundColor: TEST_COLORS.background, paddingTop: insets.top }}>
            {/* Top Bar (Hamburger) */}
            <View style={styles.topBar}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="menu" size={32} color={TEST_COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {userInfo.avatar ? (
                        <Image
                            source={getAvatarSource()}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Ionicons name="person" size={50} color={Colors.theme.dust} />
                        </View>
                    )}
                </View>

                {/* Text Info */}
                <View style={styles.textInfo}>
                    <Text style={styles.name}>{userInfo.name}</Text>

                    <View style={styles.handleRow}>
                        <Text style={styles.handle}>@{userInfo.handle.replace(/^@/, '')}</Text>
                        {(userInfo.status === 'enhanced' || userInfo.status === 'natural') && (
                            <TouchableOpacity onPress={() => setVerifiedModalVisible(true)}>
                                {userInfo.status === 'enhanced' ? (
                                    <MaterialCommunityIcons name="lightning-bolt" size={18} color={TEST_COLORS.accent2} style={{ marginLeft: 4 }} />
                                ) : (
                                    <Ionicons name="leaf" size={18} color={Colors.natural} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        )}
                        {!!userInfo.activity && (
                            <TouchableOpacity onPress={() => setHammerModalVisible(true)}>
                                <ActivityIcon 
                                    activity={userInfo.activity} 
                                    icon={userInfo.activityIcon} 
                                    size={18} 
                                    color={Colors.theme.harvestGold}
                                />
                            </TouchableOpacity>
                        )}
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
                            <MaterialCommunityIcons name="instagram" size={24} color={userInfo.instagramLink ? TEST_COLORS.text : '#C0C0C0'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (userInfo.tiktokLink) Linking.openURL(userInfo.tiktokLink);
                            }}
                            style={[styles.socialIconBtn, !userInfo.tiktokLink && styles.socialIconInactive]}
                        >
                            <Ionicons name="logo-tiktok" size={22} color={userInfo.tiktokLink ? TEST_COLORS.text : '#C0C0C0'} />
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
        </View>
    );

    const renderTabBar = (props: any) => (
        <View style={{ backgroundColor: TEST_COLORS.background }}>
            <View style={styles.tabsContainer}>
                {tabs.map((tab, index) => (
                    <Pressable 
                        key={tab}
                        style={[styles.tabItem]} 
                        onPress={() => {
                            props.onTabPress(tab);
                        }}
                    >
                        {activeTab === tab && <View style={styles.activeTabIndicatorTop} />}
                        {activeTab === tab && <View style={styles.activeTabIndicatorBottom} />}
                        {tab === 'meals' || tab === 'workouts' ? (
                            <MaterialCommunityIcons 
                                name={tab === 'meals' ? 'fire' : 'dumbbell'} 
                                size={32} 
                                color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} 
                            />
                        ) : tab === 'maps' ? (
                            <MaterialCommunityIcons 
                                name="map-legend" 
                                size={32} 
                                color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} 
                            />
                        ) : (
                            <Ionicons 
                                name={tab === 'likes' ? 'heart' : 'stats-chart'} 
                                size={32} 
                                color={activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite} 
                            />
                        )}
                        <Text style={[
                            styles.tabLabel,
                            { color: activeTab === tab ? Colors.theme.harvestGold : Colors.theme.softWhite }
                        ]}>{
                            tab === 'meals' ? mealsCount : (tab === 'workouts' ? workoutsCount : (tab === 'likes' ? likesCount : (tab === 'maps' ? mapsCount : macroUpdatesCount)))
                        }{'\n'}{tab === 'macros' ? 'macros' : tab}</Text>
                    </Pressable>
                ))}
            </View>
            <View style={styles.thickDivider} />
        </View>
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
            case 'maps':
                message = 'Publish a map to see it here';
                icon = <MaterialCommunityIcons name="map-legend" size={80} color="#D4D4D4" />;
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

            <TribeShareModal
                visible={isShareModalVisible}
                onClose={() => { setShareModalVisible(false); setShareTargetPost(null); }}
                post={shareTargetPost}
            />

            <Tabs.Container
                renderHeader={renderHeaderContent}
                renderTabBar={renderTabBar}
                headerContainerStyle={{ backgroundColor: TEST_COLORS.background, shadowOpacity: 0, elevation: 0 }}
                onIndexChange={(index) => {
                    setActiveTab(tabs[index]);
                }}
            >
                {tabs.map((tab) => {

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
                                ListEmptyComponent={getEmptyStateForTab(tab)}
                                scrollEnabled={!isEmpty}
                                bounces={!isEmpty}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    !isEmpty ? (
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={loadData}
                                            tintColor={TEST_COLORS.text}
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
        backgroundColor: TEST_COLORS.background,
    },
    listContent: {
        paddingTop: 0,
        paddingBottom: 40, // Reduced from 100 to prevent excessive bottom scroll
    },
    headerContainer: {
        backgroundColor: TEST_COLORS.background,
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
        color: Colors.theme.dust,
        fontWeight: '600',
        marginBottom: 6,
    },
    socialsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialIcon: {
        color: TEST_COLORS.text,
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
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
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
        color: TEST_COLORS.accent1, // Harvest Gold for big numbers (like "95%")
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
        flex: 1, // Use flex instead of magic width to ensure centering and fit
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
        color: TEST_COLORS.surface, // Dust for softer body text
    },
    tabLabel: {
        fontSize: 10,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
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
