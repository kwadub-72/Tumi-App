import React, { useState, useEffect, forwardRef } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, TextInputProps, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../theme/Colors';

export type InputState = 'idle' | 'validating' | 'success' | 'error';

export interface BaseInputProps extends TextInputProps {
    label?: string;
    errorText?: string;
    inputState?: InputState;
}

const getBorderColor = (state: InputState) => {
    switch (state) {
        case 'error': return Colors.theme.burntSienna;
        case 'success': return '#1BB607'; // Success green
        case 'validating': return Colors.theme.harvestGold;
        case 'idle':
        default: return 'rgba(255, 255, 255, 0.2)';
    }
};

const BaseAuthInput = forwardRef<TextInput, BaseInputProps>(({ label, errorText, inputState = 'idle', style, ...props }, ref) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, { borderColor: getBorderColor(inputState) }]}>
                <TextInput
                    ref={ref}
                    style={[styles.input, style]}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    selectionColor={Colors.theme.harvestGold}
                    {...props}
                />
                <View style={styles.iconContainer}>
                    {inputState === 'validating' && <ActivityIndicator size="small" color={Colors.theme.harvestGold} />}
                    {inputState === 'success' && <Ionicons name="checkmark-circle" size={20} color="#1BB607" />}
                    {inputState === 'error' && <Ionicons name="alert-circle" size={20} color={Colors.theme.burntSienna} />}
                </View>
            </View>
            {inputState === 'error' && errorText ? (
                <Text style={styles.errorText}>{errorText}</Text>
            ) : null}
        </View>
    );
});

export const UsernameInput = forwardRef<TextInput, BaseInputProps>((props, ref) => {
    return (
        <BaseAuthInput
            ref={ref}
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="handle"
            onChangeText={(text) => {
                const formatted = text.replace(/\s+/g, '').toLowerCase();
                props.onChangeText?.(formatted);
            }}
            {...props}
        />
    );
});

export const EmailInput = forwardRef<TextInput, BaseInputProps>((props, ref) => {
    const [localState, setLocalState] = useState<InputState>(props.inputState || 'idle');
    const [localError, setLocalError] = useState<string | undefined>(props.errorText);

    const validateEmail = (email: string) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!isValid && email.length > 0) {
            setLocalState('error');
            setLocalError('Invalid email address');
        } else if (isValid) {
            setLocalState('success');
            setLocalError(undefined);
        } else {
            setLocalState('idle');
            setLocalError(undefined);
        }
    };

    return (
        <BaseAuthInput
            ref={ref}
            label="Email"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="email@example.com"
            inputState={props.inputState !== 'idle' && props.inputState !== undefined ? props.inputState : localState}
            errorText={props.errorText || localError}
            onBlur={(e) => {
                validateEmail(props.value || '');
                props.onBlur?.(e);
            }}
            {...props}
        />
    );
});

export const DisplayNameInput = forwardRef<TextInput, BaseInputProps>((props, ref) => (
    <BaseAuthInput
        ref={ref}
        label="Display Name"
        autoCapitalize="words"
        placeholder="Display Name"
        maxLength={10}
        {...props}
    />
));

export const FirstNameInput = forwardRef<TextInput, BaseInputProps>((props, ref) => (
    <BaseAuthInput
        ref={ref}
        label="First Name"
        autoCapitalize="words"
        textContentType="givenName"
        placeholder="First Name"
        {...props}
        onChangeText={(text) => {
            const formatted = text.replace(/\s/g, '');
            props.onChangeText?.(formatted);
        }}
    />
));

export const LastNameInput = forwardRef<TextInput, BaseInputProps>((props, ref) => (
    <BaseAuthInput
        ref={ref}
        label="Last Name"
        autoCapitalize="words"
        textContentType="familyName"
        placeholder="Last Name"
        {...props}
        onChangeText={(text) => {
            const formatted = text.replace(/\s/g, '');
            props.onChangeText?.(formatted);
        }}
    />
));

