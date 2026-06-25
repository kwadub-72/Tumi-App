import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

export default function MaintenanceScreen() {
    const router = useRouter();
    const [selectedPath, setSelectedPath] = useState<string | null>('generated');

    const handleContinue = () => {
        if (selectedPath === 'generated') {
            router.push('/onboarding/macros');
        } else if (selectedPath === 'manual') {
            router.push('/onboarding/manual-macros');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Set your maintenance</Text>
                <Text style={styles.subtitle}>Let us calculate your baseline or enter it yourself.</Text>

                <View style={styles.cardsContainer}>
                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'generated' && styles.cardSelected]}
                        onPress={() => setSelectedPath('generated')}
                    >
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="calculator-variant-outline" size={32} color={selectedPath === 'generated' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'generated' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'generated' && styles.cardTitleSelected]}>Chribe-generated</Text>
                        <Text style={styles.cardDescription}>We'll use your height, weight, activity level, and lifting experience to generate your starting macros.</Text>
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'manual' && styles.cardSelected]}
                        onPress={() => setSelectedPath('manual')}
                    >
                        <View style={styles.cardHeader}>
                            <Ionicons name="hand-right-outline" size={32} color={selectedPath === 'manual' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'manual' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'manual' && styles.cardTitleSelected]}>I know my maintenance</Text>
                        <Text style={styles.cardDescription}>Manually input your own baseline maintenance calories.</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.button, !selectedPath && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={!selectedPath}
                >
                    <Text style={styles.buttonText}>Continue</Text>
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
    title: { fontSize: 32, fontWeight: '900', color: Colors.theme.softWhite, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.theme.dust, marginBottom: 32 },
    cardsContainer: { gap: 16, paddingBottom: 20 },
    card: { backgroundColor: Colors.theme.charcoal, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.05)', position: 'relative' },
    cardSelected: { borderColor: Colors.theme.harvestGold, backgroundColor: 'rgba(218, 165, 32, 0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.theme.softWhite, marginBottom: 8 },
    cardTitleSelected: { color: Colors.theme.harvestGold },
    cardDescription: { fontSize: 14, color: Colors.theme.dust, lineHeight: 20 },
    recommendedBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: Colors.theme.harvestGold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    recommendedText: { color: Colors.theme.matteBlack, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    footer: { padding: 24, paddingBottom: 40 },
    button: { backgroundColor: Colors.theme.harvestGold, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: Colors.theme.matteBlack, fontSize: 16, fontWeight: 'bold' },
});
