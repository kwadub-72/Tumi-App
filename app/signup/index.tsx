import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Modal, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

// Colors
const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupBasicInfo() {
    const router = useRouter();

    // Form State
    const [avatar, setAvatar] = useState<string | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [sex, setSex] = useState<'Male' | 'Female' | null>(null);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Modals
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSexPicker, setShowSexPicker] = useState(false);

    // Date Picker State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const validateAge = (date: Date) => {
        const diff_ms = Date.now() - date.getTime();
        const age_dt = new Date(diff_ms);
        const age = Math.abs(age_dt.getUTCFullYear() - 1970);
        return age >= 13;
    };

    const handleDateSelect = (day: number) => {
        const date = new Date(selectedYear, selectedMonth, day);
        if (!validateAge(date)) {
            Alert.alert("Age Restriction", "You must be at least 13 years old.");
            return;
        }
        setDob(date);
        setShowDatePicker(false);
    };

    const handleNext = async () => {
        if (!dob) {
            Alert.alert("Missing Info", "Please enter your date of birth.");
            return;
        }
        if (sex) {
            await AsyncStorage.setItem('signup_sex', sex);
        }
        await AsyncStorage.setItem('signup_dob', dob.toISOString());
        router.push('/signup/focus');
    };

    // Calendar Renderer
    const renderCalendar = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun
        const days = [];

        // Empty slots for start of month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return (
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}><Text>{'<<'}</Text></TouchableOpacity>
                    <Text style={styles.calendarTitle}>{selectedYear}</Text>
                    <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}><Text>{'>>'}</Text></TouchableOpacity>
                </View>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => setSelectedMonth((selectedMonth + 11) % 12)}><Text>{'<'}</Text></TouchableOpacity>
                    <Text style={styles.calendarTitle}>{new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}</Text>
                    <TouchableOpacity onPress={() => setSelectedMonth((selectedMonth + 1) % 12)}><Text>{'>'}</Text></TouchableOpacity>
                </View>
                {/* Weekday Labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={{ fontWeight: 'bold', width: '14%', textAlign: 'center', color: DARK_GREEN }}>{d}</Text>)}
                </View>
                <View style={styles.daysGrid}>
                    {days.map((d, index) => (
                        <TouchableOpacity key={index} style={styles.dayCell} onPress={() => d && handleDateSelect(d)} disabled={!d}>
                            <Text style={{ color: d ? DARK_GREEN : 'transparent' }}>{d || ''}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={DARK_GREEN} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <TabonoLogo size={40} color={DARK_GREEN} />
                    </View>
                    <View style={{ width: 28 }} />
                </View>

                <Text style={styles.title}>Create an account</Text>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Profile Pic */}
                    <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={CREAM_COLOR} />
                            </View>
                        )}
                        <Ionicons name="camera" size={24} color={DARK_GREEN} style={styles.cameraIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage}>
                        <Text style={styles.avatarLabel}>Choose profile picture*</Text>
                    </TouchableOpacity>

                    {/* Form */}
                    <View style={styles.form}>
                        <TextInput style={styles.input} placeholder="First name" placeholderTextColor="rgba(47, 58, 39, 0.5)" value={firstName} onChangeText={setFirstName} />
                        <TextInput style={styles.input} placeholder="Last name" placeholderTextColor="rgba(47, 58, 39, 0.5)" value={lastName} onChangeText={setLastName} />

                        <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                            <Text style={{ color: dob ? DARK_GREEN : 'rgba(47, 58, 39, 0.5)' }}>
                                {dob ? dob.toLocaleDateString() : "Date of birth (XX/YY/ZZZZ)"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowSexPicker(true)}>
                            <Text style={{ color: sex ? DARK_GREEN : 'rgba(47, 58, 39, 0.5)' }}>
                                {sex || "Sex"}
                            </Text>
                        </TouchableOpacity>

                        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(47, 58, 39, 0.5)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <TextInput style={styles.input} placeholder="Username" placeholderTextColor="rgba(47, 58, 39, 0.5)" value={username} onChangeText={setUsername} autoCapitalize="none" />
                        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(47, 58, 39, 0.5)" value={password} onChangeText={setPassword} secureTextEntry />
                    </View>

                    {/* Footer Navigation */}
                    <View style={styles.footer}>
                        <Text style={styles.optionalText}>*Optional</Text>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Ionicons name="arrow-forward" size={30} color={CREAM_COLOR} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
                    <View style={styles.modalContent}>
                        {renderCalendar()}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Sex Picker Modal - Rolodex style (simple list) */}
            <Modal visible={showSexPicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSexPicker(false)}>
                    <View style={[styles.modalContent, { maxHeight: 200 }]}>
                        {['Male', 'Female'].map((opt) => (
                            <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setSex(opt as any); setShowSexPicker(false); }}>
                                <Text style={styles.modalText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
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
    title: {
        fontSize: 24,
        color: DARK_GREEN,
        textAlign: 'center',
        marginVertical: 10,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 10,
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: DARK_GREEN,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: BG_COLOR,
        borderRadius: 12,
        padding: 2,
    },
    avatarLabel: {
        textAlign: 'center',
        color: DARK_GREEN,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    form: {
        gap: 15,
    },
    input: {
        backgroundColor: SAGE_GREEN,
        borderRadius: 30,
        height: 55,
        paddingHorizontal: 20,
        color: DARK_GREEN,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        paddingHorizontal: 10,
    },
    optionalText: {
        color: DARK_GREEN,
        fontSize: 12,
        opacity: 0.7,
    },
    nextButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: DARK_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: BG_COLOR,
        padding: 20,
        borderRadius: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalItem: {
        paddingVertical: 15,
        width: '100%',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    modalText: {
        fontSize: 18,
        color: DARK_GREEN,
        fontWeight: 'bold',
    },
    calendarContainer: {
        width: '100%',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        alignItems: 'center',
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_GREEN,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: '14%', // roughly 7 days
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
