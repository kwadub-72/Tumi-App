import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Alert, FlatList } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUpdateCompilerStore, CompilerCheckpoint } from '../store/useUpdateCompilerStore';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const { width } = Dimensions.get('window');

export function UpdateCompilerScreen({ onClose }: { onClose: () => void }) {
    const session = useAuthStore((state) => state.session);
    const userId = session?.user?.id;

    // Connect compiler store
    const {
        startDate,
        endDate,
        startLogs,
        endLogs,
        selectedStartLogId,
        selectedEndLogId,
        outlierFlareLogIds,
        parsedCheckpoints,
        trajectoryAverages,
        isCompiling,
        setStartDate,
        setEndDate,
        setSelectedStartLogId,
        setSelectedEndLogId,
        toggleOutlierFlare,
        compileRange,
        reset
    } = useUpdateCompilerStore();

    // Date picker visibility states
    const [isStartPickerVisible, setStartPickerVisible] = useState(false);
    const [isEndPickerVisible, setEndPickerVisible] = useState(false);

    // Reset store state on unmount
    useEffect(() => {
        return () => {
            reset();
        };
    }, []);

    const handleConfirmStart = async (date: Date) => {
        setStartPickerVisible(false);
        const dateStr = date.toISOString().split('T')[0];
        await setStartDate(dateStr);
    };

    const handleConfirmEnd = async (date: Date) => {
        setEndPickerVisible(false);
        const dateStr = date.toISOString().split('T')[0];
        await setEndDate(dateStr);
    };

    const handleCompileSubmit = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Selection Required', 'Please select both start and end boundary dates.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            Alert.alert('Date Error', 'Start date must be before or equal to the end date.');
            return;
        }
        await compileRange();
    };

    const handleSaveCompiledMap = async () => {
        if (!parsedCheckpoints || !trajectoryAverages || !userId) return;

        try {
            // Save compiled retrospective map to macro_maps
            const { data: mapData, error: mapError } = await supabase
                .from('macro_maps')
                .insert({
                    creator_id: userId,
                    name: `Retrospective Map (${startDate} to ${endDate})`,
                    engine_type: 'EXPERIENTIAL',
                    goal_type: trajectoryAverages.totalWeightDelta < 0 ? 'CUT' : 'BULK',
                    total_duration_weeks: Math.max(1, Math.round((new Date(endDate!).getTime() - new Date(startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))),
                    is_published: true
                })
                .select()
                .single();

            if (mapError || !mapData) {
                Alert.alert('Database Error', mapError?.message || 'Failed to save retrospective map.');
                return;
            }

            // Save checkpoints
            const checkpointsToInsert = parsedCheckpoints.map((cp: CompilerCheckpoint, idx: number) => {
                const totalCals = cp.targets.calories;
                // Calculate ratios
                const proteinCal = cp.targets.p * 4;
                const carbsCal = cp.targets.c * 4;
                const fatsCal = cp.targets.f * 9;
                const totalCalSum = proteinCal + carbsCal + fatsCal;

                return {
                    map_id: mapData.id,
                    sequence_index: idx + 1,
                    trigger_type: 'TIME_BASED',
                    intent_tag: cp.intent === 'weight-down' ? 'PLATEAU_BREAK' : 'STRATEGIC_REVERSAL',
                    protein_ratio: totalCalSum > 0 ? Number((proteinCal / totalCalSum).toFixed(2)) : 0.33,
                    carbs_ratio: totalCalSum > 0 ? Number((carbsCal / totalCalSum).toFixed(2)) : 0.33,
                    fats_ratio: totalCalSum > 0 ? Number((fatsCal / totalCalSum).toFixed(2)) : 0.34,
                    calorie_delta_pct: (totalCals - (trajectoryAverages.avgCalories ?? 2000)) / Math.max((trajectoryAverages.avgCalories ?? 2000), 1),
                    is_outlier_flare: cp.is_outlier_flare
                };
            });

            const { error: cpError } = await supabase
                .from('macro_map_checkpoints')
                .insert(checkpointsToInsert);

            if (cpError) {
                Alert.alert('Database Error', cpError.message || 'Failed to save checkpoints.');
                return;
            }

            Alert.alert('Success', 'Your retrospective map has been compiled and saved successfully!', [
                { text: 'Awesome', onPress: onClose }
            ]);
        } catch (err) {
            console.error('[UpdateCompilerScreen.handleSaveCompiledMap] Exception:', err);
        }
    };

    const renderBoundaryLogSelector = (
        title: string,
        date: string | null,
        logs: any[],
        selectedId: string | null,
        onSelectId: (id: string) => void,
        onOpenPicker: () => void
    ) => {
        return (
            <View style={styles.boundaryContainer}>
                <View style={styles.boundaryHeader}>
                    <Text style={styles.boundaryTitle}>{title}</Text>
                    <TouchableOpacity onPress={onOpenPicker} style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.theme.harvestGold} />
                        <Text style={styles.dateBadgeText}>{date || 'Select Date'}</Text>
                    </TouchableOpacity>
                </View>

                {date && logs.length === 0 && (
                    <Text style={styles.emptyLogsText}>No logs found on this date.</Text>
                )}

                {logs.length > 0 && (
                    <View style={styles.logsListContainer}>
                        <Text style={styles.logsListLabel}>Select target log entry:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.logsScroll}>
                            {logs.map((log, index) => {
                                const isSelected = log.id === selectedId;
                                const targets = log.macro_targets ?? {};
                                return (
                                    <TouchableOpacity
                                        key={log.id}
                                        style={[styles.logOptionCard, isSelected && styles.logOptionCardSelected]}
                                        onPress={() => onSelectId(log.id)}
                                    >
                                        <View style={styles.logOptionHeader}>
                                            <Text style={[styles.logOptionIndex, isSelected && { color: Colors.theme.matteBlack }]}>
                                                Log #{index + 1}
                                            </Text>
                                            <Text style={[styles.logOptionTime, isSelected && { color: Colors.theme.matteBlack }]}>
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <Text style={[styles.logOptionWeight, isSelected && { color: Colors.theme.matteBlack }]}>
                                            {log.weight_lbs ? `${log.weight_lbs} lbs` : '-- lbs'}
                                        </Text>
                                        <View style={styles.logOptionMacros}>
                                            <Text style={[styles.logOptionMacroText, isSelected && { color: Colors.theme.matteBlack }]}>
                                                {targets.calories ?? 0} cal • {targets.p}p • {targets.c}c • {targets.f}f
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={Colors.theme.softWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Update Compiler</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {!parsedCheckpoints ? (
                    <>
                        <View style={styles.introBox}>
                            <MaterialCommunityIcons name="pencil-ruler" size={32} color={Colors.theme.harvestGold} />
                            <Text style={styles.introTitle}>Compile Retrospective Map</Text>
                            <Text style={styles.introText}>
                                Select a start and end date to parse a previous block of training and nutrition into a masterclass map.
                            </Text>
                        </View>

                        {/* Start Date & Log Selector */}
                        {renderBoundaryLogSelector(
                            'Start Boundary',
                            startDate,
                            startLogs,
                            selectedStartLogId,
                            setSelectedStartLogId,
                            () => setStartPickerVisible(true)
                        )}

                        {/* End Date & Log Selector */}
                        {renderBoundaryLogSelector(
                            'End Boundary',
                            endDate,
                            endLogs,
                            selectedEndLogId,
                            setSelectedEndLogId,
                            () => setEndPickerVisible(true)
                        )}

                        <TouchableOpacity style={styles.compileBtn} onPress={handleCompileSubmit}>
                            <LinearGradient
                                colors={['#DAA520', '#B8860B']}
                                style={styles.compileBtnGradient}
                            >
                                <Text style={styles.compileBtnText}>Compile Trajectory Range</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Interactive Timeline Preview Sheet */}
                        <View style={styles.resultsHeader}>
                            <TouchableOpacity style={styles.backButton} onPress={reset}>
                                <Ionicons name="arrow-back" size={20} color={Colors.theme.harvestGold} />
                                <Text style={styles.backButtonText}>Adjust Dates</Text>
                            </TouchableOpacity>
                            <Text style={styles.resultsTitle}>Interactive Timeline</Text>
                        </View>

                        {/* Trajectory Dashboard */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.dashboardTitle}>Trajectory Averages</Text>
                            <View style={styles.dashboardStatsRow}>
                                <View style={styles.dashboardStat}>
                                    <Text style={styles.statLabel}>Avg Calories</Text>
                                    <Text style={styles.statValue}>{trajectoryAverages?.avgCalories} kcal</Text>
                                </View>
                                <View style={styles.dashboardStat}>
                                    <Text style={styles.statLabel}>Weight Delta</Text>
                                    <Text style={[styles.statValue, { color: (trajectoryAverages?.totalWeightDelta ?? 0) < 0 ? Colors.theme.burntSienna : Colors.theme.harvestGold }]}>
                                        {trajectoryAverages?.totalWeightDelta} lbs
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.dashboardMacrosRow}>
                                <Text style={styles.dashboardMacroText}>P: {trajectoryAverages?.avgProtein}g</Text>
                                <Text style={styles.dashboardMacroText}>C: {trajectoryAverages?.avgCarbs}g</Text>
                                <Text style={styles.dashboardMacroText}>F: {trajectoryAverages?.avgFats}g</Text>
                            </View>
                        </View>

                        {/* Checkpoints Timeline */}
                        <Text style={styles.timelineLabel}>Timeline Checkpoints ({parsedCheckpoints.length})</Text>
                        {parsedCheckpoints.map((cp: CompilerCheckpoint, index: number) => {
                            const isOutlier = cp.is_outlier_flare;
                            return (
                                <View key={cp.id} style={[styles.timelineCard, isOutlier && styles.timelineCardOutlier]}>
                                    <View style={styles.timelineCardHeader}>
                                        <Text style={styles.timelineCardDate}>
                                            {new Date(cp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.outlierToggle, isOutlier && styles.outlierToggleActive]}
                                            onPress={() => toggleOutlierFlare(cp.id)}
                                        >
                                            <MaterialCommunityIcons 
                                                name={isOutlier ? 'shield-alert' : 'shield-check-outline'} 
                                                size={16} 
                                                color={isOutlier ? Colors.theme.burntSienna : Colors.theme.dust} 
                                            />
                                            <Text style={[styles.outlierToggleText, isOutlier && { color: Colors.theme.burntSienna }]}>
                                                {isOutlier ? 'Outlier Flare Active' : 'Mark Outlier'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.timelineCardBody}>
                                        <View style={styles.timelineCardMacroCol}>
                                            <Text style={styles.timelineCardVal}>{cp.targets.calories} kcal</Text>
                                            <Text style={styles.timelineCardSub}>P: {cp.targets.p}g • C: {cp.targets.c}g • F: {cp.targets.f}g</Text>
                                        </View>
                                        <View style={styles.timelineCardWeightCol}>
                                            <Text style={styles.timelineCardWeightVal}>{cp.weight ? `${cp.weight} lbs` : '-- lbs'}</Text>
                                            <Text style={styles.timelineCardSub}>Weight</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        <TouchableOpacity style={styles.saveMapBtn} onPress={handleSaveCompiledMap}>
                            <LinearGradient
                                colors={['#DAA520', '#B8860B']}
                                style={styles.compileBtnGradient}
                            >
                                <Text style={styles.compileBtnText}>Save Retrospective Map</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Boundary Pickers */}
            <DateTimePickerModal
                isVisible={isStartPickerVisible}
                mode="date"
                onConfirm={handleConfirmStart}
                onCancel={() => setStartPickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isEndPickerVisible}
                mode="date"
                onConfirm={handleConfirmEnd}
                onCancel={() => setEndPickerVisible(false)}
            />
        </View>
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
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Colors.theme.charcoal,
    },
    closeBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    placeholder: {
        width: 36,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    introBox: {
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: Colors.theme.charcoal,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    introTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginTop: 12,
        marginBottom: 8,
    },
    introText: {
        fontSize: 14,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 20,
    },
    boundaryContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    boundaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    boundaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.matteBlack,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    dateBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    emptyLogsText: {
        color: Colors.theme.burntSienna,
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
    },
    logsListContainer: {
        marginTop: 8,
    },
    logsListLabel: {
        fontSize: 12,
        color: Colors.theme.dust,
        marginBottom: 8,
    },
    logsScroll: {
        gap: 12,
    },
    logOptionCard: {
        width: 160,
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    logOptionCardSelected: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    logOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    logOptionIndex: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    logOptionTime: {
        fontSize: 10,
        color: Colors.theme.dust,
    },
    logOptionWeight: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 4,
    },
    logOptionMacros: {
        marginTop: 2,
    },
    logOptionMacroText: {
        fontSize: 10,
        color: Colors.theme.dust,
    },
    compileBtn: {
        marginTop: 16,
        shadowColor: Colors.theme.harvestGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    compileBtnGradient: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    compileBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 17,
        fontWeight: 'bold',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    dashboardCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
    },
    dashboardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dashboardStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dashboardStat: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.theme.dust,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    dashboardMacrosRow: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    dashboardMacroText: {
        fontSize: 13,
        color: Colors.theme.softWhite,
        fontWeight: '600',
    },
    timelineLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 16,
    },
    timelineCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    timelineCardOutlier: {
        borderColor: 'rgba(235, 87, 87, 0.3)',
        backgroundColor: 'rgba(235, 87, 87, 0.02)',
    },
    timelineCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 8,
    },
    timelineCardDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    outlierToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.matteBlack,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    outlierToggleActive: {
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        borderWidth: 1,
        borderColor: Colors.theme.burntSienna,
    },
    outlierToggleText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },
    timelineCardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineCardMacroCol: {
        flex: 1,
    },
    timelineCardVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 4,
    },
    timelineCardSub: {
        fontSize: 11,
        color: Colors.theme.dust,
    },
    timelineCardWeightCol: {
        alignItems: 'flex-end',
    },
    timelineCardWeightVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 4,
    },
    saveMapBtn: {
        marginTop: 20,
        marginBottom: 40,
        shadowColor: Colors.theme.harvestGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
});
