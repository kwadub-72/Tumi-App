import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';

import { useOnboardingStore } from '@/store/useOnboardingStore';
import { MapComposerSheet } from '@/src/features/macromaps/components/MapComposerSheet';
import { useSubscribeToLiveMap } from '@/src/features/macromaps/hooks/useSubscribeToLiveMap';
import { useAuthStore } from '@/store/AuthStore';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { useMapStore } from '@/src/features/macromaps/store/useMapStore';

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
    const [mapData, setMapData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isComposerVisible, setIsComposerVisible] = useState(false);
    const [caption, setCaption] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSavedMap, setIsSavedMap] = useState(false);
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [isUnsubscribedModalVisible, setIsUnsubscribedModalVisible] = useState(false);

    const { mutateAsync: subscribeToLiveMap } = useSubscribeToLiveMap();
    const { profile, session } = useAuthStore();
    const {
        fetchMapProgress,
        activeMapProgress,
        jumpToCheckpoint,
        markCheckpointComplete
    } = useMapStore();

    const activeCheckpointId = activeMapProgress?.current_checkpoint_id || (checkpoints.length > 0 ? checkpoints[0].id : null);
    const completed = activeMapProgress?.completed_checkpoint_ids || [];

    const activeCheckpointIndex = checkpoints.findIndex(cp => cp.id === activeCheckpointId);
    const currentIndex = activeCheckpointIndex !== -1 ? activeCheckpointIndex : 0;
    const nextCheckpoint = currentIndex + 1 < checkpoints.length ? checkpoints[currentIndex + 1] : null;

    const handleSkip = () => {
        if (nextCheckpoint && map_id) {
            jumpToCheckpoint(map_id as string, nextCheckpoint.id);
        }
    };

    const handleComplete = () => {
        if (activeCheckpointId && map_id) {
            markCheckpointComplete(map_id as string, activeCheckpointId);
        }
    };

    const fetchData = useCallback(async () => {
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
                    .select(`
                        id, creator_id, name, engine_type, is_live, goal_type, total_duration_weeks, generation_type,
                        creator_status_snapshot, creator_activity_snapshot, creator_activity_icon_snapshot,
                        profiles (
                            name,
                            handle,
                            status,
                            activity_icon,
                            activity,
                            avatar_url
                        )
                    `)
                    .eq('id', map_id)
                    .single()
            ]);

            if (!checkpointsRes.error && checkpointsRes.data) {
                setCheckpoints(checkpointsRes.data);
            }
            if (!mapRes.error && mapRes.data) {
                setMapData(mapRes.data as any);
            }

            if (session?.user?.id && map_id) {
                const { data: subData } = await supabase
                    .from('macro_map_subscriptions')
                    .select('id, status')
                    .eq('user_id', session.user.id)
                    .eq('map_id', map_id)
                    .eq('status', 'ACTIVE')
                    .maybeSingle();

                if (subData) {
                    setIsSubscribed(true);
                } else {
                    setIsSubscribed(false);
                }

                const { data: savedData } = await supabase
                    .from('saved_macro_maps')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .eq('map_id', map_id)
                    .maybeSingle();

                setIsSavedMap(!!savedData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [map_id, session?.user?.id]);

    useEffect(() => {
        if (map_id) {
            fetchData();
            fetchMapProgress(map_id as string);
        }
    }, [map_id, session?.user?.id, fetchMapProgress, fetchData]);

    const handleSubscribe = async () => {
        if (isOnboarding) {
            if (map_id && typeof map_id === 'string') {
                const currentIds = selectedMapIds || [];
                if (!currentIds.includes(map_id)) {
                    setSelectedMapIds([...currentIds, map_id]);
                }
            }
            router.back();
        } else {
            if (!session?.user?.id || !profile) {
                Alert.alert("Authentication Required", "Please log in to subscribe to maps.");
                return;
            }

            try {
                const subscriberTargetCals = profile.macro_targets?.calories || 2000;
                await subscribeToLiveMap({
                    subscriberId: session.user.id,
                    creatorId: mapData?.creator_id,
                    mapId: map_id as string,
                    subscriberTargetCals: subscriberTargetCals
                });

                setIsSubscribed(true);
                setIsShareModalVisible(true);
            } catch (err: any) {
                Alert.alert("Subscription Failed", err.message || "An error occurred during subscription.");
            }
        }
    };

    const handleUnsubscribe = async () => {
        if (!session?.user?.id || !map_id) return;
        try {
            const { error } = await supabase
                .from('macro_map_subscriptions')
                .update({ status: 'PAUSED' })
                .eq('user_id', session.user.id)
                .eq('map_id', map_id);

            if (error) throw error;

            setIsSubscribed(false);
            setIsUnsubscribedModalVisible(true);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to unsubscribe.");
        }
    };

    const handleSaveMap = async () => {
        if (!session?.user?.id || !map_id) return;
        try {
            const newSavedState = await SupabasePostService.toggleSaveMap(session.user.id, map_id as string);
            setIsSavedMap(newSavedState);
            Alert.alert("Success", newSavedState ? "Map saved to your Map Book!" : "Map removed from your Map Book.");
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to save map.");
        }
    };

    const handlePostMap = async () => {
        if (!session?.user?.id || !map_id) return;
        try {
            const mapPayload = {
                macroMap: {
                    id: map_id,
                    name: mapData?.name || 'Map Journey',
                    mapType: mapData?.goal_type || 'MAINTENANCE',
                    durationWeeks: mapData?.total_duration_weeks || 0,
                    avgMacroShiftPct: mapData?.global_calorie_shift_pct !== undefined 
                        ? mapData.global_calorie_shift_pct 
                        : (mapData?.avgMacroShiftPct || 0),
                    isLive: mapData?.is_live || false,
                    creator_id: mapData?.creator_id,
                    creator_status_snapshot: mapData?.creator_status_snapshot,
                    creator_activity_snapshot: mapData?.creator_activity_snapshot,
                    creator_activity_icon_snapshot: mapData?.creator_activity_icon_snapshot,
                    checkpoints: checkpoints,
                    profiles: mapData?.profiles ? (Array.isArray(mapData.profiles) ? mapData.profiles : [mapData.profiles]) : []
                }
            };
            
            await SupabasePostService.addMapPost(
                session.user.id,
                map_id as string,
                'map_subscribe',
                caption,
                mapPayload
            );
            setCaption('');
            router.push('/(tabs)');
        } catch (err: any) {
            Alert.alert("Post Failed", err.message || "Could not publish your post.");
            throw err;
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
                ) : isSubscribed ? (
                    <TouchableOpacity onPress={handleUnsubscribe}>
                        <Text style={styles.unsubscribeHeaderBtn}>Unsubscribe</Text>
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

                                const isCompleted = completed.includes(cp.id);
                                const isActive = cp.id === activeCheckpointId;
                                const isFuture = !isCompleted && !isActive;

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
                                            {isSubscribed ? (
                                                <TouchableOpacity
                                                    onPress={() => jumpToCheckpoint(map_id as string, cp.id)}
                                                    style={[
                                                        styles.timelineStepCircle,
                                                        isActive && styles.timelineStepActive,
                                                        isCompleted && styles.timelineStepCompleted,
                                                        isFuture && styles.timelineStepFuture,
                                                    ]}
                                                >
                                                    {isCompleted ? (
                                                        <View style={styles.checkmarkBackdrop}>
                                                            <Ionicons name="checkmark" size={10} color={Colors.theme.matteBlack} />
                                                        </View>
                                                    ) : (
                                                        <Text style={[
                                                            styles.timelineStepText,
                                                            isActive && styles.timelineStepTextActive,
                                                            isFuture && styles.timelineStepTextFuture,
                                                        ]}>
                                                            {cp.sequence_index}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={[styles.timelineStepCircle, styles.timelineStepFuture]}>
                                                    <Text style={[styles.timelineStepText, styles.timelineStepTextFuture]}>
                                                        {cp.sequence_index}
                                                    </Text>
                                                </View>
                                            )}
                                            {index < checkpoints.length - 1 && (
                                                <View style={[
                                                    styles.timelineLine,
                                                    isSubscribed && isCompleted ? styles.timelineLineCompleted : styles.timelineLineFuture
                                                ]} />
                                            )}
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
                    {isSubscribed ? (
                        <View style={styles.navFooter}>
                            <TouchableOpacity
                                style={[
                                    styles.footerButton, 
                                    styles.skipButton, 
                                    !nextCheckpoint && styles.skipButtonDisabled
                                ]}
                                onPress={handleSkip}
                                disabled={!nextCheckpoint}
                            >
                                <Text style={[
                                    styles.skipButtonText, 
                                    !nextCheckpoint && styles.skipButtonTextDisabled
                                ]}>
                                    Skip / Jump
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.footerButton, styles.completeButton]}
                                onPress={handleComplete}
                            >
                                <Text style={styles.completeButtonText}>
                                    {!nextCheckpoint ? 'Complete & Finish' : 'Complete & Continue'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.subscribeButton}
                            onPress={handleSubscribe}
                        >
                            <Text style={styles.subscribeText}>Subscribe to Map</Text>
                        </TouchableOpacity>
                    )}

                    {!isOnboarding && (
                        <TouchableOpacity onPress={handleSaveMap} style={styles.saveMapBtn}>
                            <Text style={styles.saveMapBtnText}>{isSavedMap ? 'Remove from Map book' : 'Save to Map book'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <Modal
                transparent
                visible={isShareModalVisible}
                animationType="fade"
                onRequestClose={() => setIsShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Subscription Active</Text>
                        <Text style={styles.modalBody}>Share this map to your feeds?</Text>
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity 
                                style={styles.modalCancelBtn}
                                onPress={async () => {
                                    setIsShareModalVisible(false);
                                    if (session?.user?.id && map_id) {
                                        try {
                                            const mapPayload = {
                                                macroMap: {
                                                    id: map_id,
                                                    name: mapData?.name || 'Map Journey',
                                                    mapType: mapData?.goal_type || 'MAINTENANCE',
                                                    durationWeeks: mapData?.total_duration_weeks || 0,
                                                    avgMacroShiftPct: mapData?.global_calorie_shift_pct !== undefined 
                                                        ? mapData.global_calorie_shift_pct 
                                                        : (mapData?.avgMacroShiftPct || 0),
                                                    isLive: mapData?.is_live || false,
                                                    creator_id: mapData?.creator_id,
                                                    creator_status_snapshot: mapData?.creator_status_snapshot,
                                                    creator_activity_snapshot: mapData?.creator_activity_snapshot,
                                                    creator_activity_icon_snapshot: mapData?.creator_activity_icon_snapshot,
                                                    engine_type: mapData?.engine_type,
                                                    generation_type: mapData?.generation_type,
                                                    checkpoints: checkpoints,
                                                    profiles: mapData?.profiles ? (Array.isArray(mapData.profiles) ? mapData.profiles : [mapData.profiles]) : []
                                                }
                                            };
                                            await SupabasePostService.addMapPost(
                                                session.user.id,
                                                map_id as string,
                                                'map_silent',
                                                '',
                                                mapPayload
                                            );
                                        } catch (e) {
                                            console.error('[MapPreviewScreen] Silent post failed:', e);
                                        }
                                    }
                                    router.push('/(tabs)/profile');
                                }}
                            >
                                <Text style={styles.modalCancelBtnText}>No, keep it private</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.modalConfirmBtn}
                                onPress={() => {
                                    setIsShareModalVisible(false);
                                    setIsComposerVisible(true);
                                }}
                            >
                                <Text style={styles.modalConfirmBtnText}>Yes, share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isUnsubscribedModalVisible}
                animationType="fade"
                onRequestClose={() => setIsUnsubscribedModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Unsubscribed</Text>
                        <Text style={styles.modalBody}>You have successfully unsubscribed from this map.</Text>
                        <TouchableOpacity 
                            style={styles.unsubscribeDismissBtn}
                            onPress={() => setIsUnsubscribedModalVisible(false)}
                        >
                            <Text style={styles.unsubscribeDismissBtnText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <MapComposerSheet
                visible={isComposerVisible}
                onClose={() => setIsComposerVisible(false)}
                mapData={mapData}
                postType="map_subscribe"
                caption={caption}
                setCaption={setCaption}
                onSubmit={handlePostMap}
            />
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
        width: 34,
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    timelineStepCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        marginTop: 6,
    },
    timelineStepActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    timelineStepCompleted: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1.5,
        borderColor: 'rgba(218, 165, 32, 0.3)',
    },
    timelineStepFuture: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    checkmarkBackdrop: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.theme.harvestGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineStepText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    timelineStepTextActive: {
        color: Colors.theme.matteBlack,
    },
    timelineStepTextFuture: {
        color: Colors.theme.dust,
        opacity: 0.5,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
        marginBottom: -26,
    },
    timelineLineCompleted: {
        backgroundColor: Colors.theme.harvestGold,
    },
    timelineLineFuture: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
        paddingBottom: 20,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalBody: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalCancelBtnText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
    },
    modalConfirmBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 14,
        fontWeight: 'bold',
    },
    unsubscribeDismissBtn: {
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 24,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    unsubscribeDismissBtnText: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 15,
    },
    navFooter: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipButton: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
    },
    skipButtonDisabled: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    skipButtonText: {
        color: Colors.theme.harvestGold,
        fontSize: 15,
        fontWeight: '600',
    },
    skipButtonTextDisabled: {
        color: Colors.theme.dust,
        opacity: 0.3,
    },
    completeButton: {
        backgroundColor: Colors.theme.harvestGold,
    },
    completeButtonText: {
        color: Colors.theme.matteBlack,
        fontSize: 15,
        fontWeight: 'bold',
    },
    unsubscribeHeaderBtn: {
        color: Colors.theme.burntSienna,
        fontSize: 14,
        fontWeight: 'bold',
        padding: 5,
    },
    saveMapBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    saveMapBtnText: { color: Colors.theme.dust, fontSize: 16, fontWeight: '600' },
});
