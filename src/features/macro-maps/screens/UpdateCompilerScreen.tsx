import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Alert, TextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUpdateCompilerStore, CompilerCheckpoint } from '../store/useUpdateCompilerStore';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';

export function UpdateCompilerScreen({ onClose }: { onClose: () => void }) {
    const session = useAuthStore((state) => state.session);
    const userId = session?.user?.id;

    // Connect compiler store
    const {
        generationType,
        setGenerationType,
        mapName,
        setMapName,
        startDate,
        endDate,
        startLogs,
        endLogs,
        selectedStartLogId,
        selectedEndLogId,
        parsedCheckpoints,
        trajectoryAverages,
        loggedDates,
        loadLoggedDates,
        setStartDate,
        setEndDate,
        setSelectedStartLogId,
        setSelectedEndLogId,
        toggleOutlierFlare,
        compileRange,
        reset,
        clearCompilation,
        resetDates,
        getTrackSummary
    } = useUpdateCompilerStore();

    // Custom calendar current month/year view state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);

    // Reset store state and load logged dates on mount
    useEffect(() => {
        loadLoggedDates();
        return () => {
            reset();
        };
    }, []);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        // Add empty slots for weekday offset
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDatePress = async (day: Date) => {
        const year = day.getFullYear();
        const month = String(day.getMonth() + 1).padStart(2, '0');
        const dateNum = String(day.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dateNum}`;

        if (!startDate) {
            await setStartDate(dateStr);
        } else if (startDate && !endDate) {
            if (dateStr > startDate) {
                await setEndDate(dateStr);
            } else {
                await setStartDate(dateStr);
            }
        } else {
            resetDates();
            await setStartDate(dateStr);
        }
    };

    const handleCompileSubmit = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Selection Required', 'Please select both start and end boundary dates on the calendar.');
            return;
        }
        if (!mapName || !mapName.trim()) {
            Alert.alert('Validation Error', 'Please enter a valid Map Name before proceeding.');
            return;
        }
        await compileRange();
    };

    const handleSaveCompiledMap = async () => {
        if (!mapName || !mapName.trim()) {
            Alert.alert('Validation Error', 'Please enter a valid Map Name before proceeding.');
            return;
        }
        if (!parsedCheckpoints || !trajectoryAverages || !userId) return;

        try {
            // Save compiled historical map to macro_maps
            const { data: mapData, error: mapError } = await supabase
                .from('macro_maps')
                .insert({
                    creator_id: userId,
                    name: mapName.trim(),
                    engine_type: 'EXPERIENTIAL',
                    generation_type: generationType,
                    goal_type: trajectoryAverages.totalWeightDelta < 0 ? 'CUT' : 'BULK',
                    total_duration_weeks: Math.max(1, Math.round((new Date(endDate!).getTime() - new Date(startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))),
                    is_published: true
                })
                .select()
                .single();

            if (mapError || !mapData) {
                Alert.alert('Database Error', mapError?.message || 'Failed to save historical map.');
                return;
            }

            // Save checkpoints
            const checkpointsToInsert = parsedCheckpoints.map((cp: CompilerCheckpoint, idx: number) => {
                const totalCals = cp.targets.calories;
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

            Alert.alert('Success', 'Your historical map has been compiled and saved successfully!', [
                { text: 'Awesome', onPress: onClose }
            ]);
        } catch (err) {
            console.error('[UpdateCompilerScreen.handleSaveCompiledMap] Exception:', err);
        }
    };

    const renderCalendar = () => {
        const days = getDaysInMonth(currentMonth);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

        return (
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-back" size={20} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsPickerModalVisible(true)}>
                        <Text style={styles.calendarMonthText}>
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-forward" size={20} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                </View>
                
                <Modal visible={isPickerModalVisible} transparent animationType="fade">
                    <TouchableOpacity style={styles.pickerModalOverlay} activeOpacity={1} onPress={() => setIsPickerModalVisible(false)}>
                        <TouchableWithoutFeedback>
                            <View style={styles.pickerModalContent}>
                                <Text style={styles.pickerModalTitle}>Select Month & Year</Text>
                                <View style={styles.pickerRow}>
                                    <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                                        {monthNames.map((m, idx) => (
                                            <TouchableOpacity 
                                                key={m} 
                                                style={[styles.pickerItem, currentMonth.getMonth() === idx && styles.pickerItemSelected]}
                                                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1))}
                                            >
                                                <Text style={[styles.pickerItemText, currentMonth.getMonth() === idx && styles.pickerItemTextSelected]}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                                        {years.map(y => (
                                            <TouchableOpacity 
                                                key={y} 
                                                style={[styles.pickerItem, currentMonth.getFullYear() === y && styles.pickerItemSelected]}
                                                onPress={() => setCurrentMonth(new Date(y, currentMonth.getMonth(), 1))}
                                            >
                                                <Text style={[styles.pickerItemText, currentMonth.getFullYear() === y && styles.pickerItemTextSelected]}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setIsPickerModalVisible(false)}>
                                    <Text style={styles.pickerDoneBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </TouchableOpacity>
                </Modal>

                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                    {weekDays.map((day, idx) => (
                        <Text key={idx} style={styles.weekdayText}>{day}</Text>
                    ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                    {days.map((day, index) => {
                        if (!day) {
                            return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
                        }

                        const year = day.getFullYear();
                        const month = String(day.getMonth() + 1).padStart(2, '0');
                        const dateNum = String(day.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${dateNum}`;

                        const isLogged = loggedDates.has(dateStr);
                        const isSelectedStart = startDate === dateStr;
                        const isSelectedEnd = endDate === dateStr;
                        const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;

                        let cellStyle: any = [styles.dayCell];
                        let textStyle: any = [styles.dayText];

                        if (!isLogged) {
                            cellStyle.push(styles.dayCellDisabled);
                            textStyle.push(styles.dayTextDisabled);
                        } else {
                            cellStyle.push(styles.dayCellLogged);
                            textStyle.push(styles.dayTextLogged);

                            if (isSelectedStart || isSelectedEnd) {
                                cellStyle.push(styles.dayCellSelected);
                                textStyle.push(styles.dayTextSelected);
                            } else if (isInRange) {
                                cellStyle.push(styles.dayCellInRange);
                                textStyle.push(styles.dayTextInRange);
                            }
                        }

                        return (
                            <TouchableOpacity
                                key={`day-${dateStr}`}
                                style={cellStyle}
                                disabled={!isLogged}
                                onPress={() => handleDatePress(day)}
                            >
                                <Text style={textStyle}>{day.getDate()}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderBoundaryLogSelector = (
        title: string,
        date: string | null,
        logs: any[],
        selectedId: string | null,
        onSelectId: (id: string) => void
    ) => {
        return (
            <View style={styles.boundaryContainer}>
                <View style={styles.boundaryHeader}>
                    <Text style={styles.boundaryTitle}>{title}</Text>
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.theme.harvestGold} />
                        <Text style={styles.dateBadgeText}>{date || 'Select Date'}</Text>
                    </View>
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

    // Trajectory average calculations for strictly relative percentage-based UI representation
    const summary = getTrackSummary();
    const durationDays = summary.durationDays;
    const durationWeeks = durationDays / 7;
    const avgPctShift = summary.avgPctShift;
    const calShiftStr = `${avgPctShift >= 0 ? '+' : ''}${avgPctShift.toFixed(1)}%`;

    const startWeight = parsedCheckpoints && parsedCheckpoints.length > 0 ? parsedCheckpoints[0].weight : 180;
    const totalWeightDelta = trajectoryAverages?.totalWeightDelta ?? 0;
    const weightPaceRaw = durationWeeks > 0 ? (totalWeightDelta / durationWeeks) : 0;
    const weightPacePct = startWeight > 0 ? (weightPaceRaw / startWeight) * 100 : 0;
    const weightPaceStr = `${weightPacePct >= 0 ? '+' : ''}${weightPacePct.toFixed(1)}%`;

    const avgProtein = trajectoryAverages?.avgProtein ?? 150;
    const avgCarbs = trajectoryAverages?.avgCarbs ?? 200;
    const avgFats = trajectoryAverages?.avgFats ?? 60;
    const totalCalSum = (avgProtein * 4) + (avgCarbs * 4) + (avgFats * 9) || 1;
    const pRatio = Math.round((avgProtein * 4) / totalCalSum * 100);
    const cRatio = Math.round((avgCarbs * 4) / totalCalSum * 100);
    const fRatio = Math.max(0, 100 - pRatio - cRatio);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={Colors.theme.softWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{parsedCheckpoints ? 'Review Your Map' : 'Save a Previous Journey'}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {!parsedCheckpoints ? (
                    <>
                        <View style={styles.introBox}>
                            <MaterialCommunityIcons name="pencil-ruler" size={32} color={Colors.theme.harvestGold} />
                            <Text style={styles.introTitle}>Build from history</Text>
                            <Text style={styles.introText}>
                                Select a training window to turn past macro updates into a shareable, guided journey.
                            </Text>
                        </View>

                        {/* Generation Type Selector */}
                        <View style={styles.selectorContainer}>
                            <Text style={styles.label}>Generation Mode</Text>
                            <TouchableOpacity 
                                style={[styles.selectorCard, generationType === 'update' && styles.selectorCardActive]}
                                onPress={() => setGenerationType('update')}
                            >
                                <View style={styles.selectorCardHeader}>
                                    <MaterialCommunityIcons 
                                        name="tune" 
                                        size={20} 
                                        color={generationType === 'update' ? Colors.theme.matteBlack : Colors.theme.harvestGold} 
                                    />
                                    <Text style={[styles.selectorCardLabel, generationType === 'update' && styles.selectorCardLabelActive]}>Update Map</Text>
                                </View>
                                <Text style={[styles.selectorCardSubtext, generationType === 'update' && styles.selectorCardSubtextActive]}>
                                    Build a map from previous macro updates
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.selectorCard, generationType === 'meal_log' && styles.selectorCardActive]}
                                onPress={() => setGenerationType('meal_log')}
                            >
                                <View style={styles.selectorCardHeader}>
                                    <MaterialCommunityIcons 
                                        name="food-apple" 
                                        size={20} 
                                        color={generationType === 'meal_log' ? Colors.theme.matteBlack : Colors.theme.harvestGold} 
                                    />
                                    <Text style={[styles.selectorCardLabel, generationType === 'meal_log' && styles.selectorCardLabelActive]}>Meal Log Map</Text>
                                </View>
                                <Text style={[styles.selectorCardSubtext, generationType === 'meal_log' && styles.selectorCardSubtextActive]}>
                                    Build a map using the average macros of the meals you logged each week
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Map Name Input Field */}
                        <View style={styles.fieldRow}>
                            <Text style={styles.label}>Map Name</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. My Historical Journey"
                                placeholderTextColor={Colors.theme.dust}
                                value={mapName}
                                onChangeText={setMapName}
                            />
                        </View>

                        {/* Interactive Calendar grid for date selection */}
                        <Text style={styles.calendarLabel}>Select Date Range</Text>
                        {renderCalendar()}

                        {/* Start Date & Log Selector */}
                        {startDate && renderBoundaryLogSelector(
                            'Start Boundary',
                            startDate,
                            startLogs,
                            selectedStartLogId,
                            setSelectedStartLogId
                        )}

                        {/* End Date & Log Selector */}
                        {endDate && renderBoundaryLogSelector(
                            'End Boundary',
                            endDate,
                            endLogs,
                            selectedEndLogId,
                            setSelectedEndLogId
                        )}

                        <TouchableOpacity style={styles.compileBtn} onPress={handleCompileSubmit}>
                            <LinearGradient
                                colors={['#DAA520', '#B8860B']}
                                style={styles.compileBtnGradient}
                            >
                                <Text style={styles.compileBtnText}>Confirm map time frame</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Interactive Timeline Preview Sheet */}
                        <View style={styles.resultsHeader}>
                            <TouchableOpacity style={styles.backButton} onPress={clearCompilation}>
                                <Ionicons name="arrow-back" size={20} color={Colors.theme.harvestGold} />
                                <Text style={styles.backButtonText}>Adjust Dates</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.mapNameDisplay}>{mapName}</Text>

                        {/* Trajectory Dashboard (Strictly Relative Percentages) */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.dashboardTitle}>Trajectory Averages</Text>
                            <View style={styles.dashboardStatsRow}>
                                <View style={styles.dashboardStat}>
                                    <Text style={styles.statLabel}>Total calorie shift</Text>
                                    <Text style={styles.statValue}>{calShiftStr}</Text>
                                </View>
                                <View style={styles.dashboardStat}>
                                    <Text style={styles.statLabel}>Weekly weight change</Text>
                                    <Text style={[
                                        styles.statValue, 
                                        { color: weightPacePct < 0 ? Colors.theme.burntSienna : Colors.theme.harvestGold }
                                    ]}>
                                        {weightPaceStr}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.dashboardMacrosContainer}>
                                <Text style={styles.statLabel}>Avg macro split</Text>
                                <View style={styles.dashboardMacrosRow}>
                                    <Text style={styles.dashboardMacroText}>
                                        P: {pRatio}%  •  C: {cRatio}%  •  F: {fRatio}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Checkpoints Timeline */}
                        <Text style={styles.timelineLabel}>Map Checkpoints ({parsedCheckpoints.length})</Text>
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
                                <Text style={styles.compileBtnText}>Publish map</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
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
    fieldRow: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.theme.softWhite,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    calendarLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginBottom: 10,
    },
    // Calendar Styling
    calendarContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calendarNavBtn: {
        padding: 6,
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 8,
    },
    calendarMonthText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    weekdayText: {
        width: 38,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 6,
    },
    dayCell: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 2,
    },
    dayCellEmpty: {
        width: 38,
        height: 38,
        marginVertical: 2,
    },
    dayCellDisabled: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        opacity: 0.25,
    },
    dayCellLogged: {
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
    },
    dayCellSelected: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    dayCellInRange: {
        backgroundColor: 'rgba(218, 165, 32, 0.2)',
        borderColor: 'rgba(218, 165, 32, 0.4)',
        borderWidth: 1,
    },
    dayText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.theme.softWhite,
    },
    dayTextDisabled: {
        color: Colors.theme.dust,
    },
    dayTextLogged: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    dayTextSelected: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
    },
    dayTextInRange: {
        color: Colors.theme.harvestGold,
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
        fontSize: 15,
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
    dashboardMacrosContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    dashboardMacrosRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    mapNameDisplay: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 20,
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerModalContent: {
        width: '80%',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 20,
        maxHeight: '60%',
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
    },
    pickerModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 16,
        textAlign: 'center',
    },
    pickerRow: {
        flexDirection: 'row',
        height: 200,
        gap: 16,
    },
    pickerCol: {
        flex: 1,
    },
    pickerItem: {
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    pickerItemSelected: {
        backgroundColor: 'rgba(218, 165, 32, 0.15)',
    },
    pickerItemText: {
        fontSize: 16,
        color: Colors.theme.dust,
    },
    pickerItemTextSelected: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    pickerDoneBtn: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        alignItems: 'center',
    },
    pickerDoneBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
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
    selectorContainer: {
        marginBottom: 24,
    },
    selectorCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectorCardActive: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    selectorCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    selectorCardLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    selectorCardLabelActive: {
        color: Colors.theme.matteBlack,
    },
    selectorCardSubtext: {
        fontSize: 13,
        color: Colors.theme.dust,
        lineHeight: 18,
    },
    selectorCardSubtextActive: {
        color: Colors.theme.matteBlack,
        opacity: 0.8,
    },
});
