import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useMacroMapPromptStore } from '../store/useMacroMapPromptStore';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BMRWarningModal } from '@/src/features/macro-maps/components/BMRWarningModal';
import { OutlierFlareModal } from '@/src/features/macro-maps/components/OutlierFlareModal';
import { useAuthStore } from '@/store/AuthStore';

const { width, height } = Dimensions.get('window');

export function MacroMapInterceptor() {
    const session = useAuthStore((state) => state.session);
    const userId = session?.user?.id;
    const { activePrompt, accept, postpone, rejectOrSkip, revert, fetchActiveResolutions } = useMacroMapPromptStore();

    useEffect(() => {
        if (userId) {
            fetchActiveResolutions(userId);
        }
    }, [userId, fetchActiveResolutions]);

    if (!activePrompt) return null;

    // Conditionally show Outlier Flare Modal
    if (activePrompt.is_outlier_flare) {
        return (
            <OutlierFlareModal
                visible={true}
                tribeName={activePrompt.creator_name}
                tribeAvatar={require('@/assets/images/react-logo.png')} // Mock avatar fallback
                onSkip={rejectOrSkip}
            />
        );
    }

    // Conditionally show BMR Warning Modal
    if (activePrompt.bmr_warning) {
        return (
            <BMRWarningModal
                visible={true}
                tribeName={activePrompt.creator_name}
                tribeAvatar={require('@/assets/images/react-logo.png')} // Mock avatar fallback
                onProceed={accept}
                onCancel={postpone}
            />
        );
    }

    // Standard map update
    return (
        <View style={styles.overlay}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.card}>
                <View style={styles.header}>
                    <Ionicons name="map" size={28} color={Colors.theme.harvestGold} />
                    <Text style={styles.title}>Map Update</Text>
                </View>

                <Text style={styles.subtitle}>
                    {activePrompt.creator_name} has updated their macros.
                </Text>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={accept}>
                        <Text style={styles.buttonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.postponeButton]} onPress={postpone}>
                        <Text style={styles.buttonText}>Postpone (7 Days)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={rejectOrSkip}>
                        <Text style={styles.buttonText}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.revertButton]} onPress={revert}>
                        <Text style={styles.buttonText}>Revert</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it sits on top of everything
    },
    card: {
        width: '85%',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.theme.softWhite,
        textAlign: 'center',
        marginBottom: 20,
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.theme.burntSienna,
    },
    warningText: {
        color: Colors.theme.softWhite,
        fontSize: 14,
        marginLeft: 10,
        flex: 1,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: Colors.theme.harvestGold,
    },
    postponeButton: {
        backgroundColor: Colors.theme.dust,
    },
    rejectButton: {
        backgroundColor: Colors.theme.burntSienna,
    },
    revertButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.theme.dust,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.matteBlack,
    },
});
