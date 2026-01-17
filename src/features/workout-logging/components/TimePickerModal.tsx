import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

interface TimePickerModalProps {
    visible: boolean;
    initialDuration?: number | null; // minutes
    onClose: () => void;
    onSave: (duration: number) => void;
}

export default function TimePickerModal({ visible, initialDuration, onClose, onSave }: TimePickerModalProps) {
    // Default to 0 start if null
    const initialHours = initialDuration ? Math.floor(initialDuration / 60) : 0;
    const initialMinutes = initialDuration ? initialDuration % 60 : 0;

    const [selectedHour, setSelectedHour] = useState(initialHours);
    const [selectedMinute, setSelectedMinute] = useState(initialMinutes);

    // Arrays for pickers
    const hours = Array.from({ length: 13 }, (_, i) => i); // 0-12 hours
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10... 55

    const handleSave = () => {
        const totalMinutes = (selectedHour * 60) + selectedMinute;
        onSave(totalMinutes);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.container} activeOpacity={1}>

                    <View style={styles.header}>
                        <Text style={styles.title}>Duration</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                        {/* Hours Column */}
                        <View style={styles.columnWrapper}>
                            <Text style={styles.columnLabel}>Hours</Text>
                            <ScrollView
                                style={styles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={50}
                            >
                                {hours.map((h) => (
                                    <TouchableOpacity
                                        key={h}
                                        style={[styles.pickerItem, selectedHour === h && styles.selectedItem]}
                                        onPress={() => setSelectedHour(h)}
                                    >
                                        <Text style={[styles.pickerText, selectedHour === h && styles.selectedText]}>
                                            {h}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 100 }} />
                            </ScrollView>
                        </View>

                        {/* Separator */}
                        <Text style={styles.colon}>:</Text>

                        {/* Minutes Column */}
                        <View style={styles.columnWrapper}>
                            <Text style={styles.columnLabel}>Minutes</Text>
                            <ScrollView
                                style={styles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={50}
                            >
                                {minutes.map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.pickerItem, selectedMinute === m && styles.selectedItem]}
                                        onPress={() => setSelectedMinute(m)}
                                    >
                                        <Text style={[styles.pickerText, selectedMinute === m && styles.selectedText]}>
                                            {m.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 100 }} />
                            </ScrollView>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Enter</Text>
                    </TouchableOpacity>

                </TouchableOpacity>
            </TouchableOpacity>
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
    container: {
        width: '80%',
        backgroundColor: Colors.card, // Sage Green
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 200,
        marginBottom: 20,
    },
    columnWrapper: {
        alignItems: 'center',
        height: '100%',
        width: 80,
    },
    columnLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginBottom: 8,
    },
    scrollColumn: {
        width: '100%',
    },
    pickerItem: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedItem: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        width: '100%',
    },
    pickerText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 24,
        fontWeight: 'bold',
    },
    selectedText: {
        color: 'white',
        fontSize: 32,
    },
    colon: {
        fontSize: 40,
        color: 'white',
        marginHorizontal: 10,
        paddingTop: 20,
    },
    saveButton: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    saveButtonText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
