import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function ManualMacrosScreen() {
    const router = useRouter();
    const { setMacros } = useOnboardingStore();

    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fats, setFats] = useState('');

    const proteinRef = useRef<TextInput>(null);
    const carbsRef = useRef<TextInput>(null);
    const fatsRef = useRef<TextInput>(null);

    const calculatedCalories = useMemo(() => {
        return (Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fats) || 0) * 9;
    }, [protein, carbs, fats]);

    const isFormValid = 
        Number(protein) > 0 &&
        Number(carbs) > 0 &&
        Number(fats) > 0;

    const handleContinue = () => {
        if (!isFormValid) return;
        
        setMacros({
            protein: Number(protein),
            carbs: Number(carbs),
            fats: Number(fats),
            calories: calculatedCalories
        });
        
        router.push('/onboarding/path');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex1}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.content} 
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.title}>Manual Entry</Text>
                            <Text style={styles.subtitle}>Enter your daily maintenance targets.</Text>

                            <View style={styles.calorieCard}>
                                <Text style={styles.calorieLabel}>Total Calories</Text>
                                <Text style={styles.calorieValue}>
                                    {Math.round(calculatedCalories).toLocaleString()} <Text style={styles.calorieUnit}>kcal</Text>
                                </Text>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputPill}>
                                    <Text style={styles.macroName}>Protein</Text>
                                    <TextInput
                                        ref={proteinRef}
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor={Colors.theme.dust}
                                        keyboardType="numeric"
                                        returnKeyType="next"
                                        value={protein}
                                        onChangeText={setProtein}
                                        onSubmitEditing={() => carbsRef.current?.focus()}
                                        blurOnSubmit={false}
                                        textAlign="right"
                                    />
                                    <Text style={styles.unitText}>g</Text>
                                </View>

                                <View style={styles.inputPill}>
                                    <Text style={styles.macroName}>Carbs</Text>
                                    <TextInput
                                        ref={carbsRef}
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor={Colors.theme.dust}
                                        keyboardType="numeric"
                                        returnKeyType="next"
                                        value={carbs}
                                        onChangeText={setCarbs}
                                        onSubmitEditing={() => fatsRef.current?.focus()}
                                        blurOnSubmit={false}
                                        textAlign="right"
                                    />
                                    <Text style={styles.unitText}>g</Text>
                                </View>

                                <View style={styles.inputPill}>
                                    <Text style={styles.macroName}>Fats</Text>
                                    <TextInput
                                        ref={fatsRef}
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor={Colors.theme.dust}
                                        keyboardType="numeric"
                                        returnKeyType="done"
                                        value={fats}
                                        onChangeText={setFats}
                                        onSubmitEditing={Keyboard.dismiss}
                                        textAlign="right"
                                    />
                                    <Text style={styles.unitText}>g</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.button, !isFormValid && styles.buttonDisabled]}
                                onPress={handleContinue}
                                disabled={!isFormValid}
                            >
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex1: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5, marginLeft: -5 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 24 },
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
    formContainer: { gap: 12, paddingBottom: 40 },
    inputPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        height: 64, // fixed height for consistency
    },
    macroName: {
        fontSize: 16,
        color: Colors.theme.harvestGold,
        fontWeight: '900',
    },
    input: {
        flex: 1,
        color: Colors.theme.softWhite,
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 12,
        paddingVertical: 4,
    },
    unitText: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginLeft: 4,
        fontWeight: '600',
        paddingTop: 2, // minor alignment tweak
    },
    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
