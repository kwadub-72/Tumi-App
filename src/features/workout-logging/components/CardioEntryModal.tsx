import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Exercise } from '@/src/shared/models/types';

interface CardioEntryModalProps {
    visible: boolean;
    exercise: Exercise | null;
    initialStats?: { speed?: number; incline?: number; duration?: number };
    onClose: () => void;
    onSave: (stats: { speed: number; incline: number; duration: number }) => void;
}

export default function CardioEntryModal({ visible, exercise, initialStats, onClose, onSave }: CardioEntryModalProps) {
    const [speed, setSpeed] = useState(initialStats?.speed?.toString() || '');
    const [incline, setIncline] = useState(initialStats?.incline?.toString() || '');
    const [duration, setDuration] = useState(initialStats?.duration?.toString() || '');

    // In a real app we might have a unit picker, for now assume minutes
    const [durationUnit, setDurationUnit] = useState<'min' | 'hour'>('min');

    useEffect(() => {
        if (visible) {
            setSpeed(initialStats?.speed?.toString() || '');
            setIncline(initialStats?.incline?.toString() || '');
            setDuration(initialStats?.duration?.toString() || '');
        } else {
            setSpeed('');
            setIncline('');
            setDuration('');
        }
    }, [visible, initialStats]);

    const toggleDurationUnit = () => {
        setDurationUnit(prev => prev === 'min' ? 'hour' : 'min');
    };

    const handleSave = () => {
        onSave({
            speed: parseFloat(speed) || 0,
            incline: parseFloat(incline) || 0,
            duration: parseFloat(duration) || 0,
        });
        onClose();
    };

    if (!exercise) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        {/* ── Header ── */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                            </TouchableOpacity>

                            {/* Centered Creator */}
                            <View style={styles.creatorRow}>
                                <View style={styles.creatorAvatarCircle}>
                                    <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.creatorName}>{exercise.createdBy?.name || 'Tribe'}</Text>
                            </View>

                            <MaterialCommunityIcons name="run" size={32} color={Colors.primary} style={styles.headerIcon} />
                        </View>

                        {/* ── Title ── */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Inputs Grid */}
                        <View style={styles.inputsGrid}>
                            {/* Speed */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Speed</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={speed}
                                        onChangeText={setSpeed}
                                        keyboardType="numeric"
                                        placeholder="...mph"
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                        selectionColor={Colors.primary}
                                    />
                                </View>
                            </View>

                            {/* Incline */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Incline</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={incline}
                                        onChangeText={setIncline}
                                        keyboardType="numeric"
                                        placeholder="...%"
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                        selectionColor={Colors.primary}
                                    />
                                </View>
                            </View>

                            {/* Duration Unit */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Duration unit</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={toggleDurationUnit}
                                >
                                    <Text style={styles.staticInputText}>{durationUnit}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Duration */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Duration</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.input, { textAlign: 'right', flex: 0, minWidth: 40 }]}
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="numeric"
                                        placeholder="..."
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                        selectionColor={Colors.primary}
                                    />
                                    <Text style={styles.unitSuffix}>{durationUnit}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ flex: 1 }} />

                        {/* Add Button */}
                        <TouchableOpacity style={styles.addButton} onPress={handleSave}>
                            <Ionicons name="add" size={40} color={Colors.primary} />
                        </TouchableOpacity>

                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    creatorAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'rgba(79, 99, 82, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    creatorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    headerIcon: {
        opacity: 0.9,
    },
    titleContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    exerciseTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
        lineHeight: 38,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(79, 99, 82, 0.2)',
        width: '100%',
        marginBottom: 40,
    },
    inputsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 30,
    },
    inputGroup: {
        width: '45%',
        alignItems: 'center',
    },
    label: {
        color: Colors.primary,
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 8,
        fontWeight: '600',
    },
    inputContainer: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(164, 182, 157, 0.1)',
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 20,
        color: Colors.primary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    unitSuffix: {
        fontSize: 16,
        color: Colors.primary,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    staticInputText: {
        fontSize: 18,
        color: Colors.primary,
        fontWeight: 'bold',
    },
    addButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 40,
    },
});
