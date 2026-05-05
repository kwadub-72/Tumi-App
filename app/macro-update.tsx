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
    ScrollView,
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
import { useMacrobookStore } from '@/src/store/useMacrobookStore';
import { Video, ResizeMode } from 'expo-av';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_MIN_Y = SCREEN_HEIGHT - 160;
const SHEET_MAX_Y = SCREEN_HEIGHT * 0.45;

type ScreenMode = 'macro-update' | 'snapshot' | 'macro-book';

export default function MacroUpdateScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { profile } = useAuthStore();
    const userInfo = useUserStore();
    const macrobook = useMacrobookStore();

    const [mode, setMode] = useState<ScreenMode>('snapshot');

    // Macro Update State
    const targets = profile?.macro_targets || userInfo.macroTargets;
    const oldP = targets.p;
    const oldC = targets.c;
    const oldF = targets.f;
    const oldCal = targets.calories;

    const [pText, setPText] = useState(oldP.toString());
    const [cText, setCText] = useState(oldC.toString());
    const [fText, setFText] = useState(oldF.toString());
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);

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
        if (!profile?.id) return;

        let payload = {};
        let postType: 'macro_update' | 'snapshot' = 'macro_update';

        if (mode === 'macro-update') {
            postType = 'macro_update';
            payload = {
                macroUpdate: {
                    id: 'mu_' + Date.now(),
                    caption: caption || 'Macro Update',
                    timestamp: Date.now(),
                    oldDate: profile.last_macro_update,
                    oldTargets: { calories: oldCal, p: oldP, c: oldC, f: oldF },
                    newTargets: { calories: newCal, p: newP, c: newC, f: newF },
                    trainingTarget: profile.training_target
                }
            };
            // Update local and remote profile
            userInfo.setProfile({
                macroTargets: { p: newP, c: newC, f: newF, calories: newCal },
                lastMacroUpdate: new Date().toLocaleDateString()
            });
            await useAuthStore.getState().updateProfile({
                macro_targets: { p: newP, c: newC, f: newF, calories: newCal },
                last_macro_update: new Date().toISOString()
            });
        } else {
            postType = 'snapshot';
            payload = {
                snapshot: {
                    id: 'sn_' + Date.now(),
                    timestamp: Date.now(),
                    caption: caption || "I'm so cooked for the day",
                    targets: { ...targets },
                    consumed: { ...dailyConsumed }
                }
            };
        }

        const success = await SupabasePostService.addPost({
            authorId: profile.id,
            postType: postType,
            payload: payload,
            caption: caption,
            mediaUrl: media?.uri,
            mediaType: media?.type,
        });

        if (success) {
            router.replace('/(tabs)?tab=Following');
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

    const MacroUpdateRow = ({ icon, oldVal, value, onChange, diff }: any) => {
        const isNegative = diff < 0;
        const diffText = diff === 0 ? '0g' : `${diff > 0 ? '+' : '—'} ${Math.abs(diff)}g`;
        const diffBg = diff === 0 ? 'rgba(164, 182, 157, 0.5)' : (isNegative ? '#825858' : '#A4B69D');

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

    const MacroProgressBar = ({ icon, target, consumed }: any) => {
        const remaining = target - consumed;
        const isOver = remaining < 0;
        const total = Math.max(target, consumed);
        const loggedWidth = (Math.min(consumed, target) / total) * 100;
        const remainingWidth = Math.max(0, (target - consumed) / total) * 100;
        const overWidth = Math.max(0, (consumed - target) / total) * 100;

        return (
            <View style={styles.progressRow}>
                <MaterialCommunityIcons name={icon} size={32} color={Colors.theme.sageDark} style={styles.progressIcon} />
                <View style={styles.progressTrackWrapper}>
                    <View style={styles.progressTrack}>
                        {/* Logged Portion */}
                        <View style={[styles.segment, { width: `${loggedWidth}%`, backgroundColor: Colors.theme.sage }]}>
                            {loggedWidth > 15 && (
                                <Text style={styles.segmentText}>{consumed}{icon === 'fire' ? '' : 'g'}</Text>
                            )}
                        </View>
                        {/* Remaining Portion */}
                        {remainingWidth > 0 && (
                            <View style={[styles.segment, { width: `${remainingWidth}%`, backgroundColor: '#8E8E8E' }]}>
                                {remainingWidth > 15 && (
                                    <Text style={styles.segmentText}>{remaining}{icon === 'fire' ? '' : 'g'}</Text>
                                )}
                            </View>
                        )}
                        {/* Over Portion */}
                        {overWidth > 0 && (
                            <View style={[styles.segment, { width: `${overWidth}%`, backgroundColor: '#825858' }]}>
                                {overWidth > 15 && (
                                    <Text style={styles.segmentText}>{consumed - target}{icon === 'fire' ? '' : 'g'}</Text>
                                )}
                            </View>
                        )}
                    </View>
                    {isOver && (
                        <Text style={styles.deltaLabel}>
                            {remaining}{icon === 'fire' ? ' cals' : 'g'}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
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
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'macro-book' && styles.modeBtnActive]}
                            onPress={() => setMode('macro-book')}
                        >
                            <Text style={[styles.modeText, mode === 'macro-book' && styles.modeTextActive]}>Macro book</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.sageDark} />
                </TouchableOpacity>

                {mode === 'macro-update' && (
                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Macro update</Text>
                        <View style={styles.calSection}>
                            <MaterialCommunityIcons name="fire" size={36} color={Colors.primary} style={styles.mainFireIcon} />
                            <View style={styles.calBubbleMain}>
                                <Text style={styles.calValueMain}>{newCal} cals</Text>
                            </View>
                            <View style={[styles.calDiffBubble, { backgroundColor: diffCal < 0 ? '#825858' : '#A4B69D' }]}>
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
                    </ScrollView>
                )}

                {mode === 'snapshot' && (
                    <View style={styles.scrollContent}>
                        <View style={styles.titleDivider} />
                        <Text style={styles.titleSmall}>Snapshot</Text>
                        <View style={styles.titleDivider} />
                        
                        <View style={styles.snapshotContainer}>
                            <MacroProgressBar icon="fire" target={targets.calories} consumed={dailyConsumed.calories} />
                            <MacroProgressBar icon="food-drumstick" target={targets.p} consumed={dailyConsumed.p} />
                            <MacroProgressBar icon="barley" target={targets.c} consumed={dailyConsumed.c} />
                            <MacroProgressBar icon="water" target={targets.f} consumed={dailyConsumed.f} />
                            
                            <View style={styles.legendRow}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: Colors.theme.sage }]} />
                                    <Text style={styles.legendText}>Logged</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#8E8E8E' }]} />
                                    <Text style={styles.legendText}>Remaining</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {mode === 'macro-book' && (
                    <ScrollView style={styles.scrollContent}>
                        <Text style={styles.title}>Macro book</Text>
                        {macrobook.entries.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="book-open-variant" size={60} color={Colors.theme.sageDark + '44'} />
                                <Text style={styles.emptyText}>No saved macros yet.</Text>
                            </View>
                        ) : (
                            macrobook.entries.map((entry) => (
                                <TouchableOpacity 
                                    key={entry.id} 
                                    style={styles.macroBookEntry}
                                    onPress={() => {
                                        setPText(entry.p.toString());
                                        setCText(entry.c.toString());
                                        setFText(entry.f.toString());
                                        setMode('macro-update');
                                    }}
                                >
                                    <Text style={styles.entryLabel}>{entry.label}</Text>
                                    <View style={styles.entryValues}>
                                        <Text style={styles.entryValue}>{entry.calories} cal</Text>
                                        <Text style={styles.entryValue}>{entry.p}P</Text>
                                        <Text style={styles.entryValue}>{entry.c}C</Text>
                                        <Text style={styles.entryValue}>{entry.f}F</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}

                <Animated.View style={[styles.loggerSheet, animatedStyle]}>
                    <GestureDetector gesture={panGesture}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                    </GestureDetector>
                    <View style={styles.loggerTopRow}>
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/camera-capture')}>
                            <Ionicons name="camera" size={28} color={Colors.theme.sageDark} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.loggerInput}
                            placeholder="Caption..."
                            placeholderTextColor={Colors.theme.sageDark + '88'}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                        />
                        <TouchableOpacity style={styles.postSubmitBtn} onPress={handlePost}>
                            <MaterialCommunityIcons name="file-document-edit-outline" size={32} color={Colors.theme.sageDark} />
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
        alignItems: 'center',
        paddingTop: 10,
        zIndex: 10,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.beigeLight,
        borderRadius: 25,
        padding: 5,
        width: '90%',
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
    backBtnHeader: {
        position: 'absolute',
        top: 70,
        left: 20,
        zIndex: 20,
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 40,
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
    titleDivider: {
        height: 1,
        backgroundColor: Colors.theme.sageDark,
        opacity: 0.2,
        marginHorizontal: 40,
    },
    calSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
    },
    mainFireIcon: {
        marginRight: -5,
    },
    calBubbleMain: {
        backgroundColor: Colors.theme.sageDark,
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
        gap: 12,
        marginBottom: 20,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
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
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.sageDark,
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
        alignItems: 'center',
        gap: 15,
    },
    progressIcon: {
        width: 35,
        textAlign: 'center',
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
    macroBookEntry: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
        backgroundColor: Colors.theme.sageLight,
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
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 3,
    },
    loggerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cameraBtn: {
        width: 48,
        height: 48,
        backgroundColor: 'white',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loggerInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.theme.sageDark,
        fontSize: 16,
        maxHeight: 100,
    },
    postSubmitBtn: {
        width: 48,
        height: 48,
        backgroundColor: 'white',
        borderRadius: 24,
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
