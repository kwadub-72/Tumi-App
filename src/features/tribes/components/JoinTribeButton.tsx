import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TribeJoinStatus } from '@/src/shared/models/types';
import { Colors } from '@/src/shared/theme/Colors';

interface JoinTribeButtonProps {
    status: TribeJoinStatus;
    onPress: () => void;
}

export default function JoinTribeButton({ status, onPress }: JoinTribeButtonProps) {
    const isNone = status === 'none';
    const isRequested = status === 'requested';
    const isJoined = status === 'joined';

    const bgColor = isNone ? Colors.theme.dust : (isRequested ? '#787878' : Colors.primary);
    const dotsColor = isNone ? Colors.primary : (isRequested ? 'white' : Colors.theme.dust);
    const iconColor = isNone ? Colors.primary : (isRequested ? 'white' : Colors.theme.dust);

    // ...
    // ...
    return (
        <TouchableOpacity style={[styles.container, { backgroundColor: bgColor }]} onPress={onPress}>
            <View style={styles.dotsContainer}>
                <View style={[styles.dot, { borderColor: dotsColor, marginBottom: 3 }]} />
                <View style={styles.dotsRow}>
                    <View style={[styles.dot, { borderColor: dotsColor }]} />
                    <View style={[styles.dot, { borderColor: dotsColor }]} />
                </View>
            </View>
            {isNone && (
                <MaterialCommunityIcons name="plus" size={14} color={iconColor} style={styles.cornerIcon} />
            )}
            {isJoined && (
                <MaterialCommunityIcons name="check" size={14} color={iconColor} style={styles.cornerIcon} />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    dotsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        // Removed marginRight offset, should be perfectly centered now
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 3, // slightly tighter
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    cornerIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
    }
});
