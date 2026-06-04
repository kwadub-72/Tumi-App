import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/shared/theme/Colors';
import { MapsLandingView } from '@/src/features/macro-maps/components/MapsLandingView';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';
import { DiscoveryMapCard } from '@/src/features/macromaps/components/DiscoveryMapCard';
import { MapFilterSheet } from '@/src/features/macromaps/components/MapFilterSheet';
import { useMarketplaceStore } from '@/src/features/macromaps/store/useMarketplaceStore';

type TabMode = 'maps' | 'map-book';

export default function MapActionScreen() {
    const router = useRouter();
    const [mode, setMode] = useState<TabMode>('maps');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [activeOwnerFilters, setActiveOwnerFilters] = useState<string[]>([]);

    const {
        activeGoalFilters,
        toggleGoalFilter,
        activeEngineFilters,
        toggleEngineFilter,
        activeStatusFilters,
        toggleStatusFilter,
        activeActivityFilters,
        toggleActivityFilter,
        clearFilters
    } = useMarketplaceStore();

    const toggleOwnerFilter = (owner: string) => {
        setActiveOwnerFilters((prev) => {
            if (prev.includes(owner)) {
                return prev.filter(o => o !== owner);
            } else {
                return [...prev, owner];
            }
        });
    };

    const handleClearAllFilters = () => {
        clearFilters();
        setActiveOwnerFilters([]);
    };

    const [subscribedMaps, setSubscribedMaps] = useState<any[]>([]);
    const [myMaps, setMyMaps] = useState<any[]>([]);
    const session = useAuthStore((state) => state.session);

    const fetchSubscribedMaps = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('macro_map_subscriptions')
                .select(`
                    id,
                    status,
                    current_weight_checkpoint_index,
                    current_time_checkpoint_index,
                    started_at,
                    macro_maps (
                        id,
                        name,
                        engine_type,
                        goal_type,
                        total_duration_weeks,
                        is_live,
                        created_at,
                        creator_status_snapshot,
                        creator_activity_snapshot,
                        creator_activity_icon_snapshot,
                        profiles:creator_id (
                            id,
                            name,
                            handle,
                            avatar_url,
                            status,
                            activity,
                            activity_icon
                        )
                    )
                `)
                .eq('user_id', session.user.id)
                .eq('status', 'ACTIVE');

            if (error) throw error;

            const formatted = (data ?? []).map((sub: any) => {
                const mapObj = Array.isArray(sub.macro_maps) ? sub.macro_maps[0] : sub.macro_maps;
                if (!mapObj) return null;
                const profileObj = Array.isArray(mapObj.profiles) ? mapObj.profiles[0] : mapObj.profiles;
                
                // Prioritize snapshotted metadata for creator natural status and training focus
                const isNatural = mapObj.creator_status_snapshot !== undefined && mapObj.creator_status_snapshot !== null
                    ? mapObj.creator_status_snapshot === 'natural'
                    : profileObj?.status === 'natural';
                const activityType = mapObj.creator_activity_snapshot || profileObj?.activity;
                const activityIcon = mapObj.creator_activity_icon_snapshot || profileObj?.activity_icon;

                return {
                    ...mapObj,
                    id: mapObj.id,
                    map_name: mapObj.name || mapObj.map_name,
                    creator_id: mapObj.creator_id || profileObj?.id,
                    global_track: mapObj.goal_type || mapObj.global_track,
                    generation_type: mapObj.generation_type || 'update',
                    is_live: mapObj.is_live,
                    created_at: mapObj.created_at,
                    display_name: profileObj?.name || 'Creator',
                    avatar_url: profileObj?.avatar_url,
                    username: profileObj?.handle,
                    creator_handle: profileObj?.handle,
                    is_natural: isNatural,
                    activity_type: activityType,
                    activity_icon: activityIcon,
                    subscription_id: sub.id,
                    started_at: sub.started_at,
                    creatorName: profileObj?.name || 'Creator',
                    creatorHandle: profileObj?.handle,
                    creatorAvatar: profileObj?.avatar_url,
                };
            }).filter((m): m is Exclude<typeof m, null> => !!m && !!m.id);

            setSubscribedMaps(formatted);
        } catch (err: any) {
            console.error('[MapActionScreen] fetchSubscribedMaps failed:', err);
        }
    }, [session?.user?.id]);

    const fetchMyMaps = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('macro_maps')
                .select(`
                    id,
                    name,
                    engine_type,
                    goal_type,
                    total_duration_weeks,
                    is_live,
                    created_at,
                    creator_status_snapshot,
                    creator_activity_snapshot,
                    creator_activity_icon_snapshot,
                    profiles:creator_id (
                        id,
                        name,
                        handle,
                        avatar_url,
                        status,
                        activity,
                        activity_icon
                    )
                `)
                .eq('creator_id', session.user.id);

            if (error) throw error;

            const formatted = (data ?? []).map((mapObj: any) => {
                const profileObj = Array.isArray(mapObj.profiles) ? mapObj.profiles[0] : mapObj.profiles;
                
                // Prioritize snapshotted metadata for creator natural status and training focus
                const isNatural = mapObj.creator_status_snapshot !== undefined && mapObj.creator_status_snapshot !== null
                    ? mapObj.creator_status_snapshot === 'natural'
                    : profileObj?.status === 'natural';
                const activityType = mapObj.creator_activity_snapshot || profileObj?.activity;
                const activityIcon = mapObj.creator_activity_icon_snapshot || profileObj?.activity_icon;

                return {
                    ...mapObj,
                    id: mapObj.id,
                    map_name: mapObj.name || mapObj.map_name,
                    creator_id: mapObj.creator_id || profileObj?.id,
                    global_track: mapObj.goal_type || mapObj.global_track,
                    generation_type: mapObj.generation_type || 'update',
                    is_live: mapObj.is_live,
                    created_at: mapObj.created_at,
                    display_name: profileObj?.name || 'Creator',
                    avatar_url: profileObj?.avatar_url,
                    username: profileObj?.handle,
                    creator_handle: profileObj?.handle,
                    is_natural: isNatural,
                    activity_type: activityType,
                    activity_icon: activityIcon,
                    creatorName: profileObj?.name || 'Creator',
                    creatorHandle: profileObj?.handle,
                    creatorAvatar: profileObj?.avatar_url,
                };
            }).filter((m): m is Exclude<typeof m, null> => !!m && !!m.id);

            setMyMaps(formatted);
        } catch (err: any) {
            console.error('[MapActionScreen] fetchMyMaps failed:', err);
        }
    }, [session?.user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (mode === 'map-book' && session?.user?.id) {
                fetchSubscribedMaps();
                fetchMyMaps();
            }
        }, [mode, session?.user?.id, fetchSubscribedMaps, fetchMyMaps])
    );

    // Dummy callback triggers for MapsLandingView
    const handleFindMap = () => {
        router.push('/discovery' as any);
    };

    const handleLaunch = () => {
        router.push('/live-broadcast' as any);
    };

    const handleCreate = () => {
        router.push({ pathname: '/macro-update', params: { createMap: 'true' } } as any);
    };

    const handleSavePrevious = () => {
        router.push({ pathname: '/macro-update', params: { compileStudio: 'true' } } as any);
    };

    // Client-side filtration based on search query and store filters
    const getFilteredMaps = (maps: any[]) => {
        return maps.filter((map) => {
            // Search Query Filter
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.toLowerCase();
                const nameMatch = (map.name || map.map_name || '').toLowerCase().includes(query);
                const creatorMatch = (map.display_name || map.creatorName || '').toLowerCase().includes(query);
                const handleMatch = (map.creator_handle || map.username || map.creatorHandle || '').toLowerCase().includes(query);
                if (!nameMatch && !creatorMatch && !handleMatch) {
                    return false;
                }
            }

            // Goal Filter
            if (activeGoalFilters && activeGoalFilters.length > 0 && !activeGoalFilters.includes('All')) {
                const goalType = (map.goal_type || map.global_track || '').toUpperCase();
                const goalMatch = activeGoalFilters.some(g => goalType === g.toUpperCase());
                if (!goalMatch) return false;
            }

            // Engine / Generation Mode Filter
            if (activeEngineFilters && activeEngineFilters.length > 0 && !activeEngineFilters.includes('All')) {
                const engineMatch = activeEngineFilters.some(engine => {
                    if (engine === 'Live') return map.is_live === true;
                    if (engine === 'Historical') return map.is_live === false && map.generation_type === 'update';
                    if (engine === 'Created') return map.is_live === false && map.generation_type !== 'update';
                    return false;
                });
                if (!engineMatch) return false;
            }

            // Status Filter (Natural/Enhanced)
            if (activeStatusFilters && activeStatusFilters.length > 0 && !activeStatusFilters.includes('All')) {
                const statusStr = map.is_natural ? 'natural' : 'enhanced';
                const statusMatch = activeStatusFilters.some(status => statusStr === status.toLowerCase());
                if (!statusMatch) return false;
            }

            // Activity Filter
            if (activeActivityFilters && activeActivityFilters.length > 0 && !activeActivityFilters.includes('All')) {
                const activityType = (map.activity_type || '').toLowerCase();
                const activityMatch = activeActivityFilters.some(activity => activityType === activity.toLowerCase());
                if (!activityMatch) return false;
            }

            return true;
        });
    };

    const showSubscribed = activeOwnerFilters.length === 0 || activeOwnerFilters.includes('Subscribed');
    const showMine = activeOwnerFilters.length === 0 || activeOwnerFilters.includes('Mine');
    const showSaved = activeOwnerFilters.length === 0 || activeOwnerFilters.includes('Saved');

    const filteredSubscribed = getFilteredMaps(subscribedMaps);
    const filteredMy = getFilteredMaps(myMaps);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header / Mode Toggle Toggle */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRow}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                
                <View style={styles.modeToggleContainer}>
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'maps' && styles.modeBtnActive]}
                            onPress={() => setMode('maps')}
                        >
                            <Text style={[styles.modeText, mode === 'maps' && styles.modeTextActive]}>Maps</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'map-book' && styles.modeBtnActive]}
                            onPress={() => setMode('map-book')}
                        >
                            <Text style={[styles.modeText, mode === 'map-book' && styles.modeTextActive]}>Map book</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Tab Body */}
            {mode === 'maps' ? (
                <MapsLandingView
                    onFindMap={handleFindMap}
                    onLaunch={handleLaunch}
                    onCreate={handleCreate}
                    onSavePrevious={handleSavePrevious}
                />
            ) : (
                <View style={styles.tabContainer}>
                    {/* Search / Filter Row */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchBarContainer}>
                            <Ionicons name="search" size={20} color={Colors.theme.dust} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search maps..."
                                placeholderTextColor={Colors.theme.dust + '66'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={Colors.theme.dust} style={{ marginRight: 4 }} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
                            <Ionicons name="options" size={24} color={Colors.theme.harvestGold} />
                        </TouchableOpacity>
                    </View>

                    {/* Sections Container */}
                    <ScrollView 
                        style={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollInner}
                    >
                        {showSubscribed && (
                            <View style={styles.section}>
                                <Text style={styles.sectionHeader}>Subscribed maps</Text>
                                {filteredSubscribed.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>No maps found</Text>
                                    </View>
                                ) : (
                                    filteredSubscribed.map((map) => (
                                        <DiscoveryMapCard key={map.id} map={map} />
                                    ))
                                )}
                            </View>
                        )}

                        {showMine && (
                            <View style={styles.section}>
                                <Text style={styles.sectionHeader}>My maps</Text>
                                {filteredMy.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>No maps found</Text>
                                    </View>
                                ) : (
                                    filteredMy.map((map) => (
                                        <DiscoveryMapCard key={map.id} map={map} />
                                    ))
                                )}
                            </View>
                        )}

                        {showSaved && (
                            <View style={styles.section}>
                                <Text style={styles.sectionHeader}>Saved maps</Text>
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No maps found</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Filter Sheet Modal */}
            <MapFilterSheet
                visible={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                isMapBookView={true}
                activeGoalFilters={activeGoalFilters}
                onToggleGoalFilter={toggleGoalFilter}
                activeEngineFilters={activeEngineFilters}
                onToggleEngineFilter={toggleEngineFilter}
                activeStatusFilters={activeStatusFilters}
                onToggleStatusFilter={toggleStatusFilter}
                activeActivityFilters={activeActivityFilters}
                onToggleActivityFilter={toggleActivityFilter}
                onClearFilters={handleClearAllFilters}
                activeOwnerFilters={activeOwnerFilters}
                onToggleOwnerFilter={toggleOwnerFilter}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    header: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: Colors.theme.matteBlack,
        zIndex: 10,
    },
    backBtnRow: {
        alignSelf: 'flex-start',
        padding: 5,
        marginBottom: 10,
    },
    modeToggleContainer: {
        width: '100%',
        alignItems: 'center',
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 25,
        padding: 5,
        width: '100%',
        justifyContent: 'space-between',
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    modeBtnActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    modeText: {
        fontSize: 14,
        color: Colors.theme.dust,
        fontWeight: 'bold',
    },
    modeTextActive: {
        color: Colors.theme.matteBlack,
    },
    tabContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15,
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: Colors.theme.dust,
        fontSize: 15,
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.theme.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        paddingBottom: 40,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        color: Colors.theme.burntSienna,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyState: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    emptyStateText: {
        color: Colors.theme.dust,
        opacity: 0.6,
        fontSize: 14,
    },
});
