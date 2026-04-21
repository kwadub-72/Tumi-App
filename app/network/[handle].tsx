import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { NetworkUserCard } from '@/src/features/network/components/NetworkUserCard';
import { SupabaseNetworkService } from '@/src/shared/services/SupabaseNetworkService';
import { useAuthStore } from '@/store/AuthStore';
import { User } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';

type TabType = 'followers' | 'following';

export default function NetworkScreen() {
    const { handle, initialTab } = useLocalSearchParams<{ handle: string; initialTab?: TabType }>();
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'followers');
    const [searchQuery, setSearchQuery] = useState('');
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [requests, setRequests] = useState<string[]>([]); // list of userIds quested by current user
    const [loading, setLoading] = useState(true);
    const [targetProfile, setTargetProfile] = useState<{ id: string; handle: string } | null>(null);

    // Track which users were unfollowed during this session in the 'following' tab
    const [unfollowedInSession, setUnfollowedInSession] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
    }, [handle]);

    const fetchData = async () => {
        if (!handle) return;
        setLoading(true);
        
        try {
            // 1. Get target profile ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, handle')
                .eq('handle', handle.startsWith('@') ? handle : `@${handle}`)
                .single();

            if (!profile) throw new Error("Profile not found");
            setTargetProfile(profile);

            // 2. Load followers and following
            const [followersData, followingData] = await Promise.all([
                SupabaseNetworkService.getFollowers(profile.id),
                SupabaseNetworkService.getFollowing(profile.id)
            ]);

            // If we are looking at our own profile, we also need to know who WE have requested
            let userRequests: string[] = [];
            if (session?.user?.id) {
                userRequests = await SupabaseNetworkService.getFollowRequests(session.user.id);
            }

            setFollowers(followersData);
            setFollowing(followingData);
            setRequests(userRequests);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollow = async (user: User) => {
        if (!session?.user?.id) return;

        const isCurrentlyFollowing = following.some(f => f.id === user.id) && !unfollowedInSession.has(user.id);
        const isRequested = requests.includes(user.id);
        
        const currentState = isCurrentlyFollowing ? 'following' : (isRequested ? 'requested' : 'none');

        const { success, newState } = await SupabaseNetworkService.toggleFollow(
            session.user.id,
            user.id,
            currentState === 'following',
            user.isPrivate || false
        );

        if (success) {
            if (newState === 'none') {
                if (activeTab === 'following') {
                    // "Latch" logic: mark as unfollowed in session but don't remove from list
                    setUnfollowedInSession(prev => new Set(prev).add(user.id));
                }
                setRequests(prev => prev.filter(id => id !== user.id));
                setFollowing(prev => prev.filter(f => f.id !== user.id));
            } else if (newState === 'following') {
                // If it was in unfollowedInSession, remove it
                setUnfollowedInSession(prev => {
                    const next = new Set(prev);
                    next.delete(user.id);
                    return next;
                });
                setFollowing(prev => [...prev, user]);
                setRequests(prev => prev.filter(id => id !== user.id));
            } else if (newState === 'requested') {
                setRequests(prev => [...prev, user.id]);
            }
        }
    };

    const filteredList = useMemo(() => {
        const list = activeTab === 'followers' ? followers : following;
        return list.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.handle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [activeTab, followers, following, searchQuery]);

    const getFollowState = (userId: string) => {
        if (unfollowedInSession.has(userId)) return 'none';
        if (following.some(f => f.id === userId)) return 'following';
        if (requests.includes(userId)) return 'requested';
        return 'none';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{handle.replace('@', '')}</Text>
                    <View style={{ width: 28 }} />
                </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <View style={styles.tabBackground}>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'followers' && styles.activeTabButton]}
                        onPress={() => setActiveTab('followers')}
                    >
                        <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'following' && styles.activeTabButton]}
                        onPress={() => setActiveTab('following')}
                    >
                        <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.primary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="rgba(0,0,0,0.4)"
                    />
                    <TouchableOpacity>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* List */}
            <FlatList 
                data={filteredList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <NetworkUserCard 
                        user={item}
                        followState={getFollowState(item.id)}
                        onToggleFollow={() => handleToggleFollow(item)}
                        onPress={() => router.push('/in-development')}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No {activeTab} found</Text>
                    </View>
                }
            />
        </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // Beige
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
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    tabContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    tabBackground: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.sageLight,
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
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    activeTabText: {
        color: 'white',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginHorizontal: 10,
        fontSize: 16,
        color: Colors.primary,
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
        color: '#888',
        fontWeight: '600',
    }
});
