import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';
import WorkoutLoggerSheet from '@/src/features/workout-logging/components/WorkoutLoggerSheet';
import CardioEntryModal from '@/src/features/workout-logging/components/CardioEntryModal';
import StrengthEntryModal from '@/src/features/workout-logging/components/StrengthEntryModal';
import VerifiedModal from '@/components/VerifiedModal';
import HammerModal from '@/components/HammerModal';
import { Exercise, FeedPost } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useWorkoutLogStore } from '@/src/store/useWorkoutLogStore';
import { PostStore } from '@/store/PostStore';
import { useUserStore } from '@/store/UserStore';

// MOCK DATA - Expanded to match "Image 0" vibe
const EXERCISE_DATABASE: Exercise[] = [
    {
        id: '1',
        title: 'Front squat',
        type: 'Strength',
        muscleGroup: 'Legs',
        icon: 'dumbbell',
        notes: '5 sec eccentric',
        sets: Array(4).fill({ reps: 6 })
    },
    {
        id: '2',
        title: 'Ab roll-out',
        type: 'Strength',
        muscleGroup: 'Abs',
        icon: 'dumbbell',
        notes: '5 sec eccentric',
        sets: Array(4).fill({ reps: 6 })
    },
    {
        id: '3',
        title: 'Treadmill walk',
        type: 'Cardio',
        icon: 'run',
        speed: 3.4,
        incline: 6.0,
        duration: 30
    },
    {
        id: '4',
        title: 'DB step-ups',
        type: 'Strength',
        muscleGroup: 'Legs',
        icon: 'dumbbell',
        sets: Array(4).fill({ reps: 6 })
    },
    {
        id: '5',
        title: 'Cable Lateral raise',
        type: 'Strength',
        muscleGroup: 'Shoulders',
        icon: 'dumbbell',
        sets: Array(4).fill({ reps: 6 })
    },
    {
        id: '6',
        title: 'Cable front raise',
        type: 'Strength',
        muscleGroup: 'Shoulders',
        icon: 'dumbbell',
        sets: Array(4).fill({ reps: 6 })
    },
    {
        id: '7',
        title: 'Cable rear delt fly',
        type: 'Strength',
        muscleGroup: 'Shoulders',
        icon: 'dumbbell',
        sets: Array(4).fill({ reps: 6 })
    },
];

