import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';
const { width } = Dimensions.get('window');

const LIFTING_BACKGROUNDS = [
    { title: 'General lifter', desc: 'Regular physical activity over the past 3+ years, with less structured or less frequent resistance training, or training primarily focused on general fitness, cardiovascular exercise, mobility, or core stability (e.g., recreational exerciser, yoga or Pilates practitioner, cardio-focused training).' },
    { title: 'Advanced lifter', desc: 'Consistent resistance training for 3+ years, typically 4–7 sessions per week, with structured and progressive programming focused on hypertrophy, strength, or power (e.g., bodybuilder, powerlifter, American football player).' }
];

const LIFESTYLES = [
    { title: 'Sedentary', desc: 'Mostly seated during the day with limited movement (~30–45 minutes of daily walking or routine activity).\nExamples: desk-based or office work.' },
    { title: 'Lightly active', desc: 'On your feet for a significant portion of the day with regular standing or walking and minimal physical labor.\nExamples: nurse, barista, teacher, retail salesperson.' },
    { title: 'Active', desc: 'On your feet the majority of the day with frequent movement and moderate physical tasks (e.g., lifting or carrying).\nExamples: Mechanic, custodian, food server.' },
    { title: 'Very active', desc: 'Physically demanding work for most of the day involving sustained exertion or heavy lifting.\nExamples: Landscaper, mover, farm labor, baggage handler.' }
];

