import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, SafeAreaView, FlatList, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/shared/theme/Colors';
import { WeightStore, WeightEntry } from '../store/WeightStore';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useUserStore } from '../store/UserStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RangeType = '4W' | '12W' | '6M' | '1Y';

export default function WeightTrendsDeepDiveScreen() {
    const router = useRouter();
    const { units } = useUserStore();
    const [selectedRange, setSelectedRange] = useState<RangeType>('4W');
    const [loading, setLoading] = useState(true);
    const [weights, setWeights] = useState<WeightEntry[]>([]);

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState(14); // For 2-week lazy loading

    const loggedDates = useMemo(() => new Set(weights.map(w => w.date)), [weights]);

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

    const handleDatePress = (day: Date) => {
        const year = day.getFullYear();
        const month = String(day.getMonth() + 1).padStart(2, '0');
        const dateNum = String(day.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dateNum}`;

        if (!startDate) {
            setStartDate(dateStr);
        } else if (startDate && !endDate) {
            if (dateStr > startDate) {
                setEndDate(dateStr);
            } else {
                setStartDate(dateStr);
            }
        } else {
            setEndDate(null);
            setStartDate(dateStr);
        }
    };

    const filteredRawWeights = useMemo(() => {
        let filtered = [...weights].sort((a, b) => b.date.localeCompare(a.date)); // Descending
        if (startDate) {
            filtered = filtered.filter(w => w.date >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(w => w.date <= endDate);
        }
        return filtered;
    }, [weights, startDate, endDate]);

    const fetchWeights = useCallback(async () => {
        setLoading(true);
        try {
            const data = await WeightStore.loadWeights();
            setWeights(data || []);
        } catch (err) {
            console.error('Failed to fetch weights:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchWeights();
        }, [fetchWeights])
    );

    // Filter weights based on selection
    const getFilteredWeights = () => {
        const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length === 0) return [];
        
        const now = new Date();
        let cutoffDate = new Date();

        switch (selectedRange) {
            case '4W':
                cutoffDate.setDate(now.getDate() - 28);
                break;
            case '12W':
                cutoffDate.setDate(now.getDate() - 84);
                break;
            case '6M':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
            case '1Y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        const rawFiltered = sorted.filter(w => w.date >= cutoffStr);
        if (units === 'metric') {
            return rawFiltered.map(w => ({
                ...w,
                weight: w.weight * 0.453592
            }));
        }
        return rawFiltered;
    };

    const filtered = getFilteredWeights();

    // Grouping by range-specific buckets and calculating averages
    const getAggregatedPoints = (filteredData: WeightEntry[], range: RangeType) => {
        if (filteredData.length === 0) return [];

        const buckets: { [key: string]: number[] } = {};
        const msInDay = 24 * 60 * 60 * 1000;

        const earliestDate = new Date(filteredData[0].date + 'T00:00:00');
        const earliestTimeMs = earliestDate.getTime();

        filteredData.forEach(w => {
            const date = new Date(w.date + 'T00:00:00');
            const timeMs = date.getTime();

            const diffDays = Math.floor((timeMs - earliestTimeMs) / msInDay);
            let bucketKey = '';

            if (range === '4W' || range === '12W') {
                // 7-day buckets anchored to your first entry
                const weekIndex = Math.floor(diffDays / 7);
                const bucketDate = new Date(earliestTimeMs + weekIndex * 7 * msInDay);
                bucketKey = bucketDate.toISOString().split('T')[0];
            } else if (range === '6M') {
                // 14-day buckets anchored to your first entry
                const periodIndex = Math.floor(diffDays / 14);
                const bucketDate = new Date(earliestTimeMs + periodIndex * 14 * msInDay);
                bucketKey = bucketDate.toISOString().split('T')[0];
            } else {
                // 30-day "Monthly" buckets anchored to your first entry
                const monthIndex = Math.floor(diffDays / 30);
                const bucketDate = new Date(earliestTimeMs + monthIndex * 30 * msInDay);
                bucketKey = bucketDate.toISOString().split('T')[0];
            }

            if (!buckets[bucketKey]) {
                buckets[bucketKey] = [];
            }
            buckets[bucketKey].push(w.weight);
        });

        const sortedKeys = Object.keys(buckets).sort();
        return sortedKeys.map(k => {
            const list = buckets[k];
            const sum = list.reduce((a, b) => a + b, 0);
            const averageWeight = sum / list.length;

            const date = new Date(k + 'T00:00:00');
            let dateLabel = '';
            if (range === '4W' || range === '12W') {
                dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (range === '6M') {
                dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }

            return { dateLabel, averageWeight, rawDate: k, label: k, rawValue: averageWeight };
        });
    };

    // Line Chart drawing logic
    const chartHeight = 220;
    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 30;
    const paddingBottom = 30;
    const chartWidth = SCREEN_WIDTH - 32;

    const aggregated = getAggregatedPoints(filtered, selectedRange);

    const minWeight = aggregated.length > 0 ? Math.min(...aggregated.map(p => p.averageWeight)) - 2 : 230;
    const maxWeight = aggregated.length > 0 ? Math.max(...aggregated.map(p => p.averageWeight)) + 2 : 255;
    const weightRange = maxWeight - minWeight || 1;

    const points = aggregated.map((p, index) => {
        const x = paddingLeft + (index / (aggregated.length - 1 || 1)) * (chartWidth - paddingLeft - paddingRight);
        const y = paddingTop + (1 - (p.averageWeight - minWeight) / weightRange) * (chartHeight - paddingTop - paddingBottom);
        return { x, y, label: p.rawDate, rawValue: p.averageWeight };
    });

    const yLabels = [0, 0.25, 0.5, 0.75, 1].map(p => (maxWeight - p * weightRange).toFixed(0) + (units === 'metric' ? ' kg' : ' lbs'));

    const formatXAxisDate = (dateStr: string) => {
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}/${day}`; 
    };

    const getPathD = () => {
        if (points.length === 0) return '';
        return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Page Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weight Trends</Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                data={filteredRawWeights.slice(0, displayLimit)}
                keyExtractor={(item) => item.date}
                onEndReached={() => setDisplayLimit((prev) => prev + 14)}
                onEndReachedThreshold={0.2}
                ListHeaderComponent={
                    <View>
                        {/* Chart Header */}
                        <Text style={styles.sectionTitle}>Weekly Average Weight</Text>

                        {/* Interval Toggles */}
                        <View style={styles.toggleRow}>
                            {(['4W', '12W', '6M', '1Y'] as RangeType[]).map((range) => (
                                <TouchableOpacity
                                    key={range}
                                    style={[styles.toggleBtn, selectedRange === range && styles.toggleBtnActive]}
                                    onPress={() => setSelectedRange(range)}
                                >
                                    <Text style={[styles.toggleText, selectedRange === range && styles.toggleTextActive]}>
                                        {range}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Line Chart */}
                        <View style={styles.chartContainer}>
                            {loading ? (
                                <ActivityIndicator size="large" color={Colors.theme.harvestGold} style={{ height: chartHeight }} />
                            ) : points.length === 0 ? (
                                <View style={[styles.emptyChart, { height: chartHeight }]}>
                                    <Text style={styles.emptyText}>No weight entries found for this range.</Text>
                                </View>
                            ) : (
                                <View style={{ position: 'relative' }}>
                                    <Svg width={chartWidth} height={chartHeight}>
                                        {/* Horizontal grid lines */}
                                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                            const y = paddingTop + p * (chartHeight - paddingTop - paddingBottom);
                                            return (
                                                <React.Fragment key={i}>
                                                    <Line
                                                        x1={paddingLeft}
                                                        y1={y}
                                                        x2={chartWidth - paddingRight}
                                                        y2={y}
                                                        stroke="rgba(255, 255, 255, 0.05)"
                                                        strokeWidth={1}
                                                    />
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Chart Line Path */}
                                        <Path
                                            d={getPathD()}
                                            fill="none"
                                            stroke={Colors.theme.harvestGold}
                                            strokeWidth={2.5}
                                        />

                                        {/* Interactive Data Dots */}
                                        {points.map((p, idx) => {
                                            return (
                                                <React.Fragment key={idx}>
                                                    <Circle
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={5}
                                                        fill={Colors.theme.matteBlack}
                                                        stroke={Colors.theme.harvestGold}
                                                        strokeWidth={2}
                                                    />
                                                    <SvgText
                                                        x={p.x}
                                                        y={p.y + 18}
                                                        fontSize="10"
                                                        fill={Colors.theme.dust}
                                                        textAnchor="middle"
                                                    >
                                                        {p.rawValue.toFixed(1)}
                                                    </SvgText>
                                                    <SvgText
                                                        x={p.x}
                                                        y={chartHeight - 10}
                                                        fontSize="10"
                                                        fill={Colors.theme.dust}
                                                        textAnchor="middle"
                                                    >
                                                        {formatXAxisDate(p.label)}
                                                    </SvgText>
                                                </React.Fragment>
                                            );
                                        })}
                                    </Svg>

                                    {/* Axis Labels rendered in absolute React Native layers to guarantee layout stability */}
                                    <View style={[styles.yAxisContainer, { height: chartHeight }]}>
                                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                            const y = paddingTop + p * (chartHeight - paddingTop - paddingBottom);
                                            return (
                                                <Text key={i} style={[styles.axisLabel, { top: y - 7 }]}>
                                                    {yLabels[i]}
                                                </Text>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Raw Weight History Log Header with Calendar Trigger */}
                        <View style={styles.historyHeaderRow}>
                            <Text style={styles.sectionTitle}>Raw Weight History</Text>
                            <TouchableOpacity onPress={() => setIsCalendarOpen(true)} style={styles.calendarTriggerBtn}>
                                <Ionicons name="calendar" size={20} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                    });
                    const isFirst = index === 0;
                    const isLast = index === Math.min(filteredRawWeights.length, displayLimit) - 1;
                    return (
                        <View style={[
                            styles.historyRow,
                            {
                                backgroundColor: Colors.theme.charcoal,
                                paddingHorizontal: 16,
                                borderLeftWidth: 1,
                                borderRightWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.05)',
                            },
                            isFirst && {
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                borderTopWidth: 1,
                                paddingTop: 16,
                            },
                            isLast && {
                                borderBottomLeftRadius: 20,
                                borderBottomRightRadius: 20,
                                borderBottomWidth: 1,
                                paddingBottom: 16,
                                marginBottom: 20,
                            }
                        ]}>
                            <View style={styles.historyDateCol}>
                                <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.theme.harvestGold} style={{ marginRight: 8 }} />
                                <Text style={styles.historyDateText}>{formattedDate}</Text>
                            </View>
                            <Text style={styles.historyWeightText}>
                                {(units === 'metric' ? item.weight * 0.453592 : item.weight).toFixed(1)} {units === 'metric' ? 'kg' : 'lbs'}
                            </Text>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No logged weights found for this range.</Text>
                    </View>
                }
            />

            {/* Custom Date Range Calendar Modal */}
            <Modal visible={isCalendarOpen} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.calendarModalContainer}>
                    {/* Header */}
                    <View style={styles.calendarModalHeader}>
                        <TouchableOpacity onPress={() => setIsCalendarOpen(false)} style={styles.calendarCloseBtn}>
                            <Ionicons name="close" size={28} color={Colors.theme.softWhite} />
                        </TouchableOpacity>
                        <Text style={styles.calendarModalHeaderTitle}>Select Date Range</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.calendarModalContentScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.calendarLabel}>Select Date Range</Text>
                        
                        <View style={styles.calendarContainer}>
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn}>
                                    <Ionicons name="chevron-back" size={20} color={Colors.theme.softWhite} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsPickerModalVisible(true)}>
                                    <Text style={styles.calendarMonthText}>
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn}>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.theme.softWhite} />
                                </TouchableOpacity>
                            </View>

                            {/* Weekdays Row */}
                            <View style={styles.weekdaysRow}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                    <Text key={idx} style={styles.weekdayText}>{day}</Text>
                                ))}
                            </View>

                            {/* Days Grid */}
                            <View style={styles.daysGrid}>
                                {getDaysInMonth(currentMonth).map((day, index) => {
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

                        {/* Selection summary */}
                        <View style={styles.selectionSummaryCard}>
                            <View style={styles.selectionSummaryRow}>
                                <View style={styles.selectionSummaryBlock}>
                                    <Text style={styles.selectionSummaryLabel}>Start Date</Text>
                                    <Text style={styles.selectionSummaryValue}>
                                        {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not selected'}
                                    </Text>
                                </View>
                                <View style={styles.selectionSummaryBlock}>
                                    <Text style={styles.selectionSummaryLabel}>End Date</Text>
                                    <Text style={styles.selectionSummaryValue}>
                                        {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not selected'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Modal Action Buttons */}
                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity
                                style={styles.modalResetBtn}
                                onPress={() => {
                                    setStartDate(null);
                                    setEndDate(null);
                                    setDisplayLimit(14);
                                }}
                            >
                                <Text style={styles.modalResetBtnText}>Reset</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalApplyBtn}
                                onPress={() => setIsCalendarOpen(false)}
                            >
                                <Text style={styles.modalApplyBtnText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* Month/Year selector popup */}
                    <Modal visible={isPickerModalVisible} transparent animationType="fade">
                        <TouchableOpacity style={styles.pickerModalOverlay} activeOpacity={1} onPress={() => setIsPickerModalVisible(false)}>
                            <TouchableWithoutFeedback>
                                <View style={styles.pickerModalContent}>
                                    <Text style={styles.pickerModalTitle}>Select Month & Year</Text>
                                    <View style={styles.pickerRow}>
                                        <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
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
                                            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
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
                </SafeAreaView>
            </Modal>
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
        paddingHorizontal: 16,
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
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    toggleText: {
        color: Colors.theme.dust,
        fontWeight: 'bold',
        fontSize: 13,
    },
    toggleTextActive: {
        color: Colors.theme.matteBlack,
    },

    chartContainer: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 25,
    },
    emptyChart: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.theme.dust,
        opacity: 0.6,
        fontSize: 14,
    },
    yAxisContainer: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 45,
    },
    axisLabel: {
        position: 'absolute',
        left: 0,
        fontSize: 9,
        color: Colors.theme.dust,
        opacity: 0.8,
        fontWeight: 'bold',
        textAlign: 'right',
        width: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.theme.harvestGold,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calendarTriggerBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    emptyContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
    },
    calendarModalContainer: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    calendarModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    calendarCloseBtn: {
        padding: 5,
    },
    calendarModalHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    calendarModalContentScroll: {
        padding: 20,
        paddingBottom: 40,
    },
    calendarLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginBottom: 10,
    },
    calendarContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
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
    selectionSummaryCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectionSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    selectionSummaryBlock: {
        flex: 1,
    },
    selectionSummaryLabel: {
        fontSize: 11,
        color: Colors.theme.dust,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    selectionSummaryValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    modalResetBtn: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalResetBtnText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalApplyBtn: {
        flex: 2,
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalApplyBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
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
        marginTop: 20,
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    pickerDoneBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    historyDateCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyDateText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
    },
    historyWeightText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