export default function AddExerciseScreen() {
    const router = useRouter();
    const userInfo = useUserStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    // UI State
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const [cardioModalVisible, setCardioModalVisible] = useState(false);
    const [strengthModalVisible, setStrengthModalVisible] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    const [modalVisibleMap, setModalVisibleMap] = useState({ verified: false, hammer: false });

    // Store
    const cartExercises = useWorkoutLogStore((state) => state.cartExercises);
    const addExercise = useWorkoutLogStore((state) => state.addExercise);
    const removeExercise = useWorkoutLogStore((state) => state.removeExercise);
    const setDuration = useWorkoutLogStore((state) => state.setDuration);
    const workoutDuration = useWorkoutLogStore((state) => state.workoutDuration);
    const clearCart = useWorkoutLogStore((state) => state.clear);

    useEffect(() => {
        setIsSheetVisible(cartExercises.length > 0);
    }, [cartExercises.length]);

    const filteredExercises = EXERCISE_DATABASE.filter(ex =>
        ex.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleQuickAdd = (exercise: Exercise) => {
        const newInstance: Exercise = {
            ...exercise,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            // Use defaults from definition if available
            sets: exercise.sets ? [...exercise.sets] : (exercise.type === 'Strength' ? [{ id: 's1', reps: 0, weight: 0, completed: false }] : undefined)
        };
        addExercise(newInstance);
    };

    const handleOpenEdit = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        if (exercise.type === 'Cardio') {
            setCardioModalVisible(true);
        } else {
            setStrengthModalVisible(true);
        }
    };

    const handleSaveFromModal = (updates: Partial<Exercise>) => {
        if (selectedExercise) {
            const newInstance: Exercise = {
                ...selectedExercise,
                ...updates,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            };
            addExercise(newInstance);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handlePublish = async (data: { caption: string; title: string; type: string }) => {
        const newPost: FeedPost = {
            id: Date.now().toString(),
            user: {
                id: userInfo.handle === '@kwadub' ? 'u1' : userInfo.handle,
                name: userInfo.name,
                handle: userInfo.handle,
                avatar: userInfo.avatar,
                status: userInfo.status,
                verified: true
            },
            timeAgo: 'Just now',
            workout: {
                id: 'w' + Date.now(),
                title: data.type || 'Workout',
                exercises: cartExercises,
                duration: workoutDuration || 0,
                timestamp: Date.now()
            },
            stats: { likes: 0, comments: 0, shares: 0, saves: 0 },
            meal: undefined
        };

        await PostStore.addPost(newPost);
        clearCart();
        router.back();
    };

    const renderExerciseItem = ({ item }: { item: Exercise }) => {
        const isCardio = item.type === 'Cardio';

        return (
            <TouchableOpacity
                style={styles.exerciseCard}
                onPress={() => handleOpenEdit(item)}
                activeOpacity={0.9}
            >
                {/* Left: Avatar */}
                <View style={styles.leftSection}>
                    <Image
                        source={userInfo.avatar ? { uri: userInfo.avatar } : { uri: 'https://via.placeholder.com/150' }}
                        style={styles.avatar}
                    />
                </View>

                {/* Left-Middle: User Info */}
                <View style={styles.userInfoSection}>
                    <View style={styles.userRow}>
                        <Text style={styles.userName}>{userInfo.name}</Text>
                        {userInfo.status && (userInfo.status === 'natural' || userInfo.status === 'enhanced') && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setModalVisibleMap(prev => ({ ...prev, verified: true })); }}>
                                {userInfo.status === 'enhanced' ? (
                                    <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFD700" style={{ marginLeft: 4 }} />
                                ) : (
                                    <MaterialCommunityIcons name="leaf" size={14} color={Colors.success} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setModalVisibleMap(prev => ({ ...prev, hammer: true })); }}>
                            <MaterialCommunityIcons name="hammer" size={14} color="white" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userHandle}>{userInfo.handle}</Text>
                </View>

                {/* Center: Details */}
                <View style={styles.centerSection}>
                    <Text style={styles.exerciseTitle} numberOfLines={1} adjustsFontSizeToFit>{item.title}</Text>
                    {item.notes && <Text style={styles.exerciseNotes}>{item.notes}</Text>}

                    <Text style={styles.exerciseStats}>
                        {isCardio
                            ? `${item.speed || 0} speed, ${item.incline || 0} incline, ${item.duration || 0} min`
                            : `${item.sets?.length || 3} sets x ${item.sets?.[0]?.reps || 8} reps`
                        }
                    </Text>
                </View>

                {/* Right: Icon & Plus */}
                <View style={styles.rightSection}>
                    <MaterialCommunityIcons
                        name={isCardio ? "run" : "dumbbell"}
                        size={32}
                        color={Colors.primary}
                        style={styles.typeIcon}
                    />

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                        }}
                    >
                        <Ionicons name="add" size={32} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.durationText}>30</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Log it..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <TouchableOpacity style={styles.createButton}>
                    <MaterialCommunityIcons name="pencil" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
                {['All', 'Recents', 'Following', 'Trending'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                            styles.tabPill,
                            // Logic: Active = Dark Green, Inactive = Transparent
                            activeTab === tab ? styles.tabPillActive : styles.tabPillInactive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab && styles.tabTextActive,
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={filteredExercises}
                renderItem={renderExerciseItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Modals */}
            <VerifiedModal
                visible={modalVisibleMap.verified}
                onClose={() => setModalVisibleMap(prev => ({ ...prev, verified: false }))}
                status={userInfo.status}
            />
            <HammerModal
                visible={modalVisibleMap.hammer}
                onClose={() => setModalVisibleMap(prev => ({ ...prev, hammer: false }))}
            />

            <CardioEntryModal
                visible={cardioModalVisible}
                onClose={() => setCardioModalVisible(false)}
                onSave={handleSaveFromModal}
                initialStats={selectedExercise?.type === 'Cardio' ? { speed: selectedExercise.speed, incline: selectedExercise.incline, duration: selectedExercise.duration } : undefined}
            />

            <StrengthEntryModal
                visible={strengthModalVisible}
                exercise={selectedExercise}
                onClose={() => setStrengthModalVisible(false)}
                onSave={handleSaveFromModal}
            />

            {/* Cart Sheet */}
            <WorkoutLoggerSheet
                visible={isSheetVisible}
                exercises={cartExercises}
                duration={workoutDuration}
                onClose={() => setIsSheetVisible(false)}
                onRemoveExercise={removeExercise}
                onUpdateDuration={setDuration}
                onPublish={handlePublish}
            />
        </SafeAreaView>
    );
}

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
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    tabPill: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 18,
    },
    tabPillActive: {
        backgroundColor: Colors.primary,
    },
    tabPillInactive: {
        backgroundColor: 'transparent',
    },
    tabText: {
        color: Colors.textDark,
        fontSize: 13,
        fontWeight: '500',
    },
    tabTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 120, // Extra space for sheet
    },
    exerciseCard: {
        backgroundColor: Colors.card, // Sage Green
        borderRadius: 40,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        height: 80,
    },
    leftSection: {
        marginRight: 8,
    },
    userInfoSection: {
        marginRight: 10,
        justifyContent: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        // No border
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    userHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    centerSection: {
        flex: 1,
        justifyContent: 'center',
    },
    exerciseTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 6, // Increased spacing
    },
    exerciseNotes: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 2,
    },
    exerciseStats: {
        color: 'white',
        fontSize: 14, // Reduced from 16
        fontWeight: 'bold',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeIcon: {
        transform: [{ rotate: '-15deg' }],
        marginRight: 4,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    durationText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: 'bold',
        position: 'absolute',
        bottom: -10,
        right: 12
    },
});
