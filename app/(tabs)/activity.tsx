import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedPost } from '../../src/shared/models/types';
import { NutritionService } from '../../src/shared/services/NutritionService';
import { Colors } from '../../src/shared/theme/Colors';
import { PostStore } from '../../store/PostStore';
import { WeightEntry, WeightStore } from '../../store/WeightStore';
import { useUserStore } from '../../store/UserStore';
import { AccountabilityDashboard } from '../../src/features/tribes/components/dashboards/AccountabilityDashboard';
import { H2HUserMatchupDashboard } from '../../src/features/tribes/components/dashboards/H2HUserMatchupDashboard';
import { H2HLeaderboardDashboard } from '../../src/features/tribes/components/dashboards/H2HLeaderboardDashboard';
import { PremierH2HLeaderboardDashboard } from '../../src/features/tribes/components/dashboards/PremierH2HLeaderboardDashboard';
import { DashboardCarousel } from '../../src/features/tribes/components/dashboards/DashboardCarousel';
import { TradTribeBattleDashboard } from '../../src/features/tribes/components/dashboards/TradTribeBattleDashboard';
import { TradTribeBattleUserMatchup } from '../../src/features/tribes/components/dashboards/TradTribeBattleUserMatchup';
import { LayoutAnimation } from 'react-native';
import { CalendarModal } from '../../src/features/feed/components/CalendarModal';
import { TradTribeBattleLeaderboard } from '../../src/features/tribes/components/dashboards/TradTribeBattleLeaderboard';
import { PremierTribeBattleDashboard } from '../../src/features/tribes/components/dashboards/PremierTribeBattleDashboard';
import { PremierTribeBattleLeaderboard } from '../../src/features/tribes/components/dashboards/PremierTribeBattleLeaderboard';
import { TabonoLogo } from '../../src/shared/components/TabonoLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock Data for League
const LEAGUE_DATA = [
    { name: 'kwadub', rank: 1, score: 45, change: 5, direction: 'up' },
    { name: 'Hud2x', rank: 2, score: 40, change: -3, direction: 'down' },
    { name: 'cheaterMeservy', rank: 3, score: 34, change: -4, direction: 'down' },
    { name: 'DookieDrew30', rank: 4, score: 32, change: 1, direction: 'up' },
    { name: 'BellPepper', rank: 5, score: 18, change: 4, direction: 'none' },
];

