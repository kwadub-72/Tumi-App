import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AVPlaybackStatusSuccess, ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback, Modal, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { FeedPost, Snapshot, Meal, Workout, MacroUpdate } from '@/src/shared/models/types';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { Colors } from '@/src/shared/theme/Colors';
import { resolveActivityIcon } from '@/src/shared/constants/Activities';
import VerifiedModal from '@/components/VerifiedModal';
import { useMealLogStore } from '@/src/store/useMealLogStore';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { useUserStore } from '@/store/UserStore';
import { useAuthStore } from '@/store/AuthStore';
import { useProfileNavigation } from '@/src/shared/hooks/useProfileNavigation';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { supabase } from '@/src/shared/services/supabase';
import * as Haptics from 'expo-haptics';
import { MacroMapDeepDiveSheet } from '@/src/features/macro-maps/components/MacroMapDeepDiveSheet';
import { MacroMapPreviewCard } from '@/src/features/macromaps/components/MacroMapPreviewCard';
import { DiscoveryMapCard } from '@/src/features/macromaps/components/DiscoveryMapCard';
import { useSubscribeToLiveMap } from '@/src/features/macromaps/hooks/useSubscribeToLiveMap';
import { MapComposerSheet } from '@/src/features/macromaps/components/MapComposerSheet';


