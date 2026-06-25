import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';

export default function TribeScreen() {
    const router = useRouter();
    const [selectedPath, setSelectedPath] = useState<string | null>('search');

    const handleContinue = () => {
        if (selectedPath === 'search') {
            router.push('/(tabs)/search?isOnboarding=true'); // Redirect to modified explore screen
        } else {
            router.push('/onboarding/privacy');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/onboarding/privacy')}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Find a Chribe</Text>
                <Text style={styles.subtitle}>Accountability is everything. Join a chribe or go it alone.</Text>

                <View style={styles.cardsContainer}>
                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'search' && styles.cardSelected]}
                        onPress={() => setSelectedPath('search')}
                    >
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="account-group-outline" size={32} color={selectedPath === 'search' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'search' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'search' && styles.cardTitleSelected]}>Search for a chribe</Text>
                        <Text style={styles.cardDescription}>Join a group of like-minded individuals to compete and share your journey.</Text>
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'solo' && styles.cardSelected]}
                        onPress={() => setSelectedPath('solo')}
                    >
                        <View style={styles.cardHeader}>
                            <Ionicons name="person-outline" size={32} color={selectedPath === 'solo' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'solo' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'solo' && styles.cardTitleSelected]}>Start solo</Text>
                        <Text style={styles.cardDescription}>Keep your journey focused. You can always join a chribe later.</Text>
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
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
        marginLeft: -5,
    },
    skipText: {
        color: Colors.theme.harvestGold,
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.theme.softWhite,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.theme.dust,
        marginBottom: 32,
    },
    cardsContainer: {
        gap: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: Colors.theme.charcoal,
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        position: 'relative',
    },
    cardSelected: {
        borderColor: Colors.theme.harvestGold,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        marginBottom: 8,
    },
    cardTitleSelected: {
        color: Colors.theme.harvestGold,
    },
    cardDescription: {
        fontSize: 14,
        color: Colors.theme.dust,
        lineHeight: 20,
    },
    recommendedBadge: {
        position: 'absolute',
        top: -12,
        right: 20,
        backgroundColor: Colors.theme.harvestGold,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recommendedText: {
        color: Colors.theme.matteBlack,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
    button: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
