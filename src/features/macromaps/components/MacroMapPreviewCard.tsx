import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';

interface MacroMapPreviewCardProps {
    map: any;
    postType?: 'map_publish' | 'map_subscribe';
    creatorProfile?: {
        name?: string;
        handle?: string;
        status?: string;
        activity?: string;
        activity_icon?: string;
        activityIcon?: string;
    };
}

export function MacroMapPreviewCard({ map, postType, creatorProfile }: MacroMapPreviewCardProps) {
    const [trajectory, setTrajectory] = useState<{ shift: number, weightChange: number, p: number, c: number, f: number } | null>(null);

    useEffect(() => {
        if (!map?.id) return;
        const fetchTrajectory = async () => {
            try {
                const { data } = await supabase
                    .from('macro_map_checkpoints')
                    .select('protein_ratio, carbs_ratio, fats_ratio, calorie_delta_pct')
                    .eq('map_id', map.id)
                    .order('sequence_index', { ascending: true });

                if (data && data.length > 0) {
                    const p = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.protein_ratio), 0) / data.length * 100);
                    const c = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.carbs_ratio), 0) / data.length * 100);
                    const f = Math.round(data.reduce((acc: number, curr: any) => acc + Number(curr.fats_ratio), 0) / data.length * 100);
                    const shiftSum = data.reduce((acc: number, curr: any) => acc + Number(curr.calorie_delta_pct), 0) * 100;
                    
                    const goal = (map.goal_type || map.global_track || 'MAINTENANCE').toUpperCase();
                    const weightChange = goal.includes('CUT') ? -1.0 : goal.includes('BULK') ? 0.5 : 0.0;

                    setTrajectory({ 
                        shift: Math.round((shiftSum / data.length) * 10) / 10, 
                        weightChange, 
                        p, 
                        c, 
                        f 
                    });
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTrajectory();
    }, [map?.id]);

    if (!map) return null;

    const resolvedProfile = creatorProfile || (Array.isArray(map.profiles) ? map.profiles[0] : (map.profiles || {}));
    const displayName = resolvedProfile.name || 'Creator';
    const username = resolvedProfile.handle ? `@${resolvedProfile.handle.replace(/^@/, '')}` : '@creator';
    const status = map.creator_status_snapshot || resolvedProfile.status || 'none';
    const activity = map.creator_activity_snapshot || resolvedProfile.activity || '';
    const activityIcon = map.creator_activity_icon_snapshot || resolvedProfile.activity_icon || resolvedProfile.activityIcon || '';

    // Tag resolution
    const rawGoal = (map.goal_type || map.global_track || 'MAINTENANCE').toUpperCase();
    const goalText = rawGoal.includes('CUT') ? 'CUT' : (rawGoal.includes('BULK') ? 'BULK' : 'MAINT');

    const engineType = (map.engine_type || '').toUpperCase();
    const isLive = map.is_live || engineType === 'LIVE';
    let engineText = 'Created';
    if (isLive) {
        engineText = 'Live';
    } else if (map.generation_type === 'update') {
        engineText = 'Update';
    } else if (map.generation_type === 'meal_log') {
        engineText = 'Meal log';
    } else if (engineType === 'HISTORICAL') {
        engineText = 'Historical';
    }

    const durationWeeks = map.total_duration_weeks || map.durationWeeks || 12;

    const avatarUrl = resolvedProfile.avatar_url || resolvedProfile.avatarUrl || resolvedProfile.avatar;

    return (
        <View style={styles.previewCard}>
            {/* Top Section: Original Creator's Avatar, Name, Handle, Icons, and Map Name */}
            <View style={styles.previewHeader}>
                {avatarUrl ? (
                    <Image source={typeof avatarUrl === 'string' ? { uri: avatarUrl } : avatarUrl} style={styles.creatorAvatar} />
                ) : (
                    <View style={[styles.creatorAvatar, styles.placeholderAvatar]}>
                        <MaterialCommunityIcons name="account" size={16} color={Colors.theme.dust} />
                    </View>
                )}
                <View style={styles.creatorTextCol}>
                    <View style={styles.previewTitleRow}>
                        <Text style={styles.previewDisplayName}>{displayName}</Text>
                        <Text style={styles.previewUsername}>{username}</Text>
                        {status === 'natural' && (
                            <MaterialCommunityIcons name="leaf" size={14} color="#1BB607" />
                        )}
                        {status === 'enhanced' && (
                            <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.theme.burntSienna} />
                        )}
                        {activity !== '' && (
                            <ActivityIcon 
                                activity={activity} 
                                icon={activityIcon} 
                                size={14} 
                                color={Colors.theme.harvestGold} 
                            />
                        )}
                    </View>
                    {/* Map Name */}
                    <Text style={styles.mapNameText}>{map.name || map.map_name || 'Map Journey'}</Text>
                </View>
            </View>

            {/* Dust Divider */}
            <View style={styles.dustDivider} />

            {/* Tags Row */}
            <View style={styles.tagsRow}>
                <View style={styles.goalBadge}>
                    <Text style={styles.goalBadgeText}>{goalText}</Text>
                </View>
                <View style={styles.engineBadge}>
                    <Text style={styles.engineBadgeText}>{engineText}</Text>
                </View>
                <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>{durationWeeks} Weeks</Text>
                </View>
            </View>

            {/* Map Averages Header */}
            <Text style={styles.averagesHeader}>MAP AVERAGES</Text>

            {/* Metrics Row: 2 Columns */}
            <View style={styles.previewStatsRow}>
                <View style={styles.previewStat}>
                    <Text style={styles.previewStatLabel}>Total calorie shift</Text>
                    <Text style={styles.previewStatValue}>
                        {trajectory ? `${trajectory.shift >= 0 ? '+' : ''}${trajectory.shift.toFixed(1)}%` : '--'}
                    </Text>
                </View>
                <View style={styles.previewStatDivider} />
                <View style={styles.previewStat}>
                    <Text style={styles.previewStatLabel}>Weekly weight change</Text>
                    <Text style={styles.previewStatValue}>
                        {trajectory ? `${trajectory.weightChange >= 0 ? '+' : ''}${trajectory.weightChange.toFixed(1)}%` : '--'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    previewCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    averagesHeader: {
        color: Colors.theme.dust,
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 8,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 12,
    },
    creatorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.theme.dust,
        marginRight: 10,
    },
    placeholderAvatar: {
        backgroundColor: Colors.theme.charcoal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    creatorTextCol: {
        flex: 1,
        justifyContent: 'center',
    },
    previewTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    previewDisplayName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    previewUsername: {
        fontSize: 14,
        color: Colors.theme.dust,
    },
    mapNameText: {
        color: Colors.theme.harvestGold,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 5,
    },
    dustDivider: {
        height: 1,
        backgroundColor: Colors.theme.dust,
        opacity: 0.15,
        marginTop: 5,
        marginBottom: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    goalBadge: {
        backgroundColor: 'rgba(218, 165, 32, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    goalBadgeText: {
        color: Colors.theme.harvestGold,
        fontSize: 10,
        fontWeight: 'bold',
    },
    engineBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    engineBadgeText: {
        color: Colors.theme.dust,
        fontSize: 10,
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
    previewStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 16,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    previewStat: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    previewStatLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 6,
        textAlign: 'center',
    },
    previewStatValue: {
        color: Colors.theme.softWhite,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    previewStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
});
