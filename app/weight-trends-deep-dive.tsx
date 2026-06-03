import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/shared/theme/Colors';
import { WeightStore, WeightEntry } from '../store/WeightStore';
import Svg, { Path, Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RangeType = '4W' | '12W' | '6M' | '1Y';

export default function WeightTrendsDeepDiveScreen() {
    const router = useRouter();
    const [selectedRange, setSelectedRange] = useState<RangeType>('4W');
    const [metric, setMetric] = useState<'avg' | 'change'>('avg');
    const [loading, setLoading] = useState(true);
    const [weights, setWeights] = useState<WeightEntry[]>([]);

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
        return sorted.filter(w => w.date >= cutoffStr);
    };

    const filtered = getFilteredWeights();

    // Grouping by week and calculating weekly changes
    const getWeeklyChanges = (filteredData: WeightEntry[]) => {
        const weeksMap: { [key: string]: number[] } = {};
        filteredData.forEach(w => {
            const date = new Date(w.date + 'T00:00:00');
            const sunday = new Date(date);
            sunday.setDate(date.getDate() - date.getDay());
            const sunStr = sunday.toISOString().split('T')[0];
            if (!weeksMap[sunStr]) {
                weeksMap[sunStr] = [];
            }
            weeksMap[sunStr].push(w.weight);
        });

        const sortedWeekKeys = Object.keys(weeksMap).sort();
        const weeklyAvgs = sortedWeekKeys.map(k => {
            const weightsList = weeksMap[k];
            const avg = weightsList.reduce((sum, val) => sum + val, 0) / weightsList.length;
            return { weekStr: k, avg };
        });

        const changes: { dateStr: string; value: number }[] = [];
        for (let i = 0; i < weeklyAvgs.length; i++) {
            if (i === 0) {
                changes.push({ dateStr: weeklyAvgs[i].weekStr, value: 0 });
            } else {
                const diff = weeklyAvgs[i].avg - weeklyAvgs[i - 1].avg;
                changes.push({ dateStr: weeklyAvgs[i].weekStr, value: Number(diff.toFixed(1)) });
            }
        }
        return changes;
    };

    // Line Chart drawing logic
    const chartHeight = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 30;
    const chartWidth = SCREEN_WIDTH - 32;

    let points: { x: number; y: number; label: string; rawValue: number }[] = [];
    let yLabels: string[] = [];

    if (metric === 'avg') {
        const minWeight = filtered.length > 0 ? Math.min(...filtered.map(w => w.weight)) - 2 : 230;
        const maxWeight = filtered.length > 0 ? Math.max(...filtered.map(w => w.weight)) + 2 : 255;
        const weightRange = maxWeight - minWeight || 1;

        points = filtered.map((w, index) => {
            const x = paddingLeft + (index / (filtered.length - 1 || 1)) * (chartWidth - paddingLeft - paddingRight);
            const y = paddingTop + (1 - (w.weight - minWeight) / weightRange) * (chartHeight - paddingTop - paddingBottom);
            return { x, y, label: w.date, rawValue: w.weight };
        });

        yLabels = [0, 0.25, 0.5, 0.75, 1].map(p => (maxWeight - p * weightRange).toFixed(0) + ' lbs');
    } else {
        const weeklyChanges = getWeeklyChanges(filtered);
        const values = weeklyChanges.map(c => c.value);
        const maxAbs = values.length > 0 ? Math.max(2, ...values.map(Math.abs)) : 5;

        points = weeklyChanges.map((c, index) => {
            const x = paddingLeft + (index / (weeklyChanges.length - 1 || 1)) * (chartWidth - paddingLeft - paddingRight);
            const y = paddingTop + (0.5 - (c.value / (2 * maxAbs))) * (chartHeight - paddingTop - paddingBottom);
            return { x, y, label: c.dateStr, rawValue: c.value };
        });

        yLabels = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map(v => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) + ' lbs');
    }

    const getPathD = () => {
        if (points.length === 0) return '';
        return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    };

    const renderMacroBlock = (letter: string, percentage: number, change: string, isPositive: boolean) => {
        return (
            <View style={styles.macroBlock}>
                <View style={styles.macroBubble}>
                    <Text style={styles.macroBubbleText}>{letter}</Text>
                </View>
                <Text style={styles.macroText} numberOfLines={1}>
                    {percentage}% <Text style={{ color: isPositive ? '#FF4B4B' : '#1BB607', fontSize: 13 }}>{change}</Text>
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weight Trends</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

                {/* Metric Segment Control with Midnight Gold Borders */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, metric === 'avg' && styles.segmentBtnActive]}
                        onPress={() => setMetric('avg')}
                    >
                        <Text style={[styles.segmentText, metric === 'avg' && styles.segmentTextActive]}>
                            Average Weight
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, metric === 'change' && styles.segmentBtnActive]}
                        onPress={() => setMetric('change')}
                    >
                        <Text style={[styles.segmentText, metric === 'change' && styles.segmentTextActive]}>
                            Weekly Change (lbs)
                        </Text>
                    </TouchableOpacity>
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

                                {/* Special Zero Baseline for Weekly Change */}
                                {metric === 'change' && (
                                    <Line
                                        x1={paddingLeft}
                                        y1={paddingTop + 0.5 * (chartHeight - paddingTop - paddingBottom)}
                                        x2={chartWidth - paddingRight}
                                        y2={paddingTop + 0.5 * (chartHeight - paddingTop - paddingBottom)}
                                        stroke="rgba(218, 165, 32, 0.25)"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Chart Line Path */}
                                <Path
                                    d={getPathD()}
                                    fill="none"
                                    stroke={Colors.theme.harvestGold}
                                    strokeWidth={2.5}
                                />

                                {/* Interactive Data Dots */}
                                {points.filter((_, idx) => {
                                    if (selectedRange === '4W') return true;
                                    if (selectedRange === '12W') return idx % 3 === 0;
                                    return idx % 7 === 0;
                                }).map((p, idx) => {
                                    let dotColor = Colors.theme.harvestGold;
                                    if (metric === 'change') {
                                        dotColor = p.rawValue < 0 ? '#1BB607' : p.rawValue > 0 ? '#FF4B4B' : Colors.theme.dust;
                                    }
                                    return (
                                        <Circle
                                            key={idx}
                                            cx={p.x}
                                            cy={p.y}
                                            r={5}
                                            fill={Colors.theme.matteBlack}
                                            stroke={dotColor}
                                            strokeWidth={2}
                                        />
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

                {/* Weekly Summary Cards Section */}
                <Text style={styles.sectionTitle}>Weekly Summaries</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                    snapToInterval={SCREEN_WIDTH - 60}
                    decelerationRate="fast"
                >
                    {/* Card 1: Calories */}
                    <View style={styles.summaryCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Calorie Intake</Text>
                            <View style={styles.intentBadge}>
                                <MaterialCommunityIcons name="fire" size={14} color={Colors.theme.matteBlack} />
                                <Text style={styles.intentText}>Avg Cals</Text>
                            </View>
                        </View>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Daily Average</Text>
                                <Text style={[styles.metricValue, { color: Colors.theme.harvestGold }]}>2,150 kcal</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Calorie Shift</Text>
                                <Text style={[styles.metricValue, { color: '#FF4B4B' }]}>-7.5%</Text>
                            </View>
                        </View>
                        <View style={styles.macroContainer}>
                            <Text style={styles.macroLabel}>Avg Calorie Breakdown</Text>
                            <View style={styles.macroValues}>
                                {renderMacroBlock('P', 35, '(+3%)', true)}
                                {renderMacroBlock('C', 45, '(-2%)', false)}
                                {renderMacroBlock('F', 20, '(-1%)', false)}
                            </View>
                        </View>
                    </View>

                    {/* Card 2: Protein */}
                    <View style={styles.summaryCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Protein Targets</Text>
                            <View style={styles.intentBadge}>
                                <MaterialCommunityIcons name="food-drumstick" size={14} color={Colors.theme.matteBlack} />
                                <Text style={styles.intentText}>High Pro</Text>
                            </View>
                        </View>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Daily Average</Text>
                                <Text style={[styles.metricValue, { color: Colors.theme.harvestGold }]}>188 g</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Protein Shift</Text>
                                <Text style={[styles.metricValue, { color: '#1BB607' }]}>+4.2%</Text>
                            </View>
                        </View>
                        <View style={styles.macroContainer}>
                            <Text style={styles.macroLabel}>Avg Calorie Breakdown</Text>
                            <View style={styles.macroValues}>
                                {renderMacroBlock('P', 38, '(+5%)', true)}
                                {renderMacroBlock('C', 42, '(-3%)', false)}
                                {renderMacroBlock('F', 20, '(-2%)', false)}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Raw Weight History Log */}
                <Text style={styles.sectionTitle}>Raw Weight History</Text>
                <View style={styles.historyContainer}>
                    {weights.length === 0 ? (
                        <Text style={styles.emptyText}>No logged weights yet.</Text>
                    ) : (
                        [...weights]
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((item, idx) => {
                                const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                });
                                return (
                                    <View key={idx} style={styles.historyRow}>
                                        <View style={styles.historyDateCol}>
                                            <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.theme.harvestGold} style={{ marginRight: 8 }} />
                                            <Text style={styles.historyDateText}>{formattedDate}</Text>
                                        </View>
                                        <Text style={styles.historyWeightText}>{item.weight.toFixed(1)} lbs</Text>
                                    </View>
                                );
                            })
                    )}
                </View>
            </ScrollView>
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
    segmentedControl: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    segmentBtnActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    segmentText: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        fontSize: 13,
    },
    segmentTextActive: {
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
    horizontalScroll: {
        paddingRight: 32,
        gap: 16,
        marginBottom: 25,
    },
    summaryCard: {
        width: SCREEN_WIDTH - 60,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    intentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.harvestGold,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    intentText: {
        color: Colors.theme.matteBlack,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    metricItem: {
        flex: 1,
    },
    metricLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    macroContainer: {
        marginBottom: 8,
    },
    macroLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 8,
    },
    macroValues: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    macroBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    macroBubble: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.theme.harvestGold,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    macroBubbleText: {
        color: Colors.theme.matteBlack,
        fontSize: 10,
        fontWeight: 'bold',
    },
    macroText: {
        color: Colors.theme.softWhite,
        fontSize: 13,
        fontWeight: 'bold',
        flexShrink: 1,
    },
    historyContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
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
