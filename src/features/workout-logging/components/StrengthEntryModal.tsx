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
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [superset, setSuperset] = useState('');
    const [eccentric, setEccentric] = useState('');

    useEffect(() => {
        if (visible && exercise) {
            const s = exercise.sets?.length || 0;
            const r = exercise.sets?.[0]?.reps || 0;
            setSets(s > 0 ? s.toString() : '');
            setReps(r > 0 ? r.toString() : '');
            setSuperset(exercise.superset || '');
            setEccentric(exercise.eccentric || '');
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

                            <MaterialCommunityIcons 
                                name="dumbbell" 
                                size={32} 
                                color={Colors.primary} 
                                style={styles.headerIcon} 
                            />
                        </View>

                        {/* ── Title ── */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
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
                                        selectionColor={Colors.primary}
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
                                        selectionColor={Colors.primary}
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
                                        selectionColor={Colors.primary}
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
                                        selectionColor={Colors.primary}
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
        width: '100%'
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
