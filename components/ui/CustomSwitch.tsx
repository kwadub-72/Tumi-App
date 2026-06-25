import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

interface CustomSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    activeColor?: string;
    inactiveColor?: string;
    activeIcon?: keyof typeof Ionicons.glyphMap;
    inactiveIcon?: keyof typeof Ionicons.glyphMap;
}

export function CustomSwitch({
    value,
    onValueChange,
    activeColor = Colors.primary,
    inactiveColor = '#888',
    activeIcon = 'earth',
    inactiveIcon = 'lock-closed',
}: CustomSwitchProps) {
    const handlePress = () => {
        onValueChange(!value);
    };

    return (
        <TouchableOpacity
            style={[
                styles.switchContainer,
                value 
                    ? { backgroundColor: activeColor, alignItems: 'flex-end' } 
                    : { backgroundColor: inactiveColor, alignItems: 'flex-start' }
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.switchKnob}>
                <Ionicons 
                    name={value ? activeIcon : inactiveIcon} 
                    size={14} 
                    color={value ? activeColor : inactiveColor} 
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    switchContainer: {
        width: 56,
        height: 32,
        borderRadius: 16,
        padding: 3,
        justifyContent: 'center',
    },
    switchKnob: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
});
