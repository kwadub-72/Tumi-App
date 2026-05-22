import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Colors } from '../../../../shared/theme/Colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import TribeInfoModal from '../TribeInfoModal';
import { useFaceoffMatchups } from '../../hooks/useFaceoffMatchups';
import { useUserDailyMacros } from '../../hooks/useUserDailyMacros';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { FAKE_INITIAL_WINS_BY_HANDLE, FAKE_INITIAL_LOSSES_BY_HANDLE } from '../../hooks/useTribeScoreboard';
import { supabase } from '@/src/shared/services/supabase';

interface CompetitionRules {
    pts_tier_1: number;
    pts_tier_2: number;
    pts_tier_3: number;
    pts_exercise_bonus: number;
    pts_penalty_miss: number;
    pts_penalty_no_log: number;
}

const DEFAULT_RULES: CompetitionRules = {
    pts_tier_1: 20,
    pts_tier_2: 10,
    pts_tier_3: 5,
    pts_exercise_bonus: 10,
    pts_penalty_miss: -15,
    pts_penalty_no_log: -60
};

function calculatePendingDailyPoints(args: {
    consumed: { p: number; c: number; f: number };
    targets: { p: number; c: number; f: number };
    hasMeals: boolean;
    hasWorkout: boolean;
    rules: CompetitionRules;
}) {
    const { consumed, targets, hasMeals, hasWorkout, rules } = args;
    let score_p = 0;
    let score_c = 0;
    let score_f = 0;
    let score_workout = 0;

    if (!hasMeals) {
        const penaltyThird = Math.floor(rules.pts_penalty_no_log / 3);
        score_p = penaltyThird;
        score_c = penaltyThird;
        score_f = penaltyThird;
    } else {
        // Protein
        const diff_p = Math.abs(consumed.p - targets.p);
        if (diff_p <= 2.5) score_p = rules.pts_tier_1;
        else if (diff_p <= 10.0) score_p = rules.pts_tier_2;
        else if (diff_p <= 15.0) score_p = rules.pts_tier_3;
        else if (diff_p >= 20.0) score_p = rules.pts_penalty_miss;

        // Carbs
        const diff_c = Math.abs(consumed.c - targets.c);
        if (diff_c <= 2.5) score_c = rules.pts_tier_1;
        else if (diff_c <= 10.0) score_c = rules.pts_tier_2;
        else if (diff_c <= 15.0) score_c = rules.pts_tier_3;
        else if (diff_c >= 20.0) score_c = rules.pts_penalty_miss;

        // Fats
        const diff_f = Math.abs(consumed.f - targets.f);
        if (diff_f <= 2.5) score_f = rules.pts_tier_1;
        else if (diff_f <= 10.0) score_f = rules.pts_tier_2;
        else if (diff_f <= 15.0) score_f = rules.pts_tier_3;
        else if (diff_f >= 20.0) score_f = rules.pts_penalty_miss;
    }

    if (hasWorkout) {
        score_workout = rules.pts_exercise_bonus;
    }

    return {
        total: score_p + score_c + score_f + score_workout,
        p: score_p,
        c: score_c,
        f: score_f,
        workout: score_workout
    };
}

const getCompetitionWeek = () => {
    const START_DATE = new Date('2026-03-22T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7) + 1;
    return Math.max(1, weeks);
};

const formatDateLabel = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabel = days[date.getDay()];
    const month = date.getMonth() + 1;
    const dayOfMonth = date.getDate();
    return `${dayLabel} - ${month}/${dayOfMonth}`;
};

interface TradTribeBattleUserMatchupProps {
    tribeId: string;
    weekNumber?: number;
}

