import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const EXPERIENCE_OPTIONS = [
    { name: 'Advanced lifter', description: 'Consistent resistance training for 3+ years, typically 4–7 sessions per week, with structured and progressive programming focused on hypertrophy, strength, or power (e.g., bodybuilder, powerlifter, American football player).' },
    { name: 'General lifter (Casual)', description: 'Regular physical activity over the past 3+ years, with less structured or less frequent resistance training, or training primarily focused on general fitness, cardiovascular exercise, mobility, or core stability (e.g., recreational exerciser, yoga or Pilates practitioner, cardio-focused training).' }
];

const ACTIVITY_OPTIONS = [
    { name: 'Sedentary', description: 'Mostly seated during the day with limited movement (~30–45 minutes of daily walking or routine activity). Examples: desk-based or office work.' },
    { name: 'Lightly active', description: 'On your feet for a significant portion of the day with regular standing or walking and minimal physical labor. Examples: nurse, barista, teacher, retail salesperson.' },
    { name: 'Active', description: 'On your feet the majority of the day with frequent movement and moderate physical tasks (e.g., lifting or carrying). Examples: Mechanic, custodian, food server.' },
    { name: 'Very active', description: 'Physically demanding work for most of the day involving sustained exertion or heavy lifting. Examples: Landscaper, mover, farm labor, baggage handler.' }
];

const ExpandableOptionCard = ({ 
    title, 
    description, 
    isSelected, 
    onSelect 
}: { 
    title: string; 
    description: string; 
    isSelected: boolean; 
    onSelect: () => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <TouchableOpacity 
            style={[styles.card, isSelected && styles.cardSelected]} 
            onPress={onSelect}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.theme.harvestGold} style={{ marginRight: 8 }} />}
                    <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>{title}</Text>
                </View>
                <TouchableOpacity 
                    onPress={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    style={styles.ellipsisBtn}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color={Colors.theme.dust} />
                </TouchableOpacity>
            </View>
            
            {isExpanded && (
                <View style={styles.cardBody}>
                    <Text style={styles.cardDescription}>{description}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function MacrosScreen() {
    const router = useRouter();
    const store = useOnboardingStore();

    // Default to the store state if already selected
    const [selectedLiftingExperience, setSelectedLiftingExperience] = useState<string | null>(store.liftingExperience || null);
    const [selectedActivityLevel, setSelectedActivityLevel] = useState<string | null>(null);

    const isInputsValid = selectedLiftingExperience !== null && selectedActivityLevel !== null;

    const handleGenerate = () => {
        if (!isInputsValid) return;
        
        store.setLiftingExperience(selectedLiftingExperience);
        
        if ('generateAndSetMacros' in store) {
            (store as any).generateAndSetMacros(selectedLiftingExperience, selectedActivityLevel);
        }
        
        router.push('/onboarding/confirm-macros');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                    <TabonoLogo size={32} color={Colors.theme.harvestGold} />
                </View>
                <View style={{ width: 28 }} pointerEvents="none" />
            </View>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
            >
                <Text style={styles.title}>Chribe-generated macros</Text>
                <Text style={styles.subtitle}>
                    We’ll use your physiology and activity data to calculate custom baseline targets.
                </Text>

                <View style={styles.section} pointerEvents="box-none">
                    <Text style={styles.sectionTitle}>1. Lifting Experience</Text>
                    <View style={styles.list} pointerEvents="box-none">
                        {EXPERIENCE_OPTIONS.map(option => (
                            <ExpandableOptionCard 
                                key={option.name}
                                title={option.name}
                                description={option.description}
                                isSelected={selectedLiftingExperience === option.name}
                                onSelect={() => setSelectedLiftingExperience(option.name)}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.section} pointerEvents="box-none">
                    <Text style={styles.sectionTitle}>2. Activity Level</Text>
                    <View style={styles.list} pointerEvents="box-none">
                        {ACTIVITY_OPTIONS.map(option => (
                            <ExpandableOptionCard 
                                key={option.name}
                                title={option.name}
                                description={option.description}
                                isSelected={selectedActivityLevel === option.name}
                                onSelect={() => setSelectedActivityLevel(option.name)}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.button, (!selectedLiftingExperience || !selectedActivityLevel) && styles.buttonDisabled]}
                    onPress={handleGenerate}
                    disabled={!selectedLiftingExperience || !selectedActivityLevel}
                >
                    <Text style={styles.buttonText}>Generate Macros</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5, marginLeft: -5 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
    scrollContent: { paddingBottom: 40 },
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 32, lineHeight: 22 },
    
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.theme.harvestGold, marginBottom: 16 },
    list: { gap: 12 },
    
    card: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardSelected: {
        borderColor: Colors.theme.harvestGold,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    cardTitleSelected: {
        color: Colors.theme.harvestGold,
    },
    ellipsisBtn: {
        padding: 4,
    },
    cardBody: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardDescription: {
        fontSize: 14,
        color: 'rgba(237, 232, 213, 0.7)',
        lineHeight: 20,
    },
    
    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
