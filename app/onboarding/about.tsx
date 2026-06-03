import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { HeightRolodex } from '@/src/shared/components/HeightRolodex';

export default function AboutScreen() {
    const router = useRouter();
    const store = useOnboardingStore();

    const [sex, setLocalSex] = useState<string | null>(store.sex);
    const [unitSystem, setLocalUnitSystem] = useState<'imperial' | 'metric'>(store.unitSystem || 'imperial');
    
    // Height state
    const [imperialHeight, setImperialHeight] = useState<{ feet: number; inches: number } | undefined>(
        store.rawHeight && typeof store.rawHeight === 'object' ? store.rawHeight : undefined
    );
    const [metricHeight, setMetricHeight] = useState<string>(
        store.rawHeight && typeof store.rawHeight !== 'object' ? String(store.rawHeight) : ''
    );
    
    // Weight state
    const [weight, setWeight] = useState<string>(store.rawWeight || '');
    
    // Modal state
    const [isHeightModalOpen, setIsHeightModalOpen] = useState(false);

    const isHeightValid = unitSystem === 'imperial' 
        ? imperialHeight !== undefined 
        : metricHeight.trim().length > 0 && !isNaN(Number(metricHeight));
        
    const isWeightValid = weight.trim().length > 0 && !isNaN(Number(weight));
    const isSexValid = sex !== null;

    const isFormValid = isHeightValid && isWeightValid && isSexValid;

    const handleContinue = () => {
        if (!isFormValid) return;
        
        store.setSex(sex);
        store.setUnitSystem(unitSystem);
        store.setRawHeight(unitSystem === 'imperial' ? imperialHeight : metricHeight);
        store.setRawWeight(weight);
        
        router.push('/onboarding/maintenance');
    };

    const handleUnitToggle = (system: 'imperial' | 'metric') => {
        setLocalUnitSystem(system);
        // Clear conflicting height/weight assumptions when switching to prevent bad conversions
        setWeight('');
        if (system === 'metric') setMetricHeight('');
        else setImperialHeight(undefined);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView 
                style={styles.flex1} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex1}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.content} 
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            nestedScrollEnabled={true}
                            scrollEventThrottle={16}
                        >
                            <Text style={styles.title}>Tell us a bit about yourself</Text>
                            <Text style={styles.subtitle}>
                                We’ll use this to match you with tribes, users, and maps tailored to your goals. Choose whether to show this on your profile anytime in your privacy settings.
                            </Text>

                            <View style={styles.section} pointerEvents="box-none">
                                <Text style={styles.sectionTitle}>Biological Sex</Text>
                                <View style={styles.pillGroup} pointerEvents="box-none">
                                    {['Male', 'Female'].map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.pill, sex === option && styles.pillSelected]}
                                            onPress={() => setLocalSex(option)}
                                        >
                                            <Text style={[styles.pillText, sex === option && styles.pillTextSelected]}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.section} pointerEvents="box-none">
                                <View style={styles.sectionHeaderRow} pointerEvents="box-none">
                                    <Text style={styles.sectionTitle}>Metrics</Text>
                                    <View style={styles.toggleGroup}>
                                        <TouchableOpacity
                                            style={[styles.togglePill, unitSystem === 'imperial' && styles.togglePillSelected]}
                                            onPress={() => handleUnitToggle('imperial')}
                                        >
                                            <Text style={[styles.toggleText, unitSystem === 'imperial' && styles.toggleTextSelected]}>Imperial</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.togglePill, unitSystem === 'metric' && styles.togglePillSelected]}
                                            onPress={() => handleUnitToggle('metric')}
                                        >
                                            <Text style={[styles.toggleText, unitSystem === 'metric' && styles.toggleTextSelected]}>Metric</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {unitSystem === 'imperial' ? (
                                    <View style={styles.inputContainer} pointerEvents="box-none">
                                        <Text style={styles.inputLabel}>Height</Text>
                                        <TouchableOpacity
                                            style={styles.input}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setIsHeightModalOpen(true);
                                            }}
                                        >
                                            <Text style={[styles.inputText, !imperialHeight && styles.inputTextPlaceholder]}>
                                                {imperialHeight ? `${imperialHeight.feet} ft ${imperialHeight.inches} in` : "e.g. 5 ft 10 in"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.inputContainer} pointerEvents="box-none">
                                        <Text style={styles.inputLabel}>Height</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="175 cm"
                                            placeholderTextColor={Colors.theme.dust}
                                            keyboardType="decimal-pad"
                                            returnKeyType="next"
                                            value={metricHeight}
                                            onChangeText={setMetricHeight}
                                        />
                                    </View>
                                )}

                                <View style={styles.inputContainer} pointerEvents="box-none">
                                    <Text style={styles.inputLabel}>Weight</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={unitSystem === 'imperial' ? "e.g. 180.5 lbs" : "e.g. 80.2 kg"}
                                        placeholderTextColor={Colors.theme.dust}
                                        keyboardType="decimal-pad"
                                        returnKeyType="done"
                                        value={weight}
                                        onChangeText={setWeight}
                                        onSubmitEditing={Keyboard.dismiss}
                                    />
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

            <HeightRolodex 
                visible={isHeightModalOpen} 
                onClose={() => setIsHeightModalOpen(false)}
                value={imperialHeight} 
                onChange={setImperialHeight} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex1: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5, marginLeft: -5 },
    content: { flex: 1, paddingTop: 10 },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
        paddingHorizontal: 24,
    },
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 32, lineHeight: 22 },
    
    section: {
        marginBottom: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 16,
    },
    
    pillGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    pill: {
        backgroundColor: Colors.theme.charcoal,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    pillSelected: {
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        borderColor: Colors.theme.harvestGold,
    },
    pillText: {
        color: Colors.theme.dust,
        fontSize: 16,
        fontWeight: '600',
    },
    pillTextSelected: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
    },

    toggleGroup: {
        flexDirection: 'row',
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 20,
        padding: 4,
        marginBottom: 16, // offset bottom margin because sectionTitle has it
    },
    togglePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    togglePillSelected: {
        backgroundColor: Colors.theme.harvestGold,
    },
    toggleText: {
        color: Colors.theme.dust,
        fontWeight: 'bold',
        fontSize: 14,
    },
    toggleTextSelected: {
        color: Colors.theme.matteBlack,
    },

    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        color: Colors.theme.softWhite,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        color: Colors.theme.softWhite,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
    },
    inputText: {
        color: Colors.theme.softWhite,
        fontSize: 16,
    },
    inputTextPlaceholder: {
        color: Colors.theme.dust,
    },

    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
