import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/shared/theme/Colors';
import { User } from '@/src/shared/models/types';
import { generateFakeUsers } from '@/src/shared/utils/FakeDataGenerator';
import ExploreProfileCard from '@/src/features/explore/components/ExploreProfileCard';
import FilterModal from '@/src/features/explore/components/FilterModal';
import HammerModal from '@/components/HammerModal';
import VerifiedModal from '@/components/VerifiedModal';
import { useUserStore } from '@/store/UserStore';

export default function ExploreScreen() {
    const userStore = useUserStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Profile');
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    // Modals
    const [filterVisible, setFilterVisible] = useState(false);
    const [hammerVisible, setHammerVisible] = useState(false);
    const [verifiedVisible, setVerifiedVisible] = useState(false);
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

    // Filters
    const [activeFilters, setActiveFilters] = useState<any>(null);

    useEffect(() => {
        const initialUsers = generateFakeUsers(20);
        setUsers(initialUsers);
        setFilteredUsers(initialUsers);
    }, []);

    useEffect(() => {
        let result = users;

        // Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.handle.toLowerCase().includes(q)
            );
        }

        // Apply Filters
        if (activeFilters) {
            // Status
            if (activeFilters.status !== 'All') {
                if (activeFilters.status === 'none') {
                    result = result.filter(u => !u.status || u.status === 'none');
                } else {
                    result = result.filter(u => u.status === activeFilters.status.toLowerCase());
                }
            }

            // Activity
            if (activeFilters.activity !== 'All') {
                result = result.filter(u => u.activity === activeFilters.activity);
            }

            // Weight
            if (activeFilters.weight && activeFilters.weight.val) {
                const targetW = parseInt(activeFilters.weight.val);
                if (!isNaN(targetW)) {
                    const range = activeFilters.weight.mode === 'Range15' ? 15 : 5;
                    result = result.filter(u => Math.abs((u.weight || 0) - targetW) <= range);
                }
            }

            // Stats
            if (activeFilters.minMeals) {
                result = result.filter(u => (u.stats?.meals || 0) >= parseInt(activeFilters.minMeals));
            }
            if (activeFilters.minWorkouts) {
                result = result.filter(u => (u.stats?.workouts || 0) >= parseInt(activeFilters.minWorkouts));
            }
            if (activeFilters.minUpdates) {
                result = result.filter(u => (u.stats?.updates || 0) >= parseInt(activeFilters.minUpdates));
            }
        }

        setFilteredUsers(result);
    }, [searchQuery, activeFilters, users]);


    const handleToggleFollow = (userId: string) => {
        let isNowFollowing = false;

        setUsers(prev => prev.map(u => {
            if (u.id === userId) {
                isNowFollowing = !u.isFollowing;
                return { ...u, isFollowing: isNowFollowing };
            }
            return u;
        }));

        // Update UserStore count
        const currentCount = userStore.following || 0;
        userStore.setProfile({
            following: isNowFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
        });
    };

    const renderContent = () => {
        if (activeTab !== 'Profile') {
            return (
                <View style={styles.comingSoon}>
                    <Text style={styles.comingSoonText}>Content coming soon</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={filteredUsers}
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
            {/* Header Search */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#4F6352" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search..."
                        placeholderTextColor="rgba(79, 99, 82, 0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); }}>
                        <Ionicons name="arrow-forward" size={20} color="#4F6352" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
                    <Ionicons name="options" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
                {['Similar', 'Profile', 'Tribes', 'Trending'].map(tab => (
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
    }
});
