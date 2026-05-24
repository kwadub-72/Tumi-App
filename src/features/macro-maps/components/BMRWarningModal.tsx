import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface BMRWarningModalProps {
    visible: boolean;
    tribeName: string;
    tribeAvatar: any;
    onProceed: () => void;
    onCancel: () => void;
}

export function BMRWarningModal({ visible, tribeName, tribeAvatar, onProceed, onCancel }: BMRWarningModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.warningHeader}>
                        <Ionicons name="warning" size={32} color={Colors.theme.harvestGold} />
                        <Text style={styles.warningTitle}>BMR Drop Detected</Text>
                    </View>
                    
                    <View style={styles.tribeInfoRow}>
                        <Image source={typeof tribeAvatar === 'string' ? { uri: tribeAvatar } : tribeAvatar} style={styles.avatar} />
                        <Text style={styles.tribeName}>{tribeName}</Text>
                    </View>

                    <Text style={styles.description}>
                        The proposed macro update scales below your estimated Basal Metabolic Rate (BMR). This may lead to unsustainable weight loss or fatigue.
                    </Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.proceedBtn} onPress={onProceed}>
                            <LinearGradient
                                colors={['#8B4513', '#A0522D']}
                                style={styles.proceedGradient}
                            >
                                <Text style={styles.proceedText}>Proceed Anyway</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.theme.burntSienna,
        shadowColor: Colors.theme.burntSienna,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    tribeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.matteBlack,
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.theme.charcoal,
    },
    tribeName: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    description: {
        color: Colors.theme.dust,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: Colors.theme.matteBlack,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cancelText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    proceedBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    proceedGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proceedText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
