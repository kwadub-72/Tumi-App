import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../src/shared/theme/Colors';

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PostOptionsModal({ visible, onClose }: PostOptionsModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content}>
                    <View style={styles.handle} />

                    <TouchableOpacity style={styles.optionRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-remove" size={24} color="#2D3A26" />
                        </View>
                        <Text style={styles.optionText}>Unfollow</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.optionRow, styles.reportRow]}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="flag" size={24} color="white" />
                        </View>
                        <Text style={[styles.optionText, styles.reportText]}>Report</Text>
                    </TouchableOpacity>

                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#2D3A26', // Dark green matching the reference
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#fff',
        opacity: 0.3,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.sage, // Light sage background for Unfollow
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        height: 70,
    },
    reportRow: {
        backgroundColor: '#D99898', // Reddish/Pink background for Report
    },
    iconContainer: {
        marginRight: 16,
    },
    optionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3A26',
    },
    reportText: {
        color: '#8B0000', // Dark red text
    }
});