const BURGUNDY = Colors.theme.burntSienna; // Accent 2 (Burnt Sienna)
const TRIBE_GREEN = Colors.theme.oliveDrab; // Secondary (Olive)
const WHITE = Colors.theme.softWhite;

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
    const [isMacroMapSheetVisible, setIsMacroMapSheetVisible] = useState(false);
    const [isSubscribeConfirmVisible, setIsSubscribeConfirmVisible] = useState(false);
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [isComposerVisible, setIsComposerVisible] = useState(false);
    const [composerCaption, setComposerCaption] = useState('');
    const { mutateAsync: subscribeToLiveMap } = useSubscribeToLiveMap();
    const [isAlreadySubscribedModalVisible, setIsAlreadySubscribedModalVisible] = useState(false);
    const [checkingSubscription, setCheckingSubscription] = useState(false);
    const [isMapComposerVisible, setIsMapComposerVisible] = useState(false);
    const [publishCaption, setPublishCaption] = useState('');
    const [isShareMenuVisible, setIsShareMenuVisible] = useState(false);

    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likesCount, setLikesCount] = useState(post.stats.likes || 0);

    useEffect(() => {
        setIsLiked(post.isLiked || false);
    }, [post.isLiked]);

    useEffect(() => {
        setLikesCount(post.stats.likes || 0);
    }, [post.stats.likes]);

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextLiked = !isLiked;
        setIsLiked(nextLiked);
        setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
        if (onPressLike) {
            onPressLike();
        }
    };


    const handleMapCopyPress = async () => {
        if (!session?.user?.id || !post.macroMap) return;
        if (checkingSubscription) return;
        setCheckingSubscription(true);
        try {
            const { data, error } = await supabase
                .from('macro_map_subscriptions')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('map_id', post.macroMap.id)
                .eq('status', 'ACTIVE')
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setIsAlreadySubscribedModalVisible(true);
            } else {
                setIsSubscribeConfirmVisible(true);
            }
        } catch (err) {
            console.error('[FeedItem] Error checking subscription:', err);
            setIsSubscribeConfirmVisible(true);
        } finally {
            setCheckingSubscription(false);
        }
    };

    const handleQuickSubscribe = async () => {
        if (!session?.user?.id || !profile || !post.macroMap) {
            Alert.alert("Authentication Required", "Please log in to subscribe to maps.");
            return;
        }

        try {
            const subscriberTargetCals = profile.macro_targets?.calories || 2000;
            await subscribeToLiveMap({
                subscriberId: session.user.id,
                mapId: post.macroMap.id,
                subscriberTargetCals: subscriberTargetCals
            });

            setIsSubscribeConfirmVisible(false);
            setIsShareModalVisible(true);
        } catch (err: any) {
            Alert.alert("Subscription Failed", err.message || "An error occurred during subscription.");
        }
    };

    const handlePostMap = async () => {
        if (!session?.user?.id || !post.macroMap) return;
        try {
            const mapPayload = {
                macroMap: {
                    id: post.macroMap.id,
                    name: post.macroMap.name || '',
                    mapType: post.macroMap.mapType,
                    durationWeeks: post.macroMap.durationWeeks,
                    avgMacroShiftPct: post.macroMap.avgMacroShiftPct || 0,
                    isLive: post.macroMap.isLive || false,
                    checkpoints: post.macroMap.checkpoints || [],
                    profiles: post.macroMap.profiles || []
                }
            };
            
            await SupabasePostService.addMapPost(
                session.user.id,
                post.macroMap.id,
                'map_subscribe',
                composerCaption,
                mapPayload
            );
            setComposerCaption('');
            setIsComposerVisible(false);
            if (onCopySuccess) onCopySuccess();
        } catch (err: any) {
            Alert.alert("Post Failed", err.message || "Could not publish your post.");
            throw err;
        }
    };

    const handleMapSharePress = () => {
        setIsShareMenuVisible(true);
    };

    const handlePublishMap = async () => {
        if (!session?.user?.id || !post.macroMap) return;
        try {
            const mapPayload = {
                macroMap: {
                    id: post.macroMap.id,
                    name: post.macroMap.name || '',
                    mapType: post.macroMap.mapType,
                    durationWeeks: post.macroMap.durationWeeks,
                    avgMacroShiftPct: post.macroMap.avgMacroShiftPct || 0,
                    isLive: post.macroMap.isLive || false,
                    checkpoints: post.macroMap.checkpoints || [],
                    profiles: post.macroMap.profiles || []
                }
            };
            
            await SupabasePostService.addMapPost(
                session.user.id,
                post.macroMap.id,
                'map_publish',
                publishCaption,
                mapPayload
            );
            setPublishCaption('');
            setIsMapComposerVisible(false);
            if (onCopySuccess) onCopySuccess();
        } catch (err: any) {
            Alert.alert("Post Failed", err.message || "Could not publish your post.");
            throw err;
        }
    };

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
        if (post.macroMap) {
            setIsMacroMapSheetVisible(true);
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

    const isTribeFeed = !cardColor || cardColor === '#262525';

    const renderMacroColumn = (icon: any, val: number, unit: string, width?: number, colorOverride?: string, scale: 'normal' | 'small' = 'normal', textColorOverride?: string) => {
        const numColor = isTribeFeed ? '#FFFFFF' : (textColorOverride || colorOverride || 'white');
        const unitColor = isTribeFeed ? '#FFFFFF' : (textColorOverride || colorOverride || 'white');
        const iconColor = isTribeFeed ? '#DAA520' : (colorOverride || Colors.theme.softWhite);

        const isBubble = icon === 'food-drumstick' || icon === 'barley' || icon === 'water';
        const bubbleLetter = icon === 'food-drumstick' ? 'P' : icon === 'barley' ? 'C' : 'F';

        return (
            <View style={[styles.macroValueItem, width ? { width, justifyContent: 'flex-start' } : {}]}>
                {isBubble ? (
                    <View style={{
                        backgroundColor: Colors.theme.harvestGold,
                        borderRadius: 8,
                        width: 16,
                        height: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 4
                    }}>
                        <Text style={{
                            color: Colors.theme.matteBlack,
                            fontWeight: 'bold',
                            fontSize: 9
                        }}>
                            {bubbleLetter}
                        </Text>
                    </View>
                ) : (
                    <MaterialCommunityIcons name={icon} size={scale === 'small' ? 14 : 18} color={iconColor} />
                )}
                <Text style={[
                    styles.macroValueText, 
                    scale === 'small' && { fontSize: 13, fontWeight: '500' }
                ]}>
                    <Text style={{ color: numColor }}>{formatVal(val)}</Text>
                    <Text style={{ color: unitColor }}>{unit}</Text>
                </Text>
            </View>
        );
    };

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
                                <Ionicons name="checkmark" size={16} color={Colors.theme.softWhite} />
                            </View>
                        ) : (
                            <View style={styles.unselectedCircle} />
                        )}
                    </View>
                )}
                <View style={[
                    styles.macroLabelBox, 
                    { width: isSelectMode ? 130 : 85, flex: 0 },
                    isSelectMode && selectionKey ? { paddingLeft: 28 } : {}
                ]}>
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
                <View style={styles.ingMacrosFixed}>
                    {renderMacroColumn('fire', Math.abs(vals.calories), ' cals', isSelectMode ? 75 : 85, colors.calories, 'small')}
                    {renderMacroColumn('food-drumstick', Math.abs(vals.p), 'g', isSelectMode ? 42 : 55, colors.p, 'small')}
                    {renderMacroColumn('barley', Math.abs(vals.c), 'g', isSelectMode ? 42 : 55, colors.c, 'small')}
                    {renderMacroColumn('water', Math.abs(vals.f), 'g', isSelectMode ? 42 : 55, colors.f, 'small')}
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
                activeOpacity={isSelectMode && selectionKey ? 0.7 : 1}
                onPress={() => isSelectMode && selectionKey && onToggleSelect?.(selectionKey, 'macro')}
                style={styles.macroUpdateRow}
            >
                {isSelectMode && selectionKey && (
                    <View style={styles.selectBtnLeft}>
                        {selectedItems.includes(selectionKey) ? (
                            <View style={styles.selectedCircle}>
                                <Ionicons name="checkmark" size={16} color={Colors.theme.softWhite} />
                            </View>
                        ) : (
                            <View style={styles.unselectedCircle} />
                        )}
                    </View>
                )}
                <View style={[
                    styles.macroLabelBox, 
                    { width: isSelectMode ? 130 : 85, flex: 0 },
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
                <View style={styles.ingMacrosFixed}>
                    {renderMacroColumn('fire', Math.abs(vals.calories), ' cals', isSelectMode ? 75 : 85, colors.calories, 'small')}
                    {renderMacroColumn('food-drumstick', Math.abs(vals.p), 'g', isSelectMode ? 42 : 55, colors.p, 'small')}
                    {renderMacroColumn('barley', Math.abs(vals.c), 'g', isSelectMode ? 42 : 55, colors.c, 'small')}
                    {renderMacroColumn('water', Math.abs(vals.f), 'g', isSelectMode ? 42 : 55, colors.f, 'small')}
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
                            {renderMacroColumn('fire', computeCals(meal.macros?.p, meal.macros?.c, meal.macros?.f), ' cals', 85, Colors.theme.harvestGold, 'normal', Colors.theme.softWhite)}
                            {renderMacroColumn('food-drumstick', meal.macros?.p || 0, 'g', 55, Colors.theme.harvestGold, 'normal', Colors.theme.softWhite)}
                            {renderMacroColumn('barley', meal.macros?.c || 0, 'g', 55, Colors.theme.harvestGold, 'normal', Colors.theme.softWhite)}
                            {renderMacroColumn('water', meal.macros?.f || 0, 'g', 55, Colors.theme.harvestGold, 'normal', Colors.theme.softWhite)}
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
                                                        <Ionicons name="checkmark" size={16} color={Colors.theme.softWhite} />
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
                                <MaterialCommunityIcons name="timer-outline" size={20} color={isTribeFeed ? '#DAA520' : Colors.theme.softWhite} />
                                <Text style={[styles.workoutDurationText, isTribeFeed && { color: '#FFFFFF' }]}>
                                    {isTribeFeed ? (
                                        <>
                                            <Text style={{ color: '#FFFFFF' }}>{workout.duration >= 60 ? Math.floor(workout.duration / 60) : workout.duration}</Text>
                                            <Text style={{ color: '#FFFFFF' }}>{workout.duration >= 60 ? ' hr' : ' min'}</Text>
                                            {workout.duration >= 60 && workout.duration % 60 > 0 && (
                                                <>
                                                    <Text style={{ color: '#FFFFFF' }}> {workout.duration % 60}</Text>
                                                    <Text style={{ color: '#FFFFFF' }}> min</Text>
                                                </>
                                            )}
                                        </>
                                    ) : formatDuration(workout.duration)}
                                </Text>
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
                                                        <Ionicons name="checkmark" size={16} color={Colors.theme.softWhite} />
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
                                                color={isTribeFeed ? '#DAA520' : "rgba(255,255,255,0.7)"} 
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.exerciseFeedDetails}>
                                                {ex.type === 'Cardio' ? (
                                                    isTribeFeed ? (
                                                        <>
                                                            {ex.speed ? <><Text style={{ color: '#FFFFFF' }}>{ex.speed}</Text><Text style={{ color: '#FFFFFF' }}> speed</Text></> : null}
                                                            {ex.incline ? <><Text style={{ color: '#FFFFFF' }}>, </Text><Text style={{ color: '#FFFFFF' }}>{ex.incline}</Text><Text style={{ color: '#FFFFFF' }}> incline</Text></> : null}
                                                            {ex.duration ? <><Text style={{ color: '#FFFFFF' }}>, </Text><Text style={{ color: '#FFFFFF' }}>{ex.duration}</Text><Text style={{ color: '#FFFFFF' }}> min</Text></> : null}
                                                        </>
                                                    ) : cardioStr
                                                ) : (
                                                    isTribeFeed && ex.sets?.length ? (
                                                        <>
                                                            <Text style={{ color: '#FFFFFF' }}>{ex.sets.length}</Text>
                                                            <Text style={{ color: '#FFFFFF' }}> sets x </Text>
                                                            <Text style={{ color: '#FFFFFF' }}>{ex.sets[0]?.reps || 0}</Text>
                                                            <Text style={{ color: '#FFFFFF' }}> reps</Text>
                                                        </>
                                                    ) : setsStr
                                                )}
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
                                                <Ionicons name="checkmark" size={16} color={Colors.theme.softWhite} />
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

    const renderMacroMap = (macroMap: any) => {
        return (
            <TouchableOpacity onPress={() => router.push({ pathname: '/map-preview', params: { map_id: macroMap.id } } as any)}>
                <MacroMapPreviewCard 
                    map={macroMap} 
                />
            </TouchableOpacity>
        );
    };

    const content = () => {
        if (post.snapshot) return renderSnapshot(post.snapshot);
        if (post.macroMap) return renderMacroMap(post.macroMap);
        if (post.macroUpdate) return renderMacroUpdate(post.macroUpdate);
        if (post.meal) return renderMeal(post.meal);
        if (post.workout) return renderWorkout(post.workout);
        return null;
    };

    const resolvedCaption = (post.caption || post.snapshot?.caption || post.macroUpdate?.caption || post.workout?.title || post.meal?.title || '').trim();
    const hasCaption = resolvedCaption !== '';
    const renderAsDiscoveryCard = false;

    const mapCreatorProfile = post.macroMap?.profiles 
        ? (Array.isArray(post.macroMap.profiles) ? post.macroMap.profiles[0] : post.macroMap.profiles)
        : null;

    const discoveryMapData = (renderAsDiscoveryCard && post.macroMap) ? {
        ...post.macroMap,
        id: post.macroMap.id,
        map_name: post.macroMap.name || 'Map Journey',
        creator_id: (post.macroMap as any).creator_id || mapCreatorProfile?.id || mapCreatorProfile?.creator_id || post.user.id,
        display_name: mapCreatorProfile?.name || post.user.name,
        creator_handle: mapCreatorProfile?.handle || post.user.handle,
        username: mapCreatorProfile?.handle || post.user.handle,
        avatar_url: typeof mapCreatorProfile?.avatar_url === 'string' 
            ? mapCreatorProfile.avatar_url 
            : (typeof mapCreatorProfile?.avatarUrl === 'string'
                ? mapCreatorProfile.avatarUrl
                : (typeof post.user.avatar === 'string' ? post.user.avatar : null)),
        is_natural: (post.macroMap as any).creator_status_snapshot === 'natural' || mapCreatorProfile?.status === 'natural' || post.user.status === 'natural',
        activity_type: mapCreatorProfile?.activity || post.user.activity || '',
        activity_icon: mapCreatorProfile?.activity_icon || mapCreatorProfile?.activityIcon || post.user.activityIcon || '',
        global_track: post.macroMap.mapType?.toUpperCase() as any,
        is_live: post.macroMap.isLive,
        broadcast_status: post.macroMap.isLive ? 'active' : 'inactive',
        engine_type: (post.macroMap as any).engine_type || (post.macroMap.isLive ? 'LIVE' : 'STATIC'),
        created_at: post.createdAt || new Date().toISOString(),
        generation_type: (post.macroMap as any).generation_type || 'update',
        total_duration_weeks: post.macroMap.durationWeeks,
        global_calorie_shift_pct: post.macroMap.avgMacroShiftPct,
    } : null;

    return (
        <Animated.View 
            style={[
                renderAsDiscoveryCard ? { marginBottom: 16 } : styles.card, 
                cardColor && !renderAsDiscoveryCard ? { backgroundColor: cardColor } : {}
            ]}
            // @ts-ignore
            sharedTransitionTag={sharedTransitionTag}
        >
            {post.macroMap && (
                <MacroMapDeepDiveSheet 
                    visible={isMacroMapSheetVisible} 
                    onClose={() => setIsMacroMapSheetVisible(false)} 
                    mapData={post.macroMap as any} 
                    isCreator={post.user.id === session?.user?.id}
                    onSaveMap={async () => {
                        if (session?.user?.id && post.macroMap) {
                            await SupabasePostService.toggleSaveMap(session.user.id, post.macroMap.id);
                            Alert.alert("Success", "Map Book updated!");
                        }
                    }}
                />
            )}
            
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

            {/* Already Subscribed Modal */}
            <Modal
                transparent
                visible={isAlreadySubscribedModalVisible}
                animationType="fade"
                onRequestClose={() => setIsAlreadySubscribedModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Already Subscribed</Text>
                        <Text style={styles.modalBody}>You are already actively subscribed to this map.</Text>
                        <TouchableOpacity
                            style={styles.errorDismissBtn}
                            onPress={() => setIsAlreadySubscribedModalVisible(false)}
                        >
                            <Text style={styles.errorDismissBtnText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Quick Subscribe Modal Dialogs */}
            <Modal
                transparent
                visible={isSubscribeConfirmVisible}
                animationType="fade"
                onRequestClose={() => setIsSubscribeConfirmVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Subscription</Text>
                        <Text style={styles.modalBody}>Are you sure you want to subscribe to this map?</Text>
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setIsSubscribeConfirmVisible(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleQuickSubscribe}
                            >
                                <Text style={styles.modalConfirmBtnText}>Yes, subscribe</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isShareModalVisible}
                animationType="fade"
                onRequestClose={() => setIsShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Subscription Active</Text>
                        <Text style={styles.modalBody}>Share this map to your feeds?</Text>
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setIsShareModalVisible(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>No, keep it private</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={() => {
                                    setIsShareModalVisible(false);
                                    setIsComposerVisible(true);
                                }}
                            >
                                <Text style={styles.modalConfirmBtnText}>Yes, share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Custom Midnight Gold Share Menu Modal */}
            <Modal 
                animationType="slide" 
                onRequestClose={() => setIsShareMenuVisible(false)} 
                transparent={true} 
                visible={isShareMenuVisible}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => setIsShareMenuVisible(false)} 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
                >
                    <View style={{ backgroundColor: Colors.theme.charcoal, borderRadius: 24, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: Colors.theme.harvestGold }}>
                        <Text style={{ color: Colors.theme.softWhite, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
                            Share Map
                        </Text>
                        
                        <TouchableOpacity 
                            style={{ backgroundColor: Colors.theme.harvestGold, borderRadius: 12, padding: 16, marginBottom: 16 }}
                            onPress={() => {
                                setIsShareMenuVisible(false);
                                setTimeout(() => onPressShare?.(), 300); // Tribe Mark Overlay
                            }}
                        >
                            <Text style={{ color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Share Tribe Mark</Text>
                        </TouchableOpacity>

                        {post.user.id === session?.user?.id && (
                            <TouchableOpacity 
                                style={{ backgroundColor: Colors.theme.harvestGold, borderRadius: 12, padding: 16, marginBottom: 16 }}
                                onPress={() => {
                                    setIsShareMenuVisible(false);
                                    setTimeout(() => setIsMapComposerVisible(true), 300); // Share to Feed Composer
                                }}
                            >
                                <Text style={{ color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Share to Feed</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={() => setIsShareMenuVisible(false)}>
                            <Text style={{ color: Colors.theme.dust, fontSize: 16, fontWeight: '600', textAlign: 'center', padding: 8 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {isComposerVisible && post.macroMap && (
                <MapComposerSheet
                    visible={isComposerVisible}
                    onClose={() => setIsComposerVisible(false)}
                    mapData={post.macroMap}
                    postType="map_subscribe"
                    caption={composerCaption}
                    setCaption={setComposerCaption}
                    onSubmit={handlePostMap}
                />
            )}
            {isMapComposerVisible && post.macroMap && (
                <MapComposerSheet
                    visible={isMapComposerVisible}
                    onClose={() => setIsMapComposerVisible(false)}
                    mapData={post.macroMap as any}
                    postType="map_publish"
                    caption={publishCaption}
                    setCaption={setPublishCaption}
                    onSubmit={handlePublishMap}
                />
            )}
            {!renderAsDiscoveryCard ? (
                <>
                    <View style={[styles.header, { zIndex: 1 }]}>
                        <TouchableOpacity onPress={() => navigateToProfile(post.user)}>
                            {post.user.avatar ? (
                                <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholderAvatar]}>
                                    <Ionicons name="person" size={24} color={Colors.theme.dust} />
                                </View>
                            )}
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
                                            color={post.user.status === 'enhanced' ? Colors.theme.burntSienna : Colors.natural}
                                        />
                                    </TouchableOpacity>
                                )}
                                {(post.user.activityIcon || post.user.activity) && (() => {
                                    const activity = post.user.activity || '';
                                    const activityIcon = resolveActivityIcon(activity, post.user.activityIcon);
                                    if (!activityIcon) return null;
                                    const isPositive = activity.toLowerCase().includes('bulk') || activity.toLowerCase().includes('increase');
                                    const isNegative = activity.toLowerCase().includes('cut') || activity.toLowerCase().includes('decrease');
                                    const mathIndicator = isPositive ? '+' : (isNegative ? '-' : '');
                                    const color = Colors.theme.harvestGold;
                                    
                                    return (
                                        <TouchableOpacity onPress={onPressHammer} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                            <MaterialCommunityIcons
                                                name={activityIcon as any}
                                                size={16}
                                                color={color}
                                            />
                                            {mathIndicator ? (
                                                <Text style={{ color, fontSize: 10, fontWeight: 'bold', marginLeft: 1 }}>{mathIndicator}</Text>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })()}
                            </View>
                            <TouchableOpacity onPress={() => navigateToProfile(post.user)}>
                                <Text style={styles.handle}>@{post.user.handle.replace(/^@/, '')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={onPressOptions}><Ionicons name="ellipsis-horizontal" size={20} color={Colors.theme.softWhite} /></TouchableOpacity>
                    </View>

                    <TouchableOpacity activeOpacity={isSelectMode ? 1 : 0.9} onPress={handlePressBody} style={{ zIndex: 1 }}>
                        {hasCaption && (
                            <Text style={styles.titleText}>
                                {post.caption || post.snapshot?.caption || post.macroUpdate?.caption || post.workout?.title || post.meal?.title}
                            </Text>
                        )}

                        {(!isDetailView && !post.macroMap && post.postType !== 'map_subscribe' && post.postType !== 'map_publish') && (
                            <TouchableOpacity onPress={toggleExpand} style={styles.expandLineTrigger}>
                                <View style={styles.dividerHalf} />
                                <Ionicons name="ellipsis-horizontal" size={16} color={Colors.theme.harvestGold} />
                                <View style={styles.dividerHalf} />
                            </TouchableOpacity>
                        )}

                        {content()}

                        {(!isDetailView && !post.meal && !post.macroUpdate && !post.workout && !post.snapshot && !post.macroMap && post.postType !== 'map_subscribe' && post.postType !== 'map_publish') && (
                            <TouchableOpacity onPress={toggleExpand} style={styles.expandLineTrigger}>
                                <View style={styles.dividerHalf} />
                                <Ionicons name="ellipsis-horizontal" size={16} color={Colors.theme.harvestGold} />
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
                                onPress={post.postType === 'map_subscribe' || post.postType === 'map_publish'
                                    ? handleMapCopyPress
                                    : (post.workout
                                        ? handleWorkoutTribeCopy
                                        : () => setIsTribeMenuOpen(!isTribeMenuOpen)
                                    )
                                }
                            >
                                {/* Sub-menu only shown for non-workout posts */}
                                {isTribeMenuOpen && !post.workout && (
                                    <View style={styles.floatingButtonsWrapper}>
                                        <TouchableOpacity style={styles.floatingTribeBtn} onPress={handleTribeCopy}>
                                            <TabonoLogo size={20} color={Colors.theme.matteBlack} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.floatingCopyBtn} onPress={handleStandardCopy}>
                                            <Ionicons name="copy" size={18} color={Colors.theme.matteBlack} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <View style={styles.iconBox}>
                                    <View style={styles.tribeCircle}>
                                        <TabonoLogo size={20} color={Colors.theme.matteBlack} />
                                    </View>
                                </View>
                                <Text style={styles.actionCount}>{post.stats.shares}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
                                <View style={styles.iconBox}>
                                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? Colors.theme.harvestGold : Colors.theme.dust} />
                                </View>
                                <Text style={styles.actionCount}>{likesCount}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                                <View style={styles.iconBox}>
                                    <Ionicons 
                                        name={post.hasCommented ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                                        size={26} 
                                        color={post.hasCommented ? Colors.theme.harvestGold : Colors.theme.dust} 
                                    />
                                </View>
                                <Text style={styles.actionCount}>{post.stats.comments}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionItem} onPress={onPressShare || onPressSave}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="arrow-redo-outline" size={26} color={Colors.theme.dust} />
                                </View>
                                <Text style={styles.actionCount}>{post.stats.shares}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.timeLabel}>{post.timeAgo}</Text>
                    </View>
                </>
            ) : (
                discoveryMapData && (
                    <TouchableOpacity onPress={() => setIsMacroMapSheetVisible(true)}>
                        <DiscoveryMapCard 
                            map={discoveryMapData as any} 
                            onCommentPress={onPressComment}
                            onLikePress={handleLike}
                            onOptionsPress={onPressOptions}
                            onSharePress={handleMapSharePress}
                            onCopyPress={handleMapCopyPress}
                            isLiked={isLiked}
                            likeCount={likesCount}
                            commentCount={post.stats.comments}
                            subscribeCount={(post.stats as any).copies || 0}
                            shareCount={post.stats.shares || 0}
                        />
                    </TouchableOpacity>
                )
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#262525', // Charcoal Card Background
        borderRadius: 45,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
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
        borderColor: Colors.theme.dust, // Tertiary (Dust)
    },
    placeholderAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
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
        color: Colors.theme.softWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    handle: {
        color: Colors.theme.dust,
        fontSize: 14,
    },
    titleText: {
        color: Colors.theme.softWhite,
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
        width: 54,
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
        color: Colors.theme.dust,
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
        color: Colors.theme.dust,
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
        color: Colors.theme.softWhite,
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
        backgroundColor: Colors.theme.burntSienna,
        marginHorizontal: 10,
    },
    mediaFrame: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 10,
        aspectRatio: 1,
        borderWidth: 2,
        borderColor: Colors.theme.dust, // Tertiary (Dust)
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
        color: Colors.theme.dust,
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
        backgroundColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingCopyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tribeCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.theme.harvestGold,
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
        color: Colors.theme.softWhite,
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
        backgroundColor: Colors.theme.oliveDrab, // Olive
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
        backgroundColor: Colors.theme.matteBlack,
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
        color: Colors.theme.softWhite,
        marginBottom: 8,
        textAlign: 'center',
    },
    macroWarningBody: {
        fontSize: 14,
        color: Colors.theme.dust,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    macroWarningDismiss: {
        backgroundColor: Colors.theme.oliveDrab,
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 20,
    },
    macroWarningDismissText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    macroMapPreviewContainer: {
        backgroundColor: Colors.theme.charcoal,
        padding: 16,
        borderRadius: 16,
        marginTop: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    macroMapPreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    macroMapHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    activeLiveBadge: {
        backgroundColor: 'rgba(27, 182, 7, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(27, 182, 7, 0.3)',
    },
    abandonedBadge: {
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(235, 87, 87, 0.3)',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeLiveDot: {
        backgroundColor: Colors.theme.oliveDrab,
    },
    abandonedDot: {
        backgroundColor: Colors.theme.burntSienna,
    },
    liveText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    activeLiveText: {
        color: Colors.theme.oliveDrab,
    },
    abandonedText: {
        color: Colors.theme.burntSienna,
    },
    heartbeatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    heartbeatText: {
        color: Colors.theme.dust,
        fontSize: 13,
    },
    macroMapPreviewTitle: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    macroMapPreviewMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.theme.matteBlack,
        padding: 12,
        borderRadius: 12,
    },
    macroMapPreviewMetric: {
        alignItems: 'center',
    },
    macroMapPreviewLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        marginBottom: 4,
    },
    macroMapPreviewValue: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalBody: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalCancelBtnText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
    },
    modalConfirmBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 14,
        fontWeight: 'bold',
    },
    errorDismissBtn: {
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 24,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 8,
    },
    errorDismissBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
    feedPostContainer: {
        marginBottom: 20,
    },
});
