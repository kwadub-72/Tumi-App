import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
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
    withTiming
} from 'react-native-reanimated';
import { Colors } from '../src/shared/theme/Colors';
import Toast from './ui/Toast';
import { supabase } from '../src/shared/services/supabase';
import { useAuthStore } from '../store/AuthStore';
import { useMarketplaceStore } from '../src/features/macromaps/store/useMarketplaceStore';
import { useProfileStore } from '../src/store/useProfileStore';
import * as Application from 'expo-application';
import { submitManualBugReport } from '../src/shared/services/BugReportService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReportingActionSheetProps {
    isVisible: boolean;
    onClose: () => void;
    targetType: 'profile' | 'post' | 'map' | 'app_bug';
    targetId: string;
    onSuccess?: (targetType: 'profile' | 'post' | 'map' | 'app_bug', targetId: string) => void;
}

interface CategoryOption {
    label: string;
    subCategories?: string[];
    isBug?: boolean;
}

const POST_CATEGORIES: CategoryOption[] = [
    {
        label: "Diet, Health, or Eating Disorders",
        subCategories: [
            "Encouraging extreme fasting or purging",
            "Promoting dangerous weight loss products",
            "Medical advice or health misinformation"
        ]
    },
    {
        label: "Nudity or Sexual Content",
        subCategories: [
            "Sexually explicit content or pornography",
            "Nudity or partial nudity",
            "Sexual exploitation or abuse"
        ]
    },
    {
        label: "Violence or Dangerous Organizations",
        subCategories: [
            "Threats of violence or physical harm",
            "Hate speech, hate groups, or discrimination",
            "Encouraging self-harm or suicide"
        ]
    },
    {
        label: "Harassment or Bullying",
        subCategories: [
            "Targeted abuse, threats, or cyberbullying",
            "Sharing private personal information (doxing)",
            "Hate speech or discriminatory behavior"
        ]
    },
    {
        label: "Spam or Scam",
        subCategories: [
            "Scams, phishing, or financial fraud",
            "Fake news or misleading information",
            "Unwanted promotions or commercial spam"
        ]
    },
    {
        label: "App Bug or Broken Feature",
        isBug: true
    }
];

const MAP_CATEGORIES: CategoryOption[] = [
    {
        label: "Unsafe or Extreme Dieting Goals",
        subCategories: [
            "Advocating extreme/unsafe weight loss (e.g., severe crash diets)",
            "Dangerous/unhealthy nutritional protocols (e.g., dropping fats to zero)",
            "Encouraging or promoting eating disorders"
        ]
    },
    {
        label: "Broken Math or Fake Fitness Data",
        subCategories: [
            "The calorie total doesn't match the macro splits (impossible math)",
            "The data is clearly fabricated, falsified, or misleading"
        ]
    },
    {
        label: "App Bug or Broken Feature",
        isBug: true,
        subCategories: [
            "The chart, graph, or map is frozen, blank, or won't load",
            "Nonsense/broken text, code errors, or corrupted timeline data",
            "Other (please describe)"
        ]
    }
];

const PROFILE_CATEGORIES: CategoryOption[] = [
    {
        label: "Suspected Fake Natural, Fake Account, Impersonation, or Age",
        subCategories: [
            "Pretending to be me",
            "Pretending to be someone I know",
            "Pretending to be a celebrity, well-known athlete, or official brand",
            "Pretending to be natural",
            "Fake profile",
            "Underage user"
        ]
    },
    {
        label: "Harassment, Hate Speech, or Spam Bot",
        subCategories: [
            "Consistently targeting an individual across multiple posts, leaving toxic comments, or using DMs to threaten or intimidate.",
            "Profile bio, picture, or overarching theme promotes hate, slurs, or dehumanization",
            "The profile is a bot or an automated script"
        ]
    },
    {
        label: "Dangerous Health, Eating Disorder, or Medical Advice",
        subCategories: [
            "Profile name, bio, or curated links advocate for extreme starvation, purging, orthorexia, or \"thinspiration\".",
            "Unqualified user masquerading as a medical professional",
            "User pushing dangerous physiological protocols."
        ]
    },
    {
        label: "App Bug or Broken Feature",
        isBug: true
    }
];

