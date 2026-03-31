import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupManualMacros() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const initP = params.p ? params.p.toString() : '';
    const initC = params.c ? params.c.toString() : '';
    const initF = params.f ? params.f.toString() : '';
    const initCals = params.calories ? parseInt(params.calories as string) : 0;

    const [protein, setProtein] = useState(initP);
    const [carbs, setCarbs] = useState(initC);
    const [fats, setFats] = useState(initF);
    const [calories, setCalories] = useState(initCals);

    useEffect(() => {
        const p = parseInt(protein) || 0;
        const c = parseInt(carbs) || 0;
        const f = parseInt(fats) || 0;
        setCalories((p * 4) + (c * 4) + (f * 9));
    }, [protein, carbs, fats]);

    const handleNext = () => {
        router.push({
            pathname: '/signup/confirm-macros',
            params: {
                calories: calories || 0,
                p: protein || 0,
                c: carbs || 0,
                f: fats || 0
            }
        });
    };

    const MacroRow = ({ icon, value, onChange, placeholder }: any) => (
        <View style={styles.macroRow}>
            <View style={styles.labelPill}>
                <Text style={styles.labelText}>...g</Text>
            </View>
            <MaterialCommunityIcons name={icon} size={30} color={DARK_GREEN} style={styles.icon} />
            <View style={styles.inputPill}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(47, 58, 39, 0.5)"
                    keyboardType="numeric"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                        </TouchableOpacity>
                        <TabonoLogo size={40} color={DARK_GREEN} />
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>Set custom macros</Text>

                        {/* Calories Display */}
                        <View style={styles.caloriesContainer}>
                            <MaterialCommunityIcons name="fire" size={40} color={DARK_GREEN} />
                            <View style={styles.caloriesPill}>
                                <Text style={styles.caloriesText}>{calories} cals</Text>
                            </View>
                        </View>

                        {/* Macro Inputs */}
                        <View style={styles.form}>
                            <MacroRow
                                icon="food-drumstick"
                                value={protein}
                                onChange={setProtein}
                                placeholder="200g"
                            />
                            <MacroRow
                                icon="barley"
                                value={carbs}
                                onChange={setCarbs}
                                placeholder="200g"
                            />
                            <MacroRow
                                icon="water"
                                value={fats}
                                onChange={setFats}
                                placeholder="200g"
                            />
                        </View>

                        {/* Next Button */}
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        color: DARK_GREEN,
        textAlign: 'center',
        fontWeight: '400', // Thin
        marginBottom: 30,
    },
    caloriesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 40,
        width: '100%',
        paddingHorizontal: 20,
    },
    caloriesPill: {
        flex: 1,
        backgroundColor: '#4F6352', // Dark Green
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    caloriesText: {
        color: CREAM_COLOR,
        fontSize: 20,
        fontWeight: 'bold',
    },
    form: {
        width: '100%',
        gap: 20,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    labelPill: {
        width: 80,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    labelText: {
        color: 'rgba(47, 58, 39, 0.5)',
        fontSize: 16,
    },
    icon: {
        width: 30,
        textAlign: 'center',
    },
    inputPill: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 30,
        height: 60,
        justifyContent: 'center',
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    input: {
        fontSize: 18,
        color: DARK_GREEN,
        fontWeight: 'bold',
        textAlign: 'center',
        height: '100%',
    },
    nextButton: {
        position: 'absolute',
        bottom: 50,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4F6352',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
});
