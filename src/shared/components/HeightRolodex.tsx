import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../theme/Colors';

export interface HeightRolodexProps {
    value?: { feet: number; inches: number };
    onChange?: (val: { feet: number; inches: number }) => void;
    visible: boolean;
    onClose: () => void;
}

export const HeightRolodex = ({ value, onChange, visible, onClose }: HeightRolodexProps) => {
    // Default to 5'8" if no value provided
    const initialFeet = value?.feet !== undefined ? value.feet : 5;
    const initialInches = value?.inches !== undefined ? value.inches : 8;

    const [feet, setFeet] = useState<number>(initialFeet);
    const [inches, setInches] = useState<number>(initialInches);

    // Sync external prop -> internal state securely using primitive dependency arrays
    // This breaks the reference equality infinite render loop from object props
    useEffect(() => {
        if (value) {
            if (value.feet !== feet && value.feet >= 3 && value.feet <= 8) {
                setFeet(value.feet);
            }
            if (value.inches !== inches && value.inches >= 0 && value.inches <= 11) {
                setInches(value.inches);
            }
        }
    }, [value?.feet, value?.inches]);

    const handleFeetChange = (val: number) => {
        setFeet(val);
        onChange?.({ feet: val, inches });
    };

    const handleInchesChange = (val: number) => {
        setInches(val);
        onChange?.({ feet, inches: val });
    };

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.bottomSheet}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>Select Height</Text>
                        <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.pickerRow}>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={feet}
                                onValueChange={(val: any) => handleFeetChange(val)}
                                style={styles.picker}
                                itemStyle={styles.pickerItem}
                            >
                                {[3, 4, 5, 6, 7, 8].map((f) => (
                                    <Picker.Item key={`ft-${f}`} label={`${f} ft`} value={f} color="#FFFFFF" />
                                ))}
                            </Picker>
                        </View>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={inches}
                                onValueChange={(val: any) => handleInchesChange(val)}
                                style={styles.picker}
                                itemStyle={styles.pickerItem}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                                    <Picker.Item key={`in-${i}`} label={`${i} in`} value={i} color="#FFFFFF" />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: Colors.theme.charcoal,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    doneBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    doneText: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: 'bold',
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: Platform.OS === 'ios' ? 200 : 120,
        overflow: 'hidden',
    },
    pickerWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    picker: {
        flex: 1,
        color: '#FFFFFF',
    },
    pickerItem: {
        color: '#FFFFFF',
        fontSize: 20,
        height: 200, 
    }
});
