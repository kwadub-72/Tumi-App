import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, InteractionManager, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/src/shared/services/supabase';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { MapComposerSheet } from '../../macromaps/components/MapComposerSheet';
import { useAuthStore } from '@/store/AuthStore';
import { BMRWarningModal } from '../components/BMRWarningModal';
import { useCreatedMapFormStore } from '../store/useCreatedMapFormStore';

export function CreateMapFromScratchScreen({ 
    onClose,
    setActiveFeedTab
}: { 
    onClose: () => void;
    setActiveFeedTab?: (tab: any) => void;
}) {
    const session = useAuthStore((state) => state.session);
    const userId = session?.user?.id;
    const router = useRouter();

    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
    const [isComposerVisible, setIsComposerVisible] = useState(false);
    const [caption, setCaption] = useState('');
    const [shareMapData, setShareMapData] = useState<any>(null);

    const handlePostMap = async () => {
        if (!userId || !shareMapData) return;
        try {
            await SupabasePostService.addMapPost(
                userId,
                shareMapData.macroMap.id,
                'map_publish',
                caption,
                shareMapData
            );
            setCaption('');
            router.push('/');
        } catch (err: any) {
            Alert.alert("Post Failed", err.message || "Could not publish your post.");
            throw err;
        }
    };

    // Connect custom map form store
    const {
        mapName,
        goalType,
        totalDurationWeeks,
        timeUnit,
        checkpoints,
        macroSumError,
        formValidationError,
        setMapName,
        setGoalType,
        setTotalDurationWeeks,
        setTimeUnit,
        addCheckpoint,
        removeCheckpoint,
        updateCheckpoint,
        validateMacroRatios,
        validateForm,
        validateTimeBasedCheckpoint,
        calculateTimeRemaining,
        resetForm
    } = useCreatedMapFormStore();

    // Safety and BMR states
    const [bmr, setBmr] = useState<number | null>(null);
    const [baselineCals, setBaselineCals] = useState<number>(2000);
    const [showWarningModal, setShowWarningModal] = useState(false);

    // Fetch baseline calories and BMR
    useEffect(() => {
        if (!userId) return;

        const loadBmrAndProfile = async () => {
            const { data: bmrVal } = await supabase.rpc('calculate_user_bmr', { p_user_id: userId });
            if (bmrVal) setBmr(Number(bmrVal));

            const { data: profile } = await supabase
                .from('profiles')
                .select('macro_targets')
                .eq('id', userId)
                .single();

            if (profile?.macro_targets?.calories) {
                setBaselineCals(Number(profile.macro_targets.calories));
            }
        };

        loadBmrAndProfile();
        
        return () => {
            resetForm();
        };
    }, [userId]);

    // Checks if any checkpoint's proposed target calories falls below BMR
    const checkBmrBreach = (): boolean => {
        if (!bmr) return false;
        return checkpoints.some((cp) => {
            const cDelta = parseFloat(cp.calorie_delta_val) || 0;
            const calDeltaVal = Math.round(baselineCals * (cDelta / 100));
            const deltaValue = cp.calorie_delta_sign === '+' ? calDeltaVal : -calDeltaVal;
            const proposedCals = baselineCals + deltaValue;
            return proposedCals < bmr;
        });
    };

    const handleCreateSubmit = () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', formValidationError || 'Please check your form details.');
            return;
        }

        if (macroSumError) {
            Alert.alert('Validation Error', macroSumError);
            return;
        }

        // Validate checkpoint time boundaries and macro ratios
        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];
            
            // 1. Time based validation interceptor
            if (cp.trigger_type === 'TIME_BASED') {
                const validation = validateTimeBasedCheckpoint(cp.time_elapsed_val);
                if (!validation.isValid) {
                    Alert.alert('Timing Error', `Checkpoint ${i + 1}: ${validation.error}`);
                    return;
                }
            }

            // 2. Macro ratio check
            const sum = Number(cp.protein_ratio) + Number(cp.carbs_ratio) + Number(cp.fats_ratio);
            if (sum !== 100) {
                Alert.alert(
                    'Ratio Error',
                    `Checkpoint ${i + 1} macro ratios must sum to exactly 100%. Currently they sum to ${sum}%.`
                );
                return;
            }
        }

        // BMR breach interception check
        const hasBreach = checkBmrBreach();
        if (hasBreach) {
            setShowWarningModal(true);
        } else {
            commitMapToDatabase();
        }
    };

    const commitMapToDatabase = async () => {
        if (!userId) return;

        try {
            // 1. Insert map
            const { data: mapData, error: mapError } = await supabase
                .from('macro_maps')
                .insert({
                    creator_id: userId,
                    name: mapName,
                    engine_type: 'ALGORITHMIC_CREATED',
                    goal_type: goalType,
                    total_duration_weeks: totalDurationWeeks,
                    is_published: true
                })
                .select()
                .single();

            if (mapError || !mapData) {
                Alert.alert('Database Error', mapError?.message || 'Failed to create macro map.');
                return;
            }

            // 2. Insert checkpoints
            const checkpointsToInsert = checkpoints.map((cp, idx) => {
                const wDelta = parseFloat(cp.weight_delta_val) || 0;
                const cDelta = parseFloat(cp.calorie_delta_val) || 0;
                const tElapsed = parseFloat(cp.time_elapsed_val) || 0;
                const pRatio = parseFloat(cp.protein_ratio) || 0;
                const cRatio = parseFloat(cp.carbs_ratio) || 0;
                const fRatio = parseFloat(cp.fats_ratio) || 0;

                const weightDelta = cp.weight_delta_sign === '+' ? (wDelta / 100) : -(wDelta / 100);
                const calorieDeltaPct = cp.calorie_delta_sign === '+' ? (cDelta / 100) : -(cDelta / 100);
                const timeDays = timeUnit === 'weeks' ? tElapsed * 7 : tElapsed;

                return {
                    map_id: mapData.id,
                    sequence_index: idx + 1,
                    trigger_type: cp.trigger_type,
                    intent_tag: cp.intent_tag,
                    trigger_weight_delta_pct: cp.trigger_type === 'WEIGHT_BASED' ? Number(weightDelta.toFixed(4)) : null,
                    trigger_days_elapsed: cp.trigger_type === 'TIME_BASED' ? Math.round(timeDays) : null,
                    protein_ratio: pRatio / 100,
                    carbs_ratio: cRatio / 100,
                    fats_ratio: fRatio / 100,
                    calorie_delta_pct: Number(calorieDeltaPct.toFixed(4)),
                    is_outlier_flare: false
                };
            });

            const { error: cpError } = await supabase
                .from('macro_map_checkpoints')
                .insert(checkpointsToInsert);

            if (cpError) {
                Alert.alert('Database Error', cpError.message || 'Failed to save checkpoints.');
                return;
            }

            // Compute relative timeline dates for the deep dive preview and format for sharing
            let checkpointsWithDates: any[] = [];
            try {
                // Fetch creator profile snapshot first
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, name, handle, avatar_url, status, activity, activity_icon')
                    .eq('id', userId)
                    .single();

                const now = new Date();
                let accumulatedDays = 0;
                checkpointsWithDates = checkpoints.map((cp, idx) => {
                    const tElapsed = parseFloat(cp.time_elapsed_val) || 0;
                    const timeDays = timeUnit === 'weeks' ? tElapsed * 7 : tElapsed;
                    accumulatedDays += timeDays;
                    const cpDate = new Date(now.getTime() + accumulatedDays * 24 * 60 * 60 * 1000);

                    return {
                        ...checkpointsToInsert[idx],
                        date: cpDate.toISOString(),
                        intent: goalType === 'CUT' ? 'weight-down' : goalType === 'BULK' ? 'weight-up' : 'maintain'
                    };
                });

                const mapPayload = {
                    macroMap: {
                        id: mapData.id,
                        name: mapData.name,
                        map_name: mapData.name,
                        goal_type: mapData.goal_type,
                        global_track: mapData.goal_type,
                        mapType: mapData.goal_type,
                        engine_type: 'ALGORITHMIC_CREATED',
                        generation_type: 'update',
                        is_live: false,
                        isLive: false,
                        total_duration_weeks: mapData.total_duration_weeks,
                        durationWeeks: mapData.total_duration_weeks,
                        creator_status_snapshot: mapData.creator_status_snapshot,
                        creator_activity_snapshot: mapData.creator_activity_snapshot,
                        creator_activity_icon_snapshot: mapData.creator_activity_icon_snapshot,
                        checkpoints: checkpointsWithDates,
                        profiles: profileData ? [profileData] : []
                    }
                };

                setShareMapData(mapPayload);
            } catch (postErr) {
                console.error('[CreateMapFromScratchScreen.commitMapToDatabase] Failed to build map payload:', postErr);
            }

            setIsSuccessModalVisible(true);
        } catch (err) {
            console.error('[CreateMapFromScratchScreen.commitMapToDatabase] Exception:', err);
        }
    };

    const isPublishDisabled = totalDurationWeeks < 1 || checkpoints.length === 0;

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={Colors.theme.softWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Map</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Section 1: Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Map Name</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Summer Shred Program"
                            placeholderTextColor={Colors.theme.dust}
                            value={mapName}
                            onChangeText={setMapName}
                        />
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Goal</Text>
                        <View style={styles.goalToggleContainer}>
                            {(['CUT', 'BULK', 'MAINTENANCE'] as const).map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.goalBtn, goalType === g && styles.goalBtnActive]}
                                    onPress={() => setGoalType(g)}
                                >
                                    <Text style={[styles.goalText, goalType === g && styles.goalTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Duration (Weeks)</Text>
                        <TextInput
                            style={styles.numberInput}
                            keyboardType="number-pad"
                            value={String(totalDurationWeeks)}
                            onChangeText={(v) => setTotalDurationWeeks(parseInt(v, 10) || 0)}
                        />
                    </View>
                </View>

                {/* Section 2: Checkpoint Configurator */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Map Checkpoints</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={addCheckpoint}>
                            <Ionicons name="add" size={20} color={Colors.theme.matteBlack} />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {macroSumError && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="warning-outline" size={18} color={Colors.theme.burntSienna} />
                            <Text style={styles.errorText}>{macroSumError}</Text>
                        </View>
                    )}

                    {checkpoints.map((cp, index) => {
                        const timeRemaining = calculateTimeRemaining(cp.time_elapsed_val);

                        return (
                            <View key={index} style={styles.checkpointCard}>
                                <View style={styles.checkpointHeader}>
                                    <Text style={styles.checkpointTitle}>Checkpoint #{index + 1}</Text>
                                    <TouchableOpacity onPress={() => removeCheckpoint(index)}>
                                        <Ionicons name="trash-outline" size={20} color={Colors.theme.burntSienna} />
                                    </TouchableOpacity>
                                </View>

                                {/* Trigger configuration */}
                                <View style={styles.fieldRow}>
                                    <Text style={styles.label}>Trigger Type</Text>
                                    <View style={styles.goalToggleContainer}>
                                        {(['WEIGHT_BASED', 'TIME_BASED'] as const).map((t) => (
                                            <TouchableOpacity
                                                key={t}
                                                style={[styles.goalBtn, cp.trigger_type === t && styles.goalBtnActive]}
                                                onPress={() => updateCheckpoint(index, { trigger_type: t })}
                                            >
                                                <Text style={[styles.goalText, cp.trigger_type === t && styles.goalTextActive]}>
                                                    {t === 'WEIGHT_BASED' ? 'Weight' : 'Time'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {cp.trigger_type === 'WEIGHT_BASED' ? (
                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Weight Delta (%)</Text>
                                        <View style={styles.inputWithToggle}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.signFlipBtn, 
                                                    cp.weight_delta_sign === '+' ? styles.signFlipBtnPlus : styles.signFlipBtnMinus
                                                ]}
                                                onPress={() => updateCheckpoint(index, { weight_delta_sign: cp.weight_delta_sign === '+' ? '-' : '+' })}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.signFlipText}>{cp.weight_delta_sign}</Text>
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.numberInputWithSign}
                                                keyboardType="decimal-pad"
                                                value={String(cp.weight_delta_val)}
                                                onChangeText={(v) => updateCheckpoint(index, { weight_delta_val: v })}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Time elapsed</Text>
                                        <View style={styles.timeInputsRow}>
                                            <TextInput
                                                style={styles.timeNumberInput}
                                                keyboardType="number-pad"
                                                value={String(cp.time_elapsed_val)}
                                                onChangeText={(v) => updateCheckpoint(index, { time_elapsed_val: v })}
                                            />
                                            
                                            <View style={styles.inlineUnitSelector}>
                                                {(['days', 'weeks'] as const).map((unit) => (
                                                    <TouchableOpacity
                                                        key={unit}
                                                        style={[
                                                            styles.inlineUnitBtn, 
                                                            timeUnit === unit && styles.inlineUnitBtnActive
                                                        ]}
                                                        onPress={() => setTimeUnit(unit)}
                                                    >
                                                        <Text style={[
                                                            styles.inlineUnitText,
                                                            timeUnit === unit && styles.inlineUnitTextActive
                                                        ]}>
                                                            {unit}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            
                                            <View style={styles.readOnlyContainer}>
                                                <Text style={styles.readOnlyLabel}>Time remaining</Text>
                                                <Text style={styles.readOnlyValue}>{timeRemaining}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Ratios */}
                                <View style={styles.fieldRow}>
                                    <Text style={styles.label}>Macros Distribution (%)</Text>
                                    <View style={styles.ratioInputsContainer}>
                                        <View style={styles.ratioCol}>
                                            <Text style={styles.ratioLabel}>P</Text>
                                            <TextInput
                                                style={styles.ratioInput}
                                                keyboardType="decimal-pad"
                                                value={String(cp.protein_ratio)}
                                                onChangeText={(v) => updateCheckpoint(index, { protein_ratio: v })}
                                                onBlur={validateMacroRatios}
                                            />
                                        </View>
                                        <View style={styles.ratioCol}>
                                            <Text style={styles.ratioLabel}>C</Text>
                                            <TextInput
                                                style={styles.ratioInput}
                                                keyboardType="decimal-pad"
                                                value={String(cp.carbs_ratio)}
                                                onChangeText={(v) => updateCheckpoint(index, { carbs_ratio: v })}
                                                onBlur={validateMacroRatios}
                                            />
                                        </View>
                                        <View style={styles.ratioCol}>
                                            <Text style={styles.ratioLabel}>F</Text>
                                            <TextInput
                                                style={styles.ratioInput}
                                                keyboardType="decimal-pad"
                                                value={String(cp.fats_ratio)}
                                                onChangeText={(v) => updateCheckpoint(index, { fats_ratio: v })}
                                                onBlur={validateMacroRatios}
                                            />
                                        </View>
                                    </View>
                                    
                                    {/* Macro sum error binding */}
                                    {macroSumError && macroSumError.includes(`Checkpoint ${index + 1}`) && (
                                        <Text style={styles.macroSumErrorText}>
                                            {macroSumError}
                                        </Text>
                                    )}
                                </View>

                                {/* Calories Delta */}
                                <View style={styles.fieldRow}>
                                    <Text style={styles.label}>Calorie increase/reduction (%)</Text>
                                    <View style={styles.inputWithToggle}>
                                        <TouchableOpacity
                                            style={[
                                                styles.signFlipBtn, 
                                                cp.calorie_delta_sign === '+' ? styles.signFlipBtnPlus : styles.signFlipBtnMinus
                                            ]}
                                            onPress={() => updateCheckpoint(index, { calorie_delta_sign: cp.calorie_delta_sign === '+' ? '-' : '+' })}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.signFlipText}>{cp.calorie_delta_sign}</Text>
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.numberInputWithSign}
                                            keyboardType="decimal-pad"
                                            value={String(cp.calorie_delta_val)}
                                            onChangeText={(v) => updateCheckpoint(index, { calorie_delta_val: v })}
                                        />
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Submit button */}
                <TouchableOpacity 
                    style={[styles.actionBtn, isPublishDisabled && styles.actionBtnDisabled]} 
                    onPress={handleCreateSubmit}
                    disabled={isPublishDisabled}
                >
                    <LinearGradient
                        colors={isPublishDisabled ? ['#444444', '#333333'] : ['#DAA520', '#B8860B']}
                        style={styles.actionGradient}
                    >
                        <Text style={[styles.actionText, isPublishDisabled && styles.actionTextDisabled]}>Publish Map</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            {/* BMR Warning Interceptor Modal */}
            <BMRWarningModal
                visible={showWarningModal}
                tribeName={mapName || 'My New Scratch Map'}
                tribeAvatar={require('@/assets/images/react-logo.png')}
                onProceed={() => {
                    setShowWarningModal(false);
                    commitMapToDatabase();
                }}
                onCancel={() => setShowWarningModal(false)}
            />

            {/* Share Prompt Modal */}
            <Modal
                transparent
                visible={isSuccessModalVisible}
                animationType="fade"
                onRequestClose={() => setIsSuccessModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Map Published</Text>
                        <Text style={styles.modalBody}>Share this map to your feeds?</Text>
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={async () => {
                                    setIsSuccessModalVisible(false);
                                    if (userId && shareMapData?.macroMap?.id) {
                                        try {
                                            await SupabasePostService.addMapPost(
                                                userId,
                                                shareMapData.macroMap.id,
                                                'map_silent',
                                                '',
                                                shareMapData
                                            );
                                        } catch (e) {
                                            console.error('[CreateMapFromScratchScreen] Silent post failed:', e);
                                        }
                                    }
                                    if (setActiveFeedTab) {
                                        setActiveFeedTab('Maps');
                                    }
                                    onClose();
                                    InteractionManager.runAfterInteractions(() => {
                                        resetForm();
                                        router.push('/(tabs)/profile');
                                    });
                                }}
                            >
                                <Text style={styles.modalCancelBtnText}>Not right now</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={() => {
                                    setIsSuccessModalVisible(false);
                                    setIsComposerVisible(true);
                                }}
                            >
                                <Text style={styles.modalConfirmBtnText}>Yes, share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Map Share Composer Sheet */}
            <MapComposerSheet
                visible={isComposerVisible}
                onClose={() => {
                    setIsComposerVisible(false);
                    if (setActiveFeedTab) {
                        setActiveFeedTab('Maps');
                    }
                    onClose();
                    InteractionManager.runAfterInteractions(() => {
                        resetForm();
                    });
                }}
                mapData={shareMapData?.macroMap}
                postType="map_publish"
                caption={caption}
                setCaption={setCaption}
                onSubmit={handlePostMap}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Colors.theme.charcoal,
    },
    closeBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    placeholder: {
        width: 36,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.harvestGold,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.theme.matteBlack,
    },
    fieldRow: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginBottom: 8,
    },
    timeLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timeRemainingLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    textInput: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.theme.softWhite,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    numberInput: {
        width: 120,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.theme.softWhite,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        textAlign: 'center',
    },
    goalToggleContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    goalBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalBtnActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    goalText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },
    goalTextActive: {
        color: Colors.theme.matteBlack,
    },
    checkpointCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    checkpointHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 8,
    },
    checkpointTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    ratioInputsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    ratioCol: {
        flex: 1,
        alignItems: 'center',
    },
    ratioLabel: {
        color: Colors.theme.dust,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    ratioInput: {
        width: '100%',
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 8,
        paddingVertical: 8,
        textAlign: 'center',
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
    },
    inputWithToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    numberInputWithSign: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.theme.softWhite,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    signFlipBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.theme.matteBlack,
        borderWidth: 1,
    },
    signFlipBtnPlus: {
        borderColor: '#AEDD63',
    },
    signFlipBtnMinus: {
        borderColor: Colors.theme.burntSienna,
    },
    signFlipText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    macroSumErrorText: {
        color: Colors.theme.burntSienna,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 8,
    },
    timeInputsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeNumberInput: {
        width: 70,
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 12,
        color: Colors.theme.softWhite,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        textAlign: 'center',
    },
    inlineUnitSelector: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 8,
        padding: 3,
        gap: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    inlineUnitBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
    },
    inlineUnitBtnActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    inlineUnitText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },
    inlineUnitTextActive: {
        color: Colors.theme.matteBlack,
    },
    readOnlyContainer: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    readOnlyLabel: {
        fontSize: 10,
        color: Colors.theme.dust,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    readOnlyValue: {
        fontSize: 13,
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    actionBtn: {
        marginTop: 12,
        marginBottom: 40,
        shadowColor: Colors.theme.harvestGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    actionGradient: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    actionText: {
        color: Colors.theme.matteBlack,
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionBtnDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    actionTextDisabled: {
        color: Colors.theme.dust,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(235, 87, 87, 0.3)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        color: Colors.theme.burntSienna,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
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
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalBody: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalCancelBtnText: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '600',
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: Colors.theme.harvestGold,
    },
    modalConfirmBtnText: {
        color: Colors.theme.matteBlack,
        fontSize: 14,
        fontWeight: 'bold',
    },
});
