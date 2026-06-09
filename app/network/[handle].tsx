import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Keyboard, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { NetworkUserCard } from '@/src/features/network/components/NetworkUserCard';
import { SupabaseNetworkService } from '@/src/shared/services/SupabaseNetworkService';
import { useAuthStore } from '@/store/AuthStore';
import { User } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';
import { useNetworkStore } from '@/src/store/NetworkStore';

type TabType = 'followers' | 'following' | 'requests';

export default function NetworkScreen() {
    const { handle, initialTab } = useLocalSearchParams<{ handle: string; initialTab?: TabType }>();
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'followers');
    const [searchQuery, setSearchQuery] = useState('');
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [targetProfile, setTargetProfile] = useState<{ id: string; handle: string; is_private: boolean } | null>(null);

    const networkStore = useNetworkStore();
    
    // Track which users were unfollowed during this session in the 'following' tab
    const [unfollowedInSession, setUnfollowedInSession] = useState<Set<string>>(new Set());

    const showRequestsTab = targetProfile?.id === session?.user?.id && targetProfile?.is_private;
    const availableTabs: TabType[] = showRequestsTab ? ['followers', 'following', 'requests'] : ['followers', 'following'];
    const pagerRef = useRef<FlatList>(null);
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    const handleTabPress = (tab: TabType) => {
        setActiveTab(tab);
        const index = availableTabs.indexOf(tab);
        pagerRef.current?.scrollToIndex({ index, animated: true });
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setActiveTab(viewableItems[0].item);
        }
    }).current;

    const fetchData = useCallback(async () => {
        if (!handle) return;
        setLoading(true);
        
        try {
            // 1. Get target profile ID
            const decodedHandle = decodeURIComponent(handle as string);
            const cleanHandle = decodedHandle.replace(/^@/, '');
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, handle, is_private')
                .or(`handle.eq.${cleanHandle},handle.eq.@${cleanHandle}`)
                .single();

            if (!profile) throw new Error("Profile not found");
            setTargetProfile(profile);

            // 2. Load followers and following
            const [followersData, followingData] = await Promise.all([
                SupabaseNetworkService.getFollowers(profile.id),
                SupabaseNetworkService.getFollowing(profile.id)
            ]);

            setFollowers(followersData);
            setFollowing(followingData);

            let requestsData: User[] = [];
            if (profile.id === session?.user?.id && profile.is_private) {
                requestsData = await SupabaseNetworkService.getPendingFollowRequests(profile.id);
            }
            setPendingRequests(requestsData);

            // Sync network store if needed
            if (!networkStore.initialized && session?.user?.id) {
                await networkStore.init(session.user.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [handle, session?.user?.id, networkStore]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleFollow = async (user: User) => {
        if (!session?.user?.id) return;

        const isCurrentlyFollowing = networkStore.isFollowing(user.id);

        if (isCurrentlyFollowing && user.isPrivate) {
            Alert.alert(
                "Unfollow Private User?",
                "Are you sure you want to unfollow? You will need to request to follow them again.",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Unfollow", 
                        style: "destructive",
                        onPress: async () => {
                            const { success, newState } = await networkStore.toggleFollow(
                                session.user.id,
                                user.id,
                                user.isPrivate || false
                            );
                            if (success) handleToggleSuccess(user, newState);
                        }
                    }
                ]
            );
        } else {
            const { success, newState } = await networkStore.toggleFollow(
                session.user.id,
                user.id,
                user.isPrivate || false
            );
            if (success) handleToggleSuccess(user, newState);
        }
    };

    const handleToggleSuccess = (user: User, newState: string) => {
        if (newState === 'none') {
            // "Latch" logic: mark as unfollowed in session but don't remove from list if looking at our own following
            if (activeTab === 'following' && targetProfile?.id === session?.user?.id) {
                setUnfollowedInSession(prev => new Set(prev).add(user.id));
            }
        } else if (newState === 'following') {
            setUnfollowedInSession(prev => {
                const next = new Set(prev);
                next.delete(user.id);
                return next;
            });
        }
    };



    const getFollowState = (userId: string) => {
        if (unfollowedInSession.has(userId)) return 'none';
        if (networkStore.isFollowing(userId)) return 'following';
        if (networkStore.isRequested(userId)) return 'requested';
        return 'none';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.theme.softWhite} />
            </View>
        );
    }



    return (
        <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{handle.replace('@', '')}</Text>
                    <View style={{ width: 28 }} />
                </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <View style={[styles.tabBackground, showRequestsTab && { width: '80%' }]}>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'followers' && styles.activeTabButton]}
                        onPress={() => handleTabPress('followers')}
                    >
                        <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'following' && styles.activeTabButton]}
                        onPress={() => handleTabPress('following')}
                    >
                        <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
                    </TouchableOpacity>
                    {showRequestsTab && (
                        <TouchableOpacity 
                            style={[styles.tabButton, activeTab === 'requests' && styles.activeTabButton]}
                            onPress={() => handleTabPress('requests')}
                        >
                            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.theme.dust} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.theme.dust + '66'}
                        onBlur={Keyboard.dismiss}
                        returnKeyType="search"
                    />
                    <TouchableOpacity>
                        <Ionicons name="arrow-forward" size={20} color={Colors.theme.dust} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* List */}
            <FlatList
                ref={pagerRef}
                style={{ flex: 1 }}
                data={availableTabs}
                keyExtractor={(item) => item}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                initialScrollIndex={availableTabs.indexOf(activeTab)}
                getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                renderItem={({ item: tab }) => {
                    const currentListData = tab === 'followers' ? followers : tab === 'following' ? following : pendingRequests;
                    const filtered = currentListData.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.handle.toLowerCase().includes(searchQuery.toLowerCase()));
                    return (
                        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                            <FlatList
                                data={filtered}
                                keyExtractor={(u) => u.id}
                                contentContainerStyle={styles.listContent}
                                directionalLockEnabled={true}
                                nestedScrollEnabled={true}
                                renderItem={({ item }) => (
                                    <NetworkUserCard
                                        user={item}
                                        followState={getFollowState(item.id)}
                                        onToggleFollow={() => handleToggleFollow(item)}
                                        onPress={() => router.push({ pathname: '/user/[handle]', params: { handle: item.handle } } as any)}
                                    />
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No {tab} found</Text>
                                    </View>
                                }
                            />
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack, // Primary (Onyx)
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.theme.harvestGold, // Harvest Gold
        letterSpacing: 0.5,
    },
    tabContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    tabBackground: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        padding: 2,
        width: '60%',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 18,
    },
    activeTabButton: {
        backgroundColor: Colors.theme.harvestGold, // Harvest Gold for active tab
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    activeTabText: {
        color: Colors.theme.matteBlack, // Matte Black for active text
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginHorizontal: 10,
        fontSize: 16,
        color: Colors.theme.dust,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.theme.dust, // Tertiary (Dust)
        fontWeight: '600',
    }
});
