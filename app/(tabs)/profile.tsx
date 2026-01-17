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
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    ActionSheetIOS,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VerifiedModal from '../../components/VerifiedModal';
import HammerModal from '../../components/HammerModal';
import CommentSheet from '@/components/CommentSheet';
import FeedItem from '@/src/features/feed/components/FeedItem';
import { PostStore } from '../../store/PostStore';
import { FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '../../store/UserStore';

const { width } = Dimensions.get('window');

type TabType = 'meals' | 'workouts' | 'likes' | 'macros';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const userInfo = useUserStore();
    const { units } = userInfo;

    // State
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('meals');
    const [refreshing, setRefreshing] = useState(false);
    const [isVerifiedModalVisible, setVerifiedModalVisible] = useState(false);
    const [isHammerModalVisible, setHammerModalVisible] = useState(false);
    const [isCommentSheetVisible, setCommentSheetVisible] = useState(false);
    const [activePost, setActivePost] = useState<FeedPost | null>(null);

    // Load Data
    const loadData = async () => {
        setRefreshing(true);
        const allPosts = await PostStore.loadPosts();
        setPosts(allPosts);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
        // Subscribe to updates
        const unsubscribe = PostStore.subscribe((updatedPosts) => {
            setPosts(updatedPosts);
        });
        return unsubscribe;
    }, []);

    // Also reload on focus to catch changes from Edit Profile if subscription missed it
    useFocusEffect(
        React.useCallback(() => {
            loadData();
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

    // Filter Posts
    const getFilteredPosts = () => {
        switch (activeTab) {
            case 'meals':
                return posts.filter(p => p.meal && (p.user.handle === userInfo.handle));
            case 'workouts':
                return posts.filter(p => p.workout && (p.user.handle === userInfo.handle));
            case 'likes':
                return posts.filter(p => p.isLiked);
            case 'macros':
                return posts.filter(p => p.macroUpdate && (p.user.handle === userInfo.handle));
            default:
                return [];
        }
    };

    const filteredPosts = getFilteredPosts();

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
                            await PostStore.deletePost(post.id);
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
                    { text: 'Delete', style: 'destructive', onPress: () => PostStore.deletePost(post.id) }
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

    const toggleLike = async (postId: string) => {
        await PostStore.toggleLike(postId);
        loadData();
    };

    // Render Header
    const renderHeader = () => (
        <View style={styles.headerContainer}>
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
                        <TouchableOpacity onPress={() => setHammerModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <MaterialCommunityIcons
                                name={userInfo.activityIcon as any}
                                size={18}
                                color={userInfo.activity === 'Glute Growth' ? '#FFB07C' : Colors.primary}
                                style={{ marginLeft: 4 }}
                            />
                            {userInfo.activity.toLowerCase().includes('bulk') && (
                                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>+</Text>
                            )}
                            {userInfo.activity.toLowerCase().includes('cut') && (
                                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>-</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Tribe */}
                    <View style={styles.tribeRow}>
                        <Text style={styles.tribeText}>{userInfo.tribe}</Text>
                        <Image
                            source={{ uri: userInfo.tribeAvatar }}
                            style={styles.tribeIcon}
                        />
                    </View>

                    {/* Stats */}
                    <Text style={styles.statsText}>
                        {displayHeight} • {displayWeight} • {userInfo.bfs} BF
                    </Text>

                    {/* Socials */}
                    <View style={styles.socialsRow}>
                        <MaterialCommunityIcons name="instagram" size={24} color={Colors.primary} style={styles.socialIcon} />
                        <Ionicons name="logo-tiktok" size={22} color={Colors.primary} style={styles.socialIcon} />
                    </View>
                </View>
            </View>

            {/* Buttons & Follow Stats */}
            <View style={styles.middleSection}>
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/edit-profile')}>
                        <Text style={styles.actionButtonText}>Edit profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Similar</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.followStatsRow}>
                    <View style={styles.followStat}>
                        <Text style={styles.followValue}>{mealsCount}</Text>
                        <Text style={styles.followLabel}>Meals</Text>
                    </View>
                    <View style={styles.followStat}>
                        <Text style={styles.followValue}>{userInfo.followers}</Text>
                        <Text style={styles.followLabel}>Followers</Text>
                    </View>
                    <View style={styles.followStat}>
                        <Text style={styles.followValue}>{userInfo.following}</Text>
                        <Text style={styles.followLabel}>Following</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabItem, activeTab === 'meals' && styles.activeTab]} onPress={() => setActiveTab('meals')}>
                    <MaterialCommunityIcons name="fire" size={32} color={activeTab === 'meals' ? Colors.primary : '#D4D4D4'} />
                    <Text style={styles.tabLabel}>{mealsCount}{'\n'}meals</Text>
                    {activeTab === 'meals' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabItem, activeTab === 'workouts' && styles.activeTab]} onPress={() => setActiveTab('workouts')}>
                    <MaterialCommunityIcons name="dumbbell" size={32} color={activeTab === 'workouts' ? Colors.primary : '#D4D4D4'} />
                    <Text style={styles.tabLabel}>{workoutsCount}{'\n'}workouts</Text>
                    {activeTab === 'workouts' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabItem, activeTab === 'likes' && styles.activeTab]} onPress={() => setActiveTab('likes')}>
                    <Ionicons name="heart" size={32} color={activeTab === 'likes' ? Colors.primary : '#D4D4D4'} />
                    <Text style={styles.tabLabel}>{likesCount}{'\n'}Likes</Text>
                    {activeTab === 'likes' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabItem, activeTab === 'macros' && styles.activeTab]} onPress={() => setActiveTab('macros')}>
                    <Ionicons name="stats-chart" size={32} color={activeTab === 'macros' ? Colors.primary : '#D4D4D4'} />
                    <Text style={styles.tabLabel}>Macro{'\n'}history</Text>
                    {activeTab === 'macros' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
            </View>
            <View style={styles.thickDivider} />
        </View>
    );

    // Empty State
    const renderEmptyState = () => {
        if (activeTab === 'macros') {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Update something</Text>
                </View>
            );
        }

        let message = '';
        if (activeTab === 'meals') message = 'Log a meal';
        if (activeTab === 'workouts') message = 'Log a workout';
        if (activeTab === 'likes') message = 'Like something';

        return (
            <View style={styles.emptyState}>
                {/* Icon based on tab */}
                {activeTab === 'meals' && <MaterialCommunityIcons name="fire" size={60} color={Colors.card} />}
                {activeTab === 'workouts' && <MaterialCommunityIcons name="dumbbell" size={60} color={Colors.card} />}
                {activeTab === 'likes' && <Ionicons name="heart" size={60} color={Colors.card} />}

                <Text style={styles.emptyStateText}>{message}</Text>
            </View>
        );
    };

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

            <FlatList
                data={filteredPosts}
                renderItem={({ item }) => (
                    <FeedItem
                        post={item}
                        onPressOptions={() => handleOptions(item)}
                        onPressComment={() => handleCommentPress(item)}
                        onPressLike={() => toggleLike(item.id)}
                        onPressVerified={() => {
                            setVerifiedModalVisible(true);
                        }}
                        onPressHammer={() => setHammerModalVisible(true)}
                    />
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader()}
                ListEmptyComponent={renderEmptyState()}
                contentContainerStyle={[styles.listContent, { paddingTop: insets.top }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={Colors.primary} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // Beige
    },
    listContent: {
        paddingBottom: 100, // Space for tab bar
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
        borderWidth: 1.5,
        borderColor: 'white',
        color: Colors.primary,
    },
    middleSection: {
        paddingHorizontal: 20,
        marginTop: 20,
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
        width: width / 4,
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
        width: '80%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    thickDivider: {
        height: 2,
    },
    emptyState: {
        padding: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 20,
        color: '#888',
        marginTop: 20,
        fontWeight: 'bold',
    },
});
