import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Keyboard,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Alert,
} from 'react-native';

import WorkoutLoggerSheet from '@/src/features/workout-logging/components/WorkoutLoggerSheet';
import CardioEntryModal from '@/src/features/workout-logging/components/CardioEntryModal';
import StrengthEntryModal from '@/src/features/workout-logging/components/StrengthEntryModal';
import VerifiedModal from '@/components/VerifiedModal';
import HammerModal from '@/components/HammerModal';
import { ExerciseSearchResult } from '@/src/features/workout-logging/exerciseSearchService';
import { useExerciseSearch } from '@/src/features/workout-logging/hooks/useExerciseSearch';
import { Exercise, FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { PostStore } from '@/store/PostStore';
import { useUserStore } from '@/store/UserStore';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { useAuthStore } from '@/store/AuthStore';

// ─── Tribe creator attribution ──────────────────────────────────────────────

const TRIBE_CREATOR = {
    name: 'Tribe',
    handle: '@Tribe',
    isTribe: true,
} as const;

/** Convert an API search result to the internal Exercise type */
function apiResultToExercise(result: ExerciseSearchResult): Exercise {
    const isCardio = result.category === 'Cardio';
    return {
        id: result.id,
        title: result.name,
        type: isCardio ? 'Cardio' : 'Strength',
        muscleGroup: result.muscle,
        sets: isCardio ? undefined : [],
        speed: undefined,
        incline: undefined,
        duration: undefined,
        logCount: 0,
        createdBy: TRIBE_CREATOR,
    };
}

// ─── Exercise search card ────────────────────────────────────────────────────

function ExerciseSearchCard({
    item,
    countInCart,
    onAdd,
    onQuickAdd,
}: {
    item: ExerciseSearchResult;
    countInCart: number;
    onAdd: () => void;
    onQuickAdd: () => void;
}) {
    const isCardio = item.category === 'Cardio';

    return (
        <TouchableOpacity style={styles.exerciseCard} onPress={onAdd} activeOpacity={0.85}>
            {/* ── Far left: Tribe avatar + name + handle ── */}
            <View style={styles.creatorSection}>
                <View style={styles.tribeAvatarCircle}>
                    <MaterialCommunityIcons name="fire" size={22} color={Colors.primary} />
                </View>
                <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>Tribe</Text>
                    <Text style={styles.creatorHandle}>@Tribe</Text>
                </View>
            </View>

            {/* ── Center: Exercise name + icon ── */}
            {/* Name may be long: first tries 2 lines at full size, then 3 lines at smaller size */}
            <View style={styles.centerSection}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                    <ExerciseName name={item.name} />
                </View>
                <View style={styles.iconColumn}>
                    <MaterialCommunityIcons
                        name={isCardio ? 'run' : 'dumbbell'}
                        size={22}
                        color={Colors.primary}
                        style={styles.titleTypeIcon}
                    />
                </View>
            </View>

            {/* ── Far right: add button + log count ── */}
            <View style={styles.addColumn}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={onQuickAdd}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="add" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.logCount}>{countInCart}</Text>
            </View>
        </TouchableOpacity>
    );
}

/**
 * Smart exercise name component:
 * - Short names (≤ ~25 chars): large bold, 1 line
 * - Medium names: large bold, 2 lines
 * - Long names: slightly smaller font, up to 3 lines
 */
