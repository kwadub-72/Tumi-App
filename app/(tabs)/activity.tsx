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
import { TradTribeBattleLeaderboard } from '../../src/features/tribes/components/dashboards/TradTribeBattleLeaderboard';
import { PremierTribeBattleDashboard } from '../../src/features/tribes/components/dashboards/PremierTribeBattleDashboard';
import { PremierTribeBattleLeaderboard } from '../../src/features/tribes/components/dashboards/PremierTribeBattleLeaderboard';

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
    const [weekStart, setWeekStart] = useState(() => new Date('2025-12-21'));

    const translateX = useRef(new Animated.Value(0)).current;
    const [isAnimating, setIsAnimating] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const TARGET_WEIGHT = 250;
    const deviations = weights.map(w => Math.abs(w.weight - TARGET_WEIGHT));
    const maxDev = Math.max(10, ...deviations);

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
    const toDataDate = (date: Date) => date.toISOString().split('T')[0];
    const toDisplayDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;

    const weekDatesStrings = currentWeekDates.map(toDataDate);
    const weekDisplayStrings = currentWeekDates.map(toDisplayDate);

    const getXPos = (dateStr: string) => {
        const index = weekDatesStrings.indexOf(dateStr);
        if (index === -1) return null;
        return 10 + (index * 14);
    };

    const getYPos = (weight: number) => {
        const diff = weight - TARGET_WEIGHT;
        const percentage = 50 - (diff / maxDev) * 50;
        return Math.max(0, Math.min(100, percentage));
    };

    const currentWeights = weights.filter(w => weekDatesStrings.includes(w.date));
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
        };
        loadWeights();

        const unsubPosts = PostStore.subscribe(calculate);
        const unsubWeights = WeightStore.subscribe(setWeights);

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
        const isOverflow = consumed > goal;
        const overflow = Math.max(0, consumed - goal);
        const displayedConsumed = Math.min(consumed, goal);
        const remaining = Math.max(0, goal - consumed);
        const total = goal || 1;
        const consumedWidth = (displayedConsumed / total) * 100;
        const remainingWidth = Math.max(0, (remaining / total) * 100);

        return (
            <View style={styles.macroRow}>
                <View style={styles.macroIconContainer}>
                    <MaterialCommunityIcons name={icon} size={28} color={Colors.primary} />
                </View>
                <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${consumedWidth}%`, backgroundColor: Colors.primary }]}>
                        <Text style={styles.sliderText}>{displayedConsumed}{unit === 'cals' ? '' : unit}</Text>
                    </View>
                    <View style={[styles.sliderEmpty, { width: `${remainingWidth}%` }]}>
                        <Text style={[styles.remainingText, isOverflow && { color: Colors.error }]}>
                            {isOverflow ? `+${overflow}` : remaining}{unit === 'cals' ? '' : unit}
                        </Text>
                    </View>
                </View>
                <Text style={styles.goalHint}>{goal}{unit === 'cals' ? ' cals' : unit}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Tumi</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={scrollEnabled}
            >
                {/* Macro Dashboard */}
                <View style={styles.dashboardCard}>
                    <MacroRow
                        icon="fire"
                        consumed={dailyTotals.cals}
                        goal={calorieGoal}
                        unit="cals"
                    />
                    <View style={styles.divider} />
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

                {/* Weight Chart */}
                <View style={styles.weightCard} {...panResponder.panHandlers}>
                    <Animated.View style={{ transform: [{ translateX }] }}>
                        <View style={styles.weightHeader}>
                            <Text style={styles.weightAvgTitle}>Average vs Target</Text>
                            <View style={styles.weightBadge}>
                                <Text style={styles.weightBadgeText}>{currentWeekAverage || '--'} lbs</Text>
                            </View>
                        </View>

                        <View style={styles.chartArea}>
                            <View style={styles.targetDashedLine} />
                            <Text style={styles.targetLabel}>{TARGET_WEIGHT} lbs</Text>

                            <View style={styles.markersLayer}>
                                {currentWeights.map((w, i) => {
                                    const x = getXPos(w.date);
                                    if (x === null) return null;
                                    return (
                                        <View key={i} style={[styles.marker, { left: `${x}%`, top: `${getYPos(w.weight)}%` }]}>
                                            <Text style={styles.markerText}>{w.weight}</Text>
                                            <Text style={styles.markerX}>✕</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.weightFooter}>
                            <View style={[styles.divider, { backgroundColor: 'white', opacity: 0.3 }]} />
                            <View style={styles.daysRow}>
                                {['Su', 'M', 'T', 'W', 'Th', 'F', 'S'].map((day, i) => (
                                    <View key={i} style={styles.dayCol}>
                                        <Text style={styles.dayName}>{day}</Text>
                                        <Text style={styles.dayDate}>{weekDisplayStrings[i]}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </View>

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
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    macroIconContainer: {
        width: 30,
        alignItems: 'center',
    },
    sliderTrack: {
        flex: 1,
        height: 36,
        backgroundColor: 'white',
        borderRadius: 18,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    sliderFill: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderEmpty: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    remainingText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    goalHint: {
        width: 55,
        fontSize: 10,
        color: 'white',
        opacity: 0.8,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: 'white',
        opacity: 0.2,
        marginVertical: 8,
    },
    weightCard: {
        backgroundColor: Colors.card,
        borderRadius: 35,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.4)',
    },
    weightHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
    },
    weightAvgTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    weightBadge: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    weightBadgeText: {
        color: 'white',
        fontWeight: 'bold',
    },
    chartArea: {
        height: 120,
        position: 'relative',
        justifyContent: 'center',
    },
    targetDashedLine: {
        width: '100%',
        height: 1,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        borderStyle: 'dashed',
    },
    targetLabel: {
        position: 'absolute',
        left: 0,
        top: '40%',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
    },
    markersLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    marker: {
        position: 'absolute',
        alignItems: 'center',
        transform: [{ translateX: -15 }, { translateY: -15 }],
    },
    markerText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    markerX: {
        color: 'white',
        fontWeight: 'bold',
    },
    weightFooter: {
        marginTop: 10,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dayCol: {
        alignItems: 'center',
    },
    dayName: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    dayDate: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
    },
    dashboardsContainer: {
        gap: 20,
        paddingBottom: 40,
    }
});
