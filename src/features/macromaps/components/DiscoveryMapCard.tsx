import React, { useEffect, useState } from 'react';
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

export function DiscoveryMapCard({ map, isOnboarding }: { map: DiscoveryMap; isOnboarding?: boolean }) {
    const router = useRouter();
    const { navigateToProfile } = useProfileNavigation();
    const [heartbeatDays, setHeartbeatDays] = useState<number>(0);
    const [trajectory, setTrajectory] = useState<{ shift: number, p: number, c: number, f: number } | null>(null);

    const isLiveActive = map.is_live === true || map.broadcast_status === 'active' || map.broadcast_status === 'ACTIVE';
    const isLiveEnded = map.broadcast_status === 'ended' || map.broadcast_status === 'ENDED' || map.broadcast_status === 'inactive' || map.broadcast_status === 'INACTIVE' || (map.engine_type === 'LIVE' && !map.is_live);

    useEffect(() => {
        // Calculate heartbeat days simply using map created_at for now as per instructions
        const diffTime = Math.abs(new Date().getTime() - new Date(map.created_at).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setHeartbeatDays(diffDays);

        fetchTrajectory();
    }, [map]);

    const fetchTrajectory = async () => {
        try {
            const { data } = await supabase
                .from('macro_map_checkpoints')
                .select('protein_ratio, carbs_ratio, fats_ratio, calorie_delta_pct')
                .eq('map_id', map.id)
                .order('sequence_index', { ascending: true });

            if (data && data.length > 0) {
                // Approximate averages
                const p = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.protein_ratio), 0) / data.length * 100);
                const c = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.carbs_ratio), 0) / data.length * 100);
                const f = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.fats_ratio), 0) / data.length * 100);
                const shift = data.reduce((acc: number, curr: any) => acc + Number(curr.calorie_delta_pct), 0);
                
                setTrajectory({ shift: Math.round(shift * 10) / 10, p, c, f });
            } else {
                setTrajectory(null);
            }
        } catch (err) {
            setTrajectory(null);
        }
    };

    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/map-preview', params: { map_id: map.id, isOnboarding: isOnboarding ? 'true' : undefined } } as any)}
            style={styles.card}
        >
            {/* Creator Metadata */}
            <View style={styles.cardHeader}>
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
                                    name={map.is_natural === false ? "needle" : "leaf"} 
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
                <View style={styles.badgesContainer}>
                    <View style={styles.goalBadge}>
                        <Text style={styles.goalText}>{map.global_track}</Text>
                    </View>
                    <View style={styles.engineBadge}>
                        <Text style={styles.engineText}>
                            {(isLiveActive || isLiveEnded)
                                ? 'Live' 
                                : map.generation_type === 'update' 
                                    ? 'Update' 
                                    : map.generation_type === 'meal_log' 
                                        ? 'Meal log' 
                                        : 'Created'
                            }
                        </Text>
                    </View>
                </View>
            </View>

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

            {/* Blueprint Averages Box (rendered for ALL maps) */}
            <View style={styles.trajectoryBox}>
                <Text style={styles.trajectoryBoxTitle}>MAP AVERAGES</Text>
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

            {/* Timestamp strictly at the very BOTTOM of the card layout */}
            <Text style={styles.footerHeartbeatText}>
                {(isLiveActive || isLiveEnded)
                    ? `Last Updated: ${formatTimeAgo(map.last_updated_at ? new Date(map.last_updated_at) : new Date(map.created_at))}`
                    : `Posted: ${formatTimeAgo(map.published_at ? new Date(map.published_at) : new Date(map.created_at))}`
                }
            </Text>
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
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
        marginBottom: 16,
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
        fontSize: 18,
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
        marginTop: 10,
        opacity: 0.8,
    }
});
