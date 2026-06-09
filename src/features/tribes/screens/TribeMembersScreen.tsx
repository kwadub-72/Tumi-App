import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { NetworkUserCard } from '@/src/features/network/components/NetworkUserCard';
import { SupabaseTribeService } from '@/src/shared/services/SupabaseTribeService';
import { useAuthStore } from '@/store/AuthStore';
import { useNetworkStore } from '@/src/store/NetworkStore';
import { User } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';

type TabType = 'members' | 'requests';

export default function TribeMembersScreen({ tribeId }: { tribeId: string }) {
    const router = useRouter();
    const { session } = useAuthStore();
    const networkStore = useNetworkStore();

    const [tribe, setTribe] = useState<{ id: string; name: string; chief_id: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('members');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMembers, setActiveMembers] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const isChief = session?.user?.id && tribe?.chief_id === session.user.id;

    const fetchData = useCallback(async () => {
        if (!tribeId) return;
        setLoading(true);

        try {
            // 1. Fetch Tribe Info
            const { data: tribeData, error: tribeErr } = await supabase
                .from('tribes')
                .select('id, name, chief_id')
                .eq('id', tribeId)
                .single();

            if (tribeErr || !tribeData) throw tribeErr || new Error('Tribe not found');
            setTribe({
                id: tribeData.id,
                name: tribeData.name,
                chief_id: tribeData.chief_id
            });

            // 2. Fetch Members & Requests
            const { data: membersData, error: membersErr } = await supabase
                .from('tribe_members')
                .select(`
                    role,
                    profiles (
                        id,
                        name,
                        handle,
                        avatar_url,
                        status,
                        activity,
                        activity_icon,
                        height,
                        weight_lbs,
                        body_fat_pct,
                        is_private
                    )
                `)
                .eq('tribe_id', tribeId);

            if (membersErr) throw membersErr;

            const active: User[] = [];
            const pending: User[] = [];

            (membersData || []).forEach((row: any) => {
                if (!row.profiles) return;
                const userObj: User = {
                    id: row.profiles.id,
                    name: row.profiles.name || 'Anonymous',
                    handle: row.profiles.handle || '',
                    avatar: row.profiles.avatar_url,
                    status: row.profiles.status || 'none',
                    activity: row.profiles.activity || '',
                    activityIcon: row.profiles.activity_icon || '',
                    height: row.profiles.height,
                    weight: row.profiles.weight_lbs,
                    bfs: row.profiles.body_fat_pct,
                    isPrivate: row.profiles.is_private,
                };

                if (row.role === 'chief' || row.role === 'member') {
                    active.push(userObj);
                } else if (row.role === 'pending') {
                    pending.push(userObj);
                }
            });

            setActiveMembers(active);
            setPendingRequests(pending);

            // Sync network store if needed
            if (!networkStore.initialized && session?.user?.id) {
                await networkStore.init(session.user.id);
            }
        } catch (e) {
            console.error('[TribeMembersScreen.fetchData] Error:', e);
        } finally {
            setLoading(false);
        }
    }, [tribeId, session?.user?.id, networkStore]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleFollow = async (user: User) => {
        if (!session?.user?.id) return;

        await networkStore.toggleFollow(
            session.user.id,
            user.id,
            user.isPrivate || false
        );
    };

    const handleApprove = async (userId: string) => {
        if (!tribe) return;
        const success = await SupabaseTribeService.approveMembership(tribe.id, userId);
        if (success) {
            fetchData();
        }
    };

    const handleReject = async (userId: string) => {
        if (!tribe) return;
        const success = await SupabaseTribeService.rejectMembership(tribe.id, userId);
        if (success) {
            fetchData();
        }
    };

    const filteredList = useMemo(() => {
        const list = activeTab === 'members' ? activeMembers : pendingRequests;
        return list.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.handle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [activeTab, activeMembers, pendingRequests, searchQuery]);

    const getFollowState = (userId: string) => {
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{tribe?.name}</Text>
                    <View style={{ width: 28 }} />
                </View>

                {/* Tabs Toggle Pill (only shown for Chief) */}
                {isChief && (
                    <View style={styles.tabContainer}>
                        <View style={styles.tabBackground}>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'members' && styles.activeTabButton]}
                                onPress={() => setActiveTab('members')}
                            >
                                <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'requests' && styles.activeTabButton]}
                                onPress={() => setActiveTab('requests')}
                            >
                                <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                                    Requests ({pendingRequests.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={Colors.theme.dust} />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder={activeTab === 'members' ? "Search members..." : "Search requests..."}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={Colors.theme.dust + '66'}
                        />
                        <TouchableOpacity>
                            <Ionicons name="arrow-forward" size={20} color={Colors.theme.dust} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* List */}
                <FlatList 
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        if (activeTab === 'requests') {
                            return (
                                <View style={styles.requestCard}>
                                    <TouchableOpacity 
                                        style={styles.requestCardBody}
                                        onPress={() => router.push({ pathname: '/user/[handle]', params: { handle: item.handle } } as any)}
                                    >
                                        <Image 
                                            source={item.avatar ? { uri: item.avatar } : require('@/assets/images/kwadub.jpg')} 
                                            style={styles.avatar} 
                                        />
                                        <View style={styles.infoContainer}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                                                {item.status === 'natural' && <Ionicons name="leaf" size={14} color={Colors.natural} style={styles.icon} />}
                                                {item.status === 'enhanced' && <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.theme.burntSienna} style={styles.icon} />}
                                            </View>
                                            <Text style={styles.handle}>@{item.handle.replace(/^@/, '')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <View style={styles.actionButtonsRow}>
                                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                                            <Ionicons name="close" size={20} color={Colors.theme.softWhite} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
                                            <Ionicons name="checkmark" size={20} color={Colors.theme.matteBlack} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <NetworkUserCard 
                                user={item}
                                followState={getFollowState(item.id)}
                                onToggleFollow={() => handleToggleFollow(item)}
                                onPress={() => router.push({ pathname: '/user/[handle]', params: { handle: item.handle } } as any)}
                            />
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'members' ? 'No members found' : 'No pending requests'}
                            </Text>
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
        backgroundColor: Colors.theme.matteBlack,
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
        color: Colors.theme.harvestGold,
        letterSpacing: 0.5,
        flex: 1,
        textAlign: 'center',
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
        backgroundColor: Colors.theme.harvestGold,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    activeTabText: {
        color: Colors.theme.matteBlack,
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
        color: Colors.theme.dust,
        fontWeight: '600',
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 40,
        padding: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    requestCardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginRight: 4,
    },
    icon: {
        marginHorizontal: 2,
    },
    handle: {
        fontSize: 13,
        color: Colors.theme.dust,
        marginTop: -2,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveBtn: {
        backgroundColor: Colors.theme.harvestGold,
    },
    rejectBtn: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
});
