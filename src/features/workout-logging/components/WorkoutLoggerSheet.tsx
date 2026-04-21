import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import DraggableFlatList, {
    ScaleDecorator,
    RenderItemParams,
} from 'react-native-draggable-flatlist';

import { Exercise } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import TimePickerModal from './TimePickerModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TUCKED_HEIGHT = 80;
const BASE_HEIGHT = 390;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

const HIDDEN_Y = MAX_SHEET_HEIGHT;
const BASE_Y = MAX_SHEET_HEIGHT - BASE_HEIGHT;
const EXPANDED_Y = 0;
const TUCKED_Y = MAX_SHEET_HEIGHT - TUCKED_HEIGHT;

export interface WorkoutLoggerSheetProps {
    visible: boolean;
    exercises: Exercise[];
    duration?: number | null;
    onClose: () => void;
    onRemoveExercise: (id: string) => void;
    onEditExercise: (exercise: Exercise) => void;
    onUpdateDuration: (duration: number | null) => void;
    onPublish: (data: { caption: string; title: string; type: string }) => void;
    capturedImage?: string | null;
    mediaType?: 'image' | 'video' | null;
    /** When true, tuck the sheet (e.g. search bar focused on parent screen) */
    forceTucked?: boolean;
}

const WORKOUT_TYPES = ['Legs', 'Chest and triceps', 'Back and biceps', 'Arm farm', 'Glutes', 'Custom'];

// ─── Swipeable Exercise Row ────────────────────────────────────────────────────

