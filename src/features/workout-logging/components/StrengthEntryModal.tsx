import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
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
import { Exercise, ExerciseSet } from '@/src/shared/models/types';

interface StrengthEntryModalProps {
    visible: boolean;
    exercise: Exercise | null;
    onClose: () => void;
    onSave: (updates: Partial<Exercise>) => void;
}

export default function StrengthEntryModal({ visible, exercise, onClose, onSave }: StrengthEntryModalProps) {
    // ... state and effects (keep same)
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [superset, setSuperset] = useState('');
    const [eccentric, setEccentric] = useState('');

    useEffect(() => {
        if (visible && exercise) {
            const s = exercise.sets?.length || 0;
            const r = exercise.sets?.[0]?.reps || 0;
            if (s > 0) setSets(s.toString());
            if (r > 0) setReps(r.toString());
            if (exercise.superset) setSuperset(exercise.superset);
            if (exercise.eccentric) setEccentric(exercise.eccentric);
        }
    }, [visible, exercise]);

    const handleSave = () => {
        const numSets = parseInt(sets) || 0;
        const numReps = parseInt(reps) || 0;

        const generatedSets: ExerciseSet[] = [];
        for (let i = 0; i < numSets; i++) {
            generatedSets.push({
                id: Date.now().toString() + i,
                reps: numReps,
                weight: 0,
                completed: false
            });
        }

        onSave({
            sets: generatedSets,
            superset,
            eccentric
        });
        onClose();
    };

    if (!exercise) return null;

    const refSets = 4;
    const refReps = 6;

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
                        {/* Header: Title and Icon */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                            </TouchableOpacity>

                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>{exercise.title}</Text>
                                <Text style={styles.subtitle}>{exercise.notes || '5 sec eccentric'}</Text>
                            </View>

                            <MaterialCommunityIcons name="dumbbell" size={32} color={Colors.primary} style={styles.headerIcon} />
                        </View>

                        {/* Reference Bubble */}
                        <View style={styles.previewPill}>
                            <View style={styles.previewIconCircle}>
                                <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.previewText}>
                                {refSets} sets x {refReps} reps
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Inputs Grid */}
                        <View style={styles.inputsGrid}>
                            {/* Sets */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sets</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={sets}
                                        onChangeText={setSets}
                                        keyboardType="numeric"
                                        placeholder="...sets"
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                    />
                                </View>
                            </View>

                            {/* Reps */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Reps</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={reps}
                                        onChangeText={setReps}
                                        keyboardType="numeric"
                                        placeholder="...reps"
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                    />
                                </View>
                            </View>

                            {/* Superset */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Superset</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={superset}
                                        onChangeText={(t) => setSuperset(t.toUpperCase().slice(0, 1))}
                                        placeholder="..."
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                        maxLength={1}
                                    />
                                </View>
                            </View>

                            {/* Eccentric */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Eccentric</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={eccentric}
                                        onChangeText={setEccentric}
                                        placeholder="...sec"
                                        placeholderTextColor="rgba(79, 99, 82, 0.4)"
                                    />
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
    titleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888', // Grey italic
        fontStyle: 'italic',
        marginTop: 4,
    },
    headerIcon: {
        transform: [{ rotate: '-15deg' }],
    },
    previewPill: {
        flexDirection: 'row',
        backgroundColor: Colors.card, // Sage Green
        borderRadius: 40,
        padding: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        height: 70,
    },
    previewIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    previewText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#CCC',
        width: '100%',
        marginBottom: 30,
    },
    inputsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 30,
    },
    inputGroup: {
        width: '40%',
        alignItems: 'center',
    },
    label: {
        color: Colors.primary, // MATCH CARDIO: Dark Green
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 8,
        fontWeight: '600', // Match Cardio
    },
    inputContainer: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.primary, // MATCH CARDIO: Dark Green Border
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(164, 182, 157, 0.1)', // MATCH CARDIO: Faint background
    },
    input: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%'
    },
    addButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 40,
        backgroundColor: 'transparent',
    },
});
