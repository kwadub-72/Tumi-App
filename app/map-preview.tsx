import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';

import { useOnboardingStore } from '@/store/useOnboardingStore';

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

export default function MapPreviewScreen(props: { isOnboarding?: boolean }) {
    const params = useLocalSearchParams();
    const map_id = params.map_id;
    const isOnboarding = props.isOnboarding || params.isOnboarding === 'true';
    const router = useRouter();
    const { selectedMapIds, setSelectedMapIds } = useOnboardingStore();
    
    const [checkpoints, setCheckpoints] = useState<CheckpointNode[]>([]);
    const [mapData, setMapData] = useState<{ engine_type: string; is_live: boolean } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (map_id) {
            fetchData();
        }
    }, [map_id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [checkpointsRes, mapRes] = await Promise.all([
                supabase
                    .from('macro_map_checkpoints')
                    .select('*')
                    .eq('map_id', map_id)
                    .order('sequence_index', { ascending: true }),
                supabase
                    .from('macro_maps')
                    .select('engine_type, is_live')
                    .eq('id', map_id)
                    .single()
            ]);

            if (!checkpointsRes.error && checkpointsRes.data) {
                setCheckpoints(checkpointsRes.data);
            }
            if (!mapRes.error && mapRes.data) {
                setMapData(mapRes.data as any);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = () => {
        if (isOnboarding) {
            if (map_id && typeof map_id === 'string') {
                const currentIds = selectedMapIds || [];
                if (!currentIds.includes(map_id)) {
                    setSelectedMapIds([...currentIds, map_id]);
                }
            }
            router.back();
        } else {
            Alert.alert("Subscription", "You have successfully subscribed to this map!");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review Map</Text>
                {isOnboarding ? (
                    <TouchableOpacity onPress={() => router.push('/onboarding/tribe')}>
                        <Text style={{ color: Colors.theme.harvestGold, fontSize: 16, fontWeight: 'bold' }}>Skip for now</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 28 }} />
                )}
            </View>

            {mapData?.engine_type === 'LIVE' && (
                <View style={[
                    styles.broadcastBanner, 
                    { backgroundColor: mapData.is_live ? Colors.theme.naturalGreen : Colors.theme.burntSienna }
                ]}>
                    <Text style={styles.broadcastBannerText}>
                        {mapData.is_live ? 'Map Stream Live' : 'Stream Concluded'}
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Map Checkpoints</Text>
                        <Text style={styles.listSubtitle}>Review the map checkpoints and updates before subscribing.</Text>
                    </View>

                    {checkpoints.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No checkpoints found for this map.</Text>
                        </View>
                    ) : (
                        <View style={styles.timelineWrapper}>
                            {checkpoints.map((cp, index) => {
                                const calShift = Number(cp.calorie_delta_pct) * 100;
                                const isPositiveCal = calShift > 0;
                                const prevCp = index > 0 ? checkpoints[index - 1] : undefined;

                                const renderMacroBlock = (letter: string, currentRatio: number, prevRatio?: number) => {
                                    const val = Math.round(Number(currentRatio) * 100);
                                    const prevVal = prevRatio !== undefined ? Math.round(Number(prevRatio) * 100) : null;
                                    let diff = prevVal !== null ? val - prevVal : 0;
                                    
                                    let deltaText = '(-)';
                                    let deltaColor = Colors.theme.dust;
                                    
                                    if (prevVal !== null && diff > 0) {
                                        deltaText = `(+${diff})`;
                                        deltaColor = Colors.theme.oliveDrab;
                                    } else if (prevVal !== null && diff < 0) {
                                        deltaText = `(${diff})`;
                                        deltaColor = Colors.theme.burntSienna;
                                    }

                                    return (
                                        <View style={styles.macroBlock}>
                                            <View style={styles.macroBubble}>
                                                <Text style={styles.macroBubbleText}>{letter}</Text>
                                            </View>
                                            <Text 
                                                style={styles.macroText} 
                                                numberOfLines={1} 
                                                adjustsFontSizeToFit
                                            >
                                                {val}% <Text style={{ color: deltaColor, fontSize: 13 }}>{deltaText}</Text>
                                            </Text>
                                        </View>
                                    );
                                };
                                
                                return (
                                    <View key={cp.id} style={styles.checkpointContainer}>
                                        <View style={styles.timelineColumn}>
                                            <View style={styles.timelineDot} />
                                            {index < checkpoints.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.checkpointCard}>
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.dateText}>
                                                    {cp.sequence_index === 0 ? "Starting point" : `Checkpoint #${cp.sequence_index}`}
                                                </Text>
                                            </View>

                                            <View style={styles.metricsRow}>
                                                <View style={styles.metricItem}>
                                                    <Text style={styles.metricLabel}>Weight Trigger</Text>
                                                    <Text style={[styles.metricValue, { color: Colors.theme.dust }]}>
                                                        {cp.trigger_weight_delta_pct !== null ? `${cp.trigger_weight_delta_pct > 0 ? '+' : ''}${(Number(cp.trigger_weight_delta_pct) * 100).toFixed(1)}%` : 'N/A'}
                                                    </Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                    <Text style={styles.metricLabel}>Calorie Update</Text>
                                                    <Text style={[
                                                        styles.metricValue, 
                                                        { color: isPositiveCal ? Colors.theme.oliveDrab : (calShift < 0 ? Colors.theme.burntSienna : Colors.theme.softWhite) }
                                                    ]}>
                                                        {isPositiveCal ? '+' : ''}{calShift.toFixed(2)}%
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.macroContainer}>
                                                <Text style={styles.macroLabel}>Calorie Breakdown</Text>
                                                <View style={styles.macroValues}>
                                                    {renderMacroBlock('P', cp.protein_ratio, prevCp?.protein_ratio)}
                                                    {renderMacroBlock('C', cp.carbs_ratio, prevCp?.carbs_ratio)}
                                                    {renderMacroBlock('F', cp.fats_ratio, prevCp?.fats_ratio)}
                                                </View>
                                            </View>

                                            {cp.is_outlier_flare && (
                                                <Pressable 
                                                    style={styles.flareBox}
                                                    onPress={() => Alert.alert("Caution: Creator Flagged", "Creator flagged this update as an outlier or accidental. We suggest to skip it.")}
                                                >
                                                    <Ionicons name="warning" size={16} color={Colors.theme.burntSienna} />
                                                    <Text style={styles.flareText}>Caution: Creator Flagged</Text>
                                                </Pressable>
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
                    <TouchableOpacity 
                        style={styles.subscribeButton}
                        onPress={handleSubscribe}
                    >
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
    broadcastBanner: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    broadcastBannerText: {
        color: Colors.theme.softWhite,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    }
});
