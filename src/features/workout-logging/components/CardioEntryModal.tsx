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


interface CardioEntryModalProps {
    visible: boolean;
    initialStats?: { speed?: number; incline?: number; duration?: number };
    onClose: () => void;
    onSave: (stats: { speed: number; incline: number; duration: number }) => void;
}

export default function CardioEntryModal({ visible, initialStats, onClose, onSave }: CardioEntryModalProps) {
    const [speed, setSpeed] = useState(initialStats?.speed?.toString() || '');
    const [incline, setIncline] = useState(initialStats?.incline?.toString() || '');
    const [duration, setDuration] = useState(initialStats?.duration?.toString() || '');

    // In a real app we might have a unit picker, for now assume minutes
    const [durationUnit, setDurationUnit] = useState('min');

    useEffect(() => {
        if (visible) {
            setSpeed(initialStats?.speed?.toString() || '');
            setIncline(initialStats?.incline?.toString() || '');
            setDuration(initialStats?.duration?.toString() || '');
        }
    }, [visible, initialStats]);

    const handleSave = () => {
        onSave({
            speed: parseFloat(speed) || 0,
            incline: parseFloat(incline) || 0,
            duration: parseFloat(duration) || 0,
        });
        onClose();
    };

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
                                <Text style={styles.title}>Treadmill</Text>
                                <Text style={styles.title}>walk</Text>
                            </View>

                            <MaterialCommunityIcons name="run" size={32} color={Colors.primary} style={styles.headerIcon} />
                        </View>

                        {/* Preview Pill */}
                        <View style={styles.previewPill}>
                            <View style={styles.previewIconCircle}>
                                <MaterialCommunityIcons name="fire" size={24} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.previewText}>
                                    {speed || '0'} speed, {incline || '0'}
                                </Text>
                                <Text style={styles.previewText}>
                                    incline, {duration || '0'} {durationUnit}
                                </Text>
                            </View>
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
                                        placeholder="..."
                                        placeholderTextColor="#888"
                                    />
                                    <Text style={styles.unitSuffix}>mph</Text>
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
                                        placeholder="..."
                                        placeholderTextColor="#888"
                                    />
                                    <Text style={styles.unitSuffix}>%</Text>
                                </View>
                            </View>

                            {/* Duration Unit */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Duration unit</Text>
                                <TouchableOpacity style={styles.inputContainer}>
                                    <Text style={styles.staticInputText}>{durationUnit}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Duration */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Duration</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="numeric"
                                        placeholder="..."
                                        placeholderTextColor="#888"
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
        marginBottom: 30,
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
    headerIcon: {

    },
    previewPill: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: 40,
        padding: 10,
        alignItems: 'center',
        marginBottom: 20,
        height: 80,
    },
    previewIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        marginLeft: 5,
    },
    previewText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#CCC',
        width: '80%',
        alignSelf: 'center',
        marginBottom: 30,
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
        fontSize: 20,
        color: Colors.primary,
        fontWeight: 'bold',
        textAlign: 'right',
        minWidth: 20,
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
        width: 70, // Match Strength
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