export const TradTribeBattleUserMatchup = ({
    tribeId,
    weekNumber
}: TradTribeBattleUserMatchupProps) => {
    const [expanded, setExpanded] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ visible: boolean, title: string, description: string, iconName: any } | null>(null);
    const week = weekNumber ?? getCompetitionWeek();
    const { navigateToProfile } = useProfileNavigation();

    const { matchups, userMatchup, loading: matchupsLoading, isLocked } = useFaceoffMatchups(tribeId, week);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        if (!matchupsLoading && matchups.length > 0) {
            if (userMatchup) {
                const idx = matchups.findIndex(m => m.matchup_id === userMatchup.matchup_id);
                setSelectedIdx(idx >= 0 ? idx : 0);
            } else {
                setSelectedIdx(0);
            }
        } else if (matchups.length === 0) {
            setSelectedIdx(null);
        }
    }, [matchups, userMatchup, matchupsLoading, week]);

    // Fall back to first matchup of week if logged in user is not in a matchup
    const activeMatchup = (selectedIdx !== null && matchups[selectedIdx]) ? matchups[selectedIdx] : (userMatchup || matchups[0] || null);

    // Call user macro hooks for both competitors
    const leftMacros = useUserDailyMacros(activeMatchup?.user_1_id);
    const rightMacros = useUserDailyMacros(activeMatchup?.user_2_id);

    // Fetch competition rules & ledger scores
    const [rules, setRules] = useState<CompetitionRules>(DEFAULT_RULES);
    const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);

    useEffect(() => {
        if (!activeMatchup?.competition_id) return;

        // Fetch rules
        supabase
            .from('competitions')
            .select('pts_tier_1, pts_tier_2, pts_tier_3, pts_exercise_bonus, pts_penalty_miss, pts_penalty_no_log')
            .eq('id', activeMatchup.competition_id)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setRules({
                        pts_tier_1: Number(data.pts_tier_1) ?? 20,
                        pts_tier_2: Number(data.pts_tier_2) ?? 10,
                        pts_tier_3: Number(data.pts_tier_3) ?? 5,
                        pts_exercise_bonus: Number(data.pts_exercise_bonus) ?? 10,
                        pts_penalty_miss: Number(data.pts_penalty_miss) ?? -15,
                        pts_penalty_no_log: Number(data.pts_penalty_no_log) ?? -60,
                    });
                }
            });

        // Fetch ledger entries
        supabase
            .from('competition_scores_ledger')
            .select('*')
            .eq('competition_id', activeMatchup.competition_id)
            .in('user_id', [activeMatchup.user_1_id, activeMatchup.user_2_id])
            .order('date', { ascending: false })
            .then(({ data }) => {
                if (data) {
                    setLedgerEntries(data);
                }
            });

        // Set up real-time postgres subscription on competition_scores_ledger
        const channel = supabase
            .channel(`ledger-sync-${activeMatchup.competition_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'competition_scores_ledger',
                filter: `competition_id=eq.${activeMatchup.competition_id}`,
            }, () => {
                supabase
                    .from('competition_scores_ledger')
                    .select('*')
                    .eq('competition_id', activeMatchup.competition_id)
                    .in('user_id', [activeMatchup.user_1_id, activeMatchup.user_2_id])
                    .order('date', { ascending: false })
                    .then(({ data }) => {
                        if (data) setLedgerEntries(data);
                    });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeMatchup?.competition_id, activeMatchup?.user_1_id, activeMatchup?.user_2_id]);

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
                    <MaterialCommunityIcons name="leaf" size={16} color={Colors.theme.naturalGreen} style={styles.icon} />
                </TouchableOpacity>
            )}
            {user.activityType && (
                <TouchableOpacity onPress={() => setModalInfo({
                    visible: true, 
                    title: user.activityType, 
                    description: '', 
                    iconName: user.activityIcon as any
                })}>
                    <MaterialCommunityIcons name={user.activityIcon as any} size={16} color={Colors.primary} style={styles.icon} />
                </TouchableOpacity>
            )}
        </>
    );

    if (isLocked) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', minHeight: 280, gap: 15 }]}>
                <Text style={styles.dashboardType}>Head-to-Head • Faceoff • Habits</Text>
                <View style={{ backgroundColor: '#262525', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.theme.harvestGold }}>
                    <MaterialCommunityIcons name="lock" size={32} color={Colors.theme.harvestGold} />
                </View>
                <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>Matchup Locked</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                        This matchup is temporally locked until the current week resolves on Saturday at 11:59 PM.
                    </Text>
                </View>
            </View>
        );
    }

    if (matchupsLoading && !activeMatchup) {
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

    // Today's projected points
    const leftProjectedToday = calculatePendingDailyPoints({
        consumed: leftMacros.consumed,
        targets: leftMacros.targets,
        hasMeals: leftMacros.hasMeals,
        hasWorkout: leftMacros.hasWorkout,
        rules,
    });

    const rightProjectedToday = calculatePendingDailyPoints({
        consumed: rightMacros.consumed,
        targets: rightMacros.targets,
        hasMeals: rightMacros.hasMeals,
        hasWorkout: rightMacros.hasWorkout,
        rules,
    });

    // Sum past ledger days (excluding today to prevent double counting if today's ledger entry is somehow committed early)
    const todayStr = new Date().toISOString().split('T')[0];

    const leftLedgerSum = ledgerEntries
        .filter(entry => entry.user_id === activeMatchup.user_1_id && entry.date !== todayStr)
        .reduce((sum, entry) => sum + (Number(entry.points_awarded) || 0), 0);

    const rightLedgerSum = ledgerEntries
        .filter(entry => entry.user_id === activeMatchup.user_2_id && entry.date !== todayStr)
        .reduce((sum, entry) => sum + (Number(entry.points_awarded) || 0), 0);

    const leftTotalScore = leftLedgerSum + leftProjectedToday.total;
    const rightTotalScore = rightLedgerSum + rightProjectedToday.total;

    const isByeWeek = !activeMatchup.user_2_id;

    const leftHandle = activeMatchup.user_1_username?.replace('@', '') ?? '';
    const rightHandle = activeMatchup.user_2_username?.replace('@', '') ?? '';

    const leftUser = {
        id: activeMatchup.user_1_id,
        name: activeMatchup.user_1_display_name,
        handle: activeMatchup.user_1_username,
        avatar: activeMatchup.user_1_pfp_url,
        tribeName: 'The Cut Squad',
        tribeLogo: 'https://i.pravatar.cc/100?img=26',
        record: `${FAKE_INITIAL_WINS_BY_HANDLE[leftHandle] ?? 7}-${FAKE_INITIAL_LOSSES_BY_HANDLE[leftHandle] ?? 1}`,
        streak: (FAKE_INITIAL_WINS_BY_HANDLE[leftHandle] ?? 7) > (FAKE_INITIAL_LOSSES_BY_HANDLE[leftHandle] ?? 1) ? 'W1' : 'L1',
        score: leftTotalScore,
        leaf: activeMatchup.user_1_natural_status === 'natural',
        activityType: activeMatchup.user_1_activity_type,
        activityIcon: activeMatchup.user_1_activity_icon || 'hammer',
    };

    const rightUser = isByeWeek ? null : {
        id: activeMatchup.user_2_id!,
        name: activeMatchup.user_2_display_name ?? 'Unknown',
        handle: activeMatchup.user_2_username ?? '',
        avatar: activeMatchup.user_2_pfp_url,
        tribeName: 'The Cut Squad',
        tribeLogo: 'https://i.pravatar.cc/100?img=26',
        record: `${FAKE_INITIAL_WINS_BY_HANDLE[rightHandle] ?? 0}-${FAKE_INITIAL_LOSSES_BY_HANDLE[rightHandle] ?? 0}`,
        streak: (FAKE_INITIAL_WINS_BY_HANDLE[rightHandle] ?? 0) > (FAKE_INITIAL_LOSSES_BY_HANDLE[rightHandle] ?? 0) ? 'W1' : 'L1',
        score: rightTotalScore,
        leaf: activeMatchup.user_2_natural_status === 'natural',
        activityType: activeMatchup.user_2_activity_type,
        activityIcon: activeMatchup.user_2_activity_icon || 'hammer',
    };

    // Construct the past 7 days daily history breakdown
    const datesList = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d;
    });

    const dailyHistory = datesList.map((d) => {
        const dStr = d.toISOString().split('T')[0];
        const isToday = dStr === todayStr;

        let leftVal = 0;
        let rightVal = 0;

        if (isToday) {
            leftVal = leftProjectedToday.total;
            rightVal = rightProjectedToday.total;
        } else {
            const leftEntry = ledgerEntries.find(entry => entry.user_id === activeMatchup.user_1_id && entry.date === dStr);
            const rightEntry = ledgerEntries.find(entry => entry.user_id === activeMatchup.user_2_id && entry.date === dStr);
            leftVal = leftEntry ? Number(leftEntry.points_awarded) || 0 : 0;
            rightVal = rightEntry ? Number(rightEntry.points_awarded) || 0 : 0;
        }

        return {
            date: formatDateLabel(d),
            leftScore: leftVal >= 0 ? `+${leftVal}` : `${leftVal}`,
            rightScore: rightVal >= 0 ? `+${rightVal}` : `${rightVal}`,
            isToday,
        };
    });

    return (
        <View style={styles.container}>
            <Text style={styles.dashboardType}>Head-to-Head • Faceoff • Habits</Text>
            <Text style={styles.weekText}>Week {week}</Text>

            {/* Matchup Selector Dropdown */}
            {matchups.length > 0 && activeMatchup && (
                <TouchableOpacity
                    style={styles.dropdownBtn}
                    activeOpacity={0.8}
                    onPress={() => setPickerVisible(true)}
                >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                        {activeMatchup.user_1_display_name} vs. {activeMatchup.user_2_display_name ?? 'Bye Week'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
            )}

            <View style={styles.matchupContainer}>
                {/* Left User */}
                <TouchableOpacity onPress={() => navigateToProfile({ id: leftUser.id, handle: leftUser.handle })} style={styles.playerCol}>
                    <Text style={styles.rankNum}>#1</Text>
                    {leftUser.avatar ? (
                        <Image source={{ uri: leftUser.avatar }} style={styles.bigAvatar} />
                    ) : (
                        <View style={styles.fallbackAvatar}>
                            <MaterialCommunityIcons name="shield-outline" size={32} color={Colors.theme.harvestGold} />
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
                        {leftUser.record} <Text style={{ color: Colors.theme.burntSienna }}>({leftUser.streak})</Text>
                    </Text>
                </TouchableOpacity>

                {/* Score - Scaled down by 10% from 48px to 43px */}
                <View style={styles.scoreCol}>
                    {isByeWeek ? (
                        <Text style={[styles.bigScore, { fontSize: 22, color: Colors.theme.harvestGold }]}>BYE{'\n'}WEEK</Text>
                    ) : (
                        <Text style={styles.bigScore}>{leftUser.score}-{rightUser!.score}</Text>
                    )}
                </View>

                {/* Right User — or Bye Week placeholder */}
                {isByeWeek ? (
                    <View style={[styles.playerCol, { alignItems: 'center', justifyContent: 'center', opacity: 0.45 }]}>
                        <View style={[styles.fallbackAvatarRight, { borderStyle: 'dashed' }]}>
                            <MaterialCommunityIcons name="calendar-check-outline" size={32} color={Colors.theme.harvestGold} />
                        </View>
                        <View style={styles.nameRow}>
                            <Text style={[styles.userName, { color: Colors.theme.harvestGold }]}>Bye Week</Text>
                        </View>
                        <Text style={styles.userHandle}>Free pass this week</Text>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => navigateToProfile({ id: rightUser!.id, handle: rightUser!.handle })} style={styles.playerCol}>
                        <Text style={styles.rankNum}>#2</Text>
                        {rightUser!.avatar ? (
                            <Image source={{ uri: rightUser!.avatar }} style={styles.bigAvatarRight} />
                        ) : (
                            <View style={styles.fallbackAvatarRight}>
                                <MaterialCommunityIcons name="shield-outline" size={32} color={Colors.theme.harvestGold} />
                            </View>
                        )}

                        <View style={styles.nameRow}>
                            <Text style={styles.userName} numberOfLines={1}>{rightUser!.name}</Text>
                            {renderIcons(rightUser!)}
                        </View>
                        <Text style={styles.userHandle} numberOfLines={1}>{rightUser!.handle}</Text>
                        <View style={styles.miniTribeRow}>
                            <Image source={{ uri: rightUser!.tribeLogo }} style={styles.miniTribeLogo} />
                            <Text style={styles.miniTribeName} numberOfLines={1}>{rightUser!.tribeName}</Text>
                        </View>

                        <Text style={styles.recordText}>
                            {rightUser!.record} <Text style={{ color: Colors.theme.naturalGreen }}>({rightUser!.streak})</Text>
                        </Text>
                    </TouchableOpacity>
                )}
            </View>


            {/* Centered Sliders with Consumed vs Remaining Grams */}
            <View style={styles.macroBarsSection}>
                {([
                    {
                        icon: 'fire',
                        unit: 'kcal',
                        leftConsumed: leftMacros.consumed.calories,
                        leftTarget: leftMacros.targets.calories,
                        leftRemaining: Math.max(0, leftMacros.targets.calories - leftMacros.consumed.calories),
                        leftPct: Math.min(100, (leftMacros.consumed.calories / (leftMacros.targets.calories || 1)) * 100),
                        rightConsumed: rightMacros.consumed.calories,
                        rightTarget: rightMacros.targets.calories,
                        rightRemaining: Math.max(0, rightMacros.targets.calories - rightMacros.consumed.calories),
                        rightPct: Math.min(100, (rightMacros.consumed.calories / (rightMacros.targets.calories || 1)) * 100),
                    },
                    {
                        icon: 'food-drumstick',
                        unit: 'g',
                        leftConsumed: leftMacros.consumed.p,
                        leftTarget: leftMacros.targets.p,
                        leftRemaining: Math.max(0, leftMacros.targets.p - leftMacros.consumed.p),
                        leftPct: Math.min(100, (leftMacros.consumed.p / (leftMacros.targets.p || 1)) * 100),
                        rightConsumed: rightMacros.consumed.p,
                        rightTarget: rightMacros.targets.p,
                        rightRemaining: Math.max(0, rightMacros.targets.p - rightMacros.consumed.p),
                        rightPct: Math.min(100, (rightMacros.consumed.p / (rightMacros.targets.p || 1)) * 100),
                    },
                    {
                        icon: 'wheat',
                        unit: 'g',
                        leftConsumed: leftMacros.consumed.c,
                        leftTarget: leftMacros.targets.c,
                        leftRemaining: Math.max(0, leftMacros.targets.c - leftMacros.consumed.c),
                        leftPct: Math.min(100, (leftMacros.consumed.c / (leftMacros.targets.c || 1)) * 100),
                        rightConsumed: rightMacros.consumed.c,
                        rightTarget: rightMacros.targets.c,
                        rightRemaining: Math.max(0, rightMacros.targets.c - rightMacros.consumed.c),
                        rightPct: Math.min(100, (rightMacros.consumed.c / (rightMacros.targets.c || 1)) * 100),
                    },
                    {
                        icon: 'water',
                        unit: 'g',
                        leftConsumed: leftMacros.consumed.f,
                        leftTarget: leftMacros.targets.f,
                        leftRemaining: Math.max(0, leftMacros.targets.f - leftMacros.consumed.f),
                        leftPct: Math.min(100, (leftMacros.consumed.f / (leftMacros.targets.f || 1)) * 100),
                        rightConsumed: rightMacros.consumed.f,
                        rightTarget: rightMacros.targets.f,
                        rightRemaining: Math.max(0, rightMacros.targets.f - rightMacros.consumed.f),
                        rightPct: Math.min(100, (rightMacros.consumed.f / (rightMacros.targets.f || 1)) * 100),
                    },
                ]).map((macro) => (
                    <View key={macro.icon} style={styles.macroRow}>
                        {/* Left bar — fills center outward */}
                        <View style={styles.macroBarSideLeft}>
                            <View style={styles.sliderTrackWrapper}>
                                <View style={[styles.sliderLabelRow, { justifyContent: 'flex-end', gap: 6 }]}>
                                    <Text style={styles.sliderLabelRemaining}>{macro.leftRemaining}{macro.unit} left</Text>
                                    <Text style={styles.sliderLabelConsumed}>{macro.leftConsumed}{macro.unit}</Text>
                                </View>
                                <View style={[styles.macroBarBg, { justifyContent: 'flex-end' }]}>
                                    <View style={[styles.macroBarFill, { width: `${macro.leftPct}%`, backgroundColor: Colors.theme.harvestGold }]} />
                                </View>
                            </View>
                        </View>

                        {/* Center Icon Axis */}
                        <View style={styles.macroIconCenter}>
                            <MaterialCommunityIcons name={macro.icon as any} size={20} color={Colors.theme.harvestGold} />
                        </View>

                        {/* Right bar — fills left to right */}
                        <View style={styles.macroBarSideRight}>
                            <View style={styles.sliderTrackWrapper}>
                                <View style={[styles.sliderLabelRow, { justifyContent: 'flex-start', gap: 6, flexDirection: 'row' }]}>
                                    <Text style={styles.sliderLabelConsumed}>{macro.rightConsumed}{macro.unit}</Text>
                                    <Text style={styles.sliderLabelRemaining}>{macro.rightRemaining}{macro.unit} left</Text>
                                </View>
                                <View style={styles.macroBarBg}>
                                    <View style={[styles.macroBarFill, { width: `${macro.rightPct}%`, backgroundColor: Colors.theme.harvestGold }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            {/* Standardized Legend */}
            <View style={styles.sliderLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.theme.harvestGold }]} />
                    <Text style={styles.legendText}>Consumed</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(218,165,32,0.3)' }]} />
                    <Text style={styles.legendText}>Remaining</Text>
                </View>
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
                                        <MaterialCommunityIcons name="shield-outline" size={16} color={Colors.theme.harvestGold} />
                                    </View>
                                )}
                                <View style={styles.historyNameCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.historyName} numberOfLines={1}>{leftUser.name}</Text>
                                        <MaterialCommunityIcons name="leaf" size={12} color={Colors.theme.naturalGreen} style={{ marginLeft: 2 }} />
                                        <MaterialCommunityIcons name={leftUser.activityIcon as any} size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                    </View>
                                    <Text style={styles.historyHandle} numberOfLines={1}>{leftUser.handle}</Text>
                                </View>
                            </View>

                            <View style={styles.historyScoreBox}>
                                <Text style={styles.historyDate}>{day.date}{day.isToday && ' (Today)'}</Text>
                                <View style={styles.historyScoreRow}>
                                    <Text style={[styles.historyScore, { color: Colors.theme.harvestGold }]}>{day.leftScore}</Text>
                                    <View style={styles.historyDivider} />
                                    <Text style={[styles.historyScore, { color: Colors.theme.burntSienna }]}>{day.rightScore}</Text>
                                </View>
                            </View>

                            <View style={styles.historyUserRight}>
                                {rightUser ? (
                                    <>
                                        <View style={[styles.historyNameCol, { alignItems: 'flex-end' }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.historyName} numberOfLines={1}>{rightUser.name}</Text>
                                                <MaterialCommunityIcons name="leaf" size={12} color={Colors.theme.naturalGreen} style={{ marginLeft: 2 }} />
                                                <MaterialCommunityIcons name={rightUser.activityIcon as any} size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                                            </View>
                                            <Text style={styles.historyHandle} numberOfLines={1}>{rightUser.handle}</Text>
                                        </View>
                                        {rightUser.avatar ? (
                                            <Image source={{ uri: rightUser.avatar }} style={styles.smallAvatar} />
                                        ) : (
                                            <View style={[styles.smallAvatar, styles.smallFallbackAvatar]}>
                                                <MaterialCommunityIcons name="shield-outline" size={16} color={Colors.theme.harvestGold} />
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View style={[styles.historyNameCol, { alignItems: 'flex-end', opacity: 0.45 }]}>
                                        <Text style={[styles.historyName, { color: Colors.theme.harvestGold }]}>Bye</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                    ))}
                </View>
            )}

            <Text style={styles.timestamp}>Just now</Text>

            {/* Custom Matchup Picker Modal */}
            <Modal
                visible={pickerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.pickerBackdrop}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>SELECT MATCHUP</Text>
                        <FlatList
                            data={matchups}
                            keyExtractor={(item) => item.matchup_id}
                            renderItem={({ item, index }) => {
                                const isSelected = selectedIdx === index;
                                const isRightBye = !item.user_2_id;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.pickerRow,
                                            isSelected && styles.pickerRowActive
                                        ]}
                                        onPress={() => {
                                            setSelectedIdx(index);
                                            setPickerVisible(false);
                                        }}
                                    >
                                        <View style={styles.pickerCompetitorBlock}>
                                            {item.user_1_pfp_url ? (
                                                <Image source={{ uri: item.user_1_pfp_url }} style={styles.pickerAvatar} />
                                            ) : (
                                                <View style={styles.pickerAvatarBye}>
                                                    <MaterialCommunityIcons name="shield-outline" size={16} color={Colors.theme.harvestGold} />
                                                </View>
                                            )}
                                            <Text 
                                                style={[styles.pickerName, isSelected && { color: Colors.theme.harvestGold }]} 
                                                numberOfLines={1}
                                            >
                                                {item.user_1_display_name}
                                            </Text>
                                        </View>

                                        <Text style={styles.pickerVsLabel}>VS</Text>

                                        <View style={[styles.pickerCompetitorBlock, { alignItems: 'flex-end', justifyContent: 'flex-end' }]}>
                                            <Text 
                                                style={[styles.pickerName, { textAlign: 'right' }, isSelected && { color: Colors.theme.harvestGold }]} 
                                                numberOfLines={1}
                                            >
                                                {isRightBye ? 'Bye Week' : item.user_2_display_name}
                                            </Text>
                                            {isRightBye ? (
                                                <View style={styles.pickerAvatarBye}>
                                                    <MaterialCommunityIcons name="calendar-check-outline" size={16} color={Colors.theme.harvestGold} />
                                                </View>
                                            ) : item.user_2_pfp_url ? (
                                                <Image source={{ uri: item.user_2_pfp_url }} style={styles.pickerAvatar} />
                                            ) : (
                                                <View style={styles.pickerAvatarBye}>
                                                    <MaterialCommunityIcons name="shield-outline" size={16} color={Colors.theme.harvestGold} />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

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
        borderWidth: 2,
        borderColor: Colors.theme.harvestGold,
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
        fontSize: 43, // Scaled down by 10% for viewport safety
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
        borderColor: Colors.theme.harvestGold,
        marginBottom: 10,
    },
    bigAvatarRight: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.theme.harvestGold,
        marginBottom: 10,
    },
    fallbackAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.theme.harvestGold,
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
        borderColor: Colors.theme.harvestGold,
        backgroundColor: '#262525',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    smallFallbackAvatar: {
        backgroundColor: '#262525',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
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
        gap: 4,
        paddingHorizontal: 4,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44, // Enforce strict 44px height alignment
        gap: 0,
    },
    macroBarSideLeft: {
        flex: 1,
    },
    macroBarSideRight: {
        flex: 1,
    },
    sliderTrackWrapper: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        gap: 2,
    },
    sliderLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sliderLabelConsumed: {
        color: Colors.theme.harvestGold,
        fontSize: 10,
        fontWeight: '700',
    },
    sliderLabelRemaining: {
        color: 'rgba(237,232,213,0.45)',
        fontSize: 10,
        fontWeight: '500',
    },
    macroBarBg: {
        flexDirection: 'row',
        height: 20, // Premium plump height
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    macroBarFill: {
        height: '100%',
        borderRadius: 10,
    },
    macroIconCenter: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sliderLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        color: 'rgba(237,232,213,0.55)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
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
        width: 110,
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
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
        gap: 6,
        maxWidth: '85%',
    },
    dropdownText: {
        color: '#EDE8D5',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerCard: {
        width: '85%',
        maxHeight: '60%',
        backgroundColor: '#262525',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: Colors.theme.harvestGold,
        padding: 20,
    },
    pickerTitle: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 213, 0.08)',
    },
    pickerRowActive: {
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        borderRadius: 12,
    },
    pickerCompetitorBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '42%',
    },
    pickerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
    },
    pickerName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        flex: 1,
    },
    pickerVsLabel: {
        color: '#787878',
        fontSize: 11,
        fontWeight: '900',
        width: '12%',
        textAlign: 'center',
    },
    pickerAvatarBye: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