export default function DashboardScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const [dailyTotals, setDailyTotals] = useState({ cals: 0, macros: { p: 0, c: 0, f: 0 } });
    const [isFlipped, setIsFlipped] = useState(false);
    const [weights, setWeights] = useState<WeightEntry[]>([]);
    const [estimatedWeight, setEstimatedWeight] = useState<number | null>(null);
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        return sunday;
    });

    const translateX = useRef(new Animated.Value(0)).current;
    const [isAnimating, setIsAnimating] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    // Measured at runtime via onLayout so pixel positions are always accurate
    const [chartWidth, setChartWidth] = useState(320);

    const TARGET_WEIGHT = 236;

    // Sync with UserStore
    const goals = userInfo.macroTargets;
    const calorieGoal = goals.calories;

    const getWeekDates = (start: Date) => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    };

    const currentWeekDates = getWeekDates(weekStart);
    const toDataDate = (date: Date) => {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
    };
    const toDisplayDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;

    const weekDatesStrings = currentWeekDates.map(toDataDate);
    const weekDisplayStrings = currentWeekDates.map(toDisplayDate);

    // ⚠️ currentWeights MUST be defined before maxDev — maxDev is scoped to THIS week
    // only so that entries close to the target don't get dwarfed by historical extremes.
    const currentWeights = weights.filter(w => weekDatesStrings.includes(w.date));
    const currentWeekDeviations = currentWeights.map(w => Math.abs(w.weight - TARGET_WEIGHT));
    // Minimum span of ±10 so the chart doesn't zoom in too aggressively on tiny changes
    const maxDev = Math.max(10, ...currentWeekDeviations);

    const CHART_H = 200;  // keep in sync with styles.chartArea.height
    const YAXIS_W = 0;    // width reserved for the Y-axis column on the left

    const getXPos = (dateStr: string) => {
        const index = weekDatesStrings.indexOf(dateStr);
        if (index === -1) return null;
        // Evenly distributed across 7 columns (centers at 7.14%, 21.43%, etc.)
        return 7.14 + index * 14.29;
    };

    const getYPos = (weight: number) => {
        const diff = weight - TARGET_WEIGHT;
        const percentage = 50 - (diff / maxDev) * 50;
        return Math.max(2, Math.min(98, percentage));
    };

    // Expanded zoom: Move gridlines closer to edges (12.5% and 87.5% instead of 25/75)
    const topGridPct    = 0.125; 
    const bottomGridPct = 0.875; 
    // Inverse of getYPos: what weight maps to a given y%?
    // yPct = 50 - (diff/maxDev)*50  =>  diff = (50 - yPct) / 50 * maxDev
    const weightAtPct = (pct: number) => TARGET_WEIGHT + ((50 - pct * 100) / 50) * maxDev;
    const topGridWeight    = Math.round(weightAtPct(topGridPct));
    const bottomGridWeight = Math.round(weightAtPct(bottomGridPct));

    const currentWeekAverage = currentWeights.length > 0
        ? (currentWeights.reduce((sum, w) => sum + w.weight, 0) / currentWeights.length).toFixed(1)
        : null;

    useEffect(() => {
        const fetchAndCalculate = async () => {
            const posts = await PostStore.loadPosts();
            calculate(posts);
        };

        const calculate = (posts: FeedPost[]) => {
            const userPosts = posts.filter(p => p.user.handle === userInfo.handle);
            const meals = userPosts.map(p => p.meal).filter(m => m !== undefined);
            const totals = NutritionService.sumMacros(meals as any);
            setDailyTotals(totals);
        };

        fetchAndCalculate();

        const loadWeights = async () => {
            const data = await WeightStore.loadWeights();
            setWeights(data);
            const est = await WeightStore.getEstimatedWeight();
            setEstimatedWeight(est);
        };
        loadWeights();

        const unsubPosts = PostStore.subscribe(calculate);
        const unsubWeights = WeightStore.subscribe(async (newData) => {
            setWeights(newData);
            const est = await WeightStore.getEstimatedWeight();
            setEstimatedWeight(est);
        });

        return () => {
            unsubPosts();
            unsubWeights();
        };
    }, [userInfo.handle]);

    const handleReset = async () => {
        await PostStore.clearPosts();
        await WeightStore.clearWeights();
        await PostStore.clearPostLikes(userInfo.handle);
        userInfo.setStatus('none');
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderGrant: () => {
                setScrollEnabled(false);
            },
            onPanResponderMove: (_, gestureState) => {
                if (isAnimating) return;
                translateX.setValue(gestureState.dx);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (isAnimating) return;
                if (Math.abs(gestureState.dx) > 50) {
                    const direction = gestureState.dx > 0 ? 'prev' : 'next';
                    changeWeek(direction);
                } else {
                    Animated.spring(translateX, { toValue: 0, friction: 6, useNativeDriver: true }).start(() => setScrollEnabled(true));
                }
            },
        })
    ).current;

    const changeWeek = (direction: 'prev' | 'next') => {
        setIsAnimating(true);
        Animated.timing(translateX, {
            toValue: direction === 'prev' ? SCREEN_WIDTH : -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setWeekStart(current => {
                const nextDate = new Date(current);
                nextDate.setDate(nextDate.getDate() + (direction === 'next' ? 7 : -7));
                return nextDate;
            });
            translateX.setValue(direction === 'prev' ? -SCREEN_WIDTH : SCREEN_WIDTH);
            Animated.spring(translateX, { toValue: 0, friction: 8, useNativeDriver: true }).start(() => {
                setIsAnimating(false);
                setScrollEnabled(true);
            });
        });
    };

    const MacroRow = ({ icon, consumed, goal, color, unit = 'g' }: any) => {
        let remaining = goal - consumed;
        let overflow = 0;
        if (remaining < 0) {
            overflow = -remaining;
            remaining = 0;
        }

        const totalForScale = Math.max(goal, consumed);
        const wPct = (v: number) => (totalForScale > 0 ? (v / totalForScale) * 100 : 0);

        const renderSeg = (val: number, bg: string, textCol: string) => {
            if (val <= 0) return null;
            const pct = wPct(val);
            const isSmall = pct < 12;
            return (
                <View style={[styles.macroSeg, { width: `${pct}%`, backgroundColor: bg }]}>
                    {!isSmall && <Text style={[styles.macroSegText, { color: textCol }]} numberOfLines={1}>{val}</Text>}
                </View>
            );
        }

        const renderSub = (val: number, textCol: string, align: 'center'|'left'|'right' = 'center') => {
            if (val <= 0) return null;
            const pct = wPct(val);
            const isSmall = pct < 12;
            return (
                <View style={{ width: `${pct}%` }}>
                    {isSmall && (
                        <View style={{ position: 'absolute', top: 2, left: '50%', width: 20, marginLeft: -10, alignItems: 'center', overflow: 'visible' }}>
                            <Ionicons name="chevron-up" size={12} color={textCol} style={{ marginBottom: -4 }} />
                            <View style={{
                                position: 'absolute',
                                top: 12,
                                width: 100,
                                alignItems: align === 'left' ? 'flex-end' : align === 'right' ? 'flex-start' : 'center',
                                ...(align === 'left' ? { right: 10, paddingRight: 2 } : align === 'right' ? { left: 10, paddingLeft: 2 } : { left: -40 })
                            }}>
                                <Text style={[styles.macroSegText, { color: textCol, fontSize: 10 }]} numberOfLines={1}>{val}</Text>
                            </View>
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View style={styles.macroRowRow}>
                <View style={styles.macroIconBox}>
                    <MaterialCommunityIcons name={icon} size={24} color={Colors.primary} />
                </View>
                <View style={styles.macroTrackWrap}>
                    <View style={styles.macroTrack}>
                        {renderSeg(consumed, Colors.primary, 'white')}
                        {renderSeg(remaining, '#787D78', 'white')}
                    </View>
                    <View style={{ flexDirection: 'row', height: 20, position: 'relative' }}>
                        {renderSub(consumed, Colors.primary, 'left')}
                        {renderSub(remaining, '#787D78', 'center')}
                        {overflow > 0 && (
                            <View style={{ position: 'absolute', right: -5, top: 0, alignItems: 'flex-end', overflow: 'visible' }}>
                                <Ionicons name="chevron-up" size={12} color="#F06565" style={{ marginBottom: -4, marginRight: 2 }} />
                                <View style={{ width: 100, alignItems: 'flex-end' }}>
                                    <Text style={[styles.macroSegText, { color: '#F06565', fontSize: 10 }]} numberOfLines={1}>-{overflow}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <TabonoLogo size={40} color={Colors.primary} />
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={scrollEnabled}
            >
                {/* Macro Dashboard */}
                <View style={styles.dashboardCard}>
                    <View style={styles.macroListContainer}>
                        <MacroRow
                            icon="fire"
                            consumed={dailyTotals.cals}
                            goal={calorieGoal}
                            unit="cals"
                        />
                        <MacroRow
                            icon="food-drumstick"
                            consumed={dailyTotals.macros.p}
                            goal={goals.p}
                        />
                        <MacroRow
                            icon="barley"
                            consumed={dailyTotals.macros.c}
                            goal={goals.c}
                        />
                        <MacroRow
                            icon="water"
                            consumed={dailyTotals.macros.f}
                            goal={goals.f}
                        />
                    </View>
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                            <Text style={styles.legendText}>Logged</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={{ gap: 2 }}>
                                <View style={[styles.legendDot, { backgroundColor: '#787D78' }]} />
                                <View style={[styles.legendDot, { backgroundColor: '#F06565' }]} />
                            </View>
                            <Text style={styles.legendText}>Remaining</Text>
                        </View>
                    </View>
                </View>

                {/* Weight Chart */}
                <View style={[styles.weightCard, { backgroundColor: '#A9BAA2', borderColor: '#4F6352', borderWidth: 1 }]} {...panResponder.panHandlers}>
                    <Animated.View style={{ transform: [{ translateX }] }}>
                        <View style={styles.weightHeader}>
                            <View style={styles.weekHeaderRow}>
                                <TouchableOpacity onPress={() => setIsCalendarVisible(true)} style={styles.weekHeaderBtn}>
                                    <Text style={styles.weightAvgTitle}>Week of {weekDisplayStrings[0]}</Text>
                                    <Ionicons name="calendar-outline" size={14} color="#4F6352" style={{ marginLeft: 5 }} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/weight-history')}>
                                <Text style={styles.weeklyWeightTitle}>Estimated weight</Text>
                            </TouchableOpacity>
                            
                            <View style={styles.weightBadge}>
                                <Text style={styles.weightBadgeText}>
                                    {estimatedWeight ? `${estimatedWeight.toFixed(1)} lbs` : '236.0 lbs'}
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.dotsButton} onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsDescExpanded(!isDescExpanded);
                            }}>
                                <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" />
                            </TouchableOpacity>

                            {isDescExpanded && (
                                <Text style={styles.weightDescText}>
                                    Average of the daily, logged weights for this week
                                </Text>
                            )}
                        </View>

                        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/weight-history')} style={styles.chartAreaWrapper}>
                        <View
                            style={styles.chartArea}
                            onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
                        >
                            {/* ---- Grid lines (solid, very faint sage) ---- */}
                            <View style={[styles.gridLine, { top: topGridPct * CHART_H }]} />
                            <View style={[styles.gridLine, { top: bottomGridPct * CHART_H }]} />

                            {/* Dashed target line — full width, matching grid lines */}
                            <View style={styles.targetAvgContainer}>
                                <View style={styles.targetDashedLineRow}>
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <View key={i} style={styles.targetDashSegment} />
                                    ))}
                                </View>
                            </View>

                            {/* ---- Dots + labels ---- */}
                            <View style={styles.markersLayer}>
                                {currentWeights.map((w, i) => {
                                    const xPercent = getXPos(w.date);
                                    if (xPercent === null) return null;
                                    const yPercent = getYPos(w.weight);

                                    const DOT_RADIUS = 4;
                                    // Plot area starts after Y-axis column
                                    const plotWidth = chartWidth - YAXIS_W;

                                    const dotCenterPx = (yPercent / 100) * CHART_H;
                                    const dotTopPx    = dotCenterPx - DOT_RADIUS;
                                    const dotLeftPx   = YAXIS_W + (xPercent / 100) * plotWidth - DOT_RADIUS;

                                    // Target line band for collision detection
                                    const TARGET_LINE_TOP = 0.50 * CHART_H - 20;
                                    const TARGET_LINE_BOT = 0.50 * CHART_H + 6;

                                    const LABEL_H = 14;
                                    const GAP = 5;

                                    const labelAboveBot = dotCenterPx - DOT_RADIUS - GAP;
                                    const labelAboveTop = labelAboveBot - LABEL_H;
                                    const labelBelowTop = dotCenterPx + DOT_RADIUS + GAP;
                                    const labelBelowBot = labelBelowTop + LABEL_H;

                                    const collidesTargetAbove = labelAboveBot > TARGET_LINE_TOP && labelAboveTop < TARGET_LINE_BOT;
                                    const collidesTargetBelow = labelBelowBot > TARGET_LINE_TOP && labelBelowTop < TARGET_LINE_BOT;

                                    const aboveClear = !collidesTargetAbove && labelAboveTop > 0;
                                    const belowClear = !collidesTargetBelow && labelBelowBot < CHART_H;

                                    const dotAboveTarget = dotCenterPx < CHART_H * 0.50;
                                    const placeAbove = dotAboveTarget
                                        ? (aboveClear || !belowClear)
                                        : (!aboveClear && belowClear ? false : aboveClear);

                                    const labelTopPx  = placeAbove
                                        ? dotCenterPx - DOT_RADIUS - GAP - LABEL_H
                                        : dotCenterPx + DOT_RADIUS + GAP;
                                    const labelLeftPx = YAXIS_W + (xPercent / 100) * plotWidth - 30;

                                    const displayWeight = parseFloat(w.weight.toString()).toFixed(1);

                                    return (
                                        <View key={i}>
                                            <View style={[
                                                styles.marker,
                                                { left: dotLeftPx, top: dotTopPx }
                                            ]}>
                                                <View style={styles.markerDot} />
                                            </View>
                                            <View style={{
                                                position: 'absolute',
                                                left: labelLeftPx,
                                                top: labelTopPx,
                                                width: 60,
                                                alignItems: 'center',
                                            }}>
                                                <Text style={styles.markerLabel}>
                                                    {displayWeight}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                        </TouchableOpacity>

                        <View style={styles.weightFooter}>
                            {/* Legend row */}
                            <View style={styles.legendRow}>
                                <Text style={styles.legendLabel}>
                                    End of week target · {TARGET_WEIGHT}.0 lbs
                                </Text>
                                <View style={styles.legendDashRow}>
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <View key={i} style={styles.legendDashSegment} />
                                    ))}
                                </View>
                            </View>
                            {/* Day columns — Perfectly aligned with dot columns */}
                            <View style={[styles.daysRow, { 
                                marginLeft: YAXIS_W, 
                                width: chartWidth - YAXIS_W 
                            }]}>
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => {
                                    const isToday = toDataDate(new Date()) === weekDatesStrings[i];
                                    return (
                                        <View key={i} style={styles.dayCol}>
                                            <View style={[styles.dayColInner, isToday && styles.dayColToday]}>
                                                <Text style={styles.dayName}>{day}</Text>
                                                <Text style={styles.dayDate} numberOfLines={1}>{weekDisplayStrings[i]}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                <CalendarModal 
                    visible={isCalendarVisible} 
                    onClose={() => setIsCalendarVisible(false)}
                    initialDate={weekStart}
                    onSelectDate={(date) => {
                        // find the previous Sunday
                        const d = new Date(date);
                        d.setDate(d.getDate() - d.getDay());
                        setWeekStart(d);
                    }}
                />

                {/* New Dashboards will go here */}
                <View style={styles.dashboardsContainer}>
                    <AccountabilityDashboard />

                    <DashboardCarousel>
                        <H2HUserMatchupDashboard />
                        <H2HLeaderboardDashboard />
                    </DashboardCarousel>

                    <DashboardCarousel>
                        <TradTribeBattleDashboard />
                        <TradTribeBattleUserMatchup />
                        <TradTribeBattleLeaderboard />
                        <TradTribeBattleLeaderboard />
                    </DashboardCarousel>

                    <DashboardCarousel>
                        <PremierH2HLeaderboardDashboard />
                    </DashboardCarousel>

                    <DashboardCarousel>
                        <PremierTribeBattleDashboard />
                        <PremierTribeBattleLeaderboard />
                        <PremierTribeBattleLeaderboard />
                    </DashboardCarousel>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    iconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    dashboardCard: {
        backgroundColor: Colors.card,
        borderRadius: 35,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
    },
    macroListContainer: {
        gap: 8,
    },
    macroRowRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    macroIconBox: {
        width: 30,
        alignItems: 'center',
        marginTop: 6,
    },
    macroTrackWrap: {
        flex: 1,
        marginLeft: 15,
    },
    macroTrack: {
        height: 36,
        backgroundColor: 'transparent',
        borderRadius: 18,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    macroSeg: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    macroSegText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    legendContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        gap: 20, 
        marginTop: 8
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 14, height: 14, borderRadius: 7 },
    legendText: { color: Colors.textDark, fontSize: 12 },
    weightCard: {
        backgroundColor: Colors.card,
        borderRadius: 35,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
    },
    weightHeader: {
        alignItems: 'center',
        marginBottom: 4,
    },
    weekHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weeklyWeightTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 2,
        marginBottom: 8,
    },
    weightAvgTitle: {
        color: '#4F6352', // dark sage
        fontSize: 14,
        fontWeight: 'bold',
    },
    weightBadgeText: {
        color: '#2d4734',
        fontWeight: 'bold',
        fontSize: 16,
    },
    weightBadge: {
        // Match the cream/sage palette: cream bg with sage border, same as chart area
        backgroundColor: '#EFF0E1',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#4F6352',
    },
    dotsButton: {
        padding: 5,
        marginTop: 2,
    },
    weightDescText: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 5,
    },
    chartAreaWrapper: {
        backgroundColor: '#EFF0E1',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#4F6352',
        marginHorizontal: 0,
        paddingTop: 16,
        marginBottom: 0,
        paddingBottom: 0,
    },
    chartArea: {
        height: 200,
        position: 'relative',
        marginTop: 5,
        marginBottom: 8,
    },
    actualAvgContainer: {
        position: 'absolute',
        top: '30%',
        left: 0,
        right: 0,
    },
    actualAvgLabel: {
        color: '#e6ede6',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    actualAvgLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#e6ede6',
    },
    targetAvgContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        marginTop: -1,
    },
    targetLabel: {
        color: '#4F6352',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 5,
    },
    targetDashedLineRow: {
        flexDirection: 'row',
        gap: 4,
    },
    targetDashSegment: {
        flex: 1,
        height: 1.5,
        backgroundColor: '#4F6352',
    },
    markersLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(79, 99, 82, 0.10)',
    },
    chartTopBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#4F6352',
        opacity: 0.2,
    },
    marker: {
        position: 'absolute',
        // No transform needed — dotTopPx already centres the dot via (dotCenterPx - DOT_RADIUS)
    },
    markerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EFF0E1',
        borderWidth: 1.5,
        borderColor: '#4F6352',
    },
    markerLabel: {
        color: '#4F6352',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    weightFooter: {
        marginTop: 8,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    legendLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontWeight: '500',
    },
    legendDashRow: {
        flexDirection: 'row',
        gap: 3,
        alignItems: 'center',
    },
    legendDashSegment: {
        width: 6,
        height: 1.5,
        backgroundColor: '#4F6352',
    },
    daysRow: {
        flexDirection: 'row',
    },
    dayCol: {
        flex: 1,
        alignItems: 'center',
    },
    dayColInner: {
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 34,
    },
    dayName: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    dayDate: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
        // Prevent wrapping — dates like 4/18 must stay on one line
        flexShrink: 0,
    },
    dayColToday: {
        backgroundColor: '#4F6352',
    },
    dashboardsContainer: {
        gap: 20,
        paddingBottom: 40,
    }
});
