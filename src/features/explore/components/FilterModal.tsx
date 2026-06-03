import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import HeightRolodex from './HeightRolodex';

const TRIBE_TYPE_OPTIONS = ['All', 'Accountability', 'Head-to-Head', 'Tribe vs Tribe'];
const PRIVACY_OPTIONS = ['All', 'Public', 'Private'];
const NATURAL_STATUS_OPTIONS = ['All', 'Natural', 'Enhanced', 'Undeclared'];

const FITNESS_ACTIVITIES = [
    { name: 'All', icon: 'layers-outline' },
    { name: 'Powerlifting', icon: 'weight-lifter' },
    { name: 'Bodybuilding', icon: 'arm-flex' },
    { name: 'CrossFit', icon: 'hammer' },
    { name: 'Running', icon: 'run' },
    { name: 'General Fitness', icon: 'heart-pulse' }
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

    // Hybrid states
    const [selectedTribeType, setSelectedTribeType] = useState<string | null>('All');
    const [selectedPrivacy, setSelectedPrivacy] = useState<string | null>('All');
    const [selectedNaturalStatus, setSelectedNaturalStatus] = useState<string | null>('Undeclared');
    const [selectedActivity, setSelectedActivity] = useState<string | null>('All');

    // Accordion active dropdown (Only Activity and Height use roladexes)
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Height
    const [heightMode, setHeightMode] = useState<'Range3' | 'Range1'>('Range3');
    const [heightVal, setHeightVal] = useState("..");

    // Height Logic
    const [isMetric, setIsMetric] = useState(false);
    const [ft, setFt] = useState<number | null>(null);
    const [inch, setInch] = useState<number | null>(null);
    const [cmVal, setCmVal] = useState('');

    // Weight
    const [weightMode, setWeightMode] = useState<'Range15' | 'Range5'>('Range15');
    const [weightVal, setWeightVal] = useState('');

    // Body Fat
    const [bfMode, setBfMode] = useState<'Range3' | 'Range1'>('Range3');
    const [bfVal, setBfVal] = useState('');

    const [isApplied, setIsApplied] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // Refs for input focus
    const weightRef = useRef<TextInput>(null);
    const bfRef = useRef<TextInput>(null);

    useEffect(() => {
        // Reset applied state on change
        setIsApplied(false);
    }, [selectedTribeType, selectedPrivacy, selectedNaturalStatus, selectedActivity, heightMode, heightVal, weightMode, weightVal, bfMode, bfVal]);

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
            status: selectedNaturalStatus || 'Undeclared',
            activity: selectedActivity || 'All',
            tribeFocus: isTribes ? (selectedTribeType || 'All') : undefined,
            visibility: isTribes ? (selectedPrivacy || 'All') : undefined,
            height: isTribes ? undefined : { mode: heightMode, val: heightVal },
            weight: isTribes ? undefined : { mode: weightMode, val: weightVal },
            bodyFat: isTribes ? undefined : { mode: bfMode, val: bfVal },
        });
        setIsApplied(true);
    };

    const handleReset = () => {
        setSelectedNaturalStatus('Undeclared');
        setSelectedActivity('All');
        setSelectedTribeType('All');
        setSelectedPrivacy('All');
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
        setIsApplied(false);
        setActiveDropdown(null);
        onApply(null); // Clear filters
    };

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
                            <Ionicons name="options" size={20} color={Colors.theme.softWhite} />
                            <Text style={styles.title}>Filter</Text>
                        </View>
                        <TouchableOpacity onPress={handleReset}>
                            <Text style={styles.resetText}>Reset filters</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} scrollEnabled={scrollEnabled}>
                        
                        {/* Tribe Filters */}
                        {isTribes ? (
                            <>
                                {/* Tribe Type button group */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Tribe Type</Text>
                                    <View style={styles.pillGroup}>
                                        {TRIBE_TYPE_OPTIONS.map(opt => {
                                            const isSelected = selectedTribeType === opt;
                                            return (
                                                <TouchableOpacity
                                                    key={opt}
                                                    style={[styles.buttonPill, isSelected && styles.activeButtonPill]}
                                                    onPress={() => setSelectedTribeType(opt)}
                                                >
                                                    <Text style={[styles.buttonPillText, isSelected && styles.activeButtonPillText]}>
                                                        {opt}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                <View style={styles.divider} />

                                {/* Privacy button group */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Privacy</Text>
                                    <View style={styles.pillGroup}>
                                        {PRIVACY_OPTIONS.map(opt => {
                                            const isSelected = selectedPrivacy === opt;
                                            return (
                                                <TouchableOpacity
                                                    key={opt}
                                                    style={[styles.buttonPill, isSelected && styles.activeButtonPill]}
                                                    onPress={() => setSelectedPrivacy(opt)}
                                                >
                                                    <Text style={[styles.buttonPillText, isSelected && styles.activeButtonPillText]}>
                                                        {opt}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                <View style={styles.divider} />
                            </>
                        ) : null}

                        {/* Natural Status button group */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Natural status</Text>
                            <View style={styles.pillGroup}>
                                {NATURAL_STATUS_OPTIONS.map(opt => {
                                    const isSelected = selectedNaturalStatus === opt;
                                    return (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[styles.buttonPill, isSelected && styles.activeButtonPill]}
                                            onPress={() => setSelectedNaturalStatus(opt)}
                                        >
                                            <Text style={[styles.buttonPillText, isSelected && styles.activeButtonPillText]}>
                                                {opt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.divider} />

                        {/* Activity dropdown section */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Activity</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setActiveDropdown(activeDropdown === 'activity' ? null : 'activity')}
                            >
                                <Text style={styles.dropdownTriggerText}>
                                    {selectedActivity || 'All'}
                                </Text>
                                <MaterialCommunityIcons 
                                    name={activeDropdown === 'activity' ? 'chevron-up' : 'chevron-down'} 
                                    size={20} 
                                    color={Colors.theme.softWhite} 
                                />
                            </TouchableOpacity>

                            {activeDropdown === 'activity' && (
                                <View style={styles.inlineRolodex}>
                                    {FITNESS_ACTIVITIES.map((act) => {
                                        const isSelected = act.name === selectedActivity;
                                        return (
                                            <TouchableOpacity
                                                key={act.name}
                                                style={[styles.rolodexItem, isSelected && styles.selectedRolodexItem]}
                                                onPress={() => {
                                                    setSelectedActivity(act.name);
                                                    setActiveDropdown(null);
                                                }}
                                            >
                                                <Text style={[styles.rolodexItemText, isSelected && styles.selectedRolodexItemText]}>
                                                    {act.name}
                                                </Text>
                                                {act.icon && (
                                                    <MaterialCommunityIcons 
                                                        name={act.icon as any} 
                                                        size={18} 
                                                        color={isSelected ? Colors.theme.harvestGold : Colors.theme.dust} 
                                                        style={{ marginLeft: 8 }}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                        <View style={styles.divider} />

                        {/* Physical Stats - Hide for Tribes */}
                        {!isTribes && (
                            <View style={{ opacity: isSectionDisabled('body') ? 0.5 : 1 }} pointerEvents={isSectionDisabled('body') ? 'none' : 'auto'}>
                                {/* Height */}
                                <View style={styles.row}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.label}>Height</Text>
                                        <TouchableOpacity onPress={() => setIsMetric(!isMetric)} style={{ paddingRight: 10 }}>
                                            <Text style={{ color: Colors.theme.harvestGold, fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>
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
                                                    placeholderTextColor="rgba(237, 232, 213, 0.4)"
                                                />
                                                <Text style={styles.suffix}>cm</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.inputContainer}
                                                onPress={() => setActiveDropdown(activeDropdown === 'height' ? null : 'height')}
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
                                                placeholderTextColor="rgba(237, 232, 213, 0.4)"
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
                                                placeholderTextColor="rgba(237, 232, 213, 0.4)"
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

                        <View style={{ height: 120 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.addButton, isApplied && styles.appliedButton]} onPress={handleApply}>
                            <Text style={{ 
                                color: isApplied ? Colors.theme.matteBlack : Colors.theme.harvestGold, 
                                fontSize: 16, 
                                fontWeight: 'bold' 
                            }}>
                                {isApplied ? 'Applied ✓' : 'Apply Filters'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {activeDropdown === 'height' && (
                <View style={styles.rolodexContainer}>
                    <View style={styles.rolodexHeader}>
                        <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <HeightRolodex
                        minFt={1}
                        maxFt={9}
                        selectedFt={ft || 5}
                        selectedIn={inch || 0}
                        onSelect={(f, i) => { setFt(f); setInch(i); }}
                    />
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
        height: '85%',
        backgroundColor: Colors.theme.matteBlack,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: Colors.theme.charcoal,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: Colors.theme.charcoal,
    },
    filterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    resetText: {
        color: Colors.theme.harvestGold,
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
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 4,
    },
    pillGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
        marginBottom: 5,
    },
    buttonPill: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeButtonPill: {
        borderColor: Colors.theme.harvestGold,
    },
    buttonPillText: {
        color: Colors.theme.softWhite,
        fontWeight: '600',
    },
    activeButtonPillText: {
        color: Colors.theme.harvestGold,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: Colors.theme.charcoal,
        marginTop: 8,
    },
    dropdownTriggerText: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        fontSize: 16,
    },
    inlineRolodex: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 15,
        marginTop: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    rolodexItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectedRolodexItem: {
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    rolodexItemText: {
        color: Colors.theme.softWhite,
        fontWeight: '500',
        fontSize: 15,
    },
    selectedRolodexItemText: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    toggleBtn: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.theme.charcoal,
    },
    activeToggle: {
        backgroundColor: Colors.theme.harvestGold,
    },
    toggleText: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
    },
    activeToggleText: {
        color: Colors.theme.matteBlack,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.theme.charcoal,
        paddingHorizontal: 10,
        height: 38,
    },
    textInput: {
        flex: 1,
        textAlign: 'right',
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
        fontSize: 16,
    },
    suffix: {
        color: Colors.theme.dust,
        marginLeft: 4,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    inputValue: {
        color: Colors.theme.softWhite,
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    addButton: {
        width: '90%',
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.theme.charcoal,
        borderWidth: 1.5,
        borderColor: Colors.theme.harvestGold,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    appliedButton: {
        backgroundColor: Colors.theme.harvestGold,
        borderColor: Colors.theme.harvestGold,
    },
    rolodexContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.theme.matteBlack,
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
        backgroundColor: Colors.theme.charcoal,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    doneText: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
