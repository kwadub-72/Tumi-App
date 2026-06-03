import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, LayoutAnimation, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NutritionService } from '../../src/shared/services/NutritionService';
import { Colors } from '../../src/shared/theme/Colors';
import { PostStore } from '../../store/PostStore';
import { WeightEntry, WeightStore } from '../../store/WeightStore';
import { useUserStore } from '../../store/UserStore';
import { useAuthStore } from '../../store/AuthStore';
import { SupabasePostService } from '../../src/shared/services/SupabasePostService';
import { CalendarModal } from '../../src/features/feed/components/CalendarModal';
import { TabonoLogo } from '../../src/shared/components/TabonoLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const [dailyTotals, setDailyTotals] = useState({ cals: 0, macros: { p: 0, c: 0, f: 0 } });
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
    const [chartWidth, setChartWidth] = useState(320);

    const { profile } = useAuthStore();

    const TARGET_WEIGHT = profile?.weight_lbs || userInfo.weight || 200;

    // Sync with AuthStore / UserStore
    const goals = profile?.macro_targets || userInfo.macroTargets;
    const calorieGoal = goals.calories || (goals.p * 4) + (goals.c * 4) + (goals.f * 9);

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

    const currentWeights = weights.filter(w => weekDatesStrings.includes(w.date));
    const currentWeekDeviations = currentWeights.map(w => Math.abs(w.weight - TARGET_WEIGHT));
    const maxDev = Math.max(10, ...currentWeekDeviations);

    const CHART_H = 200;  // keep in sync with styles.chartArea.height
    const YAXIS_W = 0;    // width reserved for the Y-axis column on the left

    const getXPos = (dateStr: string) => {
        const index = weekDatesStrings.indexOf(dateStr);
        if (index === -1) return null;
        return 7.14 + index * 14.29;
    };

    const getYPos = (weight: number) => {
        const diff = weight - TARGET_WEIGHT;
        const percentage = 50 - (diff / maxDev) * 50;
        return Math.max(2, Math.min(98, percentage));
    };

    const topGridPct    = 0.125; 
    const bottomGridPct = 0.875; 

    const fetchTodayMacros = useCallback(async () => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        try {
            const posts = await SupabasePostService.getFeed({
                userId,
                feedType: 'diary',
                date: start,
            });
            const meals = posts.map(p => p.meal).filter(m => m !== undefined);
            const totals = NutritionService.sumMacros(meals as any);
            setDailyTotals(totals);

            // Fetch and set weight data from Supabase
            const weightData = await WeightStore.loadWeights();
            setWeights(weightData);
            const est = await WeightStore.getEstimatedWeight();
            setEstimatedWeight(est);
        } catch (error) {
            console.error('Failed to fetch today macros & weights:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTodayMacros();
        }, [fetchTodayMacros])
    );

    useEffect(() => {
        fetchTodayMacros();
    }, [profile?.id, fetchTodayMacros]);

    useEffect(() => {
        const loadWeights = async () => {
            const data = await WeightStore.loadWeights();
            setWeights(data);
            const est = await WeightStore.getEstimatedWeight();
            setEstimatedWeight(est);
        };
        loadWeights();

        const unsubWeights = WeightStore.subscribe(async (newData) => {
            setWeights(newData);
            const est = await WeightStore.getEstimatedWeight();
            setEstimatedWeight(est);
        });

        return () => {
            unsubWeights();
        };
    }, []);

    const handleReset = async () => {
        await PostStore.clearPosts();
        await WeightStore.clearWeights();
        await PostStore.clearPostLikes(profile?.handle || userInfo.handle);
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

    const MacroRow = ({ icon, label, consumed, goal, unit }: { icon: string; label: string; consumed: number; goal: number; unit: string }) => {
        const totalVal = Math.max(goal, consumed);
        const goldPct = totalVal > 0 ? (Math.min(goal, consumed) / totalVal) * 100 : 0;
        const redPct = totalVal > 0 && consumed > goal ? ((consumed - goal) / totalVal) * 100 : 0;

        return (
            <View style={styles.macroRowRow}>
                <View style={styles.macroIconBox}>
                    {icon === 'fire' ? (
                        <MaterialCommunityIcons name="fire" size={30} color={Colors.theme.harvestGold} />
                    ) : (
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: Colors.theme.harvestGold,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Text style={{
                                color: Colors.theme.matteBlack,
                                fontSize: 13,
                                fontWeight: 'bold',
                                lineHeight: 15,
                            }}>
                                {icon === 'food-drumstick' ? 'P' : icon === 'barley' ? 'C' : 'F'}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.macroTrackWrap}>
                    <View style={styles.macroHeaderRow}>
                        <Text style={styles.macroLabelText}>{label}</Text>
                        <Text style={styles.macroValueText}>
                            {Math.round(consumed)}
                            <Text style={styles.macroUnitText}>{unit}</Text>
                            <Text style={{ color: Colors.theme.dust, opacity: 0.6 }}> / </Text>
                            {Math.round(goal)}
                            <Text style={styles.macroUnitText}>{unit}</Text>
                        </Text>
                    </View>
                    <View style={styles.macroTrack}>
                        <View style={[styles.macroSeg, { width: `${goldPct}%`, backgroundColor: Colors.theme.harvestGold }]} />
                        {redPct > 0 && (
                            <View style={[styles.macroSeg, { width: `${redPct}%`, backgroundColor: '#FF4B4B' }]} />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={24} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <TabonoLogo size={40} color={Colors.theme.harvestGold} />
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
                            label="Calories"
                            consumed={dailyTotals.cals}
                            goal={calorieGoal}
                            unit="cals"
                        />
                        <MacroRow
                            icon="food-drumstick"
                            label="Protein"
                            consumed={dailyTotals.macros.p}
                            goal={goals.p}
                            unit="g"
                        />
                        <MacroRow
                            icon="barley"
                            label="Carbs"
                            consumed={dailyTotals.macros.c}
                            goal={goals.c}
                            unit="g"
                        />
                        <MacroRow
                            icon="water"
                            label="Fats"
                            consumed={dailyTotals.macros.f}
                            goal={goals.f}
                            unit="g"
                        />
                    </View>
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: Colors.theme.harvestGold }]} />
                            <Text style={styles.legendText}>Logged</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#2D2D2D' }]} />
                            <Text style={styles.legendText}>Remaining</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FF4B4B' }]} />
                            <Text style={styles.legendText}>Overage</Text>
                        </View>
                    </View>
                </View>

                {/* Weight Chart Dashboard */}
                <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => router.push('/weight-trends-deep-dive')}
                    style={styles.weightCard} 
                    {...panResponder.panHandlers}
                >
                    <Animated.View style={{ transform: [{ translateX }] }}>
                        <View style={styles.weightHeader}>
                            <View style={styles.weekHeaderRow}>
                                <TouchableOpacity onPress={() => setIsCalendarVisible(true)} style={styles.weekHeaderBtn}>
                                    <Text style={styles.weightAvgTitle}>Week of {weekDisplayStrings[0]}</Text>
                                    <Ionicons name="calendar-outline" size={14} color={Colors.theme.dust} style={{ marginLeft: 5 }} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.weeklyWeightTitle}>Estimated Weight</Text>
                            
                            <View style={styles.weightBadge}>
                                <Text style={styles.weightBadgeText}>
                                    {estimatedWeight ? `${estimatedWeight.toFixed(1)} lbs` : `${TARGET_WEIGHT.toFixed(1)} lbs`}
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.dotsButton} onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsDescExpanded(!isDescExpanded);
                            }}>
                                <MaterialCommunityIcons name="dots-horizontal" size={24} color={Colors.theme.dust} />
                            </TouchableOpacity>

                            {isDescExpanded && (
                                <Text style={styles.weightDescText}>
                                    Average of the daily, logged weights for this week
                                </Text>
                            )}
                        </View>

                        <View style={styles.chartAreaWrapper}>
                            <View
                                style={styles.chartArea}
                                onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
                            >
                                {/* ---- Grid lines ---- */}
                                <View style={[styles.gridLine, { top: topGridPct * CHART_H }]} />
                                <View style={[styles.gridLine, { top: bottomGridPct * CHART_H }]} />

                                {/* ---- Dots + labels ---- */}
                                <View style={styles.markersLayer}>
                                    {currentWeights.map((w, i) => {
                                        const xPercent = getXPos(w.date);
                                        if (xPercent === null) return null;
                                        const yPercent = getYPos(w.weight);

                                        const DOT_RADIUS = 4;
                                        const plotWidth = chartWidth - YAXIS_W;

                                        const dotCenterPx = (yPercent / 100) * CHART_H;
                                        const dotTopPx    = dotCenterPx - DOT_RADIUS;
                                        const dotLeftPx   = YAXIS_W + (xPercent / 100) * plotWidth - DOT_RADIUS;

                                        const LABEL_H = 14;
                                        const GAP = 5;

                                        const labelTopPx  = dotCenterPx - DOT_RADIUS - GAP - LABEL_H > 0
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
                        </View>

                        <View style={styles.weightFooter}>
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
                                                <Text style={[styles.dayName, isToday && { color: Colors.theme.matteBlack }]}>{day}</Text>
                                                <Text style={[styles.dayDate, isToday && { color: Colors.theme.matteBlack }]} numberOfLines={1}>{weekDisplayStrings[i]}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>

                <CalendarModal 
                    visible={isCalendarVisible} 
                    onClose={() => setIsCalendarVisible(false)}
                    initialDate={weekStart}
                    onSelectDate={(date) => {
                        const d = new Date(date);
                        d.setDate(d.getDate() - d.getDay());
                        setWeekStart(d);
                    }}
                />

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
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    dashboardCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 35,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    macroListContainer: {
        gap: 16,
    },
    macroRowRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    macroIconBox: {
        width: 32,
        alignItems: 'center',
    },
    macroTrackWrap: {
        flex: 1,
        marginLeft: 12,
    },
    macroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    macroLabelText: {
        color: Colors.theme.softWhite,
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroValueText: {
        color: Colors.theme.harvestGold,
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroUnitText: {
        color: Colors.theme.dust,
        fontSize: 11,
        opacity: 0.8,
    },
    macroTrack: {
        height: 12,
        backgroundColor: '#2D2D2D', // Deep Gray
        borderRadius: 6,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    macroSeg: {
        height: '100%',
    },
    legendContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        gap: 20, 
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: Colors.theme.softWhite, fontSize: 12, fontWeight: '500' },
    weightCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 35,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    weeklyWeightTitle: {
        color: Colors.theme.softWhite,
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
    },
    weightAvgTitle: {
        color: Colors.theme.dust,
        fontSize: 13,
        fontWeight: 'bold',
    },
    weightBadgeText: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
        fontSize: 18,
    },
    weightBadge: {
        backgroundColor: Colors.theme.harvestGold,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 4,
    },
    dotsButton: {
        padding: 5,
        marginTop: 2,
    },
    weightDescText: {
        color: Colors.theme.dust,
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 5,
        opacity: 0.8,
    },
    chartAreaWrapper: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 0,
        paddingTop: 16,
        marginBottom: 12,
        paddingBottom: 0,
    },
    chartArea: {
        height: 200,
        position: 'relative',
        marginTop: 5,
        marginBottom: 8,
    },
    markersLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    marker: {
        position: 'absolute',
    },
    markerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.theme.matteBlack,
        borderWidth: 2,
        borderColor: Colors.theme.harvestGold,
    },
    markerLabel: {
        color: Colors.theme.softWhite,
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    weightFooter: {
        marginTop: 8,
    },
    daysRow: {
        flexDirection: 'row',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
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
        color: Colors.theme.softWhite,
        fontSize: 13,
        fontWeight: 'bold',
    },
    dayDate: {
        color: Colors.theme.dust,
        fontSize: 9,
        flexShrink: 0,
        opacity: 0.8,
    },
    dayColToday: {
        backgroundColor: Colors.theme.harvestGold,
    },
});
