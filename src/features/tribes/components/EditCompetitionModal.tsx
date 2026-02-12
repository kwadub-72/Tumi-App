import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

interface EditCompetitionModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    initialConfig?: CompetitionConfig;
    onSave: (config: CompetitionConfig) => void;
}

export interface CompetitionConfig {
    length: number; // weeks
    points2_5g: number;
    points10g: number;
    points15g: number;
    exerciseBonus: number;
    penalty20g: number;
    scoringStyle: 'Democratic' | 'Unilateral' | 'No changes' | null;
}

const DEFAULT_CONFIG: CompetitionConfig = {
    length: 0,
    points2_5g: 15,
    points10g: 10,
    points15g: 5,
    exerciseBonus: 10,
    penalty20g: -10,
    scoringStyle: null
};

export default function EditCompetitionModal({ visible, onClose, title, subtitle, initialConfig, onSave }: EditCompetitionModalProps) {
    const [config, setConfig] = useState<CompetitionConfig>(initialConfig || DEFAULT_CONFIG);
    const [weeksModalVisible, setWeeksModalVisible] = useState(false);
    const [scoringModalVisible, setScoringModalVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            setConfig(initialConfig || DEFAULT_CONFIG);
        }
    }, [visible, initialConfig]);

    const handleSave = () => {
        if (!config.length || config.length === 0) {
            Alert.alert('Missing Info', 'Please select a competition length.');
            return;
        }
        if (!config.scoringStyle) {
            Alert.alert('Missing Info', 'Please select a scoring change style.');
            return;
        }
        onSave(config);
        onClose();
    };

    const handleReset = () => {
        setConfig(DEFAULT_CONFIG);
    };

    const updatePoint = (key: keyof CompetitionConfig, value: string) => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            setConfig(prev => ({ ...prev, [key]: num }));
        } else if (value === '' || value === '-') {
            // Allow clearing or starting with minus, but verify on blur? 
            // For simplicity, we assume valid input or 0
            // But 'value' is string from TextInput. 
            // State is number. 
            // We need local state for inputs or just cast.
            // Let's rely on numeric keyboard and simple casting.
        }
    };

    // Helper for Point Row - Removed in favor of NumberPill


    // Better Input Implementation
    const NumberPill = ({ val, onChange }: { val: number, onChange: (n: number) => void }) => (
        <View style={styles.pillInput}>
            <Text style={styles.pillPrefix}>{val > 0 ? '+' : ''}</Text>
            <TextInput
                style={styles.pillTextInput}
                value={String(val).replace('+', '')} // Strip + for display if logic adds it
                keyboardType="numeric" // actually number-pad might be better for negative? 
                // iOS number pad doesn't handle negative well.
                // We'll use specific logic: if negative, show -, else +.
                // "allow the user to only enter numbers". 
                // Does that mean they can't change the sign? 
                // "Prepopulate... keep the (+/-) prefix".
                // Maybe the sign is fixed for that row? 
                // "Penalty for >= 20g" is -10. "Points for..." is +15.
                // So sign is likely fixed by the field type.
                onChangeText={(text) => {
                    const clean = text.replace(/[^0-9]/g, '');
                    const num = parseInt(clean || '0');
                    if (val < 0) onChange(-num); // Keep it negative
                    else onChange(num);
                }}
            />
        </View>
    );

    // Wait, the user might want to change penalty to positive? 
    // "Penalty" implies negative. "Points" implies positive.
    // I will enforce sign based on the field label logic.

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <Text style={styles.headerSubtitle}>{subtitle}</Text>
                    </View>
                    <TouchableOpacity onPress={handleReset}>
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Length */}
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Competition length</Text>
                        <TouchableOpacity style={styles.pillButton} onPress={() => setWeeksModalVisible(true)}>
                            <Text style={styles.pillButtonText}>
                                {config.length > 0 ? `${config.length} weeks` : 'Select # of weeks'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Points Fields */}
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Points for ± 2.5g</Text>
                            <NumberPill val={config.points2_5g} onChange={v => setConfig({ ...config, points2_5g: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Points for ± 10g</Text>
                            <NumberPill val={config.points10g} onChange={v => setConfig({ ...config, points10g: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Points for ± 15g</Text>
                            <NumberPill val={config.points15g} onChange={v => setConfig({ ...config, points15g: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Daily exercise bonus</Text>
                            <NumberPill val={config.exerciseBonus} onChange={v => setConfig({ ...config, exerciseBonus: v })} />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Penalty for ≥± 20g</Text>
                            <NumberPill val={config.penalty20g} onChange={v => setConfig({ ...config, penalty20g: v })} />
                        </View>
                    </View>

                    {/* Scoring Change */}
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Scoring change</Text>
                        <TouchableOpacity style={styles.pillButton} onPress={() => setScoringModalVisible(true)}>
                            <Text style={styles.pillButtonText}>{config.scoringStyle || 'Select style'}</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Footer Save */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.plusButton} onPress={handleSave}>
                        <MaterialCommunityIcons name="plus" size={30} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Weeks Modal */}
                <Modal visible={weeksModalVisible} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setWeeksModalVisible(false)}>
                        <View style={styles.pickerContainer}>
                            <Text style={styles.pickerTitle}>Select Length (Weeks)</Text>
                            <ScrollView style={{ maxHeight: 200 }}>
                                {Array.from({ length: 52 }, (_, i) => i + 1).map(num => (
                                    <TouchableOpacity
                                        key={num}
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            setConfig({ ...config, length: num });
                                            setWeeksModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.pickerItemText}>{num} Weeks</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Scoring Style Modal (Right side of image 2 style) */}
                <Modal visible={scoringModalVisible} transparent animationType="fade">
                    <TouchableOpacity style={[styles.modalOverlay, { alignItems: 'flex-end', paddingRight: 20 }]} onPress={() => setScoringModalVisible(false)}>
                        <View style={styles.sideMenu}>
                            {['Democratic', 'Unilateral', 'No changes'].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={styles.sideMenuItem}
                                    onPress={() => {
                                        setConfig({ ...config, scoringStyle: opt as any });
                                        setScoringModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.sideMenuText}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5DC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    closeBtn: {
        padding: 5,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        color: '#4F6352',
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 24,
        color: '#2F3A27', // Darker green
        fontWeight: 'bold',
    },
    resetText: {
        color: '#4F6352',
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    row: {
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#4F6352',
        borderRadius: 25,
        height: 50,
        backgroundColor: 'rgba(79, 99, 82, 0.2)', // Light green
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    rowLabel: {
        color: '#2F3A27',
        fontSize: 16,
        fontWeight: '600',
    },
    pillButton: {
        backgroundColor: '#E8F0E5',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#4F6352',
        minWidth: 100,
        alignItems: 'center',
    },
    pillButtonText: {
        color: '#2F3A27',
        fontWeight: '600',
    },
    pillInput: {
        backgroundColor: '#E8F0E5', // Light background
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#4F6352',
        width: 80,
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillPrefix: {
        color: '#2F3A27',
        fontWeight: '600',
        marginRight: 2,
    },
    pillTextInput: {
        color: '#2F3A27',
        fontWeight: '600',
        fontSize: 16,
        minWidth: 20,
        textAlign: 'center',
    },
    section: {
        gap: 0,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    plusButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4F6352',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        backgroundColor: '#F5F5DC',
        width: '80%',
        borderRadius: 20,
        padding: 20,
        maxHeight: 300,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4F6352',
        marginBottom: 10,
        textAlign: 'center',
    },
    pickerItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#2F3A27',
    },
    sideMenu: {
        gap: 15,
        justifyContent: 'center',
    },
    sideMenuItem: {
        backgroundColor: '#E8F0E5',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#4F6352',
        alignItems: 'center',
    },
    sideMenuText: {
        color: '#2F3A27',
        fontWeight: '600',
    }
});