const BUG_ONLY_CATEGORIES: CategoryOption[] = [
    {
        label: "App Bug or Broken Feature",
        isBug: true
    }
];

export default function ReportingActionSheet({
    isVisible,
    onClose,
    targetType,
    targetId,
    onSuccess,
}: ReportingActionSheetProps) {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const [step, setStep] = useState<'main_categories' | 'sub_categories' | 'bug_description'>('main_categories');
    const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [bugDescription, setBugDescription] = useState('');
    const [toastVisible, setToastVisible] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setStep('main_categories');
            setSelectedHeader(null);
            setSelectedSubCategory(null);
            setBugDescription('');
            setToastVisible(false);

            translateY.value = withSpring(0, { damping: 20, stiffness: 150, mass: 0.5 });
            backdropOpacity.value = withTiming(1, { duration: 250 });
        } else {
            translateY.value = SCREEN_HEIGHT;
            backdropOpacity.value = 0;
        }
    }, [isVisible]);

    const handleClose = () => {
        backdropOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
            runOnJS(onClose)();
        });
    };

    const handleSubmit = async (headerCategory: string, subCategory: string | null, description?: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) {
            Alert.alert('Error', 'You must be logged in to report content.');
            return;
        }

        // Optimistic UI local-hiding callback
        if (onSuccess) {
            onSuccess(targetType, targetId);
        }

        // Slide the sheet down
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
        // Show Toast
        setToastVisible(true);

        // Optimistically hide from map stores
        if (targetType === 'map') {
            useMarketplaceStore.getState().hideReportedMap(targetId);
            useProfileStore.getState().hideReportedMap(targetId);
        }

        const categories = targetType === 'app_bug' ? BUG_ONLY_CATEGORIES : targetType === 'profile' ? PROFILE_CATEGORIES : targetType === 'map' ? MAP_CATEGORIES : POST_CATEGORIES;
        const currentCategory = categories.find(c => c.label === headerCategory);
        const isBug = currentCategory?.isBug || headerCategory === 'App Bug or Broken Feature';

        try {
            if (isBug) {
                const finalDescription = selectedSubCategory 
                    ? `[${selectedSubCategory}] ${description || ''}`
                    : (description || '');
                await submitManualBugReport({
                    message: finalDescription,
                    platform: Platform.OS,
                    version: Application.nativeApplicationVersion || '1.0.0',
                });
            } else {
                const { error } = await supabase
                    .from('reports')
                    .insert({
                        reporter_id: userId,
                        target_type: targetType,
                        target_id: targetId,
                        header_category: headerCategory,
                        sub_category: subCategory || '',
                    });
                if (error) throw error;
            }
        } catch (error: any) {
            console.error('[ReportingActionSheet] Failed to submit report:', error);
            Alert.alert('Error', error.message || 'Failed to submit report. Please try again.');
        }
    };

    const handleToastHide = () => {
        setToastVisible(false);
        // Fade out backdrop and call onClose
        backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onClose)();
        });
    };

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(0, event.translationY + context.value.y);
            backdropOpacity.value = 1 - (translateY.value / (SCREEN_HEIGHT * 0.75));
        })
        .onEnd((event) => {
            if (translateY.value > 150 || event.velocityY > 500) {
                runOnJS(handleClose)();
            } else {
                translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
                backdropOpacity.value = withTiming(1, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const handleBack = () => {
        if (step === 'bug_description') {
            const currentCategory = categories.find(c => c.label === selectedHeader);
            if (currentCategory?.subCategories && currentCategory.subCategories.length > 0) {
                setStep('sub_categories');
                return;
            }
        }
        setStep('main_categories');
        setSelectedHeader(null);
        setSelectedSubCategory(null);
    };

    const handleCategoryPress = (category: CategoryOption) => {
        setSelectedHeader(category.label);
        if (category.subCategories && category.subCategories.length > 0) {
            setStep('sub_categories');
        } else if (category.isBug) {
            setStep('bug_description');
        } else {
            setStep('sub_categories');
        }
    };

    const categories = targetType === 'app_bug' ? BUG_ONLY_CATEGORIES : targetType === 'profile' ? PROFILE_CATEGORIES : targetType === 'map' ? MAP_CATEGORIES : POST_CATEGORIES;

    const renderContent = () => {
        if (step === 'main_categories') {
            return (
                <View style={styles.menuContainer}>
                    {categories.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.categoryButton}
                            onPress={() => handleCategoryPress(item)}
                        >
                            <Text style={styles.categoryText}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (step === 'sub_categories') {
            const currentCategory = categories.find(c => c.label === selectedHeader);
            const subs = currentCategory?.subCategories || [];

            return (
                <View style={styles.menuContainer}>
                    <Text style={styles.instructionText}>
                        Select a sub-category that best describes the issue:
                    </Text>
                    {subs.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.categoryButton}
                            onPress={() => {
                                const currentCategory = categories.find(c => c.label === selectedHeader);
                                if (currentCategory?.isBug) {
                                    setSelectedSubCategory(item);
                                    setStep('bug_description');
                                } else {
                                    handleSubmit(selectedHeader || '', item);
                                }
                            }}
                        >
                            <Text style={styles.categoryText}>{item}</Text>
                            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (step === 'bug_description') {
            const isSubmitDisabled = bugDescription.trim().length === 0;

            return (
                <View style={styles.bugContainer}>
                    <Text style={styles.instructionText}>
                        Please describe the bug or broken feature:
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Describe the issue here..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={bugDescription}
                        onChangeText={setBugDescription}
                        maxLength={500}
                    />
                    <Text style={styles.charCounter}>
                        {bugDescription.length}/500
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitDisabled && styles.submitButtonDisabled
                        ]}
                        onPress={() => handleSubmit(selectedHeader || '', null, bugDescription)}
                        disabled={isSubmitDisabled}
                    >
                        <Text style={[
                            styles.submitButtonText,
                            isSubmitDisabled && styles.submitButtonTextDisabled
                        ]}>
                            Submit Report
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return null;
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
                    <Animated.View style={[styles.overlay, backdropStyle]} />
                </Pressable>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.sheetContainer}
                >
                    <Animated.View style={[styles.sheetContent, animatedStyle]}>
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.gestureArea}>
                                <View style={styles.dragIndicator} />
                                <View style={styles.headerRow}>
                                    {step !== 'main_categories' ? (
                                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.backButtonPlaceholder} />
                                    )}
                                    <Text style={styles.title} numberOfLines={1}>
                                        {step === 'main_categories' ? 'Report' : selectedHeader}
                                    </Text>
                                    <View style={styles.backButtonPlaceholder} />
                                </View>
                            </View>
                        </GestureDetector>

                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {renderContent()}
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
                <Toast
                    message="Thanks for keeping CHRIBE safe. We are reviewing this."
                    visible={toastVisible}
                    onHide={handleToastHide}
                    duration={2000}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        height: SCREEN_HEIGHT * 0.75,
        width: '100%',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: Colors.background, // Matte black
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 16,
    },
    gestureArea: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 10,
        alignItems: 'center',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: Colors.primary + '44', // Colors.primary + '44'
        borderRadius: 2,
        marginBottom: 8,
    },
    headerRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(218, 165, 32, 0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonPlaceholder: {
        width: 40,
    },
    title: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    menuContainer: {
        width: '100%',
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    categoryText: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        marginRight: 10,
    },
    instructionText: {
        color: Colors.textDim,
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 16,
        lineHeight: 20,
    },
    bugContainer: {
        width: '100%',
    },
    textInput: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 15,
        height: 140,
    },
    charCounter: {
        color: Colors.textDim,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 6,
        opacity: 0.6,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.1)',
        opacity: 0.5,
    },
    submitButtonText: {
        color: Colors.textDark,
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButtonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
});
