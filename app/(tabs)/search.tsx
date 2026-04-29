import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { User } from '@/src/shared/models/types';
import { generateFakeUsers, generateFakeTribes } from '@/src/shared/utils/FakeDataGenerator';
import { ExploreService } from '@/src/features/explore/services/exploreService';
import ExploreProfileCard from '@/src/features/explore/components/ExploreProfileCard';
import TribeCard from '@/src/features/tribes/components/TribeCard';
import FilterModal from '@/src/features/explore/components/FilterModal';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';
import { useUserStore } from '@/store/UserStore';
import { useRouter } from 'expo-router';
import { Tribe } from '@/src/shared/models/types';
import MemberCard from '@/src/features/tribes/components/MemberCard';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { useExploreRankings } from '@/src/features/explore/hooks/useExploreRankings';
import { RefreshControl } from 'react-native';
import { useAuthStore } from '@/store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';

export default function ExploreScreen() {
    const router = useRouter();
    const session = useAuthStore(state => state.session);
    const networkStore = useNetworkStore();
    const userStore = useUserStore();

    // Normalise the authenticated user's handle for self-detection comparisons.
    // Stored handle may or may not include the '@' prefix, so strip it for comparison.
    const currentUserHandle = userStore.handle?.replace('@', '').toLowerCase() ?? '';
    const currentUserId = session?.user?.id ?? '';

    const { joinTribe, myTribes, pendingTribes } = useUserTribeStore(); // Store hooks
    const { 
        similarUsers, 
        popularUsers, 
        isLoadingSimilar, 
        isLoadingPopular, 
        refresh: refreshRankings 
    } = useExploreRankings();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Users');

    // Users State
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    // Tribes State (Fetched from fake generator, but joined status synced with store)
    const [tribes, setTribes] = useState<Tribe[]>([]);
    const [filteredTribes, setFilteredTribes] = useState<Tribe[]>([]);

    // Modals
    const [filterVisible, setFilterVisible] = useState(false);
    const [hammerVisible, setHammerVisible] = useState(false);
    const [verifiedVisible, setVerifiedVisible] = useState(false);
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

    // Filters
    const [activeFilters, setActiveFilters] = useState<any>(null);

    useEffect(() => {
        const loadInitial = async () => {
            const initialUsers = await ExploreService.searchUsers('');
            setUsers(initialUsers);
            setFilteredUsers(initialUsers);

            const initialTribes = await ExploreService.searchTribes('');
            // Map DB tribes to Tribe model
            const mappedTribes = initialTribes.map(t => ({
                id: t.id,
                name: t.name,
                image: t.avatar_url,
                privacy: t.visibility || 'public',
                type: t.tribe_type || 'hybrid',
                memberCount: t.member_count || 1,
                tags: t.tags || [],
                description: t.description || '',
            } as unknown as Tribe));
            setTribes(mappedTribes);
            setFilteredTribes(mappedTribes);
        };
        loadInitial();
    }, []);

    useEffect(() => {
        // Sync tribe statuses with store AND merge created tribes
        setTribes(prev => {
            const updated = prev.map(t => {
                const isJoined = myTribes.some(mt => mt.id === t.id);
                const isPending = pendingTribes.includes(t.id);
                return {
                    ...t,
                    joinStatus: isJoined ? 'joined' : (isPending ? 'requested' : 'none')
                } as Tribe;
            });

            // Append myTribes that are not in the list
            myTribes.forEach(mt => {
                if (!updated.find(t => t.id === mt.id)) {
                    updated.push({ ...mt, joinStatus: 'joined' });
                }
            });

            return updated;
        });
    }, [myTribes, pendingTribes]);

    useEffect(() => {
        // Debounced Backend Search
        const delayDebounceFn = setTimeout(async () => {
            if (activeTab === 'Users') {
                const results = await ExploreService.searchUsers(searchQuery);
                let uResult = results;
                
                // 2. Local Filters
                if (activeFilters) {
                    if (activeFilters.status !== 'All') {
                        if (activeFilters.status === 'none') {
                            uResult = uResult.filter(u => !u.status || u.status === 'none');
                        } else {
                            uResult = uResult.filter(u => u.status === activeFilters.status.toLowerCase());
                        }
                    }

                    if (activeFilters.activity !== 'All') {
                        uResult = uResult.filter(u => u.activity === activeFilters.activity);
                    }

                    if (activeFilters.weight && activeFilters.weight.val) {
                        const targetW = parseInt(activeFilters.weight.val);
                        if (!isNaN(targetW)) {
                            const range = activeFilters.weight.mode === 'Range15' ? 15 : 5;
                            uResult = uResult.filter(u => Math.abs((u.weight || 0) - targetW) <= range);
                        }
                    }

                    if (activeFilters.minMeals) {
                        uResult = uResult.filter(u => (u.stats?.meals || 0) >= parseInt(activeFilters.minMeals));
                    }
                    if (activeFilters.minWorkouts) {
                        uResult = uResult.filter(u => (u.stats?.workouts || 0) >= parseInt(activeFilters.minWorkouts));
                    }
                    if (activeFilters.minUpdates) {
                        uResult = uResult.filter(u => (u.stats?.updates || 0) >= parseInt(activeFilters.minUpdates));
                    }
                }
                setFilteredUsers(uResult);
            } else {
                const results = await ExploreService.searchTribes(searchQuery);
                let tResult = results.map(t => ({
                    id: t.id,
                    name: t.name,
                    image: t.avatar_url,
                    privacy: t.visibility || 'public',
                    type: t.tribe_type || 'hybrid',
                    memberCount: t.member_count || 1,
                    tags: t.tags || [],
                    description: t.description || '',
                } as unknown as Tribe));
                
                if (activeFilters) {
                    if (activeFilters.tribeFocus && activeFilters.tribeFocus !== 'All') {
                        tResult = tResult.filter(t => t.type.toLowerCase() === activeFilters.tribeFocus.toLowerCase().replace(' ', '-'));
                    }
                    if (activeFilters.visibility && activeFilters.visibility !== 'All') {
                        tResult = tResult.filter(t => t.privacy.toLowerCase() === activeFilters.visibility.toLowerCase());
                    }
                    if (activeFilters.status === 'natural') {
                        tResult = tResult.filter(t => t.tags?.includes('natural'));
                    }
                }
                
                // Merge join statuses
                const withStatus = tResult.map(t => {
                    const isJoined = myTribes.some(mt => mt.id === t.id);
                    const isPending = pendingTribes.includes(t.id);
                    return {
                        ...t,
                        joinStatus: isJoined ? 'joined' : (isPending ? 'requested' : 'none')
                    } as Tribe;
                });
                
                setFilteredTribes(withStatus);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);

    }, [searchQuery, activeFilters, activeTab, myTribes, pendingTribes]);




    const handleToggleFollow = async (user: User) => {
        if (!session?.user?.id) return;
        const currentIsFollowing = networkStore.isFollowing(user.id);
        
        const { success, newState } = await networkStore.toggleFollow(
            session.user.id,
            user.id,
            user.isPrivate || false
        );

        if (success) {
            // Optimistic UI updates
            setFilteredUsers(prev => prev.map(u => {
                if (u.id === user.id) {
                    return { ...u, isFollowing: newState === 'following', isRequested: newState === 'requested' };
                }
                return u;
            }));
            
            // Note: the similarUsers and popularUsers arrays inside `useExploreRankings` might not automatically update unless we refetch, 
            // but the `networkStore` state is updated, so if the card relies on the store it will update.
            // For now, let's also trigger a refresh of rankings if needed, or just let them be out of sync until a pull-to-refresh.
        }
    };

    const handleJoinTribe = (tribeId: string) => {
        const tribe = tribes.find(t => t.id === tribeId);
        if (tribe) {
            joinTribe(tribe);
        }
    };

    /**
     * Determines whether a profile card tap navigates to the public profile view
     * or to the current user's own Profile tab.
     *
     * Rule: if the tapped user's id matches the authenticated user's id we route
     * to the Profile tab.  Handle is used as the secondary fallback for cases
     * where id may not yet be hydrated (e.g. fake/seed data without a real UUID).
     */
    const handleCardPress = (user: User & { id?: string }) => {
        const isOwnProfile =
            (currentUserId && user.id === currentUserId) ||
            (user.handle?.replace('@', '').toLowerCase() === currentUserHandle);

        if (isOwnProfile) {
            // Navigate to the authenticated user's own profile tab
            router.push('/(tabs)/profile' as any);
        } else {
            router.push({ pathname: '/user/[handle]', params: { handle: user.handle } } as any);
        }
    };

    /** Returns true when the given user card represents the current authenticated user. */
    const isSelfUser = (user: User & { id?: string }): boolean => {
        if (currentUserId && user.id === currentUserId) return true;
        if (user.handle?.replace('@', '').toLowerCase() === currentUserHandle) return true;
        return false;
    };

    const handleFilterPress = () => {
        setFilterVisible(true);
    };

    const renderContent = () => {
        if (activeTab === 'Tribes') {
            return (
                <FlatList
                    data={filteredTribes}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TribeCard
                            tribe={item}
                            onPress={() => router.push(`/tribe/${item.id}`)}
                            onPressJoin={() => handleJoinTribe(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={Keyboard.dismiss}
                />
            );
        }

        // Users Tab
        const isSearching = searchQuery.length > 0;
        
        // When searching, we show filtered search results. 
        // When NOT searching, we show the two curated sections.
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
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={Keyboard.dismiss}
                />
            );
        }

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
                        <Text style={styles.exploreSectionTitle}>Best matches</Text>
                        <View style={styles.listContent}>
                            {similarUsers.slice(0, 5).map((u, i) => {
                                const isFollowing = networkStore.isFollowing(u.id);
                                const isRequested = networkStore.isRequested(u.id);
                                const userWithStatus = { ...u, isFollowing, isRequested };
                                const self = isSelfUser(u as any);
                                return (
                                    <ExploreProfileCard
                                        key={u.id}
                                        user={userWithStatus}
                                        rank={i + 1}
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
                                        rank={i + 1}
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

                        {!isLoadingSimilar && !isLoadingPopular && filteredUsers.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No profiles found.</Text>
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                {activeTab === 'Tribes' && (
                    <TouchableOpacity
                        style={styles.createTribeBtn}
                        onPress={() => router.push('/create-tribe')}
                    >
                        <MaterialCommunityIcons name="pencil-plus-outline" size={24} color="#4F6352" />
                    </TouchableOpacity>
                )}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#4F6352" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        placeholder={activeTab === 'Tribes' ? "Search..." : "Search..."}
                        placeholderTextColor="rgba(79, 99, 82, 0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={Keyboard.dismiss}
                    />
                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); }}>
                        <Ionicons name="arrow-forward" size={20} color="#4F6352" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={handleFilterPress}>
                    <Ionicons name="options" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
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

            <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
                {renderContent()}
            </Pressable>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // Beige
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
        backgroundColor: 'rgba(79, 99, 82, 0.1)', // Light sage
        borderRadius: 25,
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#4F6352',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#4F6352',
    },
    filterBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#6A8E6A', // Sage
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
        backgroundColor: 'rgba(79, 99, 82, 0.1)',
        borderRadius: 20,
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
        backgroundColor: '#4F6352',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4F6352',
    },
    activeTabText: {
        color: 'white',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    exploreSectionTitle: {
        color: '#4F6352',
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
        backgroundColor: 'rgba(79, 99, 82, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4F6352',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyStateText: {
        color: '#4F6352',
        fontSize: 16,
        fontWeight: '500',
    }
});

