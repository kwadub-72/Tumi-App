import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
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
import { PostStore } from '@/store/PostStore';
import { FeedPost } from '@/src/shared/models/types';
import { NutritionService } from '@/src/shared/services/NutritionService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MIN_Y = SCREEN_HEIGHT - 180;
const SHEET_MAX_Y = SCREEN_HEIGHT * 0.45;

type ScreenMode = 'macro-update' | 'snapshot';

export default function MacroUpdateScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userInfo = useUserStore();

    const [mode, setMode] = useState<ScreenMode>('macro-update');

    // Macro Update State
    const oldP = userInfo.macroTargets.p;
    const oldC = userInfo.macroTargets.c;
    const oldF = userInfo.macroTargets.f;
    const oldCal = userInfo.macroTargets.calories;

    const [pText, setPText] = useState(oldP.toString());
    const [cText, setCText] = useState(oldC.toString());
    const [fText, setFText] = useState(oldF.toString());
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);

    // Snapshot Info (Calculated from today's meals)
    const [dailyConsumed, setDailyConsumed] = useState({ calories: 0, p: 0, c: 0, f: 0 });

    useEffect(() => {
        const load = async () => {
            const posts = await PostStore.loadPosts();
            const myPosts = posts.filter(p => p.user.handle === userInfo.handle);
            const meals = myPosts.map(p => p.meal).filter(m => m !== undefined);
            const totals = NutritionService.sumMacros(meals as any);
            setDailyConsumed({
                calories: totals.cals,
                p: totals.macros.p,
                c: totals.macros.c,
                f: totals.macros.f
            });
        };
        load();
    }, []);

    // Reanimated values for sheet
    const translateY = useSharedValue(SHEET_MIN_Y);
    const context = useSharedValue({ y: 0 });

    useEffect(() => {
        if (params.capturedImage) {
            setMedia({
                uri: params.capturedImage as string,
                type: (params.mediaType as 'image' | 'video') || 'image'
            });
            translateY.value = withSpring(SHEET_MAX_Y);
        }
    }, [params.capturedImage, params.mediaType]);

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
        if (mode === 'macro-update') {
            const newPost: FeedPost = {
                id: Date.now().toString(),
                user: {
                    id: 'u1',
                    name: userInfo.name,
                    handle: userInfo.handle,
                    avatar: userInfo.avatar,
                    status: userInfo.status,
                    verified: true,
                },
                timeAgo: 'Just now',
                macroUpdate: {
                    id: 'mu_' + Date.now(),
                    caption: caption || 'Macro Update',
                    timestamp: Date.now(),
                    oldDate: userInfo.lastMacroUpdate,
                    oldTargets: { calories: oldCal, p: oldP, c: oldC, f: oldF },
                    newTargets: { calories: newCal, p: newP, c: newC, f: newF },
                    trainingTarget: userInfo.trainingTarget
                },
                mediaUrl: media?.uri,
                mediaType: media?.type,
                stats: { likes: 0, shares: 0, comments: 0, saves: 0 },
            };
            await PostStore.addPost(newPost);
            userInfo.setProfile({
                macroTargets: { p: newP, c: newC, f: newF, calories: newCal },
                lastMacroUpdate: new Date().toLocaleDateString()
            });
        } else {
            // Snapshot Post
            const newSnapshot: FeedPost = {
                id: Date.now().toString(),
                user: {
                    id: 'u1',
                    name: userInfo.name,
                    handle: userInfo.handle,
                    avatar: userInfo.avatar,
                    status: userInfo.status,
                    verified: true,
                },
                timeAgo: 'Just now',
                snapshot: {
                    id: 'sn_' + Date.now(),
                    timestamp: Date.now(),
                    caption: caption || "I'm so cooked for the day",
                    targets: { ...userInfo.macroTargets },
                    consumed: { ...dailyConsumed }
                },
                mediaUrl: media?.uri,
                mediaType: media?.type,
                stats: { likes: 0, shares: 0, comments: 0, saves: 0 },
            };
            await PostStore.addPost(newSnapshot);
        }
        router.back();
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

    const MacroUpdateRow = ({ icon, oldVal, value, onChange, diff }: any) => {
        const isNegative = diff < 0;
        const diffText = diff === 0 ? '0g' : `${diff > 0 ? '+' : '—'} ${Math.abs(diff)}g`;
        const diffBg = diff === 0 ? 'rgba(164, 182, 157, 0.5)' : (isNegative ? '#E59A9A' : '#A4B69D');

        return (
            <View style={styles.macroRow}>
                <View style={styles.oldValContainer}>
                    <Text style={styles.oldValText}>{oldVal}g</Text>
                </View>
                <MaterialCommunityIcons name={icon} size={28} color={Colors.primary} style={styles.macroIconSmall} />
                <View style={styles.inputBubble}>
                    <TextInput
                        style={styles.macroInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="number-pad"
                        placeholder="..."
                        placeholderTextColor="#aaa"
                    />
                    <Text style={styles.suffixText}>g</Text>
                </View>
                <View style={[styles.diffBubble, { backgroundColor: diffBg }]}>
                    <Text style={styles.diffText}>{diffText}</Text>
                </View>
            </View>
        );
    };

    const SnapshotBar = ({ icon, target, consumed, color }: any) => {
        const remaining = target - consumed;
        const isOver = remaining < 0;
        const total = Math.max(target, consumed);
        const fillWidth = (consumed / total) * 100;
        const remainingWidth = Math.max(0, (remaining / total) * 100);

        return (
            <View style={styles.snapshotRow}>
                <MaterialCommunityIcons name={icon} size={28} color={Colors.primary} style={styles.snapshotIcon} />
                <View style={styles.snapshotTrack}>
                    <View style={[styles.snapshotFill, { width: `${fillWidth}%`, backgroundColor: color || Colors.primary }]}>
                        <Text style={styles.snapshotValue}>{consumed}{icon === 'fire' ? ' cals' : 'g'}</Text>
                    </View>
                    <View style={styles.snapshotRemaining}>
                        <Text style={[styles.remainingValue, isOver && { color: '#E59A9A', fontWeight: 'bold' }]}>
                            {remaining}{icon === 'fire' ? ' cals' : 'g'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'macro-update' && styles.modeBtnActive]}
                            onPress={() => setMode('macro-update')}
                        >
                            <Text style={[styles.modeText, mode === 'macro-update' && styles.modeTextActive]}>Macro update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'snapshot' && styles.modeBtnActive]}
                            onPress={() => setMode('snapshot')}
                        >
                            <Text style={[styles.modeText, mode === 'snapshot' && styles.modeTextActive]}>Snapshot</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {mode === 'macro-update' ? (
                    <View style={styles.scrollContent}>
                        <Text style={styles.title}>Macro update</Text>

                        <View style={styles.calSection}>
                            <MaterialCommunityIcons name="fire" size={36} color={Colors.primary} style={styles.mainFireIcon} />
                            <View style={styles.calBubbleMain}>
                                <Text style={styles.calValueMain}>{newCal} cals</Text>
                            </View>
                            <View style={[styles.calDiffBubble, { backgroundColor: diffCal < 0 ? '#E59A9A' : '#A4B69D' }]}>
                                <Text style={styles.calDiffText}>
                                    {diffCal === 0 ? '0 cals' : `${diffCal > 0 ? '+' : '—'} ${Math.abs(diffCal)} cals`}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.macrosList}>
                            <MacroUpdateRow icon="food-drumstick" oldVal={oldP} value={pText} onChange={setPText} diff={diffP} />
                            <MacroUpdateRow icon="barley" oldVal={oldC} value={cText} onChange={setCText} diff={diffC} />
                            <MacroUpdateRow icon="water" oldVal={oldF} value={fText} onChange={setFText} diff={diffF} />
                        </View>

                        <View style={styles.newTargetsWrapper}>
                            <View style={styles.newTargetsLabelCol}>
                                <Text style={styles.newTargetsLabelPart}>New</Text>
                                <Text style={styles.newTargetsLabelPart}>targets</Text>
                            </View>
                            <View style={styles.newTargetsData}>
                                <View style={styles.targetIconGroup}>
                                    <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                                    <Text style={styles.targetVal}>{newCal}</Text>
                                    <Text style={styles.targetUnit}>cals</Text>
                                </View>
                                <View style={styles.targetIconGroup}>
                                    <MaterialCommunityIcons name="food-drumstick" size={24} color={Colors.primary} />
                                    <Text style={styles.targetVal}>{newP}</Text>
                                    <Text style={styles.targetUnit}>g</Text>
                                </View>
                                <View style={styles.targetIconGroup}>
                                    <MaterialCommunityIcons name="barley" size={24} color={Colors.primary} />
                                    <Text style={styles.targetVal}>{newC}</Text>
                                    <Text style={styles.targetUnit}>g</Text>
                                </View>
                                <View style={styles.targetIconGroup}>
                                    <MaterialCommunityIcons name="water" size={24} color={Colors.primary} />
                                    <Text style={styles.targetVal}>{newF}</Text>
                                    <Text style={styles.targetUnit}>g</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.scrollContent}>
                        <Text style={styles.title}>Snapshot</Text>
                        <View style={styles.snapshotPreview}>
                            <SnapshotBar icon="fire" target={userInfo.macroTargets.calories} consumed={dailyConsumed.calories} color={Colors.primary} />
                            <SnapshotBar icon="food-drumstick" target={userInfo.macroTargets.p} consumed={dailyConsumed.p} />
                            <SnapshotBar icon="barley" target={userInfo.macroTargets.c} consumed={dailyConsumed.c} />
                            <SnapshotBar icon="water" target={userInfo.macroTargets.f} consumed={dailyConsumed.f} />
                        </View>
                        <Text style={styles.snapshotHint}>This will share your current progress for today.</Text>
                    </View>
                )}

                <Animated.View style={[styles.loggerSheet, animatedStyle]}>
                    <GestureDetector gesture={panGesture}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                    </GestureDetector>
                    <View style={styles.loggerTopRow}>
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/camera-capture')}>
                            <Ionicons name="camera" size={28} color={Colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.loggerInput}
                            placeholder="Caption..."
                            placeholderTextColor={Colors.primary + '88'}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                        />
                        <TouchableOpacity style={styles.postSubmitBtn} onPress={handlePost}>
                            <MaterialCommunityIcons name="file-document-edit-outline" size={32} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {media && (
                        <View style={styles.mediaPreview}>
                            <Image source={{ uri: media.uri }} style={styles.mediaImg} />
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
        backgroundColor: '#E6E6D4',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    backBtn: {
        marginRight: 20,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(79, 99, 82, 0.1)',
        borderRadius: 20,
        padding: 4,
    },
    modeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    modeBtnActive: {
        backgroundColor: '#4F6352',
    },
    modeText: {
        fontSize: 14,
        color: '#4F6352',
        fontWeight: '600',
    },
    modeTextActive: {
        color: 'white',
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#4F6352',
        textAlign: 'center',
        marginVertical: 20,
    },
    calSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 30,
    },
    mainFireIcon: {
        marginRight: -5,
    },
    calBubbleMain: {
        backgroundColor: '#4F6352',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 140,
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
        gap: 15,
        marginBottom: 30,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    oldValContainer: {
        borderWidth: 1.5,
        borderColor: '#4F6352',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 65,
        alignItems: 'center',
    },
    oldValText: {
        color: '#4F6352',
        fontWeight: 'bold',
        fontSize: 14,
    },
    macroIconSmall: {
        marginHorizontal: 2,
    },
    inputBubble: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        minWidth: 100,
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
        color: '#4F6352',
        textAlign: 'right',
        minWidth: 40,
        padding: 0,
    },
    suffixText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4F6352',
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
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 15,
    },
    newTargetsLabelCol: {
        marginBottom: 5,
    },
    newTargetsLabelPart: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4F6352',
        lineHeight: 20,
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
        color: '#4F6352',
        marginTop: 2,
    },
    targetUnit: {
        fontSize: 10,
        color: '#4F6352',
        fontWeight: '600',
    },
    snapshotPreview: {
        gap: 15,
        marginTop: 10,
    },
    snapshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    snapshotIcon: {
        width: 30,
        textAlign: 'center',
    },
    snapshotTrack: {
        flex: 1,
        height: 44,
        backgroundColor: 'white',
        borderRadius: 22,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    snapshotFill: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    snapshotValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    snapshotRemaining: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    remainingValue: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    snapshotHint: {
        textAlign: 'center',
        color: '#4F6352',
        opacity: 0.6,
        marginTop: 20,
        fontStyle: 'italic',
    },
    loggerSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT, // Keep it full so it can reach top, but we will adjust its base position
        backgroundColor: 'rgba(164, 182, 157, 0.98)',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 82, 0.2)',
        paddingHorizontal: 20,
    },
    dragHandleContainer: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 2,
    },
    loggerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cameraBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'white',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loggerInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#4F6352',
        fontSize: 16,
    },
    postSubmitBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'white',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaPreview: {
        marginTop: 20,
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    mediaImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeMedia: {
        position: 'absolute',
        top: 10,
        right: 10,
    }
});