function ExerciseName({ name }: { name: string }) {
    const isLong = name.length > 28;
    return (
        <Text
            style={[
                styles.exerciseTitle,
                isLong && styles.exerciseTitleSmall,
            ]}
            numberOfLines={isLong ? 3 : 2}
        >
            {name}
        </Text>
    );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'All' | 'Recents' | 'Following';
const TABS: Tab[] = ['All', 'Recents', 'Following'];

// ─── Skeleton loader card ─────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonCenter}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
            </View>
            <View style={styles.skeletonButton} />
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AddExerciseScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const session = useAuthStore((state) => state.session);
    const [activeTab, setActiveTab] = useState<Tab>('All');
    const [searchFocused, setSearchFocused] = useState(false);

    // Live search via API Ninjas
    const { results, isLoading, error, setQuery, query } =
        useExerciseSearch();

    // Modal state — we need an Exercise to pass to modals
    const [cardioModalVisible, setCardioModalVisible] = useState(false);
    const [strengthModalVisible, setStrengthModalVisible] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [modalVisibleMap] = useState({ verified: false, hammer: false });

    // Store
    const cartExercises = useWorkoutLogStore((state) => state.cartExercises);
    const addExercise = useWorkoutLogStore((state) => state.addExercise);
    const updateExercise = useWorkoutLogStore((state) => state.updateExercise);
    const removeExercise = useWorkoutLogStore((state) => state.removeExercise);
    const setDuration = useWorkoutLogStore((state) => state.setDuration);
    const workoutDuration = useWorkoutLogStore((state) => state.workoutDuration);
    const capturedMedia = useWorkoutLogStore((state) => state.capturedMedia);
    const clearCart = useWorkoutLogStore((state) => state.clear);
    const historicalCounts = useWorkoutLogStore((state) => state.historicalCounts);
    const incrementHistoricalCount = useWorkoutLogStore((state) => state.incrementHistoricalCount);

    const [isSheetVisible, setIsSheetVisible] = useState(false);

    useEffect(() => {
        setIsSheetVisible(cartExercises.length > 0);
    }, [cartExercises.length]);

    // ── Quick-add: no modal, sensible defaults ──
    const handleQuickAdd = (result: ExerciseSearchResult) => {
        const exercise = apiResultToExercise(result);
        const newInstance: Exercise = {
            ...exercise,
            id: `${exercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        };
        addExercise(newInstance);
    };

    // ── Open entry modal for detailed config ──
    const handleOpenEdit = (result: ExerciseSearchResult | Exercise) => {
        const isFromCart = 'sets' in result || 'speed' in result;
        const exercise = isFromCart ? (result as Exercise) : apiResultToExercise(result as ExerciseSearchResult);
        
        setSelectedExercise(exercise);
        setEditingExercise(isFromCart ? (result as Exercise) : null);

        if (exercise.type === 'Cardio') {
            setCardioModalVisible(true);
        } else {
            setStrengthModalVisible(true);
        }
    };

    // ── Save from entry modal ──
    const handleSaveFromModal = (updates: Partial<Exercise>) => {
        if (!selectedExercise) return;

        if (editingExercise) {
            updateExercise(editingExercise.id, updates);
        } else {
            const newInstance: Exercise = {
                ...selectedExercise,
                ...updates,
                id: `${selectedExercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            };
            addExercise(newInstance);
        }
        setEditingExercise(null);
    };

    // ── Publish workout ──
    const handlePublish = async (data: { caption: string; title: string; type: string }) => {
        try {
            if (!session?.user?.id) {
                Alert.alert('Auth Error', 'No valid session to publish workout');
                console.error('No valid session to publish workout');
                return;
            }
            
            const totals = {
                duration: workoutDuration || 0,
                cals: 0, 
                macros: { p: 0, c: 0, f: 0 } // Workouts don't have these by default
            };

            const newWorkoutPayload = {
                workout: {
                    id: 'w' + Date.now(),
                    title: data.type && data.type !== 'Custom' ? data.type : (data.title || 'Workout'),
                    exercises: cartExercises,
                    duration: totals.duration,
                    timestamp: Date.now(),
                    time: 'Just now',
                }
            };

            // For Supabase, id should be the auth session ID.
            const authorId = session.user.id;

        try {
            await SupabasePostService.addPost({
                authorId: authorId,
                postType: 'workout',
                caption: data.caption,
                mediaUrl: capturedMedia?.uri || undefined,
                mediaType: capturedMedia?.type as 'image' | 'video' | undefined,
                payload: newWorkoutPayload,
            });

            // Increment historical counts
            cartExercises.forEach(ex => {
                try {
                    incrementHistoricalCount(ex.title);
                } catch (e) {
                    console.error('Failed to increment count', e);
                }
            });
        } catch (error: any) {
            Alert.alert('Publish Error', error.message || 'Failed to post workout');
            console.error('Failed to post workout', error);
            return; // don't close sheet if critical error
        }

        setIsSheetVisible(false);
        clearCart();
        
        // Ensure router back happens after UI clears
        setTimeout(() => {
            router.back();
        }, 100);
        } catch (e: any) {
            Alert.alert('General Error', e.message || 'An unexpected error occurred during publish');
        }
    };

    const renderExerciseCard = ({ item }: { item: ExerciseSearchResult }) => {
        const count = historicalCounts[item.name] || 0;
        return (
            <ExerciseSearchCard
                item={item}
                countInCart={count}
                onAdd={() => handleOpenEdit(item)}
                onQuickAdd={() => handleQuickAdd(item)}
            />
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'All':
                return isLoading ? (
                    // Skeleton while first page loads
                    <View style={styles.listContent}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={56} color={Colors.primary + '66'} />
                        <Text style={styles.emptyText}>Couldn't load exercises</Text>
                        <Text style={styles.emptySubText}>{error}</Text>
                    </View>
                ) : results.length === 0 ? (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons
                            name="dumbbell"
                            size={56}
                            color={Colors.primary + '44'}
                        />
                        <Text style={styles.emptyText}>No exercises found</Text>
                        <Text style={styles.emptySubText}>Try a different search term</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        renderItem={renderExerciseCard}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                );

            case 'Recents':
                return (
                    <View style={styles.centered}>
                        <Ionicons name="time-outline" size={56} color={Colors.primary + '44'} />
                        <Text style={styles.emptyText}>No recent exercises</Text>
                        <Text style={styles.emptySubText}>Exercises you log will appear here</Text>
                    </View>
                );

            case 'Following':
                return (
                    <View style={styles.centered}>
                        <Ionicons name="people-outline" size={56} color={Colors.primary + '44'} />
                        <Text style={styles.emptyText}>Nobody followed yet</Text>
                        <Text style={styles.emptySubText}>
                            Follow people to see their exercises here
                        </Text>
                    </View>
                );
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                    </TouchableOpacity>

                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Log it..."
                            placeholderTextColor="#666"
                            value={query}
                            onChangeText={setQuery}
                            returnKeyType="search"
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setQuery('')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close-circle" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity style={styles.createButton}>
                        <MaterialCommunityIcons name="pencil" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Tabs ── */}
                <View style={styles.tabsRow}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Content ── */}
                <View style={{ flex: 1 }}>{renderTabContent()}</View>

                {/* ── Modals ── */}
                <VerifiedModal
                    visible={modalVisibleMap.verified}
                    onClose={() => {}}
                    status={userInfo.status}
                />
                <HammerModal
                    visible={modalVisibleMap.hammer}
                    onClose={() => {}}
                />
                <CardioEntryModal
                    visible={cardioModalVisible}
                    exercise={selectedExercise}
                    onClose={() => setCardioModalVisible(false)}
                    onSave={handleSaveFromModal}
                    initialStats={
                        selectedExercise?.type === 'Cardio'
                            ? {
                                  speed: selectedExercise.speed,
                                  incline: selectedExercise.incline,
                                  duration: selectedExercise.duration,
                              }
                            : undefined
                    }
                />
                <StrengthEntryModal
                    visible={strengthModalVisible}
                    exercise={selectedExercise}
                    onClose={() => setStrengthModalVisible(false)}
                    onSave={handleSaveFromModal}
                />

                {/* ── Workout Logger Sheet ── */}
                <WorkoutLoggerSheet
                    visible={isSheetVisible}
                    exercises={cartExercises}
                    duration={workoutDuration}
                    onClose={() => setIsSheetVisible(false)}
                    onRemoveExercise={removeExercise}
                    onEditExercise={handleOpenEdit}
                    onUpdateDuration={setDuration}
                    onPublish={handlePublish}
                    capturedImage={capturedMedia?.uri ?? null}
                    mediaType={capturedMedia?.type ?? null}
                    forceTucked={searchFocused}
                />
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    searchWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        paddingHorizontal: 12,
        backgroundColor: Colors.background,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: Colors.textDark,
        fontSize: 16,
    },
    createButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Tabs
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    tabPill: {
        flex: 1,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabPillActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.textDark,
        fontSize: 12,
        fontWeight: '500',
    },
    tabTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },

    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 200,
    },

    // Exercise search card
    exerciseCard: {
        backgroundColor: Colors.card,
        borderRadius: 40,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 80,
    },
    creatorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 115,
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
    },
    creatorInfo: {
        marginLeft: 8,
        justifyContent: 'center',
    },
    creatorName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    creatorHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    // Center section holds the name + icon inline
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 6,
        gap: 6,
        flexWrap: 'nowrap',
    },
    exerciseTitle: {
        color: 'white',
        fontSize: 19,
        fontWeight: 'bold',
        lineHeight: 23,
        flexShrink: 1,
    },
    exerciseTitleSmall: {
        fontSize: 15,
        lineHeight: 19,
    },
    titleTypeIcon: {
        flexShrink: 0,
    },
    iconColumn: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addColumn: {
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
    },
    addButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logCount: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Skeleton loader
    skeletonCard: {
        backgroundColor: Colors.card,
        borderRadius: 40,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        height: 80,
        opacity: 0.5,
    },
    skeletonAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        marginRight: 12,
    },
    skeletonCenter: {
        flex: 1,
    },
    skeletonLine: {
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.primary,
        width: '80%',
    },
    skeletonButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.primary,
    },

    // Footer loader
    footerLoader: {
        padding: 20,
        alignItems: 'center',
    },

    // Empty states
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: Colors.textDark,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
    },
    emptySubText: {
        color: Colors.textDark + '99',
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
});
