import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/Colors';

interface ActivityIconProps {
    activity: string;
    icon: string;
    color?: string;
    size?: number;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ 
    activity, 
    icon, 
    color = Colors.primary, 
    size = 18 
}) => {
    const isBulk = activity.toLowerCase().includes('bulk');
    const isCut = activity.toLowerCase().includes('cut');
    
    // Default color for Glute Growth is peach-ish if it's the primary hammer
    const finalColor = activity === 'Glute Growth' ? '#FFB07C' : color;

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name={icon as any} size={size} color={finalColor} />
            {isBulk && (
                <Text style={[styles.suffix, { color: finalColor, fontSize: size * 0.7, marginTop: -(size * 0.15) }]}>+</Text>
            )}
            {isCut && (
                <Text style={[styles.suffix, { color: finalColor, fontSize: size * 0.7, marginTop: -(size * 0.15) }]}>-</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    suffix: {
        fontWeight: 'bold',
        marginLeft: 1,
    }
});
