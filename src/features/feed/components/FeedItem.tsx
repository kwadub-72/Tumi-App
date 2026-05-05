import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AVPlaybackStatusSuccess, ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import Animated from 'react-native-reanimated';
import { FeedPost, Snapshot, Meal, Workout, MacroUpdate } from '@/src/shared/models/types';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { Colors } from '@/src/shared/theme/Colors';
import VerifiedModal from '@/components/VerifiedModal';
import { useMealLogStore } from '@/src/store/useMealLogStore';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { useUserStore } from '@/store/UserStore';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';

const BURGUNDY = '#825858';
const TRIBE_GREEN = '#405F4F';
const WHITE = '#FFFFFF';

export interface FeedItemProps {
    post: FeedPost;
    onPressVerified?: () => void;
    onPressHammer?: () => void;
    onPressComment?: () => void;
    onPressLike?: () => void;
    onPressShare?: () => void;
    onPressSave?: () => void;
    onPressOptions?: () => void;
    onDismissSelectMode?: () => void;
    isDetailView?: boolean;
    isSelectMode?: boolean;
    selectedItems?: string[];
    onToggleSelect?: (itemId: string, itemType: string) => void;
    cardColor?: string;
    sharedTransitionTag?: string;
}

export default function FeedItem({
    post,
    onPressVerified,
    onPressHammer,
    onPressComment,
    onPressLike,
    onPressShare,
    onPressSave,
    onPressOptions,
    onDismissSelectMode,
    isDetailView = false,
    isSelectMode = false,
    selectedItems = [],
    onToggleSelect,
    cardColor,
    sharedTransitionTag
}: FeedItemProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(isDetailView);
    const [isTribeMenuOpen, setIsTribeMenuOpen] = useState(false);
    const [loopCount, setLoopCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVerifiedVisible, setIsVerifiedVisible] = useState(false);
    const videoRef = useRef<Video>(null);

    const mealStore = useMealLogStore();
    const workoutStore = useWorkoutLogStore();
    const { macroTargets: myTargets } = useUserStore();
    const { navigateToProfile } = useProfileNavigation();

    useEffect(() => {
        if (isSelectMode) {
            setIsExpanded(true);
        }
    }, [isSelectMode]);

    const handleStandardCopy = () => {
        if (post.meal) {
            const itemsToCopy = selectedItems.length > 0
                ? post.meal.ingredients.filter(ing => selectedItems.includes(ing.name))
                : post.meal.ingredients;
            if (isSelectMode && selectedItems.length === 0) return;
            itemsToCopy.forEach(ing => mealStore.addItem({ ...ing, id: Date.now().toString() + Math.random() }));
            setIsTribeMenuOpen(false);
        }
        if (post.workout) {
            const itemsToCopy = selectedItems.length > 0
                ? post.workout.exercises.filter(ex => selectedItems.includes(ex.title))
                : post.workout.exercises;
            if (isSelectMode && selectedItems.length === 0) return;
            itemsToCopy.forEach(ex => workoutStore.addExercise({ ...ex, id: Date.now().toString() + Math.random() }));
            setIsTribeMenuOpen(false);
        }
        if (post.macroUpdate) {
            if (isSelectMode && selectedItems.length === 0) return;
            const selectedLine = selectedItems[0];
            if (!selectedLine) return;

            const posterTargets = post.user.macroTargets;
            const myCals = myTargets.calories;

            if (selectedLine === 'old' || selectedLine === 'new') {
                const targetToUse = selectedLine === 'old' ? post.macroUpdate.oldTargets : post.macroUpdate.newTargets;
                let myP = myTargets.p;
                let myC = myTargets.c;
                let myF = myTargets.f;

                if (targetToUse.calories > 0) {
                    const scale = myCals / targetToUse.calories;
                    myP = Math.round(targetToUse.p * scale);
                    myC = Math.round(targetToUse.c * scale);
                    myF = Math.round(targetToUse.f * scale);
                }

                setIsTribeMenuOpen(false);
                router.push({
                    pathname: '/signup/manual-macros',
                    params: { p: myP, c: myC, f: myF, calories: myCals }
                });
            } else if (selectedLine === 'diff') {
                const diffP = post.macroUpdate.oldTargets.p > 0 ? (post.macroUpdate.newTargets.p - post.macroUpdate.oldTargets.p) / post.macroUpdate.oldTargets.p : 0;
                const diffC = post.macroUpdate.oldTargets.c > 0 ? (post.macroUpdate.newTargets.c - post.macroUpdate.oldTargets.c) / post.macroUpdate.oldTargets.c : 0;
                const diffF = post.macroUpdate.oldTargets.f > 0 ? (post.macroUpdate.newTargets.f - post.macroUpdate.oldTargets.f) / post.macroUpdate.oldTargets.f : 0;

                const myP = Math.round(myTargets.p * (1 + diffP));
                const myC = Math.round(myTargets.c * (1 + diffC));
                const myF = Math.round(myTargets.f * (1 + diffF));
                const myCals = (myP * 4) + (myC * 4) + (myF * 9);

                setIsTribeMenuOpen(false);
                router.push({
                    pathname: '/signup/manual-macros',
                    params: { p: myP, c: myC, f: myF, calories: myCals }
                });
            }
        }
        if (post.snapshot) {
            if (isSelectMode && selectedItems.length === 0) return;
            const selectedLine = selectedItems[0];
            if (selectedLine !== 'targets') return;

            setIsTribeMenuOpen(false);
            router.push({
                pathname: '/signup/manual-macros',
                params: { 
                    p: post.snapshot.targets.p, 
                    c: post.snapshot.targets.c, 
                    f: post.snapshot.targets.f, 
                    calories: post.snapshot.targets.calories 
                }
            });
        }
    };

    const handleTribeCopy = () => {
        if (post.meal) {
            const itemsToCopy = selectedItems.length > 0
                ? post.meal.ingredients.filter(ing => selectedItems.includes(ing.name))
                : post.meal.ingredients;
            if (isSelectMode && selectedItems.length === 0) return;

            const posterTargets = post.user.macroTargets;

            itemsToCopy.forEach(ing => {
                if (!posterTargets) {
                    mealStore.addItem({ ...ing, id: Date.now().toString() + Math.random() });
                    return;
                }
                const p = ing.macros.p;
                const c = ing.macros.c;
                const f = ing.macros.f;
                const maxVal = Math.max(p, c, f);

                let ratio = 1;
                if (maxVal === p && posterTargets.p > 0) ratio = p / posterTargets.p;
                else if (maxVal === c && posterTargets.c > 0) ratio = c / posterTargets.c;
                else if (maxVal === f && posterTargets.f > 0) ratio = f / posterTargets.f;

                const newP = Math.round(myTargets.p * ratio);
                const newC = Math.round(myTargets.c * ratio);
                const newF = Math.round(myTargets.f * ratio);
                const newCals = (newP * 4) + (newC * 4) + (newF * 9);

                // Try to scale amount if it's numeric, otherwise leave
                const numericAmountMatch = ing.amount.match(/(\d+)/);
                let scaledAmountStr = ing.amount;
                if (numericAmountMatch) {
                    const parsed = parseInt(numericAmountMatch[1]);
                    const repl = Math.round(parsed * ratio);
                    scaledAmountStr = ing.amount.replace(numericAmountMatch[1], repl.toString());
                }

                const scaledIng = {
                    ...ing,
                    id: Date.now().toString() + Math.random(),
                    name: `${ing.name} (Tribe)`,
                    amount: scaledAmountStr,
                    cals: newCals,
                    macros: { p: newP, c: newC, f: newF }
                };
                mealStore.addItem(scaledIng);
            });
            setIsTribeMenuOpen(false);
        }
        if (post.workout) {
            handleStandardCopy();
        }
        if (post.macroUpdate) {
            handleStandardCopy();
        }
        if (post.snapshot) {
            handleStandardCopy();
        }
    };

    const toggleExpand = (e?: any) => {
        if (e) e.stopPropagation();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const handlePlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) return;
        const s = status as AVPlaybackStatusSuccess;
        if (s.didJustFinish) {
            if (loopCount < 2) setLoopCount(prev => prev + 1);
            else { setIsPlaying(false); setLoopCount(0); }
        }
    };

    const handlePressBody = () => {
        if (isSelectMode) {
            if (post.macroUpdate) {
                // For macro updates, we handle it in the sub-rows
                // but if they tap the very background of the card, we dismiss
                onDismissSelectMode?.();
            } else if (post.snapshot) {
                onToggleSelect?.('snapshot', 'snapshot');
            } else {
                // For meals and workouts, we want individual rows to handle it.
                // Tapping the card background should dismiss select mode.
                onDismissSelectMode?.();
            }
            return;
        }
        if (post.id && !isDetailView) router.push(`/post/${post.id}`);
        else if (isDetailView) {
            onPressOptions?.();
        }
    };

    const formatVal = (val: number) => {
        return `${val}`;
    };

    const renderMacroColumn = (icon: any, val: number, unit: string, width?: number, colorOverride?: string, scale: 'normal' | 'small' = 'normal') => (
        <View style={[styles.macroValueItem, width ? { width, justifyContent: 'flex-start' } : {}]}>
            <MaterialCommunityIcons name={icon} size={scale === 'small' ? 14 : 18} color={colorOverride || "white"} />
            <Text style={[
                styles.macroValueText, 
                colorOverride && { color: colorOverride },
                scale === 'small' && { fontSize: 13, fontWeight: '500' }
            ]}>
                {formatVal(val)}{unit}
            </Text>
        </View>
    );

    const renderMacroValue = (icon: any, val: number, unit: string, colorOverride?: string, showPlus?: boolean) => {
        const formatted = showPlus && val > 0 ? `+${val}` : `${val}`;
        return renderMacroColumn(icon, formatted as any, unit, undefined, colorOverride, 'normal');
    };

    const renderSnapshot = (snapshot: Snapshot) => {
        const remains = {
            calories: snapshot.targets.calories - snapshot.consumed.calories,
            p: snapshot.targets.p - snapshot.consumed.p,
            c: snapshot.targets.c - snapshot.consumed.c,
            f: snapshot.targets.f - snapshot.consumed.f,
        };

        const getColor = (val: number) => {
            if (val > 0) return TRIBE_GREEN;
            if (val < 0) return BURGUNDY;
            return WHITE;
        };

        const renderRow = (label: string, vals: { calories: number, p: number, c: number, f: number }, colors: { calories: string, p: string, c: string, f: string }, selectionKey?: string, showPlus = false) => (
            <TouchableOpacity
                activeOpacity={isSelectMode && selectionKey ? 0.7 : 1}
                onPress={() => isSelectMode && selectionKey && onToggleSelect?.(selectionKey, 'snapshot')}
                style={styles.macroUpdateRow}
            >
                {isSelectMode && selectionKey && (
                    <View style={styles.selectBtnLeft}>
                        {selectedItems.includes(selectionKey) ? (
                            <View style={styles.selectedCircle}>
                                <Ionicons name="checkmark" size={16} color="white" />
                            </View>
                        ) : (
                            <View style={styles.unselectedCircle} />
                        )}
                    </View>
                )}
                <View style={[styles.macroLabelBox, isSelectMode && { paddingLeft: 28 }]}>
                    <Text style={styles.macroLabelText}>{label}</Text>
                </View>
                <View style={styles.macroValuesRow}>
                    {renderMacroValue('fire', vals.calories, ' cals', colors.calories, showPlus)}
                    {renderMacroValue('food-drumstick', vals.p, 'g', colors.p, showPlus)}
                    {renderMacroValue('barley', vals.c, 'g', colors.c, showPlus)}
                    {renderMacroValue('water', vals.f, 'g', colors.f, showPlus)}
                </View>
            </TouchableOpacity>
        );

        if (!isExpanded) {
            return (
                <View style={styles.macroUpdateContent}>
                    {renderRow('Snapshot', remains, {
                        calories: getColor(remains.calories),
                        p: getColor(remains.p),
                        c: getColor(remains.c),
                        f: getColor(remains.f),
                    }, undefined, true)}
                </View>
            );
        }

        return (
            <View style={styles.macroUpdateContent}>
                {renderRow('Targets', snapshot.targets, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE }, 'targets')}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Actual', snapshot.consumed, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE }, undefined)}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Snapshot', remains, {
                    calories: getColor(remains.calories),
                    p: getColor(remains.p),
                    c: getColor(remains.c),
                    f: getColor(remains.f),
                }, undefined, true)}
            </View>
        );
    };

    const renderMacroUpdate = (mu: MacroUpdate) => {
        const delta = {
            calories: mu.newTargets.calories - mu.oldTargets.calories,
            p: mu.newTargets.p - mu.oldTargets.p,
            c: mu.newTargets.c - mu.oldTargets.c,
            f: mu.newTargets.f - mu.oldTargets.f,
        };

        const getDeltaColor = (val: number) => {
            if (val > 0) return TRIBE_GREEN;
            if (val < 0) return BURGUNDY;
            return WHITE;
        };

        const getNewColor = (newVal: number, oldVal: number) => {
            if (newVal > oldVal) return TRIBE_GREEN;
            if (newVal < oldVal) return BURGUNDY;
            return WHITE;
        };

        const renderRow = (label: string, vals: { calories: number, p: number, c: number, f: number }, colors: { calories: string, p: string, c: string, f: string }, selectionKey?: string, isDelta = false) => (
            <TouchableOpacity
                activeOpacity={isSelectMode ? 0.7 : 1}
                onPress={() => isSelectMode && selectionKey && onToggleSelect?.(selectionKey, 'macro')}
                style={styles.macroUpdateRow}
            >
                {isSelectMode && selectionKey && (
                    <View style={styles.selectBtnLeft}>
                        {selectedItems.includes(selectionKey) ? (
                            <View style={styles.selectedCircle}>
                                <Ionicons name="checkmark" size={16} color="white" />
                            </View>
                        ) : (
                            <View style={styles.unselectedCircle} />
                        )}
                    </View>
                )}
                <View style={[styles.macroLabelBox, isSelectMode && { paddingLeft: 28 }]}>
                    <Text style={styles.macroLabelText}>{label}</Text>
                </View>
                <View style={styles.macroValuesRow}>
                    {renderMacroValue('fire', vals.calories, ' cals', colors.calories, isDelta)}
                    {renderMacroValue('food-drumstick', vals.p, 'g', colors.p, isDelta)}
                    {renderMacroValue('barley', vals.c, 'g', colors.c, isDelta)}
                    {renderMacroValue('water', vals.f, 'g', colors.f, isDelta)}
                </View>
            </TouchableOpacity>
        );

        if (!isExpanded) {
            return (
                <View style={styles.macroUpdateContent}>
                    {renderRow('New targets', mu.newTargets, {
                        calories: getNewColor(mu.newTargets.calories, mu.oldTargets.calories),
                        p: getNewColor(mu.newTargets.p, mu.oldTargets.p),
                        c: getNewColor(mu.newTargets.c, mu.oldTargets.c),
                        f: getNewColor(mu.newTargets.f, mu.oldTargets.f),
                    }, 'new')}
                </View>
            );
        }

        return (
            <View style={styles.macroUpdateContent}>
                {renderRow(mu.oldDate || '12/25/2025', mu.oldTargets, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE }, 'old')}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Updates', delta, {
                    calories: getDeltaColor(delta.calories),
                    p: getDeltaColor(delta.p),
                    c: getDeltaColor(delta.c),
                    f: getDeltaColor(delta.f),
                }, 'diff', true)}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('New targets', mu.newTargets, {
                    calories: getNewColor(mu.newTargets.calories, mu.oldTargets.calories),
                    p: getNewColor(mu.newTargets.p, mu.oldTargets.p),
                    c: getNewColor(mu.newTargets.c, mu.oldTargets.c),
                    f: getNewColor(mu.newTargets.f, mu.oldTargets.f),
                }, 'new')}
            </View>
        );
    };

    const renderMeal = (meal: any) => {
        return (
            <View>
                {!isDetailView && (
                    <View style={styles.mealMainStats}>
                        <Text style={styles.mealType}>{meal.type}</Text>
                        <View style={styles.mealMacrosFixed}>
                            {renderMacroColumn('fire', meal.calories, ' cals', 85, undefined, 'normal')}
                            {renderMacroColumn('food-drumstick', meal.macros.p, 'g', 55, undefined, 'normal')}
                            {renderMacroColumn('barley', meal.macros.c, 'g', 55, undefined, 'normal')}
                            {renderMacroColumn('water', meal.macros.f, 'g', 55, undefined, 'normal')}
                        </View>
                    </View>
                )}

                {(isDetailView || isExpanded) && (
                    <View style={styles.detailedMealContainer}>
                        {meal.ingredients?.map((ing: any, i: number) => {
                            const isSelected = selectedItems.includes(ing.name);
                            return (
                                <TouchableOpacity 
                                    key={i} 
                                    activeOpacity={isSelectMode ? 0.7 : 1}
                                    onPress={() => isSelectMode && onToggleSelect && onToggleSelect(ing.name, 'ingredient')}
                                    style={styles.detailedMealRow}
                                >
                                    <View style={[styles.ingInfo, isSelectMode && { width: 130 }]}>
                                        {isSelectMode && (
                                            <View style={styles.selectBtnLeft}>
                                                {isSelected ? (
                                                    <View style={styles.selectedCircle}>
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.unselectedCircle} />
                                                )}
                                            </View>
                                        )}
                                        <View style={[styles.ingTextContainer, isSelectMode && { paddingLeft: 28 }]}>
                                            <Text style={styles.ingName} numberOfLines={2}>{ing.name}</Text>
                                            {ing.amount && <Text style={styles.ingAmount}>{ing.amount}</Text>}
                                        </View>
                                    </View>
                                    <View style={styles.ingMacrosFixed}>
                                        {renderMacroColumn('fire', ing.cals, ' cals', isSelectMode ? 75 : 85, 'white', 'small')}
                                        {renderMacroColumn('food-drumstick', ing.macros.p, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
                                        {renderMacroColumn('barley', ing.macros.c, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
                                        {renderMacroColumn('water', ing.macros.f, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };


    const formatDuration = (mins: number) => {
        if (!mins) return '';
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
        }
        return `${mins} min`;
    };

    const renderWorkout = (workout: any) => {
        if (!isDetailView) {
            return (
                <View style={[styles.workoutContent, { paddingLeft: 0 }]}>
                    <View style={styles.workoutHeaderRowCustom}>
                        <Text style={styles.workoutHeaderTitle}>{workout.title}</Text>
                        {workout.duration > 0 && (
                            <View style={styles.workoutHeaderTimeBlock}>
                                <MaterialCommunityIcons name="timer-outline" size={20} color="white" />
                                <Text style={styles.workoutDurationText}>{formatDuration(workout.duration)}</Text>
                            </View>
                        )}
                    </View>
                    
                    {isExpanded && (
                        <View style={styles.exercisesListBlock}>
                            {workout.exercises.map((ex: any, idx: number) => {
                                const setsStr = ex.sets?.length ? `${ex.sets.length} sets x ${ex.sets[0]?.reps || 0} reps` : '';
                                
                                const cardioParts = [];
                                if (ex.speed) cardioParts.push(`${ex.speed} speed`);
                                if (ex.incline) cardioParts.push(`${ex.incline} incline`);
                                if (ex.duration) cardioParts.push(`${ex.duration} min`);
                                const cardioStr = cardioParts.join(', ');
                                
                                return (
                                    <TouchableOpacity 
                                        key={idx} 
                                        activeOpacity={isSelectMode ? 0.7 : 1}
                                        onPress={() => isSelectMode && onToggleSelect && onToggleSelect(ex.title, 'exercise')}
                                        style={styles.exerciseFeedRow}
                                    >
                                        {isSelectMode && (
                                            <View style={styles.selectBtnLeft}>
                                                {selectedItems.includes(ex.title) ? (
                                                    <View style={styles.selectedCircle}>
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.unselectedCircle} />
                                                )}
                                            </View>
                                        )}
                                        <View style={[styles.exerciseFeedLeft, isSelectMode && { paddingLeft: 28 }]}>
                                            <Text style={styles.exerciseFeedRowTitle}>
                                                {ex.displayId ? `${ex.displayId} ` : ''}{ex.title}
                                            </Text>
                                            {ex.eccentric ? (
                                                <Text style={styles.exerciseFeedEccentric}>
                                                    {ex.eccentric.includes('sec') ? ex.eccentric : `${ex.eccentric} sec eccentric`}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.exerciseFeedRight}>
                                            <MaterialCommunityIcons 
                                                name={ex.type === 'Cardio' ? 'run' : 'dumbbell'} 
                                                size={18} 
                                                color="rgba(255,255,255,0.7)" 
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.exerciseFeedDetails}>
                                                {ex.type === 'Cardio' ? cardioStr : setsStr}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View style={styles.detailedWorkoutContainer}>
                {workout.exercises.map((ex: any, idx: number) => {
                    const isSelected = selectedItems.includes(ex.title);
                    return (
                        <View key={idx} style={[styles.detailedMealRow, { marginTop: 10 }]}>
                            <View style={[styles.ingInfo, { width: '100%' }]}>
                                {isSelectMode && (
                                    <TouchableOpacity 
                                        style={styles.selectBtnLeft} 
                                        onPress={() => onToggleSelect && onToggleSelect(ex.title, 'exercise')}
                                    >
                                        {isSelected ? (
                                            <View style={styles.selectedCircle}>
                                                <Ionicons name="checkmark" size={16} color="white" />
                                            </View>
                                        ) : (
                                            <View style={styles.unselectedCircle} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                <View style={[styles.ingTextContainer, isSelectMode && { paddingLeft: 28 }]}>
                                    <Text style={styles.ingName}>{ex.title}</Text>
                                    <Text style={styles.ingAmount}>{ex.sets?.length || 0} sets</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const content = () => {
        if (post.snapshot) return renderSnapshot(post.snapshot);
        if (post.macroUpdate) return renderMacroUpdate(post.macroUpdate);
        if (post.meal) return renderMeal(post.meal);
        if (post.workout) return renderWorkout(post.workout);
        return null;
    };

    return (
        <Animated.View 
            style={[styles.card, cardColor ? { backgroundColor: cardColor } : {}]}
            // @ts-ignore
            sharedTransitionTag={sharedTransitionTag}
        >
            {isTribeMenuOpen && (
                <TouchableWithoutFeedback onPress={() => setIsTribeMenuOpen(false)}>
                    <View style={[StyleSheet.absoluteFill, styles.dimOverlay]} />
                </TouchableWithoutFeedback>
            )}

            <VerifiedModal visible={isVerifiedVisible} onClose={() => setIsVerifiedVisible(false)} status={post.user.status} />
            <View style={[styles.header, { zIndex: 1 }]}>
                <TouchableOpacity onPress={() => navigateToProfile(post.user)}>
                    <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                        <TouchableOpacity onPress={() => navigateToProfile(post.user)}>
                            <Text style={styles.name}>{post.user.name}</Text>
                        </TouchableOpacity>
                        {post.user.status && (post.user.status !== 'none') && (
                            <TouchableOpacity onPress={() => setIsVerifiedVisible(true)}>
                                <MaterialCommunityIcons
                                    name={post.user.status === 'enhanced' ? "lightning-bolt" : "leaf"}
                                    size={16}
                                    color={post.user.status === 'enhanced' ? "#FFD700" : Colors.success}
                                />
                            </TouchableOpacity>
                        )}
                        {post.user.activityIcon && (
                            <TouchableOpacity onPress={onPressHammer} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <MaterialCommunityIcons
                                    name={post.user.activityIcon as any}
                                    size={16}
                                    color='white'
                                />
                                {(post.user as any).activity?.toLowerCase().includes('bulk') && (
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>+</Text>
                                )}
                                {(post.user as any).activity?.toLowerCase().includes('cut') && (
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 1, marginTop: -2 }}>-</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => navigateToProfile(post.user)}>
                        <Text style={styles.handle}>{post.user.handle}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={onPressOptions}><Ionicons name="ellipsis-horizontal" size={20} color="white" /></TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={isSelectMode ? 1 : 0.9} onPress={handlePressBody} style={{ zIndex: 1 }}>
                <Text style={styles.titleText}>
                    {post.caption || post.snapshot?.caption || post.macroUpdate?.caption || post.workout?.title || post.meal?.title}
                </Text>

                {!isDetailView && (
                    <TouchableOpacity onPress={toggleExpand} style={styles.expandLineTrigger}>
                        <View style={styles.dividerHalf} />
                        <Ionicons name="ellipsis-horizontal" size={16} color="rgba(255,255,255,0.5)" />
                        <View style={styles.dividerHalf} />
                    </TouchableOpacity>
                )}

                {content()}

                {(!isDetailView && !post.meal && !post.macroUpdate && !post.workout && !post.snapshot) && (
                    <TouchableOpacity onPress={toggleExpand} style={styles.expandLineTrigger}>
                        <View style={styles.dividerHalf} />
                        <Ionicons name="ellipsis-horizontal" size={16} color="rgba(255,255,255,0.5)" />
                        <View style={styles.dividerHalf} />
                    </TouchableOpacity>
                )}

                {post.mediaUrl && (
                    <View style={styles.mediaFrame}>
                        {post.mediaType === 'video' ? (
                            <Video ref={videoRef} source={{ uri: post.mediaUrl }} style={styles.media} resizeMode={ResizeMode.COVER} isLooping shouldPlay={isPlaying} isMuted={isMuted} onPlaybackStatusUpdate={handlePlaybackStatusUpdate} />
                        ) : (
                            <Image source={{ uri: post.mediaUrl }} style={styles.media} />
                        )}
                    </View>
                )}
            </TouchableOpacity>

            <View style={[styles.footerActions, { zIndex: 10 }]}>
                {isTribeMenuOpen && (
                    <View style={styles.floatingButtonsRow}>
                        <TouchableOpacity style={styles.floatingTribeBtn} onPress={handleTribeCopy}>
                            <TabonoLogo size={24} color="#A4B69D" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.floatingCopyBtn} onPress={handleStandardCopy}>
                            <Ionicons name="copy" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => setIsTribeMenuOpen(!isTribeMenuOpen)}>
                        <View style={styles.tribeCircle}>
                            <TabonoLogo size={20} color={Colors.theme.sageLight} />
                        </View>
                        <Text style={styles.actionCount}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressLike}>
                        <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={28} color="white" />
                        <Text style={styles.actionCount}>{post.stats.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                        <Ionicons name="chatbubble-ellipses" size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressShare || onPressSave}>
                        <Ionicons name="arrow-redo-outline" size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.shares}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timeLabel}>{post.timeAgo}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#A4B69D',
        borderRadius: 45,
        padding: 20,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 10,
        borderWidth: 1,
        borderColor: Colors.theme.beige,
    },
    headerText: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    handle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    titleText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'white',
        opacity: 0.3,
    },
    snapshotContent: {
        gap: 8,
        marginBottom: 10,
        paddingLeft: 10,
    },
    snapshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    snapshotLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        width: 75,
    },
    macroUpdateContent: {
        gap: 2,
        paddingLeft: 0,
    },
    macroUpdateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    macroLabelBox: {
        width: 105,
    },
    macroLabelText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    macroValuesRow: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroValues: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    macroValuesMain: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
        justifyContent: 'flex-end',
    },
    macroValueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    macroValueText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    mealMainStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 10,
    },
    mealType: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        width: 85,
    },
    mealMacrosFixed: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-start',
    },
    ingMacrosFixed: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    mealMacros: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    workoutContent: {
        paddingLeft: 10,
    },
    workoutHeaderRowCustom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
    },
    workoutHeaderTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    workoutHeaderTimeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    workoutDurationText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    exercisesListBlock: {
        marginTop: 15,
        paddingHorizontal: 20,
        gap: 8,
    },
    exerciseFeedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    exerciseFeedLeft: {
        flex: 1,
        flexDirection: 'column',
    },
    exerciseFeedRowTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    exerciseFeedEccentric: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    exerciseFeedRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '45%',
    },
    exerciseFeedDetails: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    expandTrigger: {
        alignItems: 'center',
        marginVertical: 10,
    },
    expandLineTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        justifyContent: 'center',
        width: '100%',
    },
    dividerHalf: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 10,
    },
    mediaFrame: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 10,
        aspectRatio: 1,
        borderWidth: 2,
        borderColor: Colors.theme.beige,
    },
    media: {
        width: '100%',
        height: '100%',
    },
    footerActions: {
        marginTop: 15,
        position: 'relative',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionCount: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 2,
    },
    timeLabel: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
    },
    dimOverlay: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 1,
        borderRadius: 45,
    },
    floatingButtonsRow: {
        position: 'absolute',
        bottom: 50,
        left: 0, // Align exactly horizontally with the first tribe button.
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
        paddingLeft: 35, // Adjusting so the floating tribe button centers nicely above the original
    },
    floatingTribeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2D3A26',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingCopyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#C5D7C2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tribeCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    detailedMealContainer: {
        marginTop: 10,
        gap: 12,
    },
    detailedMealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 10,
    },
    detailedMealRowShifted: {
        paddingRight: 40,
    },
    ingInfo: {
        width: 85,
        marginRight: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        position: 'relative',
    },
    ingTextContainer: {
        flex: 1,
    },
    ingName: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
        flexWrap: 'wrap',
    },
    ingAmount: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginTop: 2,
    },
    ingMacros: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    selectBtn: {
        position: 'absolute',
        right: 0,
    },
    selectBtnLeft: {
        position: 'absolute',
        left: 0,
        top: 2,
        zIndex: 1,
    },
    selectedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#2F3A27',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unselectedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.8)',
        backgroundColor: 'transparent',
    },
    detailedWorkoutContainer: {
        marginTop: 10,
        gap: 12,
    }
});
