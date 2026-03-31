import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, UIManager, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupConfirmMacros() {
    const router = useRouter();
    const { calories, p, c, f } = useLocalSearchParams();

    const handleNext = () => {
        router.push('/signup/update-plan');
    };

    const MacroPill = ({ icon, value }: any) => (
        <View style={styles.macroPill}>
            {icon && <MaterialCommunityIcons name={icon} size={28} color={DARK_GREEN} style={{ marginLeft: 20, marginRight: 10 }} />}
            <Text style={styles.macroText}>{value}</Text>
        </View>
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
                <Text style={styles.title}>Confirm macros</Text>

                <View style={styles.list}>
                    {/* Calories */}
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="fire" size={30} color={DARK_GREEN} />
                        <View style={[styles.pill, styles.caloriesPill]}>
                            <Text style={styles.caloriesText}>{calories || 3000} cals</Text>
                        </View>
                    </View>

                    {/* Protein */}
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="food-drumstick" size={30} color={DARK_GREEN} />
                        <View style={styles.pill}>
                            <Text style={styles.macroText}>{p || 200}g</Text>
                        </View>
                    </View>

                    {/* Carbs */}
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="barley" size={30} color={DARK_GREEN} />
                        <View style={styles.pill}>
                            <Text style={styles.macroText}>{c || 200}g</Text>
                        </View>
                    </View>

                    {/* Fats */}
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="water" size={30} color={DARK_GREEN} />
                        <View style={styles.pill}>
                            <Text style={styles.macroText}>{f || 200}g</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                </TouchableOpacity>
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
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        color: DARK_GREEN,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 40,
    },
    list: {
        width: '100%',
        gap: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        gap: 20,
    },
    pill: {
        flex: 1,
        backgroundColor: 'white',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    caloriesPill: {
        backgroundColor: '#4F6352', // Dark Green
    },
    caloriesText: {
        color: CREAM_COLOR,
        fontWeight: 'bold',
        fontSize: 18,
    },
    macroText: {
        color: DARK_GREEN,
        fontWeight: 'bold',
        fontSize: 18,
    },
    macroPill: {
        flexDirection: 'row',
        alignItems: 'center',
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
