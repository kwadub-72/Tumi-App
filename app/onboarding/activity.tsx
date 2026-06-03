import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/shared/theme/Colors';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { ACTIVITIES, resolveActivityIcon } from '@/src/shared/constants/Activities';
import { ActivityIcon } from '@/src/shared/components/ActivityIcon';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

export default function ActivityScreen() {
    const router = useRouter();
    const { activity: storeActivity, setActivity } = useOnboardingStore();
    
    // Local state to force an active choice rather than relying on store defaults
    const [localActivity, setLocalActivity] = useState<string | null>(
        storeActivity && storeActivity !== 'moderate' ? storeActivity : null
    );

    const handleSelectActivity = (activityName: string) => {
        setLocalActivity(activityName);
    };

    const handleContinue = () => {
        if (!localActivity) return;
        setActivity(localActivity);
        router.push('/onboarding/about');
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

            <View style={styles.content}>
                <Text style={styles.title}>What do you do?</Text>
                <Text style={styles.subtitle}>Select an activity</Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {ACTIVITIES.map(activity => {
                        const isSelected = localActivity === activity.name;
                        return (
                            <TouchableOpacity 
                                key={activity.name}
                                style={[styles.activityCard, isSelected && styles.activityCardSelected]}
                                onPress={() => handleSelectActivity(activity.name)}
                            >
                                <View style={styles.activityCardLeft}>
                                    <ActivityIcon 
                                        activity={activity.name}
                                        icon={resolveActivityIcon(activity.name, activity.icon)}
                                        size={24}
                                        color={isSelected ? Colors.theme.harvestGold : Colors.theme.dust}
                                    />
                                    <Text style={[styles.activityText, isSelected && styles.activityTextSelected]}>
                                        {activity.displayName || activity.name}
                                    </Text>
                                </View>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color={Colors.theme.harvestGold} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.button, !localActivity && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={!localActivity}
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
    list: {
        paddingBottom: 20,
        gap: 12,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.theme.charcoal,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    activityCardSelected: {
        borderColor: Colors.theme.harvestGold,
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
    },
    activityCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityText: {
        fontSize: 16,
        color: Colors.theme.dust,
        fontWeight: '500',
    },
    activityTextSelected: {
        color: Colors.theme.harvestGold,
        fontWeight: 'bold',
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
