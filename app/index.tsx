import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const { width } = Dimensions.get('window');

// Colors
const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#435D4C'; // Matches the greenish background in Image 1

export default function WelcomeScreen() {
    const router = useRouter();

    const handleLogin = () => {
        router.push('/login');
    };

    const handleCreateAccount = () => {
        router.push('/signup'); // Route to signup flow
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <TabonoLogo size={width * 0.5} color={CREAM_COLOR} />
                    <Text style={styles.title}>Tribe</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
                        <Text style={styles.buttonText}>Create an account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Log in</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
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
        fontWeight: '400',
        color: CREAM_COLOR,
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
        backgroundColor: CREAM_COLOR,
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
        // Same style
    },
    buttonText: {
        color: '#2F3A27', // Dark green text
        fontSize: 18,
        fontWeight: '600',
    }
});
