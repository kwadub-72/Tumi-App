import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ACTIVITIES } from '@/src/shared/constants/Activities';
import { Colors } from '@/src/shared/theme/Colors';
import RangeSlider from './RangeSlider';
import RolodexPicker from './RolodexPicker';
import HeightRolodex from './HeightRolodex';

const TRIBE_FOCUS_OPTIONS = [
    { name: 'Accountability', icon: 'calendar' },
    { name: 'Head-to-Head', icon: 'shield-outline' },
    { name: 'Tribe vs Tribe', icon: 'trophy-outline' }
];

const VISIBILITY_OPTIONS = [
    { name: 'Public', icon: 'earth' },
    { name: 'Private', icon: 'lock-outline' }
];

const STATUS_OPTIONS = [
    { name: 'Natural', icon: 'leaf', color: '#4ADE80' },
    { name: 'Enhanced', icon: 'lightning-bolt', color: '#FFD700' },
    { name: 'Undeclared', icon: 'help-circle-outline' }
];

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
    mode: 'Profiles' | 'Tribes' | 'Similar';
}

export default function FilterModal({ visible, onClose, onApply, mode }: FilterModalProps) {
    const isProfiles = mode === 'Profiles';
    const isTribes = mode === 'Tribes';
    const isSimilar = mode === 'Similar';

    const [status, setStatus] = useState('Undeclared');
    const [activity, setActivity] = useState('All');

    // Tribe Specific
    const [tribeFocus, setTribeFocus] = useState('All');
    const [visibility, setVisibility] = useState('All');
    const [showTribeFocusRolodex, setShowTribeFocusRolodex] = useState(false);
    const [showVisibilityRolodex, setShowVisibilityRolodex] = useState(false);
    const [showStatusRolodex, setShowStatusRolodex] = useState(false);

    // Height
    const [heightMode, setHeightMode] = useState<'Range3' | 'Range1'>('Range3');
    const [heightVal, setHeightVal] = useState("..");

    // Height Logic
    const [isMetric, setIsMetric] = useState(false);
    const [ft, setFt] = useState<number | null>(null);
    const [inch, setInch] = useState<number | null>(null);
    const [cmVal, setCmVal] = useState('');
    const [showHeightRolodex, setShowHeightRolodex] = useState(false);

    // Weight
    const [weightMode, setWeightMode] = useState<'Range15' | 'Range5'>('Range15');
    const [weightVal, setWeightVal] = useState('');

    // Body Fat
    const [bfMode, setBfMode] = useState<'Range3' | 'Range1'>('Range3');
    const [bfVal, setBfVal] = useState('');

    // Stats
    const [minMeals, setMinMeals] = useState('');
    const [minWorkouts, setMinWorkouts] = useState('');
    const [minUpdates, setMinUpdates] = useState('');

    const [isApplied, setIsApplied] = useState(false);
    const [showActivityRolodex, setShowActivityRolodex] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // Refs for input focus
    const weightRef = useRef<TextInput>(null);
    const bfRef = useRef<TextInput>(null);
    const mealsRef = useRef<TextInput>(null);
    const workoutsRef = useRef<TextInput>(null);
    const updatesRef = useRef<TextInput>(null);

    useEffect(() => {
        // Reset applied state on change
        setIsApplied(false);
    }, [status, activity, tribeFocus, visibility, heightMode, heightVal, weightMode, weightVal, bfMode, bfVal, minMeals, minWorkouts, minUpdates]);

    useEffect(() => {
        // Sync string representation on change
        if (isMetric) {
            setHeightVal(cmVal || '...');
        } else {
            const ftStr = ft === null ? '..' : ft.toString();
            const inStr = inch === null ? '..' : inch.toString();
            setHeightVal(`${ftStr}'${inStr}"`);
        }
    }, [ft, inch, cmVal, isMetric]);

    const handleApply = () => {
        onApply({
            status,
            activity: isTribes ? undefined : activity,
            tribeFocus: isTribes ? tribeFocus : undefined,
            visibility: isTribes ? visibility : undefined,
            height: isTribes ? undefined : { mode: heightMode, val: heightVal },
            weight: isTribes ? undefined : { mode: weightMode, val: weightVal },
            bodyFat: isTribes ? undefined : { mode: bfMode, val: bfVal },
            minMeals,
            minWorkouts,
            minUpdates
        });
        setIsApplied(true);
    };

    const handleReset = () => {
        setStatus('Undeclared');
        setActivity('All');
        setTribeFocus('All');
        setVisibility('All');
        setHeightMode('Range3');
        setHeightVal("..'..\""); // Default
        setFt(null);
        setInch(null);
        setCmVal('');
        setIsMetric(false);
        setWeightMode('Range15');
        setWeightVal('');
        setBfMode('Range3');
        setBfVal('');
        setMinMeals('');
        setMinWorkouts('');
        setMinUpdates('');
        setIsApplied(false);
        onApply(null); // Clear filters
    };

    const StatusPill = ({ label, value, icon, color }: any) => (
        <TouchableOpacity
            style={[styles.pill, status === value && styles.activePill]}
            onPress={() => setStatus(value)}
        >
            <Text style={[styles.pillText, status === value && styles.activePillText]}>{label}</Text>
            {icon && <MaterialCommunityIcons name={icon} size={16} color={color} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
    );

    // Determines if a section is disabled (e.g. for Similar tabs)
    const isSectionDisabled = (section: 'activity' | 'body') => {
        if (isSimilar) return true;
        return false;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={{ width: 60 }} />
                        <View style={styles.filterTitleRow}>
                            <Ionicons name="options" size={20} color="#F5F5DC" />
                            <Text style={styles.title}>Filter</Text>
                        </View>
                        <TouchableOpacity onPress={handleReset}>
                            <Text style={styles.resetText}>Reset filters</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} scrollEnabled={scrollEnabled}>
                        {/* Natural / Enhanced */}
                        <View style={[styles.inlineRow, isSectionDisabled('activity') && { opacity: 0.5 }]} pointerEvents={isSectionDisabled('activity') ? 'none' : 'auto'}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Natural/Enhanced</Text>
                            <TouchableOpacity
                                style={styles.activityPill}
                                onPress={() => setShowStatusRolodex(true)}
                            >
                                <Text style={styles.activityPillText}>{status}</Text>
                                {status === 'Undeclared' || status === 'All' ? (
                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#2F3A27" style={{ marginLeft: 4 }} />
                                ) : (
                                    <MaterialCommunityIcons 
                                        name={STATUS_OPTIONS.find(s => s.name === status)?.icon as any} 
                                        size={18} 
                                        color={STATUS_OPTIONS.find(s => s.name === status)?.color || "#2F3A27"} 
                                        style={{ marginLeft: 6 }} 
                                    />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Activity - Hide for Tribes */}
                        {!isTribes && (
                            <>
                                <View style={[styles.inlineRow, isSectionDisabled('activity') && { opacity: 0.5 }]} pointerEvents={isSectionDisabled('activity') ? 'none' : 'auto'}>
                                    <Text style={[styles.label, { marginBottom: 0 }]}>Activity</Text>
                                    <TouchableOpacity
                                        style={styles.activityPill}
                                        onPress={() => setShowActivityRolodex(true)}
                                    >
                                        <Text style={styles.activityPillText}>{activity}</Text>
                                        {activity === 'All' ? (
                                            <MaterialCommunityIcons name="chevron-down" size={20} color="#2F3A27" style={{ marginLeft: 4 }} />
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: 6 }}>
                                                <MaterialCommunityIcons name={ACTIVITIES.find(a => a.name === activity || a.displayName === activity)?.icon as any || "hammer"} size={16} color="#2F3A27" />
                                                {ACTIVITIES.find(a => a.name === activity || a.displayName === activity)?.modifier && (
                                                    <Text style={{ fontSize: 10, color: '#2F3A27', fontWeight: 'bold', lineHeight: 12 }}>{ACTIVITIES.find(a => a.name === activity || a.displayName === activity)?.modifier}</Text>
                                                )}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.divider} />
                            </>
                        )}

                        {/* Tribe Filters */}
                        {isTribes && (
                            <>
                                {/* Tribe Focus */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Tribe focus</Text>
                                    <TouchableOpacity
                                        style={[styles.pill, styles.activePill, { alignSelf: 'flex-start' }]}
                                        onPress={() => setShowTribeFocusRolodex(true)}
                                    >
                                        <Text style={styles.activePillText}>{tribeFocus}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color="#F5F5DC" style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.divider} />

                                {/* Visibility */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Visibility</Text>
                                    <TouchableOpacity
                                        style={[styles.pill, styles.activePill, { alignSelf: 'flex-start' }]}
                                        onPress={() => setShowVisibilityRolodex(true)}
                                    >
                                        <Text style={styles.activePillText}>{visibility}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color="#F5F5DC" style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.divider} />
                            </>
                        )}

                        {/* Physical Stats - Hide for Tribes */}
                        {!isTribes && (
                            <View style={{ opacity: isSectionDisabled('body') ? 0.5 : 1 }} pointerEvents={isSectionDisabled('body') ? 'none' : 'auto'}>
                                {/* Height */}
                                <View style={styles.row}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.label}>Height</Text>
                                        <TouchableOpacity onPress={() => setIsMetric(!isMetric)} style={{ paddingRight: 10 }}>
                                            <Text style={{ color: '#F5F5DC', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                                                {isMetric ? 'Switch to ft/in' : 'Switch to cm'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.controlsRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, heightMode === 'Range3' && styles.activeToggle]}
                                            onPress={() => setHeightMode('Range3')}
                                        >
                                            <Text style={[styles.toggleText, heightMode === 'Range3' && styles.activeToggleText]}>± 3 {isMetric ? 'cm' : 'in.'}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, heightMode === 'Range1' && styles.activeToggle]}
                                            onPress={() => setHeightMode('Range1')}
                                        >
                                            <Text style={[styles.toggleText, heightMode === 'Range1' && styles.activeToggleText]}>± 1 {isMetric ? 'cm' : 'in.'}</Text>
                                        </TouchableOpacity>

                                        {isMetric ? (
                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    style={styles.textInput}
                                                    value={cmVal}
                                                    onChangeText={setCmVal}
                                                    keyboardType="numeric"
                                                    placeholder="170"
                                                    placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                                />
                                                <Text style={styles.suffix}>cm</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.inputContainer}
                                                onPress={() => setShowHeightRolodex(true)}
                                            >
                                                <Text style={styles.inputValue}>{heightVal}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                {/* Weight */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Weight</Text>
                                    <View style={styles.controlsRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, weightMode === 'Range15' && styles.activeToggle]}
                                            onPress={() => setWeightMode('Range15')}
                                        >
                                            <Text style={[styles.toggleText, weightMode === 'Range15' && styles.activeToggleText]}>± 15 lbs</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, weightMode === 'Range5' && styles.activeToggle]}
                                            onPress={() => setWeightMode('Range5')}
                                        >
                                            <Text style={[styles.toggleText, weightMode === 'Range5' && styles.activeToggleText]}>± 5 lbs</Text>
                                        </TouchableOpacity>
                                        <Pressable 
                                            style={styles.inputContainer} 
                                            onPress={() => weightRef.current?.focus()}
                                        >
                                            <TextInput
                                                ref={weightRef}
                                                style={styles.textInput}
                                                placeholder="..."
                                                placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                                keyboardType="numeric"
                                                value={weightVal}
                                                onChangeText={setWeightVal}
                                            />
                                            <Text style={styles.suffix}>lbs</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                {/* Body Fat */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Body fat</Text>
                                    <View style={styles.controlsRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, bfMode === 'Range3' && styles.activeToggle]}
                                            onPress={() => setBfMode('Range3')}
                                        >
                                            <Text style={[styles.toggleText, bfMode === 'Range3' && styles.activeToggleText]}>± 3%</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, bfMode === 'Range1' && styles.activeToggle]}
                                            onPress={() => setBfMode('Range1')}
                                        >
                                            <Text style={[styles.toggleText, bfMode === 'Range1' && styles.activeToggleText]}>± 1%</Text>
                                        </TouchableOpacity>
                                        <Pressable 
                                            style={styles.inputContainer} 
                                            onPress={() => bfRef.current?.focus()}
                                        >
                                            <TextInput
                                                ref={bfRef}
                                                style={styles.textInput}
                                                placeholder="..."
                                                placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                                keyboardType="numeric"
                                                value={bfVal}
                                                onChangeText={setBfVal}
                                            />
                                            <Text style={styles.suffix}>%</Text>
                                        </Pressable>
                                    </View>
                                </View>
                                <View style={styles.divider} />
                            </View>
                        )}

                        {/* Meals */}
                        <View style={styles.inlineRow}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Meals</Text>
                            <View style={styles.rightAlign}>
                                <Pressable 
                                    style={[styles.inputContainer, styles.wideInput]}
                                    onPress={() => mealsRef.current?.focus()}
                                >
                                    <Text style={styles.prefix}>≥</Text>
                                    <TextInput
                                        ref={mealsRef}
                                        style={styles.textInputInline}
                                        placeholder="..."
                                        placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                        keyboardType="numeric"
                                        value={minMeals}
                                        onChangeText={setMinMeals}
                                    />
                                    <Text style={styles.suffix}>posts</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Workouts */}
                        <View style={styles.inlineRow}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Workouts</Text>
                            <View style={styles.rightAlign}>
                                <Pressable 
                                    style={[styles.inputContainer, styles.wideInput]}
                                    onPress={() => workoutsRef.current?.focus()}
                                >
                                    <Text style={styles.prefix}>≥</Text>
                                    <TextInput
                                        ref={workoutsRef}
                                        style={styles.textInputInline}
                                        placeholder="..."
                                        placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                        keyboardType="numeric"
                                        value={minWorkouts}
                                        onChangeText={setMinWorkouts}
                                    />
                                    <Text style={styles.suffix}>posts</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Macros */}
                        <View style={styles.inlineRow}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Macros</Text>
                            <View style={styles.rightAlign}>
                                <Pressable 
                                    style={[styles.inputContainer, styles.wideInput]}
                                    onPress={() => updatesRef.current?.focus()}
                                >
                                    <Text style={styles.prefix}>≥</Text>
                                    <TextInput
                                        ref={updatesRef}
                                        style={styles.textInputInline}
                                        placeholder="..."
                                        placeholderTextColor="rgba(47, 58, 39, 0.5)"
                                        keyboardType="numeric"
                                        value={minUpdates}
                                        onChangeText={setMinUpdates}
                                    />
                                    <Text style={styles.suffix}>posts</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.addButton, isApplied && styles.appliedButton]} onPress={handleApply}>
                            {isApplied ? (
                                <Ionicons name="checkmark" size={32} color="white" />
                            ) : (
                                <Ionicons name="add" size={32} color="#A8C0A8" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {showVisibilityRolodex && (
                <RolodexPicker
                    options={VISIBILITY_OPTIONS}
                    selected={visibility}
                    onSelect={setVisibility}
                />
            )}
            {showTribeFocusRolodex && (
                <RolodexPicker
                    options={TRIBE_FOCUS_OPTIONS}
                    selected={tribeFocus}
                    onSelect={setTribeFocus}
                />
            )}
            {(showActivityRolodex || showHeightRolodex || showVisibilityRolodex || showTribeFocusRolodex || showStatusRolodex) && (
                <View style={styles.rolodexContainer}>
                    <View style={styles.rolodexHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowActivityRolodex(false);
                            setShowHeightRolodex(false);
                            setShowVisibilityRolodex(false);
                            setShowTribeFocusRolodex(false);
                            setShowStatusRolodex(false);
                        }}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    {showActivityRolodex && (
                        <RolodexPicker
                            options={ACTIVITIES}
                            selected={activity}
                            onSelect={setActivity}
                        />
                    )}
                    {showStatusRolodex && (
                        <RolodexPicker
                            options={STATUS_OPTIONS}
                            selected={status}
                            onSelect={setStatus}
                        />
                    )}
                    {showHeightRolodex && (
                        <HeightRolodex
                            minFt={1}
                            maxFt={9}
                            selectedFt={ft || 5}
                            selectedIn={inch || 0}
                            onSelect={(f, i) => { setFt(f); setInch(i); }}
                        />
                    )}
                    {showVisibilityRolodex && (
                        <RolodexPicker
                            options={VISIBILITY_OPTIONS}
                            selected={visibility}
                            onSelect={setVisibility}
                        />
                    )}
                    {showTribeFocusRolodex && (
                        <RolodexPicker
                            options={TRIBE_FOCUS_OPTIONS}
                            selected={tribeFocus}
                            onSelect={setTribeFocus}
                        />
                    )}
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: '#A8C0A8', // Sage
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#8FA88F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#95AF95', // Slightly darker header
    },
    filterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F5DC',
    },
    resetText: {
        color: '#F5F5DC',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        flex: 1,
        padding: 15,
    },
    row: {
        marginBottom: 10,
    },
    inlineRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2F3A27',
        marginBottom: 8,
    },
    pillScroll: {
        paddingRight: 20,
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        backgroundColor: '#F5F5DC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2F3A27',
    },
    activePill: {
        backgroundColor: '#2F3A27',
    },
    pillText: {
        color: '#2F3A27',
        fontWeight: '600',
    },
    activePillText: {
        color: '#F5F5DC',
    },
    activityPill: {
        flexDirection: 'row',
        backgroundColor: '#F5F5DC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2F3A27',
    },
    activityPillText: {
        color: '#2F3A27',
        fontWeight: 'bold',
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#2F3A27',
        opacity: 0.2,
        marginVertical: 10,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        backgroundColor: '#F5F5DC',
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2F3A27',
    },
    activeToggle: {
        backgroundColor: '#2F3A27',
    },
    toggleText: {
        color: '#2F3A27',
        fontWeight: 'bold',
    },
    activeToggleText: {
        color: '#F5F5DC',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F5F5DC',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2F3A27',
        paddingHorizontal: 10,
        height: 38,
    },
    textInput: {
        flex: 1,
        textAlign: 'right',
        color: '#2F3A27',
        fontWeight: 'bold',
        fontSize: 16,
    },
    textInputInline: {
        textAlign: 'center',
        color: '#2F3A27',
        fontWeight: 'bold',
        fontSize: 16,
        minWidth: 20,
    },
    prefix: {
        color: '#2F3A27',
        marginRight: 4,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    suffix: {
        color: '#2F3A27',
        marginLeft: 4,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    inputValue: {
        color: '#2F3A27',
        fontWeight: 'bold',
    },
    rightAlign: {
        alignItems: 'flex-end',
    },
    wideInput: {
        width: 150,
        flex: undefined,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    addButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    appliedButton: {
        backgroundColor: '#2F3A27', // Dark Green
        borderWidth: 2,
        borderColor: 'white',
    },
    rolodexContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E251E',
        zIndex: 100,
        elevation: 100,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    rolodexHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#2F3A27',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    doneText: {
        color: '#F5F5DC',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
