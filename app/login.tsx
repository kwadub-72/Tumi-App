import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { TabonoLogo } from '@/src/shared/components/TabonoLogo';
import { useAuthStore } from '@/store/AuthStore';

const { width } = Dimensions.get('window');
const CREAM_COLOR = '#EAE8D9';
const BG_COLOR = '#435D4C';
const DARK_GREEN = '#2F3A27';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        const errorMsg = await signIn(trimmedEmail, password);
        setLoading(false);

        if (errorMsg) {
            Alert.alert('Login failed', errorMsg);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={CREAM_COLOR} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.logoContainer}>
                    <TabonoLogo size={width * 0.5} color={CREAM_COLOR} />
                    <Text style={styles.title}>Tribe</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputPill}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email..."
                            placeholderTextColor={DARK_GREEN}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                        />
                    </View>

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
                            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={DARK_GREEN} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, loading && { opacity: 0.7 }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={CREAM_COLOR} />
                            : <Text style={styles.loginButtonText}>Log in</Text>
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG_COLOR },
    header: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    backButton: {},
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    logoContainer: { alignItems: 'center', marginBottom: 60, marginTop: -60, gap: 20 },
    title: { fontSize: 64, fontWeight: '400', color: CREAM_COLOR, letterSpacing: 2, fontFamily: 'System', marginTop: 20 },
    formContainer: { width: '100%', gap: 20 },
    inputPill: { backgroundColor: CREAM_COLOR, borderRadius: 30, height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
    input: { flex: 1, fontSize: 16, color: DARK_GREEN, height: '100%', fontWeight: '500' },
    eyeIcon: { padding: 5 },
    loginButton: { backgroundColor: DARK_GREEN, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    loginButtonText: { color: CREAM_COLOR, fontSize: 18, fontWeight: '600' },
});
