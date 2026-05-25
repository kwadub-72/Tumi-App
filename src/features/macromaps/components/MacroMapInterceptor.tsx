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
                    <Ionicons name="flash" size={28} color={Colors.theme.harvestGold} />
                    <Text style={styles.title}>Live Map Adjustment</Text>
                </View>

                <Text style={styles.subtitle}>
                    {activePrompt.creator_name} has pushed a live macro update to your active map. Resolve this adjustment below:
                </Text>

                {/* Macro Comparison Grid */}
                <View style={styles.comparisonGrid}>
                    <View style={styles.gridHeader}>
                        <Text style={styles.gridHeaderCell}>Macro</Text>
                        <Text style={styles.gridHeaderCell}>Current</Text>
                        <Text style={styles.gridHeaderCell}>New</Text>
                        <Text style={styles.gridHeaderCell}>Change</Text>
                    </View>

                    {/* Calories Row */}
                    <View style={styles.gridRow}>
                        <Text style={styles.macroLabelCell}>Calories</Text>
                        <Text style={styles.macroValueCell}>{activePrompt.old_macros.calories} kcal</Text>
                        <Text style={[styles.macroValueCell, { color: Colors.theme.harvestGold }]}>{activePrompt.new_macros.calories} kcal</Text>
                        <Text style={[styles.macroDiffCell, { color: activePrompt.new_macros.calories >= activePrompt.old_macros.calories ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                            {activePrompt.new_macros.calories >= activePrompt.old_macros.calories ? '+' : ''}
                            {activePrompt.new_macros.calories - activePrompt.old_macros.calories}
                        </Text>
                    </View>

                    {/* Protein Row */}
                    <View style={styles.gridRow}>
                        <Text style={styles.macroLabelCell}>Protein</Text>
                        <Text style={styles.macroValueCell}>{activePrompt.old_macros.p}g</Text>
                        <Text style={[styles.macroValueCell, { color: Colors.theme.harvestGold }]}>{activePrompt.new_macros.p}g</Text>
                        <Text style={[styles.macroDiffCell, { color: activePrompt.new_macros.p >= activePrompt.old_macros.p ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                            {activePrompt.new_macros.p >= activePrompt.old_macros.p ? '+' : ''}
                            {activePrompt.new_macros.p - activePrompt.old_macros.p}g
                        </Text>
                    </View>

                    {/* Carbs Row */}
                    <View style={styles.gridRow}>
                        <Text style={styles.macroLabelCell}>Carbs</Text>
                        <Text style={styles.macroValueCell}>{activePrompt.old_macros.c}g</Text>
                        <Text style={[styles.macroValueCell, { color: Colors.theme.harvestGold }]}>{activePrompt.new_macros.c}g</Text>
                        <Text style={[styles.macroDiffCell, { color: activePrompt.new_macros.c >= activePrompt.old_macros.c ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                            {activePrompt.new_macros.c >= activePrompt.old_macros.c ? '+' : ''}
                            {activePrompt.new_macros.c - activePrompt.old_macros.c}g
                        </Text>
                    </View>

                    {/* Fats Row */}
                    <View style={styles.gridRow}>
                        <Text style={styles.macroLabelCell}>Fats</Text>
                        <Text style={styles.macroValueCell}>{activePrompt.old_macros.f}g</Text>
                        <Text style={[styles.macroValueCell, { color: Colors.theme.harvestGold }]}>{activePrompt.new_macros.f}g</Text>
                        <Text style={[styles.macroDiffCell, { color: activePrompt.new_macros.f >= activePrompt.old_macros.f ? Colors.theme.oliveDrab : Colors.theme.burntSienna }]}>
                            {activePrompt.new_macros.f >= activePrompt.old_macros.f ? '+' : ''}
                            {activePrompt.new_macros.f - activePrompt.old_macros.f}g
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={accept}>
                        <Text style={styles.buttonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.postponeButton]} onPress={postpone}>
                        <Text style={[styles.buttonText, { color: Colors.theme.softWhite }]}>Postpone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={rejectOrSkip}>
                        <Text style={[styles.buttonText, { color: Colors.theme.softWhite }]}>Reject</Text>
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
    comparisonGrid: {
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        gap: 8,
    },
    gridHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 6,
        marginBottom: 4,
    },
    gridHeaderCell: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: Colors.theme.dust,
        textAlign: 'center',
    },
    gridRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    macroLabelCell: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        textAlign: 'left',
    },
    macroValueCell: {
        flex: 1,
        fontSize: 14,
        color: Colors.theme.dust,
        textAlign: 'center',
    },
    macroDiffCell: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
    },
});
