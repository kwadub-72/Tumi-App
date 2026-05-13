import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    SafeAreaView,
    Image,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import { useAuthStore } from '@/store/AuthStore';
import { FeedPost } from '@/src/shared/models/types';
import { NutritionService } from '@/src/shared/services/NutritionService';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { Video, ResizeMode } from 'expo-av';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { BookCard } from '@/src/features/feed/components/BookCard';
import { CondensedMacroCard } from '@/src/features/feed/components/CondensedMacroCard';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_MIN_Y = SCREEN_HEIGHT - 145;
const SHEET_MAX_Y = SCREEN_HEIGHT * 0.5;

type ScreenMode = 'macro-update' | 'snapshot' | 'macro-book';
const MODES: ScreenMode[] = ['macro-update', 'snapshot', 'macro-book'];

const MacroUpdateRow = ({ icon, oldVal, value, onChange, diff }: any) => {
    const inputRef = React.useRef<TextInput>(null);
    const isNegative = diff < 0;
    const hasValue = value !== '';
    const diffText = !hasValue ? '...g' : (diff === 0 ? '0g' : `${Math.abs(diff)}g`);
    const diffBg = !hasValue ? 'rgba(237, 232, 213, 0.3)' : (diff === 0 ? 'rgba(237, 232, 213, 0.5)' : (isNegative ? Colors.theme.burntSienna : Colors.theme.oliveDrab));

    return (
        <View style={styles.macroRow}>
            <MaterialCommunityIcons name={icon} size={28} color={Colors.primary} style={styles.macroIconSmall} />
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => inputRef.current?.focus()}
                style={styles.inputBubble}
            >
                <TextInput
                    ref={inputRef}
                    style={styles.macroInput}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    placeholder="..."
                    placeholderTextColor="#aaa"
                />
                <Text style={styles.suffixText}>g</Text>
            </TouchableOpacity>
            <View style={[styles.diffBubble, { backgroundColor: diffBg }]}>
                <Text style={styles.diffText}>{diffText}</Text>
            </View>
        </View>
    );
};

const MacroProgressBar = ({ icon, target, consumed }: any) => {
    const remaining = target - consumed;
    const total = Math.max(target, consumed);
    const wPct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

    const logged = Math.min(consumed, target);
    const rem = Math.max(0, target - consumed);
    const over = Math.max(0, consumed - target);

    const unit = icon === 'fire' ? ' cals' : 'g';

    const renderSegment = (val: number, bg: string, textCol: string) => {
        if (val <= 0) return null;
        const pct = wPct(val);
        const isSmall = pct < 15;
        return (
            <View style={[styles.segment, { width: `${pct}%`, backgroundColor: bg }]}>
                {!isSmall && (
                    <Text style={[styles.segmentText, { color: textCol }]}>{val}{unit}</Text>
                )}
            </View>
        );
    };

    const renderCarrot = (val: number, textCol: string, align: 'center' | 'left' | 'right' = 'center') => {
        if (val <= 0) return null;
        const pct = wPct(val);
        const isSmall = pct < 15;
        if (!isSmall) return <View style={{ width: `${pct}%` }} />;

        return (
            <View style={{ width: `${pct}%`, height: 25 }}>
                <View style={{ position: 'absolute', top: 0, left: '50%', width: 20, marginLeft: -10, alignItems: 'center', overflow: 'visible' }}>
                    <Ionicons name="chevron-up" size={14} color={textCol} style={{ marginBottom: -4 }} />
                    <View style={{
                        position: 'absolute',
                        top: 14,
                        width: 100,
                        alignItems: align === 'left' ? 'flex-end' : align === 'right' ? 'flex-start' : 'center',
                        ...(align === 'left' ? { right: 10 } : align === 'right' ? { left: 10 } : { left: -40 })
                    }}>
                        <Text style={[styles.segmentText, { color: textCol, fontSize: 13 }]} numberOfLines={1}>{val}{unit}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.progressRow}>
            <MaterialCommunityIcons name={icon} size={32} color={Colors.theme.sageDark} style={styles.progressIcon} />
            <View style={styles.progressTrackWrapper}>
                <View style={styles.progressTrack}>
                    {renderSegment(logged, Colors.theme.sageDark, 'white')}
                    {renderSegment(rem, '#8E8E8E', 'white')}
                    {renderSegment(over, '#825858', 'white')}
                </View>
                <View style={{ flexDirection: 'row', height: 25, position: 'relative' }}>
                    {renderCarrot(logged, Colors.theme.sageDark, 'center')}
                    {renderCarrot(rem, '#8E8E8E', 'left')}
                    {renderCarrot(over, '#825858', 'right')}
                </View>
            </View>
        </View>
    );
};

