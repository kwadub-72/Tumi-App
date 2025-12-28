import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/shared/theme/Colors';
import { WeightEntry, WeightStore } from '../store/WeightStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Range = '2w' | '4w' | '3m' | '6m' | '1y' | 'all';
type ViewType = 'week' | 'month' | 'year';

export default function WeightHistoryScreen() {
    const router = useRouter();
    const [weights, setWeights] = useState<WeightEntry[]>([]);
    const [range, setRange] = useState<Range>('all');
    const [viewType, setViewType] = useState<ViewType>('week');

    const TARGET_WEIGHT = 250;

    useEffect(() => {
        const load = async () => {
            const data = await WeightStore.loadWeights();
            setWeights(data);
        };
        load();
        return WeightStore.subscribe(setWeights);
    }, []);

    // Helper to get grouping key
    const getGroupKey = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (viewType === 'week') {
            const day = d.getDay();
            d.setDate(d.getDate() - day);
            return d.toISOString().split('T')[0];
        } else if (viewType === 'month') {
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-01`;
        } else {
            return `${d.getFullYear()}-01-01`;
        }
    };

    // Calculate averages
    const groupedAverages = useMemo(() => {
        const groups: { [key: string]: number[] } = {};

        weights.forEach(w => {
            const key = getGroupKey(w.date);
            if (!groups[key]) groups[key] = [];
            groups[key].push(w.weight);
        });

        const averages = Object.keys(groups).sort().map(key => {
            const vals = groups[key];
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            return {
                key, // Sunday date, Month start, or Year start
                avg: parseFloat(avg.toFixed(1)),
                count: groups[key].length
            };
        });

        // Calculate changes
        return averages.map((item, i) => ({
            ...item,
            change: i > 0 ? parseFloat((item.avg - averages[i - 1].avg).toFixed(1)) : null
        }));
    }, [weights, viewType]);

    // Filter by range
    const filteredAverages = useMemo(() => {
        if (range === 'all') return groupedAverages;

        const now = new Date();
        let cutoff = new Date();

        if (range === '2w') cutoff.setDate(now.getDate() - 14);
        else if (range === '4w') cutoff.setDate(now.getDate() - 28);
        else if (range === '3m') cutoff.setMonth(now.getMonth() - 3);
        else if (range === '6m') cutoff.setMonth(now.getMonth() - 6);
        else if (range === '1y') cutoff.setFullYear(now.getFullYear() - 1);

        const cutoffStr = cutoff.toISOString().split('T')[0];
        return groupedAverages.filter(a => a.key >= cutoffStr);
    }, [groupedAverages, range]);

    const maxDev = useMemo(() => {
        if (filteredAverages.length === 0) return 10;
        const devs = filteredAverages.map(a => Math.abs(a.avg - TARGET_WEIGHT));
        return Math.max(10, ...devs);
    }, [filteredAverages]);

    const getYPos = (weight: number) => {
        const diff = weight - TARGET_WEIGHT;
        const percentage = 50 - (diff / maxDev) * 50;
        return Math.max(0, Math.min(100, percentage));
    };

    const getXPos = (index: number) => {
        if (filteredAverages.length <= 1) return 50;
        const total = filteredAverages.length - 1;
        return 10 + (index / total) * 80; // 10% padding on sides
    };

    const formatDisplayDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        if (viewType === 'week') return `${m}/${d}`;
        if (viewType === 'month') return `${new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short' })}`;
        return y;
    };

    const getViewLabel = () => {
        if (viewType === 'week') return 'Weekly';
        if (viewType === 'month') return 'Monthly';
        return 'Yearly';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Weight History</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.rangeSelector}>
                {(['2w', '4w', '3m', '6m', '1y', 'all'] as Range[]).map(r => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.rangePill, range === r && styles.rangePillActive]}
                        onPress={() => setRange(r)}
                    >
                        <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                            {r.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.viewSelector}>
                {(['week', 'month', 'year'] as ViewType[]).map(v => (
                    <TouchableOpacity
                        key={v}
                        style={[styles.viewTab, viewType === v && styles.viewTabActive]}
                        onPress={() => setViewType(v)}
                    >
                        <Text style={[styles.viewTabText, viewType === v && styles.viewTabTextActive]}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{getViewLabel()} Average</Text>

                    <View style={styles.chartBody}>
                        <View style={styles.chartInner}>
                            {/* Reference Lines */}
                            <View style={[styles.referenceLineContainer, { top: '25%' }]}>
                                <View style={styles.referenceLine} />
                            </View>
                            <View style={[styles.referenceLineContainer, { top: '75%' }]}>
                                <View style={styles.referenceLine} />
                            </View>

                            {/* Target Line */}
                            <View style={styles.targetLineContainer}>
                                <Text style={styles.yLabel}>{TARGET_WEIGHT} lbs</Text>
                                <View style={styles.dashedLine} />
                            </View>

                            {/* Data Points */}
                            {filteredAverages.map((item, i) => {
                                const x = getXPos(i);
                                const y = getYPos(item.avg);
                                return (
                                    <View key={item.key} style={[styles.markerContainer, { left: `${x}%`, top: `${y}%` }]}>
                                        <Text style={styles.markerLabel}>{item.avg}</Text>
                                        <Text style={styles.markerX}>✕</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.footerRow}>
                        {filteredAverages.map((item, i) => {
                            if (filteredAverages.length > 8 && i % Math.ceil(filteredAverages.length / 5) !== 0) return null;
                            const x = getXPos(i);
                            return (
                                <View key={item.key} style={[styles.dateLabelContainer, { left: `${x}%` }]}>
                                    <Text style={styles.dateLabel}>{formatDisplayDate(item.key)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>{getViewLabel()} Changes</Text>
                {filteredAverages.slice().reverse().map((item, i) => (
                    <View key={item.key} style={styles.historyRow}>
                        <View>
                            <Text style={styles.historyDate}>
                                {viewType === 'week' ? `Week of ${formatDisplayDate(item.key)}` :
                                    viewType === 'month' ? formatDisplayDate(item.key) : item.key.split('-')[0]}
                            </Text>
                            <Text style={styles.historyCount}>{item.count} check-ins</Text>
                        </View>
                        <View style={styles.historyStats}>
                            <Text style={styles.historyAvg}>{item.avg} lbs</Text>
                            {item.change !== null && (
                                <Text style={[styles.historyChange, { color: item.change <= 0 ? Colors.success : Colors.error }]}>
                                    {item.change > 0 ? '+' : ''}{item.change} lbs
                                </Text>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    rangeSelector: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginVertical: 15,
        justifyContent: 'center',
    },
    rangePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
    },
    rangePillActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    rangeText: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
    },
    rangeTextActive: {
        color: 'white',
    },
    viewSelector: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        justifyContent: 'center',
    },
    viewTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    viewTabActive: {
        borderBottomColor: Colors.primary,
    },
    viewTabText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
    },
    viewTabTextActive: {
        color: Colors.primary,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    chartCard: {
        backgroundColor: '#0a0a0a',
        borderRadius: 30,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 30,
    },
    chartTitle: {
        color: Colors.theme.olive,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    chartBody: {
        height: 200,
        marginBottom: 30,
    },
    chartInner: {
        flex: 1,
        position: 'relative',
    },
    referenceLineContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    referenceLine: {
        flex: 1,
        backgroundColor: Colors.theme.sage,
        opacity: 0.1,
    },
    targetLineContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        zIndex: 1,
    },
    yLabel: {
        color: 'white',
        fontSize: 10,
        marginBottom: 2,
    },
    dashedLine: {
        width: '100%',
        borderTopWidth: 1,
        borderColor: 'white',
        borderStyle: 'dashed',
    },
    markerContainer: {
        position: 'absolute',
        width: 60,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateX: -30 }, { translateY: -20 }],
        zIndex: 5,
    },
    markerX: {
        color: Colors.success,
        fontSize: 14,
        fontWeight: 'bold',
    },
    markerLabel: {
        color: Colors.success,
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2,
    },
    footerRow: {
        flexDirection: 'row',
        height: 20,
        position: 'relative',
    },
    dateLabelContainer: {
        position: 'absolute',
        transform: [{ translateX: -20 }], // Approximate centering
        width: 40,
        alignItems: 'center',
    },
    dateLabel: {
        color: '#666',
        fontSize: 10,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        marginLeft: 5,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#111',
    },
    historyDate: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    historyCount: {
        color: '#666',
        fontSize: 12,
    },
    historyStats: {
        alignItems: 'flex-end',
    },
    historyAvg: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    historyChange: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    }
});
