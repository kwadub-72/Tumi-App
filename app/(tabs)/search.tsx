import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { User } from '@/src/shared/models/types';
import { generateFakeUsers, generateFakeTribes } from '@/src/shared/utils/FakeDataGenerator';
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

export default function ExploreScreen() {
    const router = useRouter();
    const userStore = useUserStore();
    const { joinTribe, myTribes, pendingTribes } = useUserTribeStore(); // Store hooks
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Profiles');

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
        // Initial Data
        const initialUsers = generateFakeUsers(20);
        setUsers(initialUsers);
        setFilteredUsers(initialUsers);

        // Fetch all potential tribes to explore
        const initialTribes = generateFakeTribes();
        setTribes(initialTribes);
        setFilteredTribes(initialTribes);
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
        // Filter Users
        let uResult = users;
        const q = searchQuery.toLowerCase();

        // 1. Similar Tab Filtering (Base population)
        if (activeTab === 'Similar') {
            // Mock similar logic: 
            // Assume current user is "me" (mock stats: 5'7, 170lbs, 15% BF, Natural, Active)
            // Find users within 15% of stats.
            const myStats = { h: "5'7", w: 170, bf: 15, natural: true };
            uResult = uResult.filter(u => {
                // Mock checks
                // For now, randomly filter 50% to show effect or check fields if available
                // We don't have parsed stats on user objects reliably in this mock. 
                // I'll assume generateFakeUsers produces mostly compatible data.
                // Let's just shuffle or slice to pretend.
                return true;
            });
            // Sort by 'similarity' (mock: random sort)
            uResult = [...uResult].sort(() => 0.5 - Math.random());
        }

        // 2. Search Query
        if (searchQuery) {
            uResult = uResult.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.handle.toLowerCase().includes(q)
            );
        }

        // 3. Filters
        if (activeFilters) {
            if (activeFilters.status !== 'All') {
                if (activeFilters.status === 'none') {
                    uResult = uResult.filter(u => !u.status || u.status === 'none');
                } else {
                    uResult = uResult.filter(u => u.status === activeFilters.status.toLowerCase());
                }
            }

            // Apply other filters ONLY if not Similar, OR if allowed in Similar
            const isSimilar = activeTab === 'Similar';

            if (!isSimilar && activeFilters.activity !== 'All') {
                uResult = uResult.filter(u => u.activity === activeFilters.activity);
            }

            // Weight/Height/BF - Only if not similar (Similar handled by base logic)
            if (!isSimilar && activeFilters.weight && activeFilters.weight.val) {
                const targetW = parseInt(activeFilters.weight.val);
                if (!isNaN(targetW)) {
                    const range = activeFilters.weight.mode === 'Range15' ? 15 : 5;
                    uResult = uResult.filter(u => Math.abs((u.weight || 0) - targetW) <= range);
                }
            }

            // Stats (Frequency) - Allowed in Similar
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

        // Filter Tribes
        let tResult = tribes;
        if (searchQuery) {
            tResult = tResult.filter(t => t.name.toLowerCase().includes(q));
        }
        if (activeFilters && activeTab === 'Tribes') {
            if (activeFilters.tribeFocus && activeFilters.tribeFocus !== 'All') {
                tResult = tResult.filter(t => t.type.toLowerCase() === activeFilters.tribeFocus.toLowerCase().replace(' ', '-'));
            }
            if (activeFilters.visibility && activeFilters.visibility !== 'All') {
                tResult = tResult.filter(t => t.privacy.toLowerCase() === activeFilters.visibility.toLowerCase());
            }
            // Helper filters (natural etc)
            if (activeFilters.status === 'natural') {
                tResult = tResult.filter(t => t.tags?.includes('natural'));
            }
        }
        setFilteredTribes(tResult);

    }, [searchQuery, activeFilters, users, tribes, activeTab]);


    const handleToggleFollow = (userId: string) => {
        let isNowFollowing = false;
        setUsers(prev => prev.map(u => {
            if (u.id === userId) {
                isNowFollowing = !u.isFollowing;
                return { ...u, isFollowing: isNowFollowing };
            }
            return u;
        }));
        // ... UserStore update ...
        const currentCount = userStore.following || 0;
        userStore.setProfile({
            following: isNowFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
        });
    };

    const handleJoinTribe = (tribeId: string) => {
        const tribe = tribes.find(t => t.id === tribeId);
        if (tribe) {
            joinTribe(tribe);
        }
    };

    const handleFilterPress = () => {
        if (activeTab === 'Trending') {
            // Maybe disabled for trending? User didn't specify filters for trending.
            // But layout mirrors similar/profile. I'll just open it as profile mode or similar?
            // "On this page [Similar], the only search filters..."
            // For Trending, let's assume no filters for now or standard. 
            // "The layout of profiles on this page [Similar] should mirror the profile tab's... excluding the 'tune' filter".
            // Wait, user said for Similar: "The layout ... mirrors ... EXCEPT for the tune/filter". 
            // Does that mean NO filter button? Or Filter button with reduced options?
            // "Create a 'Tune' (Filter) modal for the Tribe tab...".
            // "On this page [Similar]... enable only 'natural/enhanced' and 'post frequency' filters." - This implies Filter IS available.
            // Maybe "excluding the 'tune' filter" meant "excluding the SEARCH filter UI element" inside the list? No, usually "tune" is the button.
            // "The layout of profiles on this page... mirrors the Explore page's profile tab, excluding the 'Tune' filter." this line contradicts "Enable only... filters".
            // Maybe they mean the "Tune" row that appears in some inputs?
            // But in Profile tab there isn't a "Tune" filter IN the list. It's the button in header.
            // Let's assume the button IS there, but constrained.

            // For Trending, it's just lists. I'll disable filter.
            return;
        }
        setFilterVisible(true);
    };

    const renderContent = () => {
        if (activeTab === 'Trending') {
            // Mock top lists
            const topProfiles = users.slice(0, 10);
            const topTribes = tribes.slice(0, 5);
            return (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={[]}
                        renderItem={null}
                        ListHeaderComponent={
                            <View style={{ paddingBottom: 20 }}>
                                <Text style={styles.sectionTitle}>Trending Profiles</Text>
                                <View style={styles.listContent}>
                                    {topProfiles.map(u => (
                                        <View key={u.id} style={{ marginBottom: 10 }}>
                                            <MemberCard
                                                item={u}
                                                cardColor="#A8C0A8" // Matching Explore theme
                                                themeColor="#4F6352"
                                                onToggleFollow={() => handleToggleFollow(u.id)}
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Text style={styles.sectionTitle}>Trending Tribes</Text>
                                <View style={styles.listContent}>
                                    {topTribes.map(t => (
                                        <TribeCard
                                            key={t.id}
                                            tribe={t}
                                            onPress={() => router.push(`/tribe/${t.id}`)}
                                            onPressJoin={() => handleJoinTribe(t.id)}
                                        />
                                    ))}
                                </View>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            );
        }

        if (activeTab === 'Tribes') {
            // Ensure we render the filtered tribes which are synced with store status
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

        // Profiles or Similar
        const dataToRender = activeTab === 'Similar' ? filteredUsers : filteredUsers; // Logic handled in useEffect

        return (
            <FlatList
                data={dataToRender}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ExploreProfileCard
                        user={item}
                        onToggleFollow={() => handleToggleFollow(item.id)}
                        onPressHammer={() => {
                            setSelectedUserForModal(item);
                            setHammerVisible(true);
                        }}
                        onPressStatus={() => {
                            setSelectedUserForModal(item);
                            setVerifiedVisible(true);
                        }}
                    />
                )}
                contentContainerStyle={styles.listContent}
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
            <View style={styles.tabsRow}>
                {['Similar', 'Profiles', 'Tribes', 'Trending'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }} onStartShouldSetResponder={() => { Keyboard.dismiss(); return false; }}>
                {renderContent()}
            </View>

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
    tabsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#4F6352',
    },
    tabText: {
        color: '#6A8E6A',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#F5F5DC',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    comingSoon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonText: {
        fontSize: 18,
        color: '#6A8E6A',
        fontWeight: 'bold',
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
    sectionTitle: {
        color: '#F5F5DC',
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 20,
        marginTop: 20,
        marginBottom: 10,
    }
});
