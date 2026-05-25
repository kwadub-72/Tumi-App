import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';

interface CheckpointNode {
    id: string;
    sequence_index: number;
    intent_tag: string;
    is_outlier_flare: boolean;
    protein_ratio: number;
    carbs_ratio: number;
    fats_ratio: number;
    calorie_delta_pct: number;
    trigger_weight_delta_pct: number | null;
    created_at: string;
}

export default function MapPreviewScreen() {
    const { map_id } = useLocalSearchParams();
    const router = useRouter();
    
    const [checkpoints, setCheckpoints] = useState<CheckpointNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (map_id) {
            fetchCheckpoints();
        }
    }, [map_id]);

    const fetchCheckpoints = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('macro_map_checkpoints')
                .select('*')
                .eq('map_id', map_id)
                .order('sequence_index', { ascending: true });

            if (!error && data) {
                setCheckpoints(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getIntentInfo = (tag: string) => {
        if (tag === 'CUT' || tag === 'weight-down') return { text: 'Cut', icon: 'trending-down' };
        if (tag === 'BULK' || tag === 'weight-up') return { text: 'Bulk', icon: 'trending-up' };
        return { text: 'Maintain', icon: 'minus' };
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review Map</Text>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Map Checkpoints</Text>
                        <Text style={styles.listSubtitle}>Review the sequential milestones and structural trajectory of this map before subscribing.</Text>
                    </View>

                    {checkpoints.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No checkpoints found for this map.</Text>
                        </View>
                    ) : (
                        <View style={styles.timelineWrapper}>
                            {checkpoints.map((cp, index) => {
                                const intent = getIntentInfo(cp.intent_tag);
                                const calShift = Number(cp.calorie_delta_pct);
                                const isPositiveCal = calShift > 0;
                                
                                return (
                                    <View key={cp.id} style={styles.checkpointContainer}>
                                        <View style={styles.timelineColumn}>
                                            <View style={styles.timelineDot} />
                                            {index < checkpoints.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.checkpointCard}>
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.dateText}>
                                                    Milestone {cp.sequence_index}
                                                </Text>
                                                <View style={styles.intentBadge}>
                                                    <MaterialCommunityIcons 
                                                        name={intent.icon as any} 
                                                        size={14} 
                                                        color={Colors.theme.matteBlack} 
                                                    />
                                                    <Text style={styles.intentText}>{intent.text}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.metricsRow}>
                                                <View style={styles.metricItem}>
                                                    <Text style={styles.metricLabel}>Weight Shift</Text>
                                                    <Text style={[styles.metricValue, { color: Colors.theme.dust }]}>
                                                        {cp.trigger_weight_delta_pct ? `${cp.trigger_weight_delta_pct > 0 ? '+' : ''}${cp.trigger_weight_delta_pct}%` : 'N/A'}
                                                    </Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                    <Text style={styles.metricLabel}>Calorie Target Shift</Text>
                                                    <Text style={[
                                                        styles.metricValue, 
                                                        { color: isPositiveCal ? Colors.theme.oliveDrab : (calShift < 0 ? Colors.theme.burntSienna : Colors.theme.softWhite) }
                                                    ]}>
                                                        {isPositiveCal ? '+' : ''}{calShift}%
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.macroSplitRow}>
                                                <Text style={styles.macroLabel}>Macro Targets</Text>
                                                <View style={styles.macroValues}>
                                                    <Text style={styles.macroText}>P: {Math.round(Number(cp.protein_ratio) * 100)}%</Text>
                                                    <Text style={styles.dot}>•</Text>
                                                    <Text style={styles.macroText}>C: {Math.round(Number(cp.carbs_ratio) * 100)}%</Text>
                                                    <Text style={styles.dot}>•</Text>
                                                    <Text style={styles.macroText}>F: {Math.round(Number(cp.fats_ratio) * 100)}%</Text>
                                                </View>
                                            </View>

                                            {cp.is_outlier_flare && (
                                                <View style={styles.flareBox}>
                                                    <Ionicons name="warning" size={16} color={Colors.theme.burntSienna} />
                                                    <Text style={styles.flareText}>Outlier Flare Detected</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {!loading && checkpoints.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.subscribeButton}>
                        <Text style={styles.subscribeText}>Subscribe to Map</Text>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    listHeader: {
        marginBottom: 24,
    },
    listTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.theme.harvestGold,
        marginBottom: 8,
    },
    listSubtitle: {
        fontSize: 14,
        color: Colors.theme.dust,
        lineHeight: 20,
    },
    timelineWrapper: {
        paddingLeft: 10,
    },
    checkpointContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineColumn: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.theme.harvestGold,
        marginTop: 6,
        borderWidth: 3,
        borderColor: Colors.theme.matteBlack,
        zIndex: 10,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: 'rgba(218, 165, 32, 0.2)', // harvestGold low opacity
        marginTop: -6,
        marginBottom: -26,
    },
    checkpointCard: {
        flex: 1,
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
    dateText: {
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
    macroSplitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    macroLabel: {
        color: Colors.theme.dust,
        fontSize: 13,
        fontWeight: '600',
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
    dot: {
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: 14,
    },
    flareBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(223, 115, 86, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    flareText: {
        color: Colors.theme.burntSienna,
        fontSize: 13,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.theme.dust,
        fontSize: 16,
    },
    footer: {
        padding: 20,
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
    }
});