export default function SignupTribeMacros() {
    const router = useRouter();
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [liftingBackground, setLiftingBackground] = useState<string | null>(null);
    const [lifestyle, setLifestyle] = useState<string | null>(null);

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
        'General lifter': true,
        'Advanced lifter': true,
        'Sedentary': true,
        'Lightly active': true,
        'Active': true,
        'Very active': true,
    });

    const [age, setAge] = useState<number>(25);
    const [sex, setSex] = useState<'Male' | 'Female'>('Male');

    useEffect(() => {
        const load = async () => {
            const storedSex = await AsyncStorage.getItem('signup_sex');
            if (storedSex) setSex(storedSex as any);
            const storedDob = await AsyncStorage.getItem('signup_dob');
            if (storedDob) {
                const d = new Date(storedDob);
                const ageDiff = Date.now() - d.getTime();
                const ageDt = new Date(ageDiff);
                setAge(Math.abs(ageDt.getUTCFullYear() - 1970));
            }
        };
        load();
    }, []);

    const toggleExpanded = (title: string) => {
        setExpandedItems(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const handleNext = () => {
        if (!height || !weight || !liftingBackground || !lifestyle) {
            Alert.alert("Missing Input", "Please fill out all fields and select your background and lifestyle.");
            return;
        }

        const hCm = parseFloat(height);
        const wLbs = parseFloat(weight);

        if (isNaN(hCm) || isNaN(wLbs)) {
            Alert.alert("Invalid Input", "Please enter valid numbers for height and weight.");
            return;
        }

        const wKg = wLbs / 2.20462;
        let rmr = 0;

        if (sex === 'Male') {
            rmr = (10 * wKg) + (6.25 * hCm) - (5 * age) + 5;
        } else {
            rmr = (10 * wKg) + (6.25 * hCm) - (5 * age) - 161;
        }

        let multiplier = 1.2;
        if (sex === 'Male') {
            if (liftingBackground === 'Advanced lifter') {
                if (lifestyle === 'Sedentary') multiplier = 1.62;
                else if (lifestyle === 'Lightly active') multiplier = 1.7;
                else if (lifestyle === 'Active') multiplier = 2.0;
                else if (lifestyle === 'Very active') multiplier = 2.5;
            } else {
                if (lifestyle === 'Sedentary') multiplier = 1.15;
                else if (lifestyle === 'Lightly active') multiplier = 1.45;
                else if (lifestyle === 'Active') multiplier = 1.75;
                else if (lifestyle === 'Very active') multiplier = 2.0;
            }
        } else {
            if (liftingBackground === 'Advanced lifter') {
                if (lifestyle === 'Sedentary') multiplier = 1.458;
                else if (lifestyle === 'Lightly active') multiplier = 1.53;
                else if (lifestyle === 'Active') multiplier = 1.8;
                else if (lifestyle === 'Very active') multiplier = 2.25;
            } else {
                if (lifestyle === 'Sedentary') multiplier = 1.035;
                else if (lifestyle === 'Lightly active') multiplier = 1.305;
                else if (lifestyle === 'Active') multiplier = 1.575;
                else if (lifestyle === 'Very active') multiplier = 1.845;
            }
        }

        const tdee = rmr * multiplier;
        const protein = 2.2 * wKg;
        const fats = 0.7 * wKg;
        let carbs = (tdee - (fats * 9) - (protein * 4)) / 4;
        carbs = Math.max(0, carbs);

        router.push({
            pathname: '/signup/confirm-macros',
            params: {
                calories: Math.round(tdee),
                p: Math.round(protein),
                c: Math.round(carbs),
                f: Math.round(fats)
            }
        });
    };

    const renderCard = (item: any, selectedVal: string | null, onSelect: (v: string) => void) => {
        const isSelected = selectedVal === item.title;
        const isExpanded = expandedItems[item.title];

        return (
            <TouchableOpacity
                key={item.title}
                style={[styles.cardContainer, isSelected && styles.cardSelected]}
                onPress={() => onSelect(item.title)}
                activeOpacity={0.8}
            >
                <Text style={[styles.cardTitle, isSelected && { color: 'white' }]}>{item.title}</Text>

                <TouchableOpacity
                    onPress={() => toggleExpanded(item.title)}
                    style={styles.expandIconContainer}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons
                        name="ellipsis-horizontal"
                        size={24}
                        color={isSelected ? 'white' : DARK_GREEN}
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <Text style={[styles.cardDesc, isSelected && { color: 'rgba(255,255,255,0.9)' }]}>
                        {item.desc}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <TabonoLogo size={40} color={DARK_GREEN} />
                </View>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Tribe-generated macros</Text>

                <Text style={styles.sectionTitle}>Body metrics</Text>
                <View style={styles.form}>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Height</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter height (cm)..."
                            placeholderTextColor="rgba(47, 58, 39, 0.5)"
                            value={height}
                            onChangeText={setHeight}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Weight</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter weight (lbs)..."
                            placeholderTextColor="rgba(47, 58, 39, 0.5)"
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Lifting background</Text>
                <View style={styles.cardList}>
                    {LIFTING_BACKGROUNDS.map((item) => renderCard(item, liftingBackground, setLiftingBackground))}
                </View>

                <Text style={styles.sectionTitle}>Lifestyle</Text>
                <View style={styles.cardList}>
                    {LIFESTYLES.map((item) => renderCard(item, lifestyle, setLifestyle))}
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                </TouchableOpacity>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        color: DARK_GREEN,
        textAlign: 'center',
        marginVertical: 10,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: DARK_GREEN,
        fontSize: 16,
        marginBottom: 10,
        marginTop: 25,
        alignSelf: 'flex-start',
    },
    form: {
        gap: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SAGE_GREEN,
        borderRadius: 25,
        height: 50,
        paddingHorizontal: 15,
    },
    label: {
        width: 100,
        color: DARK_GREEN,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        backgroundColor: CREAM_COLOR,
        height: 35,
        borderRadius: 17.5,
        paddingHorizontal: 15,
        fontSize: 14,
        color: DARK_GREEN,
    },
    cardList: {
        gap: 10,
    },
    cardContainer: {
        backgroundColor: SAGE_GREEN,
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
    },
    cardSelected: {
        backgroundColor: '#6B8E6B', // Darker Green
    },
    cardTitle: {
        color: DARK_GREEN,
        fontWeight: 'bold',
        fontSize: 20,
        marginBottom: -5,
    },
    expandIconContainer: {
        paddingVertical: 5,
    },
    cardDesc: {
        color: DARK_GREEN,
        fontSize: 12,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 18,
    },
    nextButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: 30,
    },
});
