import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';

const { width } = Dimensions.get('window');

// Colors
const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#435D4C'; // Matches the greenish background
const DARK_GREEN = '#2F3A27'; // Darker button color/Icon color if needed

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = () => {
        // "assume that any combination... is a real account... take them to the account of 'kwadub'"
        // Navigate to tabs (Feed)
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={CREAM_COLOR} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <TabonoLogo size={width * 0.5} color={CREAM_COLOR} />
                    <Text style={styles.title}>Tribe</Text>
                </View>

                <View style={styles.formContainer}>
                    {/* Username Pill */}
                    <View style={styles.inputPill}>
                        <TextInput
                            style={styles.input}
                            placeholder="Username..."
                            placeholderTextColor={DARK_GREEN}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Pill */}
                    <View style={styles.inputPill}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Password..."
                            placeholderTextColor={DARK_GREEN}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={DARK_GREEN} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>Log in</Text>
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
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    backButton: {
        // padding: 10
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 60,
        marginTop: -60, // visual adjustment
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
    formContainer: {
        width: '100%',
        gap: 20,
    },
    inputPill: {
        backgroundColor: CREAM_COLOR,
        borderRadius: 30, // Pill shape
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: DARK_GREEN,
        height: '100%',
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 5,
    },
    loginButton: {
        backgroundColor: '#2F3A27', // Dark button (black-ish green)
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonText: {
        color: CREAM_COLOR,
        fontSize: 18,
        fontWeight: '600',
    }
});
