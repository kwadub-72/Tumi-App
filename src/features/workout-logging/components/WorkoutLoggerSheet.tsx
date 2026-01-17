import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
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

import { Exercise } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore } from '@/store/UserStore';
import TimePickerModal from './TimePickerModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_HEIGHT = 450;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface WorkoutLoggerSheetProps {
    visible: boolean;
    exercises: Exercise[];
    duration?: number | null;
    onClose: () => void;
    onRemoveExercise: (id: string) => void;
    onUpdateDuration: (duration: number | null) => void;
    onPublish: (data: any) => void;
}

const ExerciseCartItem = ({ item, onRemove }: { item: Exercise, onRemove: (id: string) => void }) => {
    const userInfo = useUserStore();
    const isCardio = item.type === 'Cardio';

    return (
        <View style={styles.cartItemRow}>
            {/* Left: Avatar/Logo (Circle) */}
            <View style={styles.cartIconCircle}>
                <Image
                    source={userInfo.avatar ? { uri: userInfo.avatar } : { uri: 'https://via.placeholder.com/150' }}
                    style={styles.cartAvatar}
                />
            </View>

            {/* Middle: Content */}
            <View style={styles.cartContent}>
                <View style={styles.cartHeaderRow}>
                    <Text style={styles.cartUser}>{userInfo.name}</Text>
                    {userInfo.status && (userInfo.status === 'natural' || userInfo.status === 'enhanced') && (
                        userInfo.status === 'enhanced' ? (
                            <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                        ) : (
                            <MaterialCommunityIcons name="leaf" size={12} color={Colors.success} style={{ marginRight: 4 }} />
                        )
                    )}
                    <Text style={styles.cartHandle}>{userInfo.handle}</Text>
                </View>

                <View style={styles.cartTitleRow}>
                    <Text style={styles.cartTitle}>
                        {item.superset ? `${item.superset} ` : ''}{item.title}
                    </Text>
                    <MaterialCommunityIcons
                        name={item.type === 'Cardio' ? 'run' : 'dumbbell'}
                        size={18}
                        color={Colors.primary}
                        style={styles.cartTypeIcon}
                    />
                </View>

                {item.eccentric && (
                    <Text style={styles.cartEccentric}>{item.eccentric} eccentric</Text>
                )}

                <Text style={styles.cartDetails}>
                    {isCardio
                        ? `${item.speed} speed, ${item.incline} incline`
                        : `${item.sets?.length || 3} sets x ${item.sets?.[0]?.reps || 8} reps`
                    }
                </Text>
            </View>

            {/* Right: Checkmark & Duration */}
            <View style={styles.cartRight}>
                <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={18} color="white" />
                </View>
                <Text style={styles.cartDurationText}>{item.duration || 30}</Text>
            </View>
        </View>
    );
};

