import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

export default function PathScreen() {
    const router = useRouter();
    const [selectedPath, setSelectedPath] = useState<string | null>('map');

    const handleContinue = () => {
        if (selectedPath === 'map') {
            router.push({ pathname: '/discovery', params: { isOnboarding: 'true' } });
        } else {
            router.push('/onboarding/tribe');
        }
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

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Choose your path</Text>
                <Text style={styles.subtitle}>Decide how you'll update your macros to reach goals</Text>

                <View style={styles.cardsContainer}>
                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'map' && styles.cardSelected]}
                        onPress={() => setSelectedPath('map')}
                    >
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="map-outline" size={32} color={selectedPath === 'map' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'map' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'map' && styles.cardTitleSelected]}>Find a macro map</Text>
                        <Text style={styles.cardDescription}>Follow a nutrition map built from other users’ real journeys and expertise, or join someone’s journey live</Text>
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.card, selectedPath === 'manual' && styles.cardSelected]}
                        onPress={() => setSelectedPath('manual')}
                    >
                        <View style={styles.cardHeader}>
                            <Ionicons name="settings-outline" size={32} color={selectedPath === 'manual' ? Colors.theme.harvestGold : Colors.theme.dust} />
                            {selectedPath === 'manual' && <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />}
                        </View>
                        <Text style={[styles.cardTitle, selectedPath === 'manual' && styles.cardTitleSelected]}>Manual updates</Text>
                        <Text style={styles.cardDescription}>Manually update your macro targets whenever you feel it's right</Text>
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
