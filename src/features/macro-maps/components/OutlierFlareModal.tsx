import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OutlierFlareModalProps {
    visible: boolean;
    tribeName: string;
    tribeAvatar: any;
    onSkip: () => void;
}

export function OutlierFlareModal({ visible, tribeName, tribeAvatar, onSkip }: OutlierFlareModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.warningHeader}>
                        <Ionicons name="flame" size={32} color={Colors.theme.burntSienna} />
                        <Text style={styles.warningTitle}>Outlier Flare Active</Text>
                    </View>
                    
                    <View style={styles.tribeInfoRow}>
                        <Image source={typeof tribeAvatar === 'string' ? { uri: tribeAvatar } : tribeAvatar} style={styles.avatar} />
                        <Text style={styles.tribeName}>{tribeName}</Text>
                    </View>

                    <Text style={styles.description}>
                        This update has been flagged as an Outlier Flare by the creator. It represents an extreme or temporary shift not meant for automated scaling. You must manually skip this update.
                    </Text>

                    <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
                        <LinearGradient
                            colors={['#262525', '#1A1A1A']}
                            style={styles.skipGradient}
                        >
                            <Text style={styles.skipText}>Acknowledge & Skip</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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
        borderWidth: 2,
        borderColor: Colors.theme.burntSienna,
        shadowColor: Colors.theme.burntSienna,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 15,
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
        color: Colors.theme.burntSienna,
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
    skipBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.theme.burntSienna,
    },
    skipGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
