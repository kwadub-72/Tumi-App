import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

export default function SocialLinkScreen() {
    const router = useRouter();
    const { platform } = useLocalSearchParams(); // instagram or tiktok

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Link {platform === 'instagram' ? 'Instagram' : 'TikTok'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.centerContent}>
                <Ionicons
                    name={platform === 'instagram' ? "logo-instagram" : "logo-tiktok"}
                    size={80}
                    color={Colors.primary}
                    style={{ opacity: 0.2, marginBottom: 20 }}
                />
                <Text style={styles.comingSoonText}>Content coming soon</Text>
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
        textTransform: 'capitalize',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    comingSoonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        opacity: 0.5,
        textAlign: 'center',
    },
});