export default function MacroUpdateScreen() {
    const router = useRouter();
    const { mode: initialMode, p: paramP, c: paramC, f: paramF, calories: paramCal } = useLocalSearchParams<{ 
        mode: ScreenMode; 
        p?: string; 
        c?: string; 
        f?: string; 
        calories?: string; 
    }>();
    const { profile } = useAuthStore();
    const userInfo = useUserStore();
    const [macroBookEntries, setMacroBookEntries] = useState<any[]>([]);
    const [loadingBook, setLoadingBook] = useState(false);
    // When copy params are present, always open on macro-update tab
    const [mode, setMode] = useState<ScreenMode>(
        (paramP && paramC && paramF) ? 'macro-update' : (initialMode || 'snapshot')
    );
    const [latestHistory, setLatestHistory] = useState<any>(null);

    // Macros State
    const targets = profile?.macro_targets || userInfo.macroTargets;
    const oldP = targets.p;
    const oldC = targets.c;
    const oldF = targets.f;
    const oldCal = (oldP * 4) + (oldC * 4) + (oldF * 9);

    // Pre-populate directly from URL params when arriving from a copy action.
    // Using initial state values instead of a useEffect avoids a render cycle
    // that would briefly show empty pills before populating them.
    const [pText, setPText] = useState(paramP ?? '');
    const [cText, setCText] = useState(paramC ?? '');
    const [fText, setFText] = useState(paramF ?? '');
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);

    const loadMacroBook = async () => {
        if (!profile?.id) return;
        setLoadingBook(true);
        const entries = await SupabasePostService.getMacroBook(profile.id);
        setMacroBookEntries(entries);
        setLoadingBook(false);
    };

    const [refreshingBook, setRefreshingBook] = useState(false);

    const onRefreshBook = async () => {
        setRefreshingBook(true);
        await loadMacroBook();
        setRefreshingBook(false);
    };

    const loadLatestHistory = async () => {
        if (!profile?.id) return;
        const history = await SupabasePostService.getLatestMacroHistory(profile.id);
        setLatestHistory(history);
    };

    useFocusEffect(
        useCallback(() => {
            if (mode === 'macro-book') {
                loadMacroBook();
            }
            loadLatestHistory();
        }, [mode, profile?.id])
    );

    // Snapshot Info (Calculated from today's meals)
    const [dailyConsumed, setDailyConsumed] = useState({ calories: 0, p: 0, c: 0, f: 0 });

    useEffect(() => {
        const load = async () => {
            if (!profile?.id) return;
            const start = new Date();
            start.setHours(0,0,0,0);
            const posts = await SupabasePostService.getFeed({ 
                userId: profile.id, 
                feedType: 'diary',
                date: start 
            });
            const meals = posts.map(p => p.meal).filter(m => m !== undefined);
            const totals = NutritionService.sumMacros(meals as any);
            setDailyConsumed({
                calories: totals.cals,
                p: totals.macros.p,
                c: totals.macros.c,
                f: totals.macros.f
            });
        };
        load();
    }, [profile?.id]);
    const pagerRef = React.useRef<FlatList<ScreenMode>>(null);

    const handleModeChange = (newMode: ScreenMode) => {
        setMode(newMode);
        const index = MODES.indexOf(newMode);
        if (index !== -1) {
            pagerRef.current?.scrollToIndex({ index, animated: true });
        }
    };

    const handleScroll = (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index >= 0 && index < MODES.length && MODES[index] !== mode) {
            setMode(MODES[index]);
        }
    };

    useEffect(() => {
        const targetMode = initialMode || 'snapshot';
        const index = MODES.indexOf(targetMode as ScreenMode);
        if (index !== -1) {
            setTimeout(() => {
                pagerRef.current?.scrollToIndex({ index, animated: false });
            }, 100);
        }
    }, [initialMode]);

    // Reanimated values for sheet
    const translateY = useSharedValue(SHEET_MIN_Y);
    const context = useSharedValue({ y: 0 });
    const keyboardHeight = useSharedValue(0);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                keyboardHeight.value = withTiming(e.endCoordinates.height);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                keyboardHeight.value = withTiming(0);
            }
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Sync media from WorkoutLogStore (camera capture)
    const storeCapturedMedia = useWorkoutLogStore((s) => s.capturedMedia);
    useEffect(() => {
        if (storeCapturedMedia) {
            setMedia({
                uri: storeCapturedMedia.uri,
                type: (storeCapturedMedia.type as 'image' | 'video') || 'image'
            });
            translateY.value = withSpring(SHEET_MAX_Y);
        }
    }, [storeCapturedMedia]);

    // Derived values for update
    const newP = parseInt(pText) || 0;
    const newC = parseInt(cText) || 0;
    const newF = parseInt(fText) || 0;
    const newCal = (newP * 4) + (newC * 4) + (newF * 9);

    const diffP = newP - oldP;
    const diffC = newC - oldC;
    const diffF = newF - oldF;
    const diffCal = newCal - oldCal;

    const handlePost = async () => {
        if (!profile?.id) return;

        if (mode === 'macro-update') {
            if (!pText || !cText || !fText) {
                Alert.alert("Missing Macros", "Please enter values for Protein, Carbs, and Fats before posting.");
                return;
            }
            try {
                // Use the new atomic RPC for macro updates
                await SupabasePostService.updateMacroTargetsWithPost(
                    profile.id,
                    { p: newP, c: newC, f: newF, calories: newCal },
                    caption || undefined,
                    media?.uri,
                    media?.type
                );
                
                // Update local user store
                userInfo.setProfile({
                    macroTargets: { p: newP, c: newC, f: newF, calories: newCal },
                    lastMacroUpdate: new Date().toLocaleDateString()
                });
                
                useWorkoutLogStore.getState().setCapturedMedia(null);
                router.replace('/(tabs)?tab=Following');
            } catch (err) {
                console.error('Failed to post macro update:', err);
            }
            return;
        } else {
            const payload = {
                snapshot: {
                    id: 'sn_' + Date.now(),
                    timestamp: Date.now(),
                    caption: caption || "I'm so cooked for the day",
                    targets: { ...targets },
                    consumed: { ...dailyConsumed }
                }
            };

            const success = await SupabasePostService.addPost({
                authorId: profile.id,
                postType: 'snapshot',
                payload: payload,
                caption: caption,
                mediaUrl: media?.uri,
                mediaType: media?.type,
            });

            if (success) {
                useWorkoutLogStore.getState().setCapturedMedia(null);
                router.replace('/(tabs)?tab=Following');
            }
        }
    };

    const panGesture = Gesture.Pan()
        .onStart(() => { context.value = { y: translateY.value }; })
        .onUpdate((event) => {
            translateY.value = Math.max(SHEET_MAX_Y, Math.min(SHEET_MIN_Y, event.translationY + context.value.y));
        })
        .onEnd((event) => {
            if (translateY.value < (SHEET_MIN_Y + SHEET_MAX_Y) / 2 || event.velocityY < -500) {
                translateY.value = withSpring(SHEET_MAX_Y);
            } else {
                translateY.value = withSpring(SHEET_MIN_Y);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1 }}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRow}>
                                <Ionicons name="arrow-back" size={28} color={Colors.theme.sageDark} />
                            </TouchableOpacity>
                            
                            <View style={styles.modeToggleContainer}>
                                <View style={styles.modeToggle}>
                                    <TouchableOpacity
                                        style={[styles.modeBtn, mode === 'macro-update' && styles.modeBtnActive]}
                                        onPress={() => handleModeChange('macro-update')}
                                    >
                                        <Text style={[styles.modeText, mode === 'macro-update' && styles.modeTextActive]}>Macros</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modeBtn, mode === 'snapshot' && styles.modeBtnActive]}
                                        onPress={() => handleModeChange('snapshot')}
                                    >
                                        <Text style={[styles.modeText, mode === 'snapshot' && styles.modeTextActive]}>Snapshot</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modeBtn, mode === 'macro-book' && styles.modeBtnActive]}
                                        onPress={() => handleModeChange('macro-book')}
                                    >
                                        <Text style={[styles.modeText, mode === 'macro-book' && styles.modeTextActive]}>Macro book</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>


                        <FlatList
                            ref={pagerRef}
                            data={MODES}
                            keyExtractor={(item) => item}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScroll}
                            scrollEventThrottle={16}
                            style={{ flex: 1 }}
                            initialNumToRender={3}
                            windowSize={3}
                            getItemLayout={(_, index) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * index,
                                index,
                            })}
                            renderItem={({ item }) => (
                                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                                    {item === 'macro-update' && (
                                        <ScrollView 
                                            style={styles.scrollContent} 
                                            showsVerticalScrollIndicator={false}
                                            keyboardShouldPersistTaps="handled"
                                            nestedScrollEnabled={true}
                                        >
                                            <View style={styles.globalTitleContainer}>
                                                <Text style={styles.titleSmall}>Macros</Text>
                                            </View>

                                            <View style={styles.calSection}>
                                                <MaterialCommunityIcons name="fire" size={36} color={Colors.primary} style={styles.mainFireIcon} />
                                                <View style={styles.calBubbleMain}>
                                                    <Text style={styles.calValueMain}>{newCal} cals</Text>
                                                </View>
                                                <View style={[styles.calDiffBubble, { backgroundColor: (!pText && !cText && !fText) ? 'rgba(237, 232, 213, 0.3)' : (diffCal < 0 ? Colors.theme.burntSienna : Colors.theme.oliveDrab) }]}>
                                                    <Text style={styles.calDiffText}>
                                                        {(!pText && !cText && !fText) ? '... cals' : (diffCal === 0 ? '0 cals' : `${Math.abs(diffCal)} cals`)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.enterNewHeader}>
                                                <Text style={styles.enterNewText}>Enter new macros</Text>
                                            </View>

                                            <View style={styles.macrosList}>
                                                <MacroUpdateRow icon="food-drumstick" oldVal={oldP} value={pText} onChange={setPText} diff={diffP} />
                                                <MacroUpdateRow icon="barley" oldVal={oldC} value={cText} onChange={setCText} diff={diffC} />
                                                <MacroUpdateRow icon="water" oldVal={oldF} value={fText} onChange={setFText} diff={diffF} />
                                            </View>

                                            <View style={styles.newTargetsWrapper}>
                                                <View style={styles.newTargetsLabelCol}>
                                                    <Text style={styles.newTargetsLabelPart}>Current</Text>
                                                    <Text style={styles.newTargetsLabelPart}>targets</Text>
                                                    {latestHistory && (
                                                        <Text style={styles.historyDate}>
                                                            {new Date(latestHistory.created_at).toISOString().split('T')[0]}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={styles.newTargetsData}>
                                                    <View style={styles.targetIconGroup}>
                                                        <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                                                        <Text style={styles.targetVal}>{oldCal}</Text>
                                                        <Text style={styles.targetUnit}>cals</Text>
                                                    </View>
                                                    <View style={styles.targetIconGroup}>
                                                        <MaterialCommunityIcons name="food-drumstick" size={24} color={Colors.primary} />
                                                        <Text style={styles.targetVal}>{oldP}</Text>
                                                        <Text style={styles.targetUnit}>g</Text>
                                                    </View>
                                                    <View style={styles.targetIconGroup}>
                                                        <MaterialCommunityIcons name="barley" size={24} color={Colors.primary} />
                                                        <Text style={styles.targetVal}>{oldC}</Text>
                                                        <Text style={styles.targetUnit}>g</Text>
                                                    </View>
                                                    <View style={styles.targetIconGroup}>
                                                        <MaterialCommunityIcons name="water" size={24} color={Colors.primary} />
                                                        <Text style={styles.targetVal}>{oldF}</Text>
                                                        <Text style={styles.targetUnit}>g</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </ScrollView>
                                    )}

                                    {item === 'snapshot' && (
                                        <ScrollView 
                                            style={styles.scrollContent}
                                            showsVerticalScrollIndicator={false}
                                            nestedScrollEnabled={true}
                                        >
                                            <View style={styles.globalTitleContainer}>
                                                <Text style={styles.titleSmall}>Snapshot</Text>
                                            </View>
                                            
                                            <View style={styles.snapshotContainer}>
                                                <MacroProgressBar icon="fire" target={targets.calories} consumed={dailyConsumed.calories} />
                                                <MacroProgressBar icon="food-drumstick" target={targets.p} consumed={dailyConsumed.p} />
                                                <MacroProgressBar icon="barley" target={targets.c} consumed={dailyConsumed.c} />
                                                <MacroProgressBar icon="water" target={targets.f} consumed={dailyConsumed.f} />
                                                
                                                <View style={styles.legendRow}>
                                                    <View style={styles.legendItem}>
                                                        <View style={[styles.legendDot, { backgroundColor: Colors.theme.sageDark }]} />
                                                        <Text style={styles.legendText}>Logged</Text>
                                                    </View>
                                                    <View style={styles.legendItem}>
                                                        <View style={[styles.legendDot, { backgroundColor: '#8E8E8E' }]} />
                                                        <Text style={styles.legendText}>Remaining</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </ScrollView>
                                    )}

                                    {item === 'macro-book' && (
                                        <ScrollView 
                                            style={styles.scrollContent}
                                            showsVerticalScrollIndicator={false}
                                            nestedScrollEnabled={true}
                                            refreshControl={
                                                <RefreshControl
                                                    refreshing={refreshingBook}
                                                    onRefresh={onRefreshBook}
                                                    tintColor={Colors.theme.sageDark}
                                                />
                                            }
                                        >
                                            <View style={styles.globalTitleContainer}>
                                                <Text style={styles.titleSmall}>Macro book</Text>
                                            </View>
                                            {loadingBook ? (
                                                <ActivityIndicator color={Colors.primary} style={{ marginTop: 50 }} />
                                            ) : macroBookEntries.length === 0 ? (
                                                <View style={styles.emptyState}>
                                                    <MaterialCommunityIcons name="book-open-variant" size={60} color={Colors.theme.sageDark + '44'} />
                                                    <Text style={styles.emptyText}>No saved macros yet.</Text>
                                                </View>
                                            ) : (
                                                macroBookEntries.map((entry) => (
                                                    <CondensedMacroCard
                                                        key={entry.id}
                                                        isDeltaRow={entry.is_delta_row}
                                                        calories={entry.calories}
                                                        protein={entry.protein}
                                                        carbs={entry.carbs}
                                                        fats={entry.fats}
                                                        savedAt={entry.created_at}
                                                        dateLabel={entry.date_label}
                                                        copyCount={entry.copy_count || 0}
                                                        authorName={entry.original_author?.name || profile?.name || 'Me'}
                                                        authorHandle={entry.original_author?.handle || profile?.handle || 'me'}
                                                        authorAvatar={entry.original_author?.avatar_url || profile?.avatar_url || ''}
                                                        authorStatus={entry.original_author?.status || profile?.status}
                                                        authorActivityIcon={(entry.original_author as any)?.activityIcon || (profile as any)?.activityIcon}
                                                        authorActivity={(entry.original_author as any)?.activity || (profile as any)?.activity}
                                                        onPressProfile={() => {
                                                            if (entry.original_author?.handle) {
                                                                router.push(`/user/${entry.original_author.handle}`);
                                                            } else if (profile?.handle) {
                                                                router.push(`/user/${profile.handle}`);
                                                            }
                                                        }}
                                                        onPressTribeCopy={() => {
                                                            let newP = entry.protein;
                                                            let newC = entry.carbs;
                                                            let newF = entry.fats;
                                                            
                                                            if (!entry.is_delta_row) {
                                                                const calsFromP = Math.abs(entry.protein * 4);
                                                                const calsFromC = Math.abs(entry.carbs * 4);
                                                                const calsFromF = Math.abs(entry.fats * 9);
                                                                const totalCals = calsFromP + calsFromC + calsFromF;
                                                                
                                                                if (totalCals > 0) {
                                                                    const pPct = calsFromP / totalCals;
                                                                    const cPct = calsFromC / totalCals;
                                                                    const fPct = calsFromF / totalCals;
                                                                    
                                                                    const userTargetCals = oldCal;
                                                                    newP = Math.round((userTargetCals * pPct) / 4);
                                                                    newC = Math.round((userTargetCals * cPct) / 4);
                                                                    newF = Math.round((userTargetCals * fPct) / 9);
                                                                }
                                                                setPText(newP.toString());
                                                                setCText(newC.toString());
                                                                setFText(newF.toString());
                                                            } else {
                                                                setPText((oldP + newP).toString());
                                                                setCText((oldC + newC).toString());
                                                                setFText((oldF + newF).toString());
                                                            }
                                                            handleModeChange('macro-update');
                                                        }}
                                                        onPressStandardCopy={() => {
                                                            if (entry.is_delta_row) {
                                                                setPText((oldP + entry.protein).toString());
                                                                setCText((oldC + entry.carbs).toString());
                                                                setFText((oldF + entry.fats).toString());
                                                            } else {
                                                                setPText(entry.protein.toString());
                                                                setCText(entry.carbs.toString());
                                                                setFText(entry.fats.toString());
                                                            }
                                                            handleModeChange('macro-update');
                                                        }}
                                                    />
                                                ))
                                            )}
                                        </ScrollView>
                                    )}
                                </View>
                            )}
                        />
                    </View>

                <Animated.View style={[styles.loggerSheet, animatedStyle]}>
                    <GestureDetector gesture={panGesture}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                    </GestureDetector>
                    <View style={styles.loggerTopRow}>
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/camera-capture?source=workout')}>
                            <Ionicons name="camera" size={28} color="white" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.loggerInput}
                            placeholder="Caption..."
                            placeholderTextColor={Colors.textDark + '88'}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            onFocus={() => {
                                translateY.value = withSpring(SHEET_MAX_Y);
                            }}
                            onBlur={() => {}}
                        />
                        <TouchableOpacity style={styles.postSubmitBtn} onPress={handlePost}>
                            <MaterialCommunityIcons name="post-outline" size={32} color="white" />
                        </TouchableOpacity>
                    </View>
                    {media && (
                        <View style={styles.mediaPreview}>
                            {media.type === 'video' ? (
                                <Video 
                                    source={{ uri: media.uri }} 
                                    style={styles.mediaImg} 
                                    resizeMode={ResizeMode.COVER}
                                    isLooping
                                    shouldPlay
                                />
                            ) : (
                                <Image source={{ uri: media.uri }} style={styles.mediaImg} />
                            )}
                            <TouchableOpacity style={styles.removeMedia} onPress={() => setMedia(null)}>
                                <Ionicons name="close-circle" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: 10,
        paddingHorizontal: 15,
        zIndex: 10,
    },
    backBtnRow: {
        alignSelf: 'flex-start',
        padding: 5,
        marginBottom: 10,
    },
    modeToggleContainer: {
        width: '100%',
        alignItems: 'center',
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.beigeLight,
        borderRadius: 25,
        padding: 5,
        width: '100%',
        justifyContent: 'space-between',
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    modeBtnActive: {
        backgroundColor: Colors.theme.sageDark,
    },
    modeText: {
        fontSize: 14,
        color: Colors.theme.sageDark,
        fontWeight: 'bold',
    },
    modeTextActive: {
        color: 'white',
    },
    scrollContent: {
        flex: 1,
        marginTop: 10,
    },
    globalTitleContainer: {
        marginTop: 20,
        marginBottom: 5,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        textAlign: 'center',
        marginVertical: 15,
    },
    titleSmall: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        textAlign: 'center',
        marginVertical: 10,
    },
    enterNewHeader: {
        width: '100%',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    enterNewText: {
        fontSize: 16,
        color: Colors.theme.sageDark,
        fontWeight: '600',
    },
    calSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 20,
        paddingHorizontal: 20, // Increased to give some breathing room but keep flush alignment
    },
    mainFireIcon: {
        width: 36,
        textAlign: 'center',
    },
    calBubbleMain: {
        backgroundColor: Colors.theme.sageDark,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 140,
        flex: 1, // Make it expand like the input bubbles
        alignItems: 'center',
    },
    calValueMain: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    calDiffBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        minWidth: 90,
        alignItems: 'center',
    },
    calDiffText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    macrosList: {
        gap: 12,
        marginBottom: 20,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12, // Match calSection gap
        paddingHorizontal: 20,
    },
    oldValContainer: {
        borderWidth: 1.5,
        borderColor: Colors.theme.sageDark,
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 65,
        alignItems: 'center',
    },
    oldValText: {
        color: Colors.theme.sageDark,
        fontWeight: 'bold',
        fontSize: 14,
    },
    macroIconSmall: {
        width: 36, // Match fire icon size for alignment
        textAlign: 'center',
    },
    inputBubble: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 25, // Match calorie bubble
        paddingHorizontal: 14,
        paddingVertical: 12, // Match calorie bubble
        flex: 1, // Expand to fill space
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    macroInput: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        textAlign: 'right',
        minWidth: 40,
        padding: 0,
    },
    suffixText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
    },
    diffBubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 85,
        alignItems: 'center',
    },
    diffText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    newTargetsWrapper: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 15,
        paddingBottom: 200,
    },
    newTargetsLabelCol: {
        marginBottom: 5,
    },
    newTargetsLabelPart: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        textTransform: 'uppercase',
    },
    historyDate: {
        fontSize: 12,
        color: Colors.theme.sageDark,
        opacity: 0.6,
        marginTop: 4,
    },
    newTargetsData: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'flex-end',
    },
    targetIconGroup: {
        alignItems: 'center',
        minWidth: 50,
    },
    targetVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        marginTop: 2,
    },
    targetUnit: {
        fontSize: 10,
        color: Colors.theme.sageDark,
        fontWeight: '600',
    },
    snapshotContainer: {
        marginTop: 20,
        gap: 25,
        paddingHorizontal: 10,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 15,
    },
    progressIcon: {
        width: 35,
        textAlign: 'center',
        marginTop: 9,
    },
    progressTrackWrapper: {
        flex: 1,
    },
    progressTrack: {
        height: 50,
        backgroundColor: '#D9D9D9',
        borderRadius: 25,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    segment: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    deltaLabel: {
        position: 'absolute',
        top: -18,
        right: 5,
        fontSize: 12,
        fontWeight: '600',
        color: '#825858',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 14,
        color: Colors.theme.sageDark,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: Colors.theme.sageDark,
        opacity: 0.6,
    },
    macroBookEntryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    macroBookEntry: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 15,
        flex: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    deleteEntry: {
        padding: 10,
    },
    entryLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
        marginBottom: 5,
    },
    entryValues: {
        flexDirection: 'row',
        gap: 15,
    },
    entryValue: {
        fontSize: 14,
        color: Colors.theme.sageDark,
        opacity: 0.7,
    },
    loggerSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT,
        backgroundColor: Colors.card,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    dragHandleContainer: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 3,
    },
    loggerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    cameraBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loggerInput: {
        flex: 1,
        backgroundColor: Colors.theme.beigeLight,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: Colors.textDark,
        fontSize: 15,
        minHeight: 48,
    },
    postSubmitBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaPreview: {
        marginTop: 20,
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'black',
    },
    mediaImg: {
        width: '100%',
        height: '100%',
    },
    removeMedia: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    }
});
