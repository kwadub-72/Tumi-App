import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../theme/Colors';

interface WeightInputProps {
    valueKg: number | null;
    onChangeKg: (kg: number | null) => void;
    errorText?: string;
}

export const WeightInput = ({ valueKg, onChangeKg, errorText }: WeightInputProps) => {
    const [isLbs, setIsLbs] = useState(true);
    const [displayValue, setDisplayValue] = useState<string>('');

    // Sync external prop -> internal display when prop changes (from parent)
    useEffect(() => {
        if (valueKg === null || isNaN(valueKg)) {
            setDisplayValue('');
            return;
        }
        if (isLbs) {
            const lbs = valueKg * 2.20462;
            setDisplayValue(lbs.toFixed(1));
        } else {
            setDisplayValue(valueKg.toFixed(1));
        }
    }, [valueKg, isLbs]);

    const handleTextChange = (text: string) => {
        setDisplayValue(text);
        
        const parsed = parseFloat(text);
        if (isNaN(parsed)) {
            onChangeKg(null);
            return;
        }

        if (isLbs) {
            onChangeKg(parsed / 2.20462);
        } else {
            onChangeKg(parsed);
        }
    };

    // Validation for min/max bounds (30-300kg / 66-660lbs)
    const isOutOfBounds = valueKg !== null && (valueKg < 30 || valueKg > 300);
    const hasError = isOutOfBounds || !!errorText;
    const finalErrorText = isOutOfBounds ? 'Weight must be between 30kg and 300kg (66-660lbs)' : errorText;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.label}>Weight</Text>
                <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsLbs(!isLbs)}>
                    <Text style={styles.toggleText}>{isLbs ? 'Switch to kg' : 'Switch to lbs'}</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, hasError && styles.errorBorder]}>
                <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    selectionColor={Colors.theme.harvestGold}
                    value={displayValue}
                    onChangeText={handleTextChange}
                />
                <Text style={styles.suffix}>{isLbs ? 'lbs' : 'kg'}</Text>
            </View>
            {hasError && <Text style={styles.errorText}>{finalErrorText}</Text>}
        </View>
    );
};

interface HeightInputProps {
    cmValue: number | null;
    onChangeCm: (cm: number | null) => void;
}

export const HeightInput = ({ cmValue, onChangeCm }: HeightInputProps) => {
    const [isMetric, setIsMetric] = useState(false);
    const [localCm, setLocalCm] = useState<string>('');
    const [feet, setFeet] = useState<number>(5);
    const [inches, setInches] = useState<number>(8);

    // Sync external prop -> internal state
    useEffect(() => {
        if (cmValue === null || isNaN(cmValue)) {
            setLocalCm('');
            return;
        }
        setLocalCm(Math.round(cmValue).toString());
        
        const totalInches = cmValue / 2.54;
        const calcFeet = Math.floor(totalInches / 12);
        const calcInches = Math.round(totalInches % 12);
        
        if (calcFeet >= 3 && calcFeet <= 8) {
            setFeet(calcFeet);
            setInches(calcInches === 12 ? 0 : calcInches);
        }
    }, [cmValue]);

    const handleCmChange = (text: string) => {
        setLocalCm(text);
        const parsed = parseInt(text, 10);
        if (!isNaN(parsed)) {
            onChangeCm(parsed);
        } else {
            onChangeCm(null);
        }
    };

    const handleImperialChange = (f: number, i: number) => {
        setFeet(f);
        setInches(i);
        const totalInches = (f * 12) + i;
        onChangeCm(Math.round(totalInches * 2.54));
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.label}>Height</Text>
                <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsMetric(!isMetric)}>
                    <Text style={styles.toggleText}>{isMetric ? 'Switch to ft/in' : 'Switch to cm'}</Text>
                </TouchableOpacity>
            </View>

            {isMetric ? (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        keyboardType="number-pad"
                        placeholder="170"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        selectionColor={Colors.theme.harvestGold}
                        value={localCm}
                        onChangeText={handleCmChange}
                    />
                    <Text style={styles.suffix}>cm</Text>
                </View>
            ) : (
                <View style={styles.pickerRow}>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={feet}
                            onValueChange={(val: any) => handleImperialChange(val, inches)}
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
                            onValueChange={(val: any) => handleImperialChange(feet, val)}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                        >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                                <Picker.Item key={`in-${i}`} label={`${i} in`} value={i} color="#FFFFFF" />
                            ))}
                        </Picker>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    toggleBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    toggleText: {
        color: Colors.theme.harvestGold,
        fontSize: 12,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        height: 50,
        overflow: 'hidden',
    },
    errorBorder: {
        borderColor: Colors.theme.burntSienna,
    },
    textInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        paddingHorizontal: 16,
        height: '100%',
    },
    suffix: {
        color: '#FFFFFF',
        paddingRight: 16,
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.5,
    },
    errorText: {
        color: Colors.theme.burntSienna,
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        height: Platform.OS === 'ios' ? 120 : 50, 
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
        fontSize: 16,
        height: 120, 
    }
});
