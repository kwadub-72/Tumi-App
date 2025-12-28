import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Keyboard,
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
import { Ingredient } from '../../../shared/models/types';
import { NutritionService } from '../../../shared/services/NutritionService';
import { Colors } from '../../../shared/theme/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TUCKED_HEIGHT = 80;
const BASE_HEIGHT = 380;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

const HIDDEN_Y = MAX_SHEET_HEIGHT;
const BASE_Y = MAX_SHEET_HEIGHT - BASE_HEIGHT;
const EXPANDED_Y = 0;
const TUCKED_Y = MAX_SHEET_HEIGHT - TUCKED_HEIGHT;

export interface MealLoggerSheetProps {
    visible: boolean;
    items: Ingredient[];
    onClose: () => void;
    onPublish: (meal: { title: string; type: string; ingredients: Ingredient[]; mediaUrl?: any }) => void;
    onRemoveItem: (id: string) => void;
    capturedImage?: string | null;
    mediaType?: 'image' | 'video';
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Custom'];

// Extracted Component
const SwipeableIngredient = ({
    item,
    onRemove,
}: {
    item: Ingredient;
    onRemove: (id: string) => void;
}) => {
    const itemTranslateX = useSharedValue(0);

    const itemPan = Gesture.Pan()
        .activeOffsetX([-10, 10])
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

    return (
        <View style={styles.swipeWrapper}>
            <View style={styles.deleteBackground}>
                <Ionicons name="trash" size={24} color="white" />
            </View>
            <GestureDetector gesture={itemPan}>
                <Animated.View style={[styles.ingredientRow, rItemStyle]}>
                    <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{item.name}</Text>
                        <Text style={styles.ingredientAmount}>{item.amount}</Text>
                    </View>
                    <View style={styles.ingredientMacros}>
                        <View style={styles.miniMacro}>
                            <MaterialCommunityIcons name="fire" size={14} color={Colors.primary} />
                            <Text style={styles.miniMacroText}>{item.cals}</Text>
                        </View>
                        <View style={styles.miniMacro}>
                            <MaterialCommunityIcons name="food-drumstick" size={12} color="white" />
                            <Text style={styles.miniMacroText}>{item.macros.p}g</Text>
                        </View>
                        <View style={styles.miniMacro}>
                            <MaterialCommunityIcons name="barley" size={12} color="white" />
                            <Text style={styles.miniMacroText}>{item.macros.c}g</Text>
                        </View>
                        <View style={styles.miniMacro}>
                            <Ionicons name="water" size={12} color="white" />
                            <Text style={styles.miniMacroText}>{item.macros.f}g</Text>
                        </View>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

export default function MealLoggerSheet({
    visible,
    items,
    onClose,
    onPublish,
    onRemoveItem,
    capturedImage: externalImage,
    mediaType: externalType,
}: MealLoggerSheetProps) {
    const listRef = useRef<FlatList>(null);
    const translateY = useSharedValue(HIDDEN_Y);
    const context = useSharedValue({ y: 0 });
    const isTucked = useSharedValue(false);

    const [caption, setCaption] = useState('');
    const [selectedType, setSelectedType] = useState('Meal');
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [customType, setCustomType] = useState('');
    const [localImage, setLocalImage] = useState<string | null>(null);
    const [localType, setLocalType] = useState<'image' | 'video' | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    // consumption set for params to avoid re-triggering logic
    const hasConsumedParams = useRef(false);

    // Stop video if sheet is tucked
    useEffect(() => {
        if (isTucked.value) {
            setIsPlaying(false);
        }
    }, [isTucked.value]);

    useEffect(() => {
        if (externalImage) {
            setLocalImage(externalImage);
            setLocalType(externalType || 'image');
            translateY.value = withTiming(EXPANDED_Y);
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 500);
        }
    }, [externalImage, externalType]);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(BASE_Y, { duration: 300 });
        } else {
            translateY.value = withTiming(HIDDEN_Y, { duration: 300 });
            hasConsumedParams.current = false; // Reset when sheet closes
        }
    }, [visible, translateY]);

    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
            if (visible) {
                translateY.value = withTiming(EXPANDED_Y, { duration: 300 });
                isTucked.value = false;
            }
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (visible) {
                translateY.value = withTiming(BASE_Y, { duration: 300 });
                isTucked.value = false;
            }
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [visible, translateY, isTucked]);

    const totals = NutritionService.sumMacros(items);

    const panGesture = Gesture.Pan()
        .activeOffsetY([-5, 5]) // Make it more responsive to vertical movement
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

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const handlePublish = () => {
        if (items.length === 0) return;
        onPublish({
            title: caption,
            type: selectedType === 'Custom' ? customType : selectedType,
            ingredients: items,
            mediaUrl: localImage,
        });
        setCaption('');
        setSelectedType('Meal');
        setCustomType('');
        setLocalImage(null);
        setLocalType(null);
        hasConsumedParams.current = false; // Reset after publishing
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.container}>
                <Animated.View style={[styles.sheet, animatedStyle]}>
                    <GestureDetector gesture={panGesture}>
                        <View
                            style={styles.handleContainer}
                            hitSlop={{ top: 20, bottom: 20, left: 40, right: 40 }}
                        >
                            <View style={styles.handle} />
                        </View>
                    </GestureDetector>

                    <View style={styles.content}>
                        <View style={styles.captionContainer}>
                            <TouchableOpacity
                                style={styles.cameraIconBtn}
                                onPress={() => router.push('/camera-capture')}
                            >
                                <Ionicons name="camera" size={28} color={Colors.primary} />
                            </TouchableOpacity>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[
                                        styles.captionInput,
                                        { fontSize: caption.length > 35 ? 12 : 14 },
                                    ]}
                                    placeholder="Caption..."
                                    placeholderTextColor="#666"
                                    value={caption}
                                    onChangeText={(text) => setCaption(text.slice(0, 50))}
                                    multiline
                                />
                            </View>
                            <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
                                <MaterialCommunityIcons
                                    name="playlist-plus"
                                    size={32}
                                    color={Colors.primary}
                                />
                            </TouchableOpacity>
                        </View>

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

                            <View style={styles.macroTotals}>
                                <View style={styles.macroItem}>
                                    <MaterialCommunityIcons name="fire" size={18} color={Colors.primary} />
                                    <Text style={styles.macroValue}>{totals.cals}</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <MaterialCommunityIcons name="food-drumstick" size={16} color="white" />
                                    <Text style={styles.macroValue}>{totals.macros.p}g</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <MaterialCommunityIcons name="barley" size={16} color="white" />
                                    <Text style={styles.macroValue}>{totals.macros.c}g</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <Ionicons name="water" size={16} color="white" />
                                    <Text style={styles.macroValue}>{totals.macros.f}g</Text>
                                </View>
                            </View>
                        </View>

                        {showTypePicker && (
                            <View style={styles.pickerContainer}>
                                {MEAL_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            setSelectedType(type);
                                            if (type !== 'Custom') setShowTypePicker(false);
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
                                        placeholder="Type here..."
                                        placeholderTextColor="#444"
                                        value={customType}
                                        onChangeText={setCustomType}
                                        onSubmitEditing={() => setShowTypePicker(false)}
                                        autoFocus
                                    />
                                )}
                            </View>
                        )}

                        <FlatList
                            ref={listRef}
                            data={items}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <SwipeableIngredient item={item} onRemove={onRemoveItem} />
                            )}
                            ListFooterComponent={() => localImage ? (
                                <View style={styles.capturedImageWrapper}>
                                    {localType === 'video' ? (
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
                                                    name={isMuted ? "volume-mute" : "volume-high"}
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
                                            setLocalType(null);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 60 }}
                        />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        backgroundColor: '#111',
        height: MAX_SHEET_HEIGHT,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 20,
    },
    handleContainer: {
        paddingVertical: 15, // Increased padding
        alignItems: 'center',
        width: '100%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#444',
        borderRadius: 2,
    },
    content: {
        flex: 1,
    },
    captionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    inputWrapper: {
        flex: 1,
        minHeight: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    captionInput: {
        color: 'white',
        paddingVertical: 8,
    },
    publishBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        paddingBottom: 16,
    },
    typeSelector: {
        flex: 1,
    },
    typeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    macroTotals: {
        flexDirection: 'row',
        gap: 12,
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    macroValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    swipeWrapper: {
        backgroundColor: Colors.error,
        borderRadius: 8,
        marginBottom: 8,
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
    ingredientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#111',
    },
    ingredientInfo: {
        flex: 1,
    },
    ingredientName: {
        color: 'white',
        fontSize: 15,
        fontStyle: 'italic',
    },
    ingredientAmount: {
        color: '#666',
        fontSize: 12,
    },
    ingredientMacros: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    miniMacro: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    miniMacroText: {
        color: 'white',
        fontSize: 12,
    },
    separator: {
        height: 1,
        backgroundColor: '#222',
    },
    pickerContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        gap: 8,
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
    cameraIconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    capturedImageWrapper: {
        marginTop: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
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
});

