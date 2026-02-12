import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface TribeInfoModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    description: string;
    type: 'icon-title' | 'pill'; // 'icon-title' for Image 1 style, 'pill' for Image 3 style
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    iconColor?: string;
    pillColor?: string; // For the pill background
}

export default function TribeInfoModal({
    visible,
    onClose,
    title,
    description,
    type,
    iconName,
    iconColor = 'white',
    pillColor = '#4F6352'
}: TribeInfoModalProps) {
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
                    {type === 'icon-title' ? (
                        <View style={styles.alertBox}>
                            <View style={styles.alertHeader}>
                                <Text style={styles.alertTitle}>{title}</Text>
                                <MaterialCommunityIcons name={iconName} size={24} color="white" style={{ marginLeft: 8 }} />
                            </View>
                            <Text style={styles.alertDesc}>{description}</Text>
                        </View>
                    ) : (
                        <View style={[styles.pillBox, { backgroundColor: pillColor }]}>
                            <View style={styles.pillIconContainer}>
                                <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />
                            </View>
                            <View style={styles.pillContent}>
                                <Text style={styles.pillTitle}>{title}</Text>
                                <Text style={styles.pillDesc}>{description}</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>
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
    contentContainer: {
        width: '90%',
        alignItems: 'center',
    },
    // Image 1 Style: Alert Box
    alertBox: {
        backgroundColor: '#4F6352', // Dark Green
        borderRadius: 30, // Large Radius
        paddingVertical: 25,
        paddingHorizontal: 30,
        alignItems: 'center',
        width: '85%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        fontStyle: 'italic', // Matches Image 1
    },
    alertDesc: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Image 3 Style: Pill Box
    pillBox: {
        flexDirection: 'row',
        borderRadius: 40,
        padding: 15,
        alignItems: 'center',
        width: '90%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    pillIconContainer: {
        marginRight: 15,
        marginLeft: 10,
    },
    pillContent: {
        flex: 1,
    },
    pillTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginBottom: 2,
    },
    pillDesc: {
        color: 'white',
        fontSize: 14,
        fontStyle: 'italic',
    }
});
