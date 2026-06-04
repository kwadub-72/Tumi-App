import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Keyboard,
    Platform,
    Modal,
    Pressable,
    TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useRouter } from 'expo-router';

import { MacroMapPreviewCard } from './MacroMapPreviewCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

// ─── Main MapComposerSheet Component ──────────────────────────────────────────

interface MapComposerSheetProps {
    visible: boolean;
    onClose: () => void;
    mapData: any;
    postType?: 'map_publish' | 'map_subscribe';
    caption: string;
    setCaption: (text: string) => void;
    onSubmit: () => void;
}

export function MapComposerSheet({
    visible,
    onClose,
    mapData,
    postType = 'map_subscribe',
    caption,
    setCaption,
    onSubmit,
}: MapComposerSheetProps) {
    const router = useRouter();
    const translateY = useSharedValue(SHEET_HEIGHT);
    const context = useSharedValue({ y: 0 });
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle visible state animations
    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 300 });
        } else {
            translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
        }
    }, [visible]);

    // Handle keyboard positioning adjust on focus
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                translateY.value = withTiming(0, { duration: 200 });
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                translateY.value = withTiming(0, { duration: 200 });
            }
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Drag gesture controls to swipe sheet down to dismiss
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(
                -SHEET_HEIGHT,
                Math.min(SHEET_HEIGHT, event.translationY + context.value.y)
            );
        })
        .onEnd((event) => {
            if (translateY.value > SHEET_HEIGHT / 3 || event.velocityY > 500) {
                translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 }, () => {
                    runOnJS(onClose)();
                });
            } else {
                translateY.value = withSpring(0, { damping: 15 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(false);
        try {
            await onSubmit();
            setIsSuccessModalVisible(true);
        } catch (err) {
            console.error('[MapComposerSheet.handleSubmit]', err);
        }
    };

    if (!visible) return null;

    return (
        <>
            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={onClose}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <Pressable style={styles.overlay} onPress={onClose}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <Animated.View 
                                style={[styles.sheet, animatedStyle]}
                                onStartShouldSetResponder={() => true}
                                onTouchEnd={(e) => e.stopPropagation()}
                            >
                                {/* Drag Gesture Handle */}
                                <GestureDetector gesture={panGesture}>
                                    <View style={styles.dragHandleContainer}>
                                        <View style={styles.dragHandle} />
                                    </View>
                                </GestureDetector>

                                {/* Top input bar row */}
                                <View style={styles.topRow}>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Add a caption & share this map"
                                            placeholderTextColor="rgba(237, 232, 213, 0.4)"
                                            value={caption}
                                            onChangeText={setCaption}
                                            multiline
                                            maxLength={140}
                                        />
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.submitBtn} 
                                        onPress={handleSubmit}
                                    >
                                        <MaterialCommunityIcons 
                                            name="post-outline" 
                                            size={32} 
                                            color={Colors.theme.harvestGold} 
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Injected Map Preview Card */}
                                <View style={styles.previewContainer}>
                                    <MacroMapPreviewCard 
                                        map={mapData} 
                                        postType={postType} 
                                    />
                                </View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Pressable>
                </GestureHandlerRootView>
            </Modal>

            <Modal
                transparent
                visible={isSuccessModalVisible}
                animationType="fade"
                onRequestClose={() => {
                    setIsSuccessModalVisible(false);
                    onClose();
                    router.push('/');
                }}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContent}>
                        <Text style={styles.successModalTitle}>Posted</Text>
                        <Text style={styles.successModalBody}>Your new journey has been shared to your feed!</Text>
                        <TouchableOpacity 
                            style={styles.successModalBtn}
                            onPress={() => {
                                setIsSuccessModalVisible(false);
                                onClose();
                                router.push('/');
                            }}
                        >
                            <Text style={styles.successModalBtnText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: Colors.theme.charcoal,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    dragHandleContainer: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 48,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    textInput: {
        color: Colors.theme.softWhite,
        fontSize: 15,
        lineHeight: 20,
        minHeight: 28,
        textAlignVertical: 'top',
    },
    submitBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    previewContainer: {
        flex: 1,
        marginTop: 10,
    },
    // Preview Card Styles
    previewCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    previewUsername: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    goalBadge: {
        backgroundColor: 'rgba(218, 165, 32, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    goalBadgeText: {
        color: Colors.theme.harvestGold,
        fontSize: 10,
        fontWeight: 'bold',
    },
    engineBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    engineBadgeText: {
        color: Colors.theme.dust,
        fontSize: 10,
        fontWeight: '600',
    },
    durationBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    durationBadgeText: {
        color: Colors.theme.dust,
        fontSize: 10,
        fontWeight: '600',
    },
    previewStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 16,
    },
    previewStat: {
        alignItems: 'center',
        flex: 1,
    },
    previewStatLabel: {
        color: Colors.theme.dust,
        fontSize: 11,
        opacity: 0.7,
        marginBottom: 4,
    },
    previewStatValue: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    macroSplitRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        marginTop: 2,
    },
    miniSplitItem: {
        alignItems: 'center',
    },
    miniBubble: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    miniBubbleText: {
        color: Colors.theme.matteBlack,
        fontSize: 9,
        fontWeight: 'bold',
    },
    miniSplitText: {
        color: Colors.theme.softWhite,
        fontSize: 10,
        fontWeight: '600',
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalContent: {
        width: '80%',
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
    successModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 12,
        textAlign: 'center',
    },
    successModalBody: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    successModalBtn: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
    },
    successModalBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 14,
        fontWeight: 'bold',
    },
});
