import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';
import { useUserStore, UnitSystem } from '@/store/UserStore';

export default function UnitsScreen() {
    const router = useRouter();
    const { units, setUnits } = useUserStore();

    const renderUnitOption = (id: UnitSystem, label: string, description: string) => {
        const isSelected = units === id;
        return (
            <TouchableOpacity
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setUnits(id)}
            >
                <View style={styles.optionHeader}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
                </View>
                <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionActive]}>{description}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Units of Measurement</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Preferred System</Text>

                {renderUnitOption(
                    'imperial',
                    'Imperial System',
                    'lbs, inches, ft, miles'
                )}

                {renderUnitOption(
                    'metric',
                    'Metric System',
                    'kg, cm, m, km'
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        This change will only apply to your view. Other users will see measurements in their own preferred units.
                    </Text>
                </View>
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
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    content: {
        paddingHorizontal: 20,
        gap: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 5,
        opacity: 0.8,
    },
    optionCard: {
        backgroundColor: Colors.card,
        borderRadius: 25,
        padding: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardActive: {
        borderColor: Colors.primary,
        backgroundColor: '#D1DEC7', // Slightly lighter sage for active
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    optionLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        opacity: 0.8,
    },
    optionLabelActive: {
        opacity: 1,
    },
    optionDescription: {
        fontSize: 14,
        color: Colors.primary,
        opacity: 0.6,
    },
    optionDescriptionActive: {
        opacity: 0.8,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(45, 58, 38, 0.05)',
        padding: 15,
        borderRadius: 15,
        gap: 10,
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.primary,
        lineHeight: 18,
        opacity: 0.7,
    },
});
