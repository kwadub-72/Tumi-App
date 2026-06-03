import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/Colors';

import { resolveActivityIcon } from '../constants/Activities';

interface ActivityIconProps {
    activity: string;
    icon?: string | null;
    color?: string;
    size?: number;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ 
    activity, 
    icon, 
    color = Colors.primary, 
    size = 18 
}) => {
    const safeActivity = activity || '';
    const isBulk = safeActivity.toLowerCase().includes('bulk');
    const isCut = safeActivity.toLowerCase().includes('cut');
    
    // Resolve the icon name dynamically if the provided icon is null or empty
    const finalIcon = resolveActivityIcon(activity, icon || undefined);
    const finalColor = color;

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name={finalIcon as any} size={size} color={finalColor} />
            {isBulk && (
                <Text style={[styles.suffix, { color: finalColor, fontSize: size * 0.7 }]}>+</Text>
            )}
            {isCut && (
                <Text style={[styles.suffix, { color: finalColor, fontSize: size * 0.7 }]}>-</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    suffix: {
        fontWeight: 'bold',
        marginLeft: 2,
    }
});
