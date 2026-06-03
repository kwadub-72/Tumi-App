import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/shared/theme/Colors';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

export default function LandingScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.content}>
                <TabonoLogo size={120} color={Colors.theme.harvestGold} />
            </View>
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => router.push('/onboarding/profile')}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    button: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: Colors.theme.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
