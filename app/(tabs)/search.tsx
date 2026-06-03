import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { User } from '@/src/shared/models/types';
import { ExploreService } from '@/src/features/explore/services/exploreService';
import ExploreProfileCard from '@/src/features/explore/components/ExploreProfileCard';
import TribeCard from '@/src/features/tribes/components/TribeCard';
import FilterModal from '@/src/features/explore/components/FilterModal';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';
import { useUserStore } from '@/store/UserStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useExploreRankings } from '@/src/features/explore/hooks/useExploreRankings';
import { RefreshControl } from 'react-native';
import { useAuthStore } from '@/store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';
import { DiscoveryTribe } from '@/src/features/explore/types';
import { supabase } from '@/src/shared/services/supabase';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { useOnboardingStore } from '@/store/useOnboardingStore';


// Helper to convert ft'in" or cm string to number (cm)
const parseHeightToCm = (h: string | number) => {
    if (!h) return 0;
    const hStr = h.toString();
    if (hStr.includes("'")) {
        const [ft, inch] = hStr.split("'").map(s => parseInt(s.replace('"', '')) || 0);
        return (ft * 30.48) + (inch * 2.54);
    }
    return parseFloat(hStr) || 0;
};

export default function ExploreScreen(props: { isOnboarding?: boolean }) {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isOnboarding = props.isOnboarding || params.isOnboarding === 'true';
    const insets = useSafeAreaInsets();
    const session = useAuthStore(state => state.session);
    const networkStore = useNetworkStore();
    const userStore = useUserStore();

    // Normalise the authenticated user's handle for self-detection comparisons.
    // Stored handle may or may not include the '@' prefix, so strip it for comparison.
    const currentUserHandle = userStore.handle?.replace('@', '').toLowerCase() ?? '';
    const currentUserId = session?.user?.id ?? '';
    const effectiveUserId = currentUserId || '00000000-0000-0000-0000-000000000000';
    const { joinTribe, leaveTribe, myTribes, pendingTribes, isMember, isRequested, init: initTribes } = useUserTribeStore();
    const { selectedTribeIds, setSelectedTribeIds } = useOnboardingStore();
    const { width } = useWindowDimensions();
    const scrollViewRef = useRef<ScrollView>(null);
    
    useEffect(() => {
        if (currentUserId) {
            initTribes(currentUserId);
        }
    }, [currentUserId]);

    // Welcome Banner State
    const [showWelcome, setShowWelcome] = useState(true);

    // Filters
    const [activeFilters, setActiveFilters] = useState<any>(null);

    // Format filters for the discovery hook
    const formattedDiscoveryFilters = React.useMemo(() => {
        if (!activeFilters) return {};
        let f: any = {
            status: activeFilters.status,
            activity: activeFilters.activity,
        };
        if (activeFilters.minMeals) f.minMeals = activeFilters.minMeals;
        if (activeFilters.minWorkouts) f.minWorkouts = activeFilters.minWorkouts;
        if (activeFilters.minUpdates) f.minUpdates = activeFilters.minUpdates;

        if (activeFilters.height && activeFilters.height.val && !activeFilters.height.val.includes('..')) {
            const targetH = parseHeightToCm(activeFilters.height.val);
            if (targetH > 0) {
                const isMetric = !activeFilters.height.val.includes("'");
                const modeRange = activeFilters.height.mode === 'Range3' ? 3 : 1;
                const rangeInCm = isMetric ? modeRange : modeRange * 2.54;
                f.heightTargetCm = targetH;
                f.heightRangeCm = rangeInCm;
            }
        }
        if (activeFilters.weight && activeFilters.weight.val) {
            const targetW = parseInt(activeFilters.weight.val);
            if (!isNaN(targetW)) {
                f.weightTarget = targetW;
                f.weightRange = activeFilters.weight.mode === 'Range15' ? 15 : 5;
            }
        }
        if (activeFilters.bodyFat && activeFilters.bodyFat.val) {
            const targetBF = parseFloat(activeFilters.bodyFat.val);
            if (!isNaN(targetBF)) {
                f.bfTarget = targetBF;
                f.bfRange = activeFilters.bodyFat.mode === 'Range3' ? 3 : 1;
            }
        }
        return f;
    }, [activeFilters]);

    const { 
        similarUsers, 
        popularUsers, 
        isLoadingSimilar, 
        isLoadingPopular, 
        refresh: refreshRankings 
    } = useExploreRankings(formattedDiscoveryFilters);

    const [searchQuery, setSearchQuery] = useState('');
    const isSearchEmpty = !searchQuery || searchQuery.trim() === '';
    const [activeTab, setActiveTab] = useState(isOnboarding ? 'Tribes' : 'Users');

    // Scroll to active tab
    useEffect(() => {
        if (isOnboarding) {
            setActiveTab('Tribes');
        }
    }, [isOnboarding]);

    useEffect(() => {
        if (!isOnboarding) {
            scrollViewRef.current?.scrollTo({ x: activeTab === 'Users' ? 0 : width, animated: true });
        }
    }, [activeTab, width, isOnboarding]);

    // Users State
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    // Tribes State
    const [tribes, setTribes] = useState<DiscoveryTribe[]>([]);
    const [defaultTribes, setDefaultTribes] = useState<DiscoveryTribe[]>([]);
    const [isLoadingTribes, setIsLoadingTribes] = useState(false);
    const [pendingTribesData, setPendingTribesData] = useState<DiscoveryTribe[]>([]);
    const [pendingTribesLocal, setPendingTribesLocal] = useState<any[]>([]);

    useEffect(() => {
        if (!isOnboarding || !selectedTribeIds || selectedTribeIds.length === 0) {
            setPendingTribesLocal([]);
            return;
        }
        const fetchPending = async () => {
            const { data } = await supabase.from('tribes').select('*').in('id', selectedTribeIds);
            if (data) {
                setPendingTribesLocal(data.map(row => ({
                    id: row.id,
                    name: row.name,
                    avatarUrl: row.avatar_url,
                    themeColor: row.theme_color || '#DAA520',
                    privacy: row.privacy || 'public',
                    memberCount: row.member_count || 0,
                    joinStatus: row.privacy === 'private' ? 'pending' : 'member'
                })));
            }
        };
        fetchPending();
    }, [selectedTribeIds, isOnboarding]);

    // Fetch default 5 tribes for warm start empty state
    useEffect(() => {
        const fetchDefaultTribes = async () => {
            const results = await ExploreService.searchTribes(effectiveUserId, '');
            const sortedResults = results
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 5);
            setDefaultTribes(sortedResults);
        };
        fetchDefaultTribes();
    }, [effectiveUserId]);

    // Modals
    const [filterVisible, setFilterVisible] = useState(false);
    const [hammerVisible, setHammerVisible] = useState(false);
    const [verifiedVisible, setVerifiedVisible] = useState(false);
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

    // Fetch pending tribes details
    useEffect(() => {
        if (pendingTribes.length === 0) {
            setPendingTribesData([]);
            return;
        }
        
        const fetchPending = async () => {
            const { data, error } = await supabase
                .from('tribes')
                .select('*')
                .in('id', pendingTribes);
                
            if (error) {
                console.error('[search.tsx] Error fetching pending tribes:', error.message);
                return;
            }
            
            const mapped = (data || []).map((row: any): DiscoveryTribe => ({
                id: row.id,
                name: row.name,
                avatarUrl: row.avatar_url ?? undefined,
                themeColor: row.theme_color ?? '#DAA520',
                tribeType: (row.tribe_type ?? 'accountability') as any,
                privacy: (row.privacy ?? 'public') as 'public' | 'private',
                description: row.description ?? '',
                tags: row.tags ?? [],
                memberCount: row.member_count ?? 0,
                naturalStatus: row.natural_status ?? null,
                activityType: row.activity_type ?? undefined,
                activityIcon: row.activity_icon ?? undefined,
                focusType: (row.focus_type ?? row.tribe_type ?? 'accountability') as any,
                joinStatus: 'pending',
            }));
            
            setPendingTribesData(mapped);
        };
        
        fetchPending();
    }, [pendingTribes]);

    // Load initial users on mount
    useEffect(() => {
        if (!currentUserId) return;
        ExploreService.searchUsers('', currentUserId, {}).then(results => {
            setUsers(results);
            setFilteredUsers(results);
        });
    }, [currentUserId]);

    // Load tribes whenever query changes (debounced)
    useEffect(() => {
        // Allow search if we have a real user, OR if we are in onboarding mode
        if (!currentUserId && !isOnboarding) return;
        
        const timer = setTimeout(async () => {
            setIsLoadingTribes(true);
            const results = await ExploreService.searchTribes(effectiveUserId, searchQuery);
            setTribes(results);
            setIsLoadingTribes(false);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [currentUserId, effectiveUserId, searchQuery, isOnboarding]);

    // User search effect (debounced, only when Users tab active)
    useEffect(() => {
        if (activeTab !== 'Users') return;
        const timer = setTimeout(async () => {
            let formattedFilters: any = {};
            if (activeFilters) {
                formattedFilters.status = activeFilters.status;
                formattedFilters.activity = activeFilters.activity;
                if (activeFilters.minMeals) formattedFilters.minMeals = activeFilters.minMeals;
                if (activeFilters.minWorkouts) formattedFilters.minWorkouts = activeFilters.minWorkouts;
                if (activeFilters.minUpdates) formattedFilters.minUpdates = activeFilters.minUpdates;
                if (activeFilters.height?.val && !activeFilters.height.val.includes('..')) {
                    const targetH = parseHeightToCm(activeFilters.height.val);
                    if (targetH > 0) {
                        const isMetric = !activeFilters.height.val.includes("'");
                        const modeRange = activeFilters.height.mode === 'Range3' ? 3 : 1;
                        formattedFilters.heightTargetCm = targetH;
                        formattedFilters.heightRangeCm = isMetric ? modeRange : modeRange * 2.54;
                    }
                }
                if (activeFilters.weight?.val) {
                    const targetW = parseInt(activeFilters.weight.val);
                    if (!isNaN(targetW)) {
                        formattedFilters.weightTarget = targetW;
                        formattedFilters.weightRange = activeFilters.weight.mode === 'Range15' ? 15 : 5;
                    }
                }
                if (activeFilters.bodyFat?.val) {
                    const targetBF = parseFloat(activeFilters.bodyFat.val);
                    if (!isNaN(targetBF)) {
                        formattedFilters.bfTarget = targetBF;
                        formattedFilters.bfRange = activeFilters.bodyFat.mode === 'Range3' ? 3 : 1;
                    }
                }
            }
            const results = await ExploreService.searchUsers(searchQuery, currentUserId, formattedFilters);
            setFilteredUsers(results);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilters, activeTab, currentUserId]);

    const handleToggleFollow = async (user: User) => {
        if (!session?.user?.id) return;
        const { success, newState } = await networkStore.toggleFollow(
            session.user.id,
            user.id,
            user.isPrivate || false
        );

        if (success) {
            // Optimistic UI updates for the search list
            setFilteredUsers(prev => prev.map(u => {
                if (u.id === user.id) {
                    return { ...u, isFollowing: newState === 'following', isRequested: newState === 'requested' };
                }
                return u;
            }));
        }
    };

    const handleJoinTribe = (tribeId: string) => {
        const tribe = tribes.find(t => t.id === tribeId);
        if (!tribe || !currentUserId) return;
        joinTribe(currentUserId, {
            id: tribe.id,
            name: tribe.name,
            avatar: tribe.avatarUrl,
            themeColor: tribe.themeColor,
            type: tribe.tribeType,
            privacy: tribe.privacy,
            memberCount: tribe.memberCount,
            description: tribe.description,
            joinStatus: tribe.joinStatus === 'member' ? 'joined' : tribe.joinStatus === 'pending' ? 'requested' : 'none',
            chief: {} as any,
            tags: tribe.tags,
            activityType: tribe.activityType,
            activityIcon: tribe.activityIcon,
            naturalStatus: tribe.naturalStatus,
            focusType: tribe.focusType,
        });
    };

    const handleCardPress = (user: User & { id?: string }) => {
        const isOwnProfile =
            (currentUserId && user.id === currentUserId) ||
            (user.handle?.replace('@', '').toLowerCase() === currentUserHandle);

        if (isOwnProfile) {
            router.push('/(tabs)/profile' as any);
        } else {
            router.push({ pathname: '/user/[handle]', params: { handle: user.handle } } as any);
        }
    };

    const isSelfUser = (user: User & { id?: string }): boolean => {
        if (currentUserId && user.id === currentUserId) return true;
        if (user.handle?.replace('@', '').toLowerCase() === currentUserHandle) return true;
        return false;
    };

    const handleFilterPress = () => {
        setFilterVisible(true);
    };

    const renderTribesContent = () => {
        const isSearchEmpty = searchQuery.trim() === '';

        // If isSearchEmpty is TRUE:
        if (isSearchEmpty) {
            const mergedDefaults = defaultTribes.map(t => {
                const joined = isOnboarding ? (t.privacy === 'public' && selectedTribeIds.includes(t.id)) : isMember(t.id);
                const pending = isOnboarding ? (t.privacy === 'private' && selectedTribeIds.includes(t.id)) : isRequested(t.id);
                return {
                    ...t,
                    joinStatus: joined ? 'member' : (pending ? 'pending' : 'none')
                } as DiscoveryTribe;
            });

            return (
                <FlatList
                    data={mergedDefaults}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={
                        mergedDefaults.length > 0 ? (
                            <Text style={styles.exploreSectionTitle}>Featured Tribes</Text>
                        ) : null
                    }
                    ListFooterComponent={
                        <View style={{ marginBottom: 20 }}>
                            {(() => {
                                const sourceList = isOnboarding ? pendingTribesLocal : pendingTribesData;
                                const joinedTribes = sourceList.filter(t => t.privacy === 'public');
                                const requestedTribes = sourceList.filter(t => t.privacy === 'private');

                                return (
                                    <>
                                        {joinedTribes.length > 0 && (
                                            <>
                                                <Text style={{ 
                                                    color: Colors.theme.softWhite, 
                                                    fontSize: 18, 
                                                    fontWeight: 'bold', 
                                                    marginTop: 20,
                                                    marginLeft: 20,
                                                    marginBottom: 10
                                                }}>
                                                    Your Tribes
                                                </Text>
                                                {joinedTribes.map(tribe => (
                                                    <TribeCard
                                                        key={tribe.id}
                                                        tribe={tribe}
                                                        onPress={() => router.push(`/tribe/${tribe.id}` as any)}
                                                        onPressJoin={() => {
                                                            if (isOnboarding) {
                                                                setSelectedTribeIds(selectedTribeIds.filter(id => id !== tribe.id));
                                                            } else {
                                                                if (currentUserId) leaveTribe(currentUserId, tribe.id);
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </>
                                        )}

                                        {requestedTribes.length > 0 && (
                                            <>
                                                <Text style={{ 
                                                    color: Colors.theme.burntSienna, 
                                                    fontSize: 18, 
                                                    fontWeight: 'bold', 
                                                    marginTop: 20,
                                                    marginLeft: 20,
                                                    marginBottom: 10
                                                }}>
                                                    Pending Requests
                                                </Text>
                                                {requestedTribes.map(tribe => (
                                                    <TribeCard
                                                        key={tribe.id}
                                                        tribe={tribe}
                                                        onPress={() => router.push(`/tribe/${tribe.id}` as any)}
                                                        onPressJoin={() => {
                                                            if (isOnboarding) {
                                                                setSelectedTribeIds(selectedTribeIds.filter(id => id !== tribe.id));
                                                            } else {
                                                                if (currentUserId) leaveTribe(currentUserId, tribe.id);
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </>
                                        )}

                                        {joinedTribes.length === 0 && requestedTribes.length === 0 && (
                                            <>
                                                <Text style={{ 
                                                    color: Colors.theme.burntSienna, 
                                                    fontSize: 18, 
                                                    fontWeight: 'bold', 
                                                    marginTop: 20,
                                                    marginLeft: 20,
                                                    marginBottom: 10
                                                }}>
                                                    Pending Requests
                                                </Text>
                                                <View style={styles.pendingRow}>
                                                    <MaterialCommunityIcons name="clock-outline" size={18} color="#888" />
                                                    <Text style={styles.pendingText}>No pending requests</Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TribeCard
                            tribe={item}
                            onPress={() => router.push(`/tribe/${item.id}` as any)}
                            onPressJoin={() => {
                                if (isOnboarding) {
                                    if (selectedTribeIds.includes(item.id)) {
                                        setSelectedTribeIds(selectedTribeIds.filter(id => id !== item.id));
                                    } else {
                                        setSelectedTribeIds([...selectedTribeIds, item.id]);
                                    }
                                    return;
                                }
                                if (item.joinStatus === 'member' || item.joinStatus === 'pending') {
                                    if (currentUserId) leaveTribe(currentUserId, item.id);
                                } else {
                                    const asTribe = {
                                        ...item,
                                        avatar: item.avatarUrl,
                                        type: item.tribeType,
                                        joinStatus: 'none' as any,
                                        chief: {} as any,
                                    };
                                    if (currentUserId) joinTribe(currentUserId, asTribe as any);
                                }
                            }}
                        />
                    )}
                    contentContainerStyle={[styles.listContent, isOnboarding && { paddingBottom: 190 }]}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={Keyboard.dismiss}
                />
            );
        }

        // If isSearchEmpty is FALSE:
        const mergedTribes = tribes.map(t => {
            const joined = isOnboarding ? (t.privacy === 'public' && selectedTribeIds.includes(t.id)) : isMember(t.id);
            const pending = isOnboarding ? (t.privacy === 'private' && selectedTribeIds.includes(t.id)) : isRequested(t.id);
            return {
                ...t,
                joinStatus: joined ? 'member' : (pending ? 'pending' : 'none')
            } as DiscoveryTribe;
        });

        return (
            <FlatList
                data={mergedTribes}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TribeCard
                        tribe={item}
                        onPress={() => router.push(`/tribe/${item.id}` as any)}
                        onPressJoin={() => {
                            if (isOnboarding) {
                                if (selectedTribeIds.includes(item.id)) {
                                    setSelectedTribeIds(selectedTribeIds.filter(id => id !== item.id));
                                } else {
                                    setSelectedTribeIds([...selectedTribeIds, item.id]);
                                }
                                return;
                            }
                            if (item.joinStatus === 'member' || item.joinStatus === 'pending') {
                                if (currentUserId) leaveTribe(currentUserId, item.id);
                            } else {
                                const asTribe = {
                                    ...item,
                                    avatar: item.avatarUrl,
                                    type: item.tribeType,
                                    joinStatus: 'none' as any,
                                    chief: {} as any,
                                };
                                if (currentUserId) joinTribe(currentUserId, asTribe as any);
                            }
                        }}
                    />
                )}
                ListEmptyComponent={
                    !isLoadingTribes ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No tribes found for "{searchQuery}".</Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={[styles.listContent, isOnboarding && { paddingBottom: 190 }]}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={Keyboard.dismiss}
            />
        );
    };

    const renderUsersContent = () => {
        // Users Tab
        const isSearching = searchQuery.length > 0;
        
        if (isSearching) {
            return (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        const isFollowing = networkStore.isFollowing(item.id);
                        const isRequested = networkStore.isRequested(item.id);
                        const userWithStatus = { ...item, isFollowing, isRequested };
                        const self = isSelfUser(item);
                        return (
                            <ExploreProfileCard
                                user={userWithStatus}
                                isSelf={self}
                                onToggleFollow={() => handleToggleFollow(item)}
                                onPressHammer={() => {
                                    setSelectedUserForModal(item);
                                    setHammerVisible(true);
                                }}
                                onPressStatus={() => {
                                    setSelectedUserForModal(item);
                                    setVerifiedVisible(true);
                                }}
                                onPressCard={() => handleCardPress(item)}
                            />
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No results found.</Text>
                            <TouchableOpacity 
                                style={styles.resetCTA}
                                onPress={() => {
                                    setSearchQuery('');
                                    setActiveFilters(null);
                                }}
                            >
                                <Text style={styles.resetCTAText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={Keyboard.dismiss}
                />
            );
        }

        const showBestMatches = similarUsers.length > 0;
        const showPopular = popularUsers.length > 0;

        return (
            <FlatList
                data={[]}
                renderItem={null}
                refreshControl={
                    <RefreshControl 
                        refreshing={isLoadingSimilar || isLoadingPopular} 
                        onRefresh={refreshRankings}
                        tintColor="#4F6352"
                    />
                }
                ListHeaderComponent={
                    <View style={{ paddingBottom: 20 }}>
                        {showBestMatches && (
                            <>
                                <Text style={styles.exploreSectionTitle}>Best matches</Text>
                                <View style={styles.listContent}>
                                    {similarUsers.map((u, i) => {
                                        const isFollowing = networkStore.isFollowing(u.id);
                                        const isRequested = networkStore.isRequested(u.id);
                                        const userWithStatus = { ...u, isFollowing, isRequested };
                                        const self = isSelfUser(u as any);
                                        return (
                                            <ExploreProfileCard
                                                key={u.id}
                                                user={userWithStatus}
                                                rank={(u as any).globalRank || i + 1}
                                                isSelf={self}
                                                matchPercent={self ? undefined : ('similarityScore' in u ? parseFloat((u as any).similarityScore) : 68)}
                                                onToggleFollow={() => handleToggleFollow(u as any)}
                                                onPressHammer={() => {
                                                    setSelectedUserForModal(u);
                                                    setHammerVisible(true);
                                                }}
                                                onPressStatus={() => {
                                                    setSelectedUserForModal(u);
                                                    setVerifiedVisible(true);
                                                }}
                                                onPressCard={() => handleCardPress(u as any)}
                                            />
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {showPopular && (
                            <>
                                <Text style={styles.exploreSectionTitle}>Most popular</Text>
                                <View style={styles.listContent}>
                                    {popularUsers.map((u, i) => {
                                        const isFollowing = networkStore.isFollowing(u.id);
                                        const isRequested = networkStore.isRequested(u.id);
                                        const userWithStatus = { ...u, isFollowing, isRequested };
                                        const self = isSelfUser(u as any);
                                        return (
                                            <ExploreProfileCard
                                                key={u.id}
                                                user={userWithStatus}
                                                rank={(u as any).globalRank || i + 1}
                                                isSelf={self}
                                                matchPercent={self ? undefined : ('engagementScore' in u && (u as any).engagementScore > 0 ? "Trending" : 40)}
                                                onToggleFollow={() => handleToggleFollow(u as any)}
                                                onPressHammer={() => {
                                                    setSelectedUserForModal(u);
                                                    setHammerVisible(true);
                                                }}
                                                onPressStatus={() => {
                                                    setSelectedUserForModal(u);
                                                    setVerifiedVisible(true);
                                                }}
                                                onPressCard={() => handleCardPress(u as any)}
                                            />
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {!isLoadingSimilar && !isLoadingPopular && !showBestMatches && !showPopular && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No results found.</Text>
                                <TouchableOpacity 
                                    style={styles.resetCTA}
                                    onPress={() => setActiveFilters(null)}
                                >
                                    <Text style={styles.resetCTAText}>Reset Filters</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={Keyboard.dismiss}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                {activeTab === 'Tribes' && !isOnboarding && (
                    <TouchableOpacity
                        style={styles.createTribeBtn}
                        onPress={() => router.push('/create-tribe')}
                    >
                        <MaterialCommunityIcons name="pencil-plus-outline" size={24} color={Colors.theme.dust} />
                    </TouchableOpacity>
                )}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.theme.dust} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search..."
                        placeholderTextColor="rgba(237, 232, 213, 0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={Keyboard.dismiss}
                    />
                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); }}>
                        <Ionicons name="arrow-forward" size={20} color={Colors.theme.dust} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity 
                    style={styles.filterBtn} 
                    onPress={handleFilterPress}
                >
                    <MaterialCommunityIcons 
                        name="tune" 
                        size={24} 
                        color={Colors.theme.dust} 
                    />
                </TouchableOpacity>
            </View>

            {/* Welcome Banner Render (Task 1) */}
            {showWelcome && isOnboarding && (
                <View style={styles.welcomeBanner}>
                    <TouchableOpacity 
                        style={styles.welcomeCloseBtn} 
                        onPress={() => setShowWelcome(false)}
                    >
                        <Ionicons name="close" size={20} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                    <Text style={styles.welcomeTitle}>It's better together. Find a tribe.</Text>
                    <Text style={styles.welcomeBody}>Search for a tribe that aligns with your goals and activities, or skip for now.</Text>
                </View>
            )}

            {/* Tabs */}
            {!isOnboarding && (
                <View style={styles.tabContainer}>
                    <View style={styles.tabBackground}>
                        <TouchableOpacity 
                            style={[styles.tabButton, activeTab === 'Users' && styles.activeTabButton]}
                            onPress={() => setActiveTab('Users')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Users' && styles.activeTabText]}>Users</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabButton, activeTab === 'Tribes' && styles.activeTabButton]}
                            onPress={() => setActiveTab('Tribes')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Tribes' && styles.activeTabText]}>Tribes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {isOnboarding ? (
                <View style={{ flex: 1 }}>
                    {renderTribesContent()}
                </View>
            ) : (
                <ScrollView 
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const offsetX = e.nativeEvent.contentOffset.x;
                        const page = Math.round(offsetX / width);
                        if (page === 0) {
                            setActiveTab('Users');
                        } else {
                            setActiveTab('Tribes');
                        }
                    }}
                    style={{ flex: 1 }}
                >
                    <View style={{ width }}>
                        {renderUsersContent()}
                    </View>
                    <View style={{ width }}>
                        {renderTribesContent()}
                    </View>
                </ScrollView>
            )}

            <FilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                onApply={setActiveFilters}
                mode={activeTab as any}
            />

            <HammerModal
                visible={hammerVisible}
                onClose={() => setHammerVisible(false)}
                activityName={selectedUserForModal?.activity || ''}
                activityIcon={selectedUserForModal?.activityIcon || ''}
            />

            <VerifiedModal
                visible={verifiedVisible}
                onClose={() => setVerifiedVisible(false)}
                status={selectedUserForModal?.status || 'none'}
            />

            {isOnboarding && (
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 20,
                    paddingBottom: 40,
                    backgroundColor: Colors.theme.matteBlack,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    zIndex: 100,
                }}>
                    <TouchableOpacity 
                        style={{
                            backgroundColor: Colors.theme.harvestGold,
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center'
                        }}
                        onPress={() => router.push('/onboarding/privacy')}
                    >
                        <Text style={{ color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' }}>Finish Setup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={{
                            marginTop: 15,
                            alignItems: 'center',
                            paddingVertical: 10,
                        }}
                        onPress={() => router.push('/onboarding/privacy')}
                    >
                        <Text style={{ color: Colors.theme.dust, fontSize: 16, fontWeight: '600' }}>Skip for now</Text>
                    </TouchableOpacity>
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'rgba(237, 232, 213, 0.05)',
        borderRadius: 25,
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.theme.dust,
    },
    filterBtn: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.theme.charcoal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    tabBackground: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 20,
        borderWidth: 1.5,
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
        backgroundColor: Colors.theme.harvestGold,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    activeTabText: {
        color: Colors.theme.dust,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    exploreSectionTitle: {
        color: Colors.theme.burntSienna,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 20,
        marginTop: 10,
        marginBottom: 10,
    },
    createTribeBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(237, 232, 213, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 32,
    },
    emptyStateText: {
        color: '#888',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 15,
        textAlign: 'center',
    },
    tribeEmptyText: {
        color: Colors.theme.harvestGold,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    pendingText: {
        color: '#888',
        fontSize: 14,
    },
    resetCTA: {
        backgroundColor: '#4F6352',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    resetCTAText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    welcomeBanner: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        position: 'relative',
    },
    welcomeCloseBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        paddingRight: 24,
    },
    welcomeBody: {
        fontSize: 14,
        color: Colors.theme.softWhite,
        marginTop: 4,
        lineHeight: 18,
    },
});
