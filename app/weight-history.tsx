import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/shared/theme/Colors';
import { WeeklyMetric, WeeklyMetricsStore } from '../store/WeeklyMetricsStore';
import { CalendarModal } from '../src/features/feed/components/CalendarModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const CARD_MARGIN = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const CHART_PADDING_LEFT = 40; // Space for Y-axis
const CHART_PADDING_RIGHT = 30; // Increased padding for alignment
const CHART_PADDING_TOP = 30;
const CHART_PADDING_BOTTOM = 30;
const CHART_DRAW_WIDTH = CARD_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
const CHART_HEIGHT = 200;

type Range = '4W' | '3M' | '6M' | '1Y' | 'ALL';
const RANGES: Range[] = ['4W', '3M', '6M', '1Y', 'ALL'];

export default function WeightTrendsScreen() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<WeeklyMetric[]>([]);
    const [range, setRange] = useState<Range>('4W');
    const flatListRef = useRef<FlatList>(null);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    // ──────────────────────────────────────────────────────────────────────────
    // Swipe Logic for Ranges (Natural ScrollView)
    // ──────────────────────────────────────────────────────────────────────────
    const onScroll = (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / CARD_WIDTH);
        if (RANGES[index] && RANGES[index] !== range) {
            setRange(RANGES[index]);
        }
    };

    useEffect(() => {
        const load = async () => {
            const data = await WeeklyMetricsStore.loadMetrics();
            setMetrics(data);
        };
        load();
        return WeeklyMetricsStore.subscribe(setMetrics);
    }, []);

    // ──────────────────────────────────────────────────────────────────────────
    // Data Filtering Logic
    // ──────────────────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        if (metrics.length === 0) return [];
        const sorted = [...metrics].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));

        if (range === '4W') {
            return sorted.slice(-4);
        }

        if (range === '3M') {
            const subset = sorted.slice(-12);
            return subset.filter((_, i) => i % 2 === 0).slice(-6);
        }

        if (range === '6M') {
            const result: WeeklyMetric[] = [];
            const monthsSeen = new Set<string>();
            for (let i = sorted.length - 1; i >= 0 && result.length < 6; i--) {
                const date = new Date(sorted[i].weekStartDate);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (!monthsSeen.has(monthKey)) {
                    result.unshift(sorted[i]);
                    monthsSeen.add(monthKey);
                }
            }
            return result;
        }

        if (range === '1Y') {
            const result: WeeklyMetric[] = [];
            const monthsSeen = new Set<string>();
            let skipMonth = false;

            for (let i = sorted.length - 1; i >= 0 && result.length < 6; i--) {
                const date = new Date(sorted[i].weekStartDate);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (!monthsSeen.has(monthKey)) {
                    monthsSeen.add(monthKey);
                    if (!skipMonth) {
                        result.unshift(sorted[i]);
                        skipMonth = true;
                    } else {
                        skipMonth = false;
                    }
                }
            }
            return result;
        }

        if (sorted.length <= 6) return sorted;
        const result: WeeklyMetric[] = [];
        const step = (sorted.length - 1) / 5;
        for (let i = 0; i < 6; i++) {
            result.push(sorted[Math.round(i * step)]);
        }
        return result;
    }, [metrics, range]);

    // ──────────────────────────────────────────────────────────────────────────
    // Chart Calculations
    // ──────────────────────────────────────────────────────────────────────────
    const { minY, maxY, yLabels } = useMemo(() => {
        if (chartData.length === 0) return { minY: 225, maxY: 245, yLabels: [225, 235, 240] };
        const values = chartData.map(d => d.averageWeight);
        const actualMin = Math.min(...values);
        const actualMax = Math.max(...values);
        
        // Determine labels
        let lo = Math.floor(actualMin / 5) * 5 - 5;
        let hi = Math.ceil(actualMax / 5) * 5 + 5;
        if (hi - lo < 20) hi = lo + 20;
        const mid = lo + (hi - lo) / 2;
        const labels = [lo, Math.round(mid), hi];

        return { minY: lo, maxY: hi, yLabels: labels };
    }, [chartData]);

    const getY = (weight: number) => {
        const pct = (weight - minY) / (maxY - minY);
        return CHART_HEIGHT - (pct * CHART_HEIGHT);
    };

    const getX = (index: number) => {
        if (chartData.length <= 1) return (CHART_DRAW_WIDTH - 20) / 2;
        return (index / (chartData.length - 1)) * (CHART_DRAW_WIDTH - 20);
    };

    const formatDate = (dateStr: string) => {
        // Use YYYY, MM, DD to avoid timezone shifts
        const [y, m, d] = dateStr.split('-').map(Number);
        return `${m}/${d}`;
    };

    const scrollToMetric = (dateStr: string) => {
        const allSorted = [...metrics].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
        const listIndex = allSorted.findIndex(m => m.weekStartDate === dateStr);
        if (listIndex !== -1) {
            flatListRef.current?.scrollToIndex({ index: listIndex, animated: true, viewPosition: 0 });
        }
    };

    const handleDotPress = (index: number) => {
        const metric = chartData[index];
        scrollToMetric(metric.weekStartDate);
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Render Helpers
    // ──────────────────────────────────────────────────────────────────────────
    const renderMetricPill = ({ item }: { item: WeeklyMetric }) => {
        const [y, m, d] = item.weekStartDate.split('-').map(Number);
        const displayDate = `Week of ${m}/${d}`;
        
        return (
            <View style={styles.metricPill}>
                <View style={styles.metricPillHeader}>
                    <Text style={styles.metricPillHeaderText}>{displayDate} · {item.entryCount} entries</Text>
                </View>
                <View style={styles.metricPillBody}>
                    <Text style={styles.metricWeightText}>{item.averageWeight.toFixed(1)} lbs</Text>
                    <View style={styles.metricStatsRow}>
                        <View style={styles.metricStat}>
                            <MaterialCommunityIcons name="fire" size={14} color="#4F6352" />
                            <Text style={styles.metricStatText}>{Math.round(item.averageCalories)} cals</Text>
                        </View>
                        <View style={styles.metricStat}>
                            <MaterialCommunityIcons name="food-drumstick" size={14} color="#4F6352" />
                            <Text style={styles.metricStatText}>{Math.round(item.averageProtein)}g</Text>
                        </View>
                        <View style={styles.metricStat}>
                            <MaterialCommunityIcons name="leaf" size={14} color="#4F6352" />
                            <Text style={styles.metricStatText}>{Math.round(item.averageCarbs)}g</Text>
                        </View>
                        <View style={styles.metricStat}>
                            <Ionicons name="water-outline" size={14} color="#4F6352" />
                            <Text style={styles.metricStatText}>{Math.round(item.averageFat)}g</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const sortedMetricsForList = useMemo(() => 
        [...metrics].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
    , [metrics]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#4F6352" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weight trends</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.rangeContainer}>
                {RANGES.map(r => (
                    <TouchableOpacity
                        key={r}
                        onPress={() => setRange(r)}
                        style={[styles.rangePill, range === r && styles.rangePillActive]}
                    >
                        <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.chartCard}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScroll}
                    scrollEventThrottle={16}
                >
                    {RANGES.map((r) => (
                        <View key={r} style={{ width: CARD_WIDTH - 24 }}> 
                            <View style={styles.chartViewport}>
                                <View style={styles.yAxis}>
                                    {yLabels.map((label, idx) => (
                                        <View key={idx} style={[styles.gridRow, { top: getY(label) }]}>
                                            <View style={styles.gridLine} />
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.plotArea}>
                                    {chartData.map((d, i) => {
                                        const x = getX(i);
                                        const y = getY(d.averageWeight);
                                        
                                        return (
                                            <React.Fragment key={i}>
                                                {i < chartData.length - 1 && (() => {
                                                    const p1 = { x, y };
                                                    const p2 = { x: getX(i + 1), y: getY(chartData[i + 1].averageWeight) };
                                                    const dx = p2.x - p1.x;
                                                    const dy = p2.y - p1.y;
                                                    const length = Math.sqrt(dx * dx + dy * dy);
                                                    const angle = Math.atan2(dy, dx);
                                                    
                                                    return (
                                                        <View key={`line-${i}`} style={[
                                                            styles.chartLine,
                                                            {
                                                                width: length,
                                                                left: (p1.x + p2.x) / 2 - length / 2,
                                                                top: (p1.y + p2.y) / 2,
                                                                transform: [{ rotate: `${angle}rad` }],
                                                            }
                                                        ]} />
                                                    );
                                                })()}
                                                
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => handleDotPress(i)}
                                                    hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
                                                    style={[styles.chartDot, { left: x - 4, top: y - 4, zIndex: 100 }]}
                                                />

                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => handleDotPress(i)}
                                                    style={{ position: 'absolute', left: x - 20, top: y - 22, zIndex: 100 }}
                                                >
                                                    <Text style={styles.dotValue}>{d.averageWeight.toFixed(1)}</Text>
                                                </TouchableOpacity>

                                                <Text style={[styles.xAxisLabel, { left: x - 20 }]}>
                                                    {formatDate(d.weekStartDate)}
                                                </Text>
                                            </React.Fragment>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Weekly weights & macros</Text>
                <TouchableOpacity onPress={() => setIsCalendarVisible(true)}>
                    <Ionicons name="calendar-outline" size={24} color="#4F6352" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={sortedMetricsForList}
                renderItem={renderMetricPill}
                keyExtractor={item => item.weekStartDate}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                getItemLayout={(data, index) => (
                    {length: 80, offset: 80 * index, index}
                )}
            />

            <CalendarModal
                visible={isCalendarVisible}
                onClose={() => setIsCalendarVisible(false)}
                onSelectDate={(date) => {
                    const d = new Date(date);
                    d.setHours(12,0,0,0);
                    d.setDate(d.getDate() - d.getDay());
                    const sunStr = d.toISOString().split('T')[0];
                    scrollToMetric(sunStr);
                    setIsCalendarVisible(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EFF0E1',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4F6352',
    },
    rangeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginVertical: 16,
    },
    rangePill: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    rangePillActive: {
        backgroundColor: '#2D4734',
    },
    rangeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#A9BAA2',
    },
    rangeTextActive: {
        color: '#FFFFFF',
    },
    chartCard: {
        backgroundColor: '#EFF0E1',
        borderRadius: 30,
        marginHorizontal: 16,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#A9BAA2',
        height: 280,
    },
    chartViewport: {
        flex: 1,
        position: 'relative',
        paddingTop: 15, // Shift chart downwards for centering
    },
    yAxis: {
        position: 'absolute',
        left: 0,
        top: 15, // Match viewport padding
        bottom: CHART_PADDING_BOTTOM,
        width: '100%',
    },
    gridRow: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        left: 5, // Offset to remove edge ticks
        right: 5,
    },
    yAxisLabel: {
        width: CHART_PADDING_LEFT - 5,
        fontSize: 11,
        color: '#A9BAA2',
        textAlign: 'left',
    },
    gridLine: {
        flex: 1,
        height: 1.5,
        backgroundColor: '#A9BAA2',
        opacity: 0.3,
    },
    plotArea: {
        position: 'absolute',
        left: CHART_PADDING_LEFT,
        top: 15, // Match viewport padding
        width: CHART_DRAW_WIDTH - 20,
        height: CHART_HEIGHT,
    },
    chartLine: {
        position: 'absolute',
        height: 1.5,
        backgroundColor: '#4F6352',
        opacity: 0.4,
    },
    chartDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#4F6352',
        backgroundColor: '#EFF0E1',
    },
    dotValue: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4F6352',
        width: 40,
        textAlign: 'center',
    },
    xAxisLabel: {
        position: 'absolute',
        bottom: -22,
        fontSize: 11,
        fontWeight: '600',
        color: '#4F6352',
        opacity: 0.6,
        width: 40,
        textAlign: 'center',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4F6352',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    metricPill: {
        backgroundColor: '#A9BAA2',
        borderRadius: 25,
        marginBottom: 12,
        paddingTop: 6,
        paddingBottom: 2,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#4F6352',
        height: 68,
    },
    metricPillHeader: {
        alignItems: 'center',
        marginBottom: 2, // Reduced margin
    },
    metricPillHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        fontStyle: 'italic',
        color: '#4F6352',
        opacity: 0.8,
    },
    metricPillBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricWeightText: {
        fontSize: 18, // Slightly smaller to fit tighter
        fontWeight: '800',
        color: '#FFFFFF',
    },
    metricStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metricStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    metricStatText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
