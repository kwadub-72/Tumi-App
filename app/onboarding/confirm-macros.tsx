import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function ConfirmMacrosScreen() {
    const router = useRouter();
    const { calories, protein, carbs, fats } = useOnboardingStore();

    const handleConfirm = () => {
        router.push('/onboarding/path');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.title}>Confirm macros</Text>
                <Text style={styles.subtitle}>Here are your Tribe-generated starting targets.</Text>

                {/* Total Calories Locked Card */}
                <View style={styles.calorieCard}>
                    <Text style={styles.calorieLabel}>Total Calories</Text>
                    <Text style={styles.calorieValue}>
                        {Math.round(calories || 0).toLocaleString()} <Text style={styles.calorieUnit}>kcal</Text>
                    </Text>
                </View>

                {/* Locked Macro Inputs Stack */}
                <View style={styles.formContainer}>
                    <View style={styles.inputPill}>
                        <Text style={styles.macroName}>Protein</Text>
                        <View style={styles.lockedValueContainer}>
                            <Text style={styles.lockedValueText}>{protein ?? 0}</Text>
                            <Text style={styles.unitText}>g</Text>
                        </View>
                    </View>

                    <View style={styles.inputPill}>
                        <Text style={styles.macroName}>Carbs</Text>
                        <View style={styles.lockedValueContainer}>
                            <Text style={styles.lockedValueText}>{carbs ?? 0}</Text>
                            <Text style={styles.unitText}>g</Text>
                        </View>
                    </View>

                    <View style={styles.inputPill}>
                        <Text style={styles.macroName}>Fats</Text>
                        <View style={styles.lockedValueContainer}>
                            <Text style={styles.lockedValueText}>{fats ?? 0}</Text>
                            <Text style={styles.unitText}>g</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.button}
                    onPress={handleConfirm}
                >
                    <Text style={styles.buttonText}>Confirm & Continue</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5, marginLeft: -5 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
    scrollContent: { paddingBottom: 40 },
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 24 },
    
    // Prominent locked calories card matching manual macros screen layout
    calorieCard: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: Colors.theme.harvestGold,
    },
    calorieLabel: {
        fontSize: 16,
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    calorieValue: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.theme.softWhite,
    },
    calorieUnit: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.dust,
    },

    // Stack container & uniform locked inputs
    formContainer: { gap: 12 },
    inputPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        height: 64,
    },
    macroName: {
        fontSize: 16,
        color: Colors.theme.harvestGold,
        fontWeight: '900',
    },
    lockedValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lockedValueText: {
        color: Colors.theme.softWhite,
        fontSize: 20,
        fontWeight: 'bold',
    },
    unitText: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginLeft: 4,
        fontWeight: '600',
        paddingTop: 2,
    },

    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