export default function WorkoutLoggerSheet({
    visible,
    exercises,
    duration,
    onClose,
    onRemoveExercise,
    onUpdateDuration,
    onPublish
}: WorkoutLoggerSheetProps) {
    const router = useRouter();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue({ y: 0 });

    const [caption, setCaption] = useState('');
    const [title, setTitle] = useState('');
    const [selectedType, setSelectedType] = useState('');

    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(SCREEN_HEIGHT - 350, { duration: 300 }); // Partial reveal initially? or Full?
            // Task: "Unable to pull down cart... to explore exercises"
            // So default position should be "Tucked" (low) but visible.
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
        }
    }, [visible]);

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(
                SCREEN_HEIGHT - MAX_SHEET_HEIGHT,
                event.translationY + context.value.y
            );
        })
        .onEnd(() => {
            if (translateY.value > SCREEN_HEIGHT - 200) {
                // Tuck it low
                translateY.value = withSpring(SCREEN_HEIGHT - 120);
            } else {
                // Expand
                translateY.value = withSpring(SCREEN_HEIGHT - MAX_SHEET_HEIGHT);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const handleCamera = () => {
        router.push('/camera-capture');
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Sheet */}
            <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.sheet, animatedStyle]}>

                    {/* Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Content */}
                    <View style={styles.content}>

                        {/* Input Row */}
                        <View style={styles.inputRow}>
                            <TouchableOpacity style={styles.cameraBtn} onPress={handleCamera}>
                                <Ionicons name="camera" size={24} color={Colors.primary} />
                            </TouchableOpacity>

                            <View style={styles.captionContainer}>
                                <TextInput
                                    style={styles.captionInput}
                                    placeholder="Caption..."
                                    placeholderTextColor="#888" // Lighter placeholder
                                    value={caption}
                                    onChangeText={setCaption}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.publishBtn}
                                onPress={() => onPublish({ caption, title, type: selectedType })}
                            >
                                <MaterialCommunityIcons name="playlist-plus" size={32} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Meta Row: Desc, Time */}
                        <View style={styles.metaRow}>
                            <View style={styles.metaLabelCol}>
                                <Text style={styles.metaLabel}>Workout</Text>
                                <Text style={styles.metaLabel}>desc.</Text>
                            </View>

                            <TouchableOpacity style={styles.descPill}>
                                <TextInput
                                    value={selectedType}
                                    onChangeText={setSelectedType}
                                    style={styles.descInput}
                                    placeholder="e.g. Leg Day"
                                    placeholderTextColor="rgba(79, 99, 82, 0.5)" // Light sage text
                                />
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            <View style={styles.timerGroup}>
                                <Ionicons name="stopwatch" size={20} color="white" style={{ marginRight: 6 }} />
                                <TouchableOpacity
                                    style={styles.timePill}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={[styles.timePillText, !duration && styles.placeholderText]}>
                                        {duration ? `${Math.floor(duration / 60)}hr ${duration % 60}min` : 'hh:mm'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.separator} />

                        {/* List */}
                        <FlatList
                            data={exercises}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <ExerciseCartItem
                                    item={item}
                                    onRemove={onRemoveExercise}
                                />
                            )}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </View>

                    {/* Time Picker Modal */}
                    <TimePickerModal
                        visible={showTimePicker}
                        initialDuration={duration}
                        onClose={() => setShowTimePicker(false)}
                        onSave={onUpdateDuration}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    sheet: {
        backgroundColor: '#A4B69D', // Sage Green
        height: MAX_SHEET_HEIGHT,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        // Logic fix: Sheet top is animated via translateY relative to SCREEN_HEIGHT
        // Actually typically sheet is height=SCREEN, positioned at TOP=SCREEN, then translateY moves it up.
        // Let's stick to absolute positioning logic.
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 2,
    },
    content: {
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    cameraBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E3E3CC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    captionContainer: {
        flex: 1,
        height: 44,
        backgroundColor: '#E3E3CC',
        borderRadius: 22,
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    captionInput: {
        fontSize: 16,
        color: Colors.primary,
    },
    publishBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E3E3CC',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    metaLabelCol: {
        marginRight: 10,
    },
    metaLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        lineHeight: 12,
        textTransform: 'uppercase',
    },
    descPill: {
        backgroundColor: '#E3E3CC',
        borderRadius: 20,
        height: 32,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.primary,
        minWidth: 100,
    },
    descInput: {
        color: Colors.primary,
        fontSize: 13,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    timerGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timePill: {
        backgroundColor: '#E3E3CC',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.primary,
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
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginBottom: 10,
    },
    // CART ITEM STYLES
    cartItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(164, 182, 157, 0.4)', // Slightly darker/distinct row bg?
        // Image 1 looks like a card or panel.
        borderRadius: 12,
        marginBottom: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cartIconCircle: {
        marginRight: 10,
    },
    cartAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    cartContent: {
        flex: 1,
    },
    cartHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    cartUser: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        marginRight: 4,
    },
    cartHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    cartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    cartTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 6,
    },
    cartTypeIcon: {
        transform: [{ rotate: '-15deg' }],
        opacity: 0.8,
    },
    cartDetails: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    cartEccentric: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 2,
    },
    cartRight: {
        alignItems: 'center',
        marginLeft: 8,
    },
    checkCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white', // Double border visual effect?
        marginBottom: 4,
    },
    cartDurationText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
