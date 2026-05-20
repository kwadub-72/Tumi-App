import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, ActivityIndicator } from 'react-native';
import { Colors } from '../../../../shared/theme/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';
import { useFaceoffMatchups } from '../../hooks/useFaceoffMatchups';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { FAKE_INITIAL_WINS_BY_HANDLE, FAKE_INITIAL_LOSSES_BY_HANDLE } from '../../hooks/useTribeScoreboard';

const getCompetitionWeek = () => {
    const START_DATE = new Date('2026-03-22T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7) + 1;
    return Math.max(1, weeks);
};

const generateDailyHistory = (leftPoints: number, rightPoints: number) => {
    const days = ['Sat', 'Fri', 'Thu', 'Wed', 'Tue', 'Mon'];
    const leftBase = Math.floor(leftPoints / 6);
    const rightBase = Math.floor(rightPoints / 6);
    
    return days.map((day, idx) => {
        const dateLabel = `${day} - 3/${29 - idx}`;
        const lVal = leftBase + (idx === 0 ? (leftPoints % 6) : 0);
        const rVal = rightBase + (idx === 0 ? (rightPoints % 6) : 0);
        
        return {
            date: dateLabel,
            leftScore: lVal >= 0 ? `+${lVal}` : `${lVal}`,
            rightScore: rVal >= 0 ? `+${rVal}` : `${rVal}`
        };
    });
};

interface TradTribeBattleUserMatchupProps {
    tribeId?: string;
    weekNumber?: number;
}

export const TradTribeBattleUserMatchup = ({
    tribeId = 'b0000000-0000-0000-0000-000000000004',
    weekNumber
}: TradTribeBattleUserMatchupProps) => {
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const week = weekNumber ?? getCompetitionWeek();
    const { navigateToProfile } = useProfileNavigation();

    const { matchups, userMatchup, loading } = useFaceoffMatchups(tribeId, week);

    // Fall back to first matchup of week if logged in user is not in a matchup
    const activeMatchup = userMatchup || matchups[0] || null;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const renderIcons = (user: any) => (
        <>
            {user.leaf && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, title: 'Natural Athlete', description: 'This user is verified as a natural athlete by the tribe.', iconName: 'leaf'
                })}>
                    <MaterialCommunityIcons name="leaf" size={16} color="#4ADE80" style={styles.icon} />
                </TouchableOpacity>
            )}
            {user.activity && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, 
                    title: user.activity === 'hammer' ? 'Bodybuilding' : (user.activity === 'weight-lifter' ? 'Powerlifting' : 'Activity'), 
                    description: '', 
                    iconName: user.activity as any
                })}>
                    <MaterialCommunityIcons name={user.activity as any} size={16} color={Colors.primary} style={styles.icon} />
                </TouchableOpacity>
            )}
        </>
    );

    if (loading && !activeMatchup) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 250 }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!activeMatchup) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 250 }]}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>No active matchups for Week {week}</Text>
            </View>
        );
    }

    const leftHandle = activeMatchup.user_1_username.replace('@', '');
    const rightHandle = activeMatchup.user_2_username.replace('@', '');

    const leftUser = {
        id: activeMatchup.user_1_id,
        name: activeMatchup.user_1_display_name,
        handle: activeMatchup.user_1_username,
        avatar: activeMatchup.user_1_pfp_url,
        tribeName: 'The Cut Squad',
        tribeLogo: 'https://i.pravatar.cc/100?img=26',
        record: `${FAKE_INITIAL_WINS_BY_HANDLE[leftHandle] ?? 7}-${FAKE_INITIAL_LOSSES_BY_HANDLE[leftHandle] ?? 1}`,
        streak: (FAKE_INITIAL_WINS_BY_HANDLE[leftHandle] ?? 7) > (FAKE_INITIAL_LOSSES_BY_HANDLE[leftHandle] ?? 1) ? 'W1' : 'L1',
        score: activeMatchup.user_1_weekly_points,
        leaf: activeMatchup.user_1_natural_status === 'natural',
        activity: activeMatchup.user_1_activity_icon || 'hammer',
        caloriesPct: 80,
        proteinPct: 72,
        carbsPct: 65,
        fatPct: 58,
    };

    const rightUser = {
        id: activeMatchup.user_2_id,
        name: activeMatchup.user_2_display_name,
        handle: activeMatchup.user_2_username,
        avatar: activeMatchup.user_2_pfp_url,
        tribeName: 'The Cut Squad',
        tribeLogo: 'https://i.pravatar.cc/100?img=26',
        record: `${FAKE_INITIAL_WINS_BY_HANDLE[rightHandle] ?? 7}-${FAKE_INITIAL_LOSSES_BY_HANDLE[rightHandle] ?? 1}`,
        streak: (FAKE_INITIAL_WINS_BY_HANDLE[rightHandle] ?? 7) > (FAKE_INITIAL_LOSSES_BY_HANDLE[rightHandle] ?? 1) ? 'W1' : 'L1',
        score: activeMatchup.user_2_weekly_points,
        leaf: activeMatchup.user_2_natural_status === 'natural',
        activity: activeMatchup.user_2_activity_icon || 'hammer',
        caloriesPct: 50,
        proteinPct: 44,
        carbsPct: 70,
        fatPct: 38,
    };

    const dailyHistory = generateDailyHistory(leftUser.score, rightUser.score);

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Head-to-Head • Faceoff • Habits</Text>
            <Text style={styles.weekText}>Week {week}</Text>

            <View style={styles.matchupContainer}>
                {/* Left User */}
                <TouchableOpacity onPress={() => navigateToProfile({ id: leftUser.id, handle: leftUser.handle })} style={styles.playerCol}>
                    <Text style={styles.rankNum}>#1</Text>
                    {leftUser.avatar ? (
                        <Image source={{ uri: leftUser.avatar }} style={styles.bigAvatar} />
                    ) : (
                        <View style={styles.fallbackAvatar}>
                            <MaterialCommunityIcons name="shield-outline" size={32} color="#8B6D25" />
                        </View>
                    )}

                    <View style={styles.nameRow}>
                        <Text style={styles.userName} numberOfLines={1}>{leftUser.name}</Text>
                        {renderIcons(leftUser)}
                    </View>
                    <Text style={styles.userHandle} numberOfLines={1}>{leftUser.handle}</Text>
                    <View style={styles.miniTribeRow}>
                        <Image source={{ uri: leftUser.tribeLogo }} style={styles.miniTribeLogo} />
                        <Text style={styles.miniTribeName} numberOfLines={1}>{leftUser.tribeName}</Text>
                    </View>

                    <Text style={styles.recordText}>
                        {leftUser.record} <Text style={{ color: Colors.error }}>({leftUser.streak})</Text>
                    </Text>
                </TouchableOpacity>

                {/* Score */}
                <View style={styles.scoreCol}>
                    <Text style={styles.bigScore}>{leftUser.score}-{rightUser.score}</Text>
                </View>

                {/* Right User */}
                <TouchableOpacity onPress={() => navigateToProfile({ id: rightUser.id, handle: rightUser.handle })} style={styles.playerCol}>
                    <Text style={styles.rankNum}>#2</Text>
                    {rightUser.avatar ? (
                        <Image source={{ uri: rightUser.avatar }} style={styles.bigAvatarRight} />
                    ) : (
                        <View style={styles.fallbackAvatarRight}>
                            <MaterialCommunityIcons name="shield-outline" size={32} color="#8B6D25" />
                        </View>
                    )}

                    <View style={styles.nameRow}>
                        <Text style={styles.userName} numberOfLines={1}>{rightUser.name}</Text>
                        {renderIcons(rightUser)}
                    </View>
                    <Text style={styles.userHandle} numberOfLines={1}>{rightUser.handle}</Text>
                    <View style={styles.miniTribeRow}>
                        <Image source={{ uri: rightUser.tribeLogo }} style={styles.miniTribeLogo} />
                        <Text style={styles.miniTribeName} numberOfLines={1}>{rightUser.tribeName}</Text>
                    </View>

                    <Text style={styles.recordText}>
                        {rightUser.record} <Text style={{ color: '#4ADE80' }}>({rightUser.streak})</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Macro face-off bars — centered below score */}
            <View style={styles.macroBarsSection}>
                {([
                    { icon: 'fire',         label: 'Cal',  leftPct: leftUser.caloriesPct, rightPct: rightUser.caloriesPct, color: Colors.primary },
                    { icon: 'arm-flex',    label: 'Pro',  leftPct: leftUser.proteinPct,  rightPct: rightUser.proteinPct,  color: '#60A5FA' },
                    { icon: 'barley',      label: 'Carb', leftPct: leftUser.carbsPct,    rightPct: rightUser.carbsPct,    color: '#F97316' },
                    { icon: 'water',       label: 'Fat',  leftPct: leftUser.fatPct,      rightPct: rightUser.fatPct,      color: '#A78BFA' },
                ] as { icon: any; label: string; leftPct: number; rightPct: number; color: string }[]).map((macro) => (
                    <View key={macro.icon} style={styles.macroRow}>
                        {/* Left bar — fills from center outward (justify flex-end reverses it) */}
                        <View style={styles.macroBarSideLeft}>
                            <View style={[styles.macroBarBg, { justifyContent: 'flex-end' }]}>
                                <View style={[styles.macroBarFill, { width: `${macro.leftPct}%`, backgroundColor: macro.color }]} />
                            </View>
                        </View>
                        {/* Center icon */}
                        <View style={styles.macroIconCenter}>
                            <MaterialCommunityIcons name={macro.icon} size={18} color={macro.color} />
                        </View>
                        {/* Right bar — fills left to right */}
                        <View style={styles.macroBarSideRight}>
                            <View style={styles.macroBarBg}>
                                <View style={[styles.macroBarFill, { width: `${macro.rightPct}%`, backgroundColor: macro.color }]} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.expandButton} onPress={toggleExpand}>
                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    {dailyHistory.map((day, idx) => (
                        <View key={idx} style={styles.historyRow}>
                            <View style={styles.historyUserLeft}>
                                {leftUser.avatar ? (
                                    <Image source={{ uri: leftUser.avatar }} style={styles.smallAvatar} />
                                ) : (
                                    <View style={[styles.smallAvatar, styles.smallFallbackAvatar]}>
                                        <MaterialCommunityIcons name="shield-outline" size={16} color="#8B6D25" />
                                    </View>
                                )}
                                <View style={styles.historyNameCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName} numberOfLines={1}>{leftUser.name}</Text>
                                        <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" style={{ marginLeft: 2 }} />
                                        <MaterialCommunityIcons name={leftUser.activity as any} size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                    </View>
                                    <Text style={styles.historyHandle} numberOfLines={1}>{leftUser.handle}</Text>
                                </View>
                            </View>

                            <View style={styles.historyScoreBox}>
                                <Text style={styles.historyDate}>{day.date}</Text>
                                <View style={styles.historyScoreRow}>
                                    <Text style={[styles.historyScore, { color: Colors.primary }]}>{day.leftScore}</Text>
                                    <View style={styles.historyDivider} />
                                    <Text style={[styles.historyScore, { color: Colors.error }]}>{day.rightScore}</Text>
                                </View>
                            </View>

                            <View style={styles.historyUserRight}>
                                <View style={[styles.historyNameCol, { alignItems: 'flex-end' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName} numberOfLines={1}>{rightUser.name}</Text>
                                        <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" style={{ marginLeft: 2 }} />
                                        <MaterialCommunityIcons name={rightUser.activity as any} size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                    </View>
                                    <Text style={styles.historyHandle} numberOfLines={1}>{rightUser.handle}</Text>
                                </View>
                                {rightUser.avatar ? (
                                    <Image source={{ uri: rightUser.avatar }} style={styles.smallAvatar} />
                                ) : (
                                    <View style={[styles.smallAvatar, styles.smallFallbackAvatar]}>
                                        <MaterialCommunityIcons name="shield-outline" size={16} color="#8B6D25" />
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.timestamp}>Just now</Text>

            {modalInfo && (
                <TribeInfoModal
                    visible={modalInfo.visible}
                    onClose={() => setModalInfo(null)}
                    title={modalInfo.title}
                    description={modalInfo.description}
                    type="icon-title"
                    iconName={modalInfo.iconName}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.card,
        borderRadius: 35,
        padding: 20,
        paddingTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
        position: 'relative',
    },
    dashboardType: {
        textAlign: 'center',
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    weekText: {
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontSize: 24,
        marginBottom: 15,
    },
    matchupContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerCol: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    scoreCol: {
        width: 120,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    bigScore: {
        fontSize: 48,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.8)',
    },
    rankNum: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: -10,
        left: 0,
        zIndex: 1,
    },
    bigAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.primary,
        marginBottom: 10,
    },
    bigAvatarRight: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FCA5A5',
        marginBottom: 10,
    },
    fallbackAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.primary,
        backgroundColor: '#262525',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    fallbackAvatarRight: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FCA5A5',
        backgroundColor: '#262525',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    smallFallbackAvatar: {
        backgroundColor: '#262525',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 5,
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        flexShrink: 1,
    },
    userHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 2,
    },
    miniTribeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        gap: 6,
        width: '100%',
        justifyContent: 'center',
    },
    miniTribeLogo: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    miniTribeName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        flexShrink: 1,
    },
    icon: {
        marginLeft: 2,
    },
    recordText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 5,
        marginBottom: 10,
    },
    macroBarsSection: {
        marginTop: 16,
        gap: 8,
        paddingHorizontal: 4,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },
    macroBarSideLeft: {
        flex: 1,
    },
    macroBarSideRight: {
        flex: 1,
    },
    macroBarBg: {
        flexDirection: 'row',
        height: 14,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 7,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    macroBarFill: {
        height: '100%',
        borderRadius: 7,
    },
    macroIconCenter: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandButton: {
        alignItems: 'center',
        marginTop: 15,
        padding: 5,
        zIndex: 2,
    },
    expandedContent: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 15,
        gap: 12,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyUserLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    historyUserRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
        gap: 6,
    },
    smallAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    historyNameCol: {
        justifyContent: 'center',
        flex: 1,
    },
    historyName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 11,
        flexShrink: 1,
    },
    historyHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
    },
    historyScoreBox: {
        alignItems: 'center',
        width: 100,
    },
    historyDate: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    historyScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    historyScore: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    historyDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    timestamp: {
        position: 'absolute',
        bottom: 15,
        right: 20,
        fontSize: 10,
        color: Colors.primary,
        opacity: 0.7,
    }
});