const SwipeableExercise = ({
    item,
    onRemove,
    onEdit,
    drag,
    isActive,
}: {
    item: Exercise & { displayId?: string };
    onRemove: (id: string) => void;
    onEdit: (ex: Exercise) => void;
    drag: () => void;
    isActive: boolean;
}) => {
    const itemTranslateX = useSharedValue(0);

    // Key fix: failOffsetY ensures vertical scrolling is not consumed by this gesture
    const itemPan = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onUpdate((event) => {
            itemTranslateX.value = Math.min(0, event.translationX);
        })
        .onEnd((event) => {
            if (itemTranslateX.value < -80 || event.velocityX < -500) {
                itemTranslateX.value = withTiming(-SCREEN_HEIGHT, {}, () => {
                    runOnJS(onRemove)(item.id);
                });
            } else {
                itemTranslateX.value = withSpring(0);
            }
        });

    const rItemStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: itemTranslateX.value }],
    }));

    const isCardio = item.type === 'Cardio';
    const isTribe = item.createdBy?.isTribe;

    const statsText = isCardio
        ? `${item.speed ?? 0} speed • ${item.incline ?? 0} incline`
        : `${item.sets?.length ?? 3} ${item.sets?.length === 1 ? 'set' : 'sets'} x ${item.sets?.[0]?.reps ?? 8} reps`;

    return (
        <View style={[styles.swipeWrapper, isActive && { backgroundColor: 'transparent' }]}>
            {/* Delete background */}
            {!isActive && (
                <View style={styles.deleteBackground}>
                    <Ionicons name="trash" size={24} color="white" />
                </View>
            )}

            <GestureDetector gesture={itemPan}>
                <ScaleDecorator>
                    <TouchableOpacity
                        onPress={() => onEdit(item)}
                        onLongPress={drag}
                        disabled={isActive}
                        activeOpacity={1}
                        delayLongPress={200}
                    >
                        <Animated.View style={[styles.exerciseRow, rItemStyle, isActive && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            {/* Left: Avatar */}
                            {isTribe ? (
                        <View style={styles.tribeAvatarCircle}>
                            <MaterialCommunityIcons name="fire" size={22} color={Colors.primary} />
                        </View>
                    ) : (
                        <Image
                            source={
                                item.createdBy?.avatar
                                    ? { uri: item.createdBy.avatar }
                                    : { uri: 'https://via.placeholder.com/150' }
                            }
                            style={styles.cartAvatar}
                        />
                    )}

                    {/* Middle: Name/handle + title inline with icon */}
                    <View style={styles.cartContent}>
                        <View style={styles.cartHeaderRow}>
                            <Text style={styles.cartUser}>{item.createdBy?.name ?? 'You'}</Text>
                            <Text style={styles.cartHandle}>{item.createdBy?.handle ?? ''}</Text>
                        </View>

                        {/* Title + type icon sit inline, icon directly after text */}
                        <View style={styles.cartTitleRow}>
                            <Text style={styles.cartTitle} numberOfLines={1}>
                                {item.displayId ? `${item.displayId} · ` : ''}{item.title}
                            </Text>
                            <MaterialCommunityIcons
                                name={isCardio ? 'run' : 'dumbbell'}
                                size={15}
                                color={Colors.primary}
                                style={styles.cartTypeIcon}
                            />
                        </View>

                        {item.eccentric && (
                            <Text style={styles.cartEccentric}>{item.eccentric} sec eccentric</Text>
                        )}

                        <Text style={styles.cartDetails}>{statsText}</Text>
                    </View>

                    {/* Right: Checkmark + Log Count */}
                    <View style={styles.cartRight}>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                        <Text style={styles.cartLogCount}>{item.logCount ?? 0}</Text>
                    </View>
                        </Animated.View>
                    </TouchableOpacity>
                </ScaleDecorator>
            </GestureDetector>
        </View>
    );
};

// ─── Main Sheet ────────────────────────────────────────────────────────────────

export default function WorkoutLoggerSheet({
    visible,
    exercises,
    duration,
    onRemoveExercise,
    onEditExercise,
    onUpdateDuration,
    onPublish,
    capturedImage: externalImage,
    mediaType: externalType,
    forceTucked,
}: WorkoutLoggerSheetProps) {
    const listRef = useRef<any>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const translateY = useSharedValue(HIDDEN_Y);
    const context = useSharedValue({ y: 0 });
    const isTucked = useSharedValue(false);

    // Track whether a sheet-owned input is focused so keyboard expansion
    // only fires when the user is typing inside the sheet (not the search bar).
    const isSheetInputFocused = useRef(false);
    const pickerY = useRef<number>(0);

    // Track previous exercise count for auto-reveal
    const prevExerciseCount = useRef(0);

    const [caption, setCaption] = useState('');
    const [selectedType, setSelectedType] = useState('Workout');
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [customType, setCustomType] = useState('');
    const [localImage, setLocalImage] = useState<string | null>(null);
    const [localMediaType, setLocalMediaType] = useState<'image' | 'video' | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const reorderExercises = useWorkoutLogStore((s) => s.reorderExercises);

    // Compute display names with superset numbering
    const exercisesWithNumbering = React.useMemo(() => {
        const counts: Record<string, number> = {};
        return exercises.map((ex) => {
            if (!ex.superset) return ex;
            const char = ex.superset.toUpperCase();
            counts[char] = (counts[char] || 0) + 1;
            return {
                ...ex,
                displayId: `${char}${counts[char]}`,
            };
        });
    }, [exercises]);

    // Sync external media from workout store
    const storeCapturedMedia = useWorkoutLogStore((s) => s.capturedMedia);

    useEffect(() => {
        const media = externalImage
            ? { uri: externalImage, type: externalType ?? 'image' }
            : storeCapturedMedia;
        if (media) {
            setLocalImage(media.uri);
            setLocalMediaType(media.type as 'image' | 'video');
            translateY.value = withTiming(EXPANDED_Y);
        }
    }, [externalImage, externalType, storeCapturedMedia]);

    // Show/hide animation
    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(BASE_Y, { duration: 300 });
        } else {
            translateY.value = withTiming(HIDDEN_Y, { duration: 300 });
        }
    }, [visible, translateY]);

    // Auto-reveal when a new exercise is added — pull to BASE so user sees it
    useEffect(() => {
        if (exercises.length > prevExerciseCount.current && exercises.length > 0 && visible) {
            // Only expand if currently tucked
            if (translateY.value > BASE_Y + 20) {
                translateY.value = withSpring(BASE_Y, { damping: 20, stiffness: 160 });
                isTucked.value = false;
            }
            // Scroll the list to the bottom so new item is visible
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 350);
        }
        prevExerciseCount.current = exercises.length;
    }, [exercises.length]);

    // forceTucked prop: when parent signals tuck (e.g. search bar focused)
    useEffect(() => {
        if (forceTucked && visible) {
            translateY.value = withTiming(TUCKED_Y, { duration: 250 });
            isTucked.value = true;
        } else if (forceTucked === false && visible && translateY.value >= TUCKED_Y - 10) {
            // Un-tuck when search bar blurs
            translateY.value = withTiming(BASE_Y, { duration: 250 });
            isTucked.value = false;
        }
    }, [forceTucked, visible]);

    // Keyboard awareness — ONLY expand/collapse when sheet's own inputs are focused
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            if (visible && isSheetInputFocused.current) {
                translateY.value = withTiming(EXPANDED_Y, { duration: 300 });
                isTucked.value = false;
                // Scroll picker into view if custom type is open so it isn't covered by the keyboard
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: Math.max(0, pickerY.current - 50), animated: true });
                }, 350);
            }
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            if (visible && isSheetInputFocused.current) {
                translateY.value = withTiming(BASE_Y, { duration: 300 });
                isTucked.value = false;
            }
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [visible, translateY, isTucked]);

    const panGesture = Gesture.Pan()
        .activeOffsetY([-5, 5])
        .onStart(() => {
            context.value = { y: translateY.value };
            runOnJS(setIsPanning)(true);
        })
        .onUpdate((event) => {
            translateY.value = Math.max(
                EXPANDED_Y,
                Math.min(TUCKED_Y, event.translationY + context.value.y)
            );
        })
        .onEnd((event) => {
            runOnJS(setIsPanning)(false);
            const currentY = translateY.value;
            if (currentY > (BASE_Y + TUCKED_Y) / 2 || event.velocityY > 500) {
                translateY.value = withTiming(TUCKED_Y);
                isTucked.value = true;
            } else if (currentY < (BASE_Y + EXPANDED_Y) / 2) {
                translateY.value = withTiming(EXPANDED_Y);
                isTucked.value = false;
            } else {
                translateY.value = withTiming(BASE_Y);
                isTucked.value = false;
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const handlePublish = () => {
        if (exercises.length === 0) return;
        onPublish({
            caption,
            title: caption,
            type: selectedType === 'Custom' ? customType : selectedType,
        });
        setCaption('');
        setSelectedType('Workout');
        setCustomType('');
        setLocalImage(null);
        setLocalMediaType(null);
        useWorkoutLogStore.getState().setCapturedMedia(null);
    };

    const handleDragEnd = ({ data }: { data: Array<Exercise & { displayId?: string }> }) => {
        // Validation: Block invalid superset splits
        // A superset is valid if all items with the same letter are contiguous.
        const seenSupersets = new Set<string>();
        let currentSuperset: string | null = null;
        let isValid = true;

        for (const ex of data) {
            if (ex.superset) {
                const s = ex.superset.toUpperCase();
                if (currentSuperset !== s) {
                    if (seenSupersets.has(s)) {
                        isValid = false;
                        break;
                    }
                    seenSupersets.add(s);
                    currentSuperset = s;
                }
            } else {
                currentSuperset = null;
            }
        }

        if (isValid) {
            // Remove the displayId before saving back to store
            const cleanData = data.map(({ displayId, ...rest }) => rest);
            reorderExercises(cleanData as Exercise[]);
        } else {
            // Haptic or silent snapback — react-native-draggable-flatlist handles the snapback 
            // naturally because we just don't update the state.
        }
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.container}>
                <Animated.View style={[styles.sheet, animatedStyle]}>
                    {/* Drag handle — only this area drives the pan gesture */}
                    <GestureDetector gesture={panGesture}>
                        <View
                            style={styles.handleContainer}
                            hitSlop={{ top: 20, bottom: 20, left: 40, right: 40 }}
                        >
                            <View style={styles.handle} />
                        </View>
                    </GestureDetector>

                    {/* Scrollable sheet content — separate from pan gesture so list scrolls freely */}
                    <View style={styles.content}>
                        {/* ── Caption row ── */}
                        <View style={styles.captionContainer}>
                            <TouchableOpacity
                                style={styles.cameraIconBtn}
                                onPress={() => router.push('/camera-capture?source=workout')}
                            >
                                <Ionicons name="camera" size={28} color="white" />
                            </TouchableOpacity>

                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[
                                        styles.captionInput,
                                        { fontSize: caption.length > 35 ? 13 : 15 },
                                    ]}
                                    placeholder="Caption..."
                                    placeholderTextColor={Colors.textDark + '99'}
                                    value={caption}
                                    onChangeText={setCaption}
                                    multiline
                                    maxLength={140}
                                    onFocus={() => { isSheetInputFocused.current = true; }}
                                    onBlur={() => { isSheetInputFocused.current = false; }}
                                />
                            </View>

                            <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
                                <MaterialCommunityIcons
                                    name="post-outline"
                                    size={30}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* ── Scrollable area: media + meta + picker + list ── */}
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                        >
                            {/* Media preview */}
                            {localImage ? (
                                <View style={[styles.capturedImageWrapper, { marginBottom: 16 }]}>
                                    {localMediaType === 'video' ? (
                                        <View style={styles.videoPreviewContainer}>
                                            <Video
                                                source={{ uri: localImage }}
                                                style={styles.capturedImage}
                                                resizeMode={ResizeMode.COVER}
                                                isLooping
                                                shouldPlay={isPlaying && !isPanning}
                                                isMuted={isMuted}
                                                useNativeControls={false}
                                            />
                                            {!isPlaying && (
                                                <TouchableOpacity
                                                    style={styles.playOverlay}
                                                    onPress={() => setIsPlaying(true)}
                                                >
                                                    <Ionicons name="play" size={60} color="white" />
                                                </TouchableOpacity>
                                            )}
                                            {isPlaying && (
                                                <TouchableOpacity
                                                    style={styles.playOverlay}
                                                    onPress={() => setIsPlaying(false)}
                                                >
                                                    <Ionicons name="pause" size={60} color="rgba(255,255,255,0.5)" />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={styles.muteBtnSmall}
                                                onPress={() => setIsMuted(!isMuted)}
                                            >
                                                <Ionicons
                                                    name={isMuted ? 'volume-mute' : 'volume-high'}
                                                    size={18}
                                                    color="white"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: localImage }} style={styles.capturedImage} />
                                    )}
                                    <TouchableOpacity
                                        style={styles.removePreviewBtn}
                                        onPress={() => {
                                            setLocalImage(null);
                                            setLocalMediaType(null);
                                            useWorkoutLogStore.getState().setCapturedMedia(null);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            {/* Meta row: Workout type + Stopwatch */}
                            <View style={styles.summaryRow}>
                                <TouchableOpacity
                                    style={styles.typeSelector}
                                    onPress={() => setShowTypePicker(!showTypePicker)}
                                >
                                    <Text style={styles.typeText}>
                                        {selectedType === 'Custom' && customType
                                            ? customType
                                            : selectedType}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.timerGroup}>
                                    <Ionicons name="stopwatch" size={20} color="white" style={{ marginRight: 6 }} />
                                    <TouchableOpacity
                                        style={styles.timePill}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={[styles.timePillText, !duration && styles.placeholderText]}>
                                            {duration
                                                ? `${Math.floor(duration / 60)}hr ${duration % 60}min`
                                                : 'hh:mm'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Workout type picker */}
                            {showTypePicker && (
                                <View 
                                    style={styles.pickerContainer}
                                    onLayout={(e) => {
                                        pickerY.current = e.nativeEvent.layout.y;
                                    }}
                                >
                                    {WORKOUT_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={styles.pickerItem}
                                            onPress={() => {
                                                setSelectedType(type);
                                                if (type !== 'Custom') {
                                                    setShowTypePicker(false);
                                                    isSheetInputFocused.current = false;
                                                }
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.pickerText,
                                                    selectedType === type && { color: Colors.primary },
                                                ]}
                                            >
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {selectedType === 'Custom' && (
                                        <TextInput
                                            style={styles.customInput}
                                            placeholder="Workout name..."
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            value={customType}
                                            onChangeText={setCustomType}
                                            onSubmitEditing={() => {
                                                setShowTypePicker(false);
                                                isSheetInputFocused.current = false;
                                            }}
                                            onFocus={() => {
                                                isSheetInputFocused.current = true;
                                            }}
                                            onBlur={() => {
                                                isSheetInputFocused.current = false;
                                            }}
                                            autoFocus
                                        />
                                    )}
                                </View>
                            )}

                            {/* Exercise list — DraggableFlatList */}
                            <DraggableFlatList
                                ref={listRef}
                                data={exercisesWithNumbering}
                                onDragEnd={handleDragEnd}
                                keyExtractor={(item) => item.id}
                                renderItem={(params: RenderItemParams<any>) => (
                                    <SwipeableExercise 
                                        item={params.item} 
                                        onRemove={onRemoveExercise}
                                        onEdit={onEditExercise}
                                        drag={params.drag}
                                        isActive={params.isActive}
                                    />
                                )}
                                ItemSeparatorComponent={() => <View style={styles.separator} />}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                scrollEnabled={false}
                                activationDistance={10}
                            />
                            {/* Bottom padding so last item is above nav bar */}
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>

            <TimePickerModal
                visible={showTimePicker}
                initialDuration={duration}
                onClose={() => setShowTimePicker(false)}
                onSave={onUpdateDuration}
            />
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        backgroundColor: Colors.card,
        height: MAX_SHEET_HEIGHT,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
    },
    handleContainer: {
        paddingVertical: 15,
        alignItems: 'center',
        width: '100%',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 3,
    },
    content: {
        flex: 1,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },

    // Caption row
    captionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    cameraIconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        minHeight: 48,
        borderRadius: 24,
        backgroundColor: Colors.theme.beigeLight,
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    captionInput: {
        color: Colors.textDark,
        minHeight: 24,
    },
    publishBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Media preview
    capturedImageWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        position: 'relative',
    },
    capturedImage: {
        width: '100%',
        aspectRatio: 1,
    },
    removePreviewBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
    },
    videoPreviewContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    muteBtnSmall: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        borderRadius: 15,
    },

    // Summary / meta row
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        paddingBottom: 12,
    },
    typeSelector: {
        flex: 1,
    },
    typeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    timerGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timePill: {
        backgroundColor: Colors.theme.beigeLight,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    timePillText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    placeholderText: {
        fontStyle: 'italic',
        opacity: 0.6,
    },

    // Type picker
    pickerContainer: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 14,
        gap: 4,
    },
    pickerItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    pickerText: {
        color: 'white',
        fontSize: 16,
    },
    customInput: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary,
        color: 'white',
        fontSize: 16,
        padding: 8,
        marginTop: 4,
    },

    // Swipeable exercise row
    swipeWrapper: {
        backgroundColor: Colors.error,
        borderRadius: 10,
        marginBottom: 6,
        overflow: 'hidden',
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.card,
        borderRadius: 10,
        gap: 10,
    },
    tribeAvatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'rgba(79,99,82,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    cartAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.primary,
        flexShrink: 0,
    },
    cartContent: {
        flex: 1,
        minWidth: 0, // allows text truncation
    },
    cartHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    cartUser: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    cartHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    // Title row: icon sits DIRECTLY after the title text, no flex pushing it away
    cartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    cartTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flexShrink: 1, // shrinks if too long, keeping icon right next to it
    },
    cartTypeIcon: {
        opacity: 0.85,
        flexShrink: 0,
    },
    cartEccentric: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 2,
    },
    cartDetails: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    cartRight: {
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
    },
    checkCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartLogCount: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
