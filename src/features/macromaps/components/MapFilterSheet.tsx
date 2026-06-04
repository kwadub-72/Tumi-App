import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Modal, 
    ScrollView, 
    TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { ACTIVITIES, resolveActivityIcon } from '@/src/shared/constants/Activities';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';

export interface MapFilterSheetProps {
    visible: boolean;
    onClose: () => void;
    isMapBookView?: boolean;

    activeGoalFilters: string[];
    onToggleGoalFilter: (goal: string) => void;

    activeEngineFilters: string[];
    onToggleEngineFilter: (engine: string) => void;

    activeStatusFilters: string[];
    onToggleStatusFilter: (status: string) => void;

    activeActivityFilters: string[];
    onToggleActivityFilter: (activity: string) => void;

    onClearFilters: () => void;

    // Optional owner filters for Map Book
    activeOwnerFilters?: string[];
    onToggleOwnerFilter?: (owner: string) => void;
}

export function MapFilterSheet(props: MapFilterSheetProps) {
    const {
        visible,
        onClose,
        isMapBookView = false,
        activeGoalFilters,
        onToggleGoalFilter,
        activeEngineFilters,
        onToggleEngineFilter,
        activeStatusFilters,
        onToggleStatusFilter,
        activeActivityFilters,
        onToggleActivityFilter,
        onClearFilters,
        activeOwnerFilters = [],
        onToggleOwnerFilter
    } = props;

    const [isActivitySectionExpanded, setIsActivitySectionExpanded] = useState(false);

    const goalOptions = ['Cut', 'Bulk', 'Maintenance'];
    const engineOptions = ['Live', 'Historical', 'Created'];
    const statusOptions = ['Natural', 'Enhanced'];
    const ownerOptions = ['Mine', 'Subscribed', 'Saved'];

    const hasAnyFiltersActive = 
        activeGoalFilters.length > 0 || 
        activeEngineFilters.length > 0 || 
        activeStatusFilters.length > 0 || 
        activeActivityFilters.length > 0 ||
        (isMapBookView && activeOwnerFilters.length > 0);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>Filters</Text>
                    {hasAnyFiltersActive && (
                        <TouchableOpacity onPress={onClearFilters}>
                            <Text style={styles.clearFiltersText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {/* Owner Section (Map Book view only) */}
                    {isMapBookView && onToggleOwnerFilter && (
                        <>
                            <Text style={styles.filterHeader}>Owner</Text>
                            <View style={styles.filterGroupWrap}>
                                {ownerOptions.map(owner => (
                                    <TouchableOpacity 
                                        key={`owner-${owner}`} 
                                        style={[styles.chip, activeOwnerFilters.includes(owner) && styles.chipActive]}
                                        onPress={() => onToggleOwnerFilter(owner)}
                                    >
                                        <Text style={[styles.chipText, activeOwnerFilters.includes(owner) && styles.chipTextActive]}>
                                            {owner}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Goal Section */}
                    <Text style={styles.filterHeader}>Goal</Text>
                    <View style={styles.filterGroupWrap}>
                        {goalOptions.map(goal => (
                            <TouchableOpacity 
                                key={`goal-${goal}`} 
                                style={[styles.chip, activeGoalFilters.includes(goal) && styles.chipActive]}
                                onPress={() => onToggleGoalFilter(goal)}
                            >
                                <Text style={[styles.chipText, activeGoalFilters.includes(goal) && styles.chipTextActive]}>
                                    {goal}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {/* Generation Mode Section */}
                    <Text style={styles.filterHeader}>Generation Mode</Text>
                    <View style={styles.filterGroupWrap}>
                        {engineOptions.map(engine => (
                            <TouchableOpacity 
                                key={`engine-${engine}`} 
                                style={[styles.chip, activeEngineFilters.includes(engine) && styles.chipActive]}
                                onPress={() => onToggleEngineFilter(engine)}
                            >
                                <Text style={[styles.chipText, activeEngineFilters.includes(engine) && styles.chipTextActive]}>
                                    {engine}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Status Section */}
                    <Text style={styles.filterHeader}>Status</Text>
                    <View style={styles.filterGroupWrap}>
                        {statusOptions.map(status => (
                            <TouchableOpacity 
                                key={`status-${status}`} 
                                style={[styles.chip, activeStatusFilters.includes(status) && styles.chipActive]}
                                onPress={() => onToggleStatusFilter(status)}
                            >
                                <Text style={[styles.chipText, activeStatusFilters.includes(status) && styles.chipTextActive]}>
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Activity Section */}
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
                                            onPress={() => onToggleActivityFilter(activity.name)}
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

                <TouchableOpacity style={styles.applyFilterButton} onPress={onClose}>
                    <Text style={styles.applyFilterText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
});
