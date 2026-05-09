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
import { useAuthStore } from '@/store/AuthStore';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { supabase } from '@/src/shared/services/supabase';
import * as Haptics from 'expo-haptics';

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
    onCopySuccess?: () => void;
    onCopyError?: (message: string) => void;
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
    onCopySuccess,
    onCopyError,
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
    const [isCopying, setIsCopying] = useState(false);
    const videoRef = useRef<Video>(null);

    const mealStore = useMealLogStore();
    const workoutStore = useWorkoutLogStore();
    const { session, profile } = useAuthStore();
    const { navigateToProfile } = useProfileNavigation();

    // myTargets: prefer live Supabase profile over persisted UserStore to ensure
    // copy math always uses the copier's actual current targets, not a cached value.
    const authTargets = profile?.macro_targets;
    const { macroTargets: storeTargets } = useUserStore();
    const myTargets = authTargets ?? storeTargets;

    // Overlay shown when user tries to copy >1 macro row simultaneously
    const [showMacroMultiSelectWarning, setShowMacroMultiSelectWarning] = useState(false);

    useEffect(() => {
        if (isSelectMode) {
            setIsExpanded(true);
        }
    }, [isSelectMode]);

    /**
     * Checks if a macro/snapshot copy action should be blocked due to multi-row selection.
     * Returns true if blocked (shows the warning overlay).
     */
    const checkMacroSingleRowConstraint = (): boolean => {
        const isMacroPost = !!(post.macroUpdate || post.snapshot);
        if (isMacroPost && isSelectMode && selectedItems.length > 1) {
            setShowMacroMultiSelectWarning(true);
            return true;
        }
        return false;
    };

    /**
     * Fetches the copier's macro targets fresh from Supabase at copy-time.
     * This guarantees math correctness even if the Zustand store is stale
     * (e.g. the user posted a macro update during the same session, updating
     * their profile targets, but the store hydrated before that change).
     * Falls back to the in-memory profile/store value if the fetch fails.
     */
    const getFreshMyTargets = async (): Promise<{ p: number; c: number; f: number; calories: number }> => {
        if (!session?.user?.id) return myTargets;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('macro_targets')
                .eq('id', session.user.id)
                .single();
            if (!error && data?.macro_targets) {
                const fresh = data.macro_targets as { p: number; c: number; f: number; calories: number };
                console.log('[CopyEngine] Store targets:', JSON.stringify(myTargets));
                console.log('[CopyEngine] DB fresh targets:', JSON.stringify(fresh));
                return fresh;
            }
        } catch {
            // Fallback silently to cached value
        }
        console.log('[CopyEngine] Fallback to store targets:', JSON.stringify(myTargets));
        return myTargets;
    };

    /**
     * Standard Copy — raw value-based transformation.
     *
     * MacroUpdate (Old/New row): copies exact raw numbers from User B directly.
     * MacroUpdate (Delta row): applies User B's raw gram/calorie delta to User A's current macros.
     * Snapshot (Targets row only): copies exact raw values from User B's target row.
     * Routes User A to the Macro Update creation screen with pre-populated input pills.
     */
    const handleStandardCopy = async () => {
        if (isCopying) return;

        // Gate: single-row constraint for macro posts
        if (checkMacroSingleRowConstraint()) return;

        setIsCopying(true);

        try {
            if (post.meal) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select items to copy over before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const itemsToCopy = selectedItems.length > 0
                    ? post.meal.ingredients.filter(ing => selectedItems.includes(ing.name))
                    : post.meal.ingredients;
                
                itemsToCopy.forEach(ing => mealStore.addItem({ ...ing, id: Date.now().toString() + Math.random() }));
                
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onCopySuccess?.();
                setIsTribeMenuOpen(false);
                router.push('/add');
            }
            else if (post.workout) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select items to copy over before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const itemsToCopy = selectedItems.length > 0
                    ? post.workout.exercises.filter(ex => selectedItems.includes(ex.title))
                    : post.workout.exercises;
                
                itemsToCopy.forEach(ex => workoutStore.addExercise({ ...ex, id: Date.now().toString() + Math.random() }));
                
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onCopySuccess?.();
                setIsTribeMenuOpen(false);
                router.push('/add-exercise');
            }
            else if (post.macroUpdate) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select a row to copy before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const selectedLine = selectedItems[0];
                if (!selectedLine) {
                    // No row selected and not in select mode — default to 'new'
                    const t = post.macroUpdate.newTargets;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push({
                        pathname: '/macro-update',
                        params: { mode: 'macro-update', p: t.p, c: t.c, f: t.f, calories: t.calories }
                    });
                    return;
                }

                if (selectedLine === 'old' || selectedLine === 'new') {
                    // Standard Copy: use exact raw values from User B's chosen row
                    const t = selectedLine === 'old'
                        ? post.macroUpdate.oldTargets
                        : post.macroUpdate.newTargets;

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push({
                        pathname: '/macro-update',
                        params: { mode: 'macro-update', p: t.p, c: t.c, f: t.f, calories: t.calories }
                    });
                } else if (selectedLine === 'diff') {
                    // Standard Copy Delta: apply User B's raw gram adjustments to User A's CURRENT macros
                    // Fetch fresh from DB to avoid stale-store math errors
                    const freshTargets = await getFreshMyTargets();
                    const rawDiffP = post.macroUpdate.newTargets.p - post.macroUpdate.oldTargets.p;
                    const rawDiffC = post.macroUpdate.newTargets.c - post.macroUpdate.oldTargets.c;
                    const rawDiffF = post.macroUpdate.newTargets.f - post.macroUpdate.oldTargets.f;

                    const myP = Math.max(0, freshTargets.p + rawDiffP);
                    const myC = Math.max(0, freshTargets.c + rawDiffC);
                    const myF = Math.max(0, freshTargets.f + rawDiffF);
                    const myCals = (myP * 4) + (myC * 4) + (myF * 9);

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push({
                        pathname: '/macro-update',
                        params: { mode: 'macro-update', p: myP, c: myC, f: myF, calories: myCals }
                    });
                }
            }
            else if (post.snapshot) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select a row to copy before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const selectedLine = selectedItems[0];
                if (selectedLine && selectedLine !== 'targets') {
                    // Guard: only the Targets row is copyable for Snapshots
                    onCopyError?.('Only the Targets row can be copied from a Snapshot post.');
                    setIsCopying(false);
                    return;
                }

                // Standard Copy: raw target values from User B
                const t = post.snapshot.targets;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onCopySuccess?.();
                setIsTribeMenuOpen(false);
                router.push({
                    pathname: '/macro-update',
                    params: { mode: 'macro-update', p: t.p, c: t.c, f: t.f, calories: t.calories }
                });
            }
        } finally {
            setIsCopying(false);
        }
    };

    /**
     * Tribe Copy — percentage-based transformation.
     *
     * MacroUpdate (Old/New row): calculates each macro's % of User B's total calories;
     *   applies those ratios to User A's current total calorie goal.
     * MacroUpdate (Delta row): calculates User B's % increase/decrease per macro;
     *   applies those exact percentage shifts to User A's current macro values.
     * Snapshot (Targets row only): same percentage-ratio logic as MacroUpdate Old/New.
     * Routes User A to the Macro Update creation screen with pre-populated input pills.
     */
    const handleTribeCopy = async () => {
        if (isCopying) return;
        if (!session?.user?.id) return;

        // Gate: single-row constraint for macro posts
        if (checkMacroSingleRowConstraint()) return;

        setIsCopying(true);

        try {
            if (post.meal) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select items to copy over before proceeding.');
                    setIsCopying(false);
                    return;
                }

                // Call the macro-scaling engine RPC
                const scaledIngredients = await SupabasePostService.tribeCopyFood(post.id, session.user.id);

                if (scaledIngredients && scaledIngredients.length > 0) {
                    const itemsToAdd = selectedItems.length > 0
                        ? scaledIngredients.filter(ing => selectedItems.includes(ing.name))
                        : scaledIngredients;

                    itemsToAdd.forEach(ing => {
                        mealStore.addItem({ 
                            ...ing, 
                            id: Date.now().toString() + Math.random(),
                            name: `${ing.name} (Tribe)`
                        });
                    });

                    await SupabasePostService.recordCopy(post.id, session.user.id, 'tribe');

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push('/add');
                } else {
                    handleStandardCopy();
                }
            }
            else if (post.macroUpdate) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select a row to copy before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const selectedLine = selectedItems[0];

                // Fetch User A's current macro targets fresh from Supabase
                // to guarantee percentage math uses the correct baseline.
                const freshTargets = await getFreshMyTargets();

                if (!selectedLine || selectedLine === 'old' || selectedLine === 'new') {
                    // Tribe Copy Old/New: percentage-ratio transform
                    // Always compute bCals from grams — never trust the stored calories field.
                    const t = selectedLine === 'old'
                        ? post.macroUpdate.oldTargets
                        : post.macroUpdate.newTargets;

                    const bCals = (t.p * 4) + (t.c * 4) + (t.f * 9);
                    const myFreshCals = (freshTargets.p * 4) + (freshTargets.c * 4) + (freshTargets.f * 9);

                    let myP: number, myC: number, myF: number;

                    if (bCals > 0) {
                        const pPct = (t.p * 4) / bCals;
                        const cPct = (t.c * 4) / bCals;
                        const fPct = (t.f * 9) / bCals;

                        myP = Math.round((pPct * myFreshCals) / 4);
                        myC = Math.round((cPct * myFreshCals) / 4);
                        myF = Math.round((fPct * myFreshCals) / 9);
                    } else {
                        myP = freshTargets.p;
                        myC = freshTargets.c;
                        myF = freshTargets.f;
                    }
                    const calcCals = (myP * 4) + (myC * 4) + (myF * 9);

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push({
                        pathname: '/macro-update',
                        params: { mode: 'macro-update', p: myP, c: myC, f: myF, calories: calcCals }
                    });
                } else if (selectedLine === 'diff') {
                    // Tribe Copy Delta: compute User B's % shift per macro, apply to User A's fresh values
                    const oldT = post.macroUpdate.oldTargets;
                    const newT = post.macroUpdate.newTargets;

                    const pShift = oldT.p > 0 ? (newT.p - oldT.p) / oldT.p : 0;
                    const cShift = oldT.c > 0 ? (newT.c - oldT.c) / oldT.c : 0;
                    const fShift = oldT.f > 0 ? (newT.f - oldT.f) / oldT.f : 0;

                    const myP = Math.max(0, Math.round(freshTargets.p * (1 + pShift)));
                    const myC = Math.max(0, Math.round(freshTargets.c * (1 + cShift)));
                    const myF = Math.max(0, Math.round(freshTargets.f * (1 + fShift)));
                    const myCals = (myP * 4) + (myC * 4) + (myF * 9);

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onCopySuccess?.();
                    setIsTribeMenuOpen(false);
                    router.push({
                        pathname: '/macro-update',
                        params: { mode: 'macro-update', p: myP, c: myC, f: myF, calories: myCals }
                    });
                }
            }
            else if (post.snapshot) {
                if (isSelectMode && selectedItems.length === 0) {
                    onCopyError?.('Please select a row to copy before proceeding.');
                    setIsCopying(false);
                    return;
                }
                const selectedLine = selectedItems[0];
                if (selectedLine && selectedLine !== 'targets') {
                    onCopyError?.('Only the Targets row can be copied from a Snapshot post.');
                    setIsCopying(false);
                    return;
                }

                // Tribe Copy Snapshot Targets: percentage-ratio transform using User B's target cals
                const freshTargets = await getFreshMyTargets();
                const t = post.snapshot.targets;
                // Always compute from grams — never trust the stored calories field
                const bCals = (t.p * 4) + (t.c * 4) + (t.f * 9);
                const myFreshCals = (freshTargets.p * 4) + (freshTargets.c * 4) + (freshTargets.f * 9);

                console.log('[Snapshot Copy] Avery targets:', JSON.stringify(t));
                console.log('[Snapshot Copy] Avery computed bCals:', bCals);
                console.log('[Snapshot Copy] My fresh targets:', JSON.stringify(freshTargets));
                console.log('[Snapshot Copy] My computed fresh cals:', myFreshCals);

                let myP: number, myC: number, myF: number;
                if (bCals > 0) {
                    const pPct = (t.p * 4) / bCals;
                    const cPct = (t.c * 4) / bCals;
                    const fPct = (t.f * 9) / bCals;
                    
                    console.log('[Snapshot Copy] Pct P/C/F:', pPct, cPct, fPct);

                    myP = Math.round((pPct * myFreshCals) / 4);
                    myC = Math.round((cPct * myFreshCals) / 4);
                    myF = Math.round((fPct * myFreshCals) / 9);
                    
                    console.log('[Snapshot Copy] Calculated myP/myC/myF:', myP, myC, myF);
                } else {
                    myP = freshTargets.p;
                    myC = freshTargets.c;
                    myF = freshTargets.f;
                }
                const calcCals = (myP * 4) + (myC * 4) + (myF * 9);

                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onCopySuccess?.();
                setIsTribeMenuOpen(false);
                router.push({
                    pathname: '/macro-update',
                    params: { mode: 'macro-update', p: myP, c: myC, f: myF, calories: calcCals }
                });
            }
            else {
                // Workout — tribe copy handled by handleWorkoutTribeCopy, fallback
                handleStandardCopy();
            }
        } catch (error) {
            console.error('[FeedItem.handleTribeCopy]', error);
            handleStandardCopy();
        } finally {
            setIsCopying(false);
        }
    };

    /**
     * Single-tap tribe copy for exercise posts.
     * Respects selector-mode gatekeeper rules and flushes state on success.
     */
    const handleWorkoutTribeCopy = async () => {
        if (isCopying || !post.workout) return;

        // Rule C: selector open but nothing checked
        if (isSelectMode && selectedItems.length === 0) {
            onCopyError?.('Please select at least one exercise to copy over before proceeding.');
            return;
        }

        setIsCopying(true);
        try {
            // Rule A (all) or Rule B (selection subset)
            const exercisesToCopy = selectedItems.length > 0
                ? post.workout.exercises.filter(ex => selectedItems.includes(ex.title))
                : post.workout.exercises;

            exercisesToCopy.forEach(ex =>
                workoutStore.addExercise({ ...ex, id: Date.now().toString() + Math.random() })
            );

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // onCopySuccess flushes selectedItems and collapses select mode in the parent
            onCopySuccess?.();
            router.push('/add-exercise');
        } finally {
            setIsCopying(false);
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
            if (post.snapshot) {
                onToggleSelect?.('targets', 'snapshot');
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

    const renderMacroValue = (icon: any, val: number, unit: string, colorOverride?: string, showPlus?: boolean, scale: 'normal' | 'small' = 'normal', width?: number) => {
        return renderMacroColumn(icon, Math.abs(val), unit, width, colorOverride, scale);
    };

    /** Always derive calories from grams — never trust the stored calories field which may be stale */
    const computeCals = (p?: number, c?: number, f?: number) => Math.round((p || 0) * 4 + (c || 0) * 4 + (f || 0) * 9);

    const renderSnapshot = (snapshot: Snapshot) => {
        const targetCals = computeCals(snapshot.targets.p, snapshot.targets.c, snapshot.targets.f);
        const consumedCals = computeCals(snapshot.consumed.p, snapshot.consumed.c, snapshot.consumed.f);
        
        const targetDisplay = { ...snapshot.targets, calories: targetCals };
        const consumedDisplay = { ...snapshot.consumed, calories: consumedCals };

        const remains = {
            calories: targetCals - consumedCals,
            p: snapshot.targets.p - snapshot.consumed.p,
            c: snapshot.targets.c - snapshot.consumed.c,
            f: snapshot.targets.f - snapshot.consumed.f,
        };

        const getColor = (val: number) => {
            if (val > 0) return TRIBE_GREEN;
            if (val < 0) return BURGUNDY;
            return WHITE;
        };

        const renderRow = (
            label: string,
            vals: { calories: number; p: number; c: number; f: number },
            colors: { calories: string; p: string; c: string; f: string },
            selectionKey?: string,
        ) => (
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
                <View style={[styles.macroLabelBox, isSelectMode && selectionKey ? { paddingLeft: 28 } : {}]}>
                    <Text
                        style={[
                            styles.macroLabelText,
                            label === 'Balance' && { fontSize: 18, lineHeight: 20 },
                            (label === 'Targets' || label === 'Actual') && { fontSize: 16, lineHeight: 17 },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {label}
                    </Text>
                </View>
                <View style={styles.macroValuesRow}>
                    <View style={{ width: 80 }}>
                        {renderMacroValue('fire', Math.abs(vals.calories), ' cals', colors.calories, false, 'small', 80)}
                    </View>
                    <View style={styles.macroSubRow}>
                        <View style={styles.macroCol}>
                            {renderMacroValue('food-drumstick', Math.abs(vals.p), 'g', colors.p, false, 'small')}
                        </View>
                        <View style={styles.macroCol}>
                            {renderMacroValue('barley', Math.abs(vals.c), 'g', colors.c, false, 'small')}
                        </View>
                        <View style={styles.macroCol}>
                            {renderMacroValue('water', Math.abs(vals.f), 'g', colors.f, false, 'small')}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );

        if (!isExpanded) {
            return (
                <View style={styles.macroUpdateContent}>
                    {renderRow('Balance', remains, {
                        calories: getColor(remains.calories),
                        p: getColor(remains.p),
                        c: getColor(remains.c),
                        f: getColor(remains.f),
                    })}
                </View>
            );
        }

        return (
            <View style={styles.macroUpdateContent}>
                {renderRow('Targets', targetDisplay, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE }, 'targets')}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Actual', consumedDisplay, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE })}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Balance', remains, {
                    calories: getColor(remains.calories),
                    p: getColor(remains.p),
                    c: getColor(remains.c),
                    f: getColor(remains.f),
                })}
            </View>
        );
    };
    const renderMacroUpdate = (mu: MacroUpdate) => {
        // Recompute all calories from grams so display is always accurate
        const oldCals = computeCals(mu.oldTargets.p, mu.oldTargets.c, mu.oldTargets.f);
        const newCals = computeCals(mu.newTargets.p, mu.newTargets.c, mu.newTargets.f);
        const delta = {
            calories: newCals - oldCals,
            p: mu.newTargets.p - mu.oldTargets.p,
            c: mu.newTargets.c - mu.oldTargets.c,
            f: mu.newTargets.f - mu.oldTargets.f,
        };
        // Build display-safe copies with computed calories
        const oldDisplay = { ...mu.oldTargets, calories: oldCals };
        const newDisplay = { ...mu.newTargets, calories: newCals };

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
                <View style={[
                    styles.macroLabelBox, 
                    (isSelectMode && selectionKey) && { paddingLeft: 28 }
                ]}>
                    <Text 
                        style={[
                            styles.macroLabelText,
                            (label === 'Balance' || label === 'New targets') && { fontSize: 18, lineHeight: 20 },
                            label === 'New targets' && { maxWidth: 80 },
                            (label.includes('/') || label === 'Updates') && { fontSize: 16, lineHeight: 17 }
                        ]}
                        numberOfLines={label === 'New targets' ? undefined : 1}
                        adjustsFontSizeToFit={label === 'New targets' ? false : true}
                    >
                        {label}
                    </Text>
                </View>
                <View style={styles.macroValuesRow}>
                    <View style={{ width: 80 }}>
                        {renderMacroValue('fire', vals.calories, ' cals', colors.calories, isDelta, 'small', 80)}
                    </View>
                    <View style={styles.macroSubRow}>
                        <View style={styles.macroCol}>
                            {renderMacroValue('food-drumstick', vals.p, 'g', colors.p, isDelta, 'small')}
                        </View>
                        <View style={styles.macroCol}>
                            {renderMacroValue('barley', vals.c, 'g', colors.c, isDelta, 'small')}
                        </View>
                        <View style={styles.macroCol}>
                            {renderMacroValue('water', vals.f, 'g', colors.f, isDelta, 'small')}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );

        if (!isExpanded) {
            return (
                <View style={styles.macroUpdateContent}>
                    {renderRow('New targets', newDisplay, {
                        calories: getNewColor(newDisplay.calories, oldDisplay.calories),
                        p: getNewColor(newDisplay.p, oldDisplay.p),
                        c: getNewColor(newDisplay.c, oldDisplay.c),
                        f: getNewColor(newDisplay.f, oldDisplay.f),
                    }, 'new')}
                </View>
            );
        }

        return (
            <View style={styles.macroUpdateContent}>
                {renderRow(mu.oldDate || '12/25/2025', oldDisplay, { calories: WHITE, p: WHITE, c: WHITE, f: WHITE }, 'old')}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('Updates', delta, {
                    calories: getDeltaColor(delta.calories),
                    p: getDeltaColor(delta.p),
                    c: getDeltaColor(delta.c),
                    f: getDeltaColor(delta.f),
                }, 'diff', true)}
                <View style={[styles.divider, { opacity: 0.1, marginVertical: 4 }]} />
                {renderRow('New targets', newDisplay, {
                    calories: getNewColor(newDisplay.calories, oldDisplay.calories),
                    p: getNewColor(newDisplay.p, oldDisplay.p),
                    c: getNewColor(newDisplay.c, oldDisplay.c),
                    f: getNewColor(newDisplay.f, oldDisplay.f),
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
                            {renderMacroColumn('fire', computeCals(meal.macros?.p, meal.macros?.c, meal.macros?.f), ' cals', 85, undefined, 'normal')}
                            {renderMacroColumn('food-drumstick', meal.macros?.p || 0, 'g', 55, undefined, 'normal')}
                            {renderMacroColumn('barley', meal.macros?.c || 0, 'g', 55, undefined, 'normal')}
                            {renderMacroColumn('water', meal.macros?.f || 0, 'g', 55, undefined, 'normal')}
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
                                        {renderMacroColumn('fire', computeCals(ing.macros?.p, ing.macros?.c, ing.macros?.f), ' cals', isSelectMode ? 75 : 85, 'white', 'small')}
                                        {renderMacroColumn('food-drumstick', ing.macros?.p || 0, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
                                        {renderMacroColumn('barley', ing.macros?.c || 0, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
                                        {renderMacroColumn('water', ing.macros?.f || 0, 'g', isSelectMode ? 42 : 55, 'white', 'small')}
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

            {/* Single-row gatekeeper overlay for macro posts */}
            {showMacroMultiSelectWarning && (
                <View style={styles.macroWarningOverlay}>
                    <View style={styles.macroWarningBox}>
                        <Ionicons name="warning" size={24} color="#825858" style={{ marginBottom: 8 }} />
                        <Text style={styles.macroWarningTitle}>One config at a time</Text>
                        <Text style={styles.macroWarningBody}>
                            You can only copy one target configuration at a time to your active macro update. However, you can add up to three configurations to your Macro book for later review.
                        </Text>
                        <TouchableOpacity
                            style={styles.macroWarningDismiss}
                            onPress={() => setShowMacroMultiSelectWarning(false)}
                        >
                            <Text style={styles.macroWarningDismissText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
                            <Image 
                                source={{ uri: post.mediaUrl }} 
                                style={styles.media} 
                                resizeMode="cover"
                            />
                        )}
                    </View>
                )}
            </TouchableOpacity>

            <View style={[styles.footerActions, { zIndex: 10 }]}>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={post.workout
                            ? handleWorkoutTribeCopy
                            : () => setIsTribeMenuOpen(!isTribeMenuOpen)
                        }
                    >
                        {/* Sub-menu only shown for non-workout posts */}
                        {isTribeMenuOpen && !post.workout && (
                            <View style={styles.floatingButtonsWrapper}>
                                <TouchableOpacity style={styles.floatingTribeBtn} onPress={handleTribeCopy}>
                                    <TabonoLogo size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.floatingCopyBtn} onPress={handleStandardCopy}>
                                    <Ionicons name="copy" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.iconBox}>
                            <View style={styles.tribeCircle}>
                                <TabonoLogo size={20} color="#A5B79D" />
                            </View>
                        </View>
                        <Text style={styles.actionCount}>{post.stats.shares}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressLike}>
                        <View style={styles.iconBox}>
                            <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={28} color="white" />
                        </View>
                        <Text style={styles.actionCount}>{post.stats.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                        <View style={styles.iconBox}>
                            <Ionicons name="chatbubble-ellipses" size={26} color="white" />
                        </View>
                        <Text style={styles.actionCount}>{post.stats.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressShare || onPressSave}>
                        <View style={styles.iconBox}>
                            <Ionicons name="arrow-redo-outline" size={26} color="white" />
                        </View>
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
    snapshotHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 5,
    },
    snapshotLabel: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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
        flex: 1,
        paddingRight: 4,
        justifyContent: 'center',
    },
    macroLabelText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroValuesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    macroSubRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
    },
    macroCol: {
        width: 46,
        alignItems: 'flex-end',
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
        justifyContent: 'flex-end',
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
        alignSelf: 'center',
        width: '100%',
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
        gap: 20,
    },
    actionItem: {
        alignItems: 'center',
    },
    iconBox: {
        height: 34,
        justifyContent: 'center',
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
    floatingButtonsWrapper: {
        position: 'absolute',
        bottom: 50,
        width: 80,
        left: '50%',
        marginLeft: -40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
    },
    floatingTribeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#A5B79D',
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
        top: 0,
        bottom: 0,
        justifyContent: 'center',
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
    },
    // Progress Bar Styles
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressIcon: {
        width: 32,
        alignItems: 'center',
    },
    progressTrackWrapper: {
        flex: 1,
        marginLeft: 10,
    },
    progressTrack: {
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    progressSegment: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white',
    },
    carrotRow: {
        flexDirection: 'row',
        height: 25,
        position: 'relative',
    },
    // Macro multi-select gatekeeper overlay
    macroWarningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 45,
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    macroWarningBox: {
        backgroundColor: '#EAE7D6',
        borderRadius: 24,
        padding: 22,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    macroWarningTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2F3A27',
        marginBottom: 8,
        textAlign: 'center',
    },
    macroWarningBody: {
        fontSize: 14,
        color: '#4A5D4E',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    macroWarningDismiss: {
        backgroundColor: '#4A5D4E',
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 20,
    },
    macroWarningDismissText: {
        color: '#F5F5DC',
        fontSize: 15,
        fontWeight: '700',
    },
});

