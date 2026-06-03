import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/shared/theme/Colors';
import { SupabaseTribeService } from '@/src/shared/services/SupabaseTribeService';
import { useAuthStore } from '@/store/AuthStore';
import { useUserTribeStore } from '@/src/store/UserTribeStore';
import { Tribe, TribeType } from '@/src/shared/models/types';
import { supabase } from '@/src/shared/services/supabase';

export default function ChiefsChamberScreen() {
    const router = useRouter();
    const { tribeId } = useLocalSearchParams();
    const resolvedTribeId = (Array.isArray(tribeId) ? tribeId[0] : tribeId) || '';
    const insets = useSafeAreaInsets();

    const { session } = useAuthStore();
    const { refreshMyTribes, fetchTribe } = useUserTribeStore();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Tribe & Active Competition State
    const [tribe, setTribe] = useState<Tribe | null>(null);
    const [activeComp, setActiveComp] = useState<any | null>(null);

    // Form States
    const [selectedType, setSelectedType] = useState<TribeType>('accountability');
    const [selectedStyle, setSelectedStyle] = useState<'premier' | 'faceoff'>('premier');
    const [selectedMetric, setSelectedMetric] = useState<'habits' | 'weight_change'>('habits');
    const [totalWeeks, setTotalWeeks] = useState(4);
    
    const [showModeInfo, setShowModeInfo] = useState(false);
    const [showStyleInfo, setShowStyleInfo] = useState(false);
    const [showMetricInfo, setShowMetricInfo] = useState(false);

    // Point Modifiers (Tiered values based on calibration requirements)
    const [ptsTier1, setPtsTier1] = useState(20);
    const [ptsTier2, setPtsTier2] = useState(10);
    const [ptsTier3, setPtsTier3] = useState(5);
    const [ptsExerciseBonus, setPtsExerciseBonus] = useState(10);
    const [ptsPenaltyMiss, setPtsPenaltyMiss] = useState(15);
    const [ptsPenaltyNoLog, setPtsPenaltyNoLog] = useState(60);

    useEffect(() => {
        if (!resolvedTribeId) {
            // Keep silent loading state during transition animation parameter hydration
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const tribeData = await SupabaseTribeService.getTribe(resolvedTribeId);
                if (!tribeData) {
                    Alert.alert('Error', 'Failed to fetch tribe details.');
                    router.back();
                    return;
                }
                setTribe(tribeData);
                setSelectedType(tribeData.type);

                // Fetch active competition
                const compData = await SupabaseTribeService.getActiveCompetition(resolvedTribeId);
                if (compData) {
                    setActiveComp(compData);
                    setSelectedStyle(compData.style as 'premier' | 'faceoff');
                    setSelectedMetric(compData.metric);
                    setTotalWeeks(compData.total_weeks);
                    setPtsTier1(compData.pts_tier_1 ?? 20);
                    setPtsTier2(compData.pts_tier_2 ?? 10);
                    setPtsTier3(compData.pts_tier_3 ?? 5);
                    setPtsExerciseBonus(compData.pts_exercise_bonus ?? 10);
                    setPtsPenaltyMiss(Math.abs(compData.pts_penalty_miss ?? 15));
                    setPtsPenaltyNoLog(Math.abs(compData.pts_penalty_no_log ?? 60));
                }
            } catch (err) {
                console.error('[ChiefsChamber.loadData]', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [resolvedTribeId]);

    const handleEndCompetition = async () => {
        if (!activeComp) return;

        Alert.alert(
            'End Competition Early?',
            'This will permanently conclude the current active competition cycle. Streak data and final scoring will freeze immediately.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Cycle',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            const endPromise = supabase
                                .from('competitions')
                                .update({ status: 'completed' })
                                .eq('id', activeComp.id);

                            const timeoutPromise = new Promise<any>((_, reject) =>
                                setTimeout(() => reject(new Error('Transaction timed out ending competition.')), 15000)
                            );

                            const { error } = await Promise.race([endPromise, timeoutPromise]);

                            if (error) throw error;

                            Alert.alert('Success', 'The competition has been successfully concluded.');
                            setActiveComp(null);
                            
                            // Re-fetch tribe to keep layout accurate
                            const tribeData = await SupabaseTribeService.getTribe(resolvedTribeId);
                            if (tribeData) setTribe(tribeData);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to end competition.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveSettings = async () => {
        const userId = session?.user?.id;
        if (!userId || !tribe) return;

        setIsSubmitting(true);
        try {
            // Calculate comp_status based on selectedType and selectedStyle
            const compStatusVal = selectedType === 'accountability'
                ? 'accountability'
                : selectedStyle;

            // 1. Update overall tribe settings and comp_status directly
            const { data: updatedTribeRow, error: updateError } = await supabase
                .from('tribes')
                .update({
                    name: tribe.name,
                    privacy: tribe.privacy,
                    tribe_type: selectedType,
                    comp_status: compStatusVal,
                })
                .eq('id', resolvedTribeId)
                .select()
                .single();

            if (updateError) {
                throw new Error(updateError.message);
            }

            // 2. Handle competition generation and conclusion
            
            // If there's an existing competition, conclude it first to clear the slate
            // We must do this regardless of the new type so that accountability clears out the old season
            let closePromiseResolved = null;
            if (activeComp) {
                const closePromise = supabase
                    .from('competitions')
                    .update({ status: 'completed' })
                    .eq('id', activeComp.id);

                const closeTimeout = new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Transaction timed out concluding active season.')), 15000)
                );

                closePromiseResolved = await Promise.race([closePromise, closeTimeout]);
            }

            // Only launch a NEW competition if the user selected a competitive mode
            let createCompPromiseResolved = null;
            if (selectedType !== 'accountability') {
                const createCompPromise = SupabaseTribeService.createCompetition({
                    tribeId: resolvedTribeId,
                    style: selectedStyle,
                    metric: selectedMetric,
                    totalWeeks,
                    ptsTier1,
                    ptsTier2,
                    ptsTier3,
                    ptsExerciseBonus,
                    ptsPenaltyMiss: -Math.abs(ptsPenaltyMiss), // Enforce negative DB value
                    ptsPenaltyNoLog: -Math.abs(ptsPenaltyNoLog), // Enforce negative DB value
                });

                const createTimeout = new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('Database timed out generating matchups. Please check tribe roster and try again.')), 15000)
                );

                createCompPromiseResolved = await Promise.race([createCompPromise, createTimeout]);

                if (!createCompPromiseResolved) {
                    throw new Error('Failed to launch the new competitive season.');
                }
            }

            // 3. Direct State Injection (No Refetch) to prevent race condition
            if (updatedTribeRow) {
                const { myTribes, selectedTribe } = useUserTribeStore.getState();
                useUserTribeStore.setState({
                    selectedTribe: selectedTribe?.id === resolvedTribeId 
                        ? { ...selectedTribe, ...updatedTribeRow, type: updatedTribeRow.tribe_type } 
                        : selectedTribe,
                    myTribes: myTribes.map(t => t.id === resolvedTribeId 
                        ? { ...t, ...updatedTribeRow, type: updatedTribeRow.tribe_type } 
                        : t)
                });
            }

            Alert.alert('Chamber Updated', 'Tribe configuration and active season parameters saved successfully.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Configuration Error', err.message || 'An error occurred while saving.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const NumberInputPill = ({
        value,
        onChange,
        prefix = '+',
    }: {
        value: number;
        onChange: (num: number) => void;
        prefix?: string;
    }) => (
        <View style={styles.inputPill}>
            <Text style={styles.inputPrefix}>{prefix}</Text>
            <TextInput
                style={styles.pillTextInput}
                value={String(value)}
                keyboardType="number-pad"
                selectTextOnFocus={true}
                onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9]/g, '');
                    onChange(parseInt(cleanText || '0', 10));
                }}
            />
        </View>
    );

    if (!resolvedTribeId || loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.theme.harvestGold} />
                <Text style={styles.loadingText}>Entering Chief's Chamber...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.theme.harvestGold} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>CHIEF'S CHAMBER</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {tribe?.name?.toUpperCase() ?? 'TRIBE'}
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Active Competition Indicator Card */}
                        {activeComp && (
                            <View style={styles.activeSeasonCard}>
                                <View style={styles.seasonStatusHeader}>
                                    <MaterialCommunityIcons name="trophy-outline" size={20} color={Colors.theme.harvestGold} />
                                    <Text style={styles.seasonStatusTitle}>ACTIVE SEASON</Text>
                                </View>
                                <Text style={styles.seasonDetailText}>
                                    Mode: {tribe?.type === 'accountability' ? 'Accountability' : `${tribe?.type === 'head-to-head' ? 'Head-to-Head' : 'Tribe vs Tribe'} • ${activeComp.style === 'faceoff' ? 'Faceoff' : 'Premier'}`}
                                </Text>
                                <Text style={styles.seasonDetailText}>
                                    Metric: {activeComp.metric === 'habits' ? 'Daily Macro Tracking' : 'Weekly Weight Change'}
                                </Text>
                                <Text style={styles.seasonDetailText}>
                                    Duration: {activeComp.total_weeks} Weeks
                                </Text>

                                <TouchableOpacity
                                    style={styles.endSeasonBtn}
                                    onPress={handleEndCompetition}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="stop-circle-outline" size={16} color={Colors.theme.burntSienna} />
                                    <Text style={styles.endSeasonBtnText}>End Season Early</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Section 1: Tribe Type */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Tribe Type</Text>
                            <TouchableOpacity onPress={() => setShowModeInfo(!showModeInfo)} style={{ padding: 4 }}>
                                <MaterialCommunityIcons name="information-outline" size={20} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                        </View>
                        
                        {showModeInfo && (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Accountability:</Text> Default state. No scores, just tracking consistency.</Text>
                                <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Head-to-Head:</Text> Internal tribe 1v1 matchups.</Text>
                                <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Tribe vs Tribe:</Text> Compete globally against other tribes.</Text>
                            </View>
                        )}

                        <View style={styles.typeSelectorRow}>
                            {[
                                { id: 'accountability', label: 'Accountability', icon: 'shield-check-outline' },
                                { id: 'head-to-head', label: 'Head-to-Head', icon: 'account-switch-outline' },
                                { id: 'tribe-vs-tribe', label: 'Tribe vs Tribe', icon: 'account-group-outline' },
                            ].map((typeOption) => {
                                const isSel = selectedType === typeOption.id;
                                return (
                                    <TouchableOpacity
                                        key={typeOption.id}
                                        style={[styles.typeCard, isSel && styles.typeCardActive]}
                                        onPress={() => {
                                            if (typeOption.id === 'tribe-vs-tribe') {
                                                Alert.alert('Coming Soon', 'Tribe vs Tribe is currently in development. Check back soon!');
                                                return;
                                            }
                                            setSelectedType(typeOption.id as TribeType);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialCommunityIcons
                                            name={typeOption.icon as any}
                                            size={22}
                                            color={isSel ? Colors.theme.matteBlack : Colors.theme.harvestGold}
                                        />
                                        <Text style={[styles.typeCardText, isSel && styles.typeCardTextActive]}>
                                            {typeOption.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Section 2: Competitive Parameter Customizations (Only shown if H2H or Premier is selected) */}
                        {selectedType !== 'accountability' && (
                            <View style={styles.settingsGroup}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={[styles.sectionLabel, { marginBottom: 0, marginTop: 0 }]}>Competition Style</Text>
                                    <TouchableOpacity onPress={() => setShowStyleInfo(!showStyleInfo)} style={{ padding: 4 }}>
                                        <MaterialCommunityIcons name="information-outline" size={20} color={Colors.theme.harvestGold} />
                                    </TouchableOpacity>
                                </View>
                                
                                {showStyleInfo && (
                                    <View style={styles.infoCard}>
                                        <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Premier:</Text> A continuous ladder leaderboard. Highest total points wins.</Text>
                                        <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Faceoff:</Text> Weekly head-to-head 1v1 matchups. Standings are win/loss records.</Text>
                                    </View>
                                )}
                                
                                <View style={styles.segmentedContainer}>
                                    {[
                                        { id: 'premier', label: 'Premier', icon: 'crown-outline' },
                                        { id: 'faceoff', label: 'Faceoff', icon: 'sword-cross' },
                                    ].map((styleOption) => {
                                        const isSel = selectedStyle === styleOption.id;
                                        return (
                                            <TouchableOpacity
                                                key={styleOption.id}
                                                style={[styles.segmentButton, isSel && styles.segmentButtonActive]}
                                                onPress={() => {
                                                    if (styleOption.id === 'faceoff') {
                                                        Alert.alert('Coming Soon', 'Faceoff competition style is currently in development. Check back soon!');
                                                        return;
                                                    }
                                                    setSelectedStyle(styleOption.id as 'premier' | 'faceoff');
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialCommunityIcons
                                                    name={styleOption.icon as any}
                                                    size={14}
                                                    color={isSel ? Colors.theme.matteBlack : Colors.theme.dust}
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                                                    {styleOption.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 12 }}>
                                    <Text style={[styles.sectionLabel, { marginBottom: 0, marginTop: 0 }]}>Competition Metric & Timeframe</Text>
                                    <TouchableOpacity onPress={() => setShowMetricInfo(!showMetricInfo)} style={{ padding: 4 }}>
                                        <MaterialCommunityIcons name="information-outline" size={20} color={Colors.theme.harvestGold} />
                                    </TouchableOpacity>
                                </View>
                                
                                {showMetricInfo && (
                                    <View style={styles.infoCard}>
                                        <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Habits:</Text> Track daily macro adherence and activity. Points are awarded based on proximity to goals.</Text>
                                        <Text style={styles.infoCardText}><Text style={{fontWeight: 'bold', color: Colors.theme.harvestGold}}>Weight Change:</Text> Track weekly body mass deltas relative to a starting point.</Text>
                                    </View>
                                )}

                                {/* Metric Choice */}
                                <View style={styles.segmentedContainer}>
                                    {[
                                        { id: 'habits', label: 'Habits', icon: 'fire' },
                                        { id: 'weight_change', label: 'Weight Change', icon: 'scale-bathroom' },
                                    ].map((mOption) => {
                                        const isSel = selectedMetric === mOption.id;
                                        return (
                                            <TouchableOpacity
                                                key={mOption.id}
                                                style={[styles.segmentButton, isSel && styles.segmentButtonActive]}
                                                onPress={() => {
                                                    if (mOption.id === 'weight_change') {
                                                        Alert.alert('Coming Soon', 'Weight change competition style in development. Check back soon!');
                                                        return;
                                                    }
                                                    setSelectedMetric(mOption.id as any);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialCommunityIcons
                                                    name={mOption.icon as any}
                                                    size={14}
                                                    color={isSel ? Colors.theme.matteBlack : Colors.theme.dust}
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                                                    {mOption.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Duration Picker */}
                                <View style={styles.rowField}>
                                    <View style={styles.durationSelector}>
                                        {[2, 4, 8, 12].map((wOption) => {
                                            const isSel = totalWeeks === wOption;
                                            return (
                                                <TouchableOpacity
                                                    key={wOption}
                                                    style={[styles.durationPill, isSel && styles.durationPillActive]}
                                                    onPress={() => setTotalWeeks(wOption)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.durationText, isSel && styles.durationTextActive]}>
                                                        {wOption} W
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Scoring Modifiers */}
                                <Text style={styles.sectionLabel}>Daily Scoring & Penalty Settings</Text>

                                <View style={styles.scoringCard}>
                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Within ± 2.5g Target</Text>
                                        <NumberInputPill value={ptsTier1} onChange={setPtsTier1} />
                                    </View>

                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Within ± 10.0g Target</Text>
                                        <NumberInputPill value={ptsTier2} onChange={setPtsTier2} />
                                    </View>

                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Within ± 15.0g Target</Text>
                                        <NumberInputPill value={ptsTier3} onChange={setPtsTier3} />
                                    </View>

                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Daily Exercise Bonus</Text>
                                        <NumberInputPill value={ptsExerciseBonus} onChange={setPtsExerciseBonus} />
                                    </View>

                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Missed Target Penalty</Text>
                                        <NumberInputPill value={ptsPenaltyMiss} onChange={setPtsPenaltyMiss} prefix="-" />
                                    </View>

                                    <View style={styles.scoringRow}>
                                        <Text style={styles.scoringRowLabel}>Unlogged Day Penalty</Text>
                                        <NumberInputPill value={ptsPenaltyNoLog} onChange={setPtsPenaltyNoLog} prefix="-" />
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer Controls */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton, 
                            isSubmitting && { opacity: 0.6 },
                            selectedType !== 'accountability' && (tribe?.memberCount ?? 0) < 2 && { opacity: 0.5 }
                        ]}
                        onPress={() => {
                            if (selectedType !== 'accountability' && (tribe?.memberCount ?? 0) < 2) {
                                Alert.alert('Roster Too Small', 'You need at least 2 members to launch a competitive season.');
                                return;
                            }
                            handleSaveSettings();
                        }}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Colors.theme.matteBlack} />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>
                                    {activeComp ? 'Save Configuration' : 'Launch New Season'}
                                </Text>
                                <View style={styles.badgeCircle}>
                                    <MaterialCommunityIcons
                                        name="crown-outline"
                                        size={16}
                                        color={Colors.theme.harvestGold}
                                    />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.theme.matteBlack,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.theme.dust,
        fontSize: 16,
        marginTop: 12,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.theme.charcoal,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.theme.charcoal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 12,
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    headerSubtitle: {
        fontSize: 20,
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        marginTop: 2,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 120,
    },
    activeSeasonCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.3)',
        marginBottom: 24,
    },
    seasonStatusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    seasonStatusTitle: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
        marginLeft: 8,
    },
    seasonDetailText: {
        color: Colors.theme.dust,
        fontSize: 15,
        marginBottom: 6,
    },
    endSeasonBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.4)',
        backgroundColor: 'rgba(139, 69, 19, 0.08)',
        borderRadius: 16,
        paddingVertical: 10,
        marginTop: 14,
    },
    endSeasonBtnText: {
        color: Colors.theme.burntSienna,
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    inactiveSeasonCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    inactiveSeasonTitle: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 10,
    },
    inactiveSeasonSubtitle: {
        color: Colors.theme.dust,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    sectionLabel: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 6,
    },
    infoCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.2)',
    },
    infoCardText: {
        color: Colors.theme.softWhite,
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    typeSelectorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    typeCard: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.05)',
        gap: 8,
    },
    typeCardActive: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    typeCardText: {
        color: Colors.theme.dust,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    typeCardTextActive: {
        color: Colors.theme.matteBlack,
    },
    settingsGroup: {
        marginTop: 6,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    segmentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    segmentButtonActive: {
        backgroundColor: Colors.theme.harvestGold,
    },
    segmentText: {
        color: Colors.theme.dust,
        fontWeight: '600',
        fontSize: 13,
    },
    segmentTextActive: {
        color: Colors.theme.matteBlack,
    },
    rowField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    fieldLabel: {
        color: Colors.theme.softWhite,
        fontWeight: '600',
        fontSize: 15,
    },
    durationSelector: {
        flexDirection: 'row',
        gap: 6,
    },
    durationPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.1)',
    },
    durationPillActive: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    durationText: {
        color: Colors.theme.dust,
        fontWeight: 'bold',
        fontSize: 13,
    },
    durationTextActive: {
        color: Colors.theme.matteBlack,
    },
    scoringCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(237, 232, 213, 0.05)',
        gap: 12,
    },
    scoringRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    scoringRowLabel: {
        color: Colors.theme.dust,
        fontSize: 14,
        fontWeight: '500',
    },
    inputPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(218, 165, 32, 0.4)',
        width: 80,
        height: 36,
        justifyContent: 'center',
    },
    inputPrefix: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 2,
    },
    pillTextInput: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        minWidth: 30,
        padding: 0,
    },
    footer: {
        position: 'absolute',
        bottom: 34,
        left: 20,
        right: 20,
        backgroundColor: 'transparent',
    },
    submitButton: {
        backgroundColor: Colors.theme.harvestGold,
        borderRadius: 28,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    submitButtonText: {
        color: Colors.theme.matteBlack,
        fontWeight: 'bold',
        fontSize: 16,
    },
    badgeCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.theme.matteBlack,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
