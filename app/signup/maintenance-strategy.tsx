import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, UIManager, LayoutAnimation, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';
const LIGHT_SAGE = '#C4D6C4'; // Unselected state? Or just transparent/outlined?

export default function SignupMaintenanceStrategy() {
    const router = useRouter();
    const [strategy, setStrategy] = useState<'tribe' | 'manual' | null>(null);

    const handleNext = () => {
        if (!strategy) return;
        if (strategy === 'manual') {
            router.push('/signup/manual-macros');
        } else {
            // Tribe-generated
            router.push('/signup/tribe-macros');
        }
    };

    const OptionCard = ({ type, title, subtitle, desc, isSelected, onPress }: any) => (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Text style={[styles.cardSubtitle, isSelected ? { color: '#C4D6C4' } : { color: DARK_GREEN }]}>{subtitle}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDesc}>
                {desc}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                </TouchableOpacity>
                <TabonoLogo size={40} color={DARK_GREEN} />
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Set your{'\n'}maintenance*</Text>

                <View style={styles.cardsContainer}>
                    <OptionCard
                        type="tribe"
                        title="Tribe-generated"
                        subtitle="Recommended"
                        desc="Let Tribe generate your macros based on height, weight, bodyfat estimate, lifestyle, and training focus"
                        isSelected={strategy === 'tribe'}
                        onPress={() => setStrategy('tribe')}
                    />

                    <OptionCard
                        type="manual"
                        title="Manual"
                        subtitle="Best for users who know their targets"
                        desc="Manually set maintenance macro targets"
                        isSelected={strategy === 'manual'}
                        onPress={() => setStrategy('manual')}
                    />
                </View>

                <Text style={styles.note}>*Can be edited later</Text>

                {/* Next Button */}
                {strategy && (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        color: DARK_GREEN,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 30,
        marginTop: 10,
    },
    cardsContainer: {
        width: '100%',
        gap: 20,
    },
    card: {
        backgroundColor: SAGE_GREEN,
        borderRadius: 30,
        padding: 20,
        borderWidth: 1,
        borderColor: DARK_GREEN,
        alignItems: 'center',
    },
    selectedCard: {
        backgroundColor: '#4F6352', 
        borderColor: DARK_GREEN,
    },
    cardSubtitle: {
        fontSize: 12,
        fontStyle: 'italic',
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    cardTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    cardDots: {
        fontSize: 24,
        color: 'white',
        textAlign: 'center',
        marginTop: -10,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    cardDesc: {
        fontSize: 14,
        color: 'white',
        textAlign: 'center',
        lineHeight: 20,
    },
    note: {
        marginTop: 20,
        color: 'rgba(47, 58, 39, 0.6)',
        fontSize: 12,
        alignSelf: 'flex-start', // Left aligned
    },
    nextButton: {
        position: 'absolute',
        bottom: 50,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
});
