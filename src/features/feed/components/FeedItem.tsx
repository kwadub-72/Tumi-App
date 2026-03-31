import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AVPlaybackStatusSuccess, ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { FeedPost, Snapshot, Meal, Workout, MacroUpdate } from '@/src/shared/models/types';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { Colors } from '@/src/shared/theme/Colors';
import VerifiedModal from '@/components/VerifiedModal';
import { useMealLogStore } from '@/src/store/useMealLogStore';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { useUserStore } from '@/store/UserStore';

export interface FeedItemProps {
    post: FeedPost;
    onPressVerified?: () => void;
    onPressHammer?: () => void;
    onPressComment?: () => void;
    onPressLike?: () => void;
    onPressShare?: () => void;
    onPressSave?: () => void;
    onPressOptions?: () => void;
    isDetailView?: boolean;
    isSelectMode?: boolean;
    selectedItems?: string[];
    onToggleSelect?: (itemId: string, itemType: string) => void;
    cardColor?: string;
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
    isDetailView = false,
    isSelectMode = false,
    selectedItems = [],
    onToggleSelect,
    cardColor
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
            onPressOptions && onPressOptions();
            return;
        }
        if (post.id && !isDetailView) router.push(`/post/${post.id}`);
    };

    const formatVal = (val: number) => {
        if (val < 0) return `(${Math.abs(val)})`;
        return `${val}`;
    };

    const renderMacroValue = (icon: any, val: number, unit: string, colorOverride?: string) => (
        <View style={styles.macroValueItem}>
            <MaterialCommunityIcons name={icon} size={16} color={colorOverride || "white"} />
            <Text style={[styles.macroValueText, colorOverride && { color: colorOverride }]}>
                {formatVal(val)}{unit}
            </Text>
        </View>
    );

    const renderSnapshot = (snapshot: Snapshot) => {
        const remains = {
            calories: snapshot.targets.calories - snapshot.consumed.calories,
            p: snapshot.targets.p - snapshot.consumed.p,
            c: snapshot.targets.c - snapshot.consumed.c,
            f: snapshot.targets.f - snapshot.consumed.f,
        };

        return (
            <View style={styles.snapshotContent}>
                {isExpanded && (
                    <>
                        <View style={styles.snapshotRow}>
                            <Text style={styles.snapshotLabel}>Target</Text>
                            {renderMacroValue('fire', snapshot.targets.calories, ' cals')}
                            {renderMacroValue('food-drumstick', snapshot.targets.p, 'g')}
                            {renderMacroValue('barley', snapshot.targets.c, 'g')}
                            {renderMacroValue('water', snapshot.targets.f, 'g')}
                        </View>
                        <View style={styles.snapshotRow}>
                            <Text style={styles.snapshotLabel}>Snapshot</Text>
                            {renderMacroValue('fire', snapshot.consumed.calories, ' cals')}
                            {renderMacroValue('food-drumstick', snapshot.consumed.p, 'g')}
                            {renderMacroValue('barley', snapshot.consumed.c, 'g')}
                            {renderMacroValue('water', snapshot.consumed.f, 'g')}
                        </View>
                        <View style={[styles.divider, { marginVertical: 8, opacity: 0.2 }]} />
                    </>
                )}
                <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotLabel}>Remaining</Text>
                    {renderMacroValue('fire', remains.calories, ' cals')}
                    {renderMacroValue('food-drumstick', remains.p, 'g')}
                    {renderMacroValue('barley', remains.c, 'g')}
                    {renderMacroValue('water', remains.f, 'g')}
                </View>
            </View>
        );
    };

    const renderMacroUpdate = (mu: any) => (
        <View style={styles.macroUpdateContent}>
            {isExpanded && (
                <View style={styles.macroOldRow}>
                    <Text style={styles.macroLabelLarge}>Old Target</Text>
                    <View style={styles.macroValues}>
                        {renderMacroValue('fire', mu.oldTargets.calories, ' cals')}
                        {renderMacroValue('food-drumstick', mu.oldTargets.p, 'g')}
                        {renderMacroValue('barley', mu.oldTargets.c, 'g')}
                        {renderMacroValue('water', mu.oldTargets.f, 'g')}
                    </View>
                    {isSelectMode && (
                        <TouchableOpacity style={styles.selectBtn} onPress={() => onToggleSelect && onToggleSelect('old', 'macro')}>
                            <Ionicons name={selectedItems.includes('old') ? "checkmark-circle" : "ellipse-outline"} size={28} color={selectedItems.includes('old') ? "#2F3A27" : "rgba(255,255,255,0.7)"} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <View style={[styles.divider, { opacity: 0.2, marginVertical: 8 }]} />
            <View style={styles.macroNewRow}>
                <View style={styles.newTargetsLabelBox}>
                    <Text style={styles.macroLabel}>New</Text>
                    <Text style={styles.macroLabel}>targets</Text>
                </View>
                <View style={styles.macroValuesMain}>
                    {renderMacroValue('fire', mu.newTargets.calories, ' cals')}
                    {renderMacroValue('food-drumstick', mu.newTargets.p, 'g')}
                    {renderMacroValue('barley', mu.newTargets.c, 'g')}
                    {renderMacroValue('water', mu.newTargets.f, 'g')}
                </View>
                {isSelectMode && (
                    <TouchableOpacity style={styles.selectBtn} onPress={() => onToggleSelect && onToggleSelect('new', 'macro')}>
                        <Ionicons name={selectedItems.includes('new') ? "checkmark-circle" : "ellipse-outline"} size={28} color={selectedItems.includes('new') ? "#2F3A27" : "rgba(255,255,255,0.7)"} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.divider, { opacity: 0.2, marginVertical: 8 }]} />

            <View style={styles.macroOldRow}>
                <Text style={styles.macroLabelLarge}>Difference</Text>
                <View style={styles.macroValues}>
                    {renderMacroValue('fire', Math.round((mu.newTargets.calories - mu.oldTargets.calories) / mu.oldTargets.calories * 100 || 0), '%')}
                    {renderMacroValue('food-drumstick', Math.round((mu.newTargets.p - mu.oldTargets.p) / mu.oldTargets.p * 100 || 0), '%')}
                    {renderMacroValue('barley', Math.round((mu.newTargets.c - mu.oldTargets.c) / mu.oldTargets.c * 100 || 0), '%')}
                    {renderMacroValue('water', Math.round((mu.newTargets.f - mu.oldTargets.f) / mu.oldTargets.f * 100 || 0), '%')}
                </View>
                {isSelectMode && (
                    <TouchableOpacity style={styles.selectBtn} onPress={() => onToggleSelect && onToggleSelect('diff', 'macro')}>
                        <Ionicons name={selectedItems.includes('diff') ? "checkmark-circle" : "ellipse-outline"} size={28} color={selectedItems.includes('diff') ? "#2F3A27" : "rgba(255,255,255,0.7)"} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderMeal = (meal: any) => {
        if (!isDetailView) {
            return (
                <View style={styles.mealMainStats}>
                    <Text style={styles.mealType}>{meal.type}</Text>
                    <View style={styles.mealMacros}>
                        {renderMacroValue('fire', meal.calories, ' cals')}
                        {renderMacroValue('food-drumstick', meal.macros.p, 'g')}
                        {renderMacroValue('barley', meal.macros.c, 'g')}
                        {renderMacroValue('water', meal.macros.f, 'g')}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.detailedMealContainer}>
                {meal.ingredients?.map((ing: any, i: number) => {
                    const isSelected = selectedItems.includes(ing.name);
                    return (
                        <View key={i} style={[styles.detailedMealRow, isSelectMode && styles.detailedMealRowShifted]}>
                            <View style={styles.ingInfo}>
                                <Text style={styles.ingName}>{ing.name}</Text>
                                {ing.amount && <Text style={styles.ingAmount}>{ing.amount}</Text>}
                            </View>
                            <View style={styles.ingMacros}>
                                {renderMacroValue('fire', ing.cals, ' cals', '#D4E2D4')}
                                {renderMacroValue('food-drumstick', ing.macros.p, 'g')}
                                {renderMacroValue('barley', ing.macros.c, 'g')}
                                {renderMacroValue('water', ing.macros.f, 'g')}
                            </View>
                            {isSelectMode && (
                                <TouchableOpacity style={styles.selectBtn} onPress={() => onToggleSelect && onToggleSelect(ing.name, 'ingredient')}>
                                    <Ionicons name={isSelected ? "checkmark-circle" : "add-circle"} size={28} color={isSelected ? "#2F3A27" : "rgba(255,255,255,0.7)"} />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderWorkout = (workout: any) => {
        if (!isDetailView) {
            return (
                <View style={styles.workoutContent}>
                    <View style={styles.workoutHeaderRow}>
                        <MaterialCommunityIcons name="dumbbell" size={20} color="white" />
                        <Text style={styles.workoutDuration}>{workout.duration} mins</Text>
                    </View>
                    {isExpanded && (
                        <View style={styles.exercisesList}>
                            {workout.exercises.map((ex: any, idx: number) => (
                                <Text key={idx} style={styles.exerciseItem}>
                                    • {ex.title} ({ex.sets?.length || 0} sets)
                                </Text>
                            ))}
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
                        <View key={idx} style={[styles.detailedMealRow, isSelectMode && styles.detailedMealRowShifted, { marginTop: 10 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.ingName}>{ex.title}</Text>
                                <Text style={styles.ingAmount}>{ex.sets?.length || 0} sets</Text>
                            </View>
                            {isSelectMode && (
                                <TouchableOpacity style={styles.selectBtn} onPress={() => onToggleSelect && onToggleSelect(ex.title, 'exercise')}>
                                    <Ionicons name={isSelected ? "checkmark-circle" : "add-circle"} size={28} color={isSelected ? "#2F3A27" : "rgba(255,255,255,0.7)"} />
                                </TouchableOpacity>
                            )}
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
        <View style={[styles.card, cardColor ? { backgroundColor: cardColor } : {}]}>
            {isTribeMenuOpen && (
                <TouchableWithoutFeedback onPress={() => setIsTribeMenuOpen(false)}>
                    <View style={[StyleSheet.absoluteFill, styles.dimOverlay]} />
                </TouchableWithoutFeedback>
            )}

            <VerifiedModal visible={isVerifiedVisible} onClose={() => setIsVerifiedVisible(false)} status={post.user.status} />
            <View style={[styles.header, { zIndex: 1 }]}>
                <Image source={typeof post.user.avatar === 'string' ? { uri: post.user.avatar } : post.user.avatar} style={styles.avatar} />
                <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{post.user.name}</Text>
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
                                    color={(post.user as any).activity === 'Glute Growth' ? '#FFB07C' : 'white'}
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
                    <Text style={styles.handle}>{post.user.handle}</Text>
                </View>
                <TouchableOpacity onPress={onPressOptions}><Ionicons name="ellipsis-horizontal" size={20} color="white" /></TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={isSelectMode ? 1 : 0.9} onPress={handlePressBody} style={{ zIndex: 1 }}>
                <Text style={styles.titleText}>
                    {post.snapshot?.caption || post.macroUpdate?.caption || post.workout?.title || post.meal?.title}
                </Text>

                {content()}

                {!isDetailView && (
                    <TouchableOpacity onPress={toggleExpand} style={styles.expandTrigger}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="rgba(255,255,255,0.5)" />
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
                        <Text style={styles.actionCount}>{post.stats.shares}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressLike}>
                        <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={28} color="white" />
                        <Text style={styles.actionCount}>{post.stats.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressComment}>
                        <Ionicons name="chatbubble-ellipses" size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={onPressSave}>
                        <Ionicons name={post.isSaved ? "bookmark" : "bookmark-outline"} size={26} color="white" />
                        <Text style={styles.actionCount}>{post.stats.saves}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timeLabel}>Just now</Text>
            </View>
        </View>
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
        gap: 5,
        paddingLeft: 10,
    },
    macroOldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 40,
    },
    macroNewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 40,
    },
    newTargetsLabelBox: {
        width: 75,
    },
    macroLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    macroLabelLarge: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        width: 75,
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
        gap: 4,
    },
    macroValueText: {
        color: 'white',
        fontSize: 12,
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
        fontSize: 16,
        fontWeight: 'bold',
        width: 75,
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
    workoutHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    workoutDuration: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    exercisesList: {
        marginTop: 10,
        gap: 4,
    },
    exerciseItem: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    expandTrigger: {
        alignItems: 'center',
        marginVertical: 10,
    },
    mediaFrame: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 10,
        aspectRatio: 1,
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
        paddingRight: 10,
    },
    detailedMealRowShifted: {
        paddingRight: 40,
    },
    ingInfo: {
        flex: 1,
        marginRight: 10,
    },
    ingName: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
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
    detailedWorkoutContainer: {
        marginTop: 10,
        gap: 12,
    }
});
