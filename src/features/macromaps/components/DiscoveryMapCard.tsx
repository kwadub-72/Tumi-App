import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { DiscoveryMap } from '@/src/features/macromaps/store/useMarketplaceStore';
import { supabase } from '@/src/shared/services/supabase';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { ACTIVITIES, resolveActivityIcon } from '@/src/shared/constants/Activities';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';
import { formatTimeAgo } from '@/utils/time';
import { useAuthStore } from '@/store/AuthStore';
import { useMapStore } from '@/src/features/macromaps/store/useMapStore';

import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

export interface DiscoveryMapCardProps {
    map: DiscoveryMap;
    isOnboarding?: boolean;
    onOptionsPress?: () => void;
    onLikePress?: () => void;
    onCommentPress?: () => void;
    onSharePress?: () => void;
    onCopyPress?: () => void;
    isLiked?: boolean;
    likeCount?: number;
    commentCount?: number;
    subscribeCount?: number;
    shareCount?: number;
}

export function DiscoveryMapCard({
    map,
    isOnboarding,
    onOptionsPress,
    onLikePress,
    onCommentPress,
    onSharePress,
    onCopyPress,
    isLiked = false,
    likeCount = 0,
    commentCount = 0,
    subscribeCount = 0,
    shareCount = 0
}: DiscoveryMapCardProps) {
    const router = useRouter();
    const { navigateToProfile } = useProfileNavigation();
    const [trajectory, setTrajectory] = useState<{ shift: number, p: number, c: number, f: number } | null>(null);

    const { activeMapProgress, activeMapId } = useMapStore();
    const [localProgress, setLocalProgress] = useState<{ completedCount: number; totalCount: number } | null>(null);
    const [totalCheckpointsCount, setTotalCheckpointsCount] = useState<number>(0);

    const isLiveActive = map.engine_type?.toUpperCase() === 'LIVE' && (map.is_live === true || map.broadcast_status === 'active' || map.broadcast_status === 'ACTIVE');
    const isLiveEnded = map.engine_type?.toUpperCase() === 'LIVE' && (map.broadcast_status === 'ended' || map.broadcast_status === 'ENDED' || map.broadcast_status === 'inactive' || map.broadcast_status === 'INACTIVE' || !map.is_live);

    const rawGoal = (map.global_track || 'MAINTENANCE').toUpperCase();
    const goalText = rawGoal.includes('CUT') ? 'CUT' : (rawGoal.includes('BULK') ? 'BULK' : 'MAINT');

    const fetchTrajectory = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('macro_map_checkpoints')
                .select('id, protein_ratio, carbs_ratio, fats_ratio, calorie_delta_pct')
                .eq('map_id', map.id)
                .order('sequence_index', { ascending: true });

            if (data && data.length > 0) {
                setTotalCheckpointsCount(data.length);
                // Approximate averages
                const p = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.protein_ratio), 0) / data.length * 100);
                const c = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.carbs_ratio), 0) / data.length * 100);
                const f = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.fats_ratio), 0) / data.length * 100);
                const shift = data.reduce((acc: number, curr: any) => acc + Number(curr.calorie_delta_pct), 0);
                
                setTrajectory({ shift: Math.round(shift * 10) / 10, p, c, f });

                // Fetch user subscription progress if logged in
                const userId = useAuthStore.getState().session?.user?.id;
                if (userId) {
                    const { data: progressData } = await supabase
                        .from('user_map_progress')
                        .select('completed_checkpoint_ids')
                        .eq('user_id', userId)
                        .eq('map_id', map.id)
                        .maybeSingle();

                    if (progressData) {
                        setLocalProgress({
                            completedCount: progressData.completed_checkpoint_ids?.length || 0,
                            totalCount: data.length
                        });
                    } else {
                        setLocalProgress(null);
                    }
                } else {
                    setLocalProgress(null);
                }
            } else {
                setTrajectory(null);
                setLocalProgress(null);
                setTotalCheckpointsCount(0);
            }
        } catch (err) {
            console.error('[DiscoveryMapCard] Error fetching trajectory/progress:', err);
            setTrajectory(null);
            setLocalProgress(null);
            setTotalCheckpointsCount(0);
        }
    }, [map.id]);

    useEffect(() => {
        fetchTrajectory();
    }, [map.id, fetchTrajectory]);

    const rawEngine = (map.engine_type || '').toUpperCase();
    let engineText = 'Created'; // Safe default

    if (rawEngine === 'ALGORITHMIC_CREATED') {
        engineText = 'Created';
    } else if (rawEngine === 'EXPERIENTIAL' || rawEngine === 'HISTORICAL') {
        engineText = map.generation_type === 'meal_log' ? 'Meal log' : 'Update';
    } else if (rawEngine === 'LIVE' || map.is_live === true || map.broadcast_status === 'active') {
        engineText = 'Live';
    } else {
        // Fallback for legacy maps missing an explicit engine_type
        engineText = map.generation_type === 'meal_log' ? 'Meal log' : (map.generation_type === 'update' ? 'Update' : 'Created');
    }

    const isStoreActiveMap = activeMapId === map.id;
    const isSubscribed = isStoreActiveMap ? !!activeMapProgress : !!localProgress;

    const completedCount = isStoreActiveMap
        ? (activeMapProgress?.completed_checkpoint_ids?.length || 0)
        : (localProgress?.completedCount || 0);

    const totalCount = totalCheckpointsCount;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/map-preview', params: { map_id: map.id, isOnboarding: isOnboarding ? 'true' : undefined } } as any)}
            style={styles.card}
        >
            {/* Creator Metadata & Title Row Combined */}
            <View style={[styles.cardHeader, { position: 'relative', marginBottom: 0 }]}>
                {onOptionsPress && (
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 4 }}
                        onPress={(e) => {
                            e.stopPropagation();
                            onOptionsPress();
                        }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.theme.softWhite} />
                    </TouchableOpacity>
                )}

                {/* Left Column Wrapper */}
                <View style={{ flex: 1, justifyContent: 'space-between', paddingRight: 12, marginTop: 28 }}>
                    <Pressable 
                        style={styles.creatorInfo} 
                        onPress={isOnboarding ? undefined : () => navigateToProfile({ id: map.creator_id, handle: map.username || map.creator_handle || '' })}
                        disabled={isOnboarding}
                    >
                        {map.avatar_url ? (
                            <Image 
                                source={{ uri: map.avatar_url }} 
                                style={styles.avatar} 
                            />
                        ) : (
                            <Ionicons name="person-circle" size={44} color={Colors.theme.dust} style={{ marginRight: 12 }} />
                        )}
                        <View style={styles.creatorText}>
                            <View style={styles.creatorNameRow}>
                                <Text style={styles.creatorName}>{map.display_name || 'Anonymous'}</Text>
                                <Pressable 
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        Alert.alert('Status Verification', map.is_natural === false ? 'This creator has marked themselves as enhanced.' : 'This creator has verified natural status.');
                                    }}
                                >
                                    <MaterialCommunityIcons 
                                        name={map.is_natural === false ? "lightning-bolt" : "leaf"} 
                                        size={14} 
                                        color={map.is_natural === false ? Colors.theme.burntSienna : Colors.theme.naturalGreen} 
                                        style={styles.statusIcon} 
                                    />
                                </Pressable>
                                <Pressable 
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        const actMatch = ACTIVITIES.find(a => a.name === map.activity_type);
                                        const displayName = actMatch?.displayName || map.activity_type || 'Moderate';
                                        Alert.alert('Training Focus', `Training Focus: ${displayName}`);
                                    }}
                                >
                                    <ActivityIcon 
                                        activity={map.activity_type || ''}
                                        icon={resolveActivityIcon(map.activity_type, map.activity_icon)}
                                        size={14} 
                                        color={Colors.theme.harvestGold} 
                                     />
                                </Pressable>
                            </View>
                            <Text style={styles.creatorBio} numberOfLines={1}>
                                {'@' + (map.username || map.creator_handle || 'creator').replace('@', '')}
                            </Text>
                        </View>
                    </Pressable>

                    {/* Map Title and Live/Ended Badges */}
                    <View style={styles.titleRow}>
                        <Text style={styles.mapTitle}>{map.map_name}</Text>
                        {isLiveActive && (
                            <View style={[styles.statusBadge, styles.activeBadge]}>
                                <Text style={styles.activeBadgeText}>ACTIVE</Text>
                            </View>
                        )}
                        {isLiveEnded && (
                            <View style={[styles.statusBadge, styles.endedBadge]}>
                                <Text style={styles.endedBadgeText}>INACTIVE</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Right Column Wrapper */}
                <View style={styles.badgesContainer}>
                    <View style={styles.goalBadge}>
                        <Text style={styles.goalText}>{goalText}</Text>
                    </View>
                    <View style={styles.engineBadge}>
                        <Text style={styles.engineText}>
                            {engineText}
                        </Text>
                    </View>
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationBadgeText}>{map.total_duration_weeks || 12} Weeks</Text>
                    </View>
                </View>
            </View>
            <View style={{ width: '100%', height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginTop: 6, marginBottom: 12 }} />

            {/* Blueprint Averages Box (rendered for ALL maps) */}
            <View style={styles.trajectoryBox}>
                <Text style={[styles.trajectoryBoxTitle, { marginBottom: 12 }]}>MAP AVERAGES</Text>
                <View style={styles.averagesRow}>
                    <View style={styles.averageItem}>
                        <Text style={styles.averageLabel}>Total calorie shift</Text>
                        <Text style={styles.averageValue}>
                            {map.global_calorie_shift_pct !== undefined && map.global_calorie_shift_pct !== null && Number(map.global_calorie_shift_pct) !== 0
                                ? `${Number(map.global_calorie_shift_pct) > 0 ? '+' : ''}${Number(map.global_calorie_shift_pct).toFixed(2)}%`
                                : '0%'
                            }
                        </Text>
                    </View>
                    <View style={styles.averageDivider} />
                    <View style={styles.averageItem}>
                        <Text style={styles.averageLabel}>Weekly weight change</Text>
                        <Text style={styles.averageValue}>
                            {map.global_weight_shift_pct !== undefined && map.global_weight_shift_pct !== null && Number(map.global_weight_shift_pct) !== 0
                                ? `${Number(map.global_weight_shift_pct) > 0 ? '+' : ''}${Number(map.global_weight_shift_pct).toFixed(2)}%`
                                : '(-)'
                            }
                        </Text>
                    </View>
                </View>
                <View style={styles.horizontalDivider} />
                <View style={styles.macroContainer}>
                    <Text style={styles.macroLabel}>Avg macro split</Text>
                    <View style={styles.macroSplitRow}>
                        <View style={styles.macroValues}>
                            <View style={styles.macroBubble}><Text style={styles.macroBubbleText}>P</Text></View>
                            <Text style={styles.macroText}>{trajectory && trajectory.p > 0 ? `${trajectory.p}%` : '(-)'}</Text>
                            
                            <View style={styles.macroBubble}><Text style={styles.macroBubbleText}>C</Text></View>
                            <Text style={styles.macroText}>{trajectory && trajectory.c > 0 ? `${trajectory.c}%` : '(-)'}</Text>
                            
                            <View style={styles.macroBubble}><Text style={styles.macroBubbleText}>F</Text></View>
                            <Text style={styles.macroText}>{trajectory && trajectory.f > 0 ? `${trajectory.f}%` : '(-)'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {isSubscribed && totalCount > 0 && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                            {completedCount}/{totalCount} Checkpoints Complete
                        </Text>
                        <Text style={styles.progressPercent}>{percent}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                    </View>
                </View>
            )}

            {/* Timestamp strictly at the very BOTTOM of the card layout */}
            <Text style={styles.footerHeartbeatText}>
                {(isLiveActive || isLiveEnded)
                    ? `Last Updated: ${formatTimeAgo(map.last_updated_at ? new Date(map.last_updated_at) : new Date(map.created_at))}`
                    : `Posted: ${formatTimeAgo(map.published_at ? new Date(map.published_at) : new Date(map.created_at))}`
                }
            </Text>

            {(onLikePress || onCommentPress || onCopyPress || onSharePress) && (
                <View style={styles.footerActions}>
                    <View style={styles.actionsRow}>
                        {onCopyPress && (
                            <TouchableOpacity
                                style={styles.actionItem}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onCopyPress();
                                }}
                            >
                                <View style={styles.iconBox}>
                                    <View style={styles.tribeCircle}>
                                        <TabonoLogo size={20} color={Colors.theme.matteBlack} />
                                    </View>
                                </View>
                                <Text style={styles.actionCount}>{subscribeCount || 0}</Text>
                            </TouchableOpacity>
                        )}
                        {onLikePress && (
                            <TouchableOpacity 
                                style={styles.actionItem} 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onLikePress();
                                }}
                            >
                                <View style={styles.iconBox}>
                                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? Colors.theme.harvestGold : Colors.theme.dust} />
                                </View>
                                <Text style={styles.actionCount}>{likeCount}</Text>
                            </TouchableOpacity>
                        )}
                        {onCommentPress && (
                            <TouchableOpacity 
                                style={styles.actionItem} 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onCommentPress();
                                }}
                            >
                                <View style={styles.iconBox}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={26} color={Colors.theme.dust} />
                                </View>
                                <Text style={styles.actionCount}>{commentCount}</Text>
                            </TouchableOpacity>
                        )}
                        {onSharePress && (
                            <TouchableOpacity 
                                style={styles.actionItem} 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onSharePress();
                                }}
                            >
                                <View style={styles.iconBox}>
                                    <Ionicons name="arrow-redo-outline" size={26} color={Colors.theme.dust} />
                                </View>
                                <Text style={styles.actionCount}>{shareCount || 0}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        marginBottom: 0,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    creatorText: {
        flex: 1,
    },
    creatorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    creatorName: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 4,
    },
    statusIcon: {
        marginRight: 4,
    },
    creatorBio: {
        color: Colors.theme.dust,
        fontSize: 14,
        marginTop: 2,
    },
    badgesContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        marginTop: 28,
    },
    goalBadge: {
        backgroundColor: 'rgba(218, 165, 32, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    goalText: {
        color: Colors.theme.harvestGold,
        fontSize: 12,
        fontWeight: 'bold',
    },
    engineBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    engineText: {
        color: Colors.theme.dust,
        fontSize: 11,
        fontWeight: '600',
    },
    durationBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    durationBadgeText: {
        color: Colors.theme.dust,
        fontSize: 10,
        fontWeight: '600',
    },
    mapTitle: {
        color: Colors.theme.softWhite,
        fontSize: 20,
        fontWeight: '900',
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
        marginTop: 20,
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBadge: {
        backgroundColor: 'rgba(27, 182, 7, 0.15)',
        borderWidth: 1,
        borderColor: Colors.theme.naturalGreen,
    },
    activeBadgeText: {
        color: Colors.theme.naturalGreen,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    endedBadge: {
        backgroundColor: 'rgba(139, 69, 19, 0.15)',
        borderWidth: 1,
        borderColor: Colors.theme.burntSienna,
    },
    endedBadgeText: {
        color: Colors.theme.burntSienna,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    liveContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    glowingPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'red',
        marginRight: 6,
        shadowColor: 'red',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    liveBadgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    heartbeatText: {
        color: Colors.theme.dust,
        fontSize: 13,
        fontWeight: '600',
    },
    trajectoryBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginHorizontal: -8,
    },
    trajectoryBoxTitle: {
        color: Colors.theme.dust,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    averagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    averageItem: {
        flex: 1,
    },
    averageLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 4,
    },
    averageValue: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    averageDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
    },
    horizontalDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 12,
    },
    macroContainer: {},
    macroLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 8,
    },
    macroSplitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    macroValues: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    macroBubble: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    macroBubbleText: {
        color: Colors.theme.matteBlack,
        fontSize: 11,
        fontWeight: 'bold',
    },
    macroText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 16,
    },
    footerHeartbeatText: {
        color: Colors.theme.dust,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'right',
        marginTop: 12,
        opacity: 0.8,
        alignSelf: 'flex-end',
    },
    footerActions: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    actionItem: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    iconBox: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionCount: {
        color: Colors.theme.softWhite,
        fontSize: 12,
        fontWeight: '600',
    },
    tribeCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        marginTop: 14,
        marginBottom: 6,
        paddingHorizontal: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        color: Colors.theme.softWhite,
        fontWeight: '600',
    },
    progressPercent: {
        fontSize: 12,
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 3,
    },
});
