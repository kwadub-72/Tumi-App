import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#F5F5DC';
const SAGE_GREEN = '#9FB89F';
const DARK_GREEN = '#2F3A27';

export default function SignupPrivacy() {
    const router = useRouter();
    const [privacySettings, setPrivacySettings] = useState({
        profile: true,
        mealLog: false,
        workoutLog: false,
        macroUpdate: true,
        bodyStat: false,
        likes: false,
    });

    const handleNext = async () => {
        // We invert profile because the UI calls it "Account privacy" (true means private)
        // Wait, `privacySettings.profile` is labeled "Account privacy". So true means private.
        await AsyncStorage.setItem('signup_isPrivate', privacySettings.profile.toString());
        await AsyncStorage.setItem('signup_showMeals', privacySettings.mealLog.toString());
        await AsyncStorage.setItem('signup_showWorkouts', privacySettings.workoutLog.toString());
        await AsyncStorage.setItem('signup_showMacros', privacySettings.macroUpdate.toString());
        await AsyncStorage.setItem('signup_showMeasurements', privacySettings.bodyStat.toString());
        await AsyncStorage.setItem('signup_showLikes', privacySettings.likes.toString());
        
        router.push('/signup/welcome');
    };

    const toggle = (key: string) => {
        setPrivacySettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof privacySettings] }));
    };

    const SettingRow = ({ label, value, onToggle }: any) => (
        <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.switchContainer, 
                    value ? { backgroundColor: DARK_GREEN, alignItems: 'flex-end' } : { backgroundColor: '#767577', alignItems: 'flex-start' }
                ]}
                onPress={onToggle}
            >
                <View style={styles.switchKnob}>
                    <Ionicons 
                        name={value ? 'earth' : 'lock-closed'} 
                        size={14} 
                        color={value ? DARK_GREEN : '#767577'} 
                    />
                </View>
            </TouchableOpacity>
        </View>
    );

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

            <View style={styles.content}>
                <Text style={styles.title}>Personalize your privacy</Text>

                <View style={styles.settingsList}>
                    <SettingRow label="Account privacy" value={privacySettings.profile} onToggle={() => toggle('profile')} />
                    
                    <Text style={styles.sectionHeader}>Non-tribe member visibility*</Text>
                    
                    <SettingRow label="Meal log visibility" value={privacySettings.mealLog} onToggle={() => toggle('mealLog')} />
                    <SettingRow label="Workout log visibility" value={privacySettings.workoutLog} onToggle={() => toggle('workoutLog')} />
                    <SettingRow label="Macro log visibility" value={privacySettings.macroUpdate} onToggle={() => toggle('macroUpdate')} />
                    <SettingRow label="Body metric visibility" value={privacySettings.bodyStat} onToggle={() => toggle('bodyStat')} />
                    
                    <Text style={styles.footnote}>*Tribe-member visibility is determined by tribe settings</Text>
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
    settingsList: {
        width: '100%',
        gap: 15,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: SAGE_GREEN,
        height: 60,
        borderRadius: 30,
        paddingHorizontal: 20,
    },
    settingLabel: {
        color: DARK_GREEN,
        fontWeight: 'bold',
        fontSize: 18,
    },
    sectionHeader: {
        color: DARK_GREEN,
        fontSize: 14,
        marginTop: 10,
        marginBottom: -5,
        marginLeft: 5,
        fontWeight: '600',
    },
    footnote: {
        color: DARK_GREEN,
        fontSize: 12,
        marginTop: 5,
        marginLeft: 5,
        opacity: 0.7,
    },
    switchContainer: {
        width: 56,
        height: 32,
        borderRadius: 16,
        padding: 3,
        justifyContent: 'center',
    },
    switchKnob: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
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
    },
});
