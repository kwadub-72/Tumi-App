import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

    const handleNext = () => {
        router.push('/signup/welcome');
    };

    const toggle = (key: string) => {
        setPrivacySettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof privacySettings] }));
    };

    const SettingRow = ({ label, value, onToggle }: any) => (
        <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#767577', true: DARK_GREEN }}
                thumbColor={CREAM_COLOR}
            />
            <Ionicons
                name={value ? "lock-closed" : "earth"}
                size={16}
                color="white"
                style={styles.privacyIcon}
            />
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
                <Text style={styles.title}>Privacy settings</Text>

                <View style={styles.settingsList}>
                    <SettingRow label="Profile privacy" value={privacySettings.profile} onToggle={() => toggle('profile')} />
                    <SettingRow label="Meal log privacy" value={privacySettings.mealLog} onToggle={() => toggle('mealLog')} />
                    <SettingRow label="Workout log privacy" value={privacySettings.workoutLog} onToggle={() => toggle('workoutLog')} />
                    <SettingRow label="Macro update privacy" value={privacySettings.macroUpdate} onToggle={() => toggle('macroUpdate')} />
                    <SettingRow label="Body stat visibility" value={privacySettings.bodyStat} onToggle={() => toggle('bodyStat')} />
                    <SettingRow label="Like privacy" value={privacySettings.likes} onToggle={() => toggle('likes')} />
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
        marginVertical: 20,
        fontWeight: 'bold',
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
        height: 55,
        borderRadius: 27.5,
        paddingHorizontal: 20,
        paddingRight: 50, // space for icon
    },
    settingLabel: {
        color: DARK_GREEN,
        fontWeight: 'bold',
        fontSize: 16,
    },
    privacyIcon: {
        position: 'absolute',
        right: 15,
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
