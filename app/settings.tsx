import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

export default function SettingsScreen() {
    const router = useRouter();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'No', style: 'cancel' },
                { text: 'Yes', onPress: () => router.replace('/(tabs)') }
            ]
        );
    };

    const handleHelp = () => {
        Alert.alert(
            'Help & Support',
            'For inquiries and complaints, please contact us at:\ntribe2025@gmail.com',
            [{ text: 'OK' }]
        );
    };

    const renderItem = (label: string, isDestructive = false, onPress?: () => void) => (
        <TouchableOpacity
            style={[styles.item, isDestructive && styles.destructiveItem]}
            onPress={onPress}
        >
            <Text style={[styles.itemText, isDestructive && styles.destructiveText]}>{label}</Text>
            <Ionicons
                name="chevron-forward"
                size={20}
                color={isDestructive ? '#8B0000' : Colors.primary}
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderItem('Natural/Enhanced status', false, () => router.push('/settings/natural-status'))}
                {renderItem('Change email address', false, () => router.push('/settings/change-email'))}
                {renderItem('Change password', false, () => router.push('/settings/change-password'))}
                {renderItem('Units of measurement', false, () => router.push('/settings/units'))}
                {renderItem('Link Instagram', false, () => router.push('/settings/social/instagram'))}
                {renderItem('Link TikTok', false, () => router.push('/settings/social/tiktok'))}
                {renderItem('Blocked', false, () => router.push('/settings/blocked'))}
                {renderItem('Help', false, handleHelp)}
                {renderItem('Logout', true, handleLogout)}
            </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 40,
    },
    item: {
        backgroundColor: Colors.card, // Sage Green
        borderRadius: 25,
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(45, 58, 38, 0.2)', // Faint border
    },
    itemText: {
        color: Colors.primary, // Dark Green text
        fontSize: 16,
        fontWeight: '500',
    },
    destructiveItem: {
        backgroundColor: '#E6A8A8', // Light Red/Pink from image
    },
    destructiveText: {
        color: '#8B0000', // Dark Red
        fontWeight: 'bold',
    },
});