export const PasswordInput = forwardRef<TextInput, BaseInputProps>((props, ref) => {
    const [isMasked, setIsMasked] = useState(true);
    const [localState, setLocalState] = useState<InputState>(props.inputState || 'idle');
    const [localError, setLocalError] = useState<string | undefined>(props.errorText);

    useEffect(() => {
        if (!props.value) {
            setLocalState('idle');
            setLocalError(undefined);
            return;
        }

        const handler = setTimeout(() => {
            const val = props.value || '';
            const minLength = val.length >= 8;
            const maxLength = val.length <= 64;
            const hasUpper = /[A-Z]/.test(val);
            const hasLower = /[a-z]/.test(val);
            const hasNumber = /[0-9]/.test(val);
            const hasSpecial = /[^A-Za-z0-9]/.test(val);

            if (!minLength || !maxLength) {
                setLocalState('error');
                setLocalError('Must be between 8 and 64 characters');
            } else if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
                setLocalState('error');
                setLocalError('Needs uppercase, lowercase, number & special character');
            } else {
                setLocalState('success');
                setLocalError(undefined);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [props.value]);

    const stateToUse = props.inputState !== 'idle' && props.inputState !== undefined ? props.inputState : localState;
    const errorToUse = props.errorText || localError;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{props.label || 'Password'}</Text>
            <View style={[styles.inputContainer, { borderColor: getBorderColor(stateToUse) }]}>
                <TextInput
                    ref={ref}
                    style={[styles.input, props.style]}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    selectionColor={Colors.theme.harvestGold}
                    secureTextEntry={isMasked}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    {...props}
                />
                <View style={[styles.iconContainer, { flexDirection: 'row', gap: 8 }]}>
                    <TouchableOpacity onPress={() => setIsMasked(!isMasked)}>
                        <Ionicons name={isMasked ? "eye-off" : "eye"} size={20} color="rgba(255, 255, 255, 0.7)" />
                    </TouchableOpacity>
                    {stateToUse === 'validating' && <ActivityIndicator size="small" color={Colors.theme.harvestGold} />}
                    {stateToUse === 'success' && <Ionicons name="checkmark-circle" size={20} color="#1BB607" />}
                    {stateToUse === 'error' && <Ionicons name="alert-circle" size={20} color={Colors.theme.burntSienna} />}
                </View>
            </View>
            {stateToUse === 'error' && errorToUse ? (
                <Text style={styles.errorText}>{errorToUse}</Text>
            ) : null}
        </View>
    );
});

export interface BirthdayPickerProps {
    value?: string;
    onChange?: (value: string) => void;
}

export const BirthdayPicker = ({ value, onChange }: BirthdayPickerProps) => {
    const currentDate = new Date(2026, 4, 1); // Fixed to May 2026

    const getInitialDates = () => {
        if (!value) return { m: 0, d: 1, y: 2000 };
        const parts = value.split('-');
        if (parts.length === 3) {
            const yy = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10) - 1; // 0-indexed
            const dd = parseInt(parts[2], 10);
            if (!isNaN(yy) && !isNaN(mm) && !isNaN(dd)) {
                return { m: mm, d: dd, y: yy };
            }
        }
        return { m: 0, d: 1, y: 2000 };
    };

    const initial = getInitialDates();
    const [month, setMonth] = useState<number>(initial.m);
    const [day, setDay] = useState<number>(initial.d);
    const [year, setYear] = useState<number>(initial.y);

    useEffect(() => {
        const parsed = getInitialDates();
        if (parsed.m !== month || parsed.d !== day || parsed.y !== year) {
            setMonth(parsed.m);
            setDay(parsed.d);
            setYear(parsed.y);
        }
    }, [value]);

    const isAgeValid = (m: number, d: number, y: number) => {
        const selected = new Date(y, m, d);
        const cutoff = new Date(currentDate.getFullYear() - 13, currentDate.getMonth(), currentDate.getDate());
        return selected.getTime() <= cutoff.getTime();
    };

    const hasError = !isAgeValid(month, day, year);

    const formatDate = (y: number, m: number, d: number) => {
        const paddedM = String(m + 1).padStart(2, '0');
        const paddedD = String(d).padStart(2, '0');
        return `${y}-${paddedM}-${paddedD}`;
    };

    const handleMonthChange = (val: number) => {
        setMonth(val);
        const maxDays = new Date(year, val + 1, 0).getDate();
        const safeDay = day > maxDays ? maxDays : day;
        if (safeDay !== day) setDay(safeDay);
        onChange?.(formatDate(year, val, safeDay));
    };

    const handleDayChange = (val: number) => {
        setDay(val);
        onChange?.(formatDate(year, month, val));
    };

    const handleYearChange = (val: number) => {
        setYear(val);
        const maxDays = new Date(val, month + 1, 0).getDate();
        const safeDay = day > maxDays ? maxDays : day;
        if (safeDay !== day) setDay(safeDay);
        onChange?.(formatDate(val, month, safeDay));
    };

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentYear = currentDate.getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={[styles.pickerRow, hasError && styles.errorBorder]}>
                <View style={[styles.pickerWrapper, { flex: 2 }]}>
                    <Picker
                        selectedValue={month}
                        onValueChange={(val: any) => handleMonthChange(val)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                    >
                        {months.map((m, i) => (
                            <Picker.Item key={m} label={m} value={i} color="#FFFFFF" />
                        ))}
                    </Picker>
                </View>
                <View style={[styles.pickerWrapper, { flex: 1 }]}>
                    <Picker
                        selectedValue={day}
                        onValueChange={(val: any) => handleDayChange(val)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                    >
                        {days.map((d) => (
                            <Picker.Item key={d} label={String(d)} value={d} color="#FFFFFF" />
                        ))}
                    </Picker>
                </View>
                <View style={[styles.pickerWrapper, { flex: 1.5 }]}>
                    <Picker
                        selectedValue={year}
                        onValueChange={(val: any) => handleYearChange(val)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                    >
                        {years.map((y) => (
                            <Picker.Item key={y} label={String(y)} value={y} color="#FFFFFF" />
                        ))}
                    </Picker>
                </View>
            </View>
            {hasError && (
                <Text style={styles.errorText}>You must be at least 13 years old to join Tribe.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderRadius: 12,
        height: 50,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        paddingHorizontal: 16,
        height: '100%',
    },
    iconContainer: {
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: Colors.theme.burntSienna,
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    errorBorder: {
        borderColor: Colors.theme.burntSienna,
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
