import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image, ActivityIndicator, TextInput, Modal, Pressable, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useMarketplaceStore, GoalFilter, EngineFilter, StatusFilter, ActivityFilter, DiscoveryMap } from '@/src/features/macromaps/store/useMarketplaceStore';
import { supabase } from '@/src/shared/services/supabase';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { ACTIVITIES, resolveActivityIcon } from '@/src/shared/constants/Activities';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';
import { DiscoveryMapCard } from '@/src/features/macromaps/components/DiscoveryMapCard';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function DiscoveryFeedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isOnboarding = params.isOnboarding === 'true';
    const { selectedMapIds } = useOnboardingStore();
    const hasSelectedMap = selectedMapIds && selectedMapIds.length > 0;
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [isActivitySectionExpanded, setIsActivitySectionExpanded] = useState(false);
    const { 
        filteredMaps, 
        fetchDiscoveryFeed, 
        isLoading, 
        activeGoalFilters, 
        toggleGoalFilter,
        activeEngineFilters,
        toggleEngineFilter,
        activeStatusFilters,
        toggleStatusFilter,
        activeActivityFilters,
        toggleActivityFilter,
        searchQuery,
        setSearchQuery,
        clearFilters
    } = useMarketplaceStore();

    useEffect(() => {
        fetchDiscoveryFeed();
    }, []);

    const goalFilters: GoalFilter[] = ['Cut', 'Bulk', 'Maintenance'];
    const engineFilters: EngineFilter[] = ['Live', 'Historical', 'Created'];
    const statusFilters: StatusFilter[] = ['Natural', 'Enhanced'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Find a map</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.theme.dust} style={styles.searchIcon} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search maps..."
                        placeholderTextColor={Colors.theme.dust}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={Colors.theme.dust} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
                    <Ionicons name="options" size={24} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
            </View>

            {/* Filter Modal */}
            <Modal visible={isFilterModalVisible} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalTitle}>Filters</Text>
                        {(activeGoalFilters.length > 0 || activeEngineFilters.length > 0 || activeStatusFilters.length > 0 || activeActivityFilters.length > 0) && (
                            <TouchableOpacity onPress={clearFilters}>
                                <Text style={styles.clearFiltersText}>Clear All</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text style={styles.filterHeader}>Goal</Text>
                        <View style={styles.filterGroupWrap}>
                            {goalFilters.map(goal => (
                                <TouchableOpacity 
                                    key={`goal-${goal}`} 
                                    style={[styles.chip, activeGoalFilters.includes(goal) && styles.chipActive]}
                                    onPress={() => toggleGoalFilter(goal)}
                                >
                                    <Text style={[styles.chipText, activeGoalFilters.includes(goal) && styles.chipTextActive]}>
                                        {goal}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={styles.filterHeader}>Generation Mode</Text>
                        <View style={styles.filterGroupWrap}>
                            {engineFilters.map(engine => (
                                <TouchableOpacity 
                                    key={`engine-${engine}`} 
                                    style={[styles.chip, activeEngineFilters.includes(engine) && styles.chipActive]}
                                    onPress={() => toggleEngineFilter(engine)}
                                >
                                    <Text style={[styles.chipText, activeEngineFilters.includes(engine) && styles.chipTextActive]}>
                                        {engine}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterHeader}>Status</Text>
                        <View style={styles.filterGroupWrap}>
                            {statusFilters.map(status => (
                                <TouchableOpacity 
                                    key={`status-${status}`} 
                                    style={[styles.chip, activeStatusFilters.includes(status) && styles.chipActive]}
                                    onPress={() => toggleStatusFilter(status)}
                                >
                                    <Text style={[styles.chipText, activeStatusFilters.includes(status) && styles.chipTextActive]}>
                                        {status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={styles.accordionHeader} 
                            onPress={() => setIsActivitySectionExpanded(!isActivitySectionExpanded)}
                        >
                            <Text style={[styles.filterHeader, { marginBottom: 0 }]}>Activity / Training Focus</Text>
                            <Ionicons 
                                name={isActivitySectionExpanded ? "chevron-up" : "chevron-down"} 
                                size={20} 
                                color={Colors.theme.dust} 
                            />
                        </TouchableOpacity>

                        {isActivitySectionExpanded && (
                            <View style={styles.activityListContainer}>
                                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                                    <View style={styles.activityList}>
                                        {ACTIVITIES.map(activity => (
                                            <TouchableOpacity 
                                                key={`activity-${activity.name}`} 
                                                style={styles.activityRow}
                                                onPress={() => toggleActivityFilter(activity.name)}
                                            >
                                                <View style={styles.activityRowLeft}>
                                                    <ActivityIcon 
                                                        activity={activity.name}
                                                        icon={resolveActivityIcon(activity.name, activity.icon)}
                                                        size={16}
                                                        color={activeActivityFilters.includes(activity.name) ? Colors.theme.harvestGold : Colors.theme.dust}
                                                    />
                                                    <Text style={[
                                                        styles.activityRowText,
                                                        activeActivityFilters.includes(activity.name) && styles.activityRowTextActive
                                                    ]}>
                                                        {activity.displayName || activity.name}
                                                    </Text>
                                                </View>
                                                {activeActivityFilters.includes(activity.name) && (
                                                    <Ionicons name="checkmark-circle" size={20} color={Colors.theme.harvestGold} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.applyFilterButton} onPress={() => setFilterModalVisible(false)}>
                        <Text style={styles.applyFilterText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={[styles.feedContent, isOnboarding && { paddingBottom: 190 }]}>
                    {filteredMaps.length > 0 ? (
                        filteredMaps.map(map => (
                            <DiscoveryMapCard key={map.id} map={map} isOnboarding={isOnboarding} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="telescope" size={64} color={Colors.theme.dust} />
                            <Text style={styles.emptyTitle}>No Maps Found</Text>
                            <Text style={styles.emptySubtitle}>Try adjusting your filters to discover more macro maps.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {isOnboarding && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.subscribeButton, !hasSelectedMap && styles.disabledButton]}
                        onPress={() => router.push('/onboarding/tribe')}
                        disabled={!hasSelectedMap}
                    >
                        <Text style={styles.subscribeText}>Continue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.skipButton}
                        onPress={() => router.push('/onboarding/tribe')}
                    >
                        <Text style={styles.skipText}>Skip for now</Text>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        letterSpacing: 0.5,
    },
    filtersWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 12,
    },
    filterScroll: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    filterGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    filterDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        marginHorizontal: 12,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chipActive: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    chipText: {
        color: Colors.theme.dust,
        fontWeight: '600',
        fontSize: 14,
    },
    chipTextActive: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedContent: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginRight: 12,
    },
    creatorText: {
        flex: 1,
    },
    creatorName: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    creatorBio: {
        color: Colors.theme.dust,
        fontSize: 13,
    },
    badgesContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
    },
    goalBadge: {
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    goalText: {
        color: Colors.theme.harvestGold,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    engineBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    engineText: {
        color: Colors.theme.dust,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    mapTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.theme.softWhite,
        marginBottom: 20,
    },
    liveContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(27, 182, 7, 0.05)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(27, 182, 7, 0.15)',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    glowingPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.theme.naturalGreen,
    },
    liveBadgeText: {
        color: Colors.theme.naturalGreen,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    heartbeatText: {
        color: Colors.theme.dust,
        fontSize: 12,
        fontWeight: '600',
    },
    trajectoryBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    trajectoryBoxTitle: {
        color: Colors.theme.dust,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 12,
    },
    averagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    averageItem: {
        flex: 1,
    },
    averageLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 4,
    },
    averageValue: {
        color: Colors.theme.softWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    averageDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
    },
    horizontalDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 12,
    },
    macroContainer: {
        width: '100%',
        alignItems: 'center',
    },
    macroSplitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    macroLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    macroValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    macroText: {
        color: Colors.theme.softWhite,
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroBubble: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: Colors.theme.harvestGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    macroBubbleText: {
        color: Colors.theme.matteBlack,
        fontSize: 12,
        fontWeight: 'bold',
    },
    creatorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    statusIcon: {
        marginLeft: 6,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: Colors.theme.softWhite,
        fontSize: 15,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.theme.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.theme.charcoal,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    clearFiltersText: {
        color: Colors.theme.harvestGold,
        fontSize: 14,
        fontWeight: 'bold',
    },
    filterHeader: {
        color: Colors.theme.dust,
        fontSize: 13,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    filterGroupWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    applyFilterButton: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    applyFilterText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
    activityList: {
        marginTop: 4,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    activityRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityRowText: {
        color: Colors.theme.dust,
        fontSize: 15,
        marginLeft: 12,
    },
    activityRowTextActive: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingBottom: 12,
    },
    activityListContainer: {
        maxHeight: 250,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: Colors.theme.matteBlack,
    },
    subscribeButton: {
        backgroundColor: Colors.theme.harvestGold,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    subscribeText: {
        color: Colors.theme.matteBlack,
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
        backgroundColor: 'rgba(218, 165, 32, 0.3)',
    },
    skipButton: {
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    skipText: {
        color: Colors.theme.dust,
        fontSize: 16,
        fontWeight: '600',
    }
});
