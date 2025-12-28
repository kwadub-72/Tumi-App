import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedPost } from '../../src/shared/models/types';
import { NutritionService } from '../../src/shared/services/NutritionService';
import { Colors } from '../../src/shared/theme/Colors';
import { PostStore } from '../../store/PostStore';
import { WeightEntry, WeightStore } from '../../store/WeightStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock Data
const WEIGHT_VALUES = [245, 246, 247, 244, 255]; // Sun-Thu
const WEIGHT_AVG = 247.4;
const WEIGHT_TARGET = 245;

const LEAGUE_DATA = [
    { name: 'kwadub', rank: 1, score: 45, change: 5, direction: 'up' },
    { name: 'Hud2x', rank: 2, score: 40, change: -3, direction: 'down' },
    { name: 'cheaterMeservy', rank: 3, score: 34, change: -4, direction: 'down' },
    { name: 'DookieDrew30', rank: 4, score: 32, change: 1, direction: 'up' },
    { name: 'BellPepper', rank: 5, score: 18, change: 4, direction: 'none' },
];

export default function DashboardScreen() {
    const router = useRouter();
    const [dailyTotals, setDailyTotals] = useState({ cals: 0, macros: { p: 0, c: 0, f: 0 } });
    const [isFlipped, setIsFlipped] = useState(false);
    const [goals, setGoals] = useState({ p: 150, c: 200, f: 70 });
    const [editingMacro, setEditingMacro] = useState<null | { key: 'p' | 'c' | 'f', label: string }>(null);
    const [tempValue, setTempValue] = useState('');
    const [weights, setWeights] = useState<WeightEntry[]>([]);
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date('2025-12-21');
        return d;
    });

    const translateX = useRef(new Animated.Value(0)).current;
    const [isAnimating, setIsAnimating] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const TARGET_WEIGHT = 250;
    const deviations = weights.map(w => Math.abs(w.weight - TARGET_WEIGHT));
    const maxDev = Math.max(10, ...deviations);
    const calorieGoal = (goals.p * 4) + (goals.c * 4) + (goals.f * 9);

    const getWeekDates = (start: Date) => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    };

    const currentWeekDates = getWeekDates(weekStart);

    // YYYY-MM-DD for storage
    const toDataDate = (date: Date) => date.toISOString().split('T')[0];
    // MM/DD for display
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

    const sundayEntry = weights.find(w => w.date === weekDatesStrings[0]);
    const sundayY = sundayEntry ? getYPos(sundayEntry.weight) : null;
    const isSundayNearTarget = sundayY !== null && sundayY >= 35 && sundayY <= 65;

    const currentWeights = weights.filter(w => weekDatesStrings.includes(w.date));

    const currentWeekAverage = currentWeights.length > 0
        ? (currentWeights.reduce((sum, w) => sum + w.weight, 0) / currentWeights.length).toFixed(1)
        : null;

    // Detect collisions with week label
    const isSuMOverlap = currentWeights.some(w => {
        const x = getXPos(w.date);
        const y = getYPos(w.weight);
        return x !== null && x < 35 && y < 35;
    });
    const isFSaOverlap = currentWeights.some(w => {
        const x = getXPos(w.date);
        const y = getYPos(w.weight);
        return x !== null && x > 65 && y < 35;
    });

    const changeWeek = (direction: 'prev' | 'next') => {
        if (isAnimating) return;
        setIsAnimating(true);
        setScrollEnabled(false);

        const outValue = direction === 'prev' ? SCREEN_WIDTH : -SCREEN_WIDTH;
        const inStartValue = direction === 'prev' ? -SCREEN_WIDTH : SCREEN_WIDTH;

        // Slide out
        Animated.timing(translateX, {
            toValue: outValue,
            duration: 100, // Faster slide out
            useNativeDriver: true,
        }).start(() => {
            // Update state
            setWeekStart(current => {
                const nextDate = new Date(current);
                nextDate.setDate(nextDate.getDate() + (direction === 'next' ? 7 : -7));
                return nextDate;
            });

            // Reset and slide in
            translateX.setValue(inStartValue);
            Animated.spring(translateX, {
                toValue: 0,
                friction: 10,
                tension: 80, // Snappier spring
                useNativeDriver: true,
            }).start(() => {
                setIsAnimating(false);
                setScrollEnabled(true);
            });
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only capture if horizontal movement is dominant
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

                if (gestureState.dx > 40) { // Small stroke to commit
                    changeWeek('prev');
                } else if (gestureState.dx < -40) { // Small stroke to commit
                    changeWeek('next');
                } else {
                    // Reset position
                    Animated.spring(translateX, {
                        toValue: 0,
                        friction: 6,
                        useNativeDriver: true,
                    }).start(() => setScrollEnabled(true));
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(translateX, {
                    toValue: 0,
                    friction: 6,
                    useNativeDriver: true,
                }).start(() => setScrollEnabled(true));
            },
            onShouldBlockNativeResponder: () => true,
        })
    ).current;

    const getWeekLabelPos = () => {
        if (isSuMOverlap && isFSaOverlap) return { left: 0, top: 75 }; // Extreme case: move above chart
        if (isSuMOverlap) return { right: 25, top: 100 }; // Move to right side
        return { left: 0, top: 100 }; // Default: align left with axis labels
    };

    useEffect(() => {
        const fetchAndCalculate = async () => {
            const posts = await PostStore.loadPosts();
            calculate(posts);
        };

        const calculate = (posts: FeedPost[]) => {
            const userPosts = posts.filter(p => p.user.id === 'currentUser');
            const totals = NutritionService.sumMacros(userPosts.map(p => p.meal));
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
    }, []);

    const handleReset = async () => {
        await PostStore.clearPosts();
        await WeightStore.clearWeights();
    };

    const handleUpdateGoal = () => {
        if (!editingMacro) return;
        const val = parseInt(tempValue);
        if (!isNaN(val) && val >= 0) {
            setGoals(prev => ({ ...prev, [editingMacro.key]: val }));
            setEditingMacro(null);
        } else {
            Alert.alert('Invalid Input', 'Please enter a valid number');
        }
    };

    const MacroRow = ({ icon, consumed, goal, color, unit = 'g', onAdjust }: any) => {
        const isOverflow = consumed > goal;
        const overflow = Math.max(0, consumed - goal);

        if (isOverflow) {
            return (
                <View style={[styles.macroRow, { marginTop: 20 }]}>
                    <TouchableOpacity style={styles.macroIconContainer} onPress={onAdjust} disabled={!onAdjust}>
                        <MaterialCommunityIcons name={icon} size={32} color={color || 'white'} />
                    </TouchableOpacity>
                    <View style={[styles.sliderTrack, { backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }]}>
                        <Text style={styles.sliderText}>{consumed} / {goal} {unit}</Text>
                        <Text style={[styles.sliderText, { fontStyle: 'italic', fontSize: 12 }]}> (+{overflow})</Text>
                    </View>
                </View>
            );
        }

        const displayedConsumed = Math.min(consumed, goal);
        const remaining = Math.max(0, goal - consumed);

        const total = goal || 1;
        const consumedWidth = (displayedConsumed / total) * 100;
        const remainingWidth = (remaining / total) * 100;

        // Threshold for "squished" remaining text
        const useFloatingRemaining = remainingWidth > 0 && remainingWidth < 30;

        return (
            <View style={[styles.macroRow, useFloatingRemaining && { marginTop: 25 }]}>
                <TouchableOpacity style={styles.macroIconContainer} onPress={onAdjust} disabled={!onAdjust}>
                    <MaterialCommunityIcons name={icon} size={32} color={color || 'white'} />
                </TouchableOpacity>
                <View style={{ flex: 1, position: 'relative' }}>
                    {useFloatingRemaining && (
                        <View style={[styles.floatingRemainingContainer, { width: '100%', right: 0, alignItems: 'flex-end' }]}>
                            <Text style={styles.floatingRemainingText} numberOfLines={1}>{remaining} {unit}</Text>
                            <View style={[styles.bracket, { width: `${remainingWidth}%` }]} />
                        </View>
                    )}
                    <View style={styles.sliderTrack}>
                        {consumedWidth > 0 && (
                            <View style={[styles.sliderFill, { width: `${consumedWidth}%`, backgroundColor: color || 'white' }]}>
                                <Text style={[styles.sliderText, { color: color ? 'white' : 'black' }]}>
                                    {displayedConsumed} {unit}
                                </Text>
                            </View>
                        )}
                        {remaining > 0 && (
                            <View style={[styles.sliderFill, { width: `${remainingWidth}%`, backgroundColor: 'transparent' }]}>
                                {!useFloatingRemaining && (
                                    <Text style={styles.sliderText}>{remaining} {unit}</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={scrollEnabled}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                        <Ionicons name="refresh" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tumi</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Macro Sliders */}
                <View style={styles.macrosSection}>
                    <MacroRow
                        icon="fire"
                        consumed={dailyTotals.cals}
                        goal={calorieGoal}
                        color={Colors.primary}
                        unit="cals"
                    />
                    <View style={styles.divider} />
                    <MacroRow
                        icon="food-drumstick"
                        consumed={dailyTotals.macros.p}
                        goal={goals.p}
                        onAdjust={() => {
                            setEditingMacro({ key: 'p', label: 'Protein' });
                            setTempValue(goals.p.toString());
                        }}
                    />
                    <MacroRow
                        icon="barley"
                        consumed={dailyTotals.macros.c}
                        goal={goals.c}
                        onAdjust={() => {
                            setEditingMacro({ key: 'c', label: 'Carbs' });
                            setTempValue(goals.c.toString());
                        }}
                    />
                    <MacroRow
                        icon="water"
                        consumed={dailyTotals.macros.f}
                        goal={goals.f}
                        onAdjust={() => {
                            setEditingMacro({ key: 'f', label: 'Fats' });
                            setTempValue(goals.f.toString());
                        }}
                    />
                </View>

                {/* Adjustment Modal */}
                <Modal
                    visible={!!editingMacro}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setEditingMacro(null)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setEditingMacro(null)}
                    >
                        <Pressable style={styles.adjustmentCard} onPress={(e) => e.stopPropagation()}>
                            <Text style={styles.adjustmentTitle}>Adjust {editingMacro?.label} Target</Text>
                            <TextInput
                                style={styles.adjustmentInput}
                                value={tempValue}
                                onChangeText={setTempValue}
                                keyboardType="numeric"
                                autoFocus
                                selectTextOnFocus
                                placeholderTextColor="#666"
                            />
                            <View style={styles.adjustmentActions}>
                                <TouchableOpacity
                                    style={styles.adjustCancelBtn}
                                    onPress={() => setEditingMacro(null)}
                                >
                                    <Text style={styles.adjustBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.adjustSaveBtn}
                                    onPress={handleUpdateGoal}
                                >
                                    <Text style={styles.adjustBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Weight Chart Section */}
                <View style={styles.weightCard} {...panResponder.panHandlers}>
                    <Animated.View style={{ transform: [{ translateX }] }}>
                        <Text style={[styles.weightWeekLabel, getWeekLabelPos()]}>Wk of {toDisplayDate(weekStart)}</Text>
                        <TouchableOpacity
                            style={styles.weightHeader}
                            onPress={() => router.push('/weight-history')}
                        >
                            <Text style={styles.weightAverageLabel}>Average vs Target</Text>
                            <View style={styles.weightBadge}>
                                <Text style={styles.weightBadgeText}>{currentWeekAverage ? `${currentWeekAverage} lbs` : '-- lbs'}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.weightChartBody}>
                            <View style={styles.weightChartInner}>
                                {/* Upper Bound Line */}
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.success, opacity: 0.6 }} />

                                {/* Reference Lines */}
                                <View style={[styles.referenceLineContainer, { top: '25%' }]}>
                                    <View style={styles.referenceLine} />
                                </View>
                                <View style={[styles.referenceLineContainer, { top: '75%' }]}>
                                    <View style={styles.referenceLine} />
                                </View>

                                {/* Y Axis Label & Target Line */}
                                <View style={styles.targetLineContainer}>
                                    {!isSundayNearTarget && <Text style={styles.weightYLabel}>{TARGET_WEIGHT} lbs</Text>}
                                    <View style={styles.dashedTargetLine} />
                                    {isSundayNearTarget && <Text style={[styles.weightYLabel, { marginTop: 2, marginBottom: 0 }]}>{TARGET_WEIGHT} lbs</Text>}
                                </View>

                                {/* Markers */}
                                <View style={styles.markersContainer}>
                                    {currentWeights.map((entry, i) => {
                                        const x = getXPos(entry.date);
                                        if (x === null) return null;
                                        const y = getYPos(entry.weight);
                                        const isAtTop = y <= 1;

                                        return (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.weightMarkerContainer,
                                                    { left: `${x}%` as any, top: `${y}%` as any }
                                                ]}
                                            >
                                                <View style={styles.markerLabelWrapper}>
                                                    {!isAtTop && <Text style={styles.weightMarkerLabel}>{entry.weight}</Text>}
                                                </View>
                                                <Text style={styles.weightMarkerX}>✕</Text>
                                                <View style={styles.markerLabelWrapper}>
                                                    {isAtTop && <Text style={styles.weightMarkerLabel}>{entry.weight}</Text>}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        <View style={styles.weightFooter}>
                            <View style={styles.footerSeparator} />
                            <View style={styles.weightDaysRow}>
                                {[
                                    { day: 'Su', date: weekDisplayStrings[0] },
                                    { day: 'M', date: weekDisplayStrings[1] },
                                    { day: 'T', date: weekDisplayStrings[2] },
                                    { day: 'W', date: weekDisplayStrings[3] },
                                    { day: 'Th', date: weekDisplayStrings[4] },
                                    { day: 'F', date: weekDisplayStrings[5] },
                                    { day: 'S', date: weekDisplayStrings[6] },
                                ].map((item, i) => (
                                    <View key={i} style={styles.weightDayContainer}>
                                        <Text style={styles.weightDayText}>{item.day}</Text>
                                        <Text style={styles.weightDateText}>{item.date}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* League Section */}
                <Pressable
                    style={styles.leagueCard}
                    onPress={() => setIsFlipped(!isFlipped)}
                >
                    {!isFlipped ? (
                        <>
                            <Text style={styles.leagueTitle}>Harvard Alum League</Text>
                            <View style={styles.leagueHeader}>
                                <Text style={styles.leagueHeaderText}>Weekly Rank</Text>
                                <Text style={styles.leagueHeaderText}>Score</Text>
                            </View>
                            {LEAGUE_DATA.map((item, i) => (
                                <View key={i} style={styles.leagueRow}>
                                    <View style={styles.rankInfo}>
                                        <Text style={styles.rankText}>{item.rank}. {item.name}</Text>
                                        {item.direction === 'up' && <Ionicons name="arrow-up" size={14} color="#4ADE80" />}
                                        {item.direction === 'down' && <Ionicons name="arrow-down" size={14} color={Colors.error} />}
                                        {item.direction === 'none' && <Text style={{ color: '#666' }}>—</Text>}
                                    </View>
                                    <View style={styles.scoreInfo}>
                                        <Text style={styles.scoreMain}>{item.score}</Text>
                                        <Text style={[styles.scoreChange, { color: item.change > 0 ? '#4ADE80' : Colors.error }]}>
                                            ({item.change > 0 ? '+' : ''}{item.change})
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    ) : (
                        <View style={styles.matchupContainer}>
                            <View style={styles.matchupHeader}>
                                <MaterialCommunityIcons name="fire" size={32} color={Colors.primary} />
                                <Text style={styles.matchupTitle}>Harvard Alum League</Text>
                                <View style={styles.matchupIcons}>
                                    <MaterialCommunityIcons name="hammer" size={24} color={Colors.primary} />
                                    <MaterialCommunityIcons name="leaf" size={24} color="#4ADE80" />
                                </View>
                            </View>
                            <View style={styles.matchupContent}>
                                <View style={styles.playerUnit}>
                                    <View style={styles.playerInfo}>
                                        <Image
                                            source={require('../../assets/images/kwadub.jpg')}
                                            style={styles.matchupAvatar}
                                        />
                                        <Text style={styles.playerRankName}>
                                            <Text style={{ color: '#4ADE80' }}>1st</Text> Kwaku
                                        </Text>
                                        <View style={styles.handleRow}>
                                            <Text style={styles.playerHandle}>@kwadub</Text>
                                            <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" />
                                        </View>
                                        <Text style={styles.playerRecord}>
                                            6-3 <Text style={{ color: '#4ADE80' }}>(W3)</Text>
                                        </Text>
                                    </View>
                                    <Text style={styles.matchupScore}>23</Text>
                                </View>
                                <View style={styles.playerUnit}>
                                    <View style={styles.playerInfo}>
                                        <Image
                                            source={require('../../assets/images/hd2x.jpg')}
                                            style={styles.matchupAvatar}
                                        />
                                        <Text style={styles.playerRankName}>
                                            <Text style={{ color: 'white' }}>2nd</Text> Matt
                                        </Text>
                                        <View style={styles.handleRow}>
                                            <Text style={styles.playerHandle}>@Hud2x</Text>
                                            <MaterialCommunityIcons name="leaf" size={12} color="#4ADE80" />
                                        </View>
                                        <Text style={styles.playerRecord}>
                                            6-3 <Text style={{ color: Colors.error }}>(L1)</Text>
                                        </Text>
                                    </View>
                                    <Text style={styles.matchupScore}>21</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    headerTitle: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    resetButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    macrosSection: {
        gap: 20,
        marginBottom: 40,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    macroIconContainer: {
        width: 32,
        alignItems: 'center',
    },
    sliderTrack: {
        flex: 1,
        height: 44,
        backgroundColor: '#111',
        borderRadius: 22,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    sliderFill: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    sliderText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 10,
        width: '100%',
    },
    // New Weight Card Styles
    weightCard: {
        backgroundColor: '#0a0a0a',
        borderRadius: 40,
        borderWidth: 1,
        borderColor: Colors.secondary,
        padding: 24,
        paddingTop: 12,
        marginBottom: 30,
        position: 'relative',
        overflow: 'hidden', // Contain the animated inner view
    },
    weightWeekLabel: {
        position: 'absolute',
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
        zIndex: 1,
    },
    weightHeader: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    weightAverageLabel: {
        color: Colors.theme.olive,
        fontSize: 19,
        fontWeight: 'bold',
    },
    weightBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.secondary,
    },
    weightBadgeText: {
        color: Colors.success,
        fontSize: 19,
        fontWeight: '600',
    },
    weightChartBody: {
        height: 150,
        marginBottom: 20,
        justifyContent: 'center',
    },
    weightChartInner: {
        flex: 1,
        position: 'relative',
    },
    targetLineContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        flexDirection: 'column',
        alignItems: 'flex-start',
        zIndex: 1,
    },
    referenceLineContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    referenceLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.theme.sage,
        opacity: 0.15,
    },
    weightYLabel: {
        color: 'white',
        fontSize: 10,
        marginBottom: 2,
    },
    dashedTargetLine: {
        width: '100%',
        height: 0,
        borderTopWidth: 2,
        borderColor: 'white',
        borderStyle: 'dashed',
    },
    markersContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    weightMarkerContainer: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateX: -30 }, { translateY: -30 }],
        zIndex: 5,
    },
    markerLabelWrapper: {
        height: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weightMarkerX: {
        color: Colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        height: 14,
        lineHeight: 14,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    weightMarkerLabel: {
        color: Colors.success,
        fontSize: 10,
        fontWeight: '600',
    },
    weightFooter: {
        paddingTop: 10,
    },
    footerSeparator: {
        height: 1,
        backgroundColor: Colors.secondary,
        marginBottom: 10,
    },
    weightDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    weightDayText: {
        color: Colors.theme.leafGreen,
        fontSize: 18,
        fontWeight: '500',
    },
    weightDayContainer: {
        alignItems: 'center',
    },
    weightDateText: {
        color: '#666',
        fontSize: 10,
        fontStyle: 'italic',
        marginTop: 2,
    },
    // Keep or remove old chart styles as needed
    leagueCard: {
        backgroundColor: '#0a0a0a',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: Colors.primary,
        padding: 20,
    },
    leagueTitle: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        textDecorationLine: 'underline',
        marginBottom: 20,
    },
    leagueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    leagueHeaderText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    leagueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rankText: {
        color: 'white',
        fontSize: 18,
    },
    scoreInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreMain: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreChange: {
        fontSize: 16,
    },
    matchupContainer: {
        flex: 1,
    },
    matchupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 10,
    },
    matchupTitle: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    matchupIcons: {
        flexDirection: 'row',
        gap: 5,
        position: 'absolute',
        right: 0,
    },
    matchupContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerUnit: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerInfo: {
        alignItems: 'center',
        gap: 2,
    },
    matchupAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#333',
        marginBottom: 5,
    },
    playerRankName: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playerHandle: {
        color: '#ccc',
        fontSize: 12,
    },
    playerRecord: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    matchupScore: {
        color: 'white',
        fontSize: 48,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    floatingRemainingContainer: {
        position: 'absolute',
        bottom: '100%',
        alignItems: 'center',
        marginBottom: 4,
    },
    floatingRemainingText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
    },
    bracket: {
        width: '100%',
        height: 6,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: 1,
        borderColor: 'white',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustmentCard: {
        width: '80%',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: Colors.primary,
        alignItems: 'center',
    },
    adjustmentTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    adjustmentInput: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        borderRadius: 10,
        color: 'white',
        fontSize: 24,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 20,
    },
    adjustmentActions: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    adjustCancelBtn: {
        flex: 1,
        height: 45,
        backgroundColor: '#222',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustSaveBtn: {
        flex: 1,
        height: 45,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
