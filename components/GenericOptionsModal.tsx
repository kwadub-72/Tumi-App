import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/shared/theme/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OptionItem {
    label: string;
    onPress: () => void;
    isDestructive?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
}

interface GenericOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    options: OptionItem[];
}

export default function GenericOptionsModal({
    visible,
    onClose,
    title = 'Options',
    options
}: GenericOptionsModalProps) {
    const handleOptionPress = (onPress: () => void, isDestructive?: boolean) => {
        if (isDestructive) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onClose();
        onPress();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <Text style={styles.headerTitle}>{title}</Text>
                        <View style={styles.divider} />
                    </View>
                    
                    <View style={styles.optionsContainer}>
                        {options.map((option, index) => {
                            const color = option.iconColor || (option.isDestructive ? Colors.theme.burntSienna : Colors.theme.softWhite);
                            return (
                                <React.Fragment key={index}>
                                    <TouchableOpacity 
                                        style={styles.option} 
                                        onPress={() => handleOptionPress(option.onPress, option.isDestructive)}
                                        activeOpacity={0.7}
                                    >
                                        {option.icon ? (
                                            <View style={styles.iconContainer}>
                                                <Ionicons name={option.icon} size={28} color={color} />
                                            </View>
                                        ) : null}
                                        <Text style={[styles.optionText, { color }]}>{option.label}</Text>
                                    </TouchableOpacity>
                                    {index < options.length - 1 && <View style={styles.itemDivider} />}
                                </React.Fragment>
                            );
                        })}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.theme.matteBlack,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        paddingTop: 12,
        marginBottom: 15,
    },
    handle: {
        width: 60,
        height: 4,
        backgroundColor: Colors.theme.dust,
        borderRadius: 2,
        opacity: 0.5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.theme.dust,
        marginTop: 8,
        marginBottom: 8,
    },
    divider: {
        width: '85%',
        height: 1,
        backgroundColor: 'rgba(237, 232, 213, 0.2)', // Dust with 0.2 opacity
    },
    optionsContainer: {
        paddingHorizontal: 35,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 15,
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 28,
        fontWeight: '500',
        letterSpacing: -0.5,
    },
    itemDivider: {
        height: 1,
        backgroundColor: 'rgba(237, 232, 213, 0.2)', // Dust with 0.2 opacity
        marginVertical: 10,
    }
});
