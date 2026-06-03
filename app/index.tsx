import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { Colors } from '@/src/shared/theme/Colors';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '@/store/AuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();

    const handleLogin = () => {
        router.push('/login');
    };

    const handleCreateAccount = async () => {
        // 1. Destroy any surviving Supabase sessions
        await supabase.auth.signOut();
        
        // 2. Wipe the global auth store
        useAuthStore.getState().signOut();
        
        // 3. Reset the transient onboarding store
        useOnboardingStore.getState().reset();
        
        // 4. Proceed to onboarding safely
        router.push('/onboarding/profile');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <TabonoLogo size={width * 0.5} color={Colors.theme.harvestGold} />
                    <Text style={styles.title}>Tribe</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
                        <Text style={styles.buttonText}>Create an account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLogin}>
                        <Text style={[styles.buttonText, styles.loginButtonText]}>Log in</Text>
                    </TouchableOpacity>
                </View>
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
        paddingHorizontal: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 80,
        gap: 20,
    },
    title: {
        fontSize: 64,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
        letterSpacing: 2,
        fontFamily: 'System',
        marginTop: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 20,
        position: 'absolute',
        bottom: 80,
    },
    button: {
        backgroundColor: Colors.theme.harvestGold,
        paddingVertical: 18,
        borderRadius: 30, // Pill shape
        alignItems: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButton: {
        backgroundColor: Colors.theme.charcoal,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
    },
    buttonText: {
        color: Colors.background, // Matte black for high contrast against gold
        fontSize: 18,
        fontWeight: '600',
    },
    loginButtonText: {
        color: Colors.theme.softWhite,
    }
});
